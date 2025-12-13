
import React, { useState, useEffect } from 'react';
import { Check, Sparkles, Zap, Shield, Crown, X, CreditCard, Smartphone } from 'lucide-react';

const plans = [
  {
    id: 'weekly',
    name: '周会员',
    duration: '/ 周',
    price: '18',
    originalPrice: '28',
    description: '短期体验，适合突击分析',
    features: [
      '解锁 Gemini 2.5 Pro 深度分析',
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

const PaymentModal = ({ 
    isOpen, 
    onClose, 
    plan, 
    onPaymentComplete 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    plan: any; 
    onPaymentComplete: () => void;
}) => {
    const [selectedMethod, setSelectedMethod] = useState<'alipay' | 'wechat' | 'card'>('alipay');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen || !plan) return null;

    const handlePayment = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            onPaymentComplete();
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">确认订阅</h3>
                        <p className="text-sm text-gray-500 font-medium">升级您的投资体验</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 hover:text-black hover:bg-gray-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Plan Summary */}
                    <div className="flex justify-between items-center mb-6 p-4 bg-lime-50 rounded-2xl border border-lime-100">
                        <div>
                            <div className="font-bold text-gray-900 text-lg">{plan.name}</div>
                            <div className="text-xs text-lime-700 font-bold">{plan.description}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-2xl font-black text-gray-900">¥{plan.price}</div>
                             <div className="text-xs text-gray-400 line-through">¥{plan.originalPrice}</div>
                        </div>
                    </div>

                    <h4 className="font-bold text-gray-900 mb-4 text-sm">选择支付方式</h4>
                    <div className="space-y-3 mb-8">
                        <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMethod === 'alipay' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#1677FF] flex items-center justify-center text-white font-bold text-xs">支</div>
                                <span className="font-bold text-gray-700">支付宝</span>
                            </div>
                            <input type="radio" name="payment" className="w-5 h-5 accent-blue-500" checked={selectedMethod === 'alipay'} onChange={() => setSelectedMethod('alipay')} />
                        </label>

                        <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMethod === 'wechat' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#07C160] flex items-center justify-center text-white font-bold text-xs">微</div>
                                <span className="font-bold text-gray-700">微信支付</span>
                            </div>
                            <input type="radio" name="payment" className="w-5 h-5 accent-emerald-500" checked={selectedMethod === 'wechat'} onChange={() => setSelectedMethod('wechat')} />
                        </label>

                        <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMethod === 'card' ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white">
                                    <CreditCard size={14} />
                                </div>
                                <span className="font-bold text-gray-700">银行卡</span>
                            </div>
                            <input type="radio" name="payment" className="w-5 h-5 accent-purple-500" checked={selectedMethod === 'card'} onChange={() => setSelectedMethod('card')} />
                        </label>
                    </div>

                    <button 
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                               处理中...
                            </>
                        ) : (
                            `确认支付 ¥${plan.price}`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Subscription = () => {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
      setToastMsg(msg);
      // Auto dismiss after 3 seconds
      setTimeout(() => {
          setToastMsg(null);
      }, 3000);
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
      
      <PaymentModal 
        isOpen={!!selectedPlan} 
        onClose={() => setSelectedPlan(null)} 
        plan={selectedPlan} 
        onPaymentComplete={() => showToast('支付功能正在开发中，敬请期待🚧')}
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
               <h4 className="font-bold text-gray-900">100% 安全支付</h4>
               <p className="text-sm text-gray-500">支持微信支付、支付宝，7天无理由退款保障</p>
            </div>
         </div>
         <div className="text-sm text-gray-400 font-medium">
            有问题？ <span className="text-black underline cursor-pointer hover:text-lime-600">联系客服</span>
         </div>
      </div>
    </div>
  );
};

export default Subscription;
