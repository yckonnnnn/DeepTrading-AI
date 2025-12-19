import express from 'express';

import pool from '../db/pool.js';
import { requireAuth } from '../middlewares/auth.js';
import { ensureNotificationsTable } from '../services/notificationsService.js';

const router = express.Router();

const getAuthUser = async (req) => {
  const userId = req.auth?.sub;
  if (!userId) return null;
  const [rows] = await pool.execute('SELECT id, user_id, username, email, channel FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
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

router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    await ensureNotificationsTable();

    const id = parseInt(req.params?.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'id 不正确', code: 'INVALID_ID' });
    }

    await pool.execute('UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, user.user_id]);
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ notification read error:', error);
    return res.status(500).json({ error: '操作失败', code: 'INTERNAL_ERROR' });
  }
});

router.post('/read-all', requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
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

export default router;
