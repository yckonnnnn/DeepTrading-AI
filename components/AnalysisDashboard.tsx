
import React, { useRef } from 'react';
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
  Gauge
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { AIAnalysisReport, UserTier } from '../types';

// Helper component to render text with bold/highlighting support
const HighlightText = ({ text, className = "" }: { text: string; className?: string }) => {
  if (!text) return null;
  
  // Split by markdown bold syntax **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  // Palette for rotating colors
  const highlightStyles = [
    "bg-blue-50 text-blue-700 border-blue-100",
    "bg-rose-50 text-rose-700 border-rose-100", 
    "bg-emerald-50 text-emerald-700 border-emerald-100",
    "bg-amber-50 text-amber-700 border-amber-100",
    "bg-violet-50 text-violet-700 border-violet-100"
  ];

  let highlightIndex = 0;

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const style = highlightStyles[highlightIndex % highlightStyles.length];
          highlightIndex++;
          return (
            <span key={index} className={`font-bold px-1.5 py-0.5 rounded-lg border mx-0.5 text-[0.95em] inline-block shadow-sm ${style}`}>
              {part.slice(2, -2)}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
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
    
    const textElements = clone.querySelectorAll('.line-clamp-1, .truncate');
    textElements.forEach((el) => {
        el.classList.remove('line-clamp-1', 'truncate');
        (el as HTMLElement).style.whiteSpace = 'normal';
        (el as HTMLElement).style.overflow = 'visible';
        (el as HTMLElement).style.display = 'block';
    });
    
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

         {/* Tags - BLUE BOLD */}
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

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Left: Technicals & Funds */}
          <div className="space-y-6">
              
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
                   <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-bold uppercase">
                      <Lightbulb size={14} />
                      技术面建议
                   </div>
                   <HighlightText 
                      text={data.technicalAnalysisAdvice || "RSI 和 MACD 显示当前趋势稳健，布林带开口向上，建议关注成交量配合情况。"} 
                      className="text-base font-medium text-slate-700 leading-relaxed"
                   />
                </div>
              </div>

              {/* Fund Flow Card - LOCKED */}
              <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden">
                  {isLocked && <LockedOverlay onSubscribe={onSubscribe} />}
                  
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <DollarSign size={20} className="text-amber-500" />
                          资金与情绪
                      </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                          <span className="text-xs text-gray-400 font-bold uppercase block mb-2">主力资金</span>
                          <span className={`text-sm font-bold text-gray-800 leading-snug ${isLocked ? 'blur-sm' : ''}`}>
                             {data.fundsFlow.inflow}
                          </span>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                          <span className="text-xs text-gray-400 font-bold uppercase block mb-2">散户情绪</span>
                          <span className={`text-sm font-bold text-gray-800 leading-snug ${isLocked ? 'blur-sm' : ''}`}>
                             {data.fundsFlow.retailSentiment}
                          </span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Right: Strategy Execution - LOCKED */}
          <div className="bg-white rounded-[2rem] p-5 md:p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col h-full relative overflow-hidden">
              {isLocked && <LockedOverlay onSubscribe={onSubscribe} />}

              <div className="absolute top-0 right-0 w-64 h-64 bg-lime-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-xl font-bold flex items-center gap-3 text-gray-900">
                      <div className="p-2 bg-gray-100 rounded-xl shadow-sm text-gray-600 border border-gray-200"><BarChart2 size={20} /></div>
                      执行策略
                    </h3>
                    <span className="px-3 py-1 bg-lime-100 text-lime-700 rounded-full text-xs font-bold border border-lime-200">ACTION PLAN</span>
                </div>
                
                <div className={`flex flex-col gap-6 mb-8 flex-1 justify-center ${isLocked ? 'blur-sm select-none' : ''}`}>
                   
                   {/* 1. Take Profit (Top) */}
                   <div className="bg-rose-50/80 p-6 rounded-2xl border border-rose-100 relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="absolute left-0 top-0 w-1 h-full bg-rose-500"></div>
                      <div className="flex justify-between items-end relative z-10">
                          <div>
                             <div className="text-rose-600 text-xs mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Target size={12} /> 止盈目标 (Target)
                             </div>
                             <div className="text-2xl md:text-3xl font-bold font-mono text-gray-900 tracking-tight">{data.strategy.targetPrice}</div>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
                             <TrendingUp className="rotate-0" size={20}/>
                          </div>
                      </div>
                   </div>

                   {/* 2. Entry Point (Middle) */}
                   <div className="bg-blue-50/80 p-6 rounded-2xl border-2 border-blue-200 shadow-lg shadow-blue-100 relative overflow-hidden scale-[1.02] z-20">
                      <div className="flex justify-between items-end relative z-10">
                          <div>
                             <div className="text-blue-600 text-xs mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Activity size={12} /> 建议入场 (Entry)
                             </div>
                             <div className="text-3xl md:text-4xl font-bold font-mono text-gray-900 tracking-tight">{data.strategy.entryRange}</div>
                          </div>
                          <div className="px-3 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                             CORE
                          </div>
                      </div>
                   </div>

                   {/* 3. Stop Loss (Bottom) */}
                   <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 relative overflow-hidden group hover:border-gray-200 transition-colors">
                       <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500"></div>
                       <div className="flex justify-between items-end relative z-10">
                          <div>
                             <div className="text-emerald-600 text-xs mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Activity size={12} className="rotate-180" /> 止损警戒 (Stop Loss)
                             </div>
                             <div className="text-xl md:text-2xl font-bold font-mono text-gray-900 tracking-tight">{data.strategy.stopLoss}</div>
                          </div>
                          <ArrowDownRight size={20} className="text-emerald-500" />
                       </div>
                   </div>

                </div>

                {/* Logic Text */}
                <div className={`mt-auto bg-gray-50 p-6 rounded-2xl border border-gray-100 ${isLocked ? 'blur-sm select-none' : ''}`}>
                  <span className="text-gray-900 font-bold mr-2 block mb-3 text-lg">策略逻辑:</span>
                  <HighlightText 
                    text={data.strategy.logic}
                    className="text-base leading-7 text-gray-600" 
                  />
                </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
