import express from 'express';
import pool from '../db.js';
import { requireLogin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Função auxiliar para registrar movimentações inválidas de forma segura
async function logarMovimentacaoInvalida(dados) {
    const { tipoErro, maquinaId, funcionarioId, barcodeEsperado, barcodeLido } = dados;

    // Verifica se o barcode esperado existe para manter a integridade do FK, se possível
    const [rows] = await pool.query('SELECT BarCode FROM Estoque_MP WHERE BarCode = ?', [barcodeEsperado]);
    const fkBarcode = rows.length > 0 ? barcodeEsperado : null;

    await pool.query(
        `INSERT INTO Registro_Movimentacao 
         (DataHoraMovimento, QuantidadeMovida, fk_Estoque_MP_BarCode, BarcodeLido, fk_Maquina_Identificacao, fk_Funcionarios_IDFuncionario, OperacaoValida, TipoErro) 
         VALUES (?, 0, ?, ?, ?, ?, 0, ?)`,
        [new Date(), fkBarcode, barcodeLido, maquinaId, funcionarioId, tipoErro]
    );
}

// Buscar funcionário por ID (pública para login facial, mas o path original era publico?)
router.get('/funcionario/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT IDFuncionario, Nome, Foto, Face_Embedding, Email, CPF, Cargo, NivelAcesso FROM Funcionarios WHERE IDFuncionario = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado.' });
        }
        const funcionario = rows[0];
        // Converte Foto BLOB para base64 se existir
        if (funcionario.Foto) {
            funcionario.fotoBase64 = `data:image/jpeg;base64,${Buffer.from(funcionario.Foto).toString('base64')}`;
        }
        // Converte Face_Embedding TEXT para array
        if (funcionario.Face_Embedding) {
            funcionario.face_embedding = JSON.parse(funcionario.Face_Embedding);
        }
        res.json({ funcionario });
    } catch (error) {
        console.error('Erro ao buscar funcionário:', error);
        res.status(500).json({ message: 'Erro interno ao buscar dados.' });
    }
});

// Teste DB
router.get('/test-db', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM Funcionarios');
        const [tables] = await pool.query('SHOW TABLES');

        res.json({
            success: true,
            message: 'Conexão com banco de dados OK!',
            funcionarios: rows[0].total,
            tabelas: tables.map(t => Object.values(t)[0])
        });
    } catch (error) {
        console.error('Erro ao testar banco:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao conectar com banco de dados',
            error: error.message
        });
    }
});

// Berços disponíveis
router.get('/bercos/disponiveis', requireLogin, async (req, res) => {
    try {
        const [bercos] = await pool.query('SELECT * FROM Bercos');
        const disponiveis = bercos.map(berco => {
            const prateleirasLivres = [];
            for (let letra of 'ABCDEFGHIJ') {
                if (berco[`Prateleira_${letra}`] === null) {
                    prateleirasLivres.push(letra);
                }
            }
            return { id: berco.ID, nome: berco.Nome, prateleirasLivres };
        });
        res.json({ success: true, bercos: disponiveis });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao buscar berços.' });
    }
});

// Registrar entrada inicial e gerar código de barras
router.post('/recebimento/registrar', requireLogin, async (req, res) => {
    const { fornecedorCnpj, bercoId, prateleira } = req.body;
    let connection;
    try {
        // Gera o código de lote
        const anoAtual = new Date().getFullYear();
        const padraoBusca = `%/${anoAtual % 100}`;
        const [rows] = await pool.query(
            `SELECT BarCode FROM Estoque_MP WHERE BarCode LIKE ? ORDER BY CAST(SUBSTRING_INDEX(BarCode, '/', 1) AS UNSIGNED) DESC LIMIT 1`,
            [padraoBusca]
        );
        let proximoNumero = 1;
        if (rows.length > 0) {
            proximoNumero = parseInt(rows[0].BarCode.split('/')[0]) + 1;
        }
        const codigoLote = `${proximoNumero}/${anoAtual % 100}`;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Insere um placeholder no estoque
        await connection.query(
            `INSERT INTO Estoque_MP (BarCode, fk_Fornecedores_CNPJ, fk_Berco_ID, Prateleira_Ocupada) VALUES (?, ?, ?, ?)`,
            [codigoLote, fornecedorCnpj, bercoId, prateleira]
        );

        // Registra a entrada com os novos campos de local
        await connection.query(
            `INSERT INTO Registro_Entrada_MP (DataHoraRegistro, fk_Estoque_MP_BarCode, fk_Funcionarios_IDFuncionario, fk_Berco_ID, Prateleira) VALUES (?, ?, ?, ?, ?)`,
            [new Date(), codigoLote, req.session.userId, bercoId, prateleira]
        );

        // Ocupa a prateleira no berço
        const nomeColunaPrateleira = `Prateleira_${prateleira}`;
        await connection.query(
            `UPDATE Bercos SET ${nomeColunaPrateleira} = ? WHERE ID = ?`,
            [codigoLote, bercoId]
        );

        await connection.commit();
        res.status(201).json({ success: true, message: 'Entrada registrada! Leve o material para a Qualidade.', codigoLote: codigoLote });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro no registro de recebimento:", error);
        res.status(500).json({ success: false, message: 'Erro interno.' });
    } finally {
        if (connection) connection.release();
    }
});

