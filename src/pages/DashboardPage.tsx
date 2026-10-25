import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  Crown,
  FileText,
  History as HistoryIcon,
  Megaphone,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useSession } from '../app/session';
import { apiFetch } from '../services/api';
import type { TabId } from '../types';
import { SurfaceCard } from '../components/ui/Surface';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/Avatar';
import { SkeletonBox } from '../components/ui/Feedback';
import { Select } from '../components/ui/Field';
import UsageTrendChart, { UsageTrendItem } from '../components/charts/UsageTrendChart';
import HotStocks from '../features/hot-stocks/HotStocks';

const GUEST_TREND: UsageTrendItem[] = [
  { date: '12-12', count: 12 },
  { date: '12-13', count: 18 },
  { date: '12-14', count: 8 },
  { date: '12-15', count: 24 },
  { date: '12-16', count: 16 },
  { date: '12-17', count: 5 },
  { date: '12-18', count: 9 },
];

interface UsageSummary {
  userId: string;
  quotaLimit: number | null;
  remainingSuccess: number | null;
  historyCount: number;
  isUnlimited?: boolean;
}

interface AnnounceMiniItem {
  id: number;
  title: string;
  date: string;
  category: string;
}

const DEMO_ANNOUNCEMENTS: AnnounceMiniItem[] = [
  { id: -1, title: '欢迎使用 DeepTrading AI', date: '示例', category: 'new' },
  { id: -2, title: 'K 线识图模式已上线', date: '示例', category: 'new' },
  { id: -3, title: '数据源例行维护说明', date: '示例', category: 'maintenance' },
];

