
export type TabId = 'dashboard' | 'analysis' | 'history' | 'subscription' | 'settings' | 'announcements' | 'featured' | 'feedback' | 'contact';

export type UserTier = 'guest' | 'free' | 'pro';

export interface StockDataPoint {
  time: string;
  price: number;
  vol: number;
}

export interface WatchListItem {
  code: string;
  name: string;
  price: number;
  change: number;
  data: number[];
}

export interface TechnicalIndicator {
  name: string; // e.g., "RSI", "MACD"
  value: string; // e.g., "Overbought", "Golden Cross"
  status: string; // Short description e.g., "Overbought"
  signal: string; // Detailed interpretation
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface AnalysisStrategy {
  action: string; // e.g., "Buy on Dip"
  entryRange: string;
  targetPrice: string;
  stopLoss: string;
  logic: string;
}

// ==================== 真实股票数据类型 ====================

export interface StockInfo {
  symbol: string;
  name: string;
  industry: string | null;
  latestDate: string;
  latestPrice: number;
  open: number;
  high: number;
  low: number;
  preClose: number;
  changeAmount: number;
  changePercent: number;
}

export interface MACDIndicator {
  dif: string;
  dea: string;
  histogram: string;
  status: string;
  interpretation: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface RSIIndicator {
  value: string;
  status: string;
  interpretation: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface BollingerBandsIndicator {
  upper: string;
  middle: string;
  lower: string;
  currentPosition: string;
  status: string;
  interpretation: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface VolumeIndicator {
  latest: string;
  avg5: string;
  avg20: string;
  changePercent: string;
  status: string;
  interpretation: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface TrendStrengthIndicator {
  strength: string;
  periodChange: string;
  upDays: number;
  downDays: number;
  status: string;
  interpretation: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface RealStockIndicators {
  macd: MACDIndicator;
  rsi: RSIIndicator;
  bollingerBands: BollingerBandsIndicator;
  volume: VolumeIndicator;
  trendStrength: TrendStrengthIndicator;
}

export interface RealStockData {
  stockInfo: StockInfo;
  indicators: RealStockIndicators;
}

// ==================== AI 分析报告类型 ====================

export interface AIAnalysisReport {
  id: string; // Added ID for list keys
  stockName: string;
  stockCode: string;
  timestamp: string;
  strategyMode: string; // New: "趋势跟踪策略" or "短线博弈策略"
  recommendation: "Buy" | "Wait" | "Sell"; // Strict 3 tiers
  confidenceScore: number;
  analysisSummary: string; // New: Core conclusion/summary
  fundsFlow: {
      inflow: string; // e.g., "Main funds flowing in"
      retailSentiment: string; // e.g., "Retail investors cautious"
  };
  marketSentiment: string; // e.g., "Optimistic"
  keyDrivers: string[];
  technicalIndicators: TechnicalIndicator[]; // Must contain RSI, MACD, Bollinger Bands, Volume, Trend Strength
  technicalAnalysisAdvice: string; // New: Specific advice based on technicals
  strategy: AnalysisStrategy;
  realData?: RealStockData; // 新增：真实股票数据和指标
}
