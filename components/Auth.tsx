import React, { useEffect, useState } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff,
  ChevronLeft,
  Sparkles,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import Logo from './Logo';

type AuthView = 'login' | 'register';
type AppView = 'landing' | 'login' | 'register' | 'terms';

interface AuthProps {
  initialView: AuthView;
  onLoginSuccess: () => void;
  onGuestLogin: () => void;
  onNavigateTo: (view: AppView) => void;
}

const Auth: React.FC<AuthProps> = ({ initialView, onLoginSuccess, onGuestLogin, onNavigateTo }) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form States
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const API_BASE_URL = 'http://localhost:3001';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  // Handle View Switch
  const switchView = (newView: AuthView) => {
    setView(newView);
    setErrorMessage(null);
    setSuccessMessage(null);
    // Sync with parent nav if needed, or just handle local visual switch
    // For URL-less navigation, local state is usually enough unless parent needs to know
  };

  const sendVerificationCode = async () => {
    setErrorMessage(null);
    if (!email || !emailRegex.test(email)) {
      setErrorMessage('请输入正确的邮箱地址');
      return;
    }
    if (cooldownSeconds > 0) return;

    setIsSendingCode(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const retryAfter = typeof data?.retryAfterSeconds === 'number' ? data.retryAfterSeconds : null;
        if (response.status === 429 && retryAfter) {
          setCooldownSeconds(retryAfter);
        }
        setErrorMessage(data?.error || '验证码发送失败');
        return;
      }

      setCooldownSeconds(60);
    } catch (e) {
      setErrorMessage('验证码发送失败');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      if (view === 'login') {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setErrorMessage(data?.error || '登录失败');
          return;
        }

        if (data?.token) {
          localStorage.setItem('auth_token', data.token);
        }
        if (typeof data?.user?.channel === 'number') {
          localStorage.setItem('auth_channel', String(data.user.channel));
        }
        onLoginSuccess();
        return;
      }

      if (!agreeTerms) {
        setErrorMessage('请先阅读并同意服务条款与免责声明');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, email, password, code: verificationCode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(data?.error || '注册失败');
        return;
      }

      setSuccessMessage('注册成功，请使用邮箱或账号密码登录');
      setIdentifier(email);
      setPassword('');
      setVerificationCode('');
      setAgreeTerms(false);
      setView('login');
    } finally {
      setIsLoading(false);
    }
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
               <label className="text-sm font-bold text-gray-700 ml-1">{isLogin ? '邮箱或用户名' : '电子邮箱'}</label>
               <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                  <input 
                    type={isLogin ? "text" : "email"}
                    value={isLogin ? identifier : email}
                    onChange={(e) => (isLogin ? setIdentifier(e.target.value) : setEmail(e.target.value))}
                    placeholder={isLogin ? "name@example.com 或用户名" : "name@example.com"}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:bg-white transition-all"
                    required
                  />
               </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-bold text-gray-700">验证码</label>
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    disabled={isSendingCode || cooldownSeconds > 0 || !email}
                    className="text-xs font-bold text-lime-600 hover:text-lime-700 hover:underline disabled:opacity-50 disabled:hover:no-underline"
                  >
                    {cooldownSeconds > 0 ? `重新发送(${cooldownSeconds}s)` : (isSendingCode ? '发送中...' : '获取验证码')}
                  </button>
                </div>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6位验证码"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:bg-white transition-all"
                  required={!isLogin}
                />
              </div>
            )}

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

            {errorMessage && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl px-4 py-3 text-sm font-bold">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="bg-lime-50 border border-lime-100 text-lime-800 rounded-2xl px-4 py-3 text-sm font-bold">
                {successMessage}
              </div>
            )}

            {!isLogin && (
              <div className="pt-2">
                <label className="flex items-start gap-3 select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-lime-600 focus:ring-lime-300"
                  />
                  <div className="text-sm text-gray-600 font-medium leading-relaxed">
                    我已阅读并同意
                    <button
                      type="button"
                      onClick={() => onNavigateTo('terms')}
                      className="text-lime-600 font-bold hover:underline underline-offset-4 mx-1"
                    >
                      《服务条款与免责声明》
                    </button>
                    <div className="text-xs text-gray-400 font-medium mt-1">
                      注册即表示您已充分了解并接受我们的服务条款和免责声明
                    </div>
                  </div>
                </label>
              </div>
            )}
          </form>

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
