// backend/server.js

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import session from 'express-session';
import pool from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer();

// --- CONFIGURAÇÃO E MIDDLEWARES PRINCIPAIS ---

// Configuração do View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(projectRoot, 'views'));

// Middleware para proteger rotas DE ADMIN
const requireAdmin = (req, res, next) => {
  if (req.session.nivelAcesso !== 'Total') {
    return res.status(403).redirect('/lobby'); 
  }
  next();
};

// Middlewares essenciais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração do Express Session
app.use(session({
  secret: 'seu_segredo_super_secreto_aqui',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 1000 * 60 * 60
  }
}));

// Middleware para proteger rotas
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  next();
};


// --- ROTAS DA APLICAÇÃO ---

// Rota da página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'index.html'));
});


// Rota do Lobby (protegida)
app.get('/lobby', requireLogin, (req, res) => {
  const { nivelAcesso, cargo, nome } = req.session;
  let linksPermitidos = [];

  // Usando 'if / else if' para garantir que apenas um bloco de permissão seja executado
  if (nivelAcesso === 'Total') {
    // Nível Total (Admin) tem acesso a tudo.
    linksPermitidos.push({ nome: 'Painel do Administrador', url: '/admin' });
    linksPermitidos.push({ nome: 'Dashboard de Gestão', url: '/gestao' });
    linksPermitidos.push({ nome: 'Controle de Recebimento', url: '/recebimento' });
    linksPermitidos.push({ nome: 'Identificação de Material', url: '/qualidade' });
    linksPermitidos.push({ nome: 'Movimentação de Material', url: '/movimentacao' });
  
  } else if (nivelAcesso === 'Gestor') {
    // Nível Gestor tem acesso a dashboards e pode ter acesso a outras telas no futuro.
    if (cargo === 'Gerente de Produção') {
      linksPermitidos.push({ nome: 'Dashboard de Gestão', url: '/gestao' });
    }
  
  } else if (nivelAcesso === 'Usuario') {
    // Nível Usuário tem acesso apenas às suas telas operacionais específicas.
    if (cargo === 'Conferente') {
      linksPermitidos.push({ nome: 'Controle de Recebimento', url: '/recebimento' });
    }
    if (cargo === 'Inspetor de Qualidade') {
      linksPermitidos.push({ nome: 'Identificação de Material', url: '/qualidade' });
    }
    if (cargo === 'Alimentador de Linha') {
      linksPermitidos.push({ nome: 'Movimentação de Material', url: '/movimentacao' });
    }
  }

  res.render('lobby', { nome, links: linksPermitidos });
});


// Rota de Controle de Recebimento (protegida)
app.get('/recebimento', requireLogin, async (req, res) => {
    try {
        // Busca fornecedores e tipos de matéria-prima do banco
        const [fornecedores] = await pool.query('SELECT CNPJ, Nome FROM Fornecedores');
        const [tiposMP] = await pool.query('SELECT TipoMP FROM Tipos_MP');
        
        // Renderiza a página passando os dados
        res.render('recebimento', { fornecedores, tiposMP });
    } catch (error) {
        console.error("Erro ao buscar dados para a página de recebimento:", error);
        // Em caso de erro, renderiza com arrays vazios para não quebrar a página
        res.render('recebimento', { fornecedores: [], tiposMP: [] });
    }
});

// Rota para Qualidade (protegida)
app.get('/qualidade', requireLogin, async (req, res) => {
    try {
        // Busca todos os tipos de matéria-prima, EXCETO o placeholder.
        const [tiposMP] = await pool.query(
            "SELECT TipoMP FROM Tipos_MP WHERE TipoMP != 'Aguardando Identificação' ORDER BY TipoMP"
        );
        res.render('qualidade', { tiposMP });
    } catch (error) {
        console.error("Erro ao buscar tipos de matéria-prima:", error);
        res.render('qualidade', { tiposMP: [] });
    }
});

