import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 防止连接超时
  connectTimeout: 60000,
  // 空闲连接超时（毫秒）
  idleTimeout: 60000,
  // 启用连接保活
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// 测试数据库连接
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL 数据库连接成功');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL 数据库连接失败:', err.message);
  });

export default pool;
