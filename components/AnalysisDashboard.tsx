
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

    const element = dashboardRef.current;
    
    // 保存当前滚动位置和元素原始样式
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const originalStyles = {
      width: element.style.width,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      height: element.style.height,
      minHeight: element.style.minHeight,
      maxHeight: element.style.maxHeight,
      overflow: element.style.overflow,
    };
    
    // 临时隐藏导出控制按钮
    const controls = element.querySelector('[data-html2canvas-ignore]') as HTMLElement;
    const controlsDisplay = controls?.style.display;
    if (controls) controls.style.display = 'none';

    try {
      // 1. 强制使用桌面端宽度
      element.style.width = '1200px';
      element.style.minWidth = '1200px';
      element.style.maxWidth = '1200px';
      element.style.height = 'auto';
      element.style.minHeight = 'auto';
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';
      
      // 2. 滚动到页面最顶部
      window.scrollTo(0, 0);
      
      // 3. 强制浏览器重新计算布局（关键修复）
      // 使用 requestAnimationFrame 确保样式已应用
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          // 第一帧：样式已应用
          requestAnimationFrame(() => {
            // 第二帧：布局已计算
            resolve();
          });
        });
      });
      
      // 4. 触发强制重排
      void element.offsetHeight;
      
      // 5. 额外等待确保布局稳定
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 6. 再次触发重排
      void element.offsetHeight;
      
      // 5. 计算真实高度 - 遍历所有子元素找到最底部位置
      const computeRealHeight = (el: HTMLElement): number => {
        const rect = el.getBoundingClientRect();
        const scrollHeight = el.scrollHeight;
        const offsetHeight = el.offsetHeight;
        
        // 递归获取所有子元素的底部位置
        let maxBottom = 0;
        const walkDOM = (node: Element, parentTop: number) => {
          const nodeRect = node.getBoundingClientRect();
          const bottom = nodeRect.bottom - parentTop;
          if (bottom > maxBottom) maxBottom = bottom;
          
          Array.from(node.children).forEach(child => {
            walkDOM(child, parentTop);
          });
        };
        
        walkDOM(el, rect.top);
        
        return Math.max(scrollHeight, offsetHeight, maxBottom);
      };
      
      const calculatedHeight = computeRealHeight(element);
      const fullHeight = Math.ceil(calculatedHeight) + 150; // 添加 150px 安全边距
      const fullWidth = 1200;

      console.log('Export dimensions:', { 
        fullWidth, 
        fullHeight, 
        scrollHeight: element.scrollHeight,
        offsetHeight: element.offsetHeight,
        calculatedHeight
      });

      // 6. 使用 html2canvas，关键是 onclone 回调
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F8FAFC',
        logging: false,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        scrollX: 0,
        scrollY: 0, // 已经滚动到顶部，设为 0
        allowTaint: true,
        // 关键：在克隆后修改克隆元素的样式
        onclone: (clonedDoc, clonedElement) => {
          // 强制克隆元素完全展开
          clonedElement.style.height = `${fullHeight}px`;
          clonedElement.style.minHeight = `${fullHeight}px`;
          clonedElement.style.maxHeight = 'none';
          clonedElement.style.overflow = 'visible';
          
          // 递归移除所有子元素的高度限制
          const removeHeightRestrictions = (el: Element) => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style) {
              htmlEl.style.maxHeight = 'none';
              htmlEl.style.overflow = 'visible';
              // 移除可能导致截断的样式
              if (htmlEl.style.height && htmlEl.style.height !== 'auto') {
                // 保持 auto 但移除固定高度
              }
            }
            Array.from(el.children).forEach(removeHeightRestrictions);
          };
          
          removeHeightRestrictions(clonedElement);
          
          // 确保 body 也有足够高度
          clonedDoc.body.style.height = `${fullHeight}px`;
          clonedDoc.body.style.minHeight = `${fullHeight}px`;
          clonedDoc.body.style.overflow = 'visible';
        }
      });

      const link = document.createElement('a');
      link.download = `${data.stockName}_Analysis_${data.timestamp.replace(/[\/ :]/g, '')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      // 恢复元素原始样式
      Object.assign(element.style, originalStyles);
      // 恢复导出按钮显示
      if (controls) controls.style.display = controlsDisplay || '';
      // 恢复滚动位置
      window.scrollTo(scrollX, scrollY);
    }
  };

  const handleExportHTML = () => {
    // Icons as SVG strings
    const icons = {
        trendingUp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
        activity: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
        target: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
        clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        sparkles: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>`,
        // Specific Indicator Icons
        rsi: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
        macd: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M6 21V9a9 9 0 0 0 9 9"></path></svg>`,
        bollinger: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
        volume: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>`,
        trend: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
        defaultInd: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        // Action Icons
        arrowUpRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#be123c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>`,
        arrowDownRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="7" x2="17" y2="17"></line><polyline points="17 7 17 17 7 17"></polyline></svg>`
    };

    // Helper to process bold text into highlighted spans
    const formatText = (text: string) => {
        if (!text) return '';
        let index = 0;
        const highlightColors = [
            'background: #eff6ff; color: #1e40af; border: 1px solid #dbeafe;', // blue
            'background: #fff1f2; color: #9f1239; border: 1px solid #ffe4e6;', // rose
            'background: #ecfccb; color: #365314; border: 1px solid #d9f99d;', // lime
            'background: #fff7ed; color: #9a3412; border: 1px solid #ffedd5;', // orange
        ];
        
        return text.replace(/\*\*(.*?)\*\*/g, (match, content) => {
            const style = highlightColors[index % highlightColors.length];
            index++;
            return `<span style="display: inline; padding: 2px 6px; border-radius: 6px; font-weight: 700; font-size: 0.9em; ${style}">${content}</span>`;
        });
    };

    // 为 HTML 导出准备排序后的技术指标
    const htmlOrderedIndicators = ['RSI', 'MACD', '布林带', '成交量', '趋势强度'];
    const htmlDisplayIndicators = htmlOrderedIndicators.map(name => 
      data.technicalIndicators.find(i => i.name.includes(name)) || 
      data.technicalIndicators.find(i => i.name === name) ||
      { name, value: 'N/A', sentiment: 'neutral', signal: 'No data' }
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${data.stockName} (${data.stockCode}) - AI 深度分析报告</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
              
              :root {
                  --bg-color: #f8fafc;
                  --card-bg: #ffffff;
                  --text-main: #111827;
                  --text-secondary: #6b7280;
                  --border-color: #f1f5f9;
              }
              body {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  background-color: var(--bg-color);
                  color: var(--text-main);
                  line-height: 1.5;
                  margin: 0;
                  padding: 40px 20px;
                  -webkit-font-smoothing: antialiased;
              }
              .container {
                  max-width: 1100px;
                  margin: 0 auto;
              }
              
              /* Utilities */
              .flex { display: flex; }
              .items-center { align-items: center; }
              .justify-between { justify-content: space-between; }
              
              /* Header Section */
              .header-card {
                  background: var(--card-bg);
                  border-radius: 32px;
                  padding: 40px;
                  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                  border: 1px solid var(--border-color);
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 32px;
              }
              .stock-title { font-size: 3.5rem; font-weight: 900; line-height: 1; letter-spacing: -0.03em; margin: 0; }
              .stock-badge {
                  background: #fff7ed; color: #ea580c;
                  border: 1px solid #ffedd5;
                  padding: 6px 16px; border-radius: 12px;
                  font-family: monospace; font-weight: 800; font-size: 1.2rem;
                  vertical-align: text-bottom; margin-left: 16px;
              }
              .meta-row { margin-top: 16px; display: flex; align-items: center; gap: 16px; color: #9ca3af; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
              
              /* Recommendation Box */
              .rec-box {
                  padding: 24px 40px;
                  border-radius: 28px;
                  color: white;
                  text-align: center;
                  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15);
                  min-width: 200px;
                  background: #374151; /* Default Dark Grey */
              }
              .rec-buy { background: #dc2626; } /* 红色 - 买入 */
              .rec-sell { background: #16a34a; } /* 绿色 - 卖出 */
              .rec-wait { background: #374151; } /* 灰色 - 观望 */
              
              .rec-subtitle { font-size: 0.7rem; font-weight: 800; opacity: 0.7; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px; display: block; color: #e5e7eb; }
              .rec-title { font-size: 2.2rem; font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 10px; line-height: 1; }
              .rec-title span { color: #facc15; } /* Yellow icon/text for emphasis */
              
              /* Tags */
              .tags-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
              .tag-blue { background: #eff6ff; color: #1e40af; border: 1px solid #dbeafe; padding: 8px 16px; border-radius: 50px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
              .tag-green { background: #f0fdf4; color: #166534; border: 1px solid #dcfce7; padding: 8px 16px; border-radius: 50px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
              
              /* Summary Card */
              .summary-card {
                  background: #f7fee7;
                  border: 1px solid #ecfccb;
                  border-radius: 32px;
                  padding: 40px;
                  margin-bottom: 32px;
              }
              .summary-title { font-size: 1.25rem; font-weight: 800; color: #365314; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
              .summary-text { font-size: 1.05rem; color: #1a2e05; line-height: 1.8; text-align: justify; font-weight: 500; }

              /* Grid Layout */
              .grid-cols-2 { display: grid; grid-template-columns: 4fr 5fr; gap: 32px; }
              
              .section-card {
                  background: white;
                  border-radius: 32px;
                  padding: 40px;
                  border: 1px solid var(--border-color);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.01);
              }
              .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
              .section-title { font-size: 1.5rem; font-weight: 900; display: flex; align-items: center; gap: 12px; color: #111827; margin: 0; }
              .icon-box { width: 40px; height: 40px; background: #f3f4f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #111827; }

              /* Technical Indicators List - Refined */
              .indicator-item { 
                  display: flex; align-items: center; justify-content: space-between; 
                  padding: 24px; 
                  background: #ffffff; 
                  border-radius: 20px; 
                  margin-bottom: 16px; 
                  border: 1px solid #f1f5f9; 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.01);
              }
              .ind-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 20px; flex-shrink: 0; }
              
              .bg-purple-50 { background: #f5f3ff; }
              .bg-blue-50 { background: #eff6ff; }
              .bg-indigo-50 { background: #e0e7ff; }
              .bg-orange-50 { background: #fff7ed; }
              .bg-yellow-50 { background: #fefce8; }
              
              .ind-content { flex: 1; }
              .ind-name { font-weight: 800; font-size: 1.1rem; color: #1f2937; margin-bottom: 4px; display: block; }
              .ind-desc { font-size: 0.85rem; color: #6b7280; font-weight: 500; display: block; }
              
              .ind-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; min-width: 80px; }
              .ind-value { display: none; } /* Hide raw value as per design, mostly semantic labels used */
              .ind-badge { 
                  display: inline-block; padding: 6px 12px; border-radius: 8px; 
                  font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; 
                  background: #fff7ed; color: #c2410c; /* Orange default for 'Neutral' */
              }
              .badge-bullish { background: #fef2f2; color: #ef4444; }
              .badge-bearish { background: #ecfdf5; color: #10b981; }

              /* Action Cards (Big Number Style) */
              .action-card {
                  display: flex; justify-content: space-between; align-items: center;
                  padding: 28px 36px;
                  background: #ffffff;
                  border-radius: 24px;
                  border: 1px solid #f1f5f9;
                  margin-bottom: 20px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
                  position: relative;
                  overflow: hidden;
              }
              .action-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 8px; }
              
              .card-target { background: #fff1f2; border-color: #ffe4e6; }
              .card-target::before { background: #f43f5e; }
              .card-target .action-val { color: #be123c; }
              
              .card-entry { background: #eff6ff; border-color: #dbeafe; }
              .card-entry::before { background: #3b82f6; }
              .card-entry .action-val { color: #1e40af; }
              
              .card-stop { background: #f0fdf4; border-color: #dcfce7; }
              .card-stop::before { background: #22c55e; }
              .card-stop .action-val { color: #15803d; }

              .action-meta { display: flex; flex-direction: column; gap: 8px; }
              .action-label { font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; }
              .action-val { font-size: 2.5rem; font-weight: 900; font-family: monospace; letter-spacing: -0.05em; line-height: 1; }
              .action-tag { 
                  padding: 6px 14px; background: white; border-radius: 50px; 
                  font-size: 0.75rem; font-weight: 900; box-shadow: 0 2px 6px rgba(0,0,0,0.05); 
                  text-transform: uppercase; display: flex; align-items: center; gap: 6px;
              }
              .tag-icon-circle { width: 24px; height: 24px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }

              /* Tech Advice Box */
              .advice-box {
                  margin-top: 32px; padding: 24px;
                  background: #f8fafc; border-radius: 20px;
                  border: 1px dashed #cbd5e1;
              }
              .advice-title { font-weight: 800; font-size: 0.95rem; color: #334155; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
              .advice-text { font-size: 0.95rem; color: #475569; line-height: 1.8; text-align: justify; word-spacing: normal; letter-spacing: normal; }

              /* Logic Box */
              .logic-box { margin-top: 32px; padding: 24px; background: #f9fafb; border-radius: 20px; }
              
              .footer { text-align: center; margin-top: 60px; color: #cbd5e1; font-size: 0.85rem; font-weight: 600; }
          </style>
      </head>
      <body>
          <div class="container">
              <!-- Header -->
              <div class="header-card">
                  <div>
                      <div class="flex items-center">
                          <h1 class="stock-title">${data.stockName}</h1>
                          <span class="stock-badge">${data.stockCode}</span>
                          <span class="strategy-pill" style="margin-left: 16px; background: #f3f4f6; padding: 6px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; color: #4b5563;">
                              ${data.strategyMode}
                          </span>
                      </div>
                      <div class="meta-row">
                          <span class="flex items-center gap-2">${icons.clock} 生成时间: ${data.timestamp}</span>
                          <span style="width: 4px; height: 4px; background: #cbd5e1; border-radius: 50%;"></span>
                          <span>置信度 ${data.confidenceScore}%</span>
                      </div>
                      
                      <!-- Tags -->
                      <div class="tags-row">
                          ${data.keyDrivers.map(d => `
                              <div class="tag-blue">
                                  ${d}
                              </div>
                          `).join('')}
                          <div class="tag-green">${icons.sparkles} ${data.marketSentiment}</div>
                      </div>
                  </div>

                  <!-- Recommendation -->
                  <div class="rec-box ${
                    data.recommendation === 'Buy' ? 'rec-buy' : 
                    data.recommendation === 'Sell' ? 'rec-sell' : 'rec-wait'
                  }">
                      <span class="rec-subtitle">AI RECOMMENDATION</span>
                      <span class="rec-title">
                        ${data.recommendation === 'Buy' ? '建议买入' : 
                          data.recommendation === 'Sell' ? '建议卖出' : '建议观望'}
                        <span>${
                            data.recommendation === 'Buy' ? '🚀' : 
                            data.recommendation === 'Sell' ? '📉' : '⚠️'
                        }</span>
                      </span>
                  </div>
              </div>

              <!-- Summary -->
              <div class="summary-card">
                  <div class="summary-title">
                      ${icons.sparkles} 分析小结
                  </div>
                  <div class="summary-text">
                      ${formatText(data.analysisSummary)}
                  </div>
              </div>

              <!-- Grid Content -->
              <div class="grid-cols-2">
                  <!-- Technical -->
                  <div class="section-card">
                      <div class="section-header">
                          <div class="section-title">
                              <div class="icon-box">${icons.activity}</div>
                              技术指标
                          </div>
                      </div>
                      
                      ${htmlDisplayIndicators.map((ind, i) => {
                          let iconBg = 'bg-purple-50';
                          let iconSvg = icons.rsi;
                          let sentimentClass = '';
                          
                          // Icon Logic
                          if (ind.name.includes('RSI')) { iconBg = 'bg-purple-50'; iconSvg = icons.rsi; }
                          else if (ind.name.includes('MACD')) { iconBg = 'bg-blue-50'; iconSvg = icons.macd; }
                          else if (ind.name.includes('布林')) { iconBg = 'bg-indigo-50'; iconSvg = icons.bollinger; }
                          else if (ind.name.includes('成交')) { iconBg = 'bg-orange-50'; iconSvg = icons.volume; }
                          else if (ind.name.includes('趋势')) { iconBg = 'bg-yellow-50'; iconSvg = icons.trend; }
                          else { iconBg = 'bg-blue-50'; iconSvg = icons.defaultInd; }

                          // Sentiment Color Logic (Strict Matching)
                          const sentimentLower = (ind.sentiment || '').toLowerCase();
                          // Default is Orange (Neutral)
                          if (sentimentLower.includes('bull') || sentimentLower.includes('多') || sentimentLower.includes('买')) {
                              sentimentClass = 'badge-bullish'; // Red
                          } else if (sentimentLower.includes('bear') || sentimentLower.includes('空') || sentimentLower.includes('卖')) {
                              sentimentClass = 'badge-bearish'; // Green
                          }

                          return `
                          <div class="indicator-item">
                              <div class="flex items-center" style="flex: 1;">
                                  <div class="ind-icon ${iconBg}">${iconSvg}</div>
                                  <div>
                                      <div class="ind-name">${ind.name}</div>
                                      <div class="ind-desc">${ind.signal}</div>
                                  </div>
                              </div>
                              <div class="ind-right">
                                  <span class="ind-badge ${sentimentClass}">${ind.value || 'Neutral'}</span>
                              </div>
                          </div>`;
                      }).join('')}
                      
                      <div class="advice-box">
                          <div class="advice-title">${icons.sparkles} 技术面建议</div>
                          <div class="advice-text">${formatText(data.technicalAnalysisAdvice)}</div>
                      </div>
                  </div>

                  <!-- Strategy -->
                  <div class="section-card">
                      <div class="section-header">
                          <div class="section-title">
                              <div class="icon-box">${icons.target}</div>
                              执行策略
                          </div>
                          <div style="background: #ecfccb; color: #365314; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.05em;">ACTION PLAN</div>
                      </div>

                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px;">
                          <div style="background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9;">
                              <span style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 8px; text-transform: uppercase;">主力资金流向</span>
                              <div style="font-weight: 700; color: #334155; line-height: 1.4; font-size: 0.9rem;">${data.fundsFlow.inflow}</div>
                          </div>
                          <div style="background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9;">
                              <span style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 8px; text-transform: uppercase;">市场情绪</span>
                              <div style="font-weight: 700; color: #334155; line-height: 1.4; font-size: 0.9rem;">${data.fundsFlow.retailSentiment}</div>
                          </div>
                      </div>

                      <div class="action-card card-target">
                          <div class="action-meta">
                              <span class="action-label" style="color: #be123c;">${icons.target} 止盈目标 (TARGET)</span>
                              <span class="action-val">${data.strategy.targetPrice}</span>
                          </div>
                          <div class="action-tag" style="color: #be123c;">
                              <div class="tag-icon-circle">${icons.arrowUpRight}</div>
                          </div>
                      </div>

                      <div class="action-card card-entry">
                          <div class="action-meta">
                              <span class="action-label" style="color: #1d4ed8;">${icons.trendingUp} 建议入场 (ENTRY)</span>
                              <span class="action-val">${data.strategy.entryRange}</span>
                          </div>
                          <div class="action-tag" style="background: #3b82f6; color: white;">CORE</div>
                      </div>

                      <div class="action-card card-stop">
                          <div class="action-meta">
                              <span class="action-label" style="color: #15803d;">${icons.activity} 止损警戒 (STOP LOSS)</span>
                              <span class="action-val">${data.strategy.stopLoss}</span>
                          </div>
                          <div class="action-tag" style="color: #15803d;">
                              <div class="tag-icon-circle">${icons.arrowDownRight}</div>
                          </div>
                      </div>

                      <div class="logic-box">
                          <div style="font-weight: 800; font-size: 1rem; color: #111827; margin-bottom: 12px;">策略核心逻辑</div>
                          <div class="advice-text">${formatText(data.strategy.logic)}</div>
                      </div>
                  </div>
              </div>

              <div class="footer">
                  Generated by Lime AI DeepTrading System · ${new Date().getFullYear()}
              </div>
          </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.stockName}_Analysis_${data.timestamp.replace(/[\/ :]/g, '')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
                        <p className="text-xs text-gray-500 pl-11 group-hover:text-gray-700 transition-colors">
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
