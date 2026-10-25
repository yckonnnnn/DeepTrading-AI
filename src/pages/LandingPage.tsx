import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  ScanLine,
  TrendingUp,
  CircleDollarSign,
  FileText,
  Gauge,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { useRouter } from '../app/router';
import { useSession } from '../app/session';
import { GlassPanel, SurfaceCard } from '../components/ui/Surface';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/Avatar';
import { RecommendationChip } from '../components/ui/Market';

/** 极慢、低幅度漂移的云层（transform-only 动画） */
const Cloud: React.FC<{ className: string; seed?: number }> = ({ className }) => (
  <div className={`lp-cloud ${className}`} aria-hidden="true">
    <svg viewBox="0 0 520 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g fill="#ffffff">
        <ellipse cx="170" cy="130" rx="130" ry="48" />
        <ellipse cx="260" cy="100" rx="110" ry="58" />
        <ellipse cx="360" cy="126" rx="120" ry="46" />
        <ellipse cx="90" cy="150" rx="90" ry="34" />
      </g>
    </svg>
  </div>
);

/** 预览卡里的绿色趋势图（静态 SVG，进场一次淡入） */
const Sparkline: React.FC = () => {
  const points = [8, 14, 11, 20, 26, 22, 34, 42, 38, 52, 60, 55, 68, 74];
  const max = 80;
  const w = 560;
  const h = 150;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p / max) * h}`)
    .join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="anim-fade" style={{ width: '100%', height: 'auto' }} role="img" aria-label="示意趋势图">
      <defs>
        <linearGradient id="lpSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22B578" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22B578" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((r) => (
        <line key={r} x1="0" x2={w} y1={h * r} y2={h * r} stroke="#E6EBF1" strokeWidth="1" strokeDasharray="3 5" />
      ))}
      <path d={area} fill="url(#lpSparkFill)" />
      <path d={path} fill="none" stroke="#22B578" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - (points[points.length - 1] / max) * h} r="5" fill="#22B578" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
};

const PLAN_PREVIEW = [
  { name: '周会员', price: '18', period: '/ 周' },
  { name: '月会员', price: '68', period: '/ 月', recommended: true },
  { name: '年会员', price: '688', period: '/ 年' },
];

const LandingPage: React.FC = () => {
  const { navigate } = useRouter();
  const { hasSession } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const startCta = () => navigate(hasSession ? '/app/analysis' : '/register');
  const goApp = () => navigate(hasSession ? '/app' : '/login');

  return (
    <div className="lp">
      {/* ============ Glass 导航 ============ */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav--floating' : ''}`} aria-label="站点导航">
        <GlassPanel className="lp-nav__inner" over={scrolled ? 'page' : 'sky'} strong={scrolled}>
          <a className="lp-nav__brand" href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect width="40" height="40" rx="11" fill="#101820" />
              <rect x="11" y="22" width="5" height="9" rx="2.5" fill="#BFE8D4" />
              <rect x="19" y="16" width="5" height="15" rx="2.5" fill="#22B578" />
              <circle cx="29.5" cy="12.5" r="3" fill="#7EDDB2" />
            </svg>
            DeepTrading
          </a>

          <div className="lp-nav__links">
            <a className="lp-nav__link" href="#capabilities">产品能力</a>
            <a className="lp-nav__link" href="#workflow">工作流程</a>
            <a className="lp-nav__link" href="#report-demo">报告示例</a>
            <a className="lp-nav__link" href="#plans">会员订阅</a>
          </div>

          <div className="lp-nav__actions">
            <button className="lp-nav__login" onClick={goApp}>
              {hasSession ? '进入工作台' : '登录'}
            </button>
            <Button variant="primary" pill onClick={startCta}>
              免费开始 <ArrowRight size={15} />
            </Button>
          </div>
        </GlassPanel>
      </nav>

      {/* ============ Hero ============ */}
      <header className="lp-hero">
        <div className="lp-sky">
          <Cloud className="lp-cloud--1" />
          <Cloud className="lp-cloud--2" />
          <Cloud className="lp-cloud--3" />
          <Cloud className="lp-cloud--4" />
        </div>

        <div className="lp-hero__inner">
          <div className="anim-up">
            <span className="lp-hero__eyebrow">
              <span className="dot" aria-hidden="true" />
              AI 股票深度分析
            </span>
            <h1>
              把复杂行情，
              <br />
              读成一份<span className="accent">清晰的报告</span>
            </h1>
            <p className="lp-hero__sub">
              输入股票代码，或直接上传 K 线截图。DeepTrading AI
              生成结构化的趋势解读、技术指标分析与可执行的交易计划。
            </p>

            <div className="lp-hero__ctas">
              <Button variant="primary" size="lg" pill onClick={startCta}>
                开始 AI 分析 <ArrowRight size={17} />
              </Button>
              <Button variant="secondary" size="lg" pill onClick={() => document.getElementById('report-demo')?.scrollIntoView({ behavior: 'smooth' })}>
                查看报告示例
              </Button>
            </div>

            <div className="lp-hero__facts">
              <span className="chip chip--outline">双策略模式</span>
              <span className="chip chip--outline">5 类技术指标</span>
              <span className="chip chip--outline">K 线识图</span>
              <span className="chip chip--outline">报告导出</span>
            </div>
          </div>

          {/* ============ 产品预览 ============ */}
          <div className="lp-preview anim-up" style={{ animationDelay: '120ms' }}>
            <div className="lp-preview__float lp-preview__float--confidence">
              <div className="lp-float-chip">
                <Gauge size={20} style={{ color: 'var(--blue)' }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700 }}>模型置信度</div>
                  <div className="num" style={{ fontSize: 15, fontWeight: 800 }}>82%</div>
                </div>
              </div>
            </div>

            <div className="lp-preview__card">
              <div className="lp-preview__head">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>贵州茅台</span>
                    <span className="chip chip--neutral mono">600519</span>
                  </div>
                  <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
                    趋势跟踪策略 · 生成于 09:42
                  </div>
                </div>
                <RecommendationChip rec="Buy" />
              </div>

              <div className="num" style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 26, fontWeight: 800 }}>1452.00</span>
                <span className="market-pill market-pill--up">+2.36%</span>
              </div>

              <Sparkline />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {[
                  { label: '止盈目标', value: '1520.00', cls: 'chip--up' },
                  { label: '建仓区间', value: '1428 - 1445', cls: 'chip--blue' },
                  { label: '止损线', value: '1395.00', cls: 'chip--neutral' },
                ].map((s) => (
                  <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '10px 12px', minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700 }}>{s.label}</div>
                    <div className="num" style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-2)' }}>置信度（仅供参考）</span>
                  <span className="num">82%</span>
                </div>
                <ProgressBar percent={82} tone="green" />
              </div>
            </div>

            <div className="lp-preview__float lp-preview__float--strategy">
              <div className="lp-float-chip" style={{ animationDelay: '-2.5s' }}>
                <TrendingUp size={20} style={{ color: 'var(--green-deep)' }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700 }}>当前策略</div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>趋势跟踪</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============ 产品能力 ============ */}
      <section className="lp-section" id="capabilities">
        <div className="lp-section__inner">
          <div className="lp-section__head anim-up">
            <span className="section-eyebrow">产品能力</span>
            <h2 style={{ marginTop: 10 }}>从输入到决策，只需要三步</h2>
            <p>没有复杂配置。选择一种输入方式与策略视角，剩下的交给 AI。</p>
          </div>

          <div className="lp-features stagger">
            <SurfaceCard xl className="lp-feature">
              <div className="lp-feature__icon lp-feature__icon--blue">
                <ScanLine size={24} />
              </div>
              <h3>双入口分析</h3>
              <p>直接输入 A 股代码，或上传 K 线截图由 AI 识别形态。识图模式支持补充说明，整体耗时约 30–50 秒。</p>
            </SurfaceCard>

            <SurfaceCard xl className="lp-feature">
              <div className="lp-feature__icon lp-feature__icon--green">
                <TrendingUp size={24} />
              </div>
              <h3>双策略视角</h3>
              <p>「趋势跟踪」适合中长线，捕捉主升浪；「短线博弈」关注高频波段与资金流向。同一标的，两种视角。</p>
            </SurfaceCard>

            <SurfaceCard xl className="lp-feature">
              <div className="lp-feature__icon lp-feature__icon--ink">
                <CircleDollarSign size={24} />
              </div>
              <h3>资金与情绪数据</h3>
              <p>报告整合 3 / 5 / 20 日主力资金净流入与资金情绪指数，配合 RSI、MACD、布林带等五类指标交叉验证。</p>
            </SurfaceCard>
          </div>
        </div>
      </section>

      {/* ============ 工作流程 ============ */}
      <section className="lp-section" id="workflow" style={{ background: 'var(--surface)' }}>
        <div className="lp-section__inner">
          <div className="lp-section__head anim-up">
            <span className="section-eyebrow">工作流程</span>
            <h2 style={{ marginTop: 10 }}>三步生成一份可执行的报告</h2>
          </div>

          <div className="lp-steps stagger">
            <div className="lp-step">
              <div className="lp-step__num">01</div>
              <h3>输入标的</h3>
              <p>输入六位股票代码（如 600519），或上传一张包含均线系统的 K 线截图。</p>
            </div>
            <div className="lp-step">
              <div className="lp-step__num">02</div>
              <h3>选择策略</h3>
              <p>根据投资风格选择「趋势跟踪」或「短线博弈」，AI 将采用对应的推理侧重。</p>
            </div>
            <div className="lp-step">
              <div className="lp-step__num">03</div>
              <h3>阅读报告</h3>
              <p>报告按「结论 → 指标 → 计划 → 推理」组织，支持导出图片与 HTML 归档。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 报告示例 ============ */}
      <section className="lp-section" id="report-demo">
        <div className="lp-section__inner lp-report-demo">
          <div className="anim-up">
            <span className="section-eyebrow">报告示例</span>
            <h2 style={{ marginTop: 10, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              一份报告，讲清五件事
            </h2>
            <div className="lp-report-demo__list">
              {[
                { icon: FileText, title: '结论与小结', desc: '买入 / 观望 / 卖出三档结论，附核心摘要与置信度（仅供参考）。' },
                { icon: Gauge, title: '技术指标', desc: 'RSI、MACD、布林带、成交量、趋势强度，多空状态一目了然。' },
                { icon: TrendingUp, title: '交易计划', desc: '止盈目标、建仓区间、止损线与策略逻辑推演、风险提示。' },
                { icon: CircleDollarSign, title: '资金与舆情', desc: '主力资金净流入趋势、情绪指数与舆情风向汇总。' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="lp-report-demo__item">
                    <span className="lp-report-demo__idx">{i + 1}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon size={15} style={{ color: 'var(--blue)' }} />
                        {item.title}
                      </div>
                      <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.65 }}>{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <SurfaceCard xl pad className="anim-up" style={{ animationDelay: '120ms' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <strong style={{ fontSize: 15 }}>技术指标 · 摘录</strong>
              <span className="chip chip--green">实时数据</span>
            </div>
            {[
              { name: 'RSI', value: '超买区间', tone: 'chip--amber', desc: '短期涨幅较大，关注高位钝化风险。' },
              { name: 'MACD', value: '金叉向上', tone: 'chip--up', desc: 'DIF 上穿 DEA，红柱持续放大。' },
              { name: '布林带', value: '中轨上方', tone: 'chip--up', desc: '价格沿上轨运行，趋势偏强。' },
              { name: '成交量', value: '温和放量', tone: 'chip--blue', desc: '量能配合良好，上行有一定支撑。' },
            ].map((ind) => (
              <div
                key={ind.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '13px 0',
                  borderBottom: '1px solid var(--divider-soft)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{ind.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 1 }}>{ind.desc}</div>
                </div>
                <span className={`chip ${ind.tone}`} style={{ flexShrink: 0 }}>{ind.value}</span>
              </div>
            ))}
          </SurfaceCard>
        </div>
      </section>

      {/* ============ 订阅入口 ============ */}
      <section className="lp-section" id="plans" style={{ paddingTop: 0 }}>
        <div className="lp-section__inner">
          <div className="lp-section__head anim-up" style={{ textAlign: 'center', marginInline: 'auto' }}>
            <span className="section-eyebrow">会员订阅</span>
            <h2 style={{ marginTop: 10 }}>按周期选择，随时可停</h2>
            <p>登录后进入「会员订阅」查看完整权益与购买方式。</p>
          </div>

          <div className="lp-plans stagger">
            {PLAN_PREVIEW.map((plan) => (
              <SurfaceCard
                key={plan.name}
                xl
                pad
                interactive
                className="lp-plan"
                style={
                  plan.recommended
                    ? { borderColor: 'var(--blue)', background: 'linear-gradient(180deg, var(--blue-soft), var(--surface) 55%)' }
                    : undefined
                }
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 16 }}>{plan.name}</strong>
                  {plan.recommended && <span className="chip chip--blue">推荐</span>}
                </div>
                <div className="num" style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>¥</span>
                  <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em' }}>{plan.price}</span>
                  <span style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 600 }}>{plan.period}</span>
                </div>
                <Button
                  block
                  variant={plan.recommended ? 'blue' : 'secondary'}
                  style={{ marginTop: 18 }}
                  onClick={() => navigate(hasSession ? '/app/subscription' : '/register')}
                >
                  {hasSession ? '查看订阅' : '注册查看'}
                </Button>
              </SurfaceCard>
            ))}
          </div>

          <div
            className="anim-up"
            style={{
              maxWidth: 760,
              margin: '28px auto 0',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              background: 'var(--amber-pale)',
              border: '1px solid #f3e2c4',
              borderRadius: 'var(--r-md)',
              padding: '14px 16px',
            }}
          >
            <ShieldAlert size={18} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--amber)', lineHeight: 1.7 }}>
              AI 生成内容基于历史数据与技术形态分析，仅供参考，不构成投资建议。置信度不代表收益承诺，市场有风险，投资需谨慎。
            </p>
          </div>
        </div>
      </section>

      {/* ============ Footer ============ */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <rect width="40" height="40" rx="11" fill="#101820" />
                <rect x="11" y="22" width="5" height="9" rx="2.5" fill="#BFE8D4" />
                <rect x="19" y="16" width="5" height="15" rx="2.5" fill="#22B578" />
                <circle cx="29.5" cy="12.5" r="3" fill="#7EDDB2" />
              </svg>
              <strong style={{ fontSize: 16 }}>DeepTrading AI</strong>
            </div>
            <p className="lp-footer__note">
              本站所有分析内容由 AI 生成，仅供学习与研究参考，不构成任何投资建议或收益承诺。
            </p>
          </div>

          <div className="lp-footer__links">
            <a className="lp-footer__link" href="#capabilities">产品能力</a>
            <a className="lp-footer__link" href="#workflow">工作流程</a>
            <a className="lp-footer__link" href="#plans">会员订阅</a>
            <button className="lp-footer__link" onClick={() => navigate('/app/contact')}>联系我们</button>
            <button className="lp-footer__link" onClick={() => navigate('/terms')}>服务条款</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