// Rota para Movimentação (protegida)
app.get('/movimentacao', requireLogin, async (req, res) => {
    try {
        // Busca as máquinas cadastradas no banco
        const [maquinas] = await pool.query('SELECT Identificacao, Modelo FROM Maquinas ORDER BY Modelo');
        res.render('movimentacao', { maquinas });
    } catch (error) {
        console.error("Erro ao buscar máquinas:", error);
        res.render('movimentacao', { maquinas: [] });
    }
});

// Rota para Gestão (protegida)
app.get('/gestao', requireLogin, (req, res) => {
    res.render('gestao');
});

// Endpoint para REGISTRAR a entrada de material
app.post('/api/recebimento', requireLogin, async (req, res) => {
    // 1. O 'tipoMP' foi REMOVIDO do corpo da requisição.
    const { fornecedorCnpj, quantidade, codigoLote } = req.body;
    const funcionarioId = req.session.userId;
    
    if (!fornecedorCnpj || !quantidade || !codigoLote) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // ETAPA 1: Inserir na tabela de estoque com um tipo padrão.
        // O material será identificado posteriormente pela equipe de Qualidade.
        const sqlEstoque = `
            INSERT INTO Estoque_MP (BarCode, Quantidade, fk_Tipos_MP_TipoMP, fk_Fornecedores_CNPJ) 
            VALUES (?, ?, 'Aguardando Identificação', ?) 
        `;
        
        await connection.query(sqlEstoque, [codigoLote, quantidade, fornecedorCnpj]);

        const sqlRegistro = `
            INSERT INTO Registro_Entrada_MP (DataHoraRegistro, fk_Estoque_MP_BarCode, fk_Funcionarios_IDFuncionario)
            VALUES (?, ?, ?)
        `;
        await connection.query(sqlRegistro, [new Date(), codigoLote, funcionarioId]);
        
        await connection.commit();
        
        res.status(201).json({ success: true, message: 'Material registrado com sucesso! Aguardando identificação pela Qualidade.' });

    } catch (error) {
        if (connection) await connection.rollback();
        
        console.error("Erro na transação de registro de material:", error);
        res.status(500).json({ success: false, message: 'Erro ao registrar o material. A operação foi cancelada.' });
    } finally {
        if (connection) connection.release();
    }
});

// Endpoint para REGISTRAR a movimentação de material para uma máquina
app.post('/api/movimentacao', requireLogin, async (req, res) => {
    const { codigoLote, maquinaId, quantidadeMovida } = req.body;
    const funcionarioId = req.session.userId;

    // Validação inicial dos dados recebidos
    if (!codigoLote || !maquinaId || !quantidadeMovida || parseInt(quantidadeMovida) <= 0) {
        return res.status(400).json({ success: false, message: 'Código do Lote, Máquina e uma Quantidade válida são obrigatórios.' });
    }

    let connection;
    try {
        // Inicia a transação para garantir que todas as operações ocorram ou nenhuma ocorra
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Busca o lote e sua quantidade atual, travando a linha para evitar condições de corrida
        const [estoqueRows] = await connection.query(
            'SELECT BarCode, Quantidade, fk_Tipos_MP_TipoMP FROM Estoque_MP WHERE BarCode = ? FOR UPDATE', 
            [codigoLote]
        );
        
        // Validação 1: O lote existe no estoque?
        if (estoqueRows.length === 0) {
            await connection.rollback(); // Desfaz a transação
            return res.status(404).json({ success: false, message: 'Lote não encontrado no estoque. Verifique o código de barras.' });
        }
        
        const lote = estoqueRows[0];

        // Validação 2: A quantidade a ser movida é maior que a disponível?
        if (parseInt(quantidadeMovida) > lote.Quantidade) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `Quantidade a ser movida (${quantidadeMovida}) é maior que a disponível em estoque (${lote.Quantidade}).` });
        }
        
        // Validação 3: O material já foi identificado pela Qualidade?
        if (lote.fk_Tipos_MP_TipoMP === 'Aguardando Identificação') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Este lote ainda não foi identificado pela equipe de Qualidade e não pode ser movimentado.' });
        }

        // Validação 4: O material é compatível com a máquina de destino?
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

        // Se todas as validações passaram, executa as atualizações no banco
        
        // ETAPA 1: Subtrai a quantidade do estoque principal
        const novaQuantidade = lote.Quantidade - parseInt(quantidadeMovida);
        await connection.query(
            'UPDATE Estoque_MP SET Quantidade = ? WHERE BarCode = ?',
            [novaQuantidade, codigoLote]
        );

        // ETAPA 2: Insere o registro da movimentação com a quantidade específica
         const sqlMovimentacao = `
            INSERT INTO Registro_Movimentacao 
            (DataHoraMovimento, QuantidadeMovida, fk_Estoque_MP_BarCode, fk_Maquina_Identificacao, fk_Funcionarios_IDFuncionario)
            VALUES (?, ?, ?, ?, ?)
        `;
        // A ordem dos parâmetros no array agora corresponde à ordem na query.
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

