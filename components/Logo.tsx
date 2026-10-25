
import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Base Container (Black rounded base) */}
    <rect width="40" height="40" rx="12" fill="#09090b" />
    
    {/* Graphic: 2 Bars + 1 Dot (Symbol: Data -> Trend -> AI Prediction) */}
    
    {/* Bar 1: Base Data Accumulation (Light) */}
    <rect x="11" y="22" width="5" height="10" rx="2.5" fill="#ecfccb" />
    
    {/* Bar 2: Rising Trend (Main Color) */}
    <rect x="19" y="16" width="5" height="16" rx="2.5" fill="#bef264" />
    
    {/* The Prediction Dot: AI Core (Highlight + Breathing Animation) */}
    <circle cx="29.5" cy="13" r="3.5" fill="#84cc16" className="animate-pulse" />
  </svg>
);

export default Logo;
