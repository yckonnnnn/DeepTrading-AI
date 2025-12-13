
import React, { useState } from 'react';
import { BookOpenCheck, ChevronRight, User, Clock, ArrowLeft, Tag, Share2, ThumbsUp } from 'lucide-react';

interface Article {
  id: number;
  title: string;
  author: string;
  role: string;
  date: string;
  readTime: string;
  tags: string[];
  summary: string;
  content: string[]; // Array of paragraphs
  coverColor: string;
}

const articles: Article[] = [
  {
    id: 1,
    title: "2024年下半年全球宏观经济展望：通胀、利率与资产配置",
    author: "Ray Dalio",
    role: "Bridgewater Associates 创始人",
    date: "2023-10-25",
    readTime: "8 min read",
    tags: ["宏观经济", "资产配置", "深度思考"],
    coverColor: "bg-rose-100 text-rose-800",
    summary: "随着美联储加息周期接近尾声，全球流动性拐点是否已经到来？本文深入探讨了在新的债务周期下，投资者应如何调整投资组合以应对潜在的衰退风险。",
    content: [
      "当前的经济周期与过去几十年有着本质的区别。我们正在经历一个债务货币化的过程，这意味着持有现金将不再是安全的避风港。",
      "对于接下来的六个月，我建议投资者关注那些具有强大现金流创造能力的公司，以及那些能够抵御通胀侵蚀的实物资产。黄金和大宗商品在投资组合中的占比应当适度提高。",
      "与此同时，新兴市场的估值优势正在显现。特别是那些拥有经常账户盈余且外债负担较轻的国家，可能会在美元走弱的背景下迎来资本回流。",
      "总之，分散化投资从未像今天这样重要。不要把所有的鸡蛋放在一个篮子里，也不要押注于单一的经济情景。"
    ]
  },
  {
    id: 2,
    title: "A股市场结构性机会分析：科技成长与红利防守的平衡之道",
    author: "张磊",
    role: "高瓴资本 创始人",
    date: "2023-10-20",
    readTime: "6 min read",
    tags: ["A股策略", "价值投资", "科技"],
    coverColor: "bg-blue-100 text-blue-800",
    summary: "在当前存量博弈的市场环境下，单纯的进攻或防守都难以获得超额收益。本文分析了如何在科技成长的弹性和红利资产的稳健之间寻找最佳平衡点。",
    content: [
      "A股市场目前正处于一个估值修复的关键窗口期。虽然整体指数波动不大，但结构性分化非常明显。",
      "一方面，以人工智能、高端制造为代表的硬科技板块，受益于国产替代的产业逻辑，具备长期的增长潜力。但这需要投资者具备极强的甄别能力，去伪存真。",
      "另一方面，高股息的红利资产（如能源、运营商、银行）提供了难得的确定性。在无风险利率下行的趋势下，这类资产的类债属性使其成为资金的避风港。",
      "我的建议是采取'哑铃型'策略：一手抓高成长，一手抓高分红。避免在中间地带徘徊，那些既没有成长性又没有分红能力的平庸公司将被市场逐步淘汰。"
    ]
  },
  {
    id: 3,
    title: "价值回归：巴菲特致股东信中的长期主义智慧",
    author: "Warren Buffett",
    role: "Berkshire Hathaway 董事长",
    date: "2023-10-15",
    readTime: "10 min read",
    tags: ["长期主义", "巴菲特", "经典"],
    coverColor: "bg-emerald-100 text-emerald-800",
    summary: "重读巴菲特历年致股东信，我们能学到的不仅仅是选股技巧，更是穿越周期的心态。本文精选了关于市场波动与安全边际的经典论述。",
    content: [
      "市场先生是你的仆人，而不是你的向导。利用市场的愚蠢，而不是参与其中。",
      "我们从不试图预测股市的短期走势。我们只关注企业的长期内在价值。如果你不愿意持有一只股票十年，那么由于不要持有它十分钟。",
      "价格是你付出的，价值是你得到的。无论通过袜子还是股票，我都喜欢在打折时购买优质商品。",
      "在别人贪婪时恐惧，在别人恐惧时贪婪。这句老话听起来简单，做起来却极难。但正是这种反人性的操作，构成了价值投资的基石。"
    ]
  }
];

