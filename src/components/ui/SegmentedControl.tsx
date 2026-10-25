import React, { useLayoutEffect, useRef, useState } from 'react';

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  block?: boolean;
  ariaLabel?: string;
}

/** 滑动指示的分段控件 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  block,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ left: 4, width: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll('.seg__item')) as HTMLButtonElement[];
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    const btn: HTMLButtonElement | undefined = buttons[idx];
    if (btn) {
      setThumb({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      className={`seg ${block ? 'seg--block' : ''}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {thumb.width > 0 && (
        <span
          className="seg__thumb"
          style={{ left: thumb.left, width: thumb.width }}
          aria-hidden="true"
        />
      )}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`seg__item ${active ? 'seg__item--active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
