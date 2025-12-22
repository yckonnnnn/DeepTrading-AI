import React, { useEffect, useState } from 'react';
import { Flame, TrendingUp, TrendingDown, Activity, Sparkles } from 'lucide-react';

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

interface HotStocksProps {
  onAnalyzeStock?: () => void;
}

const HotStocks: React.FC<HotStocksProps> = ({ onAnalyzeStock }) => {
  const [stocks, setStocks] = useState<HotStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [clickedStock, setClickedStock] = useState<string | null>(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  const handleAnalyzeClick = (stockCode: string) => {
    setClickedStock(stockCode);
    // Store stock code in sessionStorage for the analysis page to pick up
    sessionStorage.setItem('prefill_stock_code', stockCode);
    
    // Reset animation after delay and navigate
    setTimeout(() => {
      setClickedStock(null);
      if (onAnalyzeStock) {
        onAnalyzeStock();
      }
    }, 300);
  };

  useEffect(() => {
    const fetchHotStocks = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/api/dashboard/hot-stocks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStocks(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch hot stocks', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHotStocks();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm h-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm font-bold">加载热门榜单...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] p-4 sm:p-8 border border-gray-100 shadow-sm h-full flex flex-col min-h-[500px] relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-100/40 to-red-50/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg shadow-orange-500/20 text-white">
                    <Flame size={20} fill="currentColor" />
                </div>
                <h3 className="font-extrabold text-xl text-gray-900">市场热门风向标</h3>
            </div>
            <p className="text-sm text-gray-400 font-medium pl-1">
                基于全网大数据实时热度排名
            </p>
        </div>
        <div className="px-3 py-1 bg-gray-50 rounded-lg text-xs font-bold text-gray-400 border border-gray-100">
            Top 20
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative z-10">
        <div className="overflow-y-auto h-full pr-0 sm:pr-2 custom-scrollbar space-y-3">
          {/* Header Row (Desktop/Tablet) */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur-sm z-20 border-b border-gray-50">
            <div className="col-span-1">排名</div>
            <div className="col-span-4">股票名称/代码</div>
            <div className="col-span-3 text-right">最新价</div>
            <div className="col-span-2 text-right">涨跌幅</div>
            <div className="col-span-2 text-right">热度值</div>
          </div>

          {stocks.map((stock) => {
            const change = parseFloat(stock.latest_price_change);
            const isUp = change > 0;
            const isDown = change < 0;
            const rank = stock.rank;
            
            // Top 3 Styling
            let rankBadge = "bg-gray-100 text-gray-500";
            if (rank === 1) rankBadge = "bg-red-500 text-white shadow-md shadow-red-200";
            if (rank === 2) rankBadge = "bg-orange-500 text-white shadow-md shadow-orange-200";
            if (rank === 3) rankBadge = "bg-amber-400 text-white shadow-md shadow-amber-200";

            return (
              <div key={stock.stock_code}>
                {/* Mobile Card */}
                <div className="sm:hidden p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankBadge}`}>
                        {rank}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{stock.stock_name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{stock.symbol}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAnalyzeClick(stock.symbol)}
                      className={`
                        px-2.5 py-1 rounded-xl text-xs font-bold
                        bg-gradient-to-r from-orange-500 to-red-500 text-white
                        flex items-center gap-1 shadow-sm flex-shrink-0
                        ${clickedStock === stock.symbol ? 'scale-95 opacity-80' : ''}
                      `}
                    >
                      <Sparkles size={12} />
                      分析
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2">
                      <div className="text-[10px] font-bold text-gray-400">最新价</div>
                      <div className="font-bold text-gray-900 font-mono mt-0.5">¥{stock.latest_price}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <div className="text-[10px] font-bold text-gray-400">涨跌幅</div>
                      <div className={`
                        mt-0.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold w-fit
                        ${isUp ? 'bg-red-50 text-red-600' : isDown ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}
                      `}>
                        {isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : null}
                        {change > 0 ? '+' : ''}{parseFloat(stock.latest_price_change).toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-end text-xs font-bold text-orange-500 gap-1">
                    <Activity size={12} />
                    热度 {(parseInt(stock.stock_heat_value) / 10000).toFixed(1)}w
                  </div>
                </div>

                {/* Desktop/Tablet Row */}
                <div className="hidden sm:grid grid-cols-12 gap-4 items-center p-4 rounded-2xl hover:bg-gray-50 transition-all duration-200 group border border-transparent hover:border-gray-100 cursor-default">
                  <div className="col-span-1">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${rankBadge}`}>
                      {rank}
                    </div>
                  </div>

                  <div className="col-span-4 relative">
                    <div className="font-bold text-gray-900 group-hover:text-black transition-colors">{stock.stock_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 font-mono">{stock.symbol}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyzeClick(stock.symbol);
                        }}
                        className={`
                          opacity-0 group-hover:opacity-100 transition-all duration-200
                          px-2 py-0.5 rounded-md text-[10px] font-bold
                          bg-gradient-to-r from-orange-500 to-red-500 text-white
                          hover:from-orange-600 hover:to-red-600
                          flex items-center gap-1 shadow-sm
                          ${clickedStock === stock.symbol ? 'scale-90 opacity-70' : 'hover:scale-105'}
                        `}
                      >
                        <Sparkles size={10} />
                        分析
                      </button>
                    </div>
                  </div>

                  <div className="col-span-3 text-right">
                    <div className="font-bold text-gray-900 font-mono">¥{stock.latest_price}</div>
                  </div>

                  <div className="col-span-2 text-right flex justify-end">
                    <div className={`
                        px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit
                        ${isUp ? 'bg-red-50 text-red-600' : isDown ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}
                    `}>
                      {isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : null}
                      {change > 0 ? '+' : ''}{parseFloat(stock.latest_price_change).toFixed(2)}%
                    </div>
                  </div>

                  <div className="col-span-2 text-right">
                    <div className="text-xs font-bold text-orange-500 flex items-center justify-end gap-1">
                      <Activity size={12} />
                      {(parseInt(stock.stock_heat_value) / 10000).toFixed(1)}w
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {stocks.length === 0 && (
            <div className="text-center py-20 text-gray-400 text-sm">
                暂无热门数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotStocks;