const FeaturedContent = () => {
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  if (activeArticle) {
    return (
      <div className="max-w-4xl mx-auto pb-24 md:pb-10 animate-in fade-in slide-in-from-right-8 duration-300">
        <button 
          onClick={() => setActiveArticle(null)}
          className="mb-6 md:mb-8 flex items-center gap-2 text-gray-500 hover:text-black font-bold transition-colors group px-4 py-2 rounded-xl hover:bg-gray-100 w-fit"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          返回列表
        </button>

        <article className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-gray-100">
           {/* Article Header */}
           <div className="mb-8 border-b border-gray-100 pb-8">
              <div className="flex flex-wrap gap-2 mb-4">
                 {activeArticle.tags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-[10px] md:text-xs font-bold border border-gray-100">
                       #{tag}
                    </span>
                 ))}
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-snug">
                 {activeArticle.title}
              </h1>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
                 <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg ${activeArticle.coverColor} flex-shrink-0`}>
                       {activeArticle.author.charAt(0)}
                    </div>
                    <div>
                       <div className="font-bold text-gray-900 text-sm md:text-base">{activeArticle.author}</div>
                       <div className="text-xs text-gray-500 font-medium">{activeArticle.role}</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 text-gray-400 text-xs md:text-sm font-medium bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-xl md:rounded-none">
                    <span className="flex items-center gap-1"><Clock size={16}/> {activeArticle.readTime}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>{activeArticle.date}</span>
                 </div>
              </div>
           </div>

           {/* Content */}
           <div className="prose prose-lg max-w-none text-gray-600 space-y-6 leading-relaxed font-medium">
              {activeArticle.content.map((paragraph, index) => (
                 <p key={index} className="text-base md:text-lg text-justify">
                    {index === 0 && <span className="float-left text-3xl md:text-4xl font-bold text-black mr-2 leading-none mt-[-4px]">{paragraph.charAt(0)}</span>}
                    {index === 0 ? paragraph.slice(1) : paragraph}
                 </p>
              ))}
           </div>

           {/* Footer Actions */}
           <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-gray-400 text-sm font-bold order-2 sm:order-1">
                 发布于 {activeArticle.date}
              </div>
              <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
                 <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                    <ThumbsUp size={18} />
                    <span className="inline">有启发</span>
                 </button>
                 <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">
                    <Share2 size={18} />
                    <span className="inline">分享观点</span>
                 </button>
              </div>
           </div>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-10">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-10 gap-6">
          <div>
             <h2 className="text-3xl font-extrabold text-gray-900 mb-2">金融家洞察</h2>
             <p className="text-gray-500 font-medium">汇聚全球顶级投资智慧，助您穿越市场周期</p>
          </div>
          
          {/* Scrollable Filters for Mobile */}
          <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
             <div className="flex gap-2 min-w-max">
                 {['全部', '宏观', 'A股', '美股', '加密货币'].map((filter, i) => (
                    <button 
                      key={i}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${i === 0 ? 'bg-black text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
                    >
                       {filter}
                    </button>
                 ))}
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {articles.map((article) => (
             <div 
               key={article.id}
               onClick={() => setActiveArticle(article)}
               className="bg-white p-5 md:p-6 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col active:scale-[0.98]"
             >
                <div className={`h-36 md:h-40 rounded-2xl mb-5 md:mb-6 ${article.coverColor} flex items-center justify-center p-6 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl translate-x-10 -translate-y-10"></div>
                    <BookOpenCheck size={48} className="opacity-50" />
                    <div className="absolute bottom-4 left-4 bg-white/30 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border border-white/20">
                       {article.readTime}
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                   {article.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                         {tag}
                      </span>
                   ))}
                </div>

                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3 leading-snug group-hover:text-lime-700 transition-colors line-clamp-2">
                   {article.title}
                </h3>
                
                <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-3 mb-6 flex-1">
                   {article.summary}
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-gray-50 mt-auto">
                   <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${article.coverColor}`}>
                         {article.author.charAt(0)}
                      </div>
                      <div className="text-xs font-bold text-gray-700">
                         {article.author}
                      </div>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors shadow-sm">
                      <ChevronRight size={16} />
                   </div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
};

export default FeaturedContent;
