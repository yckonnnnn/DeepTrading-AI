import React from 'react';
import { BrainCircuit } from 'lucide-react';

/**
 * 分析等待态 — 诚实设计：
 * 不伪造处理步骤或百分比，仅提供呼吸动效与真实等待时长。
 */
export const AnalysisLoading: React.FC<{ elapsed: number; mode: 'text' | 'image' }> = ({ elapsed, mode }) => (
  <div className="ana-loading">
    <div className="ana-loading__orbit" aria-hidden="true">
      <span className="ana-loading__ripple" />
      <span className="ana-loading__ripple" />
      <span className="ana-loading__core">
        <BrainCircuit size={30} />
      </span>
    </div>

    <h3>AI 深度分析中</h3>
    <p className="ana-loading__sub">
      {mode === 'image'
        ? '正在识别 K 线形态并关联真实行情数据，通常需要 30–50 秒，请保持页面打开。'
        : '正在结合技术指标与策略模型生成报告，通常需要 20–40 秒，请保持页面打开。'}
    </p>

    <span className="ana-loading__timer">
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'dt-dot-pulse 1.6s ease-in-out infinite' }} />
      已等待 <span className="num">{elapsed}</span> 秒
    </span>
  </div>
);
