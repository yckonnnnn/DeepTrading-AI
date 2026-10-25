
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
}
