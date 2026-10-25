import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart2,
  CheckCircle2,
  Crown,
  FileCode,
  History as HistoryIcon,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Lock,
  Newspaper,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { AIAnalysisReport, UserTier } from '../../types';
import { exportReportHTML, exportReportImage } from './export';
import { SurfaceCard } from '../../components/ui/Surface';
import { Button } from '../../components/ui/Button';
import { RecommendationChip } from '../../components/ui/Market';
import { useToast } from '../../hooks/useToast';

/* ---------- 文本高亮（**text** → 克制的蓝色强调） ---------- */
const HighlightText: React.FC<{ text?: string; className?: string }> = ({ text, className }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <span key={index} className="rpt-mark">
            {part.slice(2, -2)}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};

/* ---------- 工具函数 ---------- */

const SENTIMENT_CHIP: Record<string, string> = {
  bullish: 'chip--up',
  bearish: 'chip--down',
  neutral: 'chip--amber',
};

const formatYi = (v: number | null | undefined, { signed = true } = {}): string => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '--';
  const n = Number(v);
  const txt = Math.abs(n).toFixed(2);
  if (!signed) return txt;
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${txt}亿`;
};

const inflowTone = (v: number | null | undefined): string => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return 'var(--ink)';
  const n = Number(v);
  if (n > 0) return 'var(--up-deep)';
  if (n < 0) return 'var(--down-deep)';
  return 'var(--ink)';
};

const REC_STYLE: Record<string, { cls: string; label: string }> = {
  Buy: { cls: 'report-rec--buy', label: '建议买入' },
  Sell: { cls: 'report-rec--sell', label: '建议卖出' },
  Wait: { cls: 'report-rec--wait', label: '建议观望' },
};

/* ---------- 锁定遮罩 ---------- */

const LockOverlay: React.FC<{ onSubscribe?: () => void; description: string }> = ({ onSubscribe, description }) => (
  <div className="lock-overlay">
    <span className="lock-overlay__icon">
      <Lock size={20} />
    </span>
    <strong style={{ fontSize: 15.5, fontWeight: 800 }}>Pro 会员专享</strong>
    <p style={{ fontSize: 12.5, color: 'var(--text-2)', maxWidth: 280, lineHeight: 1.65 }}>{description}</p>
    <Button size="sm" onClick={onSubscribe} style={{ marginTop: 10 }}>
      <Crown size={13} /> 立即解锁
    </Button>
  </div>
);

/* ---------- 主视图 ---------- */

interface ReportViewProps {
  data: AIAnalysisReport;
  userTier?: UserTier;
  onSubscribe?: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ data, userTier = 'pro', onSubscribe }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const isLocked = userTier === 'guest';
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const rec = REC_STYLE[data.recommendation] || REC_STYLE.Wait;

  /* 真实数据优先，否则回退 AI 生成指标 */
  const indicators = useMemo(() => {
    const orderedNames = ['RSI', 'MACD', '布林带', '成交量', '趋势强度'];
    if (data.realData?.indicators) {
      const { rsi, macd, bollingerBands, volume, trendStrength } = data.realData.indicators;
      return [
        { name: 'RSI', value: rsi.status, signal: rsi.interpretation, sentiment: rsi.sentiment, realValue: rsi.value },
        { name: 'MACD', value: macd.status, signal: macd.interpretation, sentiment: macd.sentiment, realValue: `DIF ${macd.dif} · DEA ${macd.dea}` },
        { name: '布林带', value: bollingerBands.status, signal: bollingerBands.interpretation, sentiment: bollingerBands.sentiment, realValue: `位置 ${bollingerBands.currentPosition}` },
        { name: '成交量', value: volume.status, signal: volume.interpretation, sentiment: volume.sentiment, realValue: volume.latest },
        { name: '趋势强度', value: trendStrength.status, signal: trendStrength.interpretation, sentiment: trendStrength.sentiment, realValue: `强度 ${trendStrength.strength}` },
      ];
    }
    return orderedNames.map(
      (name) =>
        data.technicalIndicators.find((i) => i.name.includes(name)) || data.technicalIndicators.find((i) => i.name === name) || {
          name,
          value: 'N/A',
          signal: '暂无数据',
          sentiment: 'neutral' as const,
        }
    );
  }, [data]);

  const hasRealData = Boolean(data.realData);

  const money = data.moneyFlowMonitor;
  const scoreRaw = money?.fundSentimentIndex ?? money?.retailSentimentRatio;
  const score =
    scoreRaw === null || scoreRaw === undefined || Number.isNaN(Number(scoreRaw))
      ? 50
      : Math.max(0, Math.min(100, Number(scoreRaw)));
  const sentimentText = money?.fundSentimentLevel || (score >= 75 ? '极度乐观' : score >= 50 ? '乐观' : score >= 25 ? '中性' : '恐慌');

  const inflows = [money?.netInflow3d, money?.netInflow5d, money?.netInflow20d]
    .map((v) => (v === null || v === undefined ? null : Number(v)))
    .filter((v): v is number => v !== null && !Number.isNaN(v));
  const posCount = inflows.filter((v) => v > 0).length;
  const negCount = inflows.filter((v) => v < 0).length;
  const moneySummary =
    inflows.length === 0
      ? '暂无资金流向数据，建议结合量价观察。'
      : posCount >= 2
        ? '主力资金偏流入，做多意愿较强，关注回踩承接。'
        : negCount >= 2
          ? '主力资金偏流出，短线承压，等待企稳信号。'
          : '资金分歧加大，短线震荡为主，控制仓位。';

  const techAdvice = data.technicalAnalysisAdvice;
  const techAdvicePoints = typeof techAdvice !== 'string' && techAdvice?.points ? techAdvice.points : null;
  const techAdviceSummary = typeof techAdvice !== 'string' && techAdvice?.summary ? techAdvice.summary : null;
  const techAdviceText = typeof techAdvice === 'string' ? techAdvice : null;

  const logic = data.strategy?.logic;
  const logicPoints = typeof logic !== 'string' && (logic as any)?.points ? (logic as any).points : null;
  const logicText = typeof logic === 'string' ? logic : null;
  const riskWarning = typeof logic !== 'string' ? (logic as any)?.riskWarning : null;

  const handleExportImage = async () => {
    if (isLocked || !rootRef.current) return;
    setExporting(true);
    try {
      await exportReportImage(rootRef.current, data);
      showToast('报告图片已导出', 'success');
    } catch {
      showToast('导出失败，请重试', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportHTML = () => {
    if (isLocked || !rootRef.current) return;
    try {
      exportReportHTML(rootRef.current, data);
      showToast('HTML 报告已导出', 'success');
    } catch {
      showToast('导出失败，请重试', 'error');
    }
  };

  return (
    <div className="report anim-page">
      {/* ---------- 工具条 ---------- */}
      <div className="report-toolbar" data-html2canvas-ignore>
        <div className="report-toolbar__status">
          <span className="dot" />
          报告已生成 · {data.strategyMode}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={isLocked ? onSubscribe : handleExportHTML}
            className="hidden-sm"
          >
            {isLocked ? <Lock size={13} /> : <FileCode size={14} />} HTML
          </Button>
          <Button size="sm" variant="primary" onClick={isLocked ? onSubscribe : handleExportImage} loading={exporting}>
            {isLocked ? <Lock size={13} /> : <ImageIcon size={14} />} 导出图片
          </Button>
        </div>
      </div>

      {/* ---------- 头卡 ---------- */}
      <SurfaceCard xl pad className="report-head">
        <div className="report-head__top">
          <div style={{ minWidth: 0 }}>
            <div className="report-head__title">
              <h1 className="report-head__name">{data.stockName}</h1>
              <span className="chip chip--neutral mono">{data.stockCode}</span>
            </div>
            <div className="report-head__meta">
              <span className="chip chip--outline">
                <HistoryIcon size={11} /> {data.timestamp}
              </span>
              <span className="chip chip--blue">{data.strategyMode}</span>
              <RecommendationChip rec={data.recommendation} />
            </div>
          </div>

          <div className={`report-rec ${rec.cls}`}>
            <span className="report-rec__eyebrow">AI 结论</span>
            <span className="report-rec__label">{rec.label}</span>
          </div>
        </div>

        <div className="report-confidence">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700 }}>
            <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={13} /> 模型置信度 <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>（仅供参考）</span>
            </span>
            <span className="num">{data.confidenceScore}%</span>
          </div>
          <div className="progress">
            <div
              className="progress__fill"
              style={{ width: `${Math.min(100, Math.max(0, data.confidenceScore))}%`, background: data.confidenceScore >= 70 ? 'var(--green)' : '#e8a33d' }}
            />
          </div>
        </div>

        {data.keyDrivers?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {data.keyDrivers.map((d, i) => (
              <span key={i} className="chip chip--blue">
                <Target size={11} /> {d}
              </span>
            ))}
            {data.marketSentiment && (
              <span className="chip chip--green">
                <Sparkles size={11} /> {data.marketSentiment}
              </span>
            )}
          </div>
        )}

        <div className="report-summary">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <Sparkles size={15} style={{ color: 'var(--green-deep)' }} />
            <strong style={{ fontSize: 14, color: 'var(--green-deep)' }}>分析小结</strong>
          </div>
          <p>
            <HighlightText text={data.analysisSummary} />
          </p>
        </div>
      </SurfaceCard>

      {/* ---------- 正文网格 ---------- */}
      <div className="report-grid">
        {/* 左：技术 + 舆情 */}
        <div className="report-col">
          <SurfaceCard xl pad>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="card__title">
                <Layers size={17} style={{ color: 'var(--blue)' }} />
                技术指标
              </div>
              {hasRealData && (
                <span className="chip chip--green">
                  <CheckCircle2 size={11} /> 实时数据
                </span>
              )}
            </div>

            {indicators.map((ind: any, idx: number) => (
              <div key={`${ind.name}-${idx}`} className="indicator-row">
                <div style={{ minWidth: 0 }}>
                  <div className="indicator-row__name">
                    {ind.name}
                    {ind.realValue && <span className="indicator-row__value">{ind.realValue}</span>}
                  </div>
                  <div className="indicator-row__signal">{ind.signal}</div>
                </div>
                <span className={`chip ${SENTIMENT_CHIP[ind.sentiment] || 'chip--amber'}`} style={{ flexShrink: 0 }}>
                  {ind.value}
                </span>
              </div>
            ))}

            <div
              style={{
                marginTop: 14,
                borderRadius: 'var(--r-md)',
                background: 'var(--surface-2)',
                border: '1px dashed var(--divider)',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Lightbulb size={14} style={{ color: 'var(--text-2)' }} />
                <strong style={{ fontSize: 13, color: 'var(--text-2)' }}>技术面建议</strong>
              </div>
              {techAdvicePoints ? (
                <>
                  <ol style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                    {techAdvicePoints.map((point: string, i: number) => (
                      <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: 1.7, color: '#3f4c5e' }}>
                        <span style={{ fontWeight: 800, color: 'var(--ink)', minWidth: 14 }}>{i + 1}.</span>
                        <span>
                          <HighlightText text={point} />
                        </span>
                      </li>
                    ))}
                  </ol>
                  {techAdviceSummary && (
                    <span className="chip chip--blue" style={{ height: 'auto', padding: '6px 12px', whiteSpace: 'normal', lineHeight: 1.6 }}>
                      <Sparkles size={11} />
                      <HighlightText text={techAdviceSummary} />
                    </span>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 13.5, lineHeight: 1.75, color: '#3f4c5e' }}>
                  <HighlightText text={techAdviceText || 'RSI 与 MACD 显示当前趋势状态，建议关注成交量配合情况。'} />
                </p>
              )}
            </div>
          </SurfaceCard>

          {data.newsAnalysis && (
            <SurfaceCard xl pad>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div className="card__title">
                  <Newspaper size={17} style={{ color: 'var(--blue)' }} />
                  舆情风向
                </div>
                <span className="chip chip--neutral">热度 {data.newsAnalysis.sentimentScore}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(data.newsAnalysis.news || []).map((item, idx) => (
                  <div key={idx} className="news-item">
                    {item.sentiment === 'positive' ? (
                      <span className="chip chip--up" style={{ flexShrink: 0 }}>利好</span>
                    ) : item.sentiment === 'negative' ? (
                      <span className="chip chip--down" style={{ flexShrink: 0 }}>利空</span>
                    ) : (
                      <span className="chip chip--neutral" style={{ flexShrink: 0 }}>中性</span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>{item.title}</span>
                  </div>
                ))}
                {(data.newsAnalysis.news || []).length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', padding: '12px 0' }}>暂无舆情数据</p>
                )}
              </div>

              {data.newsAnalysis.summary && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--divider-soft)' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75 }}>
                    <HighlightText text={data.newsAnalysis.summary} />
                  </p>
                </div>
              )}
            </SurfaceCard>
          )}
        </div>

        {/* 右：计划 + 资金 */}
        <div className="report-col">
          <SurfaceCard xl pad style={{ position: 'relative', overflow: 'hidden' }}>
            {isLocked && <LockOverlay onSubscribe={onSubscribe} description="解锁止盈目标、建仓区间、止损线与策略逻辑推演。" />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="card__title">
                <BarChart2 size={17} style={{ color: 'var(--blue)' }} />
                执行策略
              </div>
              <span className="chip chip--blue">交易计划</span>
            </div>

            <div style={isLocked ? { filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' } : undefined}>
              <div className="plan-tiles">
                <div className="plan-tile plan-tile--target">
                  <div className="plan-tile__label" style={{ color: 'var(--up-deep)' }}>
                    <Target size={11} /> 止盈目标
                  </div>
                  <div className="plan-tile__value">{data.strategy?.targetPrice}</div>
                  <div className="plan-tile__note">第一阻力位</div>
                </div>
                <div className="plan-tile plan-tile--entry">
                  <div className="plan-tile__label" style={{ color: 'var(--blue-deep)' }}>
                    <TrendingUp size={11} /> 建仓区间
                  </div>
                  <div className="plan-tile__value">{data.strategy?.entryRange}</div>
                  <div className="plan-tile__note">分批关注</div>
                </div>
                <div className="plan-tile plan-tile--stop">
                  <div className="plan-tile__label" style={{ color: 'var(--text-2)' }}>
                    <Shield size={11} /> 止损线
                  </div>
                  <div className="plan-tile__value">{data.strategy?.stopLoss}</div>
                  <div className="plan-tile__note">跌破离场</div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Layers size={15} style={{ color: 'var(--text-2)' }} />
                  <strong style={{ fontSize: 14 }}>策略逻辑推演</strong>
                </div>
                {logicPoints ? (
                  <ol style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {logicPoints.map((point: string, i: number) => (
                      <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: 1.75, color: '#3f4c5e' }}>
                        <span style={{ fontWeight: 800, color: 'var(--ink)', minWidth: 14 }}>{i + 1}.</span>
                        <span>
                          <HighlightText text={point} />
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p style={{ fontSize: 13.5, lineHeight: 1.75, color: '#3f4c5e' }}>
                    <HighlightText text={logicText} />
                  </p>
                )}
              </div>

              {riskWarning && (
                <div
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    background: 'var(--amber-pale)',
                    border: '1px solid #f0e0bd',
                    borderRadius: 'var(--r-md)',
                    padding: '12px 14px',
                  }}
                >
                  <p style={{ fontSize: 12.5, color: 'var(--amber)', lineHeight: 1.65 }}>
                    <strong>风险提示：</strong>
                    {riskWarning}
                  </p>
                </div>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard xl pad style={{ position: 'relative', overflow: 'hidden' }}>
            {isLocked && <LockOverlay onSubscribe={onSubscribe} description="解锁 3 / 5 / 20 日主力资金净流入与资金情绪指数。" />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="card__title">
                <Activity size={17} style={{ color: 'var(--amber)' }} />
                资金与情绪
              </div>
            </div>

            <div style={isLocked ? { filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' } : undefined}>
              <div className="money-grid">
                {[
                  { label: '3 日净流入', value: money?.netInflow3d },
                  { label: '5 日净流入', value: money?.netInflow5d },
                  { label: '20 日净流入', value: money?.netInflow20d },
                ].map((item) => (
                  <div key={item.label} className="money-grid__item">
                    <div className="money-grid__label">{item.label}</div>
                    <div className="money-grid__value" style={{ color: inflowTone(item.value) }}>
                      {formatYi(item.value)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="money-duo">
                <div className="money-duo__item">
                  当日主力买入
                  <strong>{formatYi(money?.mainBuyAmount, { signed: false })}</strong>
                </div>
                <div className="money-duo__item">
                  当日主力卖出
                  <strong>{formatYi(money?.mainSellAmount, { signed: false })}</strong>
                </div>
              </div>

              <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7, display: 'flex', gap: 6 }}>
                <TrendingUp size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--amber)' }} />
                {moneySummary}
              </p>

              <div style={{ marginTop: 16, background: 'var(--surface-2)', border: '1px solid var(--divider-soft)', borderRadius: 'var(--r-md)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text-2)' }}>资金情绪指数</span>
                  <span
                    className={`chip ${
                      sentimentText === '极度乐观' ? 'chip--up' : sentimentText === '乐观' ? 'chip--amber' : sentimentText === '恐慌' ? 'chip--down' : 'chip--neutral'
                    }`}
                  >
                    {sentimentText}
                  </span>
                </div>
                <div className="sentiment-bar">
                  <span className="sentiment-knob" style={{ left: `${score}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--down-deep)' }}>恐慌 0</span>
                  <span>中性 33</span>
                  <span>乐观 66</span>
                  <span style={{ color: 'var(--up-deep)' }}>极度乐观 100</span>
                </div>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
