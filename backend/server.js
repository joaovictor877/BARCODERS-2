import express from 'express';
import cors from 'cors'; // Mantendo, embora redundante com mw
import multer from 'multer'; // Mantendo se for usado implicitamente ou futuro
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import operationalRoutes from './routes/operationalRoutes.js';
import pageRoutes from './routes/pageRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const app = express();
const port = process.env.PORT || 8080;

// --- CONFIGURAÇÃO E MIDDLEWARES PRINCIPAIS ---

// Configuração do View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(projectRoot, 'views'));

// Middlewares essenciais
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

// --- ROTAS DA APLICAÇÃO ---

// Auth Routes (Login, Logout, Facial)
app.use('/', authRoutes);

// Page Routes (Lobby, HTMLs, Views)
app.use('/', pageRoutes);

// Admin Routes (Prefixed with /api/admin)
app.use('/api/admin', adminRoutes);

// Operational Routes (Prefixed with /api)
app.use('/api', operationalRoutes);


// --- SERVIDORES DE ARQUIVOS ESTÁTICOS (DEFINIDOS POR ÚLTIMO) ---

// Servir a pasta de impressão
app.use('/print', express.static(path.join(projectRoot, 'print')));
// Servir assets específicos das views (como recebimento.js)
app.use(express.static(path.join(projectRoot, 'public')));
// Servir assets da página principal (como index.html, login.js, style.css)
app.use(express.static(projectRoot));

// Servir os modelos de IA da pasta /models
app.use('/models', express.static(path.join(projectRoot, 'models')));


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
