import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppNotification } from '../types';
import { apiFetch } from '../services/api';
import { useRouter } from './router';

const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: -1,
    title: '欢迎使用 DeepTrading AI',
    desc: '输入股票代码或上传 K 线截图，即可生成 AI 深度分析报告。当前为演示数据。',
    time: '刚刚',
    type: 'update',
    read: false,
    demo: true,
  },
];

function formatTimeAgo(input: any): string {
  const d = input ? new Date(input) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins <= 0) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  handleNotificationClick: (n: AppNotification) => void;
  handleMarkAllRead: () => void;
  notifyAnalysisComplete: (reportId: string, stockName: string, stockCode: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode; sessionActive: boolean }> = ({
  children,
  sessionActive,
}) => {
  const { navigate } = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>(DEMO_NOTIFICATIONS);

  useEffect(() => {
    if (!sessionActive) {
      setNotifications(DEMO_NOTIFICATIONS);
      return;
    }
    const token = sessionStorage.getItem('auth_token');
    if (!token) return; // 游客：仅演示通知

    let cancelled = false;
    (async () => {
      try {
        const data: any = await apiFetch('/api/notifications?limit=50');
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        const mapped: AppNotification[] = items.map((it: any) => ({
          id: Number(it?.id),
          title: String(it?.title || ''),
          desc: String(it?.body || ''),
          time: formatTimeAgo(it?.createdAt),
          type: (it?.type === 'subscription' ? 'subscription' : (it?.type as any)) || 'update',
          read: Boolean(it?.read),
          data: it?.data?.reportId ? { reportId: String(it.data.reportId) } : undefined,
        }));
        if (cancelled) return;
        setNotifications((prev) => {
          const remoteIds = new Set(mapped.map((m) => m.id));
          const keepLocal = prev.filter((p) => !remoteIds.has(p.id) && !p.demo);
          return [...mapped, ...keepLocal];
        });
      } catch {
        // 通知拉取失败不阻塞主流程
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionActive]);

  const handleNotificationClick = useCallback(
    (notification: AppNotification) => {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));

      const token = sessionStorage.getItem('auth_token');
      if (token && notification.id > 0) {
        apiFetch(`/api/notifications/${notification.id}/read`, { method: 'POST' }).catch(() => {});
      }

      if (notification.type === 'report' && notification.data?.reportId) {
        navigate(`/app/history?report=${encodeURIComponent(notification.data.reportId)}`);
      }
    },
    [navigate]
  );

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      apiFetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
    }
  }, []);

  const notifyAnalysisComplete = useCallback(
    (reportId: string, stockName: string, stockCode: string) => {
      setNotifications((prev) => [
        {
          id: Date.now(),
          title: '分析完成',
          desc: `${stockName} (${stockCode}) 的分析报告已生成`,
          time: '刚刚',
          type: 'report',
          read: false,
          data: { reportId },
        },
        ...prev,
      ]);
    },
    []
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo(
    () => ({ notifications, unreadCount, handleNotificationClick, handleMarkAllRead, notifyAnalysisComplete }),
    [notifications, unreadCount, handleNotificationClick, handleMarkAllRead, notifyAnalysisComplete]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
