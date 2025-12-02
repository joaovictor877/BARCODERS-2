import mysql from 'mysql2/promise';

// Cria um pool de conexões com o banco de dados
const pool = mysql.createPool({
  host: 'shortline.proxy.rlwy.net',
  user: 'root',
  password: 'uMnCTGymhFgyqRCnZWoHIjYfDTWOKLnR',
  database: 'estoque',
  port: 51931,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Exporta o pool para ser usado em outros arquivos
export default pool;