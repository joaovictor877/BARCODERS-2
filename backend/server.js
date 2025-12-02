// backend/server.js
import puppeteer from 'puppeteer';
import bwipjs from 'bwip-js';
import fs from 'fs/promises';
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
const port = process.env.PORT || 8080;
const upload = multer();

// --- CONFIGURAÇÃO E MIDDLEWARES PRINCIPAIS ---

// Configuração do View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(projectRoot, 'views'));

// Middleware para proteger rotas DE ADMIN
const requireAdmin = (req, res, next) => {
    if (req.session.NivelAcesso !== 'Total') {
        return res.status(403).redirect('/lobby');
    }
    next();
};

// Middlewares essenciais
app.use(cors());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
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


//Login facial 
//Login facial 
app.post('/api/login-facial', async (req, res) => {
    const { id, descriptor } = req.body;
    
    console.log('Login facial - ID:', id);
    console.log('Login facial - Descriptor recebido:', descriptor ? 'sim' : 'não');
    
    try {
        const [rows] = await pool.query(
            'SELECT IDFuncionario, Nome, NivelAcesso, Cargo, Face_Embedding FROM Funcionarios WHERE IDFuncionario = ?',
            [id]
        );
        
        console.log('Funcionários encontrados:', rows.length);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado.' });
        }
        const funcionario = rows[0];

        if (!funcionario.Face_Embedding) {
            return res.status(400).json({ message: 'Funcionário sem biometria cadastrada.' });
        }

        if (!descriptor || !Array.isArray(descriptor)) {
            console.log('Descritor inválido:', typeof descriptor);
            return res.status(400).json({ message: 'Descritor facial inválido.' });
        }

        console.log('Comparando descritores...');
        
        // Importa a função de comparação
        const { compareFaceDescriptors } = await import('./faceRecognition.js');
        const result = await compareFaceDescriptors(descriptor, funcionario.Face_Embedding);

        console.log('Resultado da comparação:', result);

        if (result.match) {
            // Cria session
            req.session.userId = funcionario.IDFuncionario;
            req.session.NivelAcesso = funcionario.NivelAcesso;
            req.session.cargo = funcionario.Cargo;
            req.session.nome = funcionario.Nome;
            res.json({ success: true, message: 'Login realizado com sucesso!', redirect: '/lobby' });
        } else {
            res.status(401).json({ success: false, message: result.message || 'Rosto não reconhecido.' });
        }

    } catch (error) {
        console.error('Erro no login facial:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ message: 'Erro interno no login: ' + error.message });
    }
});

// Rota para cadastrar biometria facial (SEM autenticação para primeiro admin)
app.post('/api/cadastrar-face', async (req, res) => {
    const { id, descriptor } = req.body;
    
    console.log('Cadastro de face - ID:', id);
    
    try {
        if (!descriptor || !Array.isArray(descriptor)) {
            return res.status(400).json({ message: 'Descritor facial inválido.' });
        }

        // Verifica se funcionário existe
        const [rows] = await pool.query(
            'SELECT IDFuncionario, Nome FROM Funcionarios WHERE IDFuncionario = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado. Execute o SQL primeiro!' });
        }

        const funcionario = rows[0];

        // Salva o descriptor como JSON
        const descriptorJson = JSON.stringify(descriptor);
        
        await pool.query(
            'UPDATE Funcionarios SET Face_Embedding = ? WHERE IDFuncionario = ?',
            [descriptorJson, id]
        );

        console.log('Biometria cadastrada para:', funcionario.Nome);
        
        res.json({ 
            success: true, 
            message: `Biometria cadastrada com sucesso para ${funcionario.Nome}! Agora você pode fazer login facial.` 
        });

    } catch (error) {
        console.error('Erro ao cadastrar face:', error);
        res.status(500).json({ message: 'Erro ao salvar biometria: ' + error.message });
    }
});

// Rota de teste do banco de dados
app.get('/api/test-db', async (req, res) => {
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

// Rota da página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'index.html'));
});

// Rota para página de cadastro de face
app.get('/cadastro-face.html', (req, res) => {
    res.sendFile(path.join(projectRoot, 'cadastro-face.html'));
});

