import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AIAnalysisReport, AuthQuota, AuthUser, UserTier } from '../types';
import { API_BASE_URL, apiFetch, getAuthToken } from '../services/api';
import { useNavigate } from './router';

const GUEST_KEY = 'auth_guest';

interface SessionContextValue {
  tier: UserTier;
  isAdmin: boolean;
  authUser: AuthUser | null;
  authSubscription: any;
  quota: AuthQuota | null;
  history: AIAnalysisReport[];
  isGuest: boolean;
  isLoggedIn: boolean;
  hasSession: boolean;
  refreshToken: () => void;
  handleLoginSuccess: () => void;
  handleGuestLogin: () => void;
  handleLogout: () => void;
  handleAnalysisComplete: (report: AIAnalysisReport) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

function hasStoredSession(): boolean {
  return Boolean(getAuthToken() || sessionStorage.getItem(GUEST_KEY));
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [tier, setTier] = useState<UserTier>('free');
  const [isAdmin, setIsAdmin] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authSubscription, setAuthSubscription] = useState<any>(null);
  const [quota, setQuota] = useState<AuthQuota | null>(null);
  const [history, setHistory] = useState<AIAnalysisReport[]>([]);
  const [hasSession, setHasSession] = useState(hasStoredSession);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // 旧版本 localStorage 迁移
  useEffect(() => {
    try {
      const legacyToken = localStorage.getItem('auth_token');
      const legacyChannel = localStorage.getItem('auth_channel');
      if (legacyToken && !sessionStorage.getItem('auth_token')) {
        sessionStorage.setItem('auth_token', legacyToken);
      }
      if (legacyChannel && !sessionStorage.getItem('auth_channel')) {
        sessionStorage.setItem('auth_channel', legacyChannel);
      }
      if (legacyToken) localStorage.removeItem('auth_token');
      if (legacyChannel) localStorage.removeItem('auth_channel');
      setHasSession(hasStoredSession());
    } catch {
      // ignore storage errors
    }
  }, []);

  const resetAuthState = useCallback(() => {
    setIsAdmin(false);
    setAuthUser(null);
    setAuthSubscription(null);
    setQuota(null);
    setHistory([]);
  }, []);

  // 会话刷新：可见时每 30s + 窗口聚焦时
  useEffect(() => {
    if (!hasSession) return;
    const trigger = () => setRefreshNonce((v) => v + 1);
    const onFocus = () => trigger();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') trigger();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') trigger();
    }, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [hasSession]);

  // 拉取用户信息 / 配额 / 报告历史
  useEffect(() => {
    if (!hasSession) return;
    const token = getAuthToken();
    if (!token) {
      // 游客会话：仅标记，不请求
      setTier('guest');
      resetAuthState();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data: any = await apiFetch('/api/auth/me').catch(async (err: any) => {
          throw err;
        });
        if (cancelled) return;

        const channel = data?.user?.channel;
        const backendTier = typeof data?.tier === 'string' ? data.tier : null;
        setIsAdmin(channel === 1 || backendTier === 'admin');
        setAuthUser(data?.user || null);
        setAuthSubscription(data?.subscription || null);
        setQuota(data?.quota || null);
        if (typeof channel === 'number') {
          sessionStorage.setItem('auth_channel', String(channel));
        }
        if (backendTier === 'pro' || backendTier === 'admin') {
          setTier('pro');
        } else if (backendTier === 'free') {
          setTier('free');
        }

        try {
          const historyData: any = await apiFetch('/api/reports?page=1&pageSize=50');
          if (!cancelled) {
            setHistory(Array.isArray(historyData?.items) ? historyData.items : []);
          }
        } catch {
          if (!cancelled) setHistory([]);
        }
      } catch {
        if (!cancelled) {
          resetAuthState();
          try {
            sessionStorage.removeItem('auth_channel');
          } catch {
            // ignore
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasSession, refreshNonce, resetAuthState]);

  const handleLoginSuccess = useCallback(() => {
    try {
      sessionStorage.removeItem(GUEST_KEY);
    } catch {
      // ignore
    }
    setTier('free');
    setIsAdmin(false);
    setAuthUser(null);
    setAuthSubscription(null);
    setQuota(null);
    setHistory([]);
    setHasSession(true);
    setRefreshNonce((v) => v + 1);
  }, []);

  const handleGuestLogin = useCallback(() => {
    try {
      sessionStorage.setItem(GUEST_KEY, '1');
    } catch {
      // ignore
    }
    setTier('guest');
    setIsAdmin(false);
    setAuthUser(null);
    setAuthSubscription(null);
    setQuota(null);
    setHistory([]);
    setHasSession(true);
  }, []);

  const handleLogout = useCallback(() => {
    try {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_channel');
      sessionStorage.removeItem(GUEST_KEY);
    } catch {
      // ignore
    }
    setTier('free');
    setIsAdmin(false);
    setAuthUser(null);
    setAuthSubscription(null);
    setQuota(null);
    setHistory([]);
    setHasSession(false);
    navigate('/');
  }, [navigate]);

  const handleAnalysisComplete = useCallback((report: AIAnalysisReport) => {
    const newReportId = (report as any)?.id ? String((report as any).id) : Date.now().toString();
    const newReport = { ...report, id: newReportId };
    setHistory((prev) => [newReport, ...prev]);
  }, []);

  const refreshToken = useCallback(() => setRefreshNonce((v) => v + 1), []);

  // 管理员「测试模式」本地档位预览（不影响服务端身份）
  useEffect(() => {
    const handler = (e: Event) => {
      const t = (e as CustomEvent).detail;
      if (t === 'guest' || t === 'free' || t === 'pro') setTier(t);
    };
    window.addEventListener('dt-dev-tier', handler);
    return () => window.removeEventListener('dt-dev-tier', handler);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      tier,
      isAdmin,
      authUser,
      authSubscription,
      quota,
      history,
      isGuest: tier === 'guest',
      isLoggedIn: Boolean(getAuthToken()),
      hasSession,
      refreshToken,
      handleLoginSuccess,
      handleGuestLogin,
      handleLogout,
      handleAnalysisComplete,
    }),
    [tier, isAdmin, authUser, authSubscription, quota, history, hasSession, refreshToken, handleLoginSuccess, handleGuestLogin, handleLogout, handleAnalysisComplete]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export { API_BASE_URL };
