import React from 'react';

type Variant = 'primary' | 'blue' | 'secondary' | 'ghost' | 'dangerGhost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
  block?: boolean;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: 'btn--primary',
  blue: 'btn--blue',
  secondary: 'btn--secondary',
  ghost: 'btn--ghost',
  dangerGhost: 'btn--danger-ghost',
};

const sizeClass: Record<Size, string> = {
  sm: 'btn--sm',
  md: '',
  lg: 'btn--lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  pill,
  block,
  loading,
  className,
  children,
  disabled,
  ...rest
}) => (
  <button
    className={`btn ${variantClass[variant]} ${sizeClass[size]} ${pill ? 'btn--pill' : ''} ${block ? 'btn--block' : ''} ${className || ''}`}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...rest}
  >
    {loading && <span className="btn__spinner" aria-hidden="true" />}
    {children}
  </button>
);

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  badge?: number | null;
}

export const IconButton: React.FC<IconButtonProps> = ({ label, active, badge, className, children, ...rest }) => (
  <button
    className={`icon-btn ${className || ''}`}
    aria-label={label}
    title={label}
    aria-expanded={active}
    {...rest}
  >
    {children}
    {badge != null && badge > 0 && <span className="icon-btn__badge">{badge > 99 ? '99+' : badge}</span>}
  </button>
);