// Rota de teste do banco de dados
app.get('/api/test-db', async (req, res) => {
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

// Rota do Lobby (protegida)
app.get('/lobby', requireLogin, (req, res) => {
    const { NivelAcesso, cargo, nome } = req.session;
    let linksPermitidos = [];

    // Usando 'if / else if' para garantir que apenas um bloco de permissão seja executado
    if (NivelAcesso === 'Total') {
        // Nível Total (Admin) tem acesso a tudo.
        linksPermitidos.push({ nome: 'Painel do Administrador', url: '/admin' });
        linksPermitidos.push({ nome: 'Dashboard de Gestão', url: '/gestao' });
        linksPermitidos.push({ nome: 'Controle de Recebimento', url: '/recebimento' });
        linksPermitidos.push({ nome: 'Identificação de Material', url: '/qualidade' });
        linksPermitidos.push({ nome: 'Movimentação de Material', url: '/movimentacao' });
        linksPermitidos.push({ nome: 'Dashboard de Funcionários', url: '/dashboard-funcionario' });


    } else if (NivelAcesso === 'Gestor') {
        // Nível Gestor tem acesso a dashboards e pode ter acesso a outras telas no futuro.
        if (cargo === 'Gerente de Produção') {
            linksPermitidos.push({ nome: 'Dashboard de Gestão', url: '/gestao' });
            linksPermitidos.push({ nome: 'Dashboard de Funcionários', url: '/dashboard-funcionario' });

        }
    } else if (NivelAcesso === 'Usuario') {
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

// Rota para buscar funcionário por ID (pública para login facial)
app.get('/api/funcionario/:id', async (req, res) => {
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
// ROTA PARA O RECEBIMENTO: Buscar berços e prateleiras disponíveis
app.get('/api/bercos/disponiveis', requireLogin, async (req, res) => {
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

// ROTA PARA O DASHBOARD DE FUNCIONÁRIOS (PROTEGIDA)

app.get('/dashboard-funcionario', requireLogin, async (req, res) => {
    // Apenas Admins e Gestores podem acessar esta página
    if (req.session.NivelAcesso !== 'Total' && req.session.NivelAcesso !== 'Gestor') {
        return res.status(403).redirect('/lobby');
    }
    try {
        // Busca todos os funcionários para popular o menu de seleção
        const [employees] = await pool.query('SELECT IDFuncionario, Nome, Cargo FROM Funcionarios ORDER BY Nome');
        res.render('dashboard-funcionario', { employees });
    } catch (error) {
        res.status(500).render('dashboard-funcionario', { employees: [] });
    }
});

// 2. ROTA PARA O RECEBIMENTO: Registrar entrada inicial e gerar código de barras
app.post('/api/recebimento/registrar', requireLogin, async (req, res) => {
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
            req.session.NivelAcesso = user.NivelAcesso;
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

// --- ROTAS DO PAINEL ADMIN (PROTEGIDAS POR requireAdmin) ---

// Listar todos os funcionários (para tabela)
app.get('/api/admin/employees', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT IDFuncionario, Nome, Cargo, NivelAcesso FROM Funcionarios'
        );
        res.json({ employees: rows });
    } catch (error) {
        console.error('Erro ao listar funcionários:', error);
        res.status(500).json({ message: 'Erro ao carregar funcionários.' });
    }
});

// Buscar funcionário por ID (para edição ou login facial)
app.get('/api/admin/employees/:id', requireLogin, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT IDFuncionario, Nome, Foto, Face_Embedding, Email, CPF, Cargo, NivelAcesso FROM Funcionarios WHERE IDFuncionario = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado.' });
        }
        const emp = rows[0];
        // Converte Foto BLOB para base64 se existir
        if (emp.Foto) {
            emp.fotoBase64 = `data:image/jpeg;base64,${Buffer.from(emp.Foto).toString('base64')}`;
        }
        // Converte Face_Embedding TEXT para array
        if (emp.Face_Embedding) {
            emp.face_embedding = JSON.parse(emp.Face_Embedding);
        }
        res.json({ employee: emp });
    } catch (error) {
        console.error('Erro ao buscar funcionário:', error);
        res.status(500).json({ message: 'Erro ao carregar funcionário.' });
    }
});

// Adicionar ou editar funcionário (POST/PUT)
app.post('/api/admin/employees', requireLogin, requireAdmin, async (req, res) => {
    const { id, nome, email, cpf, cargo, foto, face_embedding } = req.body;

    // --- Regra de Negócio: Define o Nível de Acesso com base no Cargo ---
    let nivelAcesso;
    switch (cargo) {
        case 'Administrador':
            nivelAcesso = 'Total';
            break;
        case 'Gerente de Produção':
            nivelAcesso = 'Gestor';
            break;
        case 'Conferente':
        case 'Inspetor de Qualidade':
        case 'Alimentador de Linha':
            nivelAcesso = 'Usuario';
            break;
        default:
            return res.status(400).json({ message: 'Cargo inválido selecionado.' });
    }

    try {
        if (!nome || !email || !cpf || !cargo) {
            return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        const unmaskedCpf = cpf.replace(/\D/g, '');
        if (unmaskedCpf.length !== 11) {
            return res.status(400).json({ message: 'O CPF fornecido é inválido.' });
        }

        const [existing] = await pool.query(
            'SELECT IDFuncionario FROM Funcionarios WHERE (Email = ? OR CPF = ?) AND IDFuncionario != ?',
            [email, unmaskedCpf, id || 0]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email ou CPF já cadastrado.' });
        }

        let fotoBlob = null;
        if (foto && foto.startsWith('data:image')) {
            const base64Data = foto.replace(/^data:image\/\w+;base64,/, '');
            fotoBlob = Buffer.from(base64Data, 'base64');
        }

        let embeddingStr = null;
        if (face_embedding && typeof face_embedding === 'string') {
            try {
                const parsedEmbedding = JSON.parse(face_embedding);
                if (Array.isArray(parsedEmbedding)) {
                    embeddingStr = JSON.stringify(parsedEmbedding);
                }
            } catch (e) {
                return res.status(400).json({ message: 'O formato do embedding facial é inválido.' });
            }
        }

        if (id) {
            await pool.query(
                `UPDATE Funcionarios SET Nome = ?, Email = ?, CPF = ?, Cargo = ?, NivelAcesso = ?, 
                 Foto = IF(? IS NOT NULL, ?, Foto), 
                 Face_Embedding = IF(? IS NOT NULL, ?, Face_Embedding) 
                 WHERE IDFuncionario = ?`,
                [nome, email, unmaskedCpf, cargo, nivelAcesso, fotoBlob, fotoBlob, embeddingStr, embeddingStr, id]
            );
            res.json({ success: true, message: 'Funcionário atualizado com sucesso!' });
        } else {
            const senhaPadrao = 'senha_padrao';
            await pool.query(
                `INSERT INTO Funcionarios (Nome, Email, CPF, Cargo, NivelAcesso, Foto, Face_Embedding, Senha) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [nome, email, unmaskedCpf, cargo, nivelAcesso, fotoBlob, embeddingStr, senhaPadrao]
            );
            res.status(201).json({ success: true, message: 'Funcionário adicionado com sucesso!' });
        }
    } catch (error) {
        console.error('Erro ao salvar funcionário:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    }
});

// Deletar funcionário
app.delete('/api/admin/employees/:id', requireLogin, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM Funcionarios WHERE IDFuncionario = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado.' });
        }
        res.json({ message: 'Funcionário deletado com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar funcionário:', error);
        res.status(500).json({ message: 'Erro interno ao deletar.' });
    }
});

// --- MÁQUINAS ---
app.get('/api/admin/machines', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT Identificacao, Modelo FROM Maquinas');
        res.json({ machines: rows });
    } catch (error) {
        console.error('Erro ao listar máquinas:', error);
        res.status(500).json({ message: 'Erro ao carregar máquinas.' });
    }
});

app.get('/api/admin/machines/:id', requireLogin, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT Identificacao, Modelo FROM Maquinas WHERE Identificacao = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Máquina não encontrada.' });
        res.json({ machine: rows[0] });
    } catch (error) {
        console.error('Erro ao buscar máquina:', error);
        res.status(500).json({ message: 'Erro ao carregar máquina.' });
    }
});

app.post('/api/admin/machines', requireLogin, requireAdmin, async (req, res) => {
    const { modelo } = req.body;
    try {
        if (!modelo) return res.status(400).json({ message: 'Modelo obrigatório.' });
        await pool.query('INSERT INTO Maquinas (Modelo) VALUES (?)', [modelo]);
        res.json({ message: 'Máquina adicionada com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar máquina:', error);
        res.status(500).json({ message: 'Erro interno ao salvar.' });
    }
});

app.put('/api/admin/machines/:id', requireLogin, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { modelo } = req.body;
    try {
        await pool.query(
            'UPDATE Maquinas SET Modelo = ? WHERE Identificacao = ?',
            [modelo, id]
        );
        res.json({ message: 'Máquina atualizada com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar máquina:', error);
        res.status(500).json({ message: 'Erro interno ao atualizar.' });
    }
});

app.delete('/api/admin/machines/:id', requireLogin, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM Maquinas WHERE Identificacao = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Máquina não encontrada.' });
        res.json({ message: 'Máquina deletada com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar máquina:', error);
        res.status(500).json({ message: 'Erro interno ao deletar.' });
    }
});

// --- MATERIAIS (Tipos_MP) ---
app.get('/api/admin/materials', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT TipoMP AS ID, TipoMP FROM Tipos_MP WHERE TipoMP != 'Aguardando Identificação'");
        res.json({ materials: rows });
    } catch (error) {
        console.error('Erro ao listar materiais:', error);
        res.status(500).json({ message: 'Erro ao carregar materiais.' });
    }
});

app.get('/api/admin/materials/:id', requireLogin, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT TipoMP AS ID, TipoMP FROM Tipos_MP WHERE TipoMP = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Material não encontrado.' });
        res.json({ material: rows[0] });
    } catch (error) {
        console.error('Erro ao buscar material:', error);
        res.status(500).json({ message: 'Erro ao carregar material.' });
    }
});

app.post('/api/admin/materials', requireLogin, requireAdmin, async (req, res) => {
    const { tipoMP } = req.body;
    try {
        if (!tipoMP) return res.status(400).json({ message: 'Tipo de material obrigatório.' });
        await pool.query('INSERT INTO Tipos_MP (TipoMP) VALUES (?)', [tipoMP]);
        res.json({ message: 'Material adicionado com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar material:', error);
        res.status(500).json({ message: 'Erro interno ao salvar.' });
    }
});

app.put('/api/admin/materials/:id', requireLogin, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { tipoMP } = req.body;
    try {
        await pool.query('UPDATE Tipos_MP SET TipoMP = ? WHERE TipoMP = ?', [tipoMP, id]);
        res.json({ message: 'Material atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar material:', error);
        res.status(500).json({ message: 'Erro interno ao atualizar.' });
    }
});

app.delete('/api/admin/materials/:id', requireLogin, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM Tipos_MP WHERE TipoMP = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Material não encontrado.' });
        res.json({ message: 'Material deletado com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar material:', error);
        res.status(500).json({ message: 'Erro interno ao deletar.' });
    }
});

// --- COMPATIBILIDADES (Compativel) ---
app.get('/api/admin/compatibilities', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, tm.TipoMP, m.Modelo 
            FROM Compativel c 
            JOIN Tipos_MP tm ON c.fk_Tipos_MP_TipoMP = tm.TipoMP 
            JOIN Maquinas m ON c.fk_Maquina_Identificacao = m.Identificacao
        `);
        res.json({ compatibilities: rows });
    } catch (error) {
        console.error('Erro ao listar compatibilidades:', error);
        res.status(500).json({ message: 'Erro ao carregar compatibilidades.' });
    }
});

app.post('/api/admin/compatibilities', requireLogin, requireAdmin, async (req, res) => {
    const { tipoMP, identificacao } = req.body;
    try {
        if (!tipoMP || !identificacao) return res.status(400).json({ message: 'Tipo MP e máquina obrigatórios.' });
        await pool.query(
            'INSERT INTO Compativel (fk_Tipos_MP_TipoMP, fk_Maquina_Identificacao) VALUES (?, ?)',
            [tipoMP, identificacao]
        );
        res.json({ message: 'Compatibilidade adicionada com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Esta compatibilidade já existe.' });
        }
        console.error('Erro ao adicionar compatibilidade:', error);
        res.status(500).json({ message: 'Erro interno ao salvar.' });
    }
});

app.delete('/api/admin/compatibilities', requireLogin, requireAdmin, async (req, res) => {
    const { tipoMP, identificacao } = req.query;
    try {
        if (!tipoMP || !identificacao) return res.status(400).json({ message: 'Parâmetros inválidos.' });
        await pool.query('DELETE FROM Compativel WHERE fk_Tipos_MP_TipoMP = ? AND fk_Maquina_Identificacao = ?', [tipoMP, identificacao]);
        res.json({ message: 'Compatibilidade deletada com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar compatibilidade:', error);
        res.status(500).json({ message: 'Erro interno ao deletar.' });
    }
});

// API para gerar o próximo código de lote sequencial anual
app.get('/api/lote/proximo-codigo', requireLogin, async (req, res) => {
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
        let kpiStock, kpiMovimentos, kpiFuncionarios, stockByType, consumptionByMachine, recentEntries, recentMovements;
        try {
            [kpiStock] = await pool.query("SELECT COUNT(*) as totalStock, SUM(CASE WHEN fk_Tipos_MP_TipoMP = 'Aguardando Identificação' THEN 1 ELSE 0 END) as awaitingId FROM Estoque_MP");
        } catch (err) {
            console.error('Erro na query kpiStock:', err);
            throw new Error('Erro na query kpiStock: ' + err.message);
        }
        try {
            [kpiMovimentos] = await pool.query("SELECT COUNT(*) as movementsToday, SUM(QuantidadeMovida) as unitsMovedToday FROM Registro_Movimentacao WHERE DATE(DataHoraMovimento) = CURDATE()");
        } catch (err) {
            console.error('Erro na query kpiMovimentos:', err);
            throw new Error('Erro na query kpiMovimentos: ' + err.message);
        }
        try {
            [kpiFuncionarios] = await pool.query("SELECT COUNT(*) as totalEmployees FROM Funcionarios");
        } catch (err) {
            console.error('Erro na query kpiFuncionarios:', err);
            throw new Error('Erro na query kpiFuncionarios: ' + err.message);
        }
        try {
            [stockByType] = await pool.query(`
                SELECT 
                    fk_Tipos_MP_TipoMP as tipo, 
                    COUNT(*) as lotes,
                    SUM(Quantidade) as totalQuantidade
                FROM Estoque_MP 
                GROUP BY fk_Tipos_MP_TipoMP 
                ORDER BY lotes DESC
            `);
        } catch (err) {
            console.error('Erro na query stockByType:', err);
            throw new Error('Erro na query stockByType: ' + err.message);
        }
        try {
            [consumptionByMachine] = await pool.query(`
                SELECT m.Modelo, SUM(rm.QuantidadeMovida) as totalMovido
                FROM Registro_Movimentacao rm
                JOIN Maquinas m ON rm.fk_Maquina_Identificacao = m.Identificacao
                GROUP BY m.Modelo
                ORDER BY totalMovido DESC
            `);
        } catch (err) {
            console.error('Erro na query consumptionByMachine:', err);
            throw new Error('Erro na query consumptionByMachine: ' + err.message);
        }
        try {
            [recentMovements] = await pool.query(`
                SELECT 
                    rm.DataHoraMovimento, 
                    rm.fk_Estoque_MP_BarCode as BarCode, 
                    rm.QuantidadeMovida AS quantidadeMovida,
                    f.Nome as funcionarioNome,  -- <-- ADICIONADO
                    m.Modelo as maquinaNome
                FROM Registro_Movimentacao rm
                JOIN Funcionarios f ON rm.fk_Funcionarios_IDFuncionario = f.IDFuncionario -- <-- ADICIONADO
                JOIN Maquinas m ON rm.fk_Maquina_Identificacao = m.Identificacao
                ORDER BY rm.DataHoraMovimento DESC LIMIT 5
            `);
        } catch (err) {
            console.error('Erro na query recentEntries:', err);
            throw new Error('Erro na query recentEntries: ' + err.message);
        }
        try {
            [recentMovements] = await pool.query(`
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
        } catch (err) {
            console.error('Erro na query recentMovements:', err);
            throw new Error('Erro na query recentMovements: ' + err.message);
        }

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
        console.error("Erro ao buscar dados do dashboard (detalhado):", error);
        res.status(500).json({ message: "Erro ao carregar dados do dashboard.", error: error.message });
    }
});

// API para popular o DASHBOARD DO FUNCIONÁRIO
app.get('/api/dashboard/funcionario/:id', requireLogin, async (req, res) => {
    if (req.session.NivelAcesso !== 'Total' && req.session.NivelAcesso !== 'Gestor') {
        return res.status(403).json({ message: 'Acesso negado.' });
    }

    try {
        const { id } = req.params;
        const [employeeRows] = await pool.query('SELECT Cargo FROM Funcionarios WHERE IDFuncionario = ?', [id]);
        if (employeeRows.length === 0) {
            return res.status(404).json({ message: 'Funcionário não encontrado.' });
        }
        const { Cargo } = employeeRows[0];

        let responseData = { cargo: Cargo, registros: {}, stats: null };

        // --- LÓGICA ESPECIAL PARA ADMINISTRADOR ---
        if (Cargo === 'Administrador') {
            // Busca registros de todas as atividades
            const [recebimentos] = await pool.query(
                `SELECT DataHoraRegistro, fk_Estoque_MP_BarCode FROM Registro_Entrada_MP WHERE fk_Funcionarios_IDFuncionario = ? ORDER BY DataHoraRegistro DESC`, [id]
            );
            const [identificacoes] = await pool.query(
                `SELECT DataHoraIdentificacao, fk_Estoque_MP_BarCode, fk_Tipos_MP_TipoMP FROM Registro_Identificacao_MP WHERE fk_Funcionarios_IDFuncionario = ? ORDER BY DataHoraIdentificacao DESC`, [id]
            );
            const [movimentacoes] = await pool.query(
                `SELECT DataHoraMovimento, fk_Estoque_MP_BarCode, QuantidadeMovida, OperacaoValida, TipoErro FROM Registro_Movimentacao WHERE fk_Funcionarios_IDFuncionario = ? ORDER BY DataHoraMovimento DESC`, [id]
            );

            responseData.registros = {
                recebimentos,
                identificacoes,
                movimentacoes
            };

            // SÓ CALCULA AS ESTATÍSTICAS SE HOUVER MOVIMENTAÇÕES
            if (movimentacoes.length > 0) {
                const [statsRows] = await pool.query(
                    `SELECT OperacaoValida, TipoErro, COUNT(*) as count FROM Registro_Movimentacao WHERE fk_Funcionarios_IDFuncionario = ? GROUP BY OperacaoValida, TipoErro`, [id]
                );

                const totalOperacoes = statsRows.reduce((sum, row) => sum + row.count, 0);
                const acertos = statsRows.find(r => r.OperacaoValida === 1)?.count || 0;
                const erros = totalOperacoes - acertos;
                const taxaAcerto = totalOperacoes > 0 ? (acertos / totalOperacoes) * 100 : 0;
                const errosPorTipo = statsRows.filter(r => r.OperacaoValida === 0).reduce((acc, row) => { acc[row.TipoErro] = row.count; return acc; }, {});

                responseData.stats = { totalOperacoes, acertos, erros, taxaAcerto: taxaAcerto.toFixed(1), errosPorTipo };
            }
        } else if (Cargo === 'Inspetor de Qualidade') {
            const [registros] = await pool.query(
                `SELECT r.DataHoraIdentificacao, r.fk_Estoque_MP_BarCode, r.fk_Tipos_MP_TipoMP 
         FROM Registro_Identificacao_MP r 
         WHERE r.fk_Funcionarios_IDFuncionario = ? ORDER BY r.DataHoraIdentificacao DESC`, [id]
            );
            // Padroniza a resposta
            responseData.registros = { identificacoes: registros };

        } else if (Cargo === 'Conferente') {
            const [registros] = await pool.query(
                `SELECT r.DataHoraRegistro, r.fk_Estoque_MP_BarCode, e.fk_Berco_ID, e.Prateleira_Ocupada
         FROM Registro_Entrada_MP r
         JOIN Estoque_MP e ON r.fk_Estoque_MP_BarCode = e.BarCode
         WHERE r.fk_Funcionarios_IDFuncionario = ? ORDER BY r.DataHoraRegistro DESC`, [id]
            );
            // Padroniza a resposta
            responseData.registros = { recebimentos: registros };

        } else if (Cargo === 'Alimentador de Linha') {
            const [registros] = await pool.query(
                `SELECT DataHoraMovimento, fk_Estoque_MP_BarCode, QuantidadeMovida, OperacaoValida, TipoErro 
         FROM Registro_Movimentacao 
         WHERE fk_Funcionarios_IDFuncionario = ? ORDER BY DataHoraMovimento DESC`, [id]
            );
            // Padroniza a resposta
            responseData.registros = { movimentacoes: registros };

            // Calcula as estatísticas (só faz sentido se houver registros)
            if (registros.length > 0) {
                const [statsRows] = await pool.query(
                    `SELECT OperacaoValida, TipoErro, COUNT(*) as count 
             FROM Registro_Movimentacao 
             WHERE fk_Funcionarios_IDFuncionario = ? GROUP BY OperacaoValida, TipoErro`, [id]
                );

                const totalOperacoes = statsRows.reduce((sum, row) => sum + row.count, 0);
                const acertos = statsRows.find(r => r.OperacaoValida === 1)?.count || 0;
                const erros = totalOperacoes - acertos;
                const taxaAcerto = totalOperacoes > 0 ? (acertos / totalOperacoes) * 100 : 0;
                const errosPorTipo = statsRows.filter(r => r.OperacaoValida === 0).reduce((acc, row) => { acc[row.TipoErro] = row.count; return acc; }, {});

                responseData.stats = { totalOperacoes, acertos, erros, taxaAcerto: taxaAcerto.toFixed(1), errosPorTipo };
            }
        }

        res.json(responseData);

    } catch (error) {
        console.error("Erro no dashboard de funcionário:", error);
        res.status(500).json({ message: 'Erro interno.' });
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

// API para listar todos os fornecedores
app.get('/api/fornecedores', requireLogin, async (req, res) => {
    try {
        // Busca todos os fornecedores do banco de dados, ordenados por nome
        const [fornecedores] = await pool.query('SELECT CNPJ, Nome FROM Fornecedores ORDER BY Nome');
        res.json({ success: true, fornecedores });
    } catch (error) {
        console.error("Erro ao buscar fornecedores:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao carregar fornecedores.' });
    }
});


// ROTA PARA A QUALIDADE: Buscar dados de um lote para finalizar
app.get('/api/lote/para-identificar/:barcode', requireLogin, async (req, res) => {
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
        if (lotes.length === 0) {
            return res.status(404).json({ message: 'Lote não encontrado ou já identificado.' });
        }
        res.json({ success: true, lote: lotes[0] });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar lote.' });
    }
});


// ROTA PARA A QUALIDADE: Finalizar registro e gerar a etiqueta PDF
app.post('/api/qualidade/finalizar', requireLogin, async (req, res) => {
    const {
        barcode, denominacaoMaterial, codPeca, item,
        quantidade, corrida, observacao
    } = req.body;
    const funcionarioId = req.session.userId;
    const nomeOperador = req.session.nome;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Atualiza o lote no estoque com os dados da qualidade
        await connection.query(
            `UPDATE Estoque_MP SET 
                fk_Tipos_MP_TipoMP = ?, 
                Quantidade = ?
             WHERE BarCode = ?`,
            [denominacaoMaterial, quantidade, barcode]
        );
        // Cria o registro de identificação para auditoria
        await connection.query(
            `INSERT INTO Registro_Identificacao_MP (DataHoraIdentificacao, fk_Funcionarios_IDFuncionario, fk_Tipos_MP_TipoMP, fk_Estoque_MP_BarCode) VALUES (?, ?, ?, ?)`,
            [new Date(), funcionarioId, denominacaoMaterial, barcode]
        );

        await connection.commit();

        // Após salvar, busca todos os dados para a etiqueta
        const [dadosCompletos] = await pool.query(
            `SELECT f.Nome as NomeFornecedor FROM Estoque_MP e JOIN Fornecedores f ON e.fk_Fornecedores_CNPJ = f.CNPJ WHERE e.BarCode = ?`,
            [barcode]
        );

        // Prepara o JSON para a página de impressão
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



// ROTA 1: Busca os materiais compatíveis (sem alterações, mas incluída para contexto)
app.get('/api/maquina/:id/compatibilidades', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const [materiais] = await pool.query(
            `SELECT fk_Tipos_MP_TipoMP FROM Compativel WHERE fk_Maquina_Identificacao = ?`,
            [id]
        );
        res.json({ success: true, materiais: materiais.map(m => m.fk_Tipos_MP_TipoMP) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao buscar materiais compatíveis.' });
    }
});

// Busca a localização (Berço/Prateleira) do lote mais antigo de um tipo de material
app.get('/api/material/localizacao', requireLogin, async (req, res) => {
    // Pega o parâmetro da query string
    const { tipo } = req.query;

    if (!tipo) {
        return res.status(400).json({ success: false, message: 'O tipo de material é obrigatório.' });
    }

    try {
        const tipoDecodificado = decodeURIComponent(tipo);

        // Encontra o lote mais antigo (pelo código de barras) que corresponde ao tipo,
        // já passou pela qualidade (Quantidade IS NOT NULL) e tem estoque (> 0).
        const [lotes] = await pool.query(
            `SELECT e.BarCode, b.Nome as NomeBerco, e.Prateleira_Ocupada
             FROM Estoque_MP e
             JOIN Bercos b ON e.fk_Berco_ID = b.ID
             WHERE e.fk_Tipos_MP_TipoMP = ? AND e.Quantidade IS NOT NULL AND e.Quantidade > 0
             ORDER BY e.BarCode ASC 
             LIMIT 1`,
            [tipoDecodificado]
        );

        if (lotes.length === 0) {
            return res.status(404).json({ success: false, message: `Nenhum lote de '${tipoDecodificado}' disponível no estoque.` });
        }

        res.json({ success: true, localizacao: lotes[0] });

    } catch (error) {
        console.error("Erro ao buscar localização do material:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar localização do material.' });
    }
});


// --- LÓGICA DE MOVIMENTAÇÃO CORRIGIDA ---

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

// ROTA Valida o material escaneado contra o material esperado
app.post('/api/movimentacao/validar-material', requireLogin, async (req, res) => {
    const { maquinaId, materialEsperadoBarcode, materialLidoBarcode } = req.body;

    if (materialLidoBarcode === materialEsperadoBarcode) {
        return res.json({ success: true, message: 'Material correto.' });
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
        console.error("Erro ao registrar falha de material:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao registrar a falha.' });
    }
});

// ROTA Valida a máquina de confirmação e finaliza a movimentação
app.post('/api/movimentacao/finalizar', requireLogin, async (req, res) => {
    const { maquinaId, materialBarcode, maquinaConfirmacaoId, quantidadeMovida } = req.body;
    const funcionarioId = req.session.userId;

    if (maquinaId !== maquinaConfirmacaoId) {
        try {
            await logarMovimentacaoInvalida({
                tipoErro: 'maquina_confirmacao',
                maquinaId: maquinaId,
                funcionarioId: funcionarioId,
                barcodeEsperado: materialBarcode, // O material correto já foi validado
                barcodeLido: `MAQUINA:${maquinaConfirmacaoId}` // Armazenamos o ID da máquina errada aqui
            });
            return res.status(400).json({ success: false, message: 'Erro: Máquina de confirmação incorreta. Tente novamente.' });
        } catch (error) {
            console.error("Erro ao registrar falha de máquina:", error);
            return res.status(500).json({ success: false, message: 'Erro interno ao registrar a falha.' });
        }
    }

    // TUDO CORRETO, registra a movimentação VÁLIDA
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

        await connection.query(
            `INSERT INTO Registro_Movimentacao 
             (DataHoraMovimento, QuantidadeMovida, fk_Estoque_MP_BarCode, BarcodeLido, fk_Maquina_Identificacao, fk_Funcionarios_IDFuncionario, OperacaoValida, TipoErro) 
             VALUES (?, ?, ?, ?, ?, ?, 1, '----')`,
            [new Date(), quantidadeMovida, materialBarcode, materialBarcode, maquinaId, funcionarioId]
        );

        await connection.commit();
        res.status(201).json({ success: true, message: 'Movimentação registrada com sucesso!' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao registrar movimentação válida:", error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- SERVIDORES DE ARQUIVOS ESTÁTICOS (DEFINIDOS POR ÚLTIMO) ---

// Servir a pasta de impressão
app.use('/print', express.static(path.join(projectRoot, 'print')));
// Servir assets específicos das views (como recebimento.js)
app.use(express.static(path.join(projectRoot, 'public')));
// Servir assets da página principal (como index.html, login.js, style.css)
app.use(express.static(projectRoot));

// Servir os modelos de IA da pasta /models
app.use('/models', express.static(path.join(projectRoot, 'models'))); // <-- ADICIONE ESTA LINHA


app.post('/api/contact', async (req, res) => {
    const { nome, email, assunto, mensagem, data_envio, projeto } = req.body;
    if (!nome || !email || !assunto || !mensagem) {
        return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando.' });
    }
    try {
        await pool.query(
            'INSERT INTO contatos (nome, email, assunto, mensagem, data_envio, projeto) VALUES (?, ?, ?, ?, ?, ?)',
            [nome, email, assunto, mensagem, data_envio, projeto]
        );
        res.status(201).json({ success: true, message: 'Mensagem enviada com sucesso!' });
    } catch (error) {
        console.error("Erro ao enviar mensagem de contato:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao enviar mensagem.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
