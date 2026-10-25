import React, { useEffect } from 'react';
import { RouterProvider, useNavigate } from './router';
import { ToastProvider } from '../hooks/useToast';
import { SessionProvider, useSession } from './session';
import { NotificationsProvider } from './notifications';
import LandingPage from '../pages/LandingPage';
import AuthPage from '../pages/AuthPage';
import TermsPage from '../pages/TermsPage';
import WorkspaceLayout from '../layouts/WorkspaceLayout';
import { useRouter } from './router';

const VALID_TABS = new Set([
  'dashboard',
  'analysis',
  'history',
  'subscription',
  'settings',
  'announcements',
  'featured',
  'feedback',
  'contact',
]);

/** 视图路由：/ · /login · /register · /terms · /app[/:tab] */
const Shell: React.FC = () => {
  const { path } = useRouter();
  const navigate = useNavigate();
  const { hasSession } = useSession();

  const isWorkspace = path === '/app' || path.startsWith('/app/');

  // 工作区守卫：无会话时跳转登录页
  useEffect(() => {
    if (isWorkspace && !hasSession) {
      navigate('/login', { replace: true });
    }
  }, [isWorkspace, hasSession, navigate]);

  if (isWorkspace) {
    if (!hasSession) return null;
    const rawTab = path === '/app' ? '' : path.slice('/app/'.length);
    const tab = VALID_TABS.has(rawTab) ? (rawTab as any) : 'dashboard';
    return (
      <NotificationsProvider sessionActive>
        <WorkspaceLayout activeTab={tab} />
      </NotificationsProvider>
    );
  }

  switch (path) {
    case '/login':
      return <AuthPage initialView="login" />;
    case '/register':
      return <AuthPage initialView="register" />;
    case '/terms':
      return <TermsPage />;
    default:
      return <LandingPage />;
  }
};

const App: React.FC = () => (
  <RouterProvider>
    <ToastProvider>
      <SessionProvider>
        <Shell />
      </SessionProvider>
    </ToastProvider>
  </RouterProvider>
);

export default App;
