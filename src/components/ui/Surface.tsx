import React from 'react';

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  xl?: boolean;
  pad?: boolean;
  interactive?: boolean;
}

/** 标准白色内容卡片 */
export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  xl,
  pad,
  interactive,
  className,
  children,
  ...rest
}) => (
  <div
    className={`card ${xl ? 'card--xl' : ''} ${pad ? 'card--pad' : ''} ${interactive ? 'card--click' : ''} ${className || ''}`}
    {...rest}
  >
    {children}
  </div>
);

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  over?: 'page' | 'sky';
  strong?: boolean;
}

/** 液态玻璃面板（导航、下拉、弹层等选择性使用） */
export const GlassPanel: React.FC<GlassPanelProps> = ({ over = 'page', strong, className, children, ...rest }) => (
  <div
    className={`glass ${over === 'sky' ? 'glass--sky' : ''} ${className || ''}`}
    style={strong ? { background: 'var(--glass-bg-strong)' } : undefined}
    {...rest}
  >
    {children}
  </div>
);
