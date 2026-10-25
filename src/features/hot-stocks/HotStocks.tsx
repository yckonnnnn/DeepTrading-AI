import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Flame, RefreshCw, Sparkles } from 'lucide-react';
import { apiFetch, getAuthToken } from '../../services/api';
import { MarketPill } from '../../components/ui/Market';
import { SurfaceCard } from '../../components/ui/Surface';
import { EmptyState, SkeletonBox } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';

interface HotStock {
  stock_code: string;
  stock_name: string;
  latest_price: string;
  latest_price_change: string;
  stock_heat_ranking: string;
  rank: number;
  stock_heat_value: string;
  symbol: string;
  datatime: string;
}

const DEMO_STOCKS: HotStock[] = [
  { stock_code: '600519', stock_name: '贵州茅台', latest_price: '1452.00', latest_price_change: '2.36', stock_heat_ranking: '1', rank: 1, stock_heat_value: '864200', symbol: '600519', datatime: '' },
  { stock_code: '300750', stock_name: '宁德时代', latest_price: '268.35', latest_price_change: '-1.12', stock_heat_ranking: '2', rank: 2, stock_heat_value: '713800', symbol: '300750', datatime: '' },
  { stock_code: '601138', stock_name: '工业富联', latest_price: '24.68', latest_price_change: '4.51', stock_heat_ranking: '3', rank: 3, stock_heat_value: '668100', symbol: '601138', datatime: '' },
  { stock_code: '002594', stock_name: '比亚迪', latest_price: '243.50', latest_price_change: '0.87', stock_heat_ranking: '4', rank: 4, stock_heat_value: '602300', symbol: '002594', datatime: '' },
  { stock_code: '600036', stock_name: '招商银行', latest_price: '38.92', latest_price_change: '-0.43', stock_heat_ranking: '5', rank: 5, stock_heat_value: '551700', symbol: '600036', datatime: '' },
];

const rankBadgeStyle = (rank: number): React.CSSProperties => {
  if (rank === 1) return { background: 'var(--up)', color: '#fff' };
  if (rank === 2) return { background: '#f0862c', color: '#fff' };
  if (rank === 3) return { background: '#e8a33d', color: '#fff' };
  return { background: 'var(--flat-pale)', color: 'var(--text-2)' };
};

const formatHeat = (v: string): string => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return '--';
  return `${(n / 10000).toFixed(1)}w`;
};

interface HotStocksProps {
  onAnalyzeStock?: (symbol: string) => void;
}

/** 热门股票榜 — 无登录时展示演示数据 */
const HotStocks: React.FC<HotStocksProps> = ({ onAnalyzeStock }) => {
  const [stocks, setStocks] = useState<HotStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [nonce, setNonce] = useState(0);

  const fetchHotStocks = useCallback(async () => {
    setLoading(true);
    setError(false);
    const token = getAuthToken();
    if (!token) {
      // 游客：演示数据
      setStocks(DEMO_STOCKS);
      setIsDemo(true);
      setLoading(false);
      return;
    }
    try {
      const data: any = await apiFetch('/api/dashboard/hot-stocks');
      setStocks(Array.isArray(data?.items) ? data.items : []);
      setIsDemo(false);
    } catch {
      setError(true);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotStocks();
  }, [fetchHotStocks, nonce]);

  const handleAnalyze = (symbol: string) => {
    try {
      sessionStorage.setItem('prefill_stock_code', symbol);
    } catch {
      // ignore
    }
    onAnalyzeStock?.(symbol);
  };

  return (
    <SurfaceCard
      xl
      pad
      className="dash-bottom-hot"
      style={{ display: 'flex', flexDirection: 'column', minHeight: 420 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div>
          <div className="card__title" style={{ fontSize: 16 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'var(--up-pale)',
                color: 'var(--up)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flame size={16} />
            </span>
            市场热门风向标
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3, paddingLeft: 38 }}>
            基于全网热度排名的 A 股关注榜单
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isDemo && <span className="demo-chip">演示数据</span>}
          <button
            type="button"
            aria-label="刷新榜单"
            onClick={() => setNonce((v) => v + 1)}
            style={{ color: 'var(--text-2)', padding: 6, borderRadius: 8, display: 'flex' }}
            className="row-item-hover"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <SkeletonBox w={28} h={28} r={8} />
              <SkeletonBox w={120} h={16} />
              <div style={{ flex: 1 }} />
              <SkeletonBox w={64} h={16} />
              <SkeletonBox w={56} h={16} />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon="error" title="榜单加载失败" desc="请检查网络后重试。" action={<Button size="sm" variant="secondary" onClick={() => setNonce((v) => v + 1)}>重新加载</Button>} />
      ) : stocks.length === 0 ? (
        <EmptyState title="暂无热门数据" desc="榜单暂未生成，请稍后再来。" />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {/* 表头（桌面） */}
          <div
            className="hs-row hs-row--head no-scrollbar"
            style={{
              gap: 12,
              padding: '0 8px 10px',
              borderBottom: '1px solid var(--divider-soft)',
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--text-2)',
              letterSpacing: '0.04em',
            }}
          >
            <span>#</span>
            <span>股票</span>
            <span style={{ textAlign: 'right' }}>最新价</span>
            <span style={{ textAlign: 'right' }}>涨跌幅</span>
            <span style={{ textAlign: 'right' }}>热度</span>
            <span />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {stocks.map((stock) => {
              const change = parseFloat(stock.latest_price_change);
              const rank = Number(stock.rank);
              return (
                <div key={stock.stock_code}>
                  {/* 桌面行 */}
                  <div
                    className="hs-row"
                    style={{
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 8px',
                      borderRadius: 'var(--r-md)',
                      transition: 'background var(--t-fast) var(--ease)',
                    }}
                  >
                    <span
                      style={{
                        ...rankBadgeStyle(rank),
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {rank}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stock.stock_name}
                      </div>
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
                        {stock.symbol}
                      </div>
                    </div>
                    <div className="num" style={{ textAlign: 'right', fontWeight: 800, fontSize: 13.5 }}>
                      ¥{stock.latest_price}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <MarketPill change={change} />
                    </div>
                    <div className="num" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--amber)' }}>
                      {formatHeat(stock.stock_heat_value)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="secondary" onClick={() => handleAnalyze(stock.symbol)}>
                        <Sparkles size={13} /> 分析
                      </Button>
                    </div>
                  </div>

                  {/* 移动卡片 */}
                  <div
                    className="hs-card"
                    style={{
                      gap: 10,
                      padding: '13px 4px',
                      borderBottom: '1px solid var(--divider-soft)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span
                        style={{
                          ...rankBadgeStyle(rank),
                          width: 24,
                          height: 24,
                          borderRadius: 7,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {rank}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {stock.stock_name}
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>
                          {stock.symbol}
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => handleAnalyze(stock.symbol)}>
                        <Sparkles size={13} /> 分析
                      </Button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 34 }}>
                      <span className="num" style={{ fontWeight: 800, fontSize: 13.5 }}>¥{stock.latest_price}</span>
                      <MarketPill change={change} />
                      <span
                        className="num"
                        style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Activity size={12} />
                        {formatHeat(stock.stock_heat_value)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SurfaceCard>
  );
};

export default HotStocks;
