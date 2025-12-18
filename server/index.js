import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import popCore from '@alicloud/pop-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const inferMarketFromSymbol = (symbol) => {
  if (!symbol || typeof symbol !== 'string') return null;
  const clean = symbol.replace(/[^0-9]/g, '').trim();
  if (clean.length !== 6) return null;
  if (/^(60|68)\d{4}$/.test(clean)) return 'SH';
  if (/^(00|30)\d{4}$/.test(clean)) return 'SZ';
  if (/^(83|87|88|43|47)\d{4}$/.test(clean)) return 'BJ';
  return 'CN';
};

const tryGetAuthUser = async (req) => {
  try {
    const token = getBearerToken(req);
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded?.sub;
    if (!userId) return null;
    const [rows] = await pool.execute('SELECT id, user_id, username, email, channel FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0];
  } catch {
    return null;
  }
};

const getActiveSubscriptionForUser = async (userId) => {
  if (!userId) return null;
  const [rows] = await pool.execute(
    `SELECT id, user_id, status, plan_code, plan_name, started_at, current_period_start, current_period_end, canceled_at, ended_at, provider, provider_subscription_id, provider_order_id, price_amount, price_currency, created_at, updated_at
     FROM user_subscriptions
     WHERE user_id = ?
       AND status = 'active'
       AND current_period_end > NOW()
     ORDER BY current_period_end DESC
     LIMIT 1`,
    [userId]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
};

const getTierForUser = async (userRow) => {
  if (!userRow) return 'free';
  if (userRow.channel === 1) return 'admin';
  const sub = await getActiveSubscriptionForUser(userRow.user_id);
  if (sub && ['weekly', 'monthly', 'yearly', 'custom'].includes(sub.plan_code)) return 'pro';
  return 'free';
};

const getProQuotaLimitByPlanCode = (planCode) => {
  if (planCode === 'weekly') return 30;
  if (planCode === 'monthly') return 150;
  if (planCode === 'yearly') return 999999999;
  return 150;
};

const ensureFreeGrantAfterProExpired = async (userId) => {
  if (!userId) return;
  const [rows] = await pool.execute(
    `SELECT id, plan_code, current_period_end
     FROM user_subscriptions
     WHERE user_id = ?
       AND plan_code IN ('weekly','monthly','yearly','custom')
       AND current_period_end <= NOW()
     ORDER BY current_period_end DESC
     LIMIT 1`,
    [userId]
  );
  if (!Array.isArray(rows) || rows.length === 0) return;

  const endedAt = rows[0]?.current_period_end;
  if (!endedAt) return;

  const periodEnd = '2099-01-01 00:00:00';
  await pool.execute(
    `INSERT IGNORE INTO user_quota_periods
      (user_id, tier, grant_reason, period_type, period_start, period_end, quota_limit, used_count_success, reserved_count_success, used_count_total)
     VALUES (?, 'free', 'pro_expired_bonus', 'lifetime', ?, ?, 2, 0, 0, 0)`,
    [userId, new Date(endedAt), periodEnd]
  );
};

const ensureAdminShadowQuotaPeriod = async (userId) => {
  if (!userId) return null;
  await pool.execute(
    `INSERT IGNORE INTO user_quota_periods
      (user_id, tier, grant_reason, period_type, period_start, period_end, quota_limit, used_count_success, reserved_count_success, used_count_total)
     VALUES (?, 'pro', 'admin_shadow', 'lifetime', NOW(), '2099-01-01 00:00:00', 999999999, 0, 0, 0)`,
    [userId]
  );
  const [rows] = await pool.execute(
    `SELECT id, quota_limit
     FROM user_quota_periods
     WHERE user_id = ?
       AND tier = 'pro'
       AND period_type = 'lifetime'
       AND grant_reason = 'admin_shadow'
     ORDER BY period_start DESC
     LIMIT 1`,
    [userId]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
};

const ensureFreeRegisterGrant = async (userId) => {
  if (!userId) return;
  const [rows] = await pool.execute(
    `SELECT id
     FROM user_quota_periods
     WHERE user_id = ?
       AND tier = 'free'
       AND period_type = 'lifetime'
       AND grant_reason = 'register'
     LIMIT 1`,
    [userId]
  );
  if (Array.isArray(rows) && rows.length > 0) return;
  await pool.execute(
    `INSERT IGNORE INTO user_quota_periods
      (user_id, tier, grant_reason, period_type, period_start, period_end, quota_limit, used_count_success, reserved_count_success, used_count_total)
     VALUES (?, 'free', 'register', 'lifetime', NOW(), '2099-01-01 00:00:00', 2, 0, 0, 0)`,
    [userId]
  );
};

const ensureProQuotaPeriod = async (userId, subscription) => {
  if (!userId || !subscription) return null;
  const periodType = subscription.plan_code === 'weekly' ? 'weekly' : subscription.plan_code === 'yearly' ? 'yearly' : 'monthly';
  const quotaLimit = getProQuotaLimitByPlanCode(subscription.plan_code);
  await pool.execute(
    `INSERT IGNORE INTO user_quota_periods
      (user_id, tier, grant_reason, period_type, period_start, period_end, quota_limit, used_count_success, reserved_count_success, used_count_total)
     VALUES (?, 'pro', 'subscription', ?, ?, ?, ?, 0, 0, 0)`,
    [
      userId,
      periodType,
      new Date(subscription.current_period_start),
      new Date(subscription.current_period_end),
      quotaLimit
    ]
  );
  const [rows] = await pool.execute(
    `SELECT id, quota_limit, used_count_success, reserved_count_success, used_count_total, period_start, period_end
     FROM user_quota_periods
     WHERE user_id = ? AND tier = 'pro' AND period_type = ? AND period_start = ? AND period_end = ?
     LIMIT 1`,
    [
      userId,
      periodType,
      new Date(subscription.current_period_start),
      new Date(subscription.current_period_end)
    ]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0];
  if (subscription.plan_code === 'yearly' && (row.quota_limit === null || row.quota_limit === undefined)) {
    await pool.execute('UPDATE user_quota_periods SET quota_limit = ? WHERE id = ? AND quota_limit IS NULL', [quotaLimit, row.id]);
    row.quota_limit = quotaLimit;
  }
  return row;
};

const reserveQuotaForAttempt = async ({ userId, tier, subscription, reportType }) => {
  if (!userId) {
    return { ok: false, status: 401, payload: { error: '未登录', code: 'UNAUTHORIZED' } };
  }

  if (tier === 'admin') {
    const qp = await ensureAdminShadowQuotaPeriod(userId);
    const attemptId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    if (qp?.id) {
      await pool.execute(
        `UPDATE user_quota_periods SET used_count_total = used_count_total + 1, last_used_at = NOW() WHERE id = ?`,
        [qp.id]
      );
    }
    await pool.execute(
      `INSERT INTO analysis_attempts (attempt_id, user_id, report_type, quota_period_id, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [attemptId, userId, reportType, qp?.id ?? null]
    );
    return { ok: true, attemptId, quotaPeriodId: qp?.id ?? null, quotaLimit: qp?.quota_limit == null ? null : Number(qp.quota_limit), reserved: false };
  }

  if (tier === 'pro') {
    if (!subscription) {
      return { ok: false, status: 403, payload: { error: '订阅无效', code: 'SUBSCRIPTION_INVALID' } };
    }
    const quotaPeriod = await ensureProQuotaPeriod(userId, subscription);
    if (!quotaPeriod) {
      return { ok: false, status: 500, payload: { error: '配额初始化失败', code: 'QUOTA_INIT_FAILED' } };
    }

    const attemptId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    if (quotaPeriod.quota_limit == null) {
      await pool.execute(
        `UPDATE user_quota_periods SET used_count_total = used_count_total + 1, last_used_at = NOW() WHERE id = ?`,
        [quotaPeriod.id]
      );
      await pool.execute(
        `INSERT INTO analysis_attempts (attempt_id, user_id, report_type, quota_period_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [attemptId, userId, reportType, quotaPeriod.id]
      );
      return { ok: true, attemptId, quotaPeriodId: quotaPeriod.id, quotaLimit: null, reserved: false };
    }

    const [result] = await pool.execute(
      `UPDATE user_quota_periods
       SET reserved_count_success = reserved_count_success + 1,
           used_count_total = used_count_total + 1,
           last_used_at = NOW()
       WHERE id = ?
         AND (used_count_success + reserved_count_success) < quota_limit`,
      [quotaPeriod.id]
    );
    if (!result || result.affectedRows !== 1) {
      return { ok: false, status: 403, payload: { error: '余额不足', code: 'QUOTA_EXCEEDED' } };
    }

    await pool.execute(
      `INSERT INTO analysis_attempts (attempt_id, user_id, report_type, quota_period_id, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [attemptId, userId, reportType, quotaPeriod.id]
    );
    return { ok: true, attemptId, quotaPeriodId: quotaPeriod.id, quotaLimit: quotaPeriod.quota_limit, reserved: true };
  }

  await ensureFreeGrantAfterProExpired(userId);

  const [freeRows] = await pool.execute(
    `SELECT id, quota_limit, used_count_success, reserved_count_success, period_start
     FROM user_quota_periods
     WHERE user_id = ?
       AND tier = 'free'
       AND period_type = 'lifetime'
       AND period_start <= NOW()
       AND period_end > NOW()
     ORDER BY period_start ASC`,
    [userId]
  );
  const periods = Array.isArray(freeRows) ? freeRows : [];
  const attemptId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  for (const p of periods) {
    if (p.quota_limit != null && (p.used_count_success + p.reserved_count_success) >= p.quota_limit) continue;
    if (p.quota_limit == null) {
      await pool.execute(
        `UPDATE user_quota_periods SET used_count_total = used_count_total + 1, last_used_at = NOW() WHERE id = ?`,
        [p.id]
      );
      await pool.execute(
        `INSERT INTO analysis_attempts (attempt_id, user_id, report_type, quota_period_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [attemptId, userId, reportType, p.id]
      );
      return { ok: true, attemptId, quotaPeriodId: p.id, quotaLimit: null, reserved: false };
    }

    const [result] = await pool.execute(
      `UPDATE user_quota_periods
       SET reserved_count_success = reserved_count_success + 1,
           used_count_total = used_count_total + 1,
           last_used_at = NOW()
       WHERE id = ?
         AND (used_count_success + reserved_count_success) < quota_limit`,
      [p.id]
    );
    if (result && result.affectedRows === 1) {
      await pool.execute(
        `INSERT INTO analysis_attempts (attempt_id, user_id, report_type, quota_period_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [attemptId, userId, reportType, p.id]
      );
      return { ok: true, attemptId, quotaPeriodId: p.id, quotaLimit: p.quota_limit, reserved: true };
    }
  }

  return { ok: false, status: 403, payload: { error: '余额不足', code: 'QUOTA_EXCEEDED' } };
};

const finalizeQuotaAttempt = async ({ attemptId, quotaPeriodId, success, reserved }) => {
  try {
    if (attemptId) {
      await pool.execute(
        `UPDATE analysis_attempts SET status = ?, ended_at = NOW() WHERE attempt_id = ?`,
        [success ? 'success' : 'failed', attemptId]
      );
    }
    if (!quotaPeriodId) return;
    if (success) {
      if (reserved) {
        await pool.execute(
          `UPDATE user_quota_periods
           SET reserved_count_success = IF(reserved_count_success > 0, reserved_count_success - 1, 0),
               used_count_success = used_count_success + 1,
               last_used_at = NOW()
           WHERE id = ?`,
          [quotaPeriodId]
        );
      } else {
        await pool.execute(
          `UPDATE user_quota_periods
           SET used_count_success = used_count_success + 1,
               last_used_at = NOW()
           WHERE id = ?`,
          [quotaPeriodId]
        );
      }
      return;
    }

    if (reserved) {
      await pool.execute(
        `UPDATE user_quota_periods
         SET reserved_count_success = IF(reserved_count_success > 0, reserved_count_success - 1, 0),
             last_used_at = NOW()
         WHERE id = ?`,
        [quotaPeriodId]
      );
    }
  } catch (e) {
    console.error('❌ finalize quota attempt failed:', e);
  }
};

const persistAnalysisReportToDb = async ({
  reportId,
  startedAt,
  endedAt,
  stockCode,
  market,
  user,
  content,
  reportType,
  strategyMode
}) => {
  try {
    await pool.execute(
      `INSERT INTO analysis_reports
        (report_id, user_pk, user_id, report_type, strategy_mode, stock_code, market, stock_name, recommendation, confidence_score, report_json, started_at, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        user?.id ?? null,
        user?.user_id ?? null,
        reportType,
        strategyMode || null,
        stockCode || null,
        market || null,
        content?.stockName || null,
        content?.recommendation || null,
        typeof content?.confidenceScore === 'number' ? content.confidenceScore : null,
        JSON.stringify(content ?? {}),
        startedAt ? new Date(startedAt) : null,
        endedAt ? new Date(endedAt) : null
      ]
    );
    return { ok: true };
  } catch (e) {
    console.error('❌ persist report db failed:', e);
    return { ok: false };
  }
};

// ========配置数据============ MySQL 数据库连接池 ====================
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

const DM_ACCESS_KEY_ID = process.env.ACCESS_KEY_ID || process.env.ALIYUN_ACCESS_KEY_ID;
const DM_ACCESS_KEY_SECRET = process.env.ACCESS_KEY_SECRET || process.env.ALIYUN_ACCESS_KEY_SECRET;
const DM_ACCOUNT_NAME = process.env.ACCOUNT_NAME || process.env.ALIYUN_DM_ACCOUNT_NAME;
const DM_FROM_ALIAS = process.env.FROM_ALIAS || process.env.ALIYUN_DM_FROM_ALIAS || 'deeptrading注册验证';
const DM_REPLY_ADDRESS = process.env.REPLY_ADDRESS || process.env.ALIYUN_DM_REPLY_ADDRESS || DM_ACCOUNT_NAME;

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev-jwt-secret';
const VERIFICATION_CODE_SECRET = process.env.VERIFICATION_CODE_SECRET || JWT_SECRET;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const getRequestIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
};

const hashVerificationCode = (code) => {
  return crypto.createHash('sha256').update(`${code}:${VERIFICATION_CODE_SECRET}`).digest('hex');
};

const signAuthToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const getBearerToken = (req) => {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const requireAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期', code: 'INVALID_TOKEN' });
  }
};

async function sendAliyunVerifyEmail(toEmail, verifyCode) {
  if (!DM_ACCESS_KEY_ID || !DM_ACCESS_KEY_SECRET || !DM_ACCOUNT_NAME) {
    throw new Error('Aliyun DirectMail env missing');
  }

  const RPCClient = popCore?.RPCClient || popCore?.default?.RPCClient || popCore?.default || popCore;
  const client = new RPCClient({
    accessKeyId: DM_ACCESS_KEY_ID,
    accessKeySecret: DM_ACCESS_KEY_SECRET,
    endpoint: 'https://dm.aliyuncs.com',
    apiVersion: '2015-11-23'
  });

  const params = {
    AccountName: DM_ACCOUNT_NAME,
    FromAlias: DM_FROM_ALIAS,
    AddressType: 1,
    ToAddress: toEmail,
    Subject: '【deeptrading】注册验证码',
    TextBody: `您的注册验证码是：${verifyCode}，5分钟内有效，请及时填写。`,
    ReplyToAddress: 'false'
  };

  return client.request('SingleSendMail', params, { method: 'POST' });
}

async function sendAliyunResetPasswordEmail(toEmail, verifyCode) {
  if (!DM_ACCESS_KEY_ID || !DM_ACCESS_KEY_SECRET || !DM_ACCOUNT_NAME) {
    throw new Error('Aliyun DirectMail env missing');
  }
  const RPCClient = popCore.RPCClient;
  const client = new RPCClient({
    accessKeyId: DM_ACCESS_KEY_ID,
    accessKeySecret: DM_ACCESS_KEY_SECRET,
    endpoint: 'https://dm.aliyuncs.com',
    apiVersion: '2015-11-23'
  });

  const params = {
    AccountName: DM_ACCOUNT_NAME,
    FromAlias: DM_FROM_ALIAS,
    AddressType: 1,
    ToAddress: toEmail,
    Subject: '【deeptrading】找回密码验证码',
    TextBody: `您的找回密码验证码是：${verifyCode}，5分钟内有效，请及时填写。`,
    ReplyToAddress: 'false'
  };

  return client.request('SingleSendMail', params, { method: 'POST' });
}

// ==================== Auth APIs ====================

app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确', code: 'INVALID_EMAIL' });
    }

    if (!DM_ACCESS_KEY_ID || !DM_ACCESS_KEY_SECRET || !DM_ACCOUNT_NAME) {
      return res.status(500).json({ error: '邮件服务未配置', code: 'EMAIL_CONFIG_MISSING' });
    }

    const purpose = 'register';
    const [recentRows] = await pool.execute(
      'SELECT id, created_at FROM email_verification_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
      [email, purpose]
    );

    if (Array.isArray(recentRows) && recentRows.length > 0) {
      const lastCreatedAt = new Date(recentRows[0].created_at).getTime();
      const now = Date.now();
      const diffSeconds = Math.floor((now - lastCreatedAt) / 1000);
      if (diffSeconds < 60) {
        return res.status(429).json({
          error: '发送太频繁，请稍后再试',
          code: 'TOO_MANY_REQUESTS',
          retryAfterSeconds: 60 - diffSeconds
        });
      }
    }

    const verifyCode = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = hashVerificationCode(verifyCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const requestIp = getRequestIp(req);

    let userId = null;
    try {
      const [userRows] = await pool.execute('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
      if (Array.isArray(userRows) && userRows.length > 0) {
        userId = userRows[0]?.user_id || null;
      }
    } catch {}

    const codeUserId = (typeof userId === 'string' && userId.trim().length > 0)
      ? userId
      : `pending-${crypto.randomBytes(4).toString('hex')}`;

    const [insertResult] = await pool.execute(
      'INSERT INTO email_verification_codes (user_id, email, purpose, code_hash, expires_at, request_ip) VALUES (?, ?, ?, ?, ?, ?)',
      [codeUserId, email, purpose, codeHash, expiresAt, requestIp]
    );

    try {
      await sendAliyunVerifyEmail(email, verifyCode);
    } catch (e) {
      if (insertResult?.insertId) {
        await pool.execute('DELETE FROM email_verification_codes WHERE id = ?', [insertResult.insertId]);
      }
      const details = {
        name: e?.name,
        message: e?.message,
        code: e?.code,
        requestId: e?.data?.RequestId || e?.RequestId,
        aliyunCode: e?.data?.Code,
        aliyunMessage: e?.data?.Message
      };
      console.error('❌ Aliyun DirectMail SingleSendMail failed:', details);
      return res.status(500).json({ error: '验证码发送失败', code: 'EMAIL_SEND_FAILED', details });
    }

    return res.json({ ok: true, expiresInSeconds: 300 });
  } catch (error) {
    console.error('❌ send-code error:', error);
    return res.status(500).json({ error: '发送失败', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/auth/send-reset-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确', code: 'INVALID_EMAIL' });
    }

    if (!DM_ACCESS_KEY_ID || !DM_ACCESS_KEY_SECRET || !DM_ACCOUNT_NAME) {
      return res.status(500).json({ error: '邮件服务未配置', code: 'EMAIL_CONFIG_MISSING' });
    }

    const [userRows] = await pool.execute('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    const userId = Array.isArray(userRows) && userRows.length > 0 ? (userRows[0]?.user_id || null) : null;
    if (!userId) {
      return res.json({ ok: true, expiresInSeconds: 300 });
    }

    const purpose = 'reset_password';
    const [recentRows] = await pool.execute(
      'SELECT id, created_at FROM email_verification_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
      [email, purpose]
    );

    if (Array.isArray(recentRows) && recentRows.length > 0) {
      const lastCreatedAt = new Date(recentRows[0].created_at).getTime();
      const now = Date.now();
      const diffSeconds = Math.floor((now - lastCreatedAt) / 1000);
      if (diffSeconds < 60) {
        return res.status(429).json({
          error: '发送太频繁，请稍后再试',
          code: 'TOO_MANY_REQUESTS',
          retryAfterSeconds: 60 - diffSeconds
        });
      }
    }

    const verifyCode = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = hashVerificationCode(verifyCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const requestIp = getRequestIp(req);

    const [insertResult] = await pool.execute(
      'INSERT INTO email_verification_codes (user_id, email, purpose, code_hash, expires_at, request_ip) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, email, purpose, codeHash, expiresAt, requestIp]
    );

    try {
      await sendAliyunResetPasswordEmail(email, verifyCode);
    } catch (e) {
      if (insertResult?.insertId) {
        await pool.execute('DELETE FROM email_verification_codes WHERE id = ?', [insertResult.insertId]);
      }
      const details = {
        name: e?.name,
        message: e?.message,
        code: e?.code,
        requestId: e?.data?.RequestId || e?.RequestId,
        aliyunCode: e?.data?.Code,
        aliyunMessage: e?.data?.Message
      };
      console.error('❌ Aliyun DirectMail reset password mail failed:', details);
      return res.status(500).json({ error: '验证码发送失败', code: 'EMAIL_SEND_FAILED', details });
    }

    return res.json({ ok: true, expiresInSeconds: 300 });
  } catch (error) {
    console.error('❌ send-reset-code error:', error);
    return res.status(500).json({ error: '发送失败', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  let connection;
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确', code: 'INVALID_EMAIL' });
    }
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: '验证码不正确', code: 'INVALID_CODE' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: '密码至少6位', code: 'INVALID_PASSWORD' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [userRows] = await connection.execute('SELECT id, user_id, status FROM users WHERE email = ? LIMIT 1', [email]);
    if (!Array.isArray(userRows) || userRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: '验证码无效', code: 'INVALID_CODE' });
    }
    const userRow = userRows[0];
    if (userRow.status !== 'normal') {
      await connection.rollback();
      return res.status(403).json({ error: '账号已被禁用', code: 'ACCOUNT_DISABLED' });
    }

    const purpose = 'reset_password';
    const [codeRows] = await connection.execute(
      'SELECT id, code_hash, expires_at, used_at FROM email_verification_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
      [email, purpose]
    );
    if (!Array.isArray(codeRows) || codeRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: '验证码无效', code: 'INVALID_CODE' });
    }
    const latest = codeRows[0];
    if (latest.used_at) {
      await connection.rollback();
      return res.status(400).json({ error: '验证码已使用', code: 'CODE_USED' });
    }
    if (new Date(latest.expires_at).getTime() < Date.now()) {
      await connection.rollback();
      return res.status(400).json({ error: '验证码已过期', code: 'CODE_EXPIRED' });
    }
    const inputHash = hashVerificationCode(code);
    if (inputHash !== latest.code_hash) {
      await connection.rollback();
      return res.status(400).json({ error: '验证码错误', code: 'INVALID_CODE' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await connection.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [passwordHash, userRow.id]);
    await connection.execute('UPDATE email_verification_codes SET used_at = NOW(), user_id = ? WHERE id = ?', [userRow.user_id, latest.id]);

    await connection.commit();
    return res.json({ ok: true });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    console.error('❌ reset-password error:', error);
    return res.status(500).json({ error: '重置失败', code: 'INTERNAL_ERROR' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/auth/register', async (req, res) => {
  let connection;
  try {
    const { username, email, password, code } = req.body || {};
    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      return res.status(400).json({ error: '用户名不正确', code: 'INVALID_USERNAME' });
    }
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确', code: 'INVALID_EMAIL' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: '密码至少6位', code: 'INVALID_PASSWORD' });
    }
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: '验证码不正确', code: 'INVALID_CODE' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      'SELECT id, username, email FROM users WHERE email = ? OR username = ? LIMIT 1',
      [email, username]
    );
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      await connection.rollback();
      const existing = existingUsers[0];
      if (existing.email === email) {
        return res.status(409).json({ error: '邮箱已注册', code: 'EMAIL_EXISTS' });
      }
      return res.status(409).json({ error: '用户名已被占用', code: 'USERNAME_EXISTS' });
    }

    const purpose = 'register';
    const [codeRows] = await connection.execute(
      'SELECT id, code_hash, expires_at, used_at FROM email_verification_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
      [email, purpose]
    );
    if (!Array.isArray(codeRows) || codeRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: '验证码无效', code: 'INVALID_CODE' });
    }
    const latest = codeRows[0];
    if (latest.used_at) {
      await connection.rollback();
      return res.status(400).json({ error: '验证码已使用', code: 'CODE_USED' });
    }
    if (new Date(latest.expires_at).getTime() < Date.now()) {
      await connection.rollback();
      return res.status(400).json({ error: '验证码已过期', code: 'CODE_EXPIRED' });
    }
    const inputHash = hashVerificationCode(code);
    if (inputHash !== latest.code_hash) {
      await connection.rollback();
      return res.status(400).json({ error: '验证码错误', code: 'INVALID_CODE' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const tempUserId = `tmp-${crypto.randomBytes(6).toString('hex')}`;
    const [createResult] = await connection.execute(
      'INSERT INTO users (user_id, username, email, password_hash, status, channel) VALUES (?, ?, ?, ?, ?, ?)',
      [tempUserId, username.trim(), email, passwordHash, 'normal', 0]
    );

    const publicUserId = `dp-${String(createResult.insertId).padStart(6, '0')}`;

    await connection.execute('UPDATE users SET user_id = ? WHERE id = ?', [publicUserId, createResult.insertId]);

    await connection.execute(
      `INSERT IGNORE INTO user_quota_periods
        (user_id, tier, grant_reason, period_type, period_start, period_end, quota_limit, used_count_success, reserved_count_success, used_count_total)
       VALUES (?, 'free', 'register', 'lifetime', NOW(), '2099-01-01 00:00:00', 2, 0, 0, 0)`,
      [publicUserId]
    );

    await connection.execute(
      'UPDATE email_verification_codes SET used_at = NOW(), user_id = ? WHERE id = ?',
      [publicUserId, latest.id]
    );

    const user = { id: createResult.insertId, user_id: publicUserId, username: username.trim(), email, channel: 0 };
    const token = signAuthToken(user);

    await connection.commit();
    return res.json({ token, user });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    console.error('❌ register error:', error);
    return res.status(500).json({ error: '注册失败', code: 'INTERNAL_ERROR' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ error: '请输入邮箱或用户名', code: 'INVALID_IDENTIFIER' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: '请输入密码', code: 'INVALID_PASSWORD' });
    }

    const isEmail = emailRegex.test(identifier);
    const [rows] = await pool.execute(
      isEmail
        ? 'SELECT id, user_id, username, email, password_hash, status, channel FROM users WHERE email = ? LIMIT 1'
        : 'SELECT id, user_id, username, email, password_hash, status, channel FROM users WHERE username = ? LIMIT 1',
      [identifier]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({ error: '账号或密码错误', code: 'INVALID_CREDENTIALS' });
    }

    const userRow = rows[0];
    if (userRow.status !== 'normal') {
      return res.status(403).json({ error: '账号已被禁用', code: 'ACCOUNT_DISABLED' });
    }

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: '账号或密码错误', code: 'INVALID_CREDENTIALS' });
    }

    await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userRow.id]);

    const user = { id: userRow.id, user_id: userRow.user_id, username: userRow.username, email: userRow.email, channel: userRow.channel };
    const token = signAuthToken(user);
    return res.json({ token, user });
  } catch (error) {
    console.error('❌ login error:', error);
    return res.status(500).json({ error: '登录失败', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.sub;
    const [rows] = await pool.execute(
      'SELECT id, user_id, username, email, status, channel, last_login_at, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: '用户不存在', code: 'USER_NOT_FOUND' });
    }

    const user = rows[0];
    const tier = await getTierForUser(user);
    const subscription = tier === 'pro' ? await getActiveSubscriptionForUser(user.user_id) : null;
    if (tier === 'free') {
      await ensureFreeGrantAfterProExpired(user.user_id);
    }

    let quota = null;
    if (tier === 'admin') {
      quota = {
        tier,
        planCode: 'admin',
        quotaLimit: null,
        usedSuccess: 0,
        usedTotal: 0,
        reservedSuccess: 0,
        remainingSuccess: null
      };
    } else if (tier === 'pro' && subscription) {
      const qp = await ensureProQuotaPeriod(user.user_id, subscription);
      if (qp) {
        const usedSuccess = Number(qp.used_count_success || 0);
        const usedTotal = Number(qp.used_count_total || 0);
        const reservedSuccess = Number(qp.reserved_count_success || 0);
        const quotaLimit = qp.quota_limit == null ? null : Number(qp.quota_limit);
        quota = {
          tier,
          planCode: subscription.plan_code,
          quotaLimit,
          usedSuccess,
          usedTotal,
          reservedSuccess,
          remainingSuccess: quotaLimit == null ? null : Math.max(0, quotaLimit - usedSuccess - reservedSuccess),
          periodStart: qp.period_start,
          periodEnd: qp.period_end
        };
      }
    } else {
      const [qRows] = await pool.execute(
        `SELECT id, quota_limit, used_count_success, reserved_count_success, used_count_total, period_start
         FROM user_quota_periods
         WHERE user_id = ? AND tier = 'free' AND period_type = 'lifetime' AND period_start <= NOW() AND period_end > NOW()
         ORDER BY period_start ASC`,
        [user.user_id]
      );
      const list = Array.isArray(qRows) ? qRows : [];
      let quotaLimitTotal = 0;
      let usedSuccessTotal = 0;
      let usedTotalTotal = 0;
      let reservedSuccessTotal = 0;
      for (const r of list) {
        quotaLimitTotal += Number(r.quota_limit || 0);
        usedSuccessTotal += Number(r.used_count_success || 0);
        usedTotalTotal += Number(r.used_count_total || 0);
        reservedSuccessTotal += Number(r.reserved_count_success || 0);
      }
      quota = {
        tier,
        planCode: 'free',
        quotaLimit: quotaLimitTotal,
        usedSuccess: usedSuccessTotal,
        usedTotal: usedTotalTotal,
        reservedSuccess: reservedSuccessTotal,
        remainingSuccess: Math.max(0, quotaLimitTotal - usedSuccessTotal - reservedSuccessTotal)
      };
    }

    return res.json({ user, tier, subscription, quota });
  } catch (error) {
    console.error('❌ me error:', error);
    return res.status(500).json({ error: '获取失败', code: 'INTERNAL_ERROR' });
  }
});

