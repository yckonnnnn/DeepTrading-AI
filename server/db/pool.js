import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { toPostgres } from './transpile.mjs';
import { SCHEMA_STATEMENTS } from './schema.js';

if (!process.env.VERCEL) {
  dotenv.config({ path: '.env.local' });
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  '';

if (!connectionString) {
  throw new Error(
    'Database connection string is missing. Set DATABASE_URL (see .env.example).'
  );
}

const neonPool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 10000
});

neonPool.on('error', (error) => {
  console.error('[db] idle client error:', error.message);
});

let schemaReady = null;
const ensureSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await neonPool.query(statement);
      }
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
};

const writeResult = (result) => ({
  insertId: Number(result.rows?.[0]?.id ?? 0),
  affectedRows: result.rowCount ?? 0
});

const run = async (runner, sql, params = []) => {
  await ensureSchema();
  const statement = toPostgres(sql, {
    returning: /^\s*INSERT\s+INTO\b/i.test(String(sql))
  });
  const result = await runner.query(statement, params);
  const isWrite = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(statement);
  if (isWrite) {
    const header = writeResult(result);
    return [header, []];
  }
  return [result.rows ?? [], []];
};

const pool = {
  execute: (sql, params) => run(neonPool, sql, params),
  query: (sql, params) => run(neonPool, sql, params),
  getConnection: async () => {
    await ensureSchema();
    const client = await neonPool.connect();
    let inTransaction = false;
    return {
      execute: (sql, params) => run(client, sql, params),
      query: (sql, params) => run(client, sql, params),
      beginTransaction: async () => {
        await client.query('BEGIN');
        inTransaction = true;
      },
      commit: async () => {
        await client.query('COMMIT');
        inTransaction = false;
      },
      rollback: async () => {
        if (!inTransaction) return;
        await client.query('ROLLBACK');
        inTransaction = false;
      },
      release: () => {
        client.release();
      }
    };
  }
};

export const ensureDatabaseReady = ensureSchema;

export default pool;
