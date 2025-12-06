import express from 'express';
import pool from '../db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireLogin, requireAdmin } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

const router = express.Router();

// Inicial
router.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'index.html'));
});

// Cadastro Face HTML
router.get('/cadastro-face.html', (req, res) => {
    res.sendFile(path.join(projectRoot, 'cadastro-face.html'));
});

// Lobby
router.get('/lobby', requireLogin, (req, res) => {
    const { NivelAcesso, cargo, nome } = req.session;
    let linksPermitidos = [];

    if (NivelAcesso === 'Total') {
        linksPermitidos.push({ nome: 'Painel do Administrador', url: '/admin' });
        linksPermitidos.push({ nome: 'Dashboard de Gestão', url: '/gestao' });
        linksPermitidos.push({ nome: 'Controle de Recebimento', url: '/recebimento' });
        linksPermitidos.push({ nome: 'Identificação de Material', url: '/qualidade' });
        linksPermitidos.push({ nome: 'Movimentação de Material', url: '/movimentacao' });
        linksPermitidos.push({ nome: 'Dashboard de Funcionários', url: '/dashboard-funcionario' });
    } else if (NivelAcesso === 'Gestor') {
        if (cargo === 'Gerente de Produção') {
            linksPermitidos.push({ nome: 'Dashboard de Gestão', url: '/gestao' });
            linksPermitidos.push({ nome: 'Dashboard de Funcionários', url: '/dashboard-funcionario' });
        }
    } else if (NivelAcesso === 'Usuario') {
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

// Recebimento
router.get('/recebimento', requireLogin, async (req, res) => {
    try {
        const [fornecedores] = await pool.query('SELECT CNPJ, Nome FROM Fornecedores');
        const [tiposMP] = await pool.query('SELECT TipoMP FROM Tipos_MP');
        res.render('recebimento', { fornecedores, tiposMP });
    } catch (error) {
        console.error("Erro ao buscar dados para a página de recebimento:", error);
        res.render('recebimento', { fornecedores: [], tiposMP: [] });
    }
});

// Qualidade
router.get('/qualidade', requireLogin, async (req, res) => {
    try {
        const [tiposMP] = await pool.query(
            "SELECT TipoMP FROM Tipos_MP WHERE TipoMP != 'Aguardando Identificação' ORDER BY TipoMP"
        );
        res.render('qualidade', { tiposMP });
    } catch (error) {
        console.error("Erro ao buscar tipos de matéria-prima:", error);
        res.render('qualidade', { tiposMP: [] });
    }
});

// Movimentação
router.get('/movimentacao', requireLogin, async (req, res) => {
    try {
        const [maquinas] = await pool.query('SELECT Identificacao, Modelo FROM Maquinas ORDER BY Modelo');
        res.render('movimentacao', { maquinas });
    } catch (error) {
        console.error("Erro ao buscar máquinas:", error);
        res.render('movimentacao', { maquinas: [] });
    }
});

// Gestão
router.get('/gestao', requireLogin, (req, res) => {
    res.render('gestao');
});

// Dashboard Funcionário
router.get('/dashboard-funcionario', requireLogin, async (req, res) => {
    if (req.session.NivelAcesso !== 'Total' && req.session.NivelAcesso !== 'Gestor') {
        return res.status(403).redirect('/lobby');
    }
    try {
        const [employees] = await pool.query('SELECT IDFuncionario, Nome, Cargo FROM Funcionarios ORDER BY Nome');
        res.render('dashboard-funcionario', { employees });
    } catch (error) {
        res.status(500).render('dashboard-funcionario', { employees: [] });
    }
});

// Painel Admin
router.get('/admin', requireLogin, requireAdmin, (req, res) => {
    res.render('admin');
});

// API de Contato (Pública)
router.post('/api/contact', async (req, res) => {
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

export default router;
