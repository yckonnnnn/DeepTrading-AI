import express from 'express';
import bcrypt from 'bcryptjs';

import pool from '../db/pool.js';
import { requireAuth } from '../middlewares/auth.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = express.Router();

router.put('/profile', requireAuth, async (req, res) => {
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

router.put('/change-password', requireAuth, async (req, res) => {
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

export default router;
