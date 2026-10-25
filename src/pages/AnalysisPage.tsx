import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  ChevronRight,
  Crown,
  History as HistoryIcon,
  Image as ImageIcon,
  Lightbulb,
  Lock,
  RefreshCw,
  Search,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';
import { generateStockAnalysis, analyzeKlineImage } from '../services/geminiService';
import { apiFetch } from '../services/api';
import type { AIAnalysisReport } from '../types';
import { useSession } from '../app/session';
import { useNotifications } from '../app/notifications';
import { useRouter } from '../app/router';
import { useToast } from '../hooks/useToast';
import { useClickOutside } from '../hooks/useInteractions';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import stockDataRaw from '../data/stockData.json';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Button, IconButton } from '../components/ui/Button';
import { SurfaceCard } from '../components/ui/Surface';
import { EmptyState, ErrorState } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Overlay';
import ReportView from '../features/report/ReportView';
import { AnalysisLoading } from '../features/analysis/AnalysisLoading';

const stockList = Object.entries(stockDataRaw as Record<string, string>).map(([code, name]) => ({
  code,
  name,
  searchStr: `${code}${name}`,
}));

const STRATEGIES = [
  {
    id: 'technical',
    icon: BrainCircuit,
    label: '趋势跟踪策略',
    desc: '适合中长线稳健投资，捕捉主升浪与趋势延续。',
  },
  {
    id: 'short_term',
    icon: Zap,
    label: '短线博弈策略',
    desc: '关注波段节奏与资金流向，适合短线交易者。',
  },
];

const TRENDING = [
  { code: '600519', name: '贵州茅台' },
  { code: '300750', name: '宁德时代' },
  { code: '601138', name: '工业富联' },
  { code: '002347', name: '泰达股份' },
];

