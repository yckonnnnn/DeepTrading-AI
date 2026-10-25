import React, { useEffect, useState } from 'react';
import { Bell, Lock, LogOut, Palette, Shield, User } from 'lucide-react';
import type { TabId } from '../types';
import { useSession } from '../app/session';
import { apiFetch } from '../services/api';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { SurfaceCard } from '../components/ui/Surface';
import { useToast } from '../hooks/useToast';

interface SettingsPageProps {
  onNavigateTab?: (tab: TabId) => void;
}

type SettingsTab = 'profile' | 'security' | 'preferences';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: '个人资料', icon: User },
  { id: 'security', label: '账号安全', icon: Shield },
  { id: 'preferences', label: '偏好设置', icon: Bell },
];

const TOGGLE_PREFS = [
  { title: '分析完成提醒', desc: '提交的分析报告生成完毕时通知' },
  { title: '系统公告', desc: '平台维护与新功能上线的通知' },
  { title: '订阅与额度提醒', desc: '订阅状态变化与额度耗尽提醒' },
];

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigateTab }) => {
  const { authUser, refreshToken, handleLogout } = useSession();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const [username, setUsername] = useState(authUser?.username || '');
  const [email, setEmail] = useState(authUser?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [prefs, setPrefs] = useState<boolean[]>([true, true, true]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    setUsername(authUser?.username || '');
    setEmail(authUser?.email || '');
  }, [authUser?.username, authUser?.email]);

  const handleSaveProfile = async () => {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    if (cleanUsername.length < 2) {
      showToast('用户名至少 2 个字符', 'error');
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      showToast('请输入正确的邮箱地址', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, email: cleanEmail }),
      });
      showToast('资料已保存', 'success');
      refreshToken();
    } catch (err: any) {
      showToast(err?.message || '保存失败', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      showToast('请输入当前密码', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('新密码至少 6 位', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await apiFetch('/api/user/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      showToast('密码已更新', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      showToast(err?.message || '更新失败', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="anim-page" style={{ maxWidth: 920, margin: '0 auto' }}>
      <div className="page-head">
        <h1>设置</h1>
        <p className="page-head__sub">管理个人资料、账号安全与通知偏好。</p>
      </div>

      <div className="settings-layout">
        {/* 侧导航（移动端横向滚动） */}
        <div className="settings-nav">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`row-item ${activeTab === tab.id ? 'settings-nav__active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
              >
                <Icon size={17} style={{ color: activeTab === tab.id ? 'var(--blue)' : 'var(--text-2)' }} />
                {tab.label}
              </button>
            );
          })}
          <button type="button" className="row-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
            <LogOut size={17} /> 退出登录
          </button>
        </div>

        {/* 内容 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'profile' && (
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
              <SurfaceCard xl pad>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                  <Avatar name={authUser?.username} size={72} />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <strong style={{ fontSize: 18, fontWeight: 800 }}>{authUser?.username || '用户'}</strong>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{authUser?.email}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>
                      头像根据用户名自动生成（本地渲染，无需上传）
                    </p>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard xl pad>
                <div className="card__title" style={{ marginBottom: 18 }}>
                  <User size={17} style={{ color: 'var(--blue)' }} />
                  基本信息
                </div>
                <div style={{ display: 'grid', gap: 16 }}>
                  <Field label="用户名">
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                  </Field>
                  <Field label="电子邮箱">
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                </div>
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button onClick={handleSaveProfile} loading={savingProfile}>
                    保存修改
                  </Button>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
              <SurfaceCard xl pad>
                <div className="card__title" style={{ marginBottom: 18 }}>
                  <Lock size={17} style={{ color: 'var(--blue)' }} />
                  修改密码
                </div>
                <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
                  <Field label="当前密码">
                    <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                  </Field>
                  <Field label="新密码" hint="至少 6 位">
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                  </Field>
                  <Field label="确认新密码">
                    <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="••••••••" />
                  </Field>
                  <Button onClick={handleChangePassword} loading={changingPassword}>
                    更新密码
                  </Button>
                </div>
              </SurfaceCard>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
              <SurfaceCard xl pad>
                <div className="card__title" style={{ marginBottom: 6 }}>
                  <Bell size={17} style={{ color: 'var(--blue)' }} />
                  通知偏好
                </div>
                {TOGGLE_PREFS.map((pref, i) => (
                  <div key={i} className="pref-row">
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{pref.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{pref.desc}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs[i]}
                      aria-label={pref.title}
                      className={`toggle ${prefs[i] ? 'toggle--on' : ''}`}
                      onClick={() => setPrefs((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
                    >
                      <span className="toggle__knob" />
                    </button>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>通知偏好即将与账号同步，当前为本地预览。</p>
              </SurfaceCard>

              <SurfaceCard xl pad>
                <div className="card__title" style={{ marginBottom: 14 }}>
                  <Palette size={17} style={{ color: 'var(--blue)' }} />
                  界面外观
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', border: '1px solid var(--divider-soft)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, var(--sky-mid), #fff)', border: '1px solid var(--divider-soft)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 14 }}>浅色模式</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>当前外观</div>
                  </div>
                  <span className="chip chip--green">已启用</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, opacity: 0.6 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--ink)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 14 }}>深色模式</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>规划中，敬请期待</div>
                  </div>
                  <span className="chip chip--outline">即将上线</span>
                </div>
              </SurfaceCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
