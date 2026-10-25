
import React, { useState, useRef } from 'react';
import { 
  Search, 
  UploadCloud, 
  TrendingUp, 
  Sparkles,
  ImageIcon,
  AlertTriangle,
  X,
  ChevronRight,
  BrainCircuit,
  Flame,
  ArrowUpRight,
  Lightbulb,
  History,
  RefreshCw,
  Crown,
  Lock,
  Zap,
  BarChart2,
  ScanLine,
  Gift
} from 'lucide-react';
import { generateStockAnalysis } from '../services/geminiService';
import { AIAnalysisReport, UserTier } from '../types';
import AnalysisDashboard from './AnalysisDashboard';

const strategies = [
  { 
    id: 'technical', 
    icon: TrendingUp, 
    label: '趋势跟踪策略', 
    desc: '适合中长线稳健投资，捕捉主升浪。',
    bg: 'bg-lime-300',
    selectedBg: 'bg-lime-300',
    text: 'text-black'
  },
  { 
    id: 'short_term', 
    icon: ArrowUpRight, 
    label: '短线博弈策略', 
    desc: '高频波段交易，适合激进型投资者。',
    bg: 'bg-white',
    selectedBg: 'bg-lime-300', 
    text: 'text-black'
  },
];

const trendingStocks = [
  { code: '600519', name: '贵州茅台' },
  { code: '300750', name: '宁德时代' },
  { code: '601138', name: '工业富联' },
  { code: '002347', name: '泰达股份' }
];

const LoadingView = () => (
  <div className="w-full py-24 flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-gray-100 animate-in fade-in zoom-in duration-500">
    <div className="relative mb-8">
       <div className="w-24 h-24 bg-lime-50 rounded-full flex items-center justify-center relative z-10">
          <BrainCircuit size={40} className="text-lime-600 animate-pulse" />
       </div>
       <div className="absolute inset-0 border-4 border-lime-200 rounded-full animate-ping opacity-30"></div>
       <div className="absolute -inset-4 border border-dashed border-lime-300 rounded-full animate-[spin_10s_linear_infinite]"></div>
    </div>
    
    <h3 className="text-2xl font-bold text-gray-900 mb-2">正在深度分析...</h3>
    <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
       <p>AI 正在解读 K 线形态与技术指标</p>
       <div className="flex gap-1.5 mt-2">
         <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-bounce [animation-delay:-0.3s]"></span>
         <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-bounce [animation-delay:-0.15s]"></span>
         <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-bounce"></span>
       </div>
    </div>
  </div>
);

const ErrorView = ({ onRetry }: { onRetry: () => void }) => (
  <div className="w-full py-24 flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-red-100 animate-in fade-in zoom-in duration-300">
    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
      <AlertTriangle size={32} className="text-red-500" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">分析请求失败</h3>
    <p className="text-gray-500 text-sm mb-8 text-center max-w-md px-6">
      无法连接到 AI 服务。这可能是由于网络连接问题或 API 配置错误导致的。
    </p>
    <button 
      onClick={onRetry}
      className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
    >
      <RefreshCw size={18} />
      重试分析
    </button>
  </div>
);

const LimitReachedView = ({ onSubscribe }: { onSubscribe: () => void }) => (
  <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center rounded-[2.5rem] border border-gray-200 animate-in fade-in duration-500 p-6">
     <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl text-center max-w-sm border border-gray-100 animate-in zoom-in slide-in-from-bottom-4 duration-500 w-full">
         <div className="w-20 h-20 bg-black text-lime-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-lime-200/50 relative">
            <Crown size={36} />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                <Lock size={12} className="text-white" />
            </div>
         </div>
         <h3 className="text-2xl font-extrabold text-gray-900 mb-3">今日免费额度已耗尽</h3>
         <p className="text-gray-500 font-medium mb-8 leading-relaxed text-sm">
            普通用户每日限 1 次 AI 深度分析。<br/>
            升级 Pro 会员，解锁<span className="text-black font-bold">无限次</span>分析与 K 线识图。
         </p>
         <button 
           onClick={onSubscribe}
           className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:scale-105 hover:bg-gray-900 transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-2"
         >
            立即升级 Pro
            <ArrowUpRight size={18} />
         </button>
         <p className="mt-4 text-xs text-gray-400 font-medium">
            新用户首月仅需 ¥68
         </p>
     </div>
  </div>
);

interface StockAnalysisProps {
  onAnalysisComplete: (report: AIAnalysisReport) => void;
  history: AIAnalysisReport[];
  userTier: UserTier;
  onSubscribe: () => void;
}

