import express from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middlewares/auth.js';
import { ensureAnnouncementsSeeded, ensureAnnouncementsTable } from '../services/announcementsService.js';

const router = express.Router();

const getAuthUser = async (req) => {
  const userId = req?.auth?.sub;
  if (!userId) return null;
  const [rows] = await pool.execute('SELECT id, user_id, username, email, channel FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
};

router.get('/', requireAuth, async (req, res) => {
  try {
    await ensureAnnouncementsSeeded();

    const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, Math.floor(rawLimit))) : 50;

    const [rows] = await pool.query(
      `SELECT 
        id,
        title,
        category,
        content,
        DATE_FORMAT(created_at, '%Y-%m-%d') AS date
      FROM announcements
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}`
    );

    return res.json({ items: Array.isArray(rows) ? rows : [] });
  } catch (error) {
    console.error('❌ get announcements error:', error);
    return res.status(500).json({ error: '公告加载失败', code: 'INTERNAL_ERROR' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    await ensureAnnouncementsTable();

    const user = await getAuthUser(req);
    if (!user?.user_id) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    if (user.channel !== 1) {
      return res.status(403).json({ error: '无权限', code: 'FORBIDDEN' });
    }

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const category = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空', code: 'INVALID_INPUT' });
    }

    const normalizedCategory = category || 'update';

    const createdBy = typeof user.username === 'string' && user.username.trim() ? user.username.trim() : user.user_id;
    const [result] = await pool.execute(
      'INSERT INTO announcements (title, category, content, created_by) VALUES (?, ?, ?, ?)',
      [title, normalizedCategory, content, createdBy]
    );

    const insertedId = Number(result?.insertId || 0);
    return res.json({ ok: true, id: insertedId });
  } catch (error) {
    console.error('❌ create announcement error:', error);
    return res.status(500).json({ error: '发布失败', code: 'INTERNAL_ERROR' });
  }
});

export default router;