// Registrar movimentação (Legacy/Simples)
router.post('/movimentacao', requireLogin, async (req, res) => {
    const { codigoLote, maquinaId, quantidadeMovida } = req.body;
    const funcionarioId = req.session.userId;

    // Validação inicial
    if (!codigoLote || !maquinaId || !quantidadeMovida || parseInt(quantidadeMovida) <= 0) {
        return res.status(400).json({ success: false, message: 'Código do Lote, Máquina e uma Quantidade válida são obrigatórios.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [estoqueRows] = await connection.query(
            'SELECT BarCode, Quantidade, fk_Tipos_MP_TipoMP FROM Estoque_MP WHERE BarCode = ? FOR UPDATE',
            [codigoLote]
        );

        if (estoqueRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Lote não encontrado no estoque. Verifique o código de barras.' });
        }

        const lote = estoqueRows[0];

        if (parseInt(quantidadeMovida) > lote.Quantidade) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `Quantidade a ser movida (${quantidadeMovida}) é maior que a disponível em estoque (${lote.Quantidade}).` });
        }

        if (lote.fk_Tipos_MP_TipoMP === 'Aguardando Identificação') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Este lote ainda não foi identificado pela equipe de Qualidade e não pode ser movimentado.' });
        }

        const [compativelRows] = await connection.query(
            'SELECT * FROM Compativel WHERE fk_Tipos_MP_TipoMP = ? AND fk_Maquina_Identificacao = ?',
            [lote.fk_Tipos_MP_TipoMP, maquinaId]
        );
        if (compativelRows.length === 0) {
            await connection.rollback();
            const [maquinaRows] = await connection.query('SELECT Modelo FROM Maquinas WHERE Identificacao = ?', [maquinaId]);
            const nomeMaquina = maquinaRows.length > 0 ? maquinaRows[0].Modelo : `ID ${maquinaId}`;
            return res.status(400).json({ success: false, message: `Material do tipo "${lote.fk_Tipos_MP_TipoMP}" não é compatível com a máquina "${nomeMaquina}".` });
        }

        const novaQuantidade = lote.Quantidade - parseInt(quantidadeMovida);
        await connection.query(
            'UPDATE Estoque_MP SET Quantidade = ? WHERE BarCode = ?',
            [novaQuantidade, codigoLote]
        );

        const sqlMovimentacao = `
            INSERT INTO Registro_Movimentacao 
            (DataHoraMovimento, QuantidadeMovida, fk_Estoque_MP_BarCode, fk_Maquina_Identificacao, fk_Funcionarios_IDFuncionario)
            VALUES (?, ?, ?, ?, ?)
        `;
        await connection.query(sqlMovimentacao, [new Date(), quantidadeMovida, codigoLote, maquinaId, funcionarioId]);

        await connection.commit();
        res.status(201).json({ success: true, message: `${quantidadeMovida} unidades do lote ${codigoLote} movimentadas com sucesso!` });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao registrar movimentação:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao registrar a movimentação.' });
    } finally {
        if (connection) connection.release();
    }
});

