import React from 'react';
import { AlertCircle, Inbox, RefreshCw, SearchX } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: 'inbox' | 'search' | 'error';
  title: string;
  desc?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

/** 空态 / 无结果 / 错误占位 */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'inbox', title, desc, action, compact }) => (
  <div className="empty" style={compact ? { padding: '40px 20px' } : undefined}>
    <div className="empty__icon">
      {icon === 'search' ? <SearchX size={24} /> : icon === 'error' ? <AlertCircle size={24} /> : <Inbox size={24} />}
    </div>
    <div className="empty__title">{title}</div>
    {desc && <div className="empty__desc">{desc}</div>}
    {action && <div className="empty__action">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ title?: string; desc?: string; onRetry?: () => void }> = ({
  title = '加载失败',
  desc = '网络似乎不太顺畅，请稍后重试。',
  onRetry,
}) => (
  <EmptyState
    icon="error"
    title={title}
    desc={desc}
    action={
      onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw size={14} /> 重试
        </Button>
      ) : undefined
    }
  />
);

export const Spinner: React.FC<{ light?: boolean; size?: number }> = ({ light, size }) => (
  <span
    className={`spinner ${light ? 'spinner--light' : ''}`}
    style={size ? { width: size, height: size } : undefined}
    aria-hidden="true"
  />
);

export const SkeletonBox: React.FC<{ w?: string | number; h?: number; r?: number; className?: string; style?: React.CSSProperties }> = ({
  w,
  h = 16,
  r,
  className,
  style,
}) => (
  <div
    className={`skeleton ${className || ''}`}
    style={{ width: w, height: h, borderRadius: r, ...style }}
    aria-hidden="true"
  />
);
