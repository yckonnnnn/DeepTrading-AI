import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

/**
 * 涨跌展示 — 遵循 A 股惯例（红涨绿跌），
 * 始终带符号与图标，含义不依赖颜色。
 */
export const MarketPill: React.FC<{ change: number; className?: string }> = ({ change, className }) => {
  const safe = Number.isFinite(change) ? change : 0;
  const isUp = safe > 0;
  const isDown = safe < 0;
  const cls = isUp ? 'market-pill--up' : isDown ? 'market-pill--down' : 'market-pill--flat';
  return (
    <span className={`market-pill ${cls} ${className || ''}`}>
      {isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : <Minus size={12} />}
      {isUp ? '+' : ''}
      {safe.toFixed(2)}%
    </span>
  );
};

/** 结论徽标：买入/观望/卖出（含文字，红/灰/绿） */
export const RecommendationChip: React.FC<{ rec: string; large?: boolean }> = ({ rec, large }) => {
  const map: Record<string, { label: string; cls: string }> = {
    Buy: { label: '建议买入', cls: 'chip--up' },
    Sell: { label: '建议卖出', cls: 'chip--down' },
    Wait: { label: '建议观望', cls: 'chip--amber' },
  };
  const conf = map[rec] || map.Wait;
  return (
    <span className={`chip ${conf.cls} ${large ? 'chip--lg' : ''}`}>
      {conf.label}
      <span aria-hidden="true">·</span>
      <span className="num" style={{ opacity: 0.85 }}>{rec}</span>
    </span>
  );
};
