
import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Github, 
  Twitter, 
  Chrome, 
  Eye, 
  EyeOff,
  ChevronLeft,
  Sparkles,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import Logo from './Logo';

type AuthView = 'login' | 'register';

interface AuthProps {
  initialView: AuthView;
  onLoginSuccess: () => void;
  onGuestLogin: () => void;
  onNavigateTo: (view: 'landing' | 'login' | 'register') => void;
}

const Auth: React.FC<AuthProps> = ({ initialView, onLoginSuccess, onGuestLogin, onNavigateTo }) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Handle View Switch
  const switchView = (newView: AuthView) => {
    setView(newView);
    // Sync with parent nav if needed, or just handle local visual switch
    // For URL-less navigation, local state is usually enough unless parent needs to know
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API Call
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 1500);
  };

  const isLogin = view === 'login';

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900 selection:bg-lime-200 selection:text-lime-900">
      
      {/* Left Column: Form Section */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center px-6 sm:px-12 xl:px-24 relative animate-in fade-in slide-in-from-left-8 duration-500 py-12 lg:py-0">
        
        {/* Back to Home */}
        <button 
          onClick={() => onNavigateTo('landing')}
          className="absolute top-4 left-4 sm:top-8 sm:left-12 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors"
        >
          <ChevronLeft size={18} /> 返回首页
        </button>

        <div className="max-w-md w-full mx-auto mt-8 lg:mt-0">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
               <Logo size={48} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
              {isLogin ? '欢迎回来' : '创建新账户'}
            </h1>
            <p className="text-gray-500 font-medium text-lg">
              {isLogin 
                ? '登录以继续使用您的 AI 投资助手' 
                : '开始您的 AI 深度投研之旅'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-gray-700 ml-1">全名</label>
                 <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Chen"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:bg-white transition-all"
                      required={!isLogin}
                    />
                 </div>
              </div>
            )}

            <div className="space-y-1.5">
               <label className="text-sm font-bold text-gray-700 ml-1">电子邮箱</label>
               <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:bg-white transition-all"
                    required
                  />
               </div>
            </div>

            <div className="space-y-1.5">
               <div className="flex justify-between items-center ml-1">
                 <label className="text-sm font-bold text-gray-700">密码</label>
                 {isLogin && (
                   <button type="button" className="text-xs font-bold text-lime-600 hover:text-lime-700 hover:underline">
                     忘记密码?
                   </button>
                 )}
               </div>
               <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:bg-white transition-all"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
               </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg hover:bg-gray-800 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  处理中...
                </>
              ) : (
                <>
                  {isLogin ? '立即登录' : '创建账户'} <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Social Login */}
          <div className="my-8 flex items-center gap-4">
             <div className="h-px bg-gray-100 flex-1"></div>
             <span className="text-xs font-bold text-gray-400">或者使用</span>
             <div className="h-px bg-gray-100 flex-1"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button className="flex items-center justify-center gap-2 py-3 border-2 border-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all">
                <Chrome size={20} /> Google
             </button>
             <button className="flex items-center justify-center gap-2 py-3 border-2 border-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all">
                <Twitter size={20} /> Twitter
             </button>
          </div>

          {/* Guest Access Button */}
          <div className="mt-6">
            <button 
              onClick={onGuestLogin}
              className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors group border border-transparent hover:border-gray-200"
            >
               <User size={18} className="text-gray-400 group-hover:text-gray-600" />
               以游客身份访问 (无需注册)
            </button>
          </div>

          {/* Toggle View */}
          <p className="text-center mt-6 text-gray-500 font-medium">
             {isLogin ? "还没有账户？" : "已有账户？"}
             <button 
               onClick={() => switchView(isLogin ? 'register' : 'login')}
               className="text-lime-600 font-bold ml-1 hover:underline underline-offset-4"
             >
               {isLogin ? "立即注册" : "直接登录"}
             </button>
          </p>
        </div>
      </div>

      {/* Right Column: Visual Section */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#09090b] relative overflow-hidden flex-col justify-between p-16 text-white">
          {/* Abstract Background */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-400/20 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="relative z-10">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-lime-300 mb-8">
                <Sparkles size={12} />
                <span>AI 驱动的金融未来</span>
             </div>
             <h2 className="text-5xl font-extrabold leading-tight mb-6">
                让数据<br/>
                <span className="text-lime-300">重塑</span> 您的<br/>
                投资直觉。
             </h2>
             <p className="text-gray-400 text-lg max-w-sm leading-relaxed">
                加入 DeepTrading，与 10,000+ 专业投资者一起，利用 Gemini 2.5 Pro 洞察市场先机。
             </p>
          </div>

          {/* Floating Card */}
          <div className="relative z-10 mt-12 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 p-0.5">
                   <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                      <TrendingUp size={20} className="text-lime-300" />
                   </div>
                </div>
                <div>
                   <div className="font-bold text-white">AAPL 趋势预测</div>
                   <div className="text-xs text-gray-400 font-mono">刚刚生成 • 准确率 94.8%</div>
                </div>
             </div>
             <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-lime-400 w-[85%] rounded-full"></div>
             </div>
             <div className="flex justify-between items-center text-xs font-bold text-gray-300">
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-lime-400"/> 强烈买入信号</span>
                <span>目标价 $195.00</span>
             </div>
          </div>

          <div className="relative z-10 text-sm font-medium text-gray-500">
             © 2024 DeepTrading Inc.
          </div>
      </div>

    </div>
  );
};

export default Auth;