interface DashboardPageProps {
  onAnalyze: () => void;
  onNavigateTab?: (tab: TabId) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onAnalyze, onNavigateTab }) => {
  const { tier, isGuest, isAdmin, authUser, authSubscription, refreshToken } = useSession();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [trend, setTrend] = useState<UsageTrendItem[]>([]);
  const [days, setDays] = useState(7);
  const [announcements, setAnnouncements] = useState<AnnounceMiniItem[] | null>(null);

  useEffect(() => {
    if (isGuest) {
      setSummary(null);
      setTrend(GUEST_TREND);
      setAnnouncements(DEMO_ANNOUNCEMENTS);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data: any = await apiFetch('/api/usage/summary');
        if (!cancelled) setSummary(data as UsageSummary);
      } catch {
        if (!cancelled) setSummary(null);
      }
      try {
        const data: any = await apiFetch(`/api/usage/trend?days=${days}`);
        if (!cancelled) setTrend(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (!cancelled) setTrend([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGuest, days]);

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    (async () => {
      try {
        const data: any = await apiFetch('/api/announcements?limit=3');
        if (!cancelled) setAnnouncements(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (!cancelled) setAnnouncements([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  const remaining = isGuest ? 88 : summary?.remainingSuccess ?? null;
  const quotaLimit = isGuest ? 100 : summary?.quotaLimit ?? null;
  const historyCount = isGuest ? 1240 : summary?.historyCount ?? 0;
  const isUnlimited = !isGuest && (isAdmin || Boolean(summary?.isUnlimited));

  const usagePercent = useMemo(() => {
    if (isGuest) return 12;
    const used = Math.max(0, historyCount || 0);
    const remain = Math.max(0, remaining || 0);
    const total = used + remain;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((used / total) * 100));
  }, [isGuest, historyCount, remaining]);

  const planCode = typeof authSubscription?.plan_code === 'string' ? authSubscription.plan_code : null;
  const proTitle = planCode === 'weekly' ? 'Pro 周会员' : planCode === 'yearly' ? 'Pro 年会员' : 'Pro 月会员';
  const end = authSubscription?.current_period_end ? new Date(authSubscription.current_period_end) : null;
  const endText =
    end && !Number.isNaN(end.getTime())
      ? `有效期至 ${end.getFullYear()} 年 ${end.getMonth() + 1} 月 ${end.getDate()} 日`
      : null;

  const greetingName = isGuest ? '访客' : authUser?.username || '用户';

  return (
    <div className="anim-page">
      <div className="page-head">
        <h1>你好，{greetingName}</h1>
        <p className="page-head__sub">
          今天想分析哪只股票？{isGuest && <span style={{ marginLeft: 8 }} />}
          {isGuest && <span className="demo-chip" style={{ verticalAlign: 'middle' }}>访客数据为演示</span>}
        </p>
      </div>

      {/* ---------- 顶部：会员 / 额度 / 趋势 ---------- */}
      <div className="dash-grid dash-grid--top">
        {/* 会员卡 */}
        {tier === 'pro' || isAdmin ? (
          <div className="member-card anim-up">
            <div>
              <div className="member-card__tier">
                <Crown size={13} /> PRO PLAN
              </div>
              <div className="member-card__title" style={{ marginTop: 14 }}>{proTitle}</div>
              <div className="member-card__meta">{endText || '订阅生效中'}</div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 8 }}>
                <span style={{ opacity: 0.8 }}>已生成 {historyCount} 份报告</span>
                <strong className="num">{isUnlimited ? '不限额度' : `${usagePercent}%`}</strong>
              </div>
              <div className="progress" style={{ background: 'rgba(255,255,255,0.14)' }}>
                <div className="progress__fill progress__fill--green" style={{ width: `${isUnlimited ? 100 : usagePercent}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="member-card member-card--free anim-up">
            <div>
              <div className="member-card__tier">{isGuest ? 'GUEST · 访客' : 'FREE · 免费版'}</div>
              <div className="member-card__title" style={{ marginTop: 14 }}>
                {isGuest ? '访客体验' : '免费会员'}
              </div>
              <div className="member-card__meta" style={{ color: 'var(--text-2)', opacity: 1 }}>
                {isGuest ? '登录后可保存报告与使用分析额度' : '每日免费分析额度有限'}
              </div>
            </div>
            <Button block variant="primary" onClick={() => onNavigateTab?.('subscription')}>
              <Crown size={15} style={{ color: '#8fd8b4' }} /> 升级 Pro 会员
            </Button>
          </div>
        )}

        {/* 额度统计 */}
        <div style={{ display: 'grid', gap: 'var(--s4)' }}>
          <div className="stat-card stat-card--accent anim-up">
            <div className="stat-card__label">
              <Zap size={14} style={{ color: 'var(--green-deep)' }} />
              剩余分析次数
            </div>
            <div className="stat-card__value">
              {isUnlimited ? '不限' : <>{remaining ?? '--'}<small>/ {quotaLimit ?? '--'}</small></>}
            </div>
          </div>
          <div className="stat-card anim-up">
            <div className="stat-card__label">
              <HistoryIcon size={14} />
              历史分析总数
            </div>
            <div className="stat-card__value">{historyCount}</div>
          </div>
        </div>

        {/* 使用趋势 */}
        <SurfaceCard xl pad className="anim-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div className="card__title">
              <CalendarDays size={16} style={{ color: 'var(--blue)' }} />
              分析频率趋势
              {isGuest && <span className="demo-chip" style={{ marginLeft: 4 }}>演示数据</span>}
            </div>
            {!isGuest && (
              <div style={{ width: 116 }}>
                <Select value={String(days)} onChange={(e) => setDays(parseInt(e.target.value, 10) || 7)} aria-label="选择时间范围">
                  <option value="7">近 7 天</option>
                  <option value="30">近 30 天</option>
                </Select>
              </div>
            )}
          </div>
          {trend.length > 0 ? (
            <UsageTrendChart data={trend} height={216} />
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-2)', fontSize: 13, fontWeight: 600 }}>
              暂无趋势数据
            </div>
          )}
        </SurfaceCard>
      </div>

      {/* ---------- 底部：快速操作 / 热门股 / 公告 ---------- */}
      <div className="dash-grid dash-grid--bottom" style={{ marginTop: 'var(--s4)' }}>
        <SurfaceCard xl pad className="dash-bottom-quick quick-cta anim-up" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span className="chip chip--blue">
              <BrainCircuit size={12} /> 核心功能
            </span>
          </div>
          <h3 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.35 }}>
            开启 AI 驱动的
            <br />
            深度投研分析
          </h3>
          <p style={{ color: 'var(--text-2)', fontSize: 13.5, marginTop: 8, marginBottom: 18, lineHeight: 1.7 }}>
            输入代码或上传 K 线截图，几分钟内获得结构化报告。
          </p>
          <Button variant="primary" onClick={onAnalyze} style={{ width: 'fit-content' }}>
            开始 AI 分析 <ArrowRight size={15} />
          </Button>
        </SurfaceCard>

        <HotStocks onAnalyzeStock={() => onAnalyze()} />

        <SurfaceCard xl pad className="dash-bottom-ann anim-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card__title">
              <Megaphone size={16} style={{ color: 'var(--amber)' }} />
              系统公告
            </div>
            <button
              type="button"
              aria-label="查看全部公告"
              onClick={() => onNavigateTab?.('announcements')}
              style={{ color: 'var(--text-2)', padding: 6, borderRadius: 8, display: 'flex' }}
            >
              <ArrowUpRight size={16} />
            </button>
          </div>

          {announcements === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SkeletonBox h={44} r={12} />
              <SkeletonBox h={44} r={12} />
              <SkeletonBox h={44} r={12} />
            </div>
          ) : announcements.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13, padding: '20px 0' }}>暂无公告</p>
          ) : (
            announcements.map((item) => (
              <button
                key={item.id}
                type="button"
                className="announce-mini"
                onClick={() => onNavigateTab?.('announcements')}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: item.category === 'maintenance' ? 'var(--amber-pale)' : item.category === 'new' ? 'var(--green-pale)' : 'var(--blue-pale)',
                    color: item.category === 'maintenance' ? 'var(--amber)' : item.category === 'new' ? 'var(--green-deep)' : 'var(--blue-deep)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.category === 'maintenance' ? <Megaphone size={15} /> : item.category === 'new' ? <Sparkles size={15} /> : <FileText size={15} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                    {item.id < 0 && <span className="demo-chip" style={{ marginLeft: 6 }}>演示</span>}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-2)', marginTop: 1 }}>{item.date}</span>
                </span>
              </button>
            ))
          )}

          {tier === 'free' && !isGuest && (
            <div style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--divider-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                <span style={{ color: 'var(--text-2)' }}>额度使用</span>
                <span className="num">{usagePercent}%</span>
              </div>
              <ProgressBar percent={usagePercent} tone="blue" />
              <Button
                block
                size="sm"
                variant="secondary"
                style={{ marginTop: 12 }}
                onClick={() => { onNavigateTab?.('subscription'); refreshToken(); }}
              >
                <Crown size={13} /> 升级解锁不限额度
              </Button>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
};

export default DashboardPage;
