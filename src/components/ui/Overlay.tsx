import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey, useLockBodyScroll } from '../../hooks/useInteractions';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}

/**
 * 对话框：桌面居中淡入缩放，移动端底部滑入；
 * 长内容内部滚动，操作区固定可达。
 */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, children, footer, maxWidth }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      ref.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus?.();
    }, 60);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="modal"
        style={maxWidth ? { maxWidth } : undefined}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal__grip" aria-hidden="true" />
        <div className="modal__head">
          <div style={{ minWidth: 0 }}>
            <h2 className="modal__title">{title}</h2>
            {subtitle && <p className="modal__sub">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="icon-btn"
            style={{ width: 36, height: 36, flexShrink: 0 }}
          >
            <X size={17} />
          </button>
        </div>
        <div className="modal__body" ref={ref}>
          {children}
        </div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
};

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'bottom' | 'right';
  children: React.ReactNode;
  label?: string;
}

/** 抽屉：移动端底部上滑 / 桌面右侧滑出 */
export const Drawer: React.FC<DrawerProps> = ({ open, onClose, side = 'bottom', children, label }) => {
  useLockBodyScroll(open);
  useEscapeKey(onClose, open);

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div
        className={`drawer drawer--${side}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {side === 'bottom' && <div className="modal__grip" aria-hidden="true" style={{ marginTop: 12 }} />}
        <div className="drawer__body">{children}</div>
      </div>
    </>
  );
};