const StockAnalysis: React.FC<StockAnalysisProps> = ({ 
  onAnalysisComplete, 
  history, 
  userTier, 
  onSubscribe 
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'text' | 'image'>('text');
  const [activeStrategy, setActiveStrategy] = useState('technical');
  const [query, setQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisReport | null>(null);
  
  // Usage Limit State
  const [dailyUsage, setDailyUsage] = useState(0);
  const MAX_FREE_USAGE = 1;
  const isPro = userTier === 'pro';
  const isLimitReached = !isPro && dailyUsage >= MAX_FREE_USAGE;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async () => {
    if (isLimitReached) {
        onSubscribe();
        return;
    }

    if (activeInputTab === 'text' && !query.trim()) return;
    if (activeInputTab === 'image' && !selectedImage) return;

    // Start Flow
    setShowResult(true);
    setIsAnalyzing(true);
    setError(false);
    setAnalysisResult(null);

    // Scroll to result area smoothly
    setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const strategyLabel = strategies.find(s => s.id === activeStrategy)?.label || '趋势跟踪策略';
    
    // Pass strategy label to service
    const result = await generateStockAnalysis(
      query, 
      activeInputTab === 'image' ? selectedImage : null,
      strategyLabel
    );
    
    setIsAnalyzing(false);
    
    if (result) {
      setAnalysisResult(result);
      onAnalysisComplete(result); // Add to global history
      if (!isPro) {
          setDailyUsage(prev => prev + 1);
      }
    } else {
      setError(true);
    }
  };

  const handleHistoryItemClick = (report: AIAnalysisReport) => {
    setAnalysisResult(report);
    setShowResult(true);
    setIsAnalyzing(false);
    setError(false);
    setQuery(report.stockCode); // Optional: populate input for context
    
    // Scroll to result area smoothly
    setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAnalyzing) {
      handleAnalyze();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTrendingClick = (code: string) => {
    setQuery(code);
  };

  return (
    <div className="h-full flex flex-col pt-2 pb-10">
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        
        {/* Main Column (Left) */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-8">
            
            {/* 1. Input Command Center */}
            <div className="bg-white rounded-[2.5rem] p-5 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 right-0 w-96 h-96 bg-lime-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 pointer-events-none opacity-30"></div>
                
                {/* Limit Reached Overlay */}
                {isLimitReached && <LimitReachedView onSubscribe={onSubscribe} />}

                {/* Header with Usage Status */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 relative z-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-lime-900/5 border border-gray-800">
                            <Sparkles size={24} className="text-lime-300" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">智能分析中心</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">Gemini 2.5 Pro</span>
                                <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-md bg-lime-100 text-lime-700 border border-lime-200 flex items-center gap-1">
                                    <Zap size={10} fill="currentColor" /> Online
                                </span>
                            </div>
                        </div>
                    </div>

                    {!isPro && (
                        <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                            {/* Gift Badge */}
                            <div className="relative group cursor-default hover:scale-105 transition-transform duration-300 w-full sm:w-auto">
                                <div className="absolute inset-0 bg-gradient-to-r from-lime-300 to-indigo-300 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                <div className="relative flex items-center gap-3 px-4 py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-lime-200 via-emerald-100 to-indigo-100 rounded-2xl border border-white/60 shadow-sm w-full sm:w-auto">
                                    <div className="bg-white/80 p-1.5 rounded-lg text-indigo-600 shadow-sm">
                                        <Gift size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col items-start leading-none gap-0.5">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">今日免费额度</span>
                                        <span className="text-sm md:text-base font-black text-gray-900">
                                            剩余 {Math.max(0, MAX_FREE_USAGE - dailyUsage)} 次
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Upgrade CTA */}
                            <button 
                                onClick={onSubscribe} 
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors group mr-1 self-end"
                            >
                                <Crown size={14} className="text-orange-500" fill="currentColor" fillOpacity={0.2} /> 
                                <span className="text-xs md:text-sm font-bold text-gray-500 group-hover:text-black transition-colors group-hover:underline underline-offset-4 decoration-2 decoration-lime-300">
                                    升级 Pro 解锁无限次
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs & Input */}
                <div className="flex flex-col gap-6 md:gap-8 relative z-10">
                     {/* Tabs */}
                     <div className="flex p-1.5 bg-gray-100/80 rounded-2xl w-full sm:w-fit border border-gray-200/50">
                        <button 
                          onClick={() => setActiveInputTab('text')}
                          className={`flex-1 sm:flex-none px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeInputTab === 'text' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <Search size={16} strokeWidth={2.5} />
                          代码诊断
                        </button>
                        <button 
                          onClick={() => setActiveInputTab('image')}
                          className={`flex-1 sm:flex-none px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeInputTab === 'image' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <ImageIcon size={16} strokeWidth={2.5} />
                          K线识图
                        </button>
                     </div>

                     {/* Input Area */}
                     <div className="w-full">
                        {activeInputTab === 'text' ? (
                          <>
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-focus-within:bg-lime-300 group-focus-within:text-black transition-all duration-300">
                                    <Search size={20} strokeWidth={2.5} />
                                </div>
                                <input 
                                    type="text" 
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isAnalyzing}
                                    placeholder="输入代码 (如 600519)" 
                                    className="w-full bg-gray-50/50 hover:bg-gray-50 focus:bg-white text-xl md:text-2xl font-bold py-6 md:py-8 pl-20 pr-8 rounded-[2rem] border-2 border-transparent focus:border-lime-300 focus:outline-none transition-all placeholder:text-gray-300 shadow-inner focus:shadow-xl focus:shadow-lime-100/50"
                                />
                            </div>

                            {/* Hot Analysis Tags - Scrollable on mobile */}
                            <div className="flex items-center gap-4 mt-5 px-2 animate-in fade-in slide-in-from-top-2 duration-500 overflow-x-auto pb-2 scrollbar-hide">
                               <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 shrink-0 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                  <Flame size={14} className="fill-orange-500" />
                                  热门标的
                               </div>
                               <div className="flex gap-2 flex-nowrap">
                                  {trendingStocks.map((stock) => (
                                     <button 
                                       key={stock.code}
                                       onClick={() => handleTrendingClick(`${stock.code}`)}
                                       className="px-3 py-1 bg-white border border-gray-100 rounded-lg text-sm font-bold text-gray-500 hover:bg-black hover:text-white hover:border-black transition-all whitespace-nowrap shrink-0"
                                     >
                                       {stock.name} <span className="opacity-60 text-xs ml-1 font-mono">{stock.code}</span>
                                     </button>
                                  ))}
                               </div>
                            </div>
                          </>
                        ) : (
                           <div className="w-full">
                               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                               {!selectedImage ? (
                                 <div onClick={triggerFileUpload} className="w-full h-48 md:h-56 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-lime-400 hover:bg-lime-50/30 transition-all group bg-gray-50/50 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform relative z-10 border border-gray-100">
                                       <UploadCloud size={32} className="text-gray-400 group-hover:text-lime-600" />
                                    </div>
                                    <span className="text-lg font-bold text-gray-700 relative z-10">点击上传 K 线截图</span>
                                    <span className="text-sm text-gray-400 mt-1 relative z-10 font-medium">支持 JPG, PNG · AI 自动识别形态</span>
                                 </div>
                               ) : (
                                 <div className="w-full h-64 relative rounded-[2rem] overflow-hidden border border-gray-200 group shadow-lg">
                                    <img src={selectedImage} alt="Analysis Target" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm gap-4">
                                       <button onClick={triggerFileUpload} className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:scale-105 transition-transform flex items-center gap-2">
                                          <RefreshCw size={14}/> 更换图片
                                       </button>
                                    </div>
                                    <button onClick={clearImage} className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors backdrop-blur-md"><X size={14} /></button>
                                 </div>
                               )}
                           </div>
                        )}
                     </div>

                     {/* Strategies */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {strategies.map((s) => {
                          const isSelected = activeStrategy === s.id;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setActiveStrategy(s.id)}
                              className={`relative overflow-hidden p-5 rounded-[1.5rem] border-2 transition-all duration-300 text-left group ${
                                isSelected 
                                  ? `${s.selectedBg} ${s.text} border-transparent shadow-lg scale-[1.02] ring-1 ring-black/5` 
                                  : 'bg-white border-gray-100 hover:border-lime-300 hover:bg-lime-50/30'
                              }`}
                            >
                               <div className="flex justify-between items-start mb-3">
                                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-black/10' : 'bg-gray-100 group-hover:bg-white'}`}>
                                    <s.icon size={24} className={isSelected ? 'text-black' : 'text-gray-400 group-hover:text-lime-600 transition-colors'} />
                                  </div>
                                  {isSelected && (
                                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${s.text === 'text-white' ? 'bg-lime-400/20 text-lime-800' : 'bg-black/10 text-black'}`}>
                                        Active
                                    </div>
                                  )}
                               </div>
                               <h3 className={`text-base font-bold mb-1 ${isSelected ? '' : 'text-gray-900'}`}>{s.label}</h3>
                               <p className={`text-xs font-medium leading-relaxed ${isSelected ? 'opacity-80' : 'text-gray-400'}`}>{s.desc}</p>
                            </button>
                          );
                        })}
                     </div>
                        
                     {/* Action Button */}
                     <button 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || (activeInputTab === 'text' && !query) || (activeInputTab === 'image' && !selectedImage)}
                        className={`w-full py-4 md:py-5 rounded-2xl font-bold text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-xl ${
                          isAnalyzing 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                            : 'bg-black text-white shadow-lime-900/20 hover:bg-gray-800 hover:scale-[1.01] active:scale-[0.99]'
                        }`}
                     >
                        {isAnalyzing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>正在深度分析中...</span>
                          </>
                        ) : (
                          <>
                            开始智能分析
                            <ChevronRight size={24} className="text-lime-300" />
                          </>
                        )}
                     </button>
                </div>
            </div>
            
            {/* Feature Showcase (Displayed when no result yet) */}
            {!showResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <ScanLine size={24} />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">多模态 K 线识别</h3>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">上传 K 线截图，AI 自动识别均线纠缠、顶底背离等复杂技术形态。</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Zap size={24} />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">全网情绪量化</h3>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">实时抓取新闻与社交媒体数据，量化散户恐慌与贪婪指数。</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <BarChart2 size={24} />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">主力资金追踪</h3>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">透过成交量透视主力建仓与出货行为，跟随聪明钱的脚步。</p>
                    </div>
                </div>
            )}

            {/* 2. Dynamic Result Section */}
            {showResult && (
               <div ref={resultRef} className="min-h-[400px]">
                  {isAnalyzing ? (
                     <LoadingView />
                  ) : error ? (
                     <ErrorView onRetry={handleAnalyze} />
                  ) : analysisResult ? (
                     <AnalysisDashboard 
                       data={analysisResult} 
                       userTier={userTier} 
                       onSubscribe={onSubscribe} 
                     />
                  ) : null}
               </div>
            )}
        </div>

        {/* Sidebar (Right) */}
        <div className="w-full xl:w-[320px] flex-shrink-0 flex flex-col gap-6">
            
            {/* Recent History */}
            <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <History size={18} className="text-gray-400" />
                        近期记录
                    </h3>
                </div>
                {history.length > 0 ? (
                  <div className="space-y-3">
                    {history.slice(0, 5).map((item, i) => (
                        <div 
                           key={i} 
                           onClick={() => handleHistoryItemClick(item)}
                           className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group border border-transparent hover:border-gray-200"
                        >
                             <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-xs text-gray-700 shadow-sm border border-gray-100">
                                   {item.stockCode.slice(0,1)}
                                 </div>
                                 <div>
                                    <div className="font-bold text-sm text-gray-900 group-hover:text-lime-700 transition-colors">{item.stockName}</div>
                                    <div className="text-xs text-gray-400">{item.stockCode}</div>
                                 </div>
                             </div>
                             <span className="text-xs text-gray-400">{item.timestamp.split(' ')[1]}</span>
                        </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <History size={24} className="text-gray-300 mb-2" />
                    <span className="text-gray-400 text-xs font-medium">暂无分析记录</span>
                  </div>
                )}
            </div>

             {/* Usage Tips - UPDATED STYLE */}
             <div className="bg-lime-100 rounded-[2rem] p-8 shadow-sm border border-lime-200 relative overflow-hidden group">
                <div className="relative z-10">
                    <h3 className="font-bold text-lime-950 mb-6 flex items-center gap-2 text-lg">
                        <Lightbulb size={20} />
                        使用小贴士
                    </h3>
                    <ul className="space-y-4">
                        {['上传 K 线截图包含均线系统，AI 分析更准确', '尝试切换「短线博弈」策略，捕捉资金流向', '基本面分析建议同时输入代码和财报截图'].map((tip, i) => (
                            <li key={i} className="flex gap-3 text-sm font-bold text-lime-900 leading-snug">
                                <span className="bg-lime-900/10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5 text-lime-900">{i+1}</span>
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/40 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
            </div>

            {/* Risk Warning Footer - UPDATED STYLE */}
            <div className="bg-orange-50 border border-orange-100 rounded-[2rem] p-6 shadow-sm">
                <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2 text-lg">
                    <AlertTriangle className="text-orange-600" size={20} />
                    风险提示
                </h3>
                <p className="text-sm text-orange-900 font-bold leading-relaxed">
                   AI 生成内容基于历史数据和技术形态分析，仅供参考，不构成任何投资建议。市场有风险，投资需谨慎。请结合自身判断做出决策，切勿盲目跟单。
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default StockAnalysis;
