/**
 * Loads reference data (A-share symbol list, announcements) into the database.
 *
 * Usage: node server/db/seed.mjs
 * Requires DATABASE_URL in .env.local.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { SCHEMA_STATEMENTS } from './schema.js';

dotenv.config({ path: '.env.local' });

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error('DATABASE_URL is missing (add it to .env.local).');
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 2 });
const BATCH_SIZE = 500;

const ensureSchema = async () => {
  for (const statement of SCHEMA_STATEMENTS) {
    await pool.query(statement);
  }
};

const seedStockList = async () => {
  const listFile = path.resolve('stock_list.md');
  if (!fs.existsSync(listFile)) {
    console.log('stock_list.md not found, skipped');
    return;
  }
  const entries = Object.entries(JSON.parse(fs.readFileSync(listFile, 'utf8')));
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    batch.forEach(([symbol, name], index) => {
      values.push(`($${index * 2 + 1}, $${index * 2 + 2})`);
      params.push(symbol, name);
    });
    await pool.query(
      `INSERT INTO tushare_stock_list (symbol, name) VALUES ${values.join(', ')}
       ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name`,
      params
    );
  }
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM tushare_stock_list');
  console.log(`tushare_stock_list rows: ${rows[0].n}`);
};

const seedAnnouncements = async () => {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM announcements');
  if (rows[0].n > 0) {
    console.log('announcements already present, skipped');
    return;
  }
  const seed = [
    ['新模型上线: DeepTrading AI 2.5 Pro', 'new', '我们很高兴地宣布，分析引擎已全面升级至 DeepTrading AI 2.5 Pro。新模型在处理复杂金融逻辑时，响应速度提升了 30%，准确率提升了 15%。现在您可以尝试上传更复杂的 K 线图进行测试。'],
    ['美股实时数据源维护通知', 'maintenance', '为了提供更稳定的服务，我们将于今晚 02:00 - 04:00 对美股数据源进行例行维护。维护期间，实时行情可能会有短暂延迟，历史分析功能不受影响。'],
    ['趋势跟踪策略算法优化完成', 'update', '针对近期震荡市行情，我们优化了「趋势跟踪策略」的入场判定逻辑，减少了假突破信号的干扰。建议您重新运行之前的分析以获取最新建议。'],
    ['用户中心界面升级', 'new', '用户中心全面改版，新的界面更清晰，配额使用情况一目了然。设置页新增了邮箱与密码管理入口。']
  ];
  for (const [title, category, content] of seed) {
    await pool.query(
      'INSERT INTO announcements (title, category, content, created_by) VALUES ($1, $2, $3, $4)',
      [title, category, content, 'system']
    );
  }
  console.log(`announcements seeded: ${seed.length}`);
};

const main = async () => {
  await ensureSchema();
  await seedStockList();
  await seedAnnouncements();
  await pool.end();
  console.log('seed done');
};

main().catch(async (error) => {
  console.error('seed failed:', error.message);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