app.put('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.sub;
    const { username, email } = req.body || {};
    const cleanUsername = typeof username === 'string' ? username.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim() : '';

    if (!cleanUsername || cleanUsername.length < 2) {
      return res.status(400).json({ error: '用户名不正确', code: 'INVALID_USERNAME' });
    }
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: '邮箱格式不正确', code: 'INVALID_EMAIL' });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE (email = ? OR username = ?) AND id <> ? LIMIT 1',
      [cleanEmail, cleanUsername, userId]
    );
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(409).json({ error: '邮箱或用户名已被占用', code: 'DUPLICATE' });
    }

    await pool.execute('UPDATE users SET username = ?, email = ?, updated_at = NOW() WHERE id = ?', [cleanUsername, cleanEmail, userId]);
    const [rows] = await pool.execute('SELECT id, user_id, username, email, status, channel, last_login_at, created_at, updated_at FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    return res.json({ ok: true, user });
  } catch (error) {
    console.error('❌ update profile error:', error);
    return res.status(500).json({ error: '更新失败', code: 'INTERNAL_ERROR' });
  }
});

app.put('/api/user/change-password', requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.sub;
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: '请输入当前密码', code: 'INVALID_PASSWORD' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少6位', code: 'INVALID_NEW_PASSWORD' });
    }

    const [rows] = await pool.execute('SELECT id, password_hash, status FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: '用户不存在', code: 'USER_NOT_FOUND' });
    }
    const user = rows[0];
    if (user.status !== 'normal') {
      return res.status(403).json({ error: '账号已被禁用', code: 'ACCOUNT_DISABLED' });
    }

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: '当前密码错误', code: 'INVALID_CREDENTIALS' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [passwordHash, userId]);
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ change password error:', error);
    return res.status(500).json({ error: '更新失败', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/billing/mock-pay', requireAuth, async (req, res) => {
  try {
    const user = await tryGetAuthUser(req);
    if (!user?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    if (user.channel === 1) {
      return res.json({ ok: true, tier: 'admin' });
    }

    const { plan_code, provider } = req.body || {};
    if (!plan_code || !['weekly', 'monthly', 'yearly'].includes(plan_code)) {
      return res.status(400).json({ error: 'plan_code 不正确', code: 'INVALID_PLAN_CODE' });
    }
    const now = new Date();
    const periodStart = now;
    const periodEnd = new Date(now);
    if (plan_code === 'weekly') periodEnd.setDate(periodEnd.getDate() + 7);
    if (plan_code === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
    if (plan_code === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    await pool.execute(
      `UPDATE user_subscriptions
       SET status = 'canceled', canceled_at = NOW(), ended_at = NOW()
       WHERE user_id = ? AND status = 'active'`,
      [user.user_id]
    );

    await pool.execute(
      `INSERT INTO user_subscriptions
        (user_id, status, plan_code, plan_name, started_at, current_period_start, current_period_end, provider, provider_order_id, created_at, updated_at)
       VALUES (?, 'active', ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        user.user_id,
        plan_code,
        plan_code === 'weekly' ? '周会员' : plan_code === 'monthly' ? '月会员' : '年会员',
        now,
        periodStart,
        periodEnd,
        provider || null,
        `mock-${crypto.randomBytes(8).toString('hex')}`
      ]
    );

    const sub = await getActiveSubscriptionForUser(user.user_id);
    if (sub) {
      await ensureProQuotaPeriod(user.user_id, sub);
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ mock-pay error:', error);
    return res.status(500).json({ error: '支付失败', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/admin/grant-subscription', requireAuth, async (req, res) => {
  try {
    const admin = await tryGetAuthUser(req);
    if (!admin?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    if (admin.channel !== 1) {
      return res.status(403).json({ error: '无权限', code: 'FORBIDDEN' });
    }

    const { identifier, plan_code, provider } = req.body || {};
    const clean = typeof identifier === 'string' ? identifier.trim() : '';
    if (!clean) {
      return res.status(400).json({ error: 'identifier 不能为空', code: 'INVALID_IDENTIFIER' });
    }
    if (!plan_code || !['weekly', 'monthly', 'yearly'].includes(plan_code)) {
      return res.status(400).json({ error: 'plan_code 不正确', code: 'INVALID_PLAN_CODE' });
    }

    const isEmail = emailRegex.test(clean);
    const [uRows] = await pool.execute(
      isEmail
        ? 'SELECT id, user_id, username, email, channel FROM users WHERE email = ? LIMIT 1'
        : 'SELECT id, user_id, username, email, channel FROM users WHERE username = ? LIMIT 1',
      [clean]
    );
    if (!Array.isArray(uRows) || uRows.length === 0) {
      return res.status(404).json({ error: '用户不存在', code: 'USER_NOT_FOUND' });
    }

    const target = uRows[0];
    if (!target?.user_id) {
      return res.status(400).json({ error: '目标用户无效', code: 'TARGET_INVALID' });
    }
    if (target.channel === 1) {
      return res.status(400).json({ error: '无需为管理员开通', code: 'TARGET_IS_ADMIN' });
    }

    const now = new Date();
    const periodStart = now;
    const periodEnd = new Date(now);
    if (plan_code === 'weekly') periodEnd.setDate(periodEnd.getDate() + 7);
    if (plan_code === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
    if (plan_code === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    await pool.execute(
      `UPDATE user_subscriptions
       SET status = 'canceled', canceled_at = NOW(), ended_at = NOW()
       WHERE user_id = ? AND status = 'active'`,
      [target.user_id]
    );

    await pool.execute(
      `INSERT INTO user_subscriptions
        (user_id, status, plan_code, plan_name, started_at, current_period_start, current_period_end, provider, provider_order_id, created_at, updated_at)
       VALUES (?, 'active', ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        target.user_id,
        plan_code,
        plan_code === 'weekly' ? '周会员' : plan_code === 'monthly' ? '月会员' : '年会员',
        now,
        periodStart,
        periodEnd,
        provider || null,
        `admin-${crypto.randomBytes(8).toString('hex')}`
      ]
    );

    const sub = await getActiveSubscriptionForUser(target.user_id);
    if (sub) {
      await ensureProQuotaPeriod(target.user_id, sub);
    }

    await ensureNotificationsTable();
    await pool.execute(
      `INSERT INTO user_notifications (user_id, type, title, body, data_json, is_read)
       VALUES (?, 'subscription', '会员已开通', ?, ?, 0)`,
      [
        target.user_id,
        `已开通${plan_code === 'weekly' ? '周' : plan_code === 'monthly' ? '月' : '年'}会员`,
        JSON.stringify({ plan_code })
      ]
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ admin grant subscription error:', error);
    return res.status(500).json({ error: '开通失败', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const user = await tryGetAuthUser(req);
    if (!user?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    await ensureNotificationsTable();

    const limitRaw = parseInt(req.query?.limit, 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));
    const [rows] = await pool.execute(
      `SELECT id, type, title, body, data_json, is_read, created_at
       FROM user_notifications
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT ${limit}`,
      [user.user_id]
    );

    const items = (Array.isArray(rows) ? rows : []).map((r) => {
      let data = null;
      try {
        data = r?.data_json ? JSON.parse(r.data_json) : null;
      } catch {
        data = null;
      }
      return {
        id: Number(r.id),
        type: r.type,
        title: r.title,
        body: r.body || '',
        data,
        read: Boolean(r.is_read),
        createdAt: r.created_at
      };
    });

    return res.json({ items });
  } catch (error) {
    console.error('❌ notifications list error:', error);
    return res.status(500).json({ error: '获取失败', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const user = await tryGetAuthUser(req);
    if (!user?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    await ensureNotificationsTable();

    const id = parseInt(req.params?.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'id 不正确', code: 'INVALID_ID' });
    }

    await pool.execute(
      'UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, user.user_id]
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ notification read error:', error);
    return res.status(500).json({ error: '操作失败', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const user = await tryGetAuthUser(req);
    if (!user?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    await ensureNotificationsTable();

    await pool.execute('UPDATE user_notifications SET is_read = 1 WHERE user_id = ?', [user.user_id]);
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ notifications read-all error:', error);
    return res.status(500).json({ error: '操作失败', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/usage/summary', requireAuth, async (req, res) => {
  try {
    const user = await tryGetAuthUser(req);
    if (!user?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }

    await ensureFreeRegisterGrant(user.user_id);
    await ensureFreeGrantAfterProExpired(user.user_id);

    // 严格按口径：
    // SELECT
    //   user_id,
    //   sum(quota_limit) - sum(used_count_success) AS 剩余分析次数,
    //   sum(used_count_success) as 历史分析次数
    // FROM user_quota_periods where user_id = ? GROUP BY user_id
    const [rows] = await pool.execute(
      `SELECT
         user_id,
         SUM(quota_limit) AS quotaLimit,
         SUM(quota_limit) - SUM(used_count_success) AS remainingSuccess,
         SUM(used_count_success) AS historyCount,
         MAX(quota_limit) AS maxQuotaLimit
       FROM user_quota_periods
       WHERE user_id = ?
       GROUP BY user_id`,
      [user.user_id]
    );

    const r = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const quotaLimit = r?.quotaLimit === null || r?.quotaLimit === undefined ? 0 : Number(r.quotaLimit);
    const remainingSuccess = r?.remainingSuccess === null || r?.remainingSuccess === undefined ? 0 : Number(r.remainingSuccess);
    const historyCount = r?.historyCount === null || r?.historyCount === undefined ? 0 : Number(r.historyCount);
    const maxQuotaLimit = r?.maxQuotaLimit === null || r?.maxQuotaLimit === undefined ? 0 : Number(r.maxQuotaLimit);
    const isUnlimited = Number.isFinite(maxQuotaLimit) && maxQuotaLimit >= 999999999;

    return res.json({
      userId: user.user_id,
      quotaLimit,
      remainingSuccess,
      historyCount,
      isUnlimited
    });
  } catch (error) {
    console.error('❌ usage summary error:', error);
    return res.status(500).json({ error: '获取失败', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/usage/trend', requireAuth, async (req, res) => {
  try {
    const user = await tryGetAuthUser(req);
    if (!user?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    const days = Math.min(90, Math.max(1, parseInt(req.query?.days, 10) || 7));
    const safeDays = Number.isFinite(days) ? Math.floor(days) : 7;

    // 严格按口径：
    // SELECT
    //   user_id,
    //   DATE_FORMAT(started_at, '%Y-%m-%d') AS 日期,
    //   COUNT(*) AS 分析次数
    // FROM analysis_reports where user_id = ?
    // GROUP BY user_id, DATE_FORMAT(started_at, '%Y-%m-%d');
    // 同时补齐最近 N 天缺失日期为 0，避免图表为空。
    const [rows] = await pool.execute(
      `SELECT
         ANY_VALUE(user_id) AS user_id,
         DATE_FORMAT(started_at, '%Y-%m-%d') AS d,
         COUNT(*) AS c
       FROM analysis_reports
       WHERE user_id = ?
         AND started_at >= (CURDATE() - INTERVAL ${safeDays - 1} DAY)
       GROUP BY user_id, DATE_FORMAT(started_at, '%Y-%m-%d')
       ORDER BY d ASC`,
      [user.user_id]
    );

    const map = new Map();
    for (const r of Array.isArray(rows) ? rows : []) {
      const key = typeof r?.d === 'string' ? r.d : null;
      if (!key) continue;
      map.set(key, Number(r?.c || 0));
    }

    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));

    const items = [];
    for (let i = 0; i < safeDays; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      items.push({ date: key, count: Number(map.get(key) || 0) });
    }

    return res.json({ days: safeDays, items });
  } catch (error) {
    console.error('❌ usage trend error:', error);
    return res.status(500).json({ error: '获取失败', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/reports', requireAuth, async (req, res) => {
  try {
    const user = await tryGetAuthUser(req);
    if (!user?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }

    const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query?.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
    const safePageSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : 20;

    const [rows] = await pool.execute(
      `SELECT report_id, report_json, created_at
       FROM analysis_reports
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ${safeOffset}, ${safePageSize}`,
      [user.user_id]
    );

    const items = (Array.isArray(rows) ? rows : []).map((r) => {
      let reportJson = r.report_json;
      if (typeof reportJson === 'string') {
        try {
          reportJson = JSON.parse(reportJson);
        } catch {
          reportJson = null;
        }
      }
      const createdAt = r.created_at ? new Date(r.created_at).toISOString() : null;
      const base = reportJson && typeof reportJson === 'object' ? reportJson : {};
      return {
        ...base,
        id: r.report_id,
        timestamp: base.timestamp || createdAt
      };
    });

    return res.json({ page, pageSize, items });
  } catch (error) {
    console.error('❌ reports list error:', error);
    return res.status(500).json({ error: '获取失败', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/reports/:reportId', requireAuth, async (req, res) => {
  try {
    const user = await tryGetAuthUser(req);
    if (!user?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }

    const reportId = req.params?.reportId;
    if (!reportId) {
      return res.status(400).json({ error: 'reportId 缺失', code: 'INVALID_REPORT_ID' });
    }

    const [rows] = await pool.execute(
      'SELECT report_id, report_json, created_at FROM analysis_reports WHERE report_id = ? AND user_id = ? LIMIT 1',
      [reportId, user.user_id]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: '报告不存在', code: 'REPORT_NOT_FOUND' });
    }
    const r = rows[0];
    let reportJson = r.report_json;
    if (typeof reportJson === 'string') {
      try {
        reportJson = JSON.parse(reportJson);
      } catch {
        reportJson = null;
      }
    }

    const createdAt = r.created_at ? new Date(r.created_at).toISOString() : null;
    const base = reportJson && typeof reportJson === 'object' ? reportJson : {};
    return res.json({
      report: {
        ...base,
        id: r.report_id,
        timestamp: base.timestamp || createdAt
      }
    });
  } catch (error) {
    console.error('❌ report detail error:', error);
    return res.status(500).json({ error: '获取失败', code: 'INTERNAL_ERROR' });
  }
});

// ==================== 技术指标计算工具函数 ====================

/**
 * 计算 EMA (指数移动平均)
 */
function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  const emaArray = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    emaArray.push(prices[i] * k + emaArray[i - 1] * (1 - k));
  }
  
  return emaArray;
}

/**
 * 计算 MACD 指标
 * @param {number[]} closePrices - 收盘价数组（从旧到新）
 * @returns {Object} MACD 指标数据
 */
function calculateMACD(closePrices) {
  if (closePrices.length < 26) {
    return { macd: null, signal: null, histogram: null, interpretation: '数据不足' };
  }
  
  const ema12 = calculateEMA(closePrices, 12);
  const ema26 = calculateEMA(closePrices, 26);
  
  // DIF = EMA12 - EMA26
  const dif = ema12.map((v, i) => v - ema26[i]);
  
  // DEA = DIF 的 9 日 EMA
  const dea = calculateEMA(dif, 9);
  
  // MACD 柱 = (DIF - DEA) * 2
  const macdHistogram = dif.map((v, i) => (v - dea[i]) * 2);
  
  // 取最新值
  const latestDIF = dif[dif.length - 1];
  const latestDEA = dea[dea.length - 1];
  const latestHistogram = macdHistogram[macdHistogram.length - 1];
  const prevHistogram = macdHistogram[macdHistogram.length - 2];
  
  // 解读 MACD
  let interpretation = '';
  let status = '';
  let sentiment = 'neutral';
  
  if (latestDIF > latestDEA && latestDIF > 0) {
    status = '金叉向上';
    interpretation = 'MACD金叉且在零轴上方，多头趋势强劲';
    sentiment = 'bullish';
  } else if (latestDIF > latestDEA && latestDIF <= 0) {
    status = '金叉形成';
    interpretation = 'MACD金叉但在零轴下方，可能反弹';
    sentiment = 'bullish';
  } else if (latestDIF < latestDEA && latestDIF < 0) {
    status = '死叉向下';
    interpretation = 'MACD死叉且在零轴下方，空头趋势明显';
    sentiment = 'bearish';
  } else if (latestDIF < latestDEA && latestDIF >= 0) {
    status = '死叉形成';
    interpretation = 'MACD死叉但在零轴上方，注意回调风险';
    sentiment = 'bearish';
  }
  
  // 柱状图变化
  if (latestHistogram > 0 && latestHistogram > prevHistogram) {
    status = '红柱放大';
    interpretation += '，红柱放大，上涨动能增强';
  } else if (latestHistogram > 0 && latestHistogram < prevHistogram) {
    status = '红柱缩量';
    interpretation += '，红柱缩小，上涨动能减弱';
  } else if (latestHistogram < 0 && latestHistogram < prevHistogram) {
    status = '绿柱放大';
    interpretation += '，绿柱放大，下跌动能增强';
  } else if (latestHistogram < 0 && latestHistogram > prevHistogram) {
    status = '绿柱缩量';
    interpretation += '，绿柱缩小，下跌动能减弱';
  }
  
  return {
    dif: latestDIF.toFixed(3),
    dea: latestDEA.toFixed(3),
    histogram: latestHistogram.toFixed(3),
    status,
    interpretation,
    sentiment
  };
}

/**
 * 计算 RSI 指标
 * @param {number[]} closePrices - 收盘价数组（从旧到新）
 * @param {number} period - RSI 周期，默认14
 * @returns {Object} RSI 指标数据
 */
function calculateRSI(closePrices, period = 14) {
  if (closePrices.length < period + 1) {
    return { rsi: null, interpretation: '数据不足' };
  }
  
  // 计算价格变化
  const changes = [];
  for (let i = 1; i < closePrices.length; i++) {
    changes.push(closePrices[i] - closePrices[i - 1]);
  }
  
  // 分离涨跌
  let avgGain = 0;
  let avgLoss = 0;
  
  // 初始平均值
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;
  
  // 平滑计算
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }
  
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // 解读 RSI
  let status = '';
  let interpretation = '';
  let sentiment = 'neutral';
  
  if (rsi >= 80) {
    status = '严重超买';
    interpretation = 'RSI严重超买，短期回调风险极高';
    sentiment = 'bearish';
  } else if (rsi >= 70) {
    status = '超买';
    interpretation = 'RSI超买区域，注意获利回吐压力';
    sentiment = 'bearish';
  } else if (rsi >= 60) {
    status = '接近超买';
    interpretation = '短期上涨动能趋缓，警惕回调';
    sentiment = 'neutral';
  } else if (rsi >= 40) {
    status = '中性';
    interpretation = 'RSI处于中性区域，趋势不明朗';
    sentiment = 'neutral';
  } else if (rsi >= 30) {
    status = '接近超卖';
    interpretation = '短期下跌动能趋缓，关注反弹机会';
    sentiment = 'neutral';
  } else if (rsi >= 20) {
    status = '超卖';
    interpretation = 'RSI超卖区域，存在技术性反弹需求';
    sentiment = 'bullish';
  } else {
    status = '严重超卖';
    interpretation = 'RSI严重超卖，反弹概率较高';
    sentiment = 'bullish';
  }
  
  return {
    value: rsi.toFixed(2),
    status,
    interpretation,
    sentiment
  };
}

/**
 * 计算布林带指标
 * @param {number[]} closePrices - 收盘价数组（从旧到新）
 * @param {number} period - 周期，默认20
 * @param {number} multiplier - 标准差倍数，默认2
 * @returns {Object} 布林带指标数据
 */
function calculateBollingerBands(closePrices, period = 20, multiplier = 2) {
  if (closePrices.length < period) {
    return { upper: null, middle: null, lower: null, interpretation: '数据不足' };
  }
  
  // 取最近 period 个价格
  const recentPrices = closePrices.slice(-period);
  
  // 计算中轨（SMA）
  const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
  
  // 计算标准差
  const squaredDiffs = recentPrices.map(p => Math.pow(p - sma, 2));
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
  
  // 上轨和下轨
  const upper = sma + multiplier * stdDev;
  const lower = sma - multiplier * stdDev;
  
  // 当前价格位置
  const currentPrice = closePrices[closePrices.length - 1];
  const bandWidth = upper - lower;
  const position = (currentPrice - lower) / bandWidth; // 0-1 之间
  
  // 解读
  let status = '';
  let interpretation = '';
  let sentiment = 'neutral';
  
  if (currentPrice >= upper) {
    status = '触及上轨';
    interpretation = '价格触及布林带上轨，短期可能回调';
    sentiment = 'bearish';
  } else if (currentPrice <= lower) {
    status = '触及下轨';
    interpretation = '价格触及布林带下轨，可能存在反弹';
    sentiment = 'bullish';
  } else if (position > 0.8) {
    status = '接近上轨';
    interpretation = '价格接近布林带上轨，注意压力位';
    sentiment = 'neutral';
  } else if (position < 0.2) {
    status = '接近下轨';
    interpretation = '价格接近布林带下轨，关注支撑位';
    sentiment = 'neutral';
  } else {
    status = '中轨附近';
    interpretation = '价格在布林带中轨附近，观察方向选择';
    sentiment = 'neutral';
  }
  
  // 带宽判断
  const bandWidthPercent = (bandWidth / sma) * 100;
  if (bandWidthPercent < 5) {
    interpretation += '，带宽收窄，可能即将变盘';
  } else if (bandWidthPercent > 15) {
    interpretation += '，带宽扩张，波动加剧';
  }
  
  return {
    upper: upper.toFixed(2),
    middle: sma.toFixed(2),
    lower: lower.toFixed(2),
    currentPosition: (position * 100).toFixed(1) + '%',
    status,
    interpretation,
    sentiment
  };
}

/**
 * 分析成交量
 * @param {number[]} volumes - 成交量数组（从旧到新）
 * @param {number[]} closePrices - 收盘价数组
 * @returns {Object} 成交量分析数据
 */
function analyzeVolume(volumes, closePrices) {
  if (volumes.length < 10) {
    return { interpretation: '数据不足' };
  }
  
  // 计算近5日平均成交量和近20日平均成交量
  const vol5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const vol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length);
  
  const latestVol = volumes[volumes.length - 1];
  const prevVol = volumes[volumes.length - 2];
  const latestPrice = closePrices[closePrices.length - 1];
  const prevPrice = closePrices[closePrices.length - 2];
  
  const volChange = ((latestVol - prevVol) / prevVol) * 100;
  const priceChange = latestPrice - prevPrice;
  
  let status = '';
  let interpretation = '';
  let sentiment = 'neutral';
  
  // 量价配合分析
  if (latestVol > vol5 * 1.5 && priceChange > 0) {
    status = '放量上涨';
    interpretation = '成交量显著放大且价格上涨，买盘强势';
    sentiment = 'bullish';
  } else if (latestVol > vol5 * 1.5 && priceChange < 0) {
    status = '放量下跌';
    interpretation = '成交量显著放大且价格下跌，卖压沉重';
    sentiment = 'bearish';
  } else if (latestVol < vol5 * 0.7 && priceChange > 0) {
    status = '缩量上涨';
    interpretation = '成交量萎缩但价格上涨，上涨持续性存疑';
    sentiment = 'neutral';
  } else if (latestVol < vol5 * 0.7 && priceChange < 0) {
    status = '缩量下跌';
    interpretation = '成交量萎缩且价格下跌，抛压减轻';
    sentiment = 'neutral';
  } else if (latestVol > vol20 * 1.2) {
    status = '成交活跃';
    interpretation = '成交量高于20日均量，市场关注度提升';
    sentiment = 'neutral';
  } else if (latestVol < vol20 * 0.8) {
    status = '成交清淡';
    interpretation = '成交量低于20日均量，观望情绪浓厚';
    sentiment = 'neutral';
  } else {
    status = '成交平稳';
    interpretation = '成交量处于正常水平';
    sentiment = 'neutral';
  }
  
  return {
    latest: (latestVol / 10000).toFixed(2) + '万',
    avg5: (vol5 / 10000).toFixed(2) + '万',
    avg20: (vol20 / 10000).toFixed(2) + '万',
    changePercent: volChange.toFixed(2) + '%',
    status,
    interpretation,
    sentiment
  };
}

/**
 * 计算趋势强度
 * @param {Object[]} stockData - 股票数据数组（从旧到新）
 * @returns {Object} 趋势强度分析
 */
function analyzeTrendStrength(stockData) {
  if (stockData.length < 14) {
    return { interpretation: '数据不足' };
  }
  
  // 取近两周数据（10个交易日）
  const recentData = stockData.slice(-10);
  const closePrices = recentData.map(d => d.close);
  
  // 计算涨跌天数
  let upDays = 0;
  let downDays = 0;
  let totalChange = 0;
  
  for (let i = 1; i < closePrices.length; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    totalChange += change;
    if (change > 0) upDays++;
    else if (change < 0) downDays++;
  }
  
  // 计算整体涨跌幅
  const startPrice = closePrices[0];
  const endPrice = closePrices[closePrices.length - 1];
  const periodChange = ((endPrice - startPrice) / startPrice) * 100;
  
  // 计算均线趋势 (5日 vs 10日)
  const ma5 = closePrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const ma10 = closePrices.reduce((a, b) => a + b, 0) / closePrices.length;
  
  let status = '';
  let interpretation = '';
  let sentiment = 'neutral';
  let strength = 0; // -100 到 100
  
  // 综合评分
  strength += (upDays - downDays) * 10; // 涨跌天数
  strength += periodChange * 5; // 区间涨跌幅
  strength += (ma5 > ma10 ? 20 : -20); // 均线关系
  
  // 限制在 -100 到 100
  strength = Math.max(-100, Math.min(100, strength));
  
  if (strength >= 60) {
    status = '强势上涨';
    interpretation = `近两周涨幅${periodChange.toFixed(2)}%，上涨${upDays}天，短期趋势强劲`;
    sentiment = 'bullish';
  } else if (strength >= 20) {
    status = '温和上涨';
    interpretation = `近两周涨幅${periodChange.toFixed(2)}%，整体偏多但动能一般`;
    sentiment = 'bullish';
  } else if (strength >= -20) {
    status = '横盘震荡';
    interpretation = `近两周变化${periodChange.toFixed(2)}%，多空拉锯，方向不明`;
    sentiment = 'neutral';
  } else if (strength >= -60) {
    status = '温和下跌';
    interpretation = `近两周跌幅${periodChange.toFixed(2)}%，整体偏空但跌势趋缓`;
    sentiment = 'bearish';
  } else {
    status = '弱势下跌';
    interpretation = `近两周跌幅${periodChange.toFixed(2)}%，下跌${downDays}天，短期趋势疲弱`;
    sentiment = 'bearish';
  }
  
  return {
    strength: strength.toFixed(0),
    periodChange: periodChange.toFixed(2) + '%',
    upDays,
    downDays,
    status,
    interpretation,
    sentiment
  };
}

/**
 * 从数据库获取股票数据并计算所有技术指标
 * @param {string} symbol - 股票代码
 * @returns {Object} 股票数据和技术指标
 */
async function getStockDataWithIndicators(symbol) {
  // 清理股票代码（去除空格和非数字字符，只保留数字部分）
  const cleanSymbol = symbol.replace(/[^0-9]/g, '').trim();
  
  console.log(`   🔢 原始输入: "${symbol}" → 清理后: "${cleanSymbol}"`);
  
  if (!cleanSymbol) {
    console.log(`   ⚠️ 清理后股票代码为空，跳过数据库查询`);
    return null;
  }
  
  // 验证股票代码格式（A股代码为6位数字）
  if (cleanSymbol.length !== 6) {
    console.log(`   ⚠️ 股票代码长度不正确: ${cleanSymbol.length}位，期望6位`);
    return null;
  }
  
  let connection;
  try {
    // 从连接池获取连接
    connection = await pool.getConnection();

    const sql = 'SELECT symbol, name, industry, date, open, high, low, close, pre_close, change_amount, change_percent, volume FROM stock_daily WHERE symbol = ? ORDER BY date DESC LIMIT 60';
    const startedAt = Date.now();

    const [rows] = await connection.execute(sql, [cleanSymbol]);
    const elapsedMs = Date.now() - startedAt;
    console.log(`   ⏱️ 日线数据查询耗时: ${elapsedMs}ms`);
    
    if (!rows || rows.length === 0) {
      console.log(`   ❌ 未找到股票 ${cleanSymbol} 的数据`);
      return null;
    }
    
    // 数据是倒序的（最新在前），需要反转为从旧到新
    const stockData = rows.reverse();
    
    // 提取价格和成交量数组
    const closePrices = stockData.map(d => d.close);
    const volumes = stockData.map(d => d.volume);
    
    // 计算技术指标
    const macd = calculateMACD(closePrices);
    const rsi = calculateRSI(closePrices);
    const bollingerBands = calculateBollingerBands(closePrices);
    const volumeAnalysis = analyzeVolume(volumes, closePrices);
    const trendStrength = analyzeTrendStrength(stockData);
    
    // 最新数据
    const latestData = stockData[stockData.length - 1];
    
    return {
      stockInfo: {
        symbol: latestData.symbol,
        name: latestData.name,
        industry: latestData.industry,
        latestDate: latestData.date,
        latestPrice: latestData.close,
        open: latestData.open,
        high: latestData.high,
        low: latestData.low,
        preClose: latestData.pre_close,
        changeAmount: latestData.change_amount,
        changePercent: latestData.change_percent
      },
      indicators: {
        macd,
        rsi,
        bollingerBands,
        volume: volumeAnalysis,
        trendStrength
      },
      rawData: stockData
    };
  } catch (error) {
    console.error('   ❌ 查询股票数据失败:', {
      code: error?.code,
      errno: error?.errno,
      sqlState: error?.sqlState,
      message: error?.message
    });
    return null;
  } finally {
    // 确保释放连接回连接池
    if (connection) {
      connection.release();
    }
  }
}

/**
 * 从数据库获取资金流向监控数据（a_stock_money_flow 最新交易日）
 * 单位处理：DB 为“万元”，返回给前端与模型时换算为“亿元”（/10000）
 */
async function getMoneyFlowMonitor(symbol) {
  const cleanSymbol = symbol.replace(/[^0-9]/g, '').trim();
  if (!cleanSymbol || cleanSymbol.length !== 6) return null;

  let connection;
  try {
    connection = await pool.getConnection();

    const [rows] = await connection.execute(
      'SELECT trade_date, net_inflow_3d, net_inflow_5d, net_inflow_20d, retail_sentiment_ratio FROM a_stock_money_flow WHERE symbol = ? ORDER BY trade_date DESC LIMIT 1',
      [cleanSymbol]
    );

    if (!rows || rows.length === 0) return null;

    const r = rows[0];
    const toYi = (v) => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      if (Number.isNaN(n)) return null;
      return n / 10000;
    };

    return {
      tradeDate: r.trade_date,
      netInflow3d: toYi(r.net_inflow_3d),
      netInflow5d: toYi(r.net_inflow_5d),
      netInflow20d: toYi(r.net_inflow_20d),
      retailSentimentRatio: r.retail_sentiment_ratio === null || r.retail_sentiment_ratio === undefined
        ? null
        : Number(r.retail_sentiment_ratio)
    };
  } catch (error) {
    console.error('   ❌ 查询资金流向失败:', error.message);
    return null;
  } finally {
    if (connection) connection.release();
  }
}

function buildDemoNewsAnalysis(stockName) {
  const name = stockName || '该股';
  return {
    sentimentScore: 72,
    news: [
      { title: `${name} 近期获得机构关注，资金博弈热度升温`, sentiment: 'positive' },
      { title: `行业政策预期分化，短期波动可能加大`, sentiment: 'neutral' },
      { title: `市场风险偏好回落，注意情绪回撤`, sentiment: 'negative' }
    ],
    summary: '当前舆情热度偏高，利好与中性信息交织，短线可能放大波动。建议关注关键价位附近的量能变化，避免追涨杀跌。'
  };
}

/**
 * 构建包含真实数据的增强 Prompt
 */
function buildEnhancedPrompt(stockDataWithIndicators, moneyFlowMonitor, strategyMode, userQuery) {
  const { stockInfo, indicators } = stockDataWithIndicators;
  
  return `
## 股票基本信息（来自数据库真实数据）
- 股票代码: ${stockInfo.symbol}
- 股票名称: ${stockInfo.name}
- 所属行业: ${stockInfo.industry || '未知'}
- 数据日期: ${stockInfo.latestDate}
- 最新收盘价: ${stockInfo.latestPrice} 元
- 今开: ${stockInfo.open} | 最高: ${stockInfo.high} | 最低: ${stockInfo.low}
- 昨收: ${stockInfo.preClose} | 涨跌额: ${stockInfo.changeAmount} | 涨跌幅: ${stockInfo.changePercent}%

## 技术指标（基于近60个交易日真实数据计算）

### MACD 指标
- DIF: ${indicators.macd.dif}
- DEA: ${indicators.macd.dea}
- MACD柱: ${indicators.macd.histogram}
- 状态: ${indicators.macd.status}
- 解读: ${indicators.macd.interpretation}

### RSI 指标 (14日)
- RSI值: ${indicators.rsi.value}
- 状态: ${indicators.rsi.status}
- 解读: ${indicators.rsi.interpretation}

### 布林带指标 (20日)
- 上轨: ${indicators.bollingerBands.upper}
- 中轨: ${indicators.bollingerBands.middle}
- 下轨: ${indicators.bollingerBands.lower}
- 当前位置: ${indicators.bollingerBands.currentPosition}
- 状态: ${indicators.bollingerBands.status}
- 解读: ${indicators.bollingerBands.interpretation}

### 成交量分析
- 最新成交量: ${indicators.volume.latest}
- 5日均量: ${indicators.volume.avg5}
- 20日均量: ${indicators.volume.avg20}
- 状态: ${indicators.volume.status}
- 解读: ${indicators.volume.interpretation}

### 趋势强度（近两周）
- 趋势强度: ${indicators.trendStrength.strength}
- 区间涨跌: ${indicators.trendStrength.periodChange}
- 上涨天数: ${indicators.trendStrength.upDays} | 下跌天数: ${indicators.trendStrength.downDays}
- 状态: ${indicators.trendStrength.status}
- 解读: ${indicators.trendStrength.interpretation}

## 资金与情绪监控（来自数据库真实数据：a_stock_money_flow）
- 数据日期: ${moneyFlowMonitor?.tradeDate || '未知'}
- 3日净流入(亿元): ${moneyFlowMonitor?.netInflow3d ?? 'N/A'}
- 5日净流入(亿元): ${moneyFlowMonitor?.netInflow5d ?? 'N/A'}
- 20日净流入(亿元): ${moneyFlowMonitor?.netInflow20d ?? 'N/A'}
- 散户情绪(%): ${moneyFlowMonitor?.retailSentimentRatio ?? 'N/A'}

## 分析要求
请使用「${strategyMode}」策略，基于以上真实数据进行深度分析。
用户补充: ${userQuery}
`;
}

/**
 * 确保 uploads 目录存在
 */
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * 配置 multer 存储
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'kline-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('只支持 JPG, PNG, GIF, WEBP 图片格式'));
  }
});

// 提供静态文件访问（用于访问上传的图片）
app.use('/uploads', express.static(uploadsDir));

const apiKey = process.env.Tongyiqianwen_API_KEY;
if (!apiKey) {
  console.error('❌ Tongyiqianwen_API_KEY is missing from .env.local');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const SYSTEM_INSTRUCTION = `
你是 "Lime AI"，一位专注于 A 股、港股和美股市场的资深金融分析师。
分析用户的请求（股票代码或 K 线图）并返回严格的 JSON 对象。

**输出 JSON 格式要求（必须严格遵守）：**
{
  "stockName": "股票名称",
  "stockCode": "股票代码",
  "timestamp": "YYYY/MM/DD HH:mm:ss 格式的当前时间",
  "strategyMode": "策略模式名称",
  "recommendation": "Buy" | "Wait" | "Sell",
  "confidenceScore": 0-100的数字,
  "analysisSummary": "详细的分析摘要（至少200字）",
  "fundsFlow": {
    "inflow": "机构资金流向描述",
    "retailSentiment": "散户情绪描述"
  },
  "marketSentiment": "市场情绪标签",
  "keyDrivers": ["驱动因素1", "驱动因素2", "驱动因素3"],
  "technicalIndicators": [
    {
      "name": "RSI",
      "value": "定性描述如'超买'",
      "status": "状态短语",
      "signal": "一句话解读",
      "sentiment": "bullish" | "bearish" | "neutral"
    }
  ],
  "technicalAnalysisAdvice": {
    "points": ["建议点1", "建议点2", "建议点3"],
    "summary": "一句话总结（可用**粗体**标记关键信号）"
  },
  "strategy": {
    "action": "操作建议短语",
    "entryRange": "入场价格区间",
    "targetPrice": "目标价位",
    "stopLoss": "止损价位",
    "logic": {
      "points": ["逻辑点1", "逻辑点2", "逻辑点3"],
      "riskWarning": "风险提示一句话"
    }
  },
  "newsAnalysis": {
    "sentimentScore": 0-100的数字,
    "news": [
      { "title": "新闻标题", "sentiment": "positive" | "negative" | "neutral" }
    ],
    "summary": "舆情总结一句话"
  }
}

**分析准则：**
1. **recommendation**: 只能是 "Buy"（买入）、"Sell"（卖出）或 "Wait"（观望）
2. **analysisSummary**: 必须详细，涵盖宏观因素、行业趋势、技术面和基本面
3. **fundsFlow**: 根据量价关系推断机构与散户行为
4. **strategy**: 根据支撑/阻力位提供具体价格目标
5. **technicalIndicators**: 返回定性描述（如"超买"、"金叉"），不要返回原始数字
6. **语言**: 所有内容必须使用**简体中文**
7. **timestamp**: 返回当前实时时间戳

**重要**: 只返回 JSON，不要有任何其他文字说明。
`;

app.post('/api/analyze', requireAuth, async (req, res) => {
  let reservation = null;
  try {
    const { prompt, imageBase64, strategyMode } = req.body;

    const requestStartedAt = new Date();
    const reportId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    const extractStockCode = (input) => {
      if (!input || typeof input !== 'string') return null;
      const code = input.replace(/[^0-9]/g, '').trim();
      if (!code || code.length !== 6) return null;
      // A 股常见：60/68(沪), 00/30(深), 83/87/88/43/47(北交所部分)
      if (/^(60|68|00|30|83|87|88|43|47)\d{4}$/.test(code)) return code;
      return null;
    };

    console.log('📊 收到股票分析请求:');
    console.log(`   📝 查询: ${prompt}`);
    console.log(`   📈 策略: ${strategyMode}`);
    console.log(`   🖼️ 包含图片: ${imageBase64 ? '是' : '否'}`);

    const model = imageBase64 ? 'qwen-vl-plus' : 'qwen-plus';
    console.log(`   🤖 使用模型: ${model}`);

    const userContent = [];
    let stockDataWithIndicators = null;
    let moneyFlowMonitor = null;
    let enhancedPrompt = '';

    // 如果不是图片分析，先校验股票代码，非法输入不调用大模型
    if (!imageBase64) {
      const stockCode = extractStockCode(prompt);
      if (!stockCode) {
        console.log('   ⚠️ 输入不包含合法股票代码，已拒绝调用大模型');
        return res.status(400).json({
          error: '请输入正确的股票代码（6位数字，如 600519 / 000001 / 300750）',
          code: 'INVALID_STOCK_CODE'
        });
      }

      console.log('   🔍 正在查询数据库获取真实股票数据...');
      stockDataWithIndicators = await getStockDataWithIndicators(prompt);
      moneyFlowMonitor = await getMoneyFlowMonitor(prompt);

      if (moneyFlowMonitor) {
        console.log('   💸 资金与情绪监控(最新):');
        console.log(`      📅 trade_date: ${moneyFlowMonitor.tradeDate}`);
        console.log(`      💰 3D净流入(亿元): ${moneyFlowMonitor.netInflow3d}`);
        console.log(`      💰 5D净流入(亿元): ${moneyFlowMonitor.netInflow5d}`);
        console.log(`      💰 20D净流入(亿元): ${moneyFlowMonitor.netInflow20d}`);
        console.log(`      🙂 retail_sentiment_ratio(%): ${moneyFlowMonitor.retailSentimentRatio}`);
      } else {
        console.log('   💸 未查询到资金与情绪监控数据(a_stock_money_flow)');
      }
      
      if (stockDataWithIndicators) {
        console.log(`   ✅ 成功获取 ${stockDataWithIndicators.stockInfo.name}(${stockDataWithIndicators.stockInfo.symbol}) 的数据`);
        console.log(`   📅 数据日期: ${stockDataWithIndicators.stockInfo.latestDate}`);
        console.log(`   💰 最新价格: ${stockDataWithIndicators.stockInfo.latestPrice}`);
        
        // 构建包含真实数据的增强 Prompt
        enhancedPrompt = buildEnhancedPrompt(stockDataWithIndicators, moneyFlowMonitor, strategyMode, prompt);
        userContent.push({ type: 'text', text: enhancedPrompt });
      } else {
        console.log('   ⚠️ 未找到股票日线数据，使用降级分析模式');

        if (moneyFlowMonitor) {
          userContent.push({
            type: 'text',
            text: `使用「${strategyMode}」策略分析以下股票: ${prompt}\n\n可用数据补充（来自数据库真实数据：a_stock_money_flow）：\n- 数据日期: ${moneyFlowMonitor.tradeDate}\n- 3日净流入(亿元): ${moneyFlowMonitor.netInflow3d ?? 'N/A'}\n- 5日净流入(亿元): ${moneyFlowMonitor.netInflow5d ?? 'N/A'}\n- 20日净流入(亿元): ${moneyFlowMonitor.netInflow20d ?? 'N/A'}\n- 散户情绪(%): ${moneyFlowMonitor.retailSentimentRatio ?? 'N/A'}\n\n请基于以上真实资金数据与市场常识给出分析，并严格按 JSON 输出。`
          });
        } else {
          userContent.push({ type: 'text', text: `使用「${strategyMode}」策略分析以下股票: ${prompt}` });
        }
      }
    } else {
      const base64Data = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      userContent.push({ type: 'image_url', image_url: { url: base64Data } });
      userContent.push({ type: 'text', text: `使用「${strategyMode}」策略分析这张 K 线图。${prompt}` });
    }

    const authUser = await tryGetAuthUser(req);
    if (!authUser?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }

    const tier = await getTierForUser(authUser);
    const subscription = tier === 'pro' ? await getActiveSubscriptionForUser(authUser.user_id) : null;
    const reportType = imageBase64 ? 'kline' : 'text';
    reservation = await reserveQuotaForAttempt({
      userId: authUser.user_id,
      tier,
      subscription,
      reportType
    });
    if (!reservation.ok) {
      return res.status(reservation.status).json(reservation.payload);
    }

    console.log('   ⏳ 正在调用 AI 分析...');
    const startTime = Date.now();

    let response;
    try {
      response = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: userContent },
        ],
        temperature: 0.4,
      });
    } catch (e) {
      await finalizeQuotaAttempt({
        attemptId: reservation.attemptId,
        quotaPeriodId: reservation.quotaPeriodId,
        success: false,
        reserved: reservation.reserved
      });
      throw e;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   ⏱️ AI 响应耗时: ${duration}s`);

    const content = response.choices[0]?.message?.content;

    if (content) {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      let parsedData;
      try {
        parsedData = JSON.parse(jsonStr.trim());
      } catch (e) {
        await finalizeQuotaAttempt({
          attemptId: reservation.attemptId,
          quotaPeriodId: reservation.quotaPeriodId,
          success: false,
          reserved: reservation.reserved
        });
        return res.status(500).json({ error: 'AI 返回格式不正确', code: 'INVALID_AI_RESPONSE' });
      }
      if (!parsedData.strategyMode) {
        parsedData.strategyMode = strategyMode;
      }

      // 如果有真实数据，将技术指标附加到返回结果中
      if (stockDataWithIndicators) {
        parsedData.realData = {
          stockInfo: stockDataWithIndicators.stockInfo,
          indicators: stockDataWithIndicators.indicators
        };
        // 确保使用数据库中的股票名称和代码
        parsedData.stockName = stockDataWithIndicators.stockInfo.name;
        parsedData.stockCode = stockDataWithIndicators.stockInfo.symbol;
      }

      if (moneyFlowMonitor) {
        parsedData.moneyFlowMonitor = moneyFlowMonitor;
      }

      if (!parsedData.newsAnalysis) {
        parsedData.newsAnalysis = buildDemoNewsAnalysis(parsedData.stockName);
      }

      const requestEndedAt = new Date();
      const reportStockCode = parsedData.stockCode || extractStockCode(prompt) || null;
      const market = inferMarketFromSymbol(reportStockCode);
      await persistAnalysisReportToDb({
        reportId,
        startedAt: requestStartedAt.toISOString(),
        endedAt: requestEndedAt.toISOString(),
        stockCode: reportStockCode,
        market,
        user: authUser,
        content: parsedData,
        reportType,
        strategyMode
      });

      await finalizeQuotaAttempt({
        attemptId: reservation.attemptId,
        quotaPeriodId: reservation.quotaPeriodId,
        success: true,
        reserved: reservation.reserved
      });

      parsedData.id = reportId;

      console.log(`   ✅ 分析完成: ${parsedData.stockName} - ${parsedData.recommendation}`);
      return res.json(parsedData);
    }

    console.log('   ❌ AI 未返回内容');
    await finalizeQuotaAttempt({
      attemptId: reservation?.attemptId,
      quotaPeriodId: reservation?.quotaPeriodId,
      success: false,
      reserved: reservation?.reserved
    });
    res.status(500).json({ error: 'No response from AI' });
  } catch (error) {
    console.error('❌ API Error:', error);
    try {
      await finalizeQuotaAttempt({
        attemptId: reservation?.attemptId,
        quotaPeriodId: reservation?.quotaPeriodId,
        success: false,
        reserved: reservation?.reserved
      });
    } catch {}
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// ==================== 股票数据 API ====================

// 获取股票技术指标数据
app.get('/api/stock-indicators/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`📈 查询股票指标: ${symbol}`);
    
    const data = await getStockDataWithIndicators(symbol);
    
    if (!data) {
      return res.status(404).json({ error: '未找到该股票数据' });
    }
    
    res.json({
      stockInfo: data.stockInfo,
      indicators: data.indicators
    });
  } catch (error) {
    console.error('❌ 查询股票指标失败:', error);
    res.status(500).json({ error: '查询失败' });
  }
});

// 获取股票原始数据
app.get('/api/stock-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const cleanSymbol = symbol.replace(/[^0-9]/g, '').trim();

    const [rows] = await pool.execute(
      'SELECT symbol, name, industry, date, open, high, low, close, pre_close, change_amount, change_percent, volume FROM stock_daily WHERE symbol = ? ORDER BY date DESC LIMIT 60',
      [cleanSymbol]
    );
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: '未找到该股票数据' });
    }
    
    res.json(rows);
  } catch (error) {
    console.error('❌ 查询股票数据失败:', error);
    res.status(500).json({ error: '查询失败' });
  }
});

// K 线图片分析专用提示词
const KLINE_ANALYSIS_INSTRUCTION = `
你是 "Lime AI"，一位专注于技术分析的资深金融分析师。用户将上传 K 线图，请仔细分析图中的技术形态。

**分析要点：**
1. 识别 K 线形态（如：十字星、锤子线、吞没形态、启明星等）
2. 识别趋势（上升趋势、下降趋势、横盘整理）
3. 识别支撑位和阻力位
4. 识别技术指标信号（如有 MACD、RSI、均线等）
5. 识别成交量变化特征

**输出 JSON 格式要求（必须严格遵守）：**
{
  "stockName": "从图中识别的股票名称，如无法识别则填'K线分析'",
  "stockCode": "从图中识别的股票代码，如无法识别则填'N/A'",
  "timestamp": "YYYY/MM/DD HH:mm:ss 格式的当前时间",
  "strategyMode": "K线识图策略",
  "recommendation": "Buy" | "Wait" | "Sell",
  "confidenceScore": 0-100的数字,
  "analysisSummary": "详细的K线形态分析（至少200字），描述识别到的形态和含义",
  "fundsFlow": {
    "inflow": "根据成交量分析资金流向",
    "retailSentiment": "根据K线形态推测市场情绪"
  },
  "marketSentiment": "市场情绪标签（如：谨慎乐观、短期看涨等）",
  "keyDrivers": ["识别到的形态1", "识别到的形态2", "识别到的形态3"],
  "technicalIndicators": [
    {
      "name": "K线形态",
      "value": "识别到的具体形态名称",
      "status": "形态强度",
      "signal": "形态含义解读",
      "sentiment": "bullish" | "bearish" | "neutral"
    },
    {
      "name": "趋势分析",
      "value": "上升/下降/横盘",
      "status": "趋势强度",
      "signal": "趋势含义",
      "sentiment": "bullish" | "bearish" | "neutral"
    },
    {
      "name": "支撑阻力",
      "value": "关键价位",
      "status": "有效性",
      "signal": "操作建议",
      "sentiment": "bullish" | "bearish" | "neutral"
    },
    {
      "name": "成交量",
      "value": "量能特征",
      "status": "放量/缩量",
      "signal": "量价配合分析",
      "sentiment": "bullish" | "bearish" | "neutral"
    },
    {
      "name": "均线系统",
      "value": "均线排列情况",
      "status": "多头/空头排列",
      "signal": "均线支撑或压力",
      "sentiment": "bullish" | "bearish" | "neutral"
    }
  ],
  "technicalAnalysisAdvice": "基于K线形态的技术分析建议（至少150字），用**粗体**标记关键信号",
  "strategy": {
    "action": "操作建议短语",
    "entryRange": "建议入场价格区间（如能识别）",
    "targetPrice": "目标价位（如能识别）",
    "stopLoss": "止损价位（如能识别）",
    "logic": "详细策略逻辑（至少300字），基于识别到的K线形态给出操作建议，用**粗体**标记关键点"
  }
}

**重要**: 
1. 只返回 JSON，不要有任何其他文字说明
2. 如果无法识别具体价格，可以用"当前价格上方X%"这样的相对描述
3. 所有内容必须使用**简体中文**
`;

// K 线图片上传并分析接口
app.post('/api/analyze-kline', requireAuth, upload.single('image'), async (req, res) => {
  let reservation = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传 K 线图片' });
    }

    const requestStartedAt = new Date();
    const reportId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    const { strategyMode = 'K线识图策略', prompt = '' } = req.body;
    const extractStockCode = (input) => {
      if (!input || typeof input !== 'string') return null;
      const code = input.replace(/[^0-9]/g, '').trim();
      if (!code || code.length !== 6) return null;
      if (/^(60|68|00|30|83|87|88|43|47)\d{4}$/.test(code)) return code;
      return null;
    };
    
    // 读取图片并转为 base64
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;
    const base64Data = `data:${mimeType};base64,${base64Image}`;

    const authUser = await tryGetAuthUser(req);
    if (!authUser?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    const tier = await getTierForUser(authUser);
    const subscription = tier === 'pro' ? await getActiveSubscriptionForUser(authUser.user_id) : null;
    reservation = await reserveQuotaForAttempt({
      userId: authUser.user_id,
      tier,
      subscription,
      reportType: 'kline'
    });
    if (!reservation.ok) {
      return res.status(reservation.status).json(reservation.payload);
    }

    console.log(`📸 收到 K 线图片: ${req.file.filename}`);
    console.log(`📊 开始使用 qwen3-vl-plus 模型分析...`);

    // 使用 qwen3-vl-plus 视觉模型分析
    let response;
    try {
      response = await client.chat.completions.create({
        model: 'qwen-vl-max',  // 使用最强的视觉模型
        messages: [
          { role: 'system', content: KLINE_ANALYSIS_INSTRUCTION },
          { 
            role: 'user', 
            content: [
              { type: 'image_url', image_url: { url: base64Data } },
              { type: 'text', text: `请仔细分析这张 K 线图，识别其中的技术形态和信号。${prompt ? '用户补充说明: ' + prompt : ''}` }
            ]
          },
        ],
        temperature: 0.3,
      });
    } catch (e) {
      await finalizeQuotaAttempt({
        attemptId: reservation.attemptId,
        quotaPeriodId: reservation.quotaPeriodId,
        success: false,
        reserved: reservation.reserved
      });
      throw e;
    }

    const content = response.choices[0]?.message?.content;
    console.log('🤖 AI 返回内容:', content?.substring(0, 200) + '...');

    if (content) {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      let parsedData;
      try {
        parsedData = JSON.parse(jsonStr.trim());
      } catch (e) {
        await finalizeQuotaAttempt({
          attemptId: reservation.attemptId,
          quotaPeriodId: reservation.quotaPeriodId,
          success: false,
          reserved: reservation.reserved
        });
        return res.status(500).json({ error: 'AI 返回格式不正确', code: 'INVALID_AI_RESPONSE' });
      }
      parsedData.strategyMode = strategyMode;
      parsedData.imageUrl = `/uploads/${req.file.filename}`; // 返回图片路径

      // 严格校验：K线识图必须识别出合法股票代码，否则不继续（不查库、不返回 N/A）
      const stockCodeFromImage = extractStockCode(parsedData.stockCode);
      if (!stockCodeFromImage) {
        console.log('   ⚠️ K线识图未识别出合法股票代码，已拒绝进入真实数据增强与合并');
        parsedData.warning = {
          code: 'UNRECOGNIZED_STOCK_CODE',
          message: '未能从K线图中识别出合法A股股票代码，因此未合并数据库真实数据（技术指标/资金情绪）。以下为纯识图分析结果。'
        };

        if (!parsedData.newsAnalysis) {
          parsedData.newsAnalysis = buildDemoNewsAnalysis(parsedData.stockName);
        }

        const requestEndedAt = new Date();
        await persistAnalysisReportToDb({
          reportId,
          startedAt: requestStartedAt.toISOString(),
          endedAt: requestEndedAt.toISOString(),
          stockCode: extractStockCode(parsedData.stockCode) || null,
          market: inferMarketFromSymbol(parsedData.stockCode),
          user: authUser,
          content: parsedData,
          reportType: 'kline',
          strategyMode
        });

        await finalizeQuotaAttempt({
          attemptId: reservation.attemptId,
          quotaPeriodId: reservation.quotaPeriodId,
          success: true,
          reserved: reservation.reserved
        });

        parsedData.id = reportId;

        console.log(`✅ K 线分析完成(未合并真实数据): ${parsedData.recommendation}`);
        return res.json(parsedData);
      }

      console.log(`   🔍 已识别股票代码: ${stockCodeFromImage}，开始查询数据库真实数据...`);
      const [stockDataWithIndicators, moneyFlowMonitor] = await Promise.all([
        getStockDataWithIndicators(stockCodeFromImage),
        getMoneyFlowMonitor(stockCodeFromImage)
      ]);

      if (moneyFlowMonitor) {
        console.log('   💸 资金与情绪监控(最新):');
        console.log(`      📅 trade_date: ${moneyFlowMonitor.tradeDate}`);
        console.log(`      💰 3D净流入(亿元): ${moneyFlowMonitor.netInflow3d}`);
        console.log(`      💰 5D净流入(亿元): ${moneyFlowMonitor.netInflow5d}`);
        console.log(`      💰 20D净流入(亿元): ${moneyFlowMonitor.netInflow20d}`);
        console.log(`      🙂 retail_sentiment_ratio(%): ${moneyFlowMonitor.retailSentimentRatio}`);
      } else {
        console.log('   💸 未查询到资金与情绪监控数据(a_stock_money_flow)');
      }

      if (stockDataWithIndicators) {
        parsedData.realData = {
          stockInfo: stockDataWithIndicators.stockInfo,
          indicators: stockDataWithIndicators.indicators
        };
        parsedData.stockName = stockDataWithIndicators.stockInfo.name;
        parsedData.stockCode = stockDataWithIndicators.stockInfo.symbol;
      }

      if (moneyFlowMonitor) {
        parsedData.moneyFlowMonitor = moneyFlowMonitor;
      }

      if (!parsedData.newsAnalysis) {
        parsedData.newsAnalysis = buildDemoNewsAnalysis(parsedData.stockName);
      }

      const requestEndedAt = new Date();
      await persistAnalysisReportToDb({
        reportId,
        startedAt: requestStartedAt.toISOString(),
        endedAt: requestEndedAt.toISOString(),
        stockCode: parsedData.stockCode || stockCodeFromImage,
        market: inferMarketFromSymbol(parsedData.stockCode || stockCodeFromImage),
        user: authUser,
        content: parsedData,
        reportType: 'kline',
        strategyMode
      });

      await finalizeQuotaAttempt({
        attemptId: reservation.attemptId,
        quotaPeriodId: reservation.quotaPeriodId,
        success: true,
        reserved: reservation.reserved
      });

      parsedData.id = reportId;

      console.log(`✅ K 线分析完成: ${parsedData.recommendation}`);
      return res.json(parsedData);
    }

    await finalizeQuotaAttempt({
      attemptId: reservation?.attemptId,
      quotaPeriodId: reservation?.quotaPeriodId,
      success: false,
      reserved: reservation?.reserved
    });
    res.status(500).json({ error: 'AI 未返回分析结果' });
  } catch (error) {
    console.error('K 线分析错误:', error);
    try {
      await finalizeQuotaAttempt({
        attemptId: reservation?.attemptId,
        quotaPeriodId: reservation?.quotaPeriodId,
        success: false,
        reserved: reservation?.reserved
      });
    } catch {}
    res.status(500).json({ error: 'K 线分析失败: ' + error.message });
  }
});

// 图片上传接口（仅上传不分析）
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片' });
    }
    
    res.json({
      success: true,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: '图片上传失败' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
  console.log(`✅ API Key loaded: ${apiKey.slice(0, 8)}...`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});
