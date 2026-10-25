import React, { useState } from 'react';
import { Check, Crown, Mail, Shield, Sparkles } from 'lucide-react';
import { useSession } from '../app/session';
import { apiPostJson } from '../services/api';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Overlay';
import { SurfaceCard } from '../components/ui/Surface';
import { useToast } from '../hooks/useToast';

interface Plan {
  id: 'weekly' | 'monthly' | 'yearly';
  name: string;
  duration: string;
  price: string;
  originalPrice: string;
  description: string;
  features: string[];
  featured?: boolean;
  badge?: string;
  buttonText: string;
}

const PLANS: Plan[] = [
  {
    id: 'weekly',
    name: '周会员',
    duration: '/ 周',
    price: '18',
    originalPrice: '28',
    description: '短期体验，适合突击分析',
    features: [
      'AI 深度分析引擎',
      '每日 10 次分析配额',
      '基础技术指标解读',
      '标准响应速度',
    ],
    buttonText: '开启周计划',
  },
  {
    id: 'monthly',
    name: '月会员',
    duration: '/ 月',
    price: '68',
    originalPrice: '128',
    description: '最受欢迎，适合波段交易者',
    features: [
      '包含周会员全部权益',
      '不限次数分析配额',
      '「资金与情绪」深度数据',
      '优先生成，急速响应',
      '导出高清分析报告',
    ],
    featured: true,
    badge: '推荐',
    buttonText: '开启月计划',
  },
  {
    id: 'yearly',
    name: '年会员',
    duration: '/ 年',
    price: '688',
    originalPrice: '1588',
    description: '长期主义，专业投资者的选择',
    features: [
      '包含月会员全部权益',
      '新功能优先体验',
      '长期有效，折合每天不到 ¥1.9',
    ],
    badge: '年度最优',
    buttonText: '开启年计划',
  },
];

const PAYMENT_EMAIL = 'zackyckon@gmail.com';

const AdminGrantModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  defaultPlan: Plan['id'];
  onConfirm: (payload: { identifier: string; planCode: Plan['id']; provider: 'alipay' | 'wechat' | 'card' }) => Promise<boolean>;
}> = ({ isOpen, onClose, defaultPlan, onConfirm }) => {
  const [identifier, setIdentifier] = useState('');
  const [planCode, setPlanCode] = useState<Plan['id']>(defaultPlan);
  const [provider, setProvider] = useState<'alipay' | 'wechat' | 'card'>('alipay');
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (isOpen) setPlanCode(defaultPlan);
  }, [defaultPlan, isOpen]);

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

  const planLabel = planCode === 'weekly' ? '周会员' : planCode === 'yearly' ? '年会员' : '月会员';

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="临时开通会员"
      subtitle="仅管理员可用 · 直接写入订阅数据"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleConfirm} loading={isProcessing} disabled={!identifier.trim()}>
            确认开通
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--divider-soft)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>本次开通</span>
          <span className="chip chip--ink">{planLabel}</span>
        </div>

        <Field label="用户名或邮箱">
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="输入用户名或邮箱" />
        </Field>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field__label">支付方式（记录用途）</div>
          {[
            { id: 'alipay' as const, label: '支付宝', mark: '支', color: '#1677ff' },
            { id: 'wechat' as const, label: '微信支付', mark: '微', color: '#22b578' },
            { id: 'card' as const, label: '银行卡', mark: '卡', color: '#101820' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`provider-option ${provider === opt.id ? 'provider-option--active' : ''}`}
              onClick={() => setProvider(opt.id)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="provider-option__mark" style={{ background: opt.color }}>{opt.mark}</span>
                <strong style={{ fontSize: 14.5 }}>{opt.label}</strong>
              </span>
              <span className={`radio-dot ${provider === opt.id ? 'radio-dot--active' : ''}`}>
                {provider === opt.id && <span className="radio-dot__inner" />}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

const SubscriptionPage: React.FC = () => {
  const { isAdmin, tier, authSubscription, refreshToken } = useSession();
  const { showToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showAdminGrant, setShowAdminGrant] = useState(false);

  const handleAdminGrant = async (payload: { identifier: string; planCode: Plan['id']; provider: 'alipay' | 'wechat' | 'card' }) => {
    try {
      await apiPostJson('/api/admin/grant-subscription', {
        identifier: payload.identifier,
        plan_code: payload.planCode,
        provider: payload.provider,
      });
      showToast('已成功开通会员', 'success');
      refreshToken();
      return true;
    } catch (err: any) {
      showToast(err?.message || '开通失败', 'error');
      return false;
    }
  };

  const currentPlanCode = typeof authSubscription?.plan_code === 'string' ? authSubscription.plan_code : null;

  return (
    <div className="anim-page" style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div className="page-head" style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto var(--s8)' }}>
        <h1>会员订阅</h1>
        <p className="page-head__sub">解锁不限次分析、资金与情绪深度数据与报告导出。</p>
      </div>

      {/* 当前订阅状态 */}
      {tier === 'pro' && (
        <SurfaceCard pad className="anim-up" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--s6)', background: 'linear-gradient(135deg, var(--blue-soft), var(--surface) 70%)', borderColor: '#d3e4fd' }}>
          <span style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Crown size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 15 }}>
              {currentPlanCode === 'weekly' ? 'Pro 周会员' : currentPlanCode === 'yearly' ? 'Pro 年会员' : 'Pro 月会员'}
              {currentPlanCode && <span style={{ marginLeft: 8 }} className="chip chip--blue">生效中</span>}
            </strong>
            {authSubscription?.current_period_end && (
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>
                有效期至 {new Date(authSubscription.current_period_end).toLocaleDateString('zh-CN')}
              </div>
            )}
          </div>
        </SurfaceCard>
      )}

      {/* 套餐卡片 */}
      <div className="lp-plans stagger" style={{ alignItems: 'stretch' }}>
        {PLANS.map((plan) => (
          <div key={plan.id} className={`plan-card ${plan.featured ? 'plan-card--featured' : ''}`}>
            {plan.badge && (
              <span className={`chip plan-card__flag ${plan.featured ? 'chip--blue' : 'chip--outline'}`}>
                {plan.featured ? <Sparkles size={11} /> : null}
                {plan.badge}
              </span>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 17, fontWeight: 800 }}>{plan.name}</strong>
              {currentPlanCode === plan.id && <span className="chip chip--green">当前</span>}
            </div>

            <div className="num" style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¥</span>
              <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}>{plan.price}</span>
              <span style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 600 }}>{plan.duration}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', textDecoration: 'line-through', marginTop: 2 }} className="num">
              原价 ¥{plan.originalPrice}
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 12 }}>{plan.description}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, margin: '18px 0 22px', flex: 1 }}>
              {plan.features.map((feature, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'var(--green-pale)',
                      color: 'var(--green-deep)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Check size={10} strokeWidth={3.2} />
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.55 }}>{feature}</span>
                </div>
              ))}
            </div>

            <Button
              block
              size="lg"
              variant={plan.featured ? 'blue' : 'secondary'}
              onClick={() => setSelectedPlan(plan)}
            >
              {plan.buttonText}
            </Button>
          </div>
        ))}
      </div>

      {/* 支付说明 */}
      <SurfaceCard pad className="anim-up" style={{ marginTop: 'var(--s8)', display: 'flex', gap: 14, alignItems: 'flex-start', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--green-pale)', color: 'var(--green-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={19} />
          </span>
          <div>
            <strong style={{ fontSize: 14.5 }}>支付功能即将上线</strong>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.7 }}>
              目前如需订阅，请通过邮件联系我们人工开通，带来不便敬请谅解。
            </p>
          </div>
        </div>
        <a href={`mailto:${PAYMENT_EMAIL}`} className="btn btn--secondary btn--sm" style={{ textDecoration: 'none' }}>
          <Mail size={14} /> {PAYMENT_EMAIL}
        </a>
      </SurfaceCard>

      {/* 支付弹窗（如实告知） */}
      <Modal
        open={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        title="订阅咨询"
        subtitle="支付功能即将上线，目前支持人工开通"
        footer={
          <Button block onClick={() => setSelectedPlan(null)}>
            我知道了
          </Button>
        }
      >
        {selectedPlan && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--blue-soft)', border: '1px solid #d3e4fd', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 14 }}>
              <div>
                <strong style={{ fontSize: 15 }}>{selectedPlan.name}</strong>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{selectedPlan.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontSize: 22, fontWeight: 800 }}>¥{selectedPlan.price}</div>
                <div className="num" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'line-through' }}>¥{selectedPlan.originalPrice}</div>
              </div>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--ink)' }}>
              请发送邮件至{' '}
              <a href={`mailto:${PAYMENT_EMAIL}`} style={{ color: 'var(--blue)', fontWeight: 700 }}>
                {PAYMENT_EMAIL}
              </a>
              ，注明账户邮箱与想要开通的套餐，我们会尽快为你处理。
            </p>
          </>
        )}
      </Modal>

      <AdminGrantModal
        isOpen={showAdminGrant}
        onClose={() => setShowAdminGrant(false)}
        defaultPlan={(selectedPlan?.id as Plan['id']) || 'monthly'}
        onConfirm={handleAdminGrant}
      />

      {/* 管理员入口：在支付弹窗之外提供 */}
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <Button variant="ghost" size="sm" onClick={() => setShowAdminGrant(true)}>
            管理员 · 临时开通会员
          </Button>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
