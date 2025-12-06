import express from 'express';
import pool from '../db.js';
import { compareFaceDescriptors } from '../faceRecognition.js';

const router = express.Router();

// Login facial
router.post('/api/login-facial', async (req, res) => {
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

// Cadastrar biometria facial
router.post('/api/cadastrar-face', async (req, res) => {
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

// Endpoint de login padrão
router.post('/api/login', async (req, res) => {
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

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/lobby');
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

export default router;
