import React, { useState } from 'react';
import { ArrowLeft, BookOpenCheck, ChevronRight, Clock, ThumbsUp } from 'lucide-react';
import { SurfaceCard } from '../components/ui/Surface';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks/useToast';

interface Article {
  id: number;
  title: string;
  author: string;
  role: string;
  date: string;
  readTime: string;
  tags: string[];
  summary: string;
  content: string[];
  accent: string;
}

const ARTICLES: Article[] = [
  {
    id: 1,
    title: '2024 年下半年全球宏观经济展望：通胀、利率与资产配置',
    author: 'Ray Dalio',
    role: 'Bridgewater Associates 创始人',
    date: '2023-10-25',
    readTime: '8 分钟',
    tags: ['宏观经济', '资产配置'],
    accent: 'linear-gradient(135deg, #fdeceb, #f9d9d5)',
    summary:
      '随着美联储加息周期接近尾声，全球流动性拐点是否已经到来？本文探讨在新的债务周期下，投资者应如何调整组合以应对潜在的衰退风险。',
    content: [
      '当前的经济周期与过去几十年有着本质的区别。我们正在经历一个债务货币化的过程，这意味着持有现金将不再是安全的避风港。',
      '对于接下来的六个月，建议关注具有强大现金流创造能力的公司，以及能够抵御通胀侵蚀的实物资产。黄金和大宗商品在投资组合中的占比应当适度提高。',
      '与此同时，新兴市场的估值优势正在显现。特别是那些拥有经常账户盈余且外债负担较轻的国家，可能会在美元走弱的背景下迎来资本回流。',
      '总之，分散化投资从未像今天这样重要。不要把所有的鸡蛋放在一个篮子里，也不要押注于单一的经济情景。',
    ],
  },
  {
    id: 2,
    title: 'A 股市场结构性机会分析：科技成长与红利防守的平衡之道',
    author: '张磊',
    role: '高瓴资本 创始人',
    date: '2023-10-20',
    readTime: '6 分钟',
    tags: ['A 股策略', '价值投资'],
    accent: 'linear-gradient(135deg, #eaf3ff, #d3e4fd)',
    summary:
      '在存量博弈的市场环境下，单纯的进攻或防守都难以获得超额收益。本文分析如何在科技成长的弹性与红利资产的稳健之间寻找平衡。',
    content: [
      'A 股市场目前正处于估值修复的关键窗口期。虽然整体指数波动不大，但结构性分化非常明显。',
      '一方面，以人工智能、高端制造为代表的硬科技板块，受益于国产替代的产业逻辑，具备长期增长潜力。但这需要极强的甄别能力，去伪存真。',
      '另一方面，高股息的红利资产（如能源、运营商、银行）提供了难得的确定性。在无风险利率下行的趋势下，这类资产的类债属性使其成为资金的避风港。',
      '建议采取「哑铃型」策略：一手抓高成长，一手抓高分红，避免在中间地带徘徊。',
    ],
  },
  {
    id: 3,
    title: '价值回归：巴菲特致股东信中的长期主义智慧',
    author: 'Warren Buffett',
    role: 'Berkshire Hathaway 董事长',
    date: '2023-10-15',
    readTime: '10 分钟',
    tags: ['长期主义', '经典'],
    accent: 'linear-gradient(135deg, #e8f7ef, #cdeeda)',
    summary:
      '重读巴菲特历年致股东信，能学到的不仅是选股技巧，更是穿越周期的心态。本文精选关于市场波动与安全边际的经典论述。',
    content: [
      '市场先生是你的仆人，而不是你的向导。利用市场的愚蠢，而不是参与其中。',
      '我们从不试图预测股市的短期走势，只关注企业的长期内在价值。如果你不愿意持有一只股票十年，那就不要持有它十分钟。',
      '价格是你付出的，价值是你得到的。无论通过袜子还是股票，我都喜欢在打折时购买优质商品。',
      '在别人贪婪时恐惧，在别人恐惧时贪婪。这句话听起来简单，做起来极难，但正是这种反人性的操作构成了价值投资的基石。',
    ],
  },
];

const FeaturedPage: React.FC = () => {
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const { showToast } = useToast();

  if (activeArticle) {
    return (
      <div className="anim-page" style={{ maxWidth: 780, margin: '0 auto' }}>
        <button
          onClick={() => setActiveArticle(null)}
          className="row-item"
          style={{ width: 'fit-content', padding: '8px 14px 8px 10px', borderRadius: 'var(--r-full)', border: '1px solid var(--divider-soft)', background: 'var(--surface)', marginBottom: 16, fontWeight: 700, fontSize: 13.5, color: 'var(--text-2)' }}
        >
          <ArrowLeft size={15} /> 返回列表
        </button>

        <SurfaceCard xl pad>
          <div style={{ borderBottom: '1px solid var(--divider-soft)', paddingBottom: 22, marginBottom: 22 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {activeArticle.tags.map((tag, i) => (
                <span key={i} className="chip chip--outline">#{tag}</span>
              ))}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.35 }}>{activeArticle.title}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: activeArticle.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {activeArticle.author.charAt(0)}
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{activeArticle.author}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{activeArticle.role}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600 }}>
                <Clock size={13} />
                {activeArticle.readTime}
                <span aria-hidden="true">·</span>
                {activeArticle.date}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activeArticle.content.map((paragraph, index) => (
              <p key={index} style={{ fontSize: 15, lineHeight: 1.95, color: '#33404f' }}>
                {paragraph}
              </p>
            ))}
          </div>

          <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--divider-soft)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => showToast('感谢你的反馈', 'success')}>
              <ThumbsUp size={15} /> 有启发
            </Button>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="anim-page" style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div className="page-head">
        <h1>金融家洞察</h1>
        <p className="page-head__sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          汇聚全球投资智慧，助你穿越市场周期
          <span className="demo-chip">示例内容</span>
        </p>
      </div>

      <div className="stagger" style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
        {ARTICLES.map((article) => (
          <SurfaceCard
            key={article.id}
            xl
            pad
            interactive
            role="button"
            tabIndex={0}
            onClick={() => setActiveArticle(article)}
            onKeyDown={(e) => { if (e.key === 'Enter') setActiveArticle(article); }}
            style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexDirection: 'row' }}
          >
            <div
              className="article-card__cover"
              style={{ background: article.accent, width: 132, flexShrink: 0, margin: 0, display: 'flex' }}
            >
              <BookOpenCheck size={34} style={{ opacity: 0.55, color: 'var(--ink)' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {article.tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="chip chip--outline">{tag}</span>
                ))}
              </div>
              <h3 style={{ fontSize: 16.5, fontWeight: 800, lineHeight: 1.5 }}>{article.title}</h3>
              <p
                style={{
                  fontSize: 13.5,
                  color: 'var(--text-2)',
                  lineHeight: 1.7,
                  marginTop: 6,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {article.summary}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--divider-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: article.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 12,
                    }}
                  >
                    {article.author.charAt(0)}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{article.author}</span>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
                  阅读 <ChevronRight size={13} />
                </span>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
};

export default FeaturedPage;
