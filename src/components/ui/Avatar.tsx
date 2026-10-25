import React, { useMemo } from 'react';

const PALETTE = [
  ['#3478F6', '#6AA2FF'],
  ['#101820', '#3D4A5C'],
  ['#22B578', '#5ED0A0'],
  ['#E8853D', '#F2B071'],
  ['#7C6CF6', '#A79BFF'],
  ['#DE4436', '#F07A6E'],
] as const;

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface AvatarProps {
  name?: string | null;
  size?: number;
  className?: string;
}

/** 本地确定性头像（姓名首字 + 渐变），无外部依赖 */
export const Avatar: React.FC<AvatarProps> = ({ name, size = 36, className }) => {
  const seed = name && name.trim() ? name : '访客';
  const [c1, c2] = useMemo(() => PALETTE[hashString(seed) % PALETTE.length], [seed]);
  const ch = seed.trim().charAt(0).toUpperCase();

  return (
    <span
      className={`avatar ${className || ''}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.round(size * 0.42)),
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
      aria-hidden="true"
    >
      {ch}
    </span>
  );
};

export const ProgressBar: React.FC<{ percent: number; tone?: 'ink' | 'green' | 'blue' | 'amber' }> = ({
  percent,
  tone = 'ink',
}) => {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`progress__fill ${tone !== 'ink' ? `progress__fill--${tone}` : ''}`} style={{ width: `${pct}%` }} />
    </div>
  );
};
