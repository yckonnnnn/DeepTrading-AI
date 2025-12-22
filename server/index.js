import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pool from './db/pool.js';
import { inferMarketFromSymbol } from './utils/market.js';
import { getRequestIp } from './utils/request.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import notificationsRouter from './routes/notifications.js';
import usageRouter from './routes/usage.js';
import reportsRouter from './routes/reports.js';
import dashboardRouter from './routes/dashboard.js';
import announcementsRouter from './routes/announcements.js';
import createAnalyzeRouter from './routes/analyze.js';
import { getBearerToken, requireAuth, verifyAuthToken } from './middlewares/auth.js';
import { ensureNotificationsTable } from './services/notificationsService.js';
import {
  ensureFreeGrantAfterProExpired,
  ensureFreeRegisterGrant,
  ensureProQuotaPeriod,
  finalizeQuotaAttempt,
  getActiveSubscriptionForUser,
  getTierForUser,
  reserveQuotaForAttempt
} from './services/quotaService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/usage', usageRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/announcements', announcementsRouter);

const tryGetAuthUser = async (req) => {
  try {
    const token = getBearerToken(req);
    if (!token) return null;
    const decoded = verifyAuthToken(token);
    const userId = decoded?.sub;
    if (!userId) return null;
    const [rows] = await pool.execute('SELECT id, user_id, username, email, channel FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0];
  } catch {
    return null;
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

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev-jwt-secret';
const VERIFICATION_CODE_SECRET = process.env.VERIFICATION_CODE_SECRET || JWT_SECRET;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashVerificationCode = (code) => {
  return crypto.createHash('sha256').update(`${code}:${VERIFICATION_CODE_SECRET}`).digest('hex');
};

// ==================== Auth APIs ====================

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
 * 单位处理：DB 数值为“元”，返回给前端时换算为“亿元”（/1e8，截断保留2位小数）
 */
async function getMoneyFlowMonitor(symbol) {
  const cleanSymbol = symbol.replace(/[^0-9]/g, '').trim();
  if (!cleanSymbol || cleanSymbol.length !== 6) return null;

  let connection;
  try {
    connection = await pool.getConnection();

    const [rows] = await connection.execute(
      'SELECT stock_date, main_cap_flow_3d, main_cap_flow_5d, main_cap_flow_20d, main_buy_amount, main_sell_amount FROM a_stock_money_flow WHERE symbol = ? ORDER BY stock_date DESC LIMIT 1',
      [cleanSymbol]
    );

    if (!rows || rows.length === 0) return null;

    const r = rows[0];
    const trunc2 = (x) => {
      if (!Number.isFinite(x)) return null;
      const scaled = x * 100;
      const truncated = scaled >= 0 ? Math.floor(scaled) : Math.ceil(scaled);
      return truncated / 100;
    };

    const toYi = (v) => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return trunc2(n / 100000000);
    };

    const stableRandomInt = (min, max, seed) => {
      const s = String(seed ?? '');
      const hash = crypto.createHash('sha256').update(s).digest('hex');
      const n = parseInt(hash.slice(0, 8), 16);
      const span = max - min + 1;
      return min + (n % span);
    };

    const buyRaw = Number(r.main_buy_amount);
    const flow3Raw = Number(r.main_cap_flow_3d);
    const seedBase = `${cleanSymbol}-${r.stock_date}`;
    const fundSentimentIndex = (Number.isFinite(buyRaw) && Number.isFinite(flow3Raw))
      ? (buyRaw > flow3Raw
        ? stableRandomInt(60, 100, `${seedBase}-hi`)
        : stableRandomInt(1, 50, `${seedBase}-lo`))
      : 50;
    const fundSentimentLevel = fundSentimentIndex < 25
      ? '恐慌'
      : fundSentimentIndex < 50
        ? '中性'
        : fundSentimentIndex < 75
          ? '乐观'
          : '极度乐观';

    return {
      tradeDate: r.stock_date,
      netInflow3d: toYi(r.main_cap_flow_3d),
      netInflow5d: toYi(r.main_cap_flow_5d),
      netInflow20d: toYi(r.main_cap_flow_20d),
      mainBuyAmount: toYi(r.main_buy_amount),
      mainSellAmount: toYi(r.main_sell_amount),
      fundSentimentIndex,
      fundSentimentLevel
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
- 当日主力买入金额(亿元): ${moneyFlowMonitor?.mainBuyAmount ?? 'N/A'}
- 当日主力卖出金额(亿元): ${moneyFlowMonitor?.mainSellAmount ?? 'N/A'}

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

app.use(
  '/api',
  createAnalyzeRouter({
    pool,
    client,
    upload,
    SYSTEM_INSTRUCTION,
    KLINE_ANALYSIS_INSTRUCTION,
    tryGetAuthUser,
    getStockDataWithIndicators,
    getMoneyFlowMonitor,
    buildEnhancedPrompt,
    buildDemoNewsAnalysis,
    persistAnalysisReportToDb,
    inferMarketFromSymbol,
    getTierForUser,
    getActiveSubscriptionForUser,
    reserveQuotaForAttempt,
    finalizeQuotaAttempt
  })
);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
  console.log(`✅ API Key loaded: ${apiKey.slice(0, 8)}...`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});