// Endpoint de Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.redirect('/lobby');
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// Endpoint de login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
  try {
    const [rows] = await pool.query('SELECT IDFuncionario, Nome, NivelAcesso, Cargo FROM Funcionarios WHERE Email = ? AND Senha = ?', [email, password]);
    if (rows.length > 0) {
      const user = rows[0];
      req.session.userId = user.IDFuncionario;
      req.session.nome = user.Nome;
      req.session.nivelAcesso = user.NivelAcesso;
      req.session.cargo = user.Cargo;
      req.session.save(err => {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao iniciar a sessão' });
        res.status(200).json({ success: true, message: 'Login bem-sucedido', redirectUrl: '/lobby' });
      });
    } else {
      res.status(401).json({ success: false, message: 'Email ou senha inválidos' });
    }
  } catch (error) {
    console.error('Erro no banco de dados:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});


// Rota para a página do Painel do Administrador
app.get('/admin', requireLogin, requireAdmin, (req, res) => {
    res.render('admin');
});

// API para buscar TODOS os dados para o painel de admin
app.get('/api/admin/data', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [employees] = await pool.query('SELECT IDFuncionario, Nome, Email, Cargo, NivelAcesso FROM Funcionarios');
        const [machines] = await pool.query('SELECT Identificacao, Modelo FROM Maquinas');
        const [materials] = await pool.query("SELECT TipoMP FROM Tipos_MP WHERE TipoMP != 'Aguardando Identificação'");
        const [compatibilities] = await pool.query('SELECT fk_Tipos_MP_TipoMP as tipoMP, fk_Maquina_Identificacao as maquinaId FROM Compativel');
        
        res.json({ employees, machines, materials, compatibilities });
    } catch (error) {
        console.error("Erro ao buscar dados de admin:", error);
        res.status(500).json({ message: "Erro ao carregar dados." });
    }
});

// API para CRUD de Funcionários
app.post('/api/admin/employees', requireLogin, requireAdmin, async (req, res) => {
    const { nome, email, cpf, senha, cargo, nivelAcesso } = req.body;
    
    // Garante que o CPF salvo no banco não tenha máscara
    const unmaskedCpf = cpf ? cpf.replace(/\D/g, '') : null;

    if (!nome || !email || !unmaskedCpf || !senha || !cargo || !nivelAcesso) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }

    try {
        const sql = 'INSERT INTO Funcionarios (Nome, Email, CPF, Senha, Cargo, NivelAcesso) VALUES (?, ?, ?, ?, ?, ?)';
        await pool.query(sql, [nome, email, unmaskedCpf, senha, cargo, nivelAcesso]);
        
        res.status(201).json({ success: true, message: 'Funcionário criado com sucesso!' });
    } catch (error) {
        console.error("Erro ao criar funcionário:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Erro: Email ou CPF já cadastrado no sistema.' });
        }
        res.status(500).json({ success: false, message: 'Erro interno ao criar funcionário.' });
    }
});
// APIs para CRUD de Máquinas
app.post('/api/admin/machines', requireLogin, requireAdmin, async (req, res) => {
    const { modelo } = req.body;
    try {
        await pool.query('INSERT INTO Maquinas (Modelo) VALUES (?)', [modelo]);
        res.status(201).json({ success: true, message: 'Máquina criada com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao criar máquina.' });
    }
});
app.put('/api/admin/machines/:id', requireLogin, requireAdmin, async (req, res) => {
    const { modelo } = req.body;
    const { id } = req.params;
    try {
        await pool.query('UPDATE Maquinas SET Modelo = ? WHERE Identificacao = ?', [modelo, id]);
        res.status(200).json({ success: true, message: 'Máquina atualizada com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao atualizar máquina.' });
    }
});

