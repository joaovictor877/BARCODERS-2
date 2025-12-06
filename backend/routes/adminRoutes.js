import express from 'express';
import pool from '../db.js';
import { requireLogin, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();
const idRegex = /^\d+$/; // Regex para validar ID numérico

// Middleware para validar ID
const validateId = (req, res, next) => {
    if (!idRegex.test(req.params.id)) {
        // Se não for um ID numérico, passa para a próxima rota (evita conflito com strings)
        return next('route');
    }
    next();
}


// --- FUNCIONÁRIOS ---

// Listar todos os funcionários
router.get('/employees', requireLogin, requireAdmin, async (req, res) => {
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

// Buscar funcionário por ID
router.get('/employees/:id', requireLogin, requireAdmin, async (req, res) => {
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

// Adicionar ou editar funcionário
router.post('/employees', requireLogin, requireAdmin, async (req, res) => {
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
router.delete('/employees/:id', requireLogin, requireAdmin, async (req, res) => {
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

router.get('/machines', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT Identificacao, Modelo FROM Maquinas');
        res.json({ machines: rows });
    } catch (error) {
        console.error('Erro ao listar máquinas:', error);
        res.status(500).json({ message: 'Erro ao carregar máquinas.' });
    }
});

router.get('/machines/:id', requireLogin, requireAdmin, async (req, res) => {
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

router.post('/machines', requireLogin, requireAdmin, async (req, res) => {
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

router.put('/machines/:id', requireLogin, requireAdmin, async (req, res) => {
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

router.delete('/machines/:id', requireLogin, requireAdmin, async (req, res) => {
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

router.get('/materials', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT TipoMP AS ID, TipoMP FROM Tipos_MP WHERE TipoMP != 'Aguardando Identificação'");
        res.json({ materials: rows });
    } catch (error) {
        console.error('Erro ao listar materiais:', error);
        res.status(500).json({ message: 'Erro ao carregar materiais.' });
    }
});

router.get('/materials/:id', requireLogin, requireAdmin, async (req, res) => {
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

router.post('/materials', requireLogin, requireAdmin, async (req, res) => {
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

router.put('/materials/:id', requireLogin, requireAdmin, async (req, res) => {
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

router.delete('/materials/:id', requireLogin, requireAdmin, async (req, res) => {
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


// --- COMPATIBILIDADES ---

router.get('/compatibilities', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.fk_Maquina_Identificacao, c.fk_Tipos_MP_TipoMP, m.Modelo, t.TipoMP 
            FROM Compativel c
            JOIN Maquinas m ON c.fk_Maquina_Identificacao = m.Identificacao
            JOIN Tipos_MP t ON c.fk_Tipos_MP_TipoMP = t.TipoMP
        `);
        res.json({ compatibilities: rows });
    } catch (error) {
        console.error('Erro ao listar compatibilidades:', error);
        res.status(500).json({ message: 'Erro ao carregar compatibilidades.' });
    }
});

router.post('/compatibilities', requireLogin, requireAdmin, async (req, res) => {
    const { identificacao, tipoMP } = req.body;
    try {
        if (!identificacao || !tipoMP) return res.status(400).json({ message: 'Máquina e Material obrigatórios.' });

        // Verifica duplicidade
        const [exists] = await pool.query(
            'SELECT * FROM Compativel WHERE fk_Maquina_Identificacao = ? AND fk_Tipos_MP_TipoMP = ?',
            [identificacao, tipoMP]
        );
        if (exists.length > 0) return res.status(409).json({ message: 'Compatibilidade já existe.' });

        await pool.query(
            'INSERT INTO Compativel (fk_Maquina_Identificacao, fk_Tipos_MP_TipoMP) VALUES (?, ?)',
            [identificacao, tipoMP]
        );
        res.json({ message: 'Compatibilidade adicionada!' });
    } catch (error) {
        console.error('Erro ao salvar compatibilidade:', error);
        res.status(500).json({ message: 'Erro interno ao salvar.' });
    }
});

router.delete('/compatibilities', requireLogin, requireAdmin, async (req, res) => {
    const { identificacao, tipoMP } = req.query;
    try {
        if (!identificacao || !tipoMP) {
            return res.status(400).json({ message: 'Parâmetros inválidos para deleção.' });
        }
        await pool.query('DELETE FROM Compativel WHERE fk_Maquina_Identificacao = ? AND fk_Tipos_MP_TipoMP = ?', [identificacao, tipoMP]);
        res.json({ message: 'Compatibilidade removida!' });
    } catch (error) {
        console.error('Erro ao deletar compatibilidade:', error);
        res.status(500).json({ message: 'Erro interno ao deletar.' });
    }
});

// API para VERIFICAR existência de Email ou CPF
router.post('/employees/check', requireLogin, requireAdmin, async (req, res) => {
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

export default router;