// API para gerar o próximo código de lote sequencial anual
router.get('/lote/proximo-codigo', requireLogin, async (req, res) => {
    try {
        const anoAtual = new Date().getFullYear();
        const padraoBusca = `%-${anoAtual}`;

        const [rows] = await pool.query(
            `SELECT BarCode FROM Estoque_MP 
             WHERE BarCode LIKE ? 
             ORDER BY CAST(SUBSTRING_INDEX(BarCode, '-', 1) AS UNSIGNED) DESC 
             LIMIT 1`,
            [padraoBusca]
        );

        let proximoNumero = 1;

        if (rows.length > 0) {
            const ultimoCodigo = rows[0].BarCode;
            const ultimoNumero = parseInt(ultimoCodigo.split('-')[0], 10);
            proximoNumero = ultimoNumero + 1;
        }

        const novoCodigo = `${proximoNumero}-${anoAtual}`;
        res.json({ success: true, codigoLote: novoCodigo });

    } catch (error) {
        console.error("Erro ao gerar próximo código de lote:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao gerar código.' });
    }
});

// API para buscar detalhes de um lote específico
router.get('/lote/:barcode', requireLogin, async (req, res) => {
    const { barcode } = req.params;
    try {
        const [rows] = await pool.query(
            `SELECT 
                e.BarCode, 
                e.Quantidade, 
                e.fk_Tipos_MP_TipoMP, 
                f.Nome AS FornecedorNome 
             FROM Estoque_MP e
             JOIN Fornecedores f ON e.fk_Fornecedores_CNPJ = f.CNPJ
             WHERE e.BarCode = ?`,
            [barcode]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Lote não encontrado.' });
        }
        res.json({ success: true, lote: rows[0] });
    } catch (error) {
        console.error("Erro ao buscar lote:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar lote.' });
    }
});

// API para registrar a identificação de um material
router.post('/identificar', requireLogin, async (req, res) => {
    const { codigoLote, novoTipoMP } = req.body;
    const funcionarioId = req.session.userId;

    if (!codigoLote || !novoTipoMP) {
        return res.status(400).json({ success: false, message: 'Código do Lote e Novo Tipo são obrigatórios.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // ETAPA 1: Atualizar o tipo do material na tabela de estoque
        const updateSql = 'UPDATE Estoque_MP SET fk_Tipos_MP_TipoMP = ? WHERE BarCode = ?';
        await connection.query(updateSql, [novoTipoMP, codigoLote]);

        // ETAPA 2: Criar um registro de auditoria na tabela de identificação
        const registroSql = `
            INSERT INTO Registro_Identificacao_MP 
            (DataHoraIdentificacao, fk_Funcionarios_IDFuncionario, fk_Tipos_MP_TipoMP, fk_Estoque_MP_BarCode)
            VALUES (?, ?, ?, ?)
        `;
        await connection.query(registroSql, [new Date(), funcionarioId, novoTipoMP, codigoLote]);

        await connection.commit();
        res.status(200).json({ success: true, message: `Lote ${codigoLote} identificado como "${novoTipoMP}" com sucesso!` });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao identificar material:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao salvar identificação.' });
    } finally {
        if (connection) connection.release();
    }
});

// API para popular o DASHBOARD DE GESTÃO
router.get('/dashboard/gestao', requireLogin, async (req, res) => {
    try {
        let kpiStock, kpiMovimentos, kpiFuncionarios, stockByType, consumptionByMachine, recentMovements;
        // ... (Mesma lógica de queries separadas)
        // Simplificando o bloco try/catch gigante para clareza
        try { [kpiStock] = await pool.query("SELECT COUNT(*) as totalStock, SUM(CASE WHEN fk_Tipos_MP_TipoMP = 'Aguardando Identificação' THEN 1 ELSE 0 END) as awaitingId FROM Estoque_MP"); } catch (e) { console.error(e); }
        try { [kpiMovimentos] = await pool.query("SELECT COUNT(*) as movementsToday, SUM(QuantidadeMovida) as unitsMovedToday FROM Registro_Movimentacao WHERE DATE(DataHoraMovimento) = CURDATE()"); } catch (e) { console.error(e); }
        try { [kpiFuncionarios] = await pool.query("SELECT COUNT(*) as totalEmployees FROM Funcionarios"); } catch (e) { console.error(e); }

        try {
            [stockByType] = await pool.query(`
                SELECT fk_Tipos_MP_TipoMP as tipo, COUNT(*) as lotes, SUM(Quantidade) as totalQuantidade
                FROM Estoque_MP GROUP BY fk_Tipos_MP_TipoMP ORDER BY lotes DESC
            `);
        } catch (e) { console.error(e); }

        try {
            [consumptionByMachine] = await pool.query(`
                SELECT m.Modelo, SUM(rm.QuantidadeMovida) as totalMovido
                FROM Registro_Movimentacao rm
                JOIN Maquinas m ON rm.fk_Maquina_Identificacao = m.Identificacao
                GROUP BY m.Modelo ORDER BY totalMovido DESC
            `);
        } catch (e) { console.error(e); }

        try {
            [recentMovements] = await pool.query(`
                SELECT rm.DataHoraMovimento, rm.fk_Estoque_MP_BarCode as BarCode, rm.QuantidadeMovida AS quantidadeMovida,
                    f.Nome as funcionarioNome, m.Modelo as maquinaNome
                FROM Registro_Movimentacao rm
                JOIN Funcionarios f ON rm.fk_Funcionarios_IDFuncionario = f.IDFuncionario
                JOIN Maquinas m ON rm.fk_Maquina_Identificacao = m.Identificacao
                ORDER BY rm.DataHoraMovimento DESC LIMIT 5
            `);
        } catch (e) { console.error(e); }

        const dashboardData = {
            kpis: {
                totalStock: kpiStock?.[0]?.totalStock || 0,
                awaitingId: kpiStock?.[0]?.awaitingId || 0,
                movementsToday: kpiMovimentos?.[0]?.movementsToday || 0,
                unitsMovedToday: kpiMovimentos?.[0]?.unitsMovedToday || 0,
                totalEmployees: kpiFuncionarios?.[0]?.totalEmployees || 0
            },
            stockByType: stockByType || [],
            consumptionByMachine: consumptionByMachine || [],
            recentEntries: [], // Removido do original se não existe, ou pode ser adicionado se necessário
            recentMovements: recentMovements || []
        };

        res.json(dashboardData);
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ message: "Erro ao carregar dados do dashboard." });
    }
});

// API Dashboard Funcionario
router.get('/dashboard/funcionario/:id', requireLogin, async (req, res) => {
    if (req.session.NivelAcesso !== 'Total' && req.session.NivelAcesso !== 'Gestor') {
        return res.status(403).json({ message: 'Acesso negado.' });
    }
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    try {
        let responseData = { cargo: '', nome: '', registros: {}, stats: null, analytics: null };
        const queryParams = [];

        if (id === 'geral') {
            responseData.cargo = 'Geral';
            responseData.nome = 'Visão Geral (Todos)';

            // --- Lógica Geral (Agregada) ---

            // 1. Movimentações
            let queryMov = `
                SELECT DataHoraMovimento, fk_Estoque_MP_BarCode, QuantidadeMovida, OperacaoValida, TipoErro,
                       Tempo_Verificacao_Material, Tempo_Verificacao_Maquina, Tempo_Total_Operacao
                FROM Registro_Movimentacao 
                WHERE 1=1
            `;
            if (startDate && endDate) {
                queryMov += ' AND DATE(DataHoraMovimento) BETWEEN ? AND ?';
                queryParams.push(startDate, endDate);
            }
            // Limite para tabela, mas cálculos devem ser sobre tudo? 
            // Para simplicidade e performance, faremos cálculos no JS ou duas queries.
            // Vamos buscar tudo (assumindo volume razoável para este protótipo) ou usar agregações SQL.
            // Para manter consistência com o frontend existente, retornaremos as linhas, mas limitadas para tabela

            const queryAllMovs = queryMov + ' ORDER BY DataHoraMovimento DESC';
            const [allMovs] = await pool.query(queryAllMovs, queryParams);

            if (allMovs.length > 0) {
                responseData.registros.movimentacoes = allMovs.slice(0, 100); // Limitando exibição na tabela

                // Stats
                const total = allMovs.length;
                const acertos = allMovs.filter(r => r.OperacaoValida === 1).length;
                const errosPorTipo = allMovs.filter(r => r.OperacaoValida === 0).reduce((acc, row) => { acc[row.TipoErro] = (acc[row.TipoErro] || 0) + 1; return acc; }, {});

                responseData.stats = {
                    totalOperacoes: total,
                    acertos,
                    erros: total - acertos,
                    taxaAcerto: total > 0 ? (acertos / total * 100).toFixed(1) : 0,
                    errosPorTipo
                };

                // Analytics Tempo
                const opsComTempo = allMovs.filter(m => m.OperacaoValida === 1 && m.Tempo_Total_Operacao > 0);
                if (opsComTempo.length > 0) {
                    const calcStats = (arr) => ({
                        min: Math.min(...arr),
                        max: Math.max(...arr),
                        avg: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
                    });

                    const timesTotal = opsComTempo.map(m => m.Tempo_Total_Operacao);
                    const timesMat = opsComTempo.map(m => m.Tempo_Verificacao_Material || 0);
                    const timesMaq = opsComTempo.map(m => m.Tempo_Verificacao_Maquina || 0);

                    responseData.analytics = {
                        tempoTotal: calcStats(timesTotal),
                        tempoMaterial: calcStats(timesMat),
                        tempoMaquina: calcStats(timesMaq),
                        series: opsComTempo.map(m => ({
                            t: m.DataHoraMovimento,
                            total: m.Tempo_Total_Operacao,
                            mat: m.Tempo_Verificacao_Material || 0,
                            maq: m.Tempo_Verificacao_Maquina || 0
                        })).reverse()
                    };
                }
            }

            // 2. Identificações (Qualidade)
            let queryIdent = `SELECT DataHoraIdentificacao, Tempo_Ate_Identificacao FROM Registro_Identificacao_MP WHERE 1=1`;
            const identParams = [];
            if (startDate && endDate) {
                queryIdent += ' AND DATE(DataHoraIdentificacao) BETWEEN ? AND ?';
                identParams.push(startDate, endDate);
            }
            const [allIdents] = await pool.query(queryIdent, identParams);

            if (allIdents.length > 0) {
                // Se já existe analytics de mov, mesclar? O front mostra separado por 'cargo', mas aqui é GERAL.
                // Vamos adicionar ao analytics se existir dados
                const opsComTempo = allIdents.filter(m => m.Tempo_Ate_Identificacao > 0);
                if (opsComTempo.length > 0) {
                    const times = opsComTempo.map(m => m.Tempo_Ate_Identificacao);
                    if (!responseData.analytics) responseData.analytics = {};

                    responseData.analytics.tempoIdentificacao = {
                        min: Math.min(...times),
                        max: Math.max(...times),
                        avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)
                    };
                    // Se não tiver series de movimento, usa essa. Se tiver, ideal seria duas series, mas o chart atual suporta "tempoMaterial" OU "tempoIdentificacao".
                    // Para visão GERAL, vamos priorizar Movimento no gráfico se ambos existirem, ou tentar adaptar o front.
                    // O front atual logica: `if (analytics.tempoMaterial) ... else if (analytics.tempoIdentificacao)`
                    // Então ele mostrará gráficos de Movimentação se houver ambos.
                }
            }

        } else {
            const [employeeRows] = await pool.query('SELECT Cargo, Nome FROM Funcionarios WHERE IDFuncionario = ?', [id]);
            if (employeeRows.length === 0) return res.status(404).json({ message: 'Funcionário não encontrado.' });

            responseData.cargo = employeeRows[0].Cargo;
            responseData.nome = employeeRows[0].Nome;
        }

        const { Cargo, Nome } = responseData;
        if (id !== 'geral') {
            // ... logica existente para ID específico ...


            // Filtro de Data
            let dateFilter = '';
            const params = [id];
            // (Nota: query params da movimentacao sao tratados inline abaixo)

            const isAlimentador = Cargo === 'Alimentador de Linha';
            const isInspetor = Cargo === 'Inspetor de Qualidade';
            const isConferente = Cargo === 'Conferente';
            const isAdmin = ['Administrador', 'Gestor'].includes(Cargo);

            // 1. Tentar Buscar Movimentações (Se Alimentador ou Admin)
            if (isAlimentador || isAdmin) {
                let queryMov = `
                SELECT DataHoraMovimento, fk_Estoque_MP_BarCode, QuantidadeMovida, OperacaoValida, TipoErro,
                       Tempo_Verificacao_Material, Tempo_Verificacao_Maquina, Tempo_Total_Operacao
                FROM Registro_Movimentacao 
                WHERE fk_Funcionarios_IDFuncionario = ? 
            `;
                const queryParams = [id];

                if (startDate && endDate) {
                    queryMov += ' AND DATE(DataHoraMovimento) BETWEEN ? AND ?';
                    queryParams.push(startDate, endDate);
                }
                queryMov += ' ORDER BY DataHoraMovimento DESC';

                const [movimentacoes] = await pool.query(queryMov, queryParams);

                if (movimentacoes.length > 0) {
                    responseData.registros.movimentacoes = movimentacoes;

                    // Estatísticas Básicas
                    const total = movimentacoes.length;
                    const acertos = movimentacoes.filter(r => r.OperacaoValida === 1).length;
                    const errosPorTipo = movimentacoes.filter(r => r.OperacaoValida === 0).reduce((acc, row) => { acc[row.TipoErro] = (acc[row.TipoErro] || 0) + 1; return acc; }, {});

                    responseData.stats = {
                        totalOperacoes: total,
                        acertos,
                        erros: total - acertos,
                        taxaAcerto: total > 0 ? (acertos / total * 100).toFixed(1) : 0,
                        errosPorTipo
                    };

                    // Analytics de Tempo
                    const opsComTempo = movimentacoes.filter(m => m.OperacaoValida === 1 && m.Tempo_Total_Operacao > 0);
                    if (opsComTempo.length > 0) {
                        const calcStats = (arr) => ({
                            min: Math.min(...arr),
                            max: Math.max(...arr),
                            avg: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
                        });

                        const timesTotal = opsComTempo.map(m => m.Tempo_Total_Operacao);
                        const timesMat = opsComTempo.map(m => m.Tempo_Verificacao_Material || 0);
                        const timesMaq = opsComTempo.map(m => m.Tempo_Verificacao_Maquina || 0);

                        responseData.analytics = {
                            tempoTotal: calcStats(timesTotal),
                            tempoMaterial: calcStats(timesMat),
                            tempoMaquina: calcStats(timesMaq),
                            series: opsComTempo.map(m => ({
                                t: m.DataHoraMovimento,
                                total: m.Tempo_Total_Operacao,
                                mat: m.Tempo_Verificacao_Material,
                                maq: m.Tempo_Verificacao_Maquina
                            })).reverse()
                        };
                    }
                }
            }

            // 2. Tentar Buscar Identificações (Se Inspetor ou Admin - e se ainda não tiver analytics ou stats principal)
            if (isInspetor || (isAdmin && !responseData.registros.movimentacoes)) {
                let queryIdent = `
                SELECT DataHoraIdentificacao, fk_Estoque_MP_BarCode, fk_Tipos_MP_TipoMP, Tempo_Ate_Identificacao
                FROM Registro_Identificacao_MP 
                WHERE fk_Funcionarios_IDFuncionario = ?
            `;
                const queryParams = [id];
                if (startDate && endDate) {
                    queryIdent += ' AND DATE(DataHoraIdentificacao) BETWEEN ? AND ?';
                    queryParams.push(startDate, endDate);
                }
                queryIdent += ' ORDER BY DataHoraIdentificacao DESC';

                const [identificacoes] = await pool.query(queryIdent, queryParams);

                if (identificacoes.length > 0) {
                    responseData.registros.identificacoes = identificacoes;

                    // Analytics de Tempo (Se ainda não tiver analytics definidos pelo bloco de movimentação)
                    if (!responseData.analytics) {
                        const opsComTempo = identificacoes.filter(m => m.Tempo_Ate_Identificacao > 0);
                        if (opsComTempo.length > 0) {
                            const times = opsComTempo.map(m => m.Tempo_Ate_Identificacao);
                            responseData.analytics = {
                                tempoIdentificacao: {
                                    min: Math.min(...times),
                                    max: Math.max(...times),
                                    avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)
                                },
                                series: opsComTempo.map(m => ({
                                    t: m.DataHoraIdentificacao,
                                    val: m.Tempo_Ate_Identificacao
                                })).reverse()
                            };
                        }
                    }
                }
            }

            // 3. Tentar Buscar Conferência (Se Conferente ou Admin)
            if (isConferente || (isAdmin && !responseData.registros.movimentacoes && !responseData.registros.identificacoes)) {
                let queryEntrada = `SELECT r.DataHoraRegistro, r.fk_Estoque_MP_BarCode, e.fk_Berco_ID, e.Prateleira_Ocupada FROM Registro_Entrada_MP r JOIN Estoque_MP e ON r.fk_Estoque_MP_BarCode = e.BarCode WHERE r.fk_Funcionarios_IDFuncionario = ?`;
                const queryParams = [id];
                if (startDate && endDate) {
                    queryEntrada += ' AND DATE(r.DataHoraRegistro) BETWEEN ? AND ?';
                    queryParams.push(startDate, endDate);
                }
                queryEntrada += ' ORDER BY r.DataHoraRegistro DESC';
                const [registros] = await pool.query(queryEntrada, queryParams);
                if (registros.length > 0) {
                    responseData.registros.recebimentos = registros;
                }
            }
        }

        res.json(responseData);
    } catch (error) {
        console.error("Erro no dashboard funcionario:", error);
        res.status(500).json({ message: 'Erro interno.' });
    }
});

