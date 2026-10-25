import React from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  History as HistoryIcon,
  CreditCard,
  Megaphone,
  BookOpenCheck,
  MessageSquare,
  QrCode,
  Settings as SettingsIcon,
  MoreHorizontal,
  Sparkles,
  LogIn,
  Crown,
  LogOut,
} from 'lucide-react';
import type { TabId } from '../../types';
import { useSession } from '../../app/session';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Overlay';

export interface NavDescriptor {
  id: TabId;
  icon: React.ElementType;
  label: string;
}

export const PRIMARY_NAV: NavDescriptor[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: '工作台' },
  { id: 'analysis', icon: BrainCircuit, label: 'AI 分析' },
  { id: 'history', icon: HistoryIcon, label: '历史分析' },
  { id: 'featured', icon: BookOpenCheck, label: '金融家洞察' },
];

export const SECONDARY_NAV: NavDescriptor[] = [
  { id: 'announcements', icon: Megaphone, label: '系统公告' },
  { id: 'subscription', icon: CreditCard, label: '会员订阅' },
  { id: 'settings', icon: SettingsIcon, label: '设置' },
  { id: 'feedback', icon: MessageSquare, label: '意见反馈' },
  { id: 'contact', icon: QrCode, label: '联系我们' },
];

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

interface SidebarProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

/** 桌面侧边导航（md–lg 图标栏 / xl 完整栏，纯 CSS 适配） */
export const DesktopSidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate }) => {
  const { tier, authUser } = useSession();

  return (
    <aside className="ws-side">
      <div className="ws-side__brand">
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect width="40" height="40" rx="11" fill="#101820" />
          <rect x="11" y="22" width="5" height="9" rx="2.5" fill="#BFE8D4" />
          <rect x="19" y="16" width="5" height="15" rx="2.5" fill="#22B578" />
          <circle cx="29.5" cy="12.5" r="3" fill="#7EDDB2" />
        </svg>
        <span className="ws-side__brand-name">DeepTrading</span>
      </div>

      <button
        type="button"
        className="btn btn--primary ws-side__cta"
        onClick={() => onNavigate('analysis')}
        title="开始 AI 分析"
      >
        <Sparkles size={16} />
        <span className="ws-side__item-label">开始 AI 分析</span>
      </button>

      <nav className="ws-side__nav" aria-label="工作区导航">
        {ALL_NAV.slice(0, 4).map((item) => (
          <SidebarItem key={item.id} item={item} active={activeTab === item.id} onNavigate={onNavigate} />
        ))}
        <div className="ws-side__section">更多</div>
        {ALL_NAV.slice(4).map((item) => (
          <SidebarItem key={item.id} item={item} active={activeTab === item.id} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="ws-side__foot">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={tier === 'guest' ? '访客' : authUser?.username} size={32} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tier === 'guest' ? '访客' : authUser?.username || '用户'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 3 }}>
              {tier === 'pro' ? <Crown size={11} style={{ color: 'var(--blue)' }} /> : null}
              {tier === 'pro' ? 'Pro 会员' : tier === 'free' ? '免费版' : '访客模式'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const SidebarItem: React.FC<{ item: NavDescriptor; active: boolean; onNavigate: (t: TabId) => void }> = ({
  item,
  active,
  onNavigate,
}) => {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`ws-side__item ${active ? 'ws-side__item--active' : ''}`}
      onClick={() => onNavigate(item.id)}
      aria-current={active ? 'page' : undefined}
      title={item.label}
    >
      <Icon size={20} strokeWidth={active ? 2.4 : 2} />
      <span className="ws-side__item-label">{item.label}</span>
    </button>
  );
};

interface BottomNavProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  onMore: () => void;
}

/** 移动端底部导航：4 个高频入口 + 更多 */
export const MobileBottomNav: React.FC<BottomNavProps> = ({ activeTab, onNavigate, onMore }) => {
  const items = [
    { id: 'dashboard' as TabId, icon: LayoutDashboard, label: '首页' },
    { id: 'analysis' as TabId, icon: BrainCircuit, label: '分析' },
    { id: 'history' as TabId, icon: HistoryIcon, label: '历史' },
    { id: 'subscription' as TabId, icon: CreditCard, label: '订阅' },
  ];

  const isMoreActive = !items.some((i) => i.id === activeTab);

  return (
    <nav className="ws-bottomnav" aria-label="底部导航">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`ws-bottomnav__item ${active ? 'ws-bottomnav__item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="ws-bottomnav__pill" aria-hidden="true" />
            <span className="ws-bottomnav__icon">
              <Icon size={21} strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className="ws-bottomnav__label">{item.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={`ws-bottomnav__item ${isMoreActive ? 'ws-bottomnav__item--active' : ''}`}
        onClick={onMore}
      >
        <span className="ws-bottomnav__pill" aria-hidden="true" />
        <span className="ws-bottomnav__icon">
          <MoreHorizontal size={21} strokeWidth={2} />
        </span>
        <span className="ws-bottomnav__label">更多</span>
      </button>
    </nav>
  );
};

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

/** 移动端「更多」抽屉：次要目的地 + 账号操作 */
export const MoreSheet: React.FC<MoreSheetProps> = ({ open, onClose, activeTab, onNavigate }) => {
  const { tier, authUser, isGuest, handleLogout } = useSession();

  const go = (tab: TabId) => {
    onClose();
    onNavigate(tab);
  };

  return (
    <Drawer open={open} onClose={onClose} side="bottom" label="更多功能">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px 16px' }}>
        <Avatar name={isGuest ? '访客' : authUser?.username} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{isGuest ? '访客' : authUser?.username || '用户'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {tier === 'pro' ? 'Pro 会员' : tier === 'free' ? '免费版' : '访客模式'}
          </div>
        </div>
        {tier !== 'pro' && (
          <Button size="sm" variant="primary" onClick={() => go('subscription')}>
            <Crown size={13} /> 升级
          </Button>
        )}
      </div>

      <div className="more-list">
        <div className="more-list__group">浏览</div>
        {PRIMARY_NAV.filter((n) => n.id !== 'dashboard' && n.id !== 'analysis' && n.id !== 'history').map((item) => (
          <MoreRow key={item.id} item={item} active={activeTab === item.id} onNavigate={go} />
        ))}
        <div className="more-list__group">服务</div>
        {SECONDARY_NAV.map((item) => (
          <MoreRow key={item.id} item={item} active={activeTab === item.id} onNavigate={go} />
        ))}
        <div className="more-list__group">账号</div>
        {isGuest ? (
          <button type="button" className="row-item" onClick={() => { onClose(); handleLogout(); }}>
            <LogIn size={18} style={{ color: 'var(--blue)' }} />
            登录 / 注册
          </button>
        ) : (
          <button type="button" className="row-item" onClick={() => { onClose(); handleLogout(); }} style={{ color: 'var(--danger)' }}>
            <LogOut size={18} />
            退出登录
          </button>
        )}
      </div>
    </Drawer>
  );
};

const MoreRow: React.FC<{ item: NavDescriptor; active: boolean; onNavigate: (t: TabId) => void }> = ({
  item,
  active,
  onNavigate,
}) => {
  const Icon = item.icon;
  return (
    <button type="button" className="row-item" onClick={() => onNavigate(item.id)}>
      <Icon size={18} style={{ color: active ? 'var(--blue)' : 'var(--text-2)' }} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {active && <Sparkles size={14} style={{ color: 'var(--blue)' }} />}
    </button>
  );
};
