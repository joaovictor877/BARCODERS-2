import mysql from 'mysql2/promise';

// Cria um pool de conexões com o banco de dados
const pool = mysql.createPool({
  host: 'yamabiko.proxy.rlwy.net',
  user: 'root',
  password: 'QojBQnVzgDsClaQEbloVVSWpfvzQxaYY',
  database: 'estoque',
  port: 30801,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Exporta o pool para ser usado em outros arquivos
export default pool;