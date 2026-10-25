import React, { useState } from 'react';
import {
  Bell,
  Zap,
  AlertCircle,
  FileText,
  Crown,
  Megaphone,
  Inbox,
  User,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  LogIn,
} from 'lucide-react';
import type { AppNotification, TabId, UserTier } from '../../types';
import { useNotifications } from '../../app/notifications';
import { useSession } from '../../app/session';
import { useNavigate } from '../../app/router';
import { useClickOutside } from '../../hooks/useInteractions';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { IconButton } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Drawer } from '../../components/ui/Overlay';
import { GlassPanel } from '../../components/ui/Surface';

const NOTIF_ICON = (type: AppNotification['type']) => {
  switch (type) {
    case 'new':
      return { Icon: Zap, cls: 'notif-item__icon--new' };
    case 'maintenance':
      return { Icon: AlertCircle, cls: 'notif-item__icon--maintenance' };
    case 'report':
      return { Icon: FileText, cls: 'notif-item__icon--report' };
    case 'subscription':
      return { Icon: Crown, cls: 'notif-item__icon--subscription' };
    default:
      return { Icon: Megaphone, cls: '' };
  }
};

const NotificationList: React.FC<{
  activeTab: 'unread' | 'all';
  onTabChange: (t: 'unread' | 'all') => void;
}> = ({ activeTab, onTabChange }) => {
  const { notifications, handleNotificationClick, handleMarkAllRead } = useNotifications();
  const unread = notifications.filter((n) => !n.read);
  const filtered = activeTab === 'unread' ? unread : notifications;

  return (
    <>
      <div className="notif-panel__head">
        <strong style={{ fontSize: 15 }}>消息通知</strong>
        <div className="notif-panel__tabs" role="tablist">
          <button
            className={`notif-panel__tab ${activeTab === 'unread' ? 'notif-panel__tab--active' : ''}`}
            onClick={() => onTabChange('unread')}
            role="tab"
            aria-selected={activeTab === 'unread'}
          >
            未读 {unread.length}
          </button>
          <button
            className={`notif-panel__tab ${activeTab === 'all' ? 'notif-panel__tab--active' : ''}`}
            onClick={() => onTabChange('all')}
            role="tab"
            aria-selected={activeTab === 'all'}
          >
            全部
          </button>
        </div>
      </div>

      <div className="notif-list">
        {filtered.length === 0 ? (
          <div className="empty" style={{ padding: '44px 24px' }}>
            <div className="empty__icon">
              <Inbox size={22} />
            </div>
            <div className="empty__desc">暂无{activeTab === 'unread' ? '未读' : ''}消息</div>
          </div>
        ) : (
          filtered.map((item) => {
            const { Icon, cls } = NOTIF_ICON(item.type);
            return (
              <button
                key={item.id}
                type="button"
                className={`notif-item ${!item.read ? 'notif-item--unread' : ''}`}
                onClick={() => handleNotificationClick(item)}
              >
                <span className={`notif-item__icon ${cls}`}>
                  <Icon size={16} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: item.read ? 'var(--text-2)' : 'var(--ink)' }}>
                      {item.title}
                      {item.demo && <span className="demo-chip" style={{ marginLeft: 6 }}>演示</span>}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', fontWeight: 600 }}>{item.time}</span>
                  </span>
                  <span
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: 12.5,
                      color: 'var(--text-2)',
                      marginTop: 2,
                    }}
                  >
                    {item.desc}
                  </span>
                </span>
                {!item.read && <span className="notif-item__dot" aria-hidden="true" />}
              </button>
            );
          })
        )}
      </div>

      <div className="notif-panel__foot">
        <button
          type="button"
          onClick={handleMarkAllRead}
          style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)' }}
        >
          全部标记为已读
        </button>
      </div>
    </>
  );
};

const ProfileBody: React.FC<{ onGo: (tab: TabId) => void; onLogout: () => void }> = ({ onGo, onLogout }) => {
  const { tier, isGuest, authUser, quota } = useSession();
  const navigate = useNavigate();

  const quotaLimit = quota?.quotaLimit == null ? null : Number(quota.quotaLimit);
  const usedSuccess = quota?.usedSuccess == null ? 0 : Number(quota.usedSuccess);
  const isUnlimited = Boolean(quota?.isUnlimited);
  const safeUsed = Number.isFinite(usedSuccess) ? Math.max(0, usedSuccess) : 0;
  const safeTotal = Number.isFinite(quotaLimit) ? Math.max(0, quotaLimit) : 0;
  const usagePercent = isUnlimited ? 100 : safeTotal <= 0 ? 0 : Math.min(100, Math.round((safeUsed / safeTotal) * 100));

  const tierLabel = tier === 'pro' ? 'Pro 会员' : tier === 'free' ? '免费版' : '访客模式';

  return (
    <>
      <div className="profile-pop__head">
        <Avatar name={isGuest ? '访客' : authUser?.username} size={48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isGuest ? '访客' : authUser?.username || '用户'}
          </div>
          {authUser?.email && (
            <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {authUser.email}
            </div>
          )}
          <span className={`chip profile-pop__tier ${tier === 'pro' ? 'chip--blue' : 'chip--neutral'}`}>
            {tier === 'pro' && <Crown size={11} />}
            {tierLabel}
          </span>
        </div>
      </div>

      {!isGuest && (
        <div className="profile-pop__usage">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-2)' }}>分析额度使用</span>
            <span className="num">{isUnlimited ? '不限次数' : `${safeUsed} / ${safeTotal}`}</span>
          </div>
          <div className="progress">
            <div
              className={`progress__fill ${isUnlimited ? 'progress__fill--blue' : ''}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {tier !== 'pro' && (
            <button
              type="button"
              onClick={() => onGo('subscription')}
              style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}
            >
              升级 Pro 解锁更多额度 →
            </button>
          )}
        </div>
      )}

      <div className="profile-pop__menu">
        {isGuest ? (
          <button type="button" className="row-item" onClick={() => { navigate('/login'); onLogout(); }}>
            <LogIn size={16} /> 登录 / 注册
          </button>
        ) : (
          <>
            <button type="button" className="row-item" onClick={() => onGo('settings')}>
              <User size={16} /> 个人资料
            </button>
            <button type="button" className="row-item" onClick={() => onGo('subscription')}>
              <CreditCard size={16} /> 订阅管理
            </button>
            <button type="button" className="row-item" onClick={() => onGo('settings')}>
              <SettingsIcon size={16} /> 系统设置
            </button>
          </>
        )}
      </div>

      {!isGuest && (
        <div style={{ margin: '4px 12px 12px', borderTop: '1px solid var(--divider-soft)', paddingTop: 8 }}>
          <button type="button" className="row-item" onClick={onLogout} style={{ color: 'var(--danger)', fontWeight: 700 }}>
            <LogOut size={16} /> 退出登录
          </button>
        </div>
      )}

      <AdminTierSwitch />
    </>
  );
};

const AdminTierSwitch: React.FC = () => {
  const { tier, isAdmin } = useSession();
  const setTierOverride = (t: UserTier) => {
    // 仅前端演示层切换，不改变服务端身份
    window.dispatchEvent(new CustomEvent('dt-dev-tier', { detail: t }));
  };
  if (!isAdmin) return null;
  return (
    <div className="dev-switch">
      <div className="dev-switch__label">
        <Zap size={11} /> 测试模式 · 仅本地预览
      </div>
      <div className="dev-switch__opts">
        {(['guest', 'free', 'pro'] as UserTier[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`dev-switch__opt ${tier === t ? 'dev-switch__opt--active' : ''}`}
            onClick={() => setTierOverride(t)}
          >
            {t === 'guest' ? '访客' : t === 'free' ? '免费' : 'Pro'}
          </button>
        ))}
      </div>
    </div>
  );
};

interface ToolbarProps {
  title: string;
  onNavigate: (tab: TabId) => void;
}

/** 工作区顶栏：配额、通知、头像（弹层玻璃化；移动端改为底部抽屉） */
export const WorkspaceToolbar: React.FC<ToolbarProps> = ({ title, onNavigate }) => {
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifTab, setNotifTab] = useState<'unread' | 'all'>('unread');
  const { unreadCount } = useNotifications();
  const { isGuest, quota, tier, handleLogout } = useSession();
  const isMobile = useIsMobile();

  const notifRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(notifRef, () => setShowNotif(false), showNotif);
  useClickOutside(profileRef, () => setShowProfile(false), showProfile);

  const closeAndGo = (tab: TabId) => {
    setShowProfile(false);
    onNavigate(tab);
  };

  const quotaLimit = quota?.quotaLimit == null ? null : Number(quota.quotaLimit);
  const remaining = quota?.remainingSuccess != null ? Number(quota.remainingSuccess) : null;
  const isUnlimited = tier === 'pro' || Boolean(quota?.isUnlimited);
  const quotaText = isGuest
    ? '登录后可用'
    : isUnlimited
      ? '额度不限'
      : remaining != null
        ? `剩余 ${remaining} / ${quotaLimit ?? '-'} 次`
        : '额度加载中';

  return (
    <header className={`ws-toolbar ${''}`}>
      <div className="ws-toolbar__left">
        <span className="ws-toolbar__brand">
          <svg width="26" height="26" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect width="40" height="40" rx="11" fill="#101820" />
            <rect x="11" y="22" width="5" height="9" rx="2.5" fill="#BFE8D4" />
            <rect x="19" y="16" width="5" height="15" rx="2.5" fill="#22B578" />
            <circle cx="29.5" cy="12.5" r="3" fill="#7EDDB2" />
          </svg>
          DeepTrading
        </span>
        <span className="ws-toolbar__title">{title}</span>
      </div>

      <div className="ws-toolbar__actions">
        <span className="quota-chip">
          <Zap size={13} style={{ color: isGuest ? 'var(--text-3)' : 'var(--green-deep)' }} />
          {quotaText}
        </span>

        <div className="pop-anchor" ref={notifRef}>
          <IconButton
            label="消息通知"
            active={showNotif}
            badge={unreadCount}
            onClick={() => {
              setShowNotif((v) => !v);
              setShowProfile(false);
            }}
          >
            <Bell size={18} />
          </IconButton>

          {showNotif &&
            (isMobile ? (
              <Drawer open onClose={() => setShowNotif(false)} side="bottom" label="消息通知">
                <NotificationList activeTab={notifTab} onTabChange={setNotifTab} />
              </Drawer>
            ) : (
              <GlassPanel className="notif-panel">
                <NotificationList activeTab={notifTab} onTabChange={setNotifTab} />
              </GlassPanel>
            ))}
        </div>

        <div className="pop-anchor" ref={profileRef}>
          <button
            type="button"
            aria-label="个人中心"
            aria-expanded={showProfile}
            onClick={() => {
              setShowProfile((v) => !v);
              setShowNotif(false);
            }}
            style={{ borderRadius: '50%', display: 'flex', padding: 0 }}
          >
            <Avatar name={isGuest ? '访客' : undefined} size={40} />
          </button>

          {showProfile &&
            (isMobile ? (
              <Drawer open onClose={() => setShowProfile(false)} side="bottom" label="个人中心">
                <ProfileBody onGo={closeAndGo} onLogout={handleLogout} />
              </Drawer>
            ) : (
              <GlassPanel className="profile-pop" strong>
                <ProfileBody onGo={closeAndGo} onLogout={handleLogout} />
              </GlassPanel>
            ))}
        </div>
      </div>
    </header>
  );
};
