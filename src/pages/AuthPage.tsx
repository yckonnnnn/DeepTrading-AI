import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, User, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from '../app/router';
import { useSession } from '../app/session';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Checkbox } from '../components/ui/Field';
import { Modal } from '../components/ui/Overlay';
import { API_BASE_URL } from '../services/api';

type AuthView = 'login' | 'register';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 品牌侧栏云层（复用 landing 视觉） */
const BrandSky: React.FC = () => (
  <div className="lp-sky" aria-hidden="true">
    <div className="lp-cloud lp-cloud--1" style={{ ['--cloud-duration' as any]: '120s' }}>
      <svg viewBox="0 0 520 200" fill="none">
        <g fill="#ffffff">
          <ellipse cx="170" cy="130" rx="130" ry="48" />
          <ellipse cx="260" cy="100" rx="110" ry="58" />
          <ellipse cx="360" cy="126" rx="120" ry="46" />
        </g>
      </svg>
    </div>
    <div className="lp-cloud lp-cloud--2" style={{ ['--cloud-duration' as any]: '150s' }}>
      <svg viewBox="0 0 520 200" fill="none">
        <g fill="#ffffff">
          <ellipse cx="170" cy="130" rx="130" ry="48" />
          <ellipse cx="290" cy="96" rx="120" ry="60" />
        </g>
      </svg>
    </div>
  </div>
);

