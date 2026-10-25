import React, { useEffect, useRef, useState } from 'react';
import type { TabId } from '../types';
import { useRouter } from '../app/router';
import { DesktopSidebar, MobileBottomNav, MoreSheet } from '../features/workspace/WorkspaceNav';
import { WorkspaceToolbar } from '../features/workspace/WorkspaceToolbar';
import DashboardPage from '../pages/DashboardPage';
import AnalysisPage from '../pages/AnalysisPage';
import HistoryPage from '../pages/HistoryPage';
import SubscriptionPage from '../pages/SubscriptionPage';
import SettingsPage from '../pages/SettingsPage';
import AnnouncementsPage from '../pages/AnnouncementsPage';
import FeaturedPage from '../pages/FeaturedPage';
import FeedbackPage from '../pages/FeedbackPage';
import ContactPage from '../pages/ContactPage';

const PAGE_TITLES: Record<TabId, string> = {
  dashboard: '工作台',
  analysis: 'AI 分析',
  history: '历史分析',
  subscription: '会员订阅',
  settings: '设置',
  announcements: '系统公告',
  featured: '金融家洞察',
  feedback: '意见反馈',
  contact: '联系我们',
};

interface WorkspaceLayoutProps {
  activeTab: TabId;
}

/** 工作区外壳：侧边栏 / 顶栏 / 底部导航 / 内容路由 */
const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ activeTab }) => {
  const { navigate } = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const goto = (tab: TabId) => {
    if (tab === activeTab) {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(`/app/${tab}`, { replace: true });
  };

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onAnalyze={() => goto('analysis')} onNavigateTab={goto} />;
      case 'analysis':
        return <AnalysisPage />;
      case 'history':
        return <HistoryPage onNavigateTab={goto} />;
      case 'subscription':
        return <SubscriptionPage />;
      case 'settings':
        return <SettingsPage onNavigateTab={goto} />;
      case 'announcements':
        return <AnnouncementsPage />;
      case 'featured':
        return <FeaturedPage />;
      case 'feedback':
        return <FeedbackPage />;
      case 'contact':
        return <ContactPage />;
      default:
        return <DashboardPage onAnalyze={() => goto('analysis')} />;
    }
  };

  return (
    <div className="ws">
      <DesktopSidebar activeTab={activeTab} onNavigate={goto} />

      <main className="ws-main" ref={mainRef}>
        <WorkspaceToolbar title={PAGE_TITLES[activeTab]} onNavigate={goto} />
        <div className="ws-content page-pad">
          <div key={activeTab} className="anim-page">
            {renderPage()}
          </div>
        </div>
      </main>

      <MobileBottomNav activeTab={activeTab} onNavigate={goto} onMore={() => setMoreOpen(true)} />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        activeTab={activeTab}
        onNavigate={goto}
      />
    </div>
  );
};

export default WorkspaceLayout;
