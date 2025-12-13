
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Clock, ChevronRight, Search, Filter, Check } from 'lucide-react';
import { AIAnalysisReport } from '../types';
import AnalysisDashboard from './AnalysisDashboard';

interface HistoryProps {
  history: AIAnalysisReport[];
  targetReportId?: string | null;
}

const HistoryView: React.FC<HistoryProps> = ({ history, targetReportId }) => {
  const [selectedReport, setSelectedReport] = useState<AIAnalysisReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Buy' | 'Sell' | 'Wait'>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Effect to handle navigation from notifications
  useEffect(() => {
    if (targetReportId) {
      const report = history.find(h => h.id === targetReportId);
      if (report) {
        setSelectedReport(report);
      }
    }
  }, [targetReportId, history]);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch = 
        item.stockName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.stockCode.includes(searchTerm);
      
      const matchesFilter = filterType === 'All' || item.recommendation === filterType;
      
      return matchesSearch && matchesFilter;
    });
  }, [history, searchTerm, filterType]);

  const handleFilterSelect = (type: 'All' | 'Buy' | 'Sell' | 'Wait') => {
    setFilterType(type);
    setIsFilterOpen(false);
  };

  if (selectedReport) {
    return (
      <div className="animate-in fade-in slide-in-from-right-8 duration-300 pb-20 md:pb-0">
        <button 
          onClick={() => setSelectedReport(null)}
          className="mb-6 flex items-center gap-2 text-gray-500 hover:text-black font-bold transition-colors group px-2 md:px-0"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:border-gray-400 transition-colors">
            <ArrowLeft size={16} />
          </div>
          返回列表
        </button>
        <AnalysisDashboard data={selectedReport} />
      </div>
    );
  }

  const getFilterLabel = (type: string) => {
    switch(type) {
      case 'Buy': return '买入 (Buy)';
      case 'Sell': return '卖出 (Sell)';
      case 'Wait': return '观望 (Wait)';
      default: return '全部状态';
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto pb-24 md:pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 md:mb-8 gap-4 md:gap-6">
        <div className="w-full lg:w-auto">
           <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
             <div className="p-2 bg-black text-white rounded-xl shadow-md shadow-black/10">
               <Clock size={20} />
             </div>
             历史分析档案
           </h2>
           <p className="text-gray-500 text-sm mt-2 ml-1">
             共 {history.length} 条记录 
             {searchTerm && ` • 搜索 "${searchTerm}"`}
             {filterType !== 'All' && ` • 筛选: ${getFilterLabel(filterType)}`}
           </p>
        </div>
        
        {/* Search & Filter Bar */}
        <div className="flex gap-3 relative z-20 w-full lg:w-auto">
            <div className="relative group flex-1 lg:flex-none">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-lime-600 transition-colors" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索股票名称或代码..." 
                  className="pl-9 pr-4 py-3 md:py-2.5 bg-white border border-gray-200 rounded-2xl md:rounded-full text-sm w-full lg:w-64 focus:outline-none focus:border-lime-400 focus:ring-4 focus:ring-lime-100 transition-all shadow-sm"
                />
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`h-full px-4 md:px-3 bg-white border rounded-2xl md:rounded-full flex items-center justify-center gap-2 hover:bg-gray-50 text-gray-600 transition-all ${isFilterOpen ? 'border-lime-400 ring-4 ring-lime-100 text-lime-700' : 'border-gray-200'}`}
              >
                  <Filter size={16} />
                  <span className="text-xs font-bold whitespace-nowrap hidden sm:inline">{filterType !== 'All' ? getFilterLabel(filterType).split(' ')[0] : '筛选'}</span>
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                  {(['All', 'Buy', 'Wait', 'Sell'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleFilterSelect(type)}
                      className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span className={`${type === 'Buy' ? 'text-rose-500' : type === 'Sell' ? 'text-emerald-500' : type === 'Wait' ? 'text-amber-500' : 'text-gray-700'}`}>
                        {getFilterLabel(type)}
                      </span>
                      {filterType === type && <Check size={14} className="text-black" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[2rem] border border-dashed border-gray-200 min-h-[400px] m-1 md:m-0">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Search size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium">没有找到匹配的记录</p>
            <button onClick={() => {setSearchTerm(''); setFilterType('All');}} className="mt-2 text-lime-600 font-bold text-sm hover:underline">清除筛选条件</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:gap-5">
           {filteredHistory.map((report) => (
             <div 
               key={report.id}
               onClick={() => setSelectedReport(report)}
               className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-lime-200 hover:-translate-y-1 cursor-pointer transition-all duration-300 group relative overflow-hidden"
             >
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 md:mb-5 relative z-10 gap-3 sm:gap-0">
                    <div className="flex items-center gap-4 md:gap-5 w-full sm:w-auto">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gray-50 flex items-center justify-center font-bold text-gray-700 text-lg md:text-xl border border-gray-100 group-hover:bg-lime-300 group-hover:text-black group-hover:border-lime-300 transition-colors shadow-sm flex-shrink-0">
                            {report.stockCode.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg md:text-xl text-gray-900 group-hover:text-lime-700 transition-colors truncate">{report.stockName}</h3>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mt-1 flex-wrap">
                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded-lg text-gray-500 group-hover:bg-lime-50 group-hover:text-lime-700 transition-colors">{report.stockCode}</span>
                                <span className="hidden sm:inline w-1 h-1 rounded-full bg-gray-300"></span>
                                <span className="hidden sm:inline">{report.timestamp}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className={`self-start sm:self-center px-4 py-1.5 md:px-5 md:py-2 rounded-xl text-xs md:text-sm font-bold text-white shadow-md flex items-center gap-1.5 flex-shrink-0 ${
                        report.recommendation === 'Buy' 
                            ? 'bg-rose-500 shadow-rose-200' 
                            : report.recommendation === 'Wait' 
                                ? 'bg-amber-400 shadow-amber-200' 
                                : 'bg-emerald-500 shadow-emerald-200'
                    }`}>
                        {report.recommendation === 'Buy' 
                            ? '🚀 买入' 
                            : report.recommendation === 'Wait' 
                                ? '⚠️ 观望' 
                                : '📉 卖出'}
                    </div>
                </div>

                <div className="relative z-10 sm:pl-[4.5rem]">
                    {/* Timestamp for mobile only */}
                    <div className="sm:hidden text-xs text-gray-300 mb-3 font-medium flex items-center gap-1">
                        <Clock size={10} /> {report.timestamp}
                    </div>

                    {/* Analysis Summary */}
                    <div className="text-sm leading-relaxed mb-5 bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50 group-hover:border-emerald-200 transition-colors">
                        <span className="font-extrabold text-emerald-800 mr-2 block sm:inline mb-1 sm:mb-0">分析小结:</span>
                        <span className="font-bold text-emerald-700">
                           {report.analysisSummary}
                        </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                         <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                             {/* Tags */}
                             {report.keyDrivers.slice(0, 4).map((tag, i) => (
                                 <span key={i} className="text-xs px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 font-extrabold hover:bg-blue-100 transition-colors">
                                     {tag}
                                 </span>
                             ))}
                         </div>
                         <button className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-bold text-gray-400 group-hover:text-lime-600 transition-colors bg-white border border-gray-100 px-3 py-2.5 sm:py-1.5 rounded-xl sm:rounded-full shadow-sm group-hover:shadow group-hover:border-lime-200">
                             查看完整报告 <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                         </button>
                    </div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