// APIs para CRUD de Tipos de Materiais
app.post('/api/admin/materials', requireLogin, requireAdmin, async (req, res) => {
    const { tipoMP } = req.body;
    try {
        await pool.query('INSERT INTO Tipos_MP (TipoMP) VALUES (?)', [tipoMP]);
        res.status(201).json({ success: true, message: 'Tipo de material criado com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao criar tipo de material.' });
    }
});
app.put('/api/admin/materials/:type', requireLogin, requireAdmin, async (req, res) => {
    const { novoTipoMP } = req.body;
    const { type } = req.params;
    try {
        await pool.query('UPDATE Tipos_MP SET TipoMP = ? WHERE TipoMP = ?', [novoTipoMP, type]);
        res.status(200).json({ success: true, message: 'Tipo de material atualizado com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao atualizar tipo de material.' });
    }
});

// APIs para CRUD de Compatibilidade
app.post('/api/admin/compatibility', requireLogin, requireAdmin, async (req, res) => {
    const { tipoMP, maquinaId } = req.body;
    try {
        await pool.query('INSERT INTO Compativel (fk_Tipos_MP_TipoMP, fk_Maquina_Identificacao) VALUES (?, ?)', [tipoMP, maquinaId]);
        res.status(201).json({ success: true, message: 'Compatibilidade adicionada!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao adicionar compatibilidade. Ela já pode existir.' });
    }
});
app.delete('/api/admin/compatibility', requireLogin, requireAdmin, async (req, res) => {
    const { tipoMP, maquinaId } = req.body;
    try {
        await pool.query('DELETE FROM Compativel WHERE fk_Tipos_MP_TipoMP = ? AND fk_Maquina_Identificacao = ?', [tipoMP, maquinaId]);
        res.status(200).json({ success: true, message: 'Compatibilidade removida!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao remover compatibilidade.' });
    }
});

