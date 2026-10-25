import type { AIAnalysisReport } from '../../types';

/**
 * 开发专用演示报告：仅在 import.meta.env.DEV 且 URL 带
 * ?mockreport=1 时用于视觉验收，生产构建会被摇树剔除。
 */
export const MOCK_REPORT: AIAnalysisReport = {
  id: 'mock-1',
  stockName: '贵州茅台',
  stockCode: '600519',
  timestamp: '2026-09-30 10:24',
  strategyMode: '趋势跟踪策略',
  recommendation: 'Buy',
  confidenceScore: 82,
  analysisSummary:
    '当前股价站上**布林带中轨**并沿上轨运行，MACD 红柱持续放大，量能温和配合。主力资金近 5 日净流入明显，短期趋势偏强，建议回踩 1430 一线分批关注，跌破 1395 离场观望。',
  fundsFlow: {
    inflow: '主力资金连续流入',
    retailSentiment: '散户情绪偏谨慎',
  },
  marketSentiment: '偏乐观',
  keyDrivers: ['趋势结构完好', '量价配合', '主力资金回流'],
  technicalIndicators: [
    { name: 'RSI', value: '超买区间', status: '超买', signal: 'RSI(14) 达到 71，短期涨幅较大，注意高位钝化。', sentiment: 'neutral' },
    { name: 'MACD', value: '金叉向上', status: '金叉', signal: 'DIF 上穿 DEA，红柱连续三日放大，中期动能转强。', sentiment: 'bullish' },
    { name: '布林带', value: '中轨上方', status: '偏强', signal: '价格沿上轨运行，开口扩张，趋势延续概率较高。', sentiment: 'bullish' },
    { name: '成交量', value: '温和放量', status: '放量', signal: '近 5 日均量较前期提升 18%，上涨具备量能支撑。', sentiment: 'bullish' },
    { name: '趋势强度', value: '强势', status: '强', signal: '近 20 日上涨 13 天，多头结构完好。', sentiment: 'bullish' },
  ],
  technicalAnalysisAdvice: {
    points: [
      '短期关注 1480–1500 压力区的突破确认，突破需放量配合。',
      '回踩 1430–1445 区域若缩量企稳，是较理想的低吸观察位。',
      '若日线级别跌破布林带中轨，需重新评估趋势结构。',
    ],
    summary: '整体维持**多头思维**，回踩视为正常修正，破位则离场。',
  },
  strategy: {
    action: '逢低分批',
    entryRange: '1428 - 1445',
    targetPrice: '1520.00',
    stopLoss: '1395.00',
    logic: {
      points: [
        '趋势跟踪框架下，价格结构、均线排列与动能指标三者共振向上。',
        '以建仓区间下沿为观察基准，分 2–3 批布局，避免一次性追高。',
        '止盈参考前高上方 1520 一线，分批止盈锁定利润。',
      ],
      riskWarning: '若放量跌破 1395 止损线，说明趋势结构被破坏，应严格执行离场纪律，不与市场争辩。',
    },
  },
  moneyFlowMonitor: {
    tradeDate: '2026-09-30',
    netInflow3d: 12.64,
    netInflow5d: 28.31,
    netInflow20d: -6.87,
    mainBuyAmount: 18.42,
    mainSellAmount: 11.53,
    fundSentimentIndex: 68,
    fundSentimentLevel: '乐观',
  },
  newsAnalysis: {
    sentimentScore: 72,
    news: [
      { title: '公司发布三季报预告，业绩略超市场预期', sentiment: 'positive' },
      { title: '北向资金近期持续增持白酒板块', sentiment: 'positive' },
      { title: '消费板块整体估值仍处历史中位偏低区间', sentiment: 'neutral' },
    ],
    summary: '舆情面整体**偏正面**，业绩预期与资金面形成共振，注意板块轮动节奏。',
  },
  realData: {
    stockInfo: {
      symbol: '600519',
      name: '贵州茅台',
      industry: '白酒',
      latestDate: '2026-09-30',
      latestPrice: 1452.0,
      open: 1436.0,
      high: 1461.5,
      low: 1432.2,
      preClose: 1418.5,
      changeAmount: 33.5,
      changePercent: 2.36,
    },
    indicators: {
      macd: {
        dif: '12.36',
        dea: '9.87',
        histogram: '4.98',
        status: '金叉向上',
        interpretation: 'DIF 上穿 DEA，红柱持续放大，中期动能增强。',
        sentiment: 'bullish',
      },
      rsi: {
        value: '71.2',
        status: '超买区间',
        interpretation: 'RSI 高于 70，短期涨幅较大，警惕回撤。',
        sentiment: 'neutral',
      },
      bollingerBands: {
        upper: '1495',
        middle: '1428',
        lower: '1361',
        currentPosition: '上轨附近',
        status: '偏强运行',
        interpretation: '价格沿上轨运行，趋势偏强。',
        sentiment: 'bullish',
      },
      volume: {
        latest: '4.2万手',
        avg5: '3.6万手',
        avg20: '3.1万手',
        changePercent: '+17%',
        status: '温和放量',
        interpretation: '量能温和放大，配合价格上涨。',
        sentiment: 'bullish',
      },
      trendStrength: {
        strength: '强',
        periodChange: '+8.6%',
        upDays: 13,
        downDays: 7,
        status: '强势',
        interpretation: '多头结构完好，趋势延续概率较高。',
        sentiment: 'bullish',
      },
    },
  },
};
