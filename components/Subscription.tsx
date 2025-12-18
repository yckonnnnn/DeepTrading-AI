
import React, { useState, useEffect } from 'react';
import { Check, Sparkles, Zap, Shield, Crown, X } from 'lucide-react';

const plans = [
  {
    id: 'weekly',
    name: '周会员',
    duration: '/ 周',
    price: '18',
    originalPrice: '28',
    description: '短期体验，适合突击分析',
    features: [
      '解锁 Deep Trading AI 2.5 Pro 深度分析',
      '每日 10 次 AI 诊断配额',
      '基础技术指标解读',
      '标准响应速度'
    ],
    theme: 'light',
    buttonText: '开启周计划',
    badge: null
  },
  {
    id: 'monthly',
    name: '月会员',
    duration: '/ 月',
    price: '68',
    originalPrice: '128',
    description: '最受欢迎，适合波段交易者',
    features: [
      '包含周会员所有权益',
      '无限次 AI 诊断配额',
      '解锁「资金与情绪」深度数据',
      '优先生成，急速响应',
      '导出高清分析报告'
    ],
    theme: 'primary',
    buttonText: '开启月计划',
    badge: 'Most Popular'
  },
  {
    id: 'yearly',
    name: '年会员',
    duration: '/ 年',
    price: '688',
    originalPrice: '1588',
    description: '长期主义，专业投资者的选择',
    features: [
      '包含月会员所有权益',
      '专属 AI 策略定制',
      '历史回测数据访问',
      '一对一专家客服支持',
      '新功能优先体验权'
    ],
    theme: 'dark',
    buttonText: '开启年计划',
    badge: 'Best Value'
  }
];

const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border border-gray-800">
    <span className="text-xl">🚧</span>
    <span className="font-bold text-sm">{message}</span>
    <button onClick={onClose} className="ml-2 hover:bg-gray-700 rounded-full p-1 transition-colors"><X size={14}/></button>
  </div>
);