const AnalysisPage: React.FC = () => {
  const { tier, isGuest, refreshToken, handleAnalysisComplete, history } = useSession();
  const { notifyAnalysisComplete } = useNotifications();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const reducedMotion = usePrefersReducedMotion();

  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [strategy, setStrategy] = useState('technical');
  const [query, setQuery] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidStockCode, setInvalidStockCode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisReport | null>(null);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [quota, setQuota] = useState<{ remainingSuccess: number; isUnlimited: boolean } | null>(null);

  const [suggestions, setSuggestions] = useState<{ code: string; name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  useClickOutside(searchRef, () => setShowSuggestions(false), showSuggestions);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const isPro = tier === 'pro';

  // 额度查询
  const fetchQuota = useCallback(async () => {
    if (isGuest) return;
    try {
      const data: any = await apiFetch('/api/usage/summary');
      const remaining = Number(data?.remainingSuccess ?? 0);
      setQuota({
        remainingSuccess: Number.isFinite(remaining) ? remaining : 0,
        isUnlimited: Boolean(data?.isUnlimited),
      });
    } catch {
      // 忽略，保持未知态
    }
  }, [isGuest]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  // 从热门股点击预填代码
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('prefill_stock_code');
      if (prefill) {
        setQuery(prefill);
        sessionStorage.removeItem('prefill_stock_code');
      }
    } catch {
      // ignore
    }
  }, []);

  // 开发验收专用：?mockreport=1 时加载演示报告（生产构建剔除）
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!new URLSearchParams(window.location.search).get('mockreport')) return;
    import('../features/report/mockReport').then(({ MOCK_REPORT }) => {
      setAnalysisResult(MOCK_REPORT);
      setShowResult(true);
    });
  }, []);

  // 计时器（不伪造进度，只显示真实等待时长）
  useEffect(() => {
    if (!isAnalyzing) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  const isLimitReached = useMemo(() => {
    if (isGuest || isPro) return false;
    if (!quota) return false;
    if (quota.isUnlimited) return false;
    return quota.remainingSuccess <= 0;
  }, [isGuest, isPro, quota]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const matches = stockList.filter((item) => item.searchStr.includes(val)).slice(0, 8);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const pickSuggestion = (item: { code: string; name: string }) => {
    setQuery(`${item.code} ${item.name}`);
    setShowSuggestions(false);
  };

  const acceptFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }
    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageFile(null);
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (isGuest) {
      setShowLoginRequired(true);
      return;
    }
    if (isLimitReached) {
      navigate('/app/subscription');
      return;
    }
    if (inputMode === 'text' && !query.trim()) return;
    if (inputMode === 'image' && !selectedImageFile) return;

    setShowResult(true);
    setIsAnalyzing(true);
    setError(null);
    setInvalidStockCode(false);
    setAnalysisResult(null);

    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }, 80);

    const strategyLabel = STRATEGIES.find((s) => s.id === strategy)?.label || '趋势跟踪策略';

    try {
      let result: AIAnalysisReport | null = null;
      if (inputMode === 'image' && selectedImageFile) {
        result = await analyzeKlineImage(selectedImageFile, 'K线识图策略', query);
      } else {
        result = await generateStockAnalysis(query, null, strategyLabel);
      }

      setIsAnalyzing(false);
      if (result) {
        setAnalysisResult(result);
        handleAnalysisComplete(result);
        const rid = (result as any)?.id ? String((result as any).id) : '';
        if (rid) notifyAnalysisComplete(rid, result.stockName, result.stockCode);
        fetchQuota();
        refreshToken();
      } else {
        setError('分析服务返回为空，请稍后重试。');
      }
    } catch (err: any) {
      setIsAnalyzing(false);
      if (err?.code === 'INVALID_STOCK_CODE') {
        setInvalidStockCode(true);
      } else {
        setError(err?.message || '分析请求失败，请检查网络后重试。');
      }
    }
  };

  const openHistoryReport = (report: AIAnalysisReport) => {
    setAnalysisResult(report);
    setShowResult(true);
    setIsAnalyzing(false);
    setError(null);
    setQuery(report.stockCode);
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }, 80);
  };

  const inputReady = inputMode === 'text' ? query.trim().length > 0 : Boolean(selectedImageFile);

  return (
    <div className="ana-layout anim-page">
      {/* ============ 主列 ============ */}
      <div className="ana-main">
        <SurfaceCard xl pad className="ana-panel">
          <div className="ana-panel__head">
            <div className="card__title" style={{ fontSize: 16 }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'var(--ink)',
                  color: '#7eddb2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BrainCircuit size={18} />
              </span>
              智能分析中心
            </div>
            {!isPro && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className={`quota-pill ${quota && !quota.isUnlimited && quota.remainingSuccess <= 3 ? 'quota-pill--warn' : ''}`}>
                  <Zap size={13} />
                  {isGuest
                    ? '登录后可用'
                    : quota
                      ? quota.isUnlimited
                        ? '额度不限'
                        : `剩余 ${quota.remainingSuccess} 次`
                      : '额度加载中'}
                </span>
                {!isGuest && (
                  <button
                    type="button"
                    onClick={() => navigate('/app/subscription')}
                    style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Crown size={13} style={{ color: 'var(--blue)' }} /> 升级解锁不限额度
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
            {/* 输入模式 */}
            <SegmentedControl
              block
              ariaLabel="选择输入方式"
              value={inputMode}
              onChange={setInputMode}
              options={[
                { value: 'text', label: '代码诊断', icon: <Search size={15} /> },
                { value: 'image', label: 'K 线识图', icon: <ImageIcon size={15} /> },
              ]}
            />

            {inputMode === 'image' && (
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  background: 'var(--amber-pale)',
                  border: '1px solid #f0e0bd',
                  borderRadius: 'var(--r-md)',
                  padding: '11px 14px',
                }}
              >
                <AlertTriangle size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12.5, color: 'var(--amber)', lineHeight: 1.6, fontWeight: 600 }}>
                  请确保截图中包含股票代码，以保证数据准确。识图分析整体耗时约 30–50 秒。
                </p>
              </div>
            )}

            {/* 输入区 */}
            {inputMode === 'text' ? (
              <div>
                <div className="input-wrap" ref={searchRef} style={{ position: 'relative' }}>
                  <input
                    className="input input--lg"
                    type="text"
                    value={query}
                    onChange={handleQueryChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isAnalyzing && inputReady) handleAnalyze();
                    }}
                    disabled={isAnalyzing}
                    placeholder="输入股票代码，如 600519"
                    aria-label="股票代码"
                    style={{ paddingLeft: 46, paddingRight: 44 }}
                  />
                  <span className="input-wrap__icon" style={{ left: 15 }}>
                    <Search size={19} />
                  </span>
                  {query && (
                    <span className="input-wrap__action">
                      <button
                        type="button"
                        aria-label="清空输入"
                        onClick={() => { setQuery(''); setSuggestions([]); }}
                        style={{ padding: 7, color: 'var(--text-3)', display: 'flex' }}
                      >
                        <X size={15} />
                      </button>
                    </span>
                  )}

                  {showSuggestions && suggestions.length > 0 && (
                    <SurfaceCard className="suggest-pop">
                      {suggestions.map((item) => (
                        <button key={item.code} type="button" className="suggest-item" onClick={() => pickSuggestion(item)}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <span className="mono">{item.code}</span>
                            <span style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </span>
                          </span>
                          <ChevronRight size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        </button>
                      ))}
                    </SurfaceCard>
                  )}
                </div>

                {/* 热门代码 */}
                <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, overflowX: 'auto', paddingBottom: 2 }}>
                  <span
                    className="chip chip--up"
                    style={{ flexShrink: 0 }}
                  >
                    热门
                  </span>
                  {TRENDING.map((stock) => (
                    <button
                      key={stock.code}
                      type="button"
                      onClick={() => setQuery(stock.code)}
                      className="chip chip--outline"
                      style={{ flexShrink: 0, height: 28, cursor: 'pointer' }}
                    >
                      {stock.name}
                      <span className="mono" style={{ opacity: 0.65 }}>{stock.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" hidden />
                {!previewImage ? (
                  <div
                    className={`upload-zone ${isDragOver ? 'upload-zone--drag' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) acceptFile(file);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                    }}
                    aria-label="上传 K 线截图"
                  >
                    <span className="upload-zone__icon">
                      <UploadCloud size={26} />
                    </span>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>点击或拖拽上传 K 线截图</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>支持 JPG / PNG，AI 自动识别形态</span>
                  </div>
                ) : (
                  <div className="upload-preview">
                    <img src={previewImage} alt="K 线截图预览" />
                    <div className="upload-preview__bar">
                      <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <RefreshCw size={13} /> 更换
                      </Button>
                      <IconButton label="移除图片" onClick={clearImage}>
                        <X size={15} />
                      </IconButton>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 策略 */}
            <div>
              <div className="field__label" style={{ marginBottom: 10 }}>分析策略</div>
              <div className="strategy-grid">
                {STRATEGIES.map((s) => {
                  const Icon = s.icon;
                  const active = strategy === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`strategy-option ${active ? 'strategy-option--active' : ''}`}
                      onClick={() => setStrategy(s.id)}
                      aria-pressed={active}
                    >
                      <span className="strategy-option__icon">
                        <Icon size={19} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 800, fontSize: 14.5 }}>{s.label}</span>
                        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.6 }}>
                          {s.desc}
                        </span>
                      </span>
                      {active && (
                        <span className="strategy-option__check">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                            <path d="M1.5 5.2 4 7.6 8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="ana-submit" onClick={handleAnalyze} disabled={isAnalyzing || !inputReady}>
              {isAnalyzing ? (
                <>
                  <span className="btn__spinner" /> 分析中…
                </>
              ) : (
                <>
                  开始智能分析 <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </SurfaceCard>

        {/* 结果区 */}
        {showResult && (
          <div ref={resultRef} className="ana-result">
            {isAnalyzing ? (
              <SurfaceCard xl>
                <AnalysisLoading elapsed={elapsed} mode={inputMode} />
              </SurfaceCard>
            ) : invalidStockCode ? (
              <SurfaceCard xl>
                <EmptyState
                  icon="error"
                  title="请输入正确的股票代码"
                  desc="请输入 6 位 A 股代码（如 600519 / 000001 / 300750），或从搜索建议中选择。"
                  action={<Button onClick={() => { setShowResult(false); setInvalidStockCode(false); }}>返回修改</Button>}
                />
              </SurfaceCard>
            ) : error ? (
              <SurfaceCard xl>
                <ErrorState title="分析请求失败" desc={error} onRetry={handleAnalyze} />
              </SurfaceCard>
            ) : analysisResult ? (
              <ReportView data={analysisResult} userTier={tier} onSubscribe={() => navigate('/app/subscription')} />
            ) : null}
          </div>
        )}
      </div>

      {/* ============ 侧栏 ============ */}
      <div className="ana-side">
        <SurfaceCard pad>
          <div className="card__title" style={{ marginBottom: 14 }}>
            <HistoryIcon size={16} style={{ color: 'var(--text-2)' }} />
            近期记录
          </div>
          {history.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="row-item"
                  style={{ border: '1px solid var(--divider-soft)', background: 'var(--surface-2)' }}
                  onClick={() => openHistoryReport(item)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 800, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.stockName}
                      </span>
                      <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-2)' }}>
                        {item.stockCode}
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          ) : (
            <div
              style={{
                border: '1.5px dashed var(--divider)',
                borderRadius: 'var(--r-md)',
                padding: '22px 12px',
                textAlign: 'center',
                color: 'var(--text-2)',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              暂无分析记录
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard pad style={{ background: 'linear-gradient(160deg, var(--green-pale), var(--surface) 70%)', borderColor: '#d9efe3' }}>
          <div className="card__title" style={{ marginBottom: 14 }}>
            <Lightbulb size={16} style={{ color: 'var(--green-deep)' }} />
            使用小贴士
          </div>
          <ul className="tip-list">
            {[
              '上传的 K 线截图包含均线系统，识别更准确',
              '短线交易者可切换「短线博弈」策略观察资金视角',
              '分析完成后可导出图片或 HTML 归档',
            ].map((tip, i) => (
              <li key={i}>
                <span className="tip-list__idx">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <div className="risk-note">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <AlertTriangle size={15} style={{ color: 'var(--amber)' }} />
            <strong style={{ fontSize: 13.5, color: 'var(--amber)' }}>风险提示</strong>
          </div>
          <p>
            AI 生成内容基于历史数据与技术形态分析，仅供参考，不构成任何投资建议。市场有风险，投资需谨慎。
          </p>
        </div>
      </div>

      {/* ============ 登录提示 ============ */}
      <Modal
        open={showLoginRequired}
        onClose={() => setShowLoginRequired(false)}
        title="登录后才能使用分析功能"
        subtitle="游客模式仅可浏览，分析功能已上锁"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLoginRequired(false)}>
              先看看
            </Button>
            <Button onClick={() => navigate('/login')}>
              去登录 <ChevronRight size={15} />
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '2px 0 4px' }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'var(--ink)',
              color: '#7eddb2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Lock size={19} />
          </span>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
            登录后可解锁：AI 深度分析、K 线识图、历史报告保存与导出。
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AnalysisPage;
