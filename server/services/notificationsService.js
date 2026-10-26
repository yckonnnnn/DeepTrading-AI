import pool from '../db/pool.js';

let notificationsTableEnsured = false;
const ensureNotificationsTable = async () => {
  if (notificationsTableEnsured) return;
  // 表结构由 server/db/schema.js 统一创建，这里不再重复建表。
  notificationsTableEnsured = true;
};

export { ensureNotificationsTable };
