
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
  Shield,
  CircleDollarSign,
  Newspaper,
  Megaphone
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
    description: string;
}

const LockedOverlay: React.FC<LockedOverlayProps> = ({ onSubscribe, description }) => (
    <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/40 flex flex-col items-center justify-center rounded-[2rem] border border-white/20">
        <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-lg mb-4">
            <Lock className="text-lime-300" size={24} />
        </div>
        <h4 className="text-xl font-bold text-gray-900 mb-2">Pro 会员专享内容</h4>
        <p className="text-gray-500 font-medium text-sm mb-6 max-w-xs text-center">
            {description}
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
  const isLocked = userTier === 'guest';
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

    let iframe: HTMLIFrameElement | null = null;
    try {
      const source = dashboardRef.current;
      const cloned = source.cloneNode(true) as HTMLElement;
      cloned.querySelectorAll('[data-html2canvas-ignore]').forEach((el) => el.remove());

      const collectCssText = () => {
        let cssText = '';
        const styleSheets = Array.from(document.styleSheets || []);
        for (const sheet of styleSheets) {
          try {
            const rules = (sheet as CSSStyleSheet).cssRules;
            if (!rules) continue;
            for (const rule of Array.from(rules)) {
              cssText += `${rule.cssText}\n`;
            }
          } catch {
          }
        }
        return cssText;
      };

      const cssText = collectCssText();
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1400, initial-scale=1.0" />
    <title>${data.stockName} (${data.stockCode}) - AI 深度分析报告</title>
    <style>
      ${cssText}
      html, body { height: auto; }
      body { margin: 0; padding: 24px; background: #f8fafc; }
    </style>
  </head>
  <body>
    <div id="export-root" style="width: 1400px;">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${cloned.outerHTML}
      </div>
    </div>
  </body>
</html>`;

      iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-100000px';
      iframe.style.top = '0';
      iframe.style.width = '1400px';
      iframe.style.height = '800px';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.srcdoc = htmlContent;
      document.body.appendChild(iframe);

      await new Promise<void>((resolve, reject) => {
        const t = window.setTimeout(() => reject(new Error('Export iframe load timeout')), 8000);
        iframe!.onload = () => {
          window.clearTimeout(t);
          resolve();
        };
      });

      const doc = iframe.contentDocument;
      if (!doc) throw new Error('Export iframe document not available');

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const target = doc.body as unknown as HTMLElement;

      const computeRealHeight = (el: HTMLElement): number => {
        const rect = el.getBoundingClientRect();
        const scrollHeight = el.scrollHeight;
        const offsetHeight = el.offsetHeight;
        let maxBottom = 0;
        const walkDOM = (node: Element, parentTop: number) => {
          const nodeRect = (node as HTMLElement).getBoundingClientRect();
          const bottom = nodeRect.bottom - parentTop;
          if (bottom > maxBottom) maxBottom = bottom;
          Array.from(node.children).forEach(child => walkDOM(child, parentTop));
        };
        walkDOM(el, rect.top);
        return Math.max(scrollHeight, offsetHeight, maxBottom);
      };

      const fullWidth = 1400;
      const fullHeight = Math.ceil(computeRealHeight(target));
      (doc.documentElement as HTMLElement).style.height = `${fullHeight}px`;
      (doc.body as HTMLElement).style.height = `${fullHeight}px`;
      (doc.body as HTMLElement).style.overflow = 'visible';

      const MAX_CANVAS_DIM = 16384;
      const preferredScale = 2;
      const safeScale = Math.min(
        preferredScale,
        MAX_CANVAS_DIM / Math.max(1, fullWidth),
        MAX_CANVAS_DIM / Math.max(1, fullHeight)
      );
      const scale = Math.max(0.5, safeScale);
      const maxTileHeight = Math.max(512, Math.floor(MAX_CANVAS_DIM / scale) - 20);

      const tiles: HTMLCanvasElement[] = [];
      for (let y = 0; y < fullHeight; y += maxTileHeight) {
        const tileHeight = Math.min(maxTileHeight, fullHeight - y);
        // eslint-disable-next-line no-await-in-loop
        const tileCanvas = await html2canvas(target, {
          scale,
          useCORS: true,
          backgroundColor: '#F8FAFC',
          logging: false,
          width: fullWidth,
          height: tileHeight,
          windowWidth: fullWidth,
          windowHeight: tileHeight,
          scrollX: 0,
          scrollY: 0,
          allowTaint: true,
          x: 0,
          y,
        } as any);
        tiles.push(tileCanvas);
      }

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = Math.round(fullWidth * scale);
      finalCanvas.height = Math.round(fullHeight * scale);
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');
      let drawY = 0;
      for (const t of tiles) {
        ctx.drawImage(t, 0, drawY);
        drawY += t.height;
      }

      const link = document.createElement('a');
      link.download = `${data.stockName}_Analysis_${data.timestamp.replace(/[\/ :]/g, '')}.png`;
      link.href = finalCanvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
  };

  const handleExportHTML = () => {
    if (!dashboardRef.current) return;
    try {
      const collectCssText = () => {
        let cssText = '';
        const styleSheets = Array.from(document.styleSheets || []);
        for (const sheet of styleSheets) {
          try {
            const rules = (sheet as CSSStyleSheet).cssRules;
            if (!rules) continue;
            for (const rule of Array.from(rules)) {
              cssText += `${rule.cssText}\n`;
            }
          } catch {
            // Ignore cross-origin or inaccessible stylesheets
          }
        }
        return cssText;
      };

      const cssText = collectCssText();
      const cloned = dashboardRef.current.cloneNode(true) as HTMLElement;
      cloned.querySelectorAll('[data-html2canvas-ignore]').forEach((el) => el.remove());

      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${data.stockName} (${data.stockCode}) - AI 深度分析报告</title>
    <style>
      ${cssText}
      html, body { height: auto; }
      body { margin: 0; padding: 24px; background: #f8fafc; }
    </style>
  </head>
  <body>
    <div style="max-width: 1200px; margin: 0 auto;">
      ${cloned.outerHTML}
    </div>
  </body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.stockName}_Analysis_${data.timestamp.replace(/[\/ :]/g, '')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
    return;
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

    const htmlTechAdviceText = (() => {
        const v: any = data.technicalAnalysisAdvice as any;
        if (!v) return '';
        if (typeof v === 'string') return v;
        const points = Array.isArray(v.points) ? v.points.join('\n') : '';
        const summary = typeof v.summary === 'string' ? v.summary : '';
        return [points, summary].filter(Boolean).join('\n');
    })();

    const htmlStrategyLogicText = (() => {
        const v: any = data.strategy?.logic as any;
        if (!v) return '';
        if (typeof v === 'string') return v;
        const points = Array.isArray(v.points) ? v.points.join('\n') : '';
        const risk = typeof v.riskWarning === 'string' ? `风险提示: ${v.riskWarning}` : '';
        return [points, risk].filter(Boolean).join('\n');
    })();

    const htmlMoneyFlow = (() => {
      const m = data.moneyFlowMonitor;
      const formatYi = (v: number | null | undefined) => {
        if (v === null || v === undefined || Number.isNaN(Number(v))) return '--';
        const n = Number(v);
        const abs = Math.abs(n);
        const txt = abs.toFixed(2);
        return `${n >= 0 ? '+' : '-'}${txt}亿`;
      };
      const formatAbsYi = (v: number | null | undefined) => {
        if (v === null || v === undefined || Number.isNaN(Number(v))) return '--';
        const n = Math.abs(Number(v));
        const txt = n.toFixed(2);
        return `${txt}亿`;
      };
      const inflowClass = (v: number | null | undefined) => {
        if (v === null || v === undefined || Number.isNaN(Number(v))) return 'inflow-neutral';
        const n = Number(v);
        if (n > 0) return 'inflow-pos';
        if (n < 0) return 'inflow-neg';
        return 'inflow-neutral';
      };
      const inflows = [m?.netInflow3d, m?.netInflow5d, m?.netInflow20d]
        .map(v => (v === null || v === undefined ? null : Number(v)))
        .filter(v => v !== null && !Number.isNaN(v as number)) as number[];
      const pos = inflows.filter(v => v > 0).length;
      const neg = inflows.filter(v => v < 0).length;
      const summary = inflows.length === 0
        ? '暂无资金流向数据，建议结合量价观察。'
        : pos >= 2
          ? '主力资金偏流入，做多意愿较强，关注回踩承接。'
          : neg >= 2
            ? '主力资金偏流出，短线承压，等待企稳信号。'
            : '资金分歧加大，短线震荡为主，控制仓位。';
      const scoreRaw = m?.fundSentimentIndex ?? m?.retailSentimentRatio;
      const score = scoreRaw === null || scoreRaw === undefined || Number.isNaN(Number(scoreRaw))
        ? 50
        : Math.max(0, Math.min(100, Number(scoreRaw)));
      const sentimentText = m?.fundSentimentLevel || (score >= 75 ? '极度乐观' : score >= 50 ? '乐观' : score >= 25 ? '中性' : '恐慌');
      const sentimentPillClass = sentimentText === '极度乐观'
        ? 'pill-rose'
        : sentimentText === '乐观'
          ? 'pill-amber'
          : sentimentText === '恐慌'
            ? 'pill-emerald'
            : 'pill-purple';

      return {
        m,
        formatYi,
        formatAbsYi,
        inflowClass,
        summary,
        score,
        sentimentText,
        sentimentPillClass,
      };
    })();

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

              /* Money Flow */
              .money-card { background: white; border-radius: 32px; padding: 40px; border: 1px solid var(--border-color); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.01); margin-top: 32px; }
              .money-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; text-align: center; }
              .money-item { padding: 16px 10px; border-radius: 18px; background: #f9fafb; border: 1px solid #f3f4f6; }
              .money-label { font-size: 0.8rem; font-weight: 800; color: #6b7280; margin-bottom: 6px; }
              .money-val { font-size: 1.4rem; font-weight: 900; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; letter-spacing: -0.03em; }
              .inflow-pos { color: #e11d48; }
              .inflow-neg { color: #059669; }
              .inflow-neutral { color: #111827; }
              .money-summary { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 0.95rem; color: #4b5563; font-weight: 600; display: flex; align-items: flex-start; gap: 10px; line-height: 1.6; }
              .pill { display: inline-block; font-size: 0.85rem; font-weight: 800; padding: 6px 12px; border-radius: 12px; }
              .pill-rose { background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; }
              .pill-emerald { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
              .pill-purple { background: #faf5ff; color: #7c3aed; border: 1px solid #ede9fe; }
              .pill-amber { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }
              .sentiment-row { margin-top: 20px; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9; background: #ffffff; }
              .sentiment-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
              .sentiment-title { font-size: 0.75rem; font-weight: 900; color: #9ca3af; letter-spacing: 0.08em; text-transform: uppercase; }
              .sentiment-bar { position: relative; height: 10px; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
              .sentiment-fill { height: 100%; background: linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%); border-radius: 999px; }
              .sentiment-meta { display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.75rem; font-weight: 800; color: #9ca3af; }
              
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
                          <div class="advice-text">${formatText(htmlTechAdviceText)}</div>
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
                          <div class="advice-text">${formatText(htmlStrategyLogicText)}</div>
                      </div>
                  </div>
              </div>

              <!-- Money Flow & Sentiment -->
              <div class="money-card">
                  <div class="section-header" style="margin-bottom: 24px;">
                      <div class="section-title" style="margin: 0;">
                          <div class="icon-box">${icons.trendingUp}</div>
                          资金与情绪监控
                      </div>
                  </div>

                  <div style="background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 24px; padding: 22px;">
                      <div style="font-size: 0.75rem; font-weight: 900; color: #9ca3af; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px;">主力资金净流入趋势</div>
                      <div class="money-grid">
                          <div class="money-item">
                              <div class="money-label">3日净流入</div>
                              <div class="money-val ${htmlMoneyFlow.inflowClass(htmlMoneyFlow.m?.netInflow3d)}">${htmlMoneyFlow.formatYi(htmlMoneyFlow.m?.netInflow3d)}</div>
                          </div>
                          <div class="money-item">
                              <div class="money-label">5日净流入</div>
                              <div class="money-val ${htmlMoneyFlow.inflowClass(htmlMoneyFlow.m?.netInflow5d)}">${htmlMoneyFlow.formatYi(htmlMoneyFlow.m?.netInflow5d)}</div>
                          </div>
                          <div class="money-item">
                              <div class="money-label">20日净流入</div>
                              <div class="money-val ${htmlMoneyFlow.inflowClass(htmlMoneyFlow.m?.netInflow20d)}">${htmlMoneyFlow.formatYi(htmlMoneyFlow.m?.netInflow20d)}</div>
                          </div>
                      </div>

                      <div style="margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                          <div style="background: #ffffff; border: 1px solid #eef2ff; border-radius: 16px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
                              <div style="font-size: 0.75rem; font-weight: 900; color: #9ca3af; letter-spacing: 0.08em; text-transform: uppercase;">当日主力买入</div>
                              <div style="font-size: 1rem; font-weight: 900; color: #111827;">${htmlMoneyFlow.formatAbsYi(htmlMoneyFlow.m?.mainBuyAmount)}</div>
                          </div>
                          <div style="background: #ffffff; border: 1px solid #fef3c7; border-radius: 16px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
                              <div style="font-size: 0.75rem; font-weight: 900; color: #9ca3af; letter-spacing: 0.08em; text-transform: uppercase;">当日主力卖出</div>
                              <div style="font-size: 1rem; font-weight: 900; color: #111827;">${htmlMoneyFlow.formatAbsYi(htmlMoneyFlow.m?.mainSellAmount)}</div>
                          </div>
                      </div>

                      <div class="money-summary">
                          ${icons.trendingUp}
                          <div>${htmlMoneyFlow.summary}</div>
                      </div>
                  </div>

                  <div class="sentiment-row">
                      <div class="sentiment-head">
                          <div class="sentiment-title">资金情绪指数</div>
                          <div class="pill ${htmlMoneyFlow.sentimentPillClass}">${htmlMoneyFlow.sentimentText}</div>
                      </div>
                      <div class="sentiment-bar">
                          <div class="sentiment-fill" style="width: ${htmlMoneyFlow.score}%;"></div>
                      </div>
                      <div class="sentiment-meta">
                          <span>恐慌(0)</span>
                          <span>中性(33)</span>
                          <span>乐观(66)</span>
                          <span>极度乐观(100)</span>
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

  // 如果有真实数据，优先使用真实数据的技术指标
  const getRealDataIndicators = () => {
    if (!data.realData?.indicators) return null;
    
    const { rsi, macd, bollingerBands, volume, trendStrength } = data.realData.indicators;
    
    return [
      {
        name: 'RSI',
        value: rsi.status,
        status: rsi.status,
        signal: rsi.interpretation,
        sentiment: rsi.sentiment,
        realValue: rsi.value
      },
      {
        name: 'MACD',
        value: macd.status,
        status: macd.status,
        signal: macd.interpretation,
        sentiment: macd.sentiment,
        realValue: `DIF:${macd.dif} DEA:${macd.dea}`
      },
      {
        name: '布林带',
        value: bollingerBands.status,
        status: bollingerBands.status,
        signal: bollingerBands.interpretation,
        sentiment: bollingerBands.sentiment,
        realValue: `位置:${bollingerBands.currentPosition}`
      },
      {
        name: '成交量',
        value: volume.status,
        status: volume.status,
        signal: volume.interpretation,
        sentiment: volume.sentiment,
        realValue: volume.latest
      },
      {
        name: '趋势强度',
        value: trendStrength.status,
        status: trendStrength.status,
        signal: trendStrength.interpretation,
        sentiment: trendStrength.sentiment,
        realValue: `强度:${trendStrength.strength}`
      }
    ];
  };

  // 优先使用真实数据，否则回退到 AI 生成的指标
  const realIndicators = getRealDataIndicators();
  const displayIndicators = realIndicators || orderedIndicators.map(name => 
    data.technicalIndicators.find(i => i.name.includes(name)) || 
    data.technicalIndicators.find(i => i.name === name) ||
    { name, value: 'N/A', sentiment: 'neutral', signal: 'No data' } as any
  );
  
  // 是否有真实数据
  const hasRealData = !!data.realData;

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
          
          {/* Left Column: Technicals & News */}
          <div className="space-y-6 h-fit">
              
              {/* Technical Indicators */}
              <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 h-fit">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Layers size={20} className="text-blue-500" />
                        技术指标
                    </h3>
                    {hasRealData && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={10} /> 实时数据
                      </span>
                    )}
                </div>

                {/* Indicator List */}
                <div className="space-y-6 mb-8">
                    {displayIndicators.map((tech: any, idx: number) => (
                    <div key={idx} className="group">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                                   {getIndicatorIcon(tech.name)}
                                </div>
                                <span className="font-bold text-gray-700 w-24 truncate" title={tech.name}>{tech.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* 显示真实数值（如果有） */}
                              {tech.realValue && (
                                <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                                  {tech.realValue}
                                </span>
                              )}
                              <span className={`font-bold text-xs md:text-sm text-right px-3 py-1.5 rounded-lg shadow-sm ${
                                tech.sentiment === 'bullish' 
                                  ? 'text-rose-700 bg-rose-50 border border-rose-100' 
                                  : tech.sentiment === 'bearish' 
                                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' 
                                    : 'text-orange-700 bg-orange-50 border border-orange-100'
                              }`}>
                                  {tech.value}
                              </span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 pl-11 group-hover:text-gray-700 transition-colors">
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

                   {typeof data.technicalAnalysisAdvice !== 'string' && data.technicalAnalysisAdvice?.points ? (
                     <>
                       <ul className="space-y-3 mb-6">
                         {data.technicalAnalysisAdvice.points.map((point: string, i: number) => (
                           <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed font-medium">
                             <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                             <span><HighlightText text={point} /></span>
                           </li>
                         ))}
                       </ul>

                       <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-bold border border-violet-200">
                         <Zap size={14} className="fill-violet-700" />
                         <HighlightText text={data.technicalAnalysisAdvice.summary} />
                       </div>
                     </>
                   ) : (
                     <HighlightText 
                        text={(data.technicalAnalysisAdvice as any) || "RSI 和 MACD 显示当前趋势稳健，布林带开口向上，建议关注成交量配合情况。"} 
                        className="text-base font-medium text-slate-700 leading-relaxed"
                     />
                   )}
                </div>
              </div>

              {/* 舆情风向分析 */}
              <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <Newspaper size={20} className="text-purple-500" />
                          舆情风向分析
                      </h3>
                      {data.newsAnalysis && (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${data.newsAnalysis.sentimentScore > 60 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          热度 {data.newsAnalysis.sentimentScore}
                        </span>
                      )}
                  </div>

                  <div className="space-y-4">
                     {(data.newsAnalysis?.news || []).map((item: any, idx: number) => (
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

                  {data.newsAnalysis?.summary && (
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <div className="flex gap-2 items-start">
                        <Megaphone size={16} className="text-purple-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                          <HighlightText text={data.newsAnalysis.summary} />
                        </p>
                      </div>
                    </div>
                  )}
              </div>
          </div>

          {/* Right Column: Strategy & Funds */}
          <div className="space-y-6 h-fit">

              {/* Strategy Execution */}
              <div className="bg-white rounded-[2rem] p-5 md:p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col relative overflow-hidden h-fit">
                  {isLocked && (
                    <LockedOverlay
                      onSubscribe={onSubscribe}
                      description="解锁精准买卖点位、建仓区间、止盈止损与策略逻辑推演。"
                    />
                  )}
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold flex items-center gap-3 text-gray-900">
                          <div className="p-2 bg-gray-100 rounded-xl shadow-sm text-gray-600 border border-gray-200"><BarChart2 size={20} /></div>
                          执行策略
                        </h3>
                        <span className="px-3 py-1 bg-lime-100 text-lime-700 rounded-full text-xs font-bold border border-lime-200">ACTION PLAN</span>
                    </div>
                    
                    <div className={`flex flex-col gap-6 ${isLocked ? 'blur-sm select-none' : ''}`}>
                       
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 text-center relative overflow-hidden group">
                              <div className="text-rose-600 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                                 <Target size={12} /> 止盈目标
                              </div>
                              <div className="text-xl font-black text-gray-900">{data.strategy.targetPrice}</div>
                              <div className="text-[10px] text-rose-400 mt-1 font-medium">第一阻力位</div>
                          </div>

                          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 text-center">
                              <div className="text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                                 <MoveDown size={12} /> 建仓区间
                              </div>
                              <div className="text-xl font-black text-gray-900">{data.strategy.entryRange}</div>
                              <div className="text-[10px] text-blue-400 mt-1 font-medium">分批低吸</div>
                          </div>

                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                              <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                                 <Shield size={12} /> 止损线
                              </div>
                              <div className="text-xl font-black text-gray-900">{data.strategy.stopLoss}</div>
                              <div className="text-[10px] text-gray-400 mt-1 font-medium">跌破离场</div>
                          </div>
                       </div>

                       <div className="mt-2">
                          <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold">
                             <Layers size={18} className="text-gray-400" />
                             策略逻辑推演
                          </div>

                          {typeof data.strategy.logic !== 'string' && (data.strategy.logic as any)?.points ? (
                            <ul className="space-y-4">
                              {(data.strategy.logic as any).points.map((point: string, i: number) => (
                                <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed font-medium">
                                  <span className="font-bold text-black min-w-[14px]">{i + 1}.</span>
                                  <span><HighlightText text={point} /></span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <HighlightText 
                              text={data.strategy.logic as any}
                              className="text-sm text-gray-600 leading-relaxed font-medium" 
                            />
                          )}
                       </div>

                       {typeof data.strategy.logic !== 'string' && (data.strategy.logic as any)?.riskWarning && (
                         <div className="mt-2">
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3 items-start">
                               <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                               <div className="text-xs text-orange-800 font-medium leading-relaxed">
                                  <span className="font-bold text-orange-900 mr-1">风险提示:</span>
                                  {(data.strategy.logic as any).riskWarning}
                               </div>
                            </div>
                         </div>
                       )}
                    </div>
                  </div>
              </div>

              {/* 资金与情绪监控 */}
              <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden">
                  {isLocked && (
                    <LockedOverlay
                      onSubscribe={onSubscribe}
                      description="解锁主力资金净流入、3/5/20 日资金趋势与资金情绪指数监控。"
                    />
                  )}

                  {(() => {
                    const m = data.moneyFlowMonitor;
                    const formatYi = (v: number | null | undefined) => {
                      if (v === null || v === undefined || Number.isNaN(Number(v))) return '--';
                      const n = Number(v);
                      const abs = Math.abs(n);
                      const txt = abs.toFixed(2);
                      return `${n >= 0 ? '+' : '-'}${txt}亿`;
                    };
                    const formatAbsYi = (v: number | null | undefined) => {
                      if (v === null || v === undefined || Number.isNaN(Number(v))) return '--';
                      const n = Math.abs(Number(v));
                      const txt = n.toFixed(2);
                      return `${txt}亿`;
                    };
                    const getInflowClass = (v: number | null | undefined) => {
                      if (v === null || v === undefined || Number.isNaN(Number(v))) return 'text-gray-900';
                      const n = Number(v);
                      if (n > 0) return 'text-rose-600';
                      if (n < 0) return 'text-emerald-600';
                      return 'text-gray-900';
                    };
                    const scoreRaw = m?.fundSentimentIndex ?? m?.retailSentimentRatio;
                    const score = scoreRaw === null || scoreRaw === undefined || Number.isNaN(Number(scoreRaw))
                      ? 50
                      : Math.max(0, Math.min(100, Number(scoreRaw)));
                    const sentimentText = m?.fundSentimentLevel || (score >= 75 ? '极度乐观' : score >= 50 ? '乐观' : score >= 25 ? '中性' : '恐慌');
                    const inflows = [m?.netInflow3d, m?.netInflow5d, m?.netInflow20d]
                      .map(v => (v === null || v === undefined ? null : Number(v)))
                      .filter(v => v !== null && !Number.isNaN(v as number)) as number[];
                    const pos = inflows.filter(v => v > 0).length;
                    const neg = inflows.filter(v => v < 0).length;
                    const moneySummary = inflows.length === 0
                      ? '暂无资金流向数据，建议结合量价观察。'
                      : pos >= 2
                        ? '主力资金偏流入，做多意愿较强，关注回踩承接。'
                        : neg >= 2
                          ? '主力资金偏流出，短线承压，等待企稳信号。'
                          : '资金分歧加大，短线震荡为主，控制仓位。';

                    return (
                      <div className={`space-y-6 ${isLocked ? 'blur-sm select-none' : ''}`}>
                          <div className="flex items-center gap-2">
                             <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shadow-sm">
                                <CircleDollarSign size={20} />
                             </div>
                             <h3 className="font-bold text-gray-900 text-lg">资金与情绪监控</h3>
                          </div>

                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">主力资金净流入趋势</div>
                             <div className="grid grid-cols-3 gap-2 text-center divide-x divide-gray-200">
                                 <div>
                                     <div className="text-xs text-gray-500 font-bold mb-1">3日净流入</div>
                                     <div className={`text-sm font-black ${getInflowClass(m?.netInflow3d)}`}>{formatYi(m?.netInflow3d)}</div>
                                 </div>
                                 <div>
                                     <div className="text-xs text-gray-500 font-bold mb-1">5日净流入</div>
                                     <div className={`text-sm font-black ${getInflowClass(m?.netInflow5d)}`}>{formatYi(m?.netInflow5d)}</div>
                                 </div>
                                 <div>
                                     <div className="text-xs text-gray-500 font-bold mb-1">20日净流入</div>
                                     <div className={`text-sm font-black ${getInflowClass(m?.netInflow20d)}`}>{formatYi(m?.netInflow20d)}</div>
                                 </div>
                             </div>
                             <div className="grid grid-cols-2 gap-2 mt-3">
                                 <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                                     <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">当日主力买入</div>
                                     <div className="text-sm font-black text-gray-900">{formatAbsYi(m?.mainBuyAmount)}</div>
                                 </div>
                                 <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                                     <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">当日主力卖出</div>
                                     <div className="text-sm font-black text-gray-900">{formatAbsYi(m?.mainSellAmount)}</div>
                                 </div>
                             </div>
                             <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 font-medium leading-relaxed flex items-start gap-2">
                                 <TrendingUp size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                 {moneySummary}
                             </div>
                          </div>

                          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative group">
                             <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">资金情绪指数</span>
                                <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${sentimentText === '极度乐观' ? 'bg-rose-50 text-rose-600' : sentimentText === '乐观' ? 'bg-amber-50 text-amber-600' : sentimentText === '恐慌' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                                    {sentimentText}
                                </span>
                             </div>

                             <div 
                               className="h-3 w-full rounded-full relative mb-2 cursor-pointer"
                               style={{ background: 'linear-gradient(to right, #34d399 0%, #a78bfa 33%, #fbbf24 66%, #fb7185 100%)' }}
                               onMouseEnter={() => setShowSentimentTooltip(true)}
                               onMouseLeave={() => setShowSentimentTooltip(false)}
                             >
                                <div 
                                    className="absolute -top-1.5 w-6 h-6 bg-white border-2 border-gray-800 rounded-full shadow-md flex items-center justify-center transition-all duration-1000 ease-out"
                                    style={{ left: `calc(${score}% - 12px)` }}
                                >
                                    <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
                                </div>

                                {showSentimentTooltip && (
                                    <div 
                                        className="absolute -top-10 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200"
                                        style={{ left: `${score}%` }}
                                    >
                                        {Math.round(score)}
                                        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                    </div>
                                )}
                             </div>

                             <div className="flex justify-between text-[10px] text-gray-400 font-bold px-1">
                                <span className="text-emerald-500">恐慌 (0)</span>
                                <span className="text-gray-400">中性 (33)</span>
                                <span className="text-amber-500">乐观 (66)</span>
                                <span className="text-rose-500">极度乐观 (100)</span>
                             </div>
                          </div>
                      </div>
                    );
                  })()}
              </div>
          </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
