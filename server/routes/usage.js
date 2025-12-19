import express from 'express';

import pool from '../db/pool.js';
import { requireAuth } from '../middlewares/auth.js';
import { ensureFreeGrantAfterProExpired, ensureFreeRegisterGrant } from '../services/quotaService.js';

const router = express.Router();

const getAuthUser = async (req) => {
  const userId = req.auth?.sub;
  if (!userId) return null;
  const [rows] = await pool.execute('SELECT id, user_id, username, email, channel FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
};

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
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

router.get('/trend', requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
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

export default router;