// API para buscar detalhes de um lote específico
app.get('/api/lote/:barcode', requireLogin, async (req, res) => {
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

// API para registrar a identificação de um material (com transação)
app.post('/api/identificar', requireLogin, async (req, res) => {
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
app.get('/api/dashboard/gestao', requireLogin, async (req, res) => {
    try {
        // 1. KPIs (Key Performance Indicators) com aliases explícitos
        const [kpiStock] = await pool.query("SELECT COUNT(*) as totalStock, SUM(CASE WHEN fk_Tipos_MP_TipoMP = 'Aguardando Identificação' THEN 1 ELSE 0 END) as awaitingId FROM Estoque_MP");
        const [kpiMovimentos] = await pool.query("SELECT COUNT(*) as movementsToday, SUM(QuantidadeMovida) as unitsMovedToday FROM Registro_Movimentacao WHERE DATE(DataHoraMovimento) = CURDATE()");
        const [kpiFuncionarios] = await pool.query("SELECT COUNT(*) as totalEmployees FROM Funcionarios");

        // 2. Gráfico de Estoque por Tipo
        const [stockByType] = await pool.query(`
        SELECT 
            fk_Tipos_MP_TipoMP as tipo, 
            COUNT(*) as lotes,
            SUM(Quantidade) as totalQuantidade
        FROM Estoque_MP 
        GROUP BY fk_Tipos_MP_TipoMP 
        ORDER BY lotes DESC
        `);

        // 3. Gráfico de Consumo de Unidades por Máquina
        const [consumptionByMachine] = await pool.query(`
            SELECT m.Modelo, SUM(rm.QuantidadeMovida) as totalMovido
            FROM Registro_Movimentacao rm
            JOIN Maquinas m ON rm.fk_Maquina_Identificacao = m.Identificacao
            GROUP BY m.Modelo
            ORDER BY totalMovido DESC
        `);

        // 4. Últimas 5 Entradas
        const [recentEntries] = await pool.query(`
            SELECT r.DataHoraRegistro, e.BarCode, f.Nome as funcionarioNome
            FROM Registro_Entrada_MP r
            JOIN Estoque_MP e ON r.fk_Estoque_MP_BarCode = e.BarCode
            JOIN Funcionarios f ON r.fk_Funcionarios_IDFuncionario = f.IDFuncionario
            ORDER BY r.DataHoraRegistro DESC LIMIT 5
        `);
        
        // 5. Últimas 5 Movimentações (com alias explícito para QuantidadeMovida)
        const [recentMovements] = await pool.query(`
            SELECT 
                rm.DataHoraMovimento, 
                rm.fk_Estoque_MP_BarCode as BarCode, 
                rm.QuantidadeMovida AS quantidadeMovida, -- Alias explícito para garantir o nome da propriedade
                f.Nome as funcionarioNome, 
                m.Modelo as maquinaNome
            FROM Registro_Movimentacao rm
            JOIN Funcionarios f ON rm.fk_Funcionarios_IDFuncionario = f.IDFuncionario
            JOIN Maquinas m ON rm.fk_Maquina_Identificacao = m.Identificacao
            ORDER BY rm.DataHoraMovimento DESC LIMIT 5
        `);

        // Monta o objeto de resposta final
        const dashboardData = {
            kpis: {
                totalStock: kpiStock[0].totalStock || 0,
                awaitingId: kpiStock[0].awaitingId || 0,
                movementsToday: kpiMovimentos[0].movementsToday || 0,
                unitsMovedToday: kpiMovimentos[0].unitsMovedToday || 0,
                totalEmployees: kpiFuncionarios[0].totalEmployees || 0
            },
            stockByType,
            consumptionByMachine,
            recentEntries,
            recentMovements
        };

        res.json(dashboardData);

    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ message: "Erro ao carregar dados do dashboard." });
    }
});

// API para VERIFICAR existência de Email ou CPF
app.post('/api/admin/employees/check', requireLogin, requireAdmin, async (req, res) => {
    const { email, cpf } = req.body;
    
    // Remove qualquer formatação do CPF para a busca
    const unmaskedCpf = cpf ? cpf.replace(/\D/g, '') : null;

    if (!email && !unmaskedCpf) {
        return res.status(400).json({ message: 'Email ou CPF é necessário para a verificação.' });
    }

    try {
        let query = 'SELECT Email, CPF FROM Funcionarios WHERE';
        const params = [];
        const conditions = [];

        if (email) {
            conditions.push('Email = ?');
            params.push(email);
        }
        if (unmaskedCpf) {
            conditions.push('CPF = ?');
            params.push(unmaskedCpf);
        }

        query += ` ${conditions.join(' OR ')}`;
        
        const [rows] = await pool.query(query, params);

        const emailExists = rows.some(row => row.Email === email);
        const cpfExists = rows.some(row => row.CPF === unmaskedCpf);

        res.json({ emailExists, cpfExists });

    } catch (error) {
        console.error("Erro na verificação de funcionário:", error);
        res.status(500).json({ message: 'Erro interno ao verificar dados.' });
    }
});

// --- SERVIDORES DE ARQUIVOS ESTÁTICOS (DEFINIDOS POR ÚLTIMO) ---

// Servir assets específicos das views (como recebimento.js)
app.use(express.static(path.join(projectRoot, 'public')));
// Servir assets da página principal (como index.html, login.js, style.css)
app.use(express.static(projectRoot));


// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});