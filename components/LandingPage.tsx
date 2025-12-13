
import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Zap, 
  Play, 
  BrainCircuit, 
  TrendingUp, 
  Cpu, 
  Globe, 
  Shield,
  Twitter,
  Github,
  Linkedin
} from 'lucide-react';
import Logo from './Logo';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-gray-50 hover:bg-white p-8 rounded-[2rem] border border-transparent hover:border-gray-100 hover:shadow-xl transition-all duration-300 group">
    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-gray-500 leading-relaxed">{desc}</p>
  </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const avatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert&backgroundColor=c0aede",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Nala&backgroundColor=b6e3f4",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=ffdfbf",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=d1d4f9"
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-900 selection:bg-lime-300 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md py-3 md:py-4 shadow-sm' : 'bg-transparent py-4 md:py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
          
          {/* Logo Section */}
          <div className="flex items-center gap-2 md:gap-3">
            <Logo size={32} className="md:w-[40px] md:h-[40px] shadow-lg shadow-lime-900/10" />
            <span className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">DeepTrading</span>
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-3 md:gap-6">
            <button 
              onClick={onLogin}
              className="text-sm md:text-base font-bold text-gray-600 hover:text-black transition-colors px-1 md:px-2 whitespace-nowrap"
            >
              登录
            </button>
            <button 
              onClick={onRegister}
              className="bg-black text-white px-4 py-2 md:px-8 md:py-3.5 rounded-full text-xs md:text-base font-bold hover:scale-105 hover:bg-gray-900 transition-all flex items-center gap-1.5 md:gap-2 shadow-xl shadow-black/20 whitespace-nowrap"
            >
              立即体验 <ArrowRight size={14} className="md:w-[18px] md:h-[18px]" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-24 pb-16 lg:pt-32 lg:pb-20 px-4 md:px-6">
        {/* Abstract Background Elements */}
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-lime-300 rounded-full blur-[130px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-300 rounded-full blur-[110px] opacity-20"></div>

        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-1000">
            {/* Removed the AI 4.0 Badge as requested */}
            
            <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold leading-[1.05] tracking-tight">
              让 <span className="relative whitespace-nowrap">
                <span className="relative z-10 text-lime-600">人工智能</span>
                <span className="absolute bottom-3 left-0 w-full h-5 bg-lime-200 -z-0 rotate-1"></span>
              </span> <br/>
              接管您的投资决策
            </h1>
            
            <p className="text-lg md:text-2xl text-gray-500 max-w-xl leading-relaxed font-medium">
              DeepTrading 利用最先进的深度学习模型，实时分析全球股市动态。告别情绪化交易，用数据重塑财富增长曲线。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 pt-2">
              <button 
                onClick={onRegister}
                className="h-14 md:h-16 px-8 md:px-10 rounded-full bg-black text-white text-base md:text-lg font-bold flex items-center justify-center gap-2 shadow-xl shadow-lime-900/10 hover:bg-gray-800 transition-all hover:-translate-y-1 hover:shadow-2xl"
              >
                <Zap className="fill-lime-300 text-lime-300" size={20} />
                开始 AI 诊断
              </button>
              <button className="h-14 md:h-16 px-8 md:px-10 rounded-full bg-white border border-gray-200 text-gray-900 text-base md:text-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                <Play size={20} fill="currentColor" className="opacity-80"/> 观看演示视频
              </button>
            </div>
            
            {/* Social Proof - Realistic Avatars */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-4 md:-space-x-5">
                {avatars.map((url, i) => (
                  <div key={i} className="w-12 h-12 md:w-14 md:h-14 rounded-full border-[3px] border-white bg-gray-100 overflow-hidden shadow-md relative z-10 hover:z-20 hover:scale-110 transition-transform">
                     <img 
                        src={url} 
                        alt="User" 
                        className="w-full h-full object-cover"
                     />
                  </div>
                ))}
              </div>
              <div>
                 <div className="flex items-center gap-1 mb-1">
                    <div className="flex text-yellow-400 text-sm md:text-base">
                        {[1,2,3,4,5].map(s => <span key={s}>★</span>)}
                    </div>
                    <span className="font-bold text-sm md:text-base">5.0</span>
                 </div>
                 <p className="text-gray-500 font-medium text-sm md:text-base">已有 <span className="text-black font-bold">10,000+</span> 专业投资者加入</p>
              </div>
            </div>
          </div>

          {/* Hero Visual / Dashboard Preview */}
          <div className="relative group perspective-1000 mt-8 lg:mt-0">
             <div className="absolute inset-0 bg-gradient-to-tr from-lime-400 to-emerald-300 rounded-[2.5rem] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 -rotate-6 scale-95"></div>
             <div className="relative bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl p-4 md:p-6 rotate-y-6 transform transition-transform duration-700 hover:rotate-0 hover:scale-[1.02]">
                {/* Simulated UI Header */}
                <div className="flex items-center justify-between mb-8 px-2 pt-2">
                   <div className="flex gap-2">
                     <div className="w-3.5 h-3.5 rounded-full bg-red-400"></div>
                     <div className="w-3.5 h-3.5 rounded-full bg-yellow-400"></div>
                     <div className="w-3.5 h-3.5 rounded-full bg-green-400"></div>
                   </div>
                   <div className="h-3 w-40 bg-gray-100 rounded-full"></div>
                </div>
                {/* Simulated Chart */}
                <div className="space-y-6 px-2 pb-4">
                   <div className="flex justify-between items-end">
                      <div>
                        <div className="text-gray-400 font-bold mb-1">AAPL 预测走势</div>
                        <div className="text-3xl md:text-4xl font-black tracking-tight">$182.50 <span className="text-emerald-500 text-lg font-bold ml-2">+4.2%</span></div>
                      </div>
                      <div className="bg-black text-white text-[10px] md:text-xs font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2">
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-lime-400 animate-pulse"></span>
                          AI 信心度 98%
                      </div>
                   </div>
                   <div className="h-32 md:h-48 bg-gray-50 rounded-2xl flex items-end justify-between p-3 gap-1.5 overflow-hidden">
                      {[40, 55, 45, 60, 65, 85, 75, 90, 100].map((h, i) => (
                        <div key={i} className="w-full bg-emerald-400 rounded-t-lg opacity-80 transition-all duration-500 hover:opacity-100" style={{height: `${h}%`}}></div>
                      ))}
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl">
                         <div className="h-2.5 w-20 bg-gray-200 rounded-full mb-3"></div>
                         <div className="h-5 w-24 md:w-32 bg-gray-300 rounded-full"></div>
                      </div>
                      <div className="bg-lime-100 p-4 rounded-2xl">
                         <div className="h-2.5 w-20 bg-lime-200 rounded-full mb-3"></div>
                         <div className="h-5 w-24 md:w-32 bg-lime-400 rounded-full"></div>
                      </div>
                   </div>
                </div>
             </div>
             
             {/* Floating Elements */}
             <div className="absolute -left-4 md:-left-8 lg:-left-12 top-1/2 bg-white p-3 md:p-5 rounded-2xl shadow-xl border border-gray-100 animate-bounce duration-[3000ms]">
                <BrainCircuit className="text-black mb-2 md:mb-3" size={28} />
                <div className="text-[10px] md:text-xs text-gray-400 font-bold mb-1">算力节点</div>
                <div className="font-bold text-emerald-500 text-base md:text-lg">Online</div>
             </div>
             <div className="absolute -right-2 md:-right-4 lg:-right-8 bottom-16 bg-black text-white p-3 md:p-5 rounded-2xl shadow-xl animate-bounce duration-[4000ms]">
                <TrendingUp className="text-lime-300 mb-2 md:mb-3" size={28} />
                <div className="text-[10px] md:text-xs text-gray-400 font-bold mb-1">准确率</div>
                <div className="font-bold text-lime-300 text-base md:text-lg">94.8%</div>
             </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">不只是工具，<br/>是您的超级外脑</h2>
            <p className="text-xl text-gray-500">传统交易软件只提供数据，DeepTrading AI 提供答案。</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Cpu size={32} className="text-lime-600"/>}
              title="大模型深度分析"
              desc="接入 Gemini 2.5 Pro 金融微调模型，秒级阅读财报、新闻与政策，输出专业研报。"
            />
            <FeatureCard 
              icon={<Globe size={32} className="text-blue-600"/>}
              title="全市场情绪捕捉"
              desc="实时监控 Twitter、Reddit 及主流财经媒体，量化市场恐慌与贪婪指数。"
            />
            <FeatureCard 
              icon={<Shield size={32} className="text-purple-600"/>}
              title="机构级风控"
              desc="智能动态止损算法，在市场剧烈波动前提前预警，保护您的本金安全。"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-black rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime-500 rounded-full blur-[150px] opacity-20"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">准备好升级您的投资策略了吗？</h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">加入 DeepTrading，获得以前只有顶级对冲基金才拥有的 AI 武器。</p>
            <button 
              onClick={onRegister}
              className="bg-lime-300 text-black px-10 py-5 rounded-full text-xl font-bold hover:bg-lime-400 hover:scale-105 transition-all shadow-[0_0_40px_rgba(190,242,100,0.4)]"
            >
              免费开始试用
            </button>
            <p className="mt-6 text-sm text-gray-500">无需绑定信用卡 · 14天免费试用 · 随时取消</p>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-gray-50 py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-bold text-gray-900">DeepTrading Inc.</span>
          </div>
          <div className="text-sm text-gray-500">
            © 2024 DeepTrading. All rights reserved. 
          </div>
          <div className="flex gap-6">
             <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-black hover:text-white transition-all">
                <Twitter size={18} />
             </button>
             <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-black hover:text-white transition-all">
                <Github size={18} />
             </button>
             <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-black hover:text-white transition-all">
                <Linkedin size={18} />
             </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
