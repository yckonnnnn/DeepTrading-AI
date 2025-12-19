import pool from '../db/pool.js';

let notificationsTableEnsured = false;
const ensureNotificationsTable = async () => {
  if (notificationsTableEnsured) return;
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS user_notifications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id VARCHAR(64) NOT NULL,
      type VARCHAR(32) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NULL,
      data_json TEXT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_user_notifications_user_id (user_id),
      INDEX idx_user_notifications_user_read (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  );
  notificationsTableEnsured = true;
};

export { ensureNotificationsTable };
