import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  labelAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({ label, hint, labelAction, children, className }) => (
  <div className={`field ${className || ''}`}>
    {(label || labelAction) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        {label && <span className="field__label">{label}</span>}
        {labelAction}
      </div>
    )}
    {children}
    {hint && <span className="field__hint">{hint}</span>}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  plain?: boolean;
  inputSize?: 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({ icon, plain, inputSize, className, style, ...rest }) => {
  if (!icon) {
    return <input className={`input ${inputSize === 'lg' ? 'input--lg' : ''} ${className || ''}`} style={style} {...rest} />;
  }
  return (
    <div className="input-wrap" style={style}>
      <input
        className={`input ${inputSize === 'lg' ? 'input--lg' : ''} ${className || ''}`}
        {...rest}
      />
      <span className="input-wrap__icon" style={plain ? { left: 14 } : undefined}>{icon}</span>
    </div>
  );
};

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...rest }) => (
  <textarea className={`textarea ${className || ''}`} {...rest} />
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ children, className, ...rest }) => {
  const id = useId();
  return (
    <div className="input-wrap">
      <select id={id} className={`select ${className || ''}`} {...rest}>
        {children}
      </select>
      <span className="select-caret">
        <ChevronDown size={16} />
      </span>
    </div>
  );
};

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children: React.ReactNode;
}

export const Checkbox: React.FC<CheckboxProps> = ({ children, className, ...rest }) => (
  <label className={className} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
    <input
      type="checkbox"
      style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--blue)', flexShrink: 0, cursor: 'pointer' }}
      {...rest}
    />
    <span style={{ fontSize: 13, lineHeight: 1.6 }}>{children}</span>
  </label>
);
