import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const app = express();

// ==================== MySQL 数据库连接池 ====================
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
    
    const [rows] = await connection.execute(
      'SELECT * FROM stock_daily WHERE symbol = ? ORDER BY date DESC LIMIT 60',
      [cleanSymbol]
    );
    
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
    console.error(`   ❌ 查询股票数据失败:`, error.message);
    return null;
  } finally {
    // 确保释放连接回连接池
    if (connection) {
      connection.release();
    }
  }
}

/**
 * 构建包含真实数据的增强 Prompt
 */
function buildEnhancedPrompt(stockDataWithIndicators, strategyMode, userQuery) {
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

## 分析要求
请使用「${strategyMode}」策略，基于以上真实数据进行深度分析。
用户补充: ${userQuery}
`;
}
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置 multer 存储
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
  "technicalAnalysisAdvice": "技术分析建议（至少150字），用**粗体**标记关键信号",
  "strategy": {
    "action": "操作建议短语",
    "entryRange": "入场价格区间",
    "targetPrice": "目标价位",
    "stopLoss": "止损价位",
    "logic": "详细策略逻辑（至少300字），用**粗体**标记关键点"
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

app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, imageBase64, strategyMode } = req.body;

    console.log('📊 收到股票分析请求:');
    console.log(`   📝 查询: ${prompt}`);
    console.log(`   📈 策略: ${strategyMode}`);
    console.log(`   🖼️ 包含图片: ${imageBase64 ? '是' : '否'}`);

    const model = imageBase64 ? 'qwen-vl-plus' : 'qwen-plus';
    console.log(`   🤖 使用模型: ${model}`);

    const userContent = [];
    let stockDataWithIndicators = null;
    let enhancedPrompt = '';

    // 如果不是图片分析，尝试从数据库获取真实股票数据
    if (!imageBase64) {
      console.log('   🔍 正在查询数据库获取真实股票数据...');
      stockDataWithIndicators = await getStockDataWithIndicators(prompt);
      
      if (stockDataWithIndicators) {
        console.log(`   ✅ 成功获取 ${stockDataWithIndicators.stockInfo.name}(${stockDataWithIndicators.stockInfo.symbol}) 的数据`);
        console.log(`   📅 数据日期: ${stockDataWithIndicators.stockInfo.latestDate}`);
        console.log(`   💰 最新价格: ${stockDataWithIndicators.stockInfo.latestPrice}`);
        
        // 构建包含真实数据的增强 Prompt
        enhancedPrompt = buildEnhancedPrompt(stockDataWithIndicators, strategyMode, prompt);
        userContent.push({ type: 'text', text: enhancedPrompt });
      } else {
        console.log('   ⚠️ 未找到股票数据，使用普通分析模式');
        userContent.push({ type: 'text', text: `使用「${strategyMode}」策略分析以下股票: ${prompt}` });
      }
    } else {
      const base64Data = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      userContent.push({ type: 'image_url', image_url: { url: base64Data } });
      userContent.push({ type: 'text', text: `使用「${strategyMode}」策略分析这张 K 线图。${prompt}` });
    }

    console.log('   ⏳ 正在调用 AI 分析...');
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   ⏱️ AI 响应耗时: ${duration}s`);

    const content = response.choices[0]?.message?.content;

    if (content) {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsedData = JSON.parse(jsonStr.trim());
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

      console.log(`   ✅ 分析完成: ${parsedData.stockName} - ${parsedData.recommendation}`);
      return res.json(parsedData);
    }

    console.log('   ❌ AI 未返回内容');
    res.status(500).json({ error: 'No response from AI' });
  } catch (error) {
    console.error('❌ API Error:', error);
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
      'SELECT * FROM stock_daily WHERE symbol = ? ORDER BY date DESC LIMIT 60',
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
app.post('/api/analyze-kline', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传 K 线图片' });
    }

    const { strategyMode = 'K线识图策略', prompt = '' } = req.body;
    
    // 读取图片并转为 base64
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;
    const base64Data = `data:${mimeType};base64,${base64Image}`;

    console.log(`📸 收到 K 线图片: ${req.file.filename}`);
    console.log(`📊 开始使用 qwen3-vl-plus 模型分析...`);

    // 使用 qwen3-vl-plus 视觉模型分析
    const response = await client.chat.completions.create({
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

    const content = response.choices[0]?.message?.content;
    console.log('🤖 AI 返回内容:', content?.substring(0, 200) + '...');

    if (content) {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsedData = JSON.parse(jsonStr.trim());
      parsedData.strategyMode = strategyMode;
      parsedData.imageUrl = `/uploads/${req.file.filename}`; // 返回图片路径

      console.log(`✅ K 线分析完成: ${parsedData.recommendation}`);
      return res.json(parsedData);
    }

    res.status(500).json({ error: 'AI 未返回分析结果' });
  } catch (error) {
    console.error('K 线分析错误:', error);
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
