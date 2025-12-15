
import React, { useRef, useState } from 'react';
import { 
  History,
  Target,
  Activity,
  CheckCircle2,
  DollarSign,
  Layers,
  BarChart2,
  Download,
  FileCode,
  Image as ImageIcon,
  Lightbulb,
  TrendingUp,
  ArrowDownRight,
  Zap,
  GitMerge,
  Sparkles,
  Lock,
  Crown,
  Gauge,
  AlertTriangle,
  MoveDown,
  MoveUp,
  CreditCard,
  Shield,
  ArrowLeftRight,
  CircleDollarSign,
  Newspaper,
  Megaphone,
  TrendingDown,
  Info
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { AIAnalysisReport, UserTier } from '../types';

// Helper component to render text with bold/highlighting support
const HighlightText = ({ text, className = "" }: { text: string; className?: string }) => {
  if (!text) return null;
  
  // Split by markdown bold syntax **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={index} className="font-bold text-gray-900 mx-0.5">
              {part.slice(2, -2)}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

interface LockedOverlayProps {
    onSubscribe: () => void;
}

const LockedOverlay: React.FC<LockedOverlayProps> = ({ onSubscribe }) => (
    <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/40 flex flex-col items-center justify-center rounded-[2rem] border border-white/20">
        <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-lg mb-4">
            <Lock className="text-lime-300" size={24} />
        </div>
        <h4 className="text-xl font-bold text-gray-900 mb-2">Pro 会员专享内容</h4>
        <p className="text-gray-500 font-medium text-sm mb-6 max-w-xs text-center">
            解锁主力资金流向、精准买卖点位及策略逻辑分析。
        </p>
        <button 
            onClick={onSubscribe}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all hover:scale-105 shadow-lg shadow-black/10"
        >
            <Crown size={16} className="text-lime-300" />
            立即解锁深度分析
        </button>
    </div>
);

interface AnalysisDashboardProps {
    data: AIAnalysisReport;
    userTier?: UserTier;
    onSubscribe?: () => void;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ 
    data, 
    userTier = 'pro', 
    onSubscribe = () => {} 
}) => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const isLocked = userTier !== 'pro';
  const [showSentimentTooltip, setShowSentimentTooltip] = useState(false);
  
  // 3 Tiers Logic: Buy (Red/Rocket), Sell (Green/Bear), Wait (Gray/Caution)
  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case 'Buy':
        return {
          bg: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-200',
          label: '买入',
          emoji: '🚀'
        };
      case 'Sell':
        return {
          bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-200',
          label: '卖出',
          emoji: '📉'
        };
      case 'Wait':
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-200',
          label: '观望',
          emoji: '⚠️'
        };
    }
  };

  const recStyle = getRecommendationStyle(data.recommendation);
  
  const handleExportImage = async () => {
    if (!dashboardRef.current) return;

    const exportContainer = document.createElement('div');
    exportContainer.style.position = 'fixed';
    exportContainer.style.top = '0';
    exportContainer.style.left = '-9999px';
    exportContainer.style.zIndex = '-1000';
    exportContainer.style.width = `${dashboardRef.current.offsetWidth}px`;
    exportContainer.style.backgroundColor = '#F8FAFC';
    
    const clone = dashboardRef.current.cloneNode(true) as HTMLElement;
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.maxHeight = 'none';
    
    const controls = clone.querySelector('[data-html2canvas-ignore]');
    if (controls) controls.remove();
    
    exportContainer.appendChild(clone);
    document.body.appendChild(exportContainer);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F8FAFC',
        logging: false,
        width: exportContainer.offsetWidth,
        height: exportContainer.scrollHeight,
        windowWidth: exportContainer.offsetWidth,
        windowHeight: exportContainer.scrollHeight + 100,
      });

      const link = document.createElement('a');
      link.download = `${data.stockName}_Analysis_${data.timestamp.replace(/[\/ :]/g, '')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      document.body.removeChild(exportContainer);
    }
  };

  const handleExportHTML = () => {
     // ... Placeholder logic
  };

  // Ensure consistent order of technical indicators
  const orderedIndicators = ['RSI', 'MACD', '布林带', '成交量', '趋势强度'];
  
  const getIndicatorIcon = (name: string) => {
    if (name.includes('RSI')) return <Activity size={20} className="text-purple-500" />;
    if (name.includes('MACD')) return <GitMerge size={20} className="text-blue-500" />;
    if (name.includes('布林带')) return <Layers size={20} className="text-indigo-500" />;
    if (name.includes('成交量')) return <BarChart2 size={20} className="text-orange-500" />;
    if (name.includes('趋势')) return <Zap size={20} className="text-yellow-500" />;
    return <Activity size={20} className="text-gray-400" />;
  };

  const displayIndicators = orderedIndicators.map(name => 
    data.technicalIndicators.find(i => i.name.includes(name)) || 
    data.technicalIndicators.find(i => i.name === name) ||
    { name, value: 'N/A', sentiment: 'neutral', signal: 'No data' } as any
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10 export-container" ref={dashboardRef}>
      
      {/* Export Controls */}
      <div className="flex justify-between items-center px-2" data-html2canvas-ignore>
         <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
            AI Analysis Generated
         </div>
         <div className="flex gap-2">
            <button 
              onClick={!isLocked ? handleExportHTML : onSubscribe}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold transition-colors shadow-sm ${
                !isLocked 
                  ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-black'
                  : 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
               {isLocked ? <Lock size={14} /> : <FileCode size={16} />}
               HTML
            </button>
            <button 
              onClick={!isLocked ? handleExportImage : onSubscribe}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg ${
                !isLocked
                  ? 'bg-black text-white hover:bg-gray-800 shadow-gray-200'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
              }`}
            >
               {isLocked ? <Lock size={14} /> : <ImageIcon size={16} />}
               <span className="hidden sm:inline">导出图片</span>
               <span className="sm:hidden">图片</span>
            </button>
         </div>
      </div>

      {/* 1. Header & Key Info Card */}
      <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
               <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-2">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">{data.stockName}</h1>
                  <span className="px-3 py-1.5 bg-orange-50 rounded-xl text-orange-600 font-bold font-mono text-sm border border-orange-200 shadow-sm">{data.stockCode}</span>
                  <div className="px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                     <span className={`w-2 h-2 rounded-full ${data.strategyMode.includes('趋势') ? 'bg-lime-500' : 'bg-blue-500'}`}></span>
                     {data.strategyMode}
                  </div>
               </div>
               <div className="flex items-center gap-4 text-gray-400 text-xs font-medium uppercase tracking-wide">
                  <span className="flex items-center gap-1.5"><History size={14}/> {data.timestamp}</span>
               </div>
            </div>
            
            <div className="flex flex-col items-center sm:items-end gap-3 w-full md:w-auto">
                {/* Recommendation Card */}
                <div className={`px-10 py-5 rounded-2xl shadow-xl ${recStyle.bg} text-white text-center w-full md:w-auto transform hover:scale-105 transition-transform duration-300`}>
                  <div className="text-[10px] font-bold opacity-90 tracking-[0.2em] uppercase mb-1">Recommendation</div>
                  <div className="text-3xl font-black tracking-tight flex items-center justify-center gap-2">
                     {recStyle.label} <span className="text-2xl">{recStyle.emoji}</span>
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm w-full md:w-[200px] justify-between group hover:bg-white transition-colors">
                     <div className="flex items-center gap-2 text-gray-500">
                         <Gauge size={16} className="text-lime-600" />
                         <span className="text-xs font-bold">置信度</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                             <div 
                                className={`h-full rounded-full ${data.confidenceScore >= 80 ? 'bg-lime-500' : data.confidenceScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                style={{ width: `${data.confidenceScore}%` }}
                             ></div>
                         </div>
                         <span className="text-sm font-black text-gray-900">{data.confidenceScore}%</span>
                     </div>
                </div>
            </div>
         </div>

         {/* Tags */}
         <div className="mt-8 flex flex-wrap gap-2 md:gap-3">
             {data.keyDrivers.map((driver, idx) => (
                <div key={idx} className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 md:px-4 rounded-full text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow">
                   <Target size={14} className="text-blue-600 stroke-[3px]"/>
                   {driver}
                </div>
             ))}
             <div className="bg-lime-50 text-lime-800 border border-lime-100 px-3 py-1.5 md:px-4 rounded-full text-xs md:text-sm font-bold flex items-center gap-2">
                <Activity size={14} className="text-lime-600 stroke-[3px]"/>
                {data.marketSentiment}
             </div>
         </div>

         {/* Analysis Summary */}
         <div className="mt-8 bg-lime-50/80 rounded-2xl p-5 md:p-6 border border-lime-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-lime-600 fill-lime-600" />
                <span className="font-bold text-lg text-lime-800">分析小结</span>
            </div>
            <div className="text-gray-800 leading-relaxed font-medium text-base md:text-lg text-justify">
                <HighlightText text={data.analysisSummary} />
            </div>
         </div>
      </div>

      {/* 3. Main Content Grid - RESTRUCTURED */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Left Column: Technicals & News */}
          <div className="space-y-6 h-fit">
              
              {/* Technical Indicators */}
              <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 h-fit">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Layers size={20} className="text-blue-500" />
                        技术指标
                    </h3>
                </div>
                
                {/* Indicator List */}
                <div className="space-y-6 mb-8">
                    {displayIndicators.map((tech, idx) => (
                    <div key={idx} className="group">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                                   {getIndicatorIcon(tech.name)}
                                </div>
                                <span className="font-bold text-gray-700 w-24 truncate" title={tech.name}>{tech.name}</span>
                            </div>
                            <span className="font-bold text-xs md:text-sm text-orange-700 text-right bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg shadow-sm">
                                {tech.value}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 pl-11 group-hover:text-gray-700 transition-colors line-clamp-1">
                            {tech.signal}
                        </p>
                    </div>
                    ))}
                </div>

                {/* Technical Strategy Advice Box */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                   <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm font-bold uppercase">
                      <Lightbulb size={16} />
                      技术面建议
                   </div>
                   
                   {/* Points List */}
                   <ul className="space-y-3 mb-6">
                      {data.technicalAnalysisAdvice.points.map((point, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed font-medium">
                           <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                           <span><HighlightText text={point} /></span>
                        </li>
                      ))}
                   </ul>

                   {/* Summary Badge */}
                   <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-bold border border-violet-200">
                       <Zap size={14} className="fill-violet-700" />
                       <HighlightText text={data.technicalAnalysisAdvice.summary} />
                   </div>
                </div>
              </div>

              {/* NEW: News & Sentiment Analysis */}
              <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <Newspaper size={20} className="text-purple-500" />
                          舆情风向分析
                      </h3>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${data.newsAnalysis.sentimentScore > 60 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          热度 {data.newsAnalysis.sentimentScore}
                      </span>
                  </div>

                  <div className="space-y-4">
                     {data.newsAnalysis.news.map((item, idx) => (
                         <div key={idx} className="flex gap-3 items-start p-3 rounded-xl bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                             <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.sentiment === 'positive' ? 'bg-rose-500' : item.sentiment === 'negative' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                             <div>
                                 <h4 className="text-sm font-bold text-gray-800 leading-snug mb-1">{item.title}</h4>
                                 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.sentiment === 'positive' ? 'bg-rose-100 text-rose-700' : item.sentiment === 'negative' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                     {item.sentiment === 'positive' ? '利好' : item.sentiment === 'negative' ? '利空' : '中性'}
                                 </span>
                             </div>
                         </div>
                     ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100">
                     <div className="flex gap-2 items-start">
                        <Megaphone size={16} className="text-purple-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                           <HighlightText text={data.newsAnalysis.summary} />
                        </p>
                     </div>
                  </div>
              </div>
          </div>

          {/* Right Column: Strategy & Funds */}
          <div className="space-y-6 h-fit">
              
              {/* Strategy Execution - Moved to Right, Stacked */}
              <div className="bg-white rounded-[2rem] p-5 md:p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col relative overflow-hidden h-fit">
                  {isLocked && <LockedOverlay onSubscribe={onSubscribe} />}
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold flex items-center gap-3 text-gray-900">
                          <div className="p-2 bg-gray-100 rounded-xl shadow-sm text-gray-600 border border-gray-200"><BarChart2 size={20} /></div>
                          执行策略
                        </h3>
                        <span className="px-3 py-1 bg-lime-100 text-lime-700 rounded-full text-xs font-bold border border-lime-200">ACTION PLAN</span>
                    </div>
                    
                    <div className={`flex flex-col gap-6 ${isLocked ? 'blur-sm select-none' : ''}`}>
                       
                       {/* 1. Price Cards Row */}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Target */}
                          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 text-center relative overflow-hidden group">
                              <div className="text-rose-600 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                                 <Target size={12} /> 止盈目标
                              </div>
                              <div className="text-xl font-black text-gray-900">{data.strategy.targetPrice}</div>
                              <div className="text-[10px] text-rose-400 mt-1 font-medium">第一阻力位</div>
                          </div>

                          {/* Entry */}
                          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 text-center">
                              <div className="text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                                 <MoveDown size={12} /> 建仓区间
                              </div>
                              <div className="text-xl font-black text-gray-900">{data.strategy.entryRange}</div>
                              <div className="text-[10px] text-blue-400 mt-1 font-medium">分批低吸</div>
                          </div>

                          {/* Stop */}
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                              <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                                 <Shield size={12} /> 止损线
                              </div>
                              <div className="text-xl font-black text-gray-900">{data.strategy.stopLoss}</div>
                              <div className="text-[10px] text-gray-400 mt-1 font-medium">跌破离场</div>
                          </div>
                       </div>

                       {/* 2. Strategy Logic */}
                       <div className="mt-2">
                          <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold">
                             <Layers size={18} className="text-gray-400" />
                             策略逻辑推演
                          </div>
                          <ul className="space-y-4">
                              {data.strategy.logic.points.map((point, i) => (
                                 <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed font-medium">
                                    <span className="font-bold text-black min-w-[14px]">{i+1}.</span>
                                    <span><HighlightText text={point} /></span>
                                 </li>
                              ))}
                          </ul>
                       </div>

                       {/* 3. Risk Warning Banner */}
                       <div className="mt-2">
                          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3 items-start">
                             <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                             <div className="text-xs text-orange-800 font-medium leading-relaxed">
                                <span className="font-bold text-orange-900 mr-1">风险提示:</span>
                                {data.strategy.logic.riskWarning}
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
              </div>

              {/* Fund Flow Card - UPDATED WITH INTERACTIVITY */}
              <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden">
                  {isLocked && <LockedOverlay onSubscribe={onSubscribe} />}
                  
                  <div className={`space-y-6 ${isLocked ? 'blur-sm select-none' : ''}`}>
                      <div className="flex items-center gap-2">
                         <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shadow-sm">
                            <CircleDollarSign size={20} />
                         </div>
                         <h3 className="font-bold text-gray-900 text-lg">资金与情绪监控</h3>
                      </div>

                      {/* Main Funds Overview - Multi-Day Grid */}
                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                         <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">主力资金净流入趋势</div>
                         <div className="grid grid-cols-3 gap-2 text-center divide-x divide-gray-200">
                             <div>
                                 <div className="text-xs text-gray-500 font-bold mb-1">3日</div>
                                 <div className="text-sm font-black text-gray-900">{data.fundsFlow.inflow3d}</div>
                             </div>
                             <div>
                                 <div className="text-xs text-gray-500 font-bold mb-1">5日</div>
                                 <div className="text-sm font-black text-gray-900">{data.fundsFlow.inflow5d}</div>
                             </div>
                             <div>
                                 <div className="text-xs text-gray-500 font-bold mb-1">20日</div>
                                 <div className="text-sm font-black text-gray-900">{data.fundsFlow.inflow20d}</div>
                             </div>
                         </div>
                         <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                             <TrendingUp size={14} className="text-amber-500 shrink-0 mt-0.5" />
                             {data.fundsFlow.fundsConclusion}
                         </div>
                      </div>

                      {/* Interactive Sentiment Meter */}
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative group">
                         <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">散户情绪指数</span>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${data.fundsFlow.retailSentimentScore > 80 ? 'bg-rose-50 text-rose-600' : data.fundsFlow.retailSentimentScore < 20 ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                                {data.fundsFlow.retailSentimentText}
                            </span>
                         </div>
                         
                         {/* Visual Bar - Gradient */}
                         <div 
                           className="h-3 w-full rounded-full relative mb-2 cursor-pointer"
                           style={{ background: 'linear-gradient(to right, #34d399, #e5e7eb, #f43f5e)' }} // Emerald -> Gray -> Rose
                           onMouseEnter={() => setShowSentimentTooltip(true)}
                           onMouseLeave={() => setShowSentimentTooltip(false)}
                         >
                            {/* Pointer */}
                            <div 
                                className="absolute -top-1.5 w-6 h-6 bg-white border-2 border-gray-800 rounded-full shadow-md flex items-center justify-center transition-all duration-1000 ease-out"
                                style={{ left: `calc(${data.fundsFlow.retailSentimentScore}% - 12px)` }}
                            >
                                <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
                            </div>

                            {/* Tooltip */}
                            {showSentimentTooltip && (
                                <div 
                                    className="absolute -top-10 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200"
                                    style={{ left: `${data.fundsFlow.retailSentimentScore}%` }}
                                >
                                    {data.fundsFlow.retailSentimentScore}
                                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                            )}
                         </div>
                         
                         <div className="flex justify-between text-[10px] text-gray-400 font-bold px-1">
                            <span className="text-emerald-500">恐慌 (0)</span>
                            <span className="text-gray-400">中性 (50)</span>
                            <span className="text-rose-500">贪婪 (100)</span>
                         </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