const AdminGrantModal = ({
  isOpen,
  onClose,
  defaultPlan,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan: 'weekly' | 'monthly' | 'yearly' | null;
  onConfirm: (payload: { identifier: string; planCode: 'weekly' | 'monthly' | 'yearly'; provider: 'alipay' | 'wechat' | 'card' }) => Promise<boolean>;
}) => {
  const [identifier, setIdentifier] = useState('');
  const [planCode, setPlanCode] = useState<'weekly' | 'monthly' | 'yearly'>(defaultPlan || 'monthly');
  const [provider, setProvider] = useState<'alipay' | 'wechat' | 'card'>('alipay');
  const [isProcessing, setIsProcessing] = useState(false);

  const planLabel = planCode === 'weekly' ? '周会员' : planCode === 'monthly' ? '月会员' : '年会员';

  useEffect(() => {
    if (!isOpen) return;
    setPlanCode(defaultPlan || 'monthly');
  }, [defaultPlan, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const clean = identifier.trim();
    if (!clean) return;
    setIsProcessing(true);
    try {
      const ok = await onConfirm({ identifier: clean, planCode, provider });
      if (ok) onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl relative z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden border border-white/40">
        <div className="bg-gradient-to-b from-gray-50 to-white p-8 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">临时开通会员</h3>
            <p className="text-sm text-gray-500 font-semibold mt-1">仅管理员可用 · 直接写入订阅数据</p>
            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-black text-white text-xs font-extrabold">
              本次开通：{planLabel}
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/80 backdrop-blur rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors shadow-sm border border-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
            <div className="text-xs font-bold text-gray-500 mb-2">用户名或邮箱</div>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="输入用户名或邮箱"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-lime-300"
            />
          </div>

          <div className="space-y-3">
            <div className="text-sm font-extrabold text-gray-900">选择支付方式</div>

            <button
              type="button"
              onClick={() => setProvider('alipay')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${provider === 'alipay' ? 'border-blue-500 bg-blue-50 shadow-[0_10px_30px_rgba(59,130,246,0.12)]' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center">支</div>
                <div className="text-base font-extrabold text-gray-900">支付宝</div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${provider === 'alipay' ? 'border-blue-500' : 'border-gray-300'}`}>
                {provider === 'alipay' ? <div className="w-3.5 h-3.5 rounded-full bg-blue-500" /> : null}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProvider('wechat')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${provider === 'wechat' ? 'border-blue-500 bg-blue-50 shadow-[0_10px_30px_rgba(59,130,246,0.12)]' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-green-500 text-white font-black flex items-center justify-center">微</div>
                <div className="text-base font-extrabold text-gray-900">微信支付</div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${provider === 'wechat' ? 'border-blue-500' : 'border-gray-300'}`}>
                {provider === 'wechat' ? <div className="w-3.5 h-3.5 rounded-full bg-blue-500" /> : null}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProvider('card')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${provider === 'card' ? 'border-blue-500 bg-blue-50 shadow-[0_10px_30px_rgba(59,130,246,0.12)]' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gray-900 text-white font-black flex items-center justify-center">卡</div>
                <div className="text-base font-extrabold text-gray-900">银行卡</div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${provider === 'card' ? 'border-blue-500' : 'border-gray-300'}`}>
                {provider === 'card' ? <div className="w-3.5 h-3.5 rounded-full bg-blue-500" /> : null}
              </div>
            </button>
          </div>

          <button
            onClick={handleConfirm}
            disabled={isProcessing || !identifier.trim()}
            className={`w-full py-4 rounded-2xl font-extrabold text-base transition-all shadow-xl ${
              isProcessing || !identifier.trim() ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-black text-white hover:bg-gray-800 shadow-black/15'
            }`}
          >
            {isProcessing ? '开通中...' : '确认开通'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ 
    isOpen, 
    onClose, 
    plan, 
    onPaymentComplete: _onPaymentComplete,
    showAdminGrant,
    onAdminGrant
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    plan: any; 
    onPaymentComplete: (planCode: string, provider: 'alipay' | 'wechat' | 'card') => Promise<boolean>;
    showAdminGrant: boolean;
    onAdminGrant: () => void;
}) => {
    if (!isOpen || !plan) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose}></div>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl relative z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden border border-white/40">
                {/* Header */}
                <div className="bg-gradient-to-b from-gray-50 to-white p-8 border-b border-gray-100 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">支付功能正在开发中</h3>
                        <p className="text-sm text-gray-500 font-semibold mt-1">如有订阅需求，请联系邮箱</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/80 backdrop-blur rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors shadow-sm border border-gray-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6 p-5 bg-lime-50 rounded-2xl border border-lime-100">
                        <div>
                            <div className="font-bold text-gray-900 text-lg">{plan.name}</div>
                            <div className="text-xs text-lime-700 font-bold">{plan.description}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-2xl font-black text-gray-900">¥{plan.price}</div>
                             <div className="text-xs text-gray-400 line-through">¥{plan.originalPrice}</div>
                        </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6">
                        <div className="text-sm text-gray-700 font-bold leading-relaxed">
                            支付功能正在开发中，如有订阅需求，请联系邮箱：
                            <a href="mailto:zackyckon@gmail.com" className="text-lime-600 hover:underline ml-1">zackyckon@gmail.com</a>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-black text-white rounded-2xl font-extrabold text-base hover:bg-gray-800 transition-all shadow-xl shadow-black/15"
                    >
                        我知道了
                    </button>

                    {showAdminGrant && (
                      <button
                        onClick={onAdminGrant}
                        className="w-full mt-3 py-3.5 bg-white text-gray-900 rounded-2xl font-extrabold text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        临时开通会员
                      </button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface SubscriptionProps {
  isAdmin?: boolean;
  onSubscriptionChanged?: () => void;
}

const Subscription: React.FC<SubscriptionProps> = ({ isAdmin = false, onSubscriptionChanged }) => {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAdminGrant, setShowAdminGrant] = useState(false);

  const API_BASE_URL = 'http://localhost:3001';

  const showToast = (msg: string) => {
      setToastMsg(msg);
      // Auto dismiss after 3 seconds
      setTimeout(() => {
          setToastMsg(null);
      }, 3000);
  };

  const mockPaymentComplete = async (planCode: string, provider: 'alipay' | 'wechat' | 'card') => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
          showToast('请先登录后再订阅');
          return false;
      }
      try {
          const resp = await fetch(`${API_BASE_URL}/api/billing/mock-pay`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ plan_code: planCode, provider })
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) {
              showToast(data?.error || '支付失败');
              return false;
          }
          showToast('支付成功，已升级会员');
          onSubscriptionChanged?.();
          return true;
      } catch {
          showToast('支付失败');
          return false;
      }
  };

  const handlePaymentComplete = async (_planCode: string, _provider: 'alipay' | 'wechat' | 'card') => {
      showToast('支付功能正在开发中，如有订阅需求，请联系邮箱：zackyckon@gmail.com');
      onSubscriptionChanged?.();
      return false;
  };

  const handleAdminGrant = async (payload: { identifier: string; planCode: 'weekly' | 'monthly' | 'yearly'; provider: 'alipay' | 'wechat' | 'card' }) => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
          showToast('请先登录管理员账号');
          return false;
      }
      try {
          const resp = await fetch(`${API_BASE_URL}/api/admin/grant-subscription`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ identifier: payload.identifier, plan_code: payload.planCode, provider: payload.provider })
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) {
              showToast(data?.error || '开通失败');
              return false;
          }
          showToast('已成功开通会员');
          onSubscriptionChanged?.();
          return true;
      } catch {
          showToast('开通失败');
          return false;
      }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
      
      <PaymentModal 
        isOpen={!!selectedPlan} 
        onClose={() => setSelectedPlan(null)} 
        plan={selectedPlan} 
        onPaymentComplete={handlePaymentComplete}
        showAdminGrant={Boolean(isAdmin && selectedPlan)}
        onAdminGrant={() => setShowAdminGrant(true)}
      />

      <AdminGrantModal
        isOpen={showAdminGrant}
        onClose={() => setShowAdminGrant(false)}
        defaultPlan={(selectedPlan?.id === 'weekly' || selectedPlan?.id === 'monthly' || selectedPlan?.id === 'yearly') ? selectedPlan.id : null}
        onConfirm={handleAdminGrant}
      />

      <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">选择适合您的投资助手</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          解锁 AI 驱动的深度市场洞察，让每一次决策都更有底气。
          <span className="font-bold text-lime-600 ml-1">新用户首单立减 50%</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan, index) => (
          <div 
            key={plan.id}
            className={`
              relative rounded-[2.5rem] p-8 flex flex-col transition-all duration-300 hover:-translate-y-2
              ${plan.theme === 'primary' 
                ? 'bg-lime-300 shadow-[0_20px_40px_rgba(163,230,53,0.3)] z-10 scale-105 md:scale-110 border-4 border-white' 
                : plan.theme === 'dark'
                  ? 'bg-black text-white shadow-2xl'
                  : 'bg-white border border-gray-100 shadow-xl'
              }
            `}
          >
            {plan.badge && (
              <div className={`
                absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm
                ${plan.theme === 'primary' ? 'bg-black text-white' : 'bg-lime-400 text-black'}
              `}>
                {plan.badge}
              </div>
            )}

            <div className="mb-8">
               <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold ${plan.theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{plan.name}</h3>
                  {plan.theme === 'primary' ? <Sparkles className="text-black" /> : plan.theme === 'dark' ? <Crown className="text-lime-300" /> : <Zap className="text-gray-400" />}
               </div>
               <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold align-top mt-2">¥</span>
                  <span className={`text-5xl font-black tracking-tight ${plan.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                  <span className={`text-sm font-bold ${plan.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{plan.duration}</span>
               </div>
               <div className={`text-sm line-through mt-2 font-medium ${plan.theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                 原价 ¥{plan.originalPrice}
               </div>
               <p className={`mt-4 text-sm font-medium ${plan.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                 {plan.description}
               </p>
            </div>

            <div className="space-y-4 mb-8 flex-1">
               {plan.features.map((feature, i) => (
                 <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.theme === 'dark' ? 'bg-gray-800' : 'bg-white/60'}`}>
                       <Check size={12} className={plan.theme === 'dark' ? 'text-lime-300' : 'text-black'} strokeWidth={3} />
                    </div>
                    <span className={`text-sm font-bold ${plan.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {feature}
                    </span>
                 </div>
               ))}
            </div>

            <button 
              onClick={() => setSelectedPlan(plan)}
              className={`
              w-full py-4 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95
              ${plan.theme === 'primary' 
                 ? 'bg-black text-white hover:bg-gray-900' 
                 : plan.theme === 'dark'
                   ? 'bg-lime-300 text-black hover:bg-lime-400'
                   : 'bg-black text-white hover:bg-gray-800'
              }
            `}>
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-gray-50 rounded-[2rem] p-8 border border-gray-100 flex flex-col md:flex-row items-center gap-6 justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
               <Shield className="text-emerald-500" />
            </div>
            <div>
               <h4 className="font-bold text-gray-900">支付功能正在开发中</h4>
               <p className="text-sm text-gray-500">如有订阅需求，请联系邮箱：zackyckon@gmail.com</p>
            </div>
         </div>
         <div className="text-sm text-gray-400 font-medium">
            有问题？ <a href="mailto:zackyckon@gmail.com" className="text-black underline cursor-pointer hover:text-lime-600">联系客服</a>
         </div>
      </div>
    </div>
  );
};

export default Subscription;
