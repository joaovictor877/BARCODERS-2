// Este arquivo é responsável por configurar o servidor Express, rotas, CORS e usar a conexão do db.js.

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const connection = require('./db'); // Importa conexão centralizada
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer();

// Libera CORS apenas para seu domínio
app.use(cors({ origin: 'https://barcoders.azurewebsites.net' }));
app.use(express.json());

// Servir arquivos estáticos do frontend (ajuste o caminho se necessário)
// Se o index.html está na raiz do projeto, use '..'.
// Se o build do frontend está em 'dist', use '../dist'.
app.use(express.static(path.join(__dirname, '..')));

// ...rotas removidas...
// Endpoint de contato: salva mensagem no banco
app.post('/api/contact', upload.none(), (req, res) => {
  const { nome, email, assunto, mensagem, projeto } = req.body;
  const data_envio = new Date();

  const sql = 'INSERT INTO contato (nome, email, assunto, mensagem, data_envio, projeto) VALUES (?, ?, ?, ?, ?, ?)';
  connection.query(sql, [nome, email, assunto, mensagem, data_envio, projeto], (err, result) => {
    if (err) {
      console.error('Erro ao inserir mensagem:', err);
      return res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
    res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
  });
});

app.listen(port, () => {
console.log(`Servidor rodando na porta ${port}`);
  console.log(`Servidor rodando na porta ${port}`);
});
