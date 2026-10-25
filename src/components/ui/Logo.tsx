import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/** 品牌标识 — 墨色圆角底 + 绿色趋势柱 + 预测点 */
const Logo: React.FC<LogoProps> = ({ size = 40, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <rect width="40" height="40" rx="11" fill="#101820" />
    <rect x="11" y="22" width="5" height="9" rx="2.5" fill="#BFE8D4" />
    <rect x="19" y="16" width="5" height="15" rx="2.5" fill="#22B578" />
    <circle cx="29.5" cy="12.5" r="3" fill="#7EDDB2" />
  </svg>
);

export default Logo;