const AuthPage: React.FC<{ initialView: AuthView }> = ({ initialView }) => {
  const { navigate } = useRouter();
  const { handleLoginSuccess, handleGuestLogin } = useSession();
  const { showToast } = useToast();

  const [view, setView] = useState<AuthView>(initialView);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetIsSendingCode, setResetIsSendingCode] = useState(false);
  const [resetCooldownSeconds, setResetCooldownSeconds] = useState(0);
  const [resetIsSubmitting, setResetIsSubmitting] = useState(false);
  const [resetShowPassword, setResetShowPassword] = useState(false);

  const toastTimer = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => setView(initialView), [initialView]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const t = window.setInterval(() => setCooldownSeconds((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (resetCooldownSeconds <= 0) return;
    const t = window.setInterval(() => setResetCooldownSeconds((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [resetCooldownSeconds]);

  const switchView = (next: AuthView) => {
    setView(next);
    setErrorMessage(null);
    setSuccessMessage(null);
    navigate(next === 'login' ? '/login' : '/register', { replace: true });
  };

  const sendVerificationCode = async () => {
    setErrorMessage(null);
    if (!email || !EMAIL_RE.test(email)) {
      setErrorMessage('请输入正确的邮箱地址');
      return;
    }
    if (cooldownSeconds > 0) return;

    setIsSendingCode(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const retryAfter = typeof data?.retryAfterSeconds === 'number' ? data.retryAfterSeconds : null;
        if (response.status === 429 && retryAfter) setCooldownSeconds(retryAfter);
        setErrorMessage(data?.error || '验证码发送失败');
        return;
      }
      setCooldownSeconds(60);
      showToast('验证码已发送，请查看邮箱', 'success');
    } catch {
      setErrorMessage('验证码发送失败');
    } finally {
      setIsSendingCode(false);
    }
  };

  const sendResetCode = async () => {
    setErrorMessage(null);
    if (!resetEmail || !EMAIL_RE.test(resetEmail)) {
      setErrorMessage('请输入正确的邮箱地址');
      return;
    }
    if (resetCooldownSeconds > 0) return;

    setResetIsSendingCode(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const retryAfter = typeof data?.retryAfterSeconds === 'number' ? data.retryAfterSeconds : null;
        if (response.status === 429 && retryAfter) setResetCooldownSeconds(retryAfter);
        setErrorMessage(data?.error || '验证码发送失败');
        return;
      }
      setResetCooldownSeconds(60);
      showToast('验证码已发送，请查看邮箱', 'success');
    } catch {
      setErrorMessage('验证码发送失败');
    } finally {
      setResetIsSendingCode(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetEmail || !EMAIL_RE.test(resetEmail)) {
      setErrorMessage('请输入正确的邮箱地址');
      return;
    }
    if (!/^\d{6}$/.test(resetCode)) {
      setErrorMessage('请输入 6 位验证码');
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setErrorMessage('新密码至少 6 位');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage('两次输入的新密码不一致');
      return;
    }

    setResetIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword: resetNewPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(data?.error || '重置失败');
        return;
      }
      showToast('密码已重置，请使用新密码登录', 'success');
      setIdentifier(resetEmail);
      setPassword('');
      setShowForgotPassword(false);
      setResetCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
    } catch {
      setErrorMessage('重置失败');
    } finally {
      setResetIsSubmitting(false);
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
          body: JSON.stringify({ identifier, password }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setErrorMessage(data?.error || '登录失败');
          return;
        }
        if (data?.token) sessionStorage.setItem('auth_token', data.token);
        if (typeof data?.user?.channel === 'number') {
          sessionStorage.setItem('auth_channel', String(data.user.channel));
        }
        handleLoginSuccess();
        navigate('/app', { replace: true });
        return;
      }

      if (!agreeTerms) {
        setErrorMessage('请先阅读并同意服务条款与免责声明');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, email, password, code: verificationCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(data?.error || '注册失败');
        return;
      }

      setSuccessMessage('注册成功，请使用邮箱或用户名登录');
      setIdentifier(email);
      setPassword('');
      setVerificationCode('');
      setAgreeTerms(false);
      setView('login');
      navigate('/login', { replace: true });
    } catch {
      setErrorMessage('网络异常，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const isLogin = view === 'login';

  return (
    <div className="auth">
      {/* ---------- 表单侧 ---------- */}
      <div className="auth__form-side">
        <button className="auth__back" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> 返回首页
        </button>

        <div className="auth__form">
          <svg width="44" height="44" viewBox="0 0 40 40" fill="none" aria-hidden="true" style={{ marginBottom: 20 }}>
            <rect width="40" height="40" rx="11" fill="#101820" />
            <rect x="11" y="22" width="5" height="9" rx="2.5" fill="#BFE8D4" />
            <rect x="19" y="16" width="5" height="15" rx="2.5" fill="#22B578" />
            <circle cx="29.5" cy="12.5" r="3" fill="#7EDDB2" />
          </svg>

          <h1 className="auth__title">{isLogin ? '欢迎回来' : '创建账户'}</h1>
          <p className="auth__sub">
            {isLogin ? '登录以继续使用你的 AI 投研工作台' : '几分钟完成注册，开始第一次 AI 分析'}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="auth__alerts">
              {errorMessage && (
                <div className="auth__alert auth__alert--error" role="alert">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="auth__alert auth__alert--success" role="status">
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {successMessage}
                </div>
              )}
            </div>

            {!isLogin && (
              <Field label="用户名">
                <Input
                  icon={<User size={17} />}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="你的名字或昵称"
                  autoComplete="nickname"
                  required
                />
              </Field>
            )}

            <Field label={isLogin ? '邮箱或用户名' : '电子邮箱'}>
              <Input
                icon={<Mail size={17} />}
                type={isLogin ? 'text' : 'email'}
                value={isLogin ? identifier : email}
                onChange={(e) => (isLogin ? setIdentifier(e.target.value) : setEmail(e.target.value))}
                placeholder={isLogin ? 'name@example.com 或用户名' : 'name@example.com'}
                autoComplete={isLogin ? 'username' : 'email'}
                required
              />
            </Field>

            {!isLogin && (
              <Field
                label="验证码"
                labelAction={
                  <button
                    type="button"
                    className="link-action"
                    onClick={sendVerificationCode}
                    disabled={isSendingCode || cooldownSeconds > 0 || !email}
                  >
                    {cooldownSeconds > 0 ? `重新发送 (${cooldownSeconds}s)` : isSendingCode ? '发送中…' : '获取验证码'}
                  </button>
                }
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6 位邮箱验证码"
                  required
                />
              </Field>
            )}

            <Field
              label="密码"
              labelAction={
                isLogin ? (
                  <button
                    type="button"
                    className="link-action"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setResetEmail(identifier && EMAIL_RE.test(identifier) ? identifier : '');
                      setResetCode('');
                      setResetNewPassword('');
                      setResetConfirmPassword('');
                      setResetCooldownSeconds(0);
                    }}
                  >
                    忘记密码？
                  </button>
                ) : undefined
              }
            >
              <div className="input-wrap">
                <span className="input-wrap__icon">
                  <Lock size={17} />
                </span>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  style={{ paddingRight: 44 }}
                />
                <span className="input-wrap__action">
                  <button
                    type="button"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    onClick={() => setShowPassword((v) => !v)}
                    style={{ padding: 6, color: 'var(--text-3)', display: 'flex' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </div>
            </Field>

            <Button type="submit" block size="lg" loading={isLoading} style={{ marginTop: 6 }}>
              {isLogin ? '登录' : '创建账户'} <ArrowRight size={16} />
            </Button>

            {!isLogin && (
              <div style={{ marginTop: 2 }}>
                <Checkbox checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}>
                  我已阅读并同意
                  <button type="button" onClick={() => navigate('/terms')} style={{ color: 'var(--blue)', fontWeight: 700, margin: '0 3px' }}>
                    《服务条款与免责声明》
                  </button>
                  <span style={{ display: 'block', color: 'var(--text-3)', fontSize: 12 }}>
                    注册即表示已充分了解并接受服务条款与免责声明
                  </span>
                </Checkbox>
              </div>
            )}
          </form>

          <Button variant="ghost" block style={{ marginTop: 14 }} onClick={() => { handleGuestLogin(); navigate('/app', { replace: true }); }}>
            以游客身份访问（无需注册）
          </Button>

          <p className="auth__switch">
            {isLogin ? '还没有账户？' : '已有账户？'}
            <button onClick={() => switchView(isLogin ? 'register' : 'login')}>
              {isLogin ? '立即注册' : '直接登录'}
            </button>
          </p>
        </div>
      </div>

      {/* ---------- 品牌侧（桌面） ---------- */}
      <div className="auth__brand-side">
        <BrandSky />

        <div className="auth__brand-quote anim-up">
          <h2>
            云端之上的
            <br />
            深度投研助手
          </h2>
          <p>
            结构化的技术指标解读、资金与情绪数据、可执行的交易计划——
            都汇总在同一份 AI 报告里。
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <span className="chip chip--outline" style={{ background: 'rgba(255,255,255,0.6)' }}>双策略模式</span>
            <span className="chip chip--outline" style={{ background: 'rgba(255,255,255,0.6)' }}>K 线识图</span>
            <span className="chip chip--outline" style={{ background: 'rgba(255,255,255,0.6)' }}>报告导出</span>
          </div>
        </div>

        <div className="auth__brand-foot">
          <span>© {new Date().getFullYear()} DeepTrading AI</span>
          <span>分析结果仅供参考，不构成投资建议</span>
        </div>
      </div>

      {/* ---------- 找回密码 ---------- */}
      <Modal
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        title="找回密码"
        subtitle="输入邮箱获取验证码并设置新密码"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="电子邮箱">
            <Input
              icon={<Mail size={17} />}
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </Field>

          <Field
            label="验证码"
            labelAction={
              <button
                type="button"
                className="link-action"
                onClick={sendResetCode}
                disabled={resetIsSendingCode || resetCooldownSeconds > 0 || !resetEmail}
              >
                {resetCooldownSeconds > 0 ? `重新发送 (${resetCooldownSeconds}s)` : resetIsSendingCode ? '发送中…' : '获取验证码'}
              </button>
            }
          >
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              placeholder="6 位验证码"
            />
          </Field>

          <Field label="新密码">
            <div className="input-wrap">
              <span className="input-wrap__icon">
                <Lock size={17} />
              </span>
              <input
                className="input"
                type={resetShowPassword ? 'text' : 'password'}
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="至少 6 位"
                style={{ paddingRight: 44 }}
              />
              <span className="input-wrap__action">
                <button
                  type="button"
                  aria-label={resetShowPassword ? '隐藏密码' : '显示密码'}
                  onClick={() => setResetShowPassword((v) => !v)}
                  style={{ padding: 6, color: 'var(--text-3)', display: 'flex' }}
                >
                  {resetShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </div>
          </Field>

          <Field label="确认新密码">
            <Input
              icon={<Lock size={17} />}
              type="password"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
            />
          </Field>

          <Button block size="lg" loading={resetIsSubmitting} onClick={handleResetPassword}>
            确认重置
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AuthPage;