// Listar Fornecedores
router.get('/fornecedores', requireLogin, async (req, res) => {
    try {
        const [fornecedores] = await pool.query('SELECT CNPJ, Nome FROM Fornecedores ORDER BY Nome');
        res.json({ success: true, fornecedores });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno.' });
    }
});

// Lote para identificar
router.get('/lote/para-identificar/:barcode(*)', requireLogin, async (req, res) => {
    const { barcode } = req.params;
    try {
        const [lotes] = await pool.query(
            `SELECT e.BarCode, f.Nome as NomeFornecedor, b.Nome as NomeBerco, e.Prateleira_Ocupada
             FROM Estoque_MP e
             JOIN Fornecedores f ON e.fk_Fornecedores_CNPJ = f.CNPJ
             JOIN Bercos b ON e.fk_Berco_ID = b.ID
             WHERE e.BarCode = ? AND e.fk_Tipos_MP_TipoMP = 'Aguardando Identificação'`,
            [barcode]
        );
        if (lotes.length === 0) return res.status(404).json({ message: 'Lote não encontrado ou já identificado.' });
        res.json({ success: true, lote: lotes[0] });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar lote.' });
    }
});

// Finalizar Qualidade
router.post('/qualidade/finalizar', requireLogin, async (req, res) => {
    const { barcode, denominacaoMaterial, codPeca, item, quantidade, corrida, observacao } = req.body;
    const funcionarioId = req.session.userId;
    const nomeOperador = req.session.nome;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        await connection.query(
            `UPDATE Estoque_MP SET fk_Tipos_MP_TipoMP = ?, Quantidade = ? WHERE BarCode = ?`,
            [denominacaoMaterial, quantidade, barcode]
        );
        // 1. Busca Data de Entrada para calcular tempo até identificação
        const [entradaRows] = await connection.query(
            'SELECT DataHoraRegistro FROM Registro_Entrada_MP WHERE fk_Estoque_MP_BarCode = ? ORDER BY DataHoraRegistro DESC LIMIT 1',
            [barcode]
        );

        let tempoAteIdentificacao = null;
        if (entradaRows.length > 0) {
            const dataEntrada = new Date(entradaRows[0].DataHoraRegistro);
            const agora = new Date();
            tempoAteIdentificacao = Math.floor((agora - dataEntrada) / 1000); // Diferença em segundos
        }

        await connection.query(
            `INSERT INTO Registro_Identificacao_MP (DataHoraIdentificacao, fk_Funcionarios_IDFuncionario, fk_Tipos_MP_TipoMP, fk_Estoque_MP_BarCode, Tempo_Ate_Identificacao) VALUES (?, ?, ?, ?, ?)`,
            [new Date(), funcionarioId, denominacaoMaterial, barcode, tempoAteIdentificacao]
        );

        await connection.commit();

        const [dadosCompletos] = await pool.query(
            `SELECT f.Nome as NomeFornecedor FROM Estoque_MP e JOIN Fornecedores f ON e.fk_Fornecedores_CNPJ = f.CNPJ WHERE e.BarCode = ?`,
            [barcode]
        );

        res.status(200).json({
            success: true,
            message: 'Material identificado! Gerando etiqueta...',
            dadosEtiqueta: {
                fornecedor: dadosCompletos[0].NomeFornecedor,
                denominacao: denominacaoMaterial,
                codPeca: codPeca,
                item: item,
                operador: nomeOperador,
                dataRec: new Date().toLocaleDateString('pt-BR'),
                qtdRecebida: `${quantidade} PÇ`,
                qtdAmarrados: '0',
                corrida: corrida,
                observacao: observacao || '',
                codigoLote: barcode
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao finalizar identificação:", error);
        res.status(500).json({ success: false, message: 'Erro interno.' });
    } finally {
        if (connection) connection.release();
    }
});

// Compatibilidades de Máquina
router.get('/maquina/:id/compatibilidades', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;

        const [maquinaRows] = await pool.query('SELECT Identificacao FROM Maquinas WHERE Identificacao = ?', [id]);
        if (maquinaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Máquina não encontrada.' });
        }

        const [materiais] = await pool.query(
            `SELECT fk_Tipos_MP_TipoMP FROM Compativel WHERE fk_Maquina_Identificacao = ?`,
            [id]
        );
        res.json({ success: true, materiais: materiais.map(m => m.fk_Tipos_MP_TipoMP) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao buscar materiais compatíveis.' });
    }
});

// Localização do Material
router.get('/material/localizacao', requireLogin, async (req, res) => {
    const { tipo } = req.query;
    if (!tipo) return res.status(400).json({ success: false, message: 'O tipo de material é obrigatório.' });

    try {
        const tipoDecodificado = decodeURIComponent(tipo);
        const [lotes] = await pool.query(
            `SELECT e.BarCode, b.Nome as NomeBerco, e.Prateleira_Ocupada
             FROM Estoque_MP e
             JOIN Bercos b ON e.fk_Berco_ID = b.ID
             WHERE e.fk_Tipos_MP_TipoMP = ? AND e.Quantidade IS NOT NULL AND e.Quantidade > 0
             ORDER BY e.BarCode ASC LIMIT 1`,
            [tipoDecodificado]
        );
        if (lotes.length === 0) return res.status(404).json({ success: false, message: `Nenhum lote de '${tipoDecodificado}' disponível no estoque.` });
        res.json({ success: true, localizacao: lotes[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno.' });
    }
});

// Validar Material (Complexo)
router.post('/movimentacao/validar-material', requireLogin, async (req, res) => {
    const { maquinaId, materialEsperadoBarcode, materialLidoBarcode } = req.body;

    if (materialLidoBarcode === materialEsperadoBarcode) {
        try {
            // Busca a quantidade disponível deste lote
            const [rows] = await pool.query('SELECT Quantidade FROM Estoque_MP WHERE BarCode = ?', [materialLidoBarcode]);
            const quantidadeDisponivel = rows.length > 0 ? rows[0].Quantidade : 0;

            return res.json({
                success: true,
                message: 'Material correto.',
                quantidadeDisponivel: quantidadeDisponivel
            });
        } catch (error) {
            console.error("Erro ao buscar quantidade do material:", error);
            // Se der erro ao buscar quantidade, ainda validamos o material, mas retornamos qtd 0 (ou tratamos no front)
            return res.json({ success: true, message: 'Material correto.', quantidadeDisponivel: 0 });
        }
    }

    try {
        await logarMovimentacaoInvalida({
            tipoErro: 'material',
            maquinaId: maquinaId,
            funcionarioId: req.session.userId,
            barcodeEsperado: materialEsperadoBarcode,
            barcodeLido: materialLidoBarcode
        });
        res.status(400).json({ success: false, message: 'Erro: Material escaneado não é o correto. Tente novamente.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno ao registrar a falha.' });
    }
});

// Finalizar Movimentação (Complexo)
router.post('/movimentacao/finalizar', requireLogin, async (req, res) => {
    const { maquinaId, materialBarcode, maquinaConfirmacaoId, quantidadeMovida } = req.body;
    const funcionarioId = req.session.userId;

    if (maquinaId !== maquinaConfirmacaoId) {
        try {
            await logarMovimentacaoInvalida({
                tipoErro: 'maquina_confirmacao',
                maquinaId: maquinaId,
                funcionarioId: funcionarioId,
                barcodeEsperado: materialBarcode,
                barcodeLido: `MAQUINA:${maquinaConfirmacaoId}`
            });
            return res.status(400).json({ success: false, message: 'Erro: Máquina de confirmação incorreta. Tente novamente.' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Erro interno ao registrar a falha.' });
        }
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [loteRows] = await connection.query('SELECT Quantidade FROM Estoque_MP WHERE BarCode = ? FOR UPDATE', [materialBarcode]);
        if (loteRows.length === 0 || loteRows[0].Quantidade < quantidadeMovida) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Lote não encontrado ou quantidade insuficiente no estoque.' });
        }

        const novaQuantidade = loteRows[0].Quantidade - quantidadeMovida;
        await connection.query('UPDATE Estoque_MP SET Quantidade = ? WHERE BarCode = ?', [novaQuantidade, materialBarcode]);

        // SE QUANTIDADE É 0, LIBERA O BERÇO
        if (novaQuantidade === 0) {
            // Busca onde o material está
            const [localRows] = await connection.query('SELECT fk_Berco_ID, Prateleira_Ocupada FROM Estoque_MP WHERE BarCode = ?', [materialBarcode]);
            if (localRows.length > 0) {
                const { fk_Berco_ID, Prateleira_Ocupada } = localRows[0];
                if (fk_Berco_ID && Prateleira_Ocupada) {
                    // Limpa a prateleira na tabela Bercos
                    const prateleiraCol = `Prateleira_${Prateleira_Ocupada}`;
                    await connection.query(`UPDATE Bercos SET ${prateleiraCol} = NULL WHERE ID = ?`, [fk_Berco_ID]);

                    // Limpa a referência no Estoque (opcional, mas bom para consistência se ele não está mais lá)
                    await connection.query('UPDATE Estoque_MP SET fk_Berco_ID = NULL, Prateleira_Ocupada = NULL WHERE BarCode = ?', [materialBarcode]);
                }
            }
        }

        await connection.query(
            `INSERT INTO Registro_Movimentacao 
             (DataHoraMovimento, QuantidadeMovida, fk_Estoque_MP_BarCode, BarcodeLido, fk_Maquina_Identificacao, fk_Funcionarios_IDFuncionario, OperacaoValida, TipoErro, Tempo_Verificacao_Material, Tempo_Verificacao_Maquina, Tempo_Total_Operacao) 
             VALUES (?, ?, ?, ?, ?, ?, 1, '----', ?, ?, ?)`,
            [new Date(), quantidadeMovida, materialBarcode, materialBarcode, maquinaId, funcionarioId,
            req.body.tempoVerificacaoMaterial || null,
            req.body.tempoVerificacaoMaquina || null,
            req.body.tempoTotalOperacao || null]
        );

        await connection.commit();
        res.status(201).json({ success: true, message: 'Movimentação registrada com sucesso!' });

    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    } finally {
        if (connection) connection.release();
    }
});

export default router;
