import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Clock, Filter, Search } from 'lucide-react';
import type { AIAnalysisReport, UserTier } from '../types';
import { useRouter } from '../app/router';
import { useSession } from '../app/session';
import { SurfaceCard } from '../components/ui/Surface';
import { Input } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';
import { RecommendationChip } from '../components/ui/Market';
import { useClickOutside } from '../hooks/useInteractions';
import ReportView from '../features/report/ReportView';

type FilterType = 'All' | 'Buy' | 'Sell' | 'Wait';

const FILTER_LABELS: Record<FilterType, string> = {
  All: '全部结论',
  Buy: '买入 Buy',
  Sell: '卖出 Sell',
  Wait: '观望 Wait',
};

interface HistoryPageProps {
  onNavigateTab?: (tab: 'analysis') => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigateTab }) => {
  const { history, isGuest, tier } = useSession();
  const { search } = useRouter();
  const [selectedReport, setSelectedReport] = useState<AIAnalysisReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(filterRef, () => setIsFilterOpen(false), isFilterOpen);

  // 从通知跳转（/app/history?report=xxx）
  useEffect(() => {
    const params = new URLSearchParams(search);
    const reportId = params.get('report');
    if (reportId) {
      const report = history.find((h) => h.id === reportId);
      if (report) setSelectedReport(report);
    }
  }, [search, history]);

  const filteredHistory = useMemo(
    () =>
      history.filter((item) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          item.stockName.toLowerCase().includes(term) || item.stockCode.includes(searchTerm);
        const matchesFilter = filterType === 'All' || item.recommendation === filterType;
        return matchesSearch && matchesFilter;
      }),
    [history, searchTerm, filterType]
  );

  if (selectedReport) {
    return (
      <div className="anim-page">
        <button
          onClick={() => setSelectedReport(null)}
          className="row-item"
          style={{ width: 'fit-content', padding: '8px 14px 8px 10px', borderRadius: 'var(--r-full)', border: '1px solid var(--divider-soft)', background: 'var(--surface)', marginBottom: 16, fontWeight: 700, fontSize: 13.5, color: 'var(--text-2)' }}
        >
          <ArrowLeft size={15} /> 返回列表
        </button>
        <ReportView data={selectedReport} userTier={tier as UserTier} onSubscribe={() => onNavigateTab?.('analysis')} />
      </div>
    );
  }

  return (
    <div className="anim-page" style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="page-head">
        <h1>历史分析</h1>
        <p className="page-head__sub">
          共 {history.length} 条报告
          {searchTerm && ` · 搜索「${searchTerm}」`}
          {filterType !== 'All' && ` · ${FILTER_LABELS[filterType]}`}
        </p>
      </div>

      {/* 搜索与筛选 */}
      <div className="history-toolbar">
        <div style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Input
            icon={<Search size={15} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索股票名称或代码"
            aria-label="搜索历史报告"
          />
        </div>

        <div style={{ position: 'relative' }} ref={filterRef}>
          <Button
            variant="secondary"
            aria-expanded={isFilterOpen}
            onClick={() => setIsFilterOpen((v) => !v)}
            style={filterType !== 'All' ? { borderColor: 'var(--blue)', color: 'var(--blue-deep)' } : undefined}
          >
            <Filter size={14} />
            {filterType === 'All' ? '筛选' : FILTER_LABELS[filterType].split(' ')[0]}
          </Button>

          {isFilterOpen && (
            <SurfaceCard className="suggest-pop" style={{ left: 'auto', right: 0, width: 180 }}>
              {(['All', 'Buy', 'Wait', 'Sell'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className="suggest-item"
                  onClick={() => {
                    setFilterType(type);
                    setIsFilterOpen(false);
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13.5,
                      color:
                        type === 'Buy'
                          ? 'var(--up-deep)'
                          : type === 'Sell'
                            ? 'var(--down-deep)'
                            : type === 'Wait'
                              ? 'var(--amber)'
                              : 'var(--ink)',
                    }}
                  >
                    {FILTER_LABELS[type]}
                  </span>
                  {filterType === type && <Check size={14} style={{ color: 'var(--ink)' }} />}
                </button>
              ))}
            </SurfaceCard>
          )}
        </div>
      </div>

      {/* 列表 */}
      {filteredHistory.length === 0 ? (
        <SurfaceCard xl>
          {history.length === 0 ? (
            <EmptyState
              title={isGuest ? '游客模式下没有保存的报告' : '还没有分析记录'}
              desc={isGuest ? '登录后，你生成的每一份 AI 报告都会保存在这里。' : '完成第一次 AI 分析后，报告会自动归档在这里。'}
              action={
                <Button onClick={() => onNavigateTab?.('analysis')}>开始第一次分析</Button>
              }
            />
          ) : (
            <EmptyState
              icon="search"
              title="没有找到匹配的记录"
              desc="换个关键词，或清除筛选条件试试。"
              action={
                <Button variant="secondary" onClick={() => { setSearchTerm(''); setFilterType('All'); }}>
                  清除筛选条件
                </Button>
              }
            />
          )}
        </SurfaceCard>
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredHistory.map((report) => (
            <SurfaceCard key={report.id} className="history-item card--click" onClick={() => setSelectedReport(report)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedReport(report); }}
            >
              <div className="history-item__stock">
                <span
                  aria-hidden="true"
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: 'var(--surface-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {report.stockCode.slice(0, 2)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {report.stockName}
                    </strong>
                    <span className="chip chip--neutral mono">{report.stockCode}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 12, color: 'var(--text-2)' }}>
                    <Clock size={11} />
                    {report.timestamp}
                    <span aria-hidden="true">·</span>
                    {report.strategyMode}
                  </div>
                </div>
              </div>

              <div className="history-item__summary">{report.analysisSummary}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <RecommendationChip rec={report.recommendation} />
                <span
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: 'var(--text-2)',
                  }}
                  className="history-item__more"
                >
                  查看报告 <ChevronRight size={13} />
                </span>
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
