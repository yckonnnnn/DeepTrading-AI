import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import pool from '../db/pool.js';
import { getRequestIp } from '../utils/request.js';
import { isEmailServiceConfigured, sendAliyunResetPasswordEmail, sendAliyunVerifyEmail } from '../services/emailService.js';
import { requireAuth, signAuthToken } from '../middlewares/auth.js';
import {
  ensureFreeGrantAfterProExpired,
  ensureProQuotaPeriod,
  getActiveSubscriptionForUser,
  getTierForUser
} from '../services/quotaService.js';

dotenv.config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev-jwt-secret';
const VERIFICATION_CODE_SECRET = process.env.VERIFICATION_CODE_SECRET || JWT_SECRET;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashVerificationCode = (code) => {
  return crypto.createHash('sha256').update(`${code}:${VERIFICATION_CODE_SECRET}`).digest('hex');
};

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
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

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确', code: 'INVALID_EMAIL' });
    }

    if (!isEmailServiceConfigured()) {
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

router.post('/send-reset-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确', code: 'INVALID_EMAIL' });
    }

    if (!isEmailServiceConfigured()) {
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

router.post('/reset-password', async (req, res) => {
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

router.post('/register', async (req, res) => {
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
      'SELECT id, username, email FROM users WHERE email = ? OR lower(username) = lower(?) LIMIT 1',
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

router.post('/login', async (req, res) => {
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
        : 'SELECT id, user_id, username, email, password_hash, status, channel FROM users WHERE lower(username) = lower(?) LIMIT 1',
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

export default router;
