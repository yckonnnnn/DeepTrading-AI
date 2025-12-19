import express from 'express';

import pool from '../db/pool.js';
import { requireAuth } from '../middlewares/auth.js';

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

router.get('/:reportId', requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
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

export default router;
