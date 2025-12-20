import express from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

/**
 * 获取热门股票榜单
 * 取最新 datatime 的前20条数据
 */
router.get('/hot-stocks', requireAuth, async (req, res) => {
  try {
    // 1. 获取最新日期
    const [dateRows] = await pool.execute(
      'SELECT MAX(datatime) as latest_date FROM hot_stock_ranking'
    );
    
    const latestDate = dateRows[0]?.latest_date;
    
    if (!latestDate) {
      return res.json({ items: [] });
    }

    // 2. 查询该日期的前20条数据，按排名排序
    // 注意：datatime 在数据库中是 date 类型，查询时可以直接匹配
    const [rows] = await pool.execute(
      `SELECT stock_code, stock_name, latest_price, latest_price_change, 
              stock_heat_ranking, \`rank\`, stock_heat_value, symbol, datatime
       FROM hot_stock_ranking 
       WHERE datatime = ? 
       ORDER BY \`rank\` ASC 
       LIMIT 20`,
      [latestDate]
    );

    return res.json({ 
      date: latestDate,
      items: rows 
    });
  } catch (error) {
    console.error('❌ 获取热门股票失败:', error);
    return res.status(500).json({ error: '获取热门股票失败', code: 'INTERNAL_ERROR' });
  }
});

export default router;
