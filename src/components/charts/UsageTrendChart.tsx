import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';

export interface UsageTrendItem {
  date: string;
  count: number;
}

interface UsageTrendChartProps {
  data: UsageTrendItem[];
  height?: number;
}

interface TooltipPayloadItem {
  active?: boolean;
  payload?: { value?: number; payload?: UsageTrendItem }[];
}

const ChartTooltip: React.FC<TooltipPayloadItem> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--divider-soft)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-md)',
        padding: '8px 12px',
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--ink)',
      }}
    >
      <div style={{ color: 'var(--text-2)', fontWeight: 600, marginBottom: 2 }}>{item.payload?.date}</div>
      <span className="num" style={{ color: 'var(--green-deep)' }}>{item.value} 次分析</span>
    </div>
  );
};

/** 使用频次趋势 — 绿色柱状图（进场一次动画） */
const UsageTrendChart: React.FC<UsageTrendChartProps> = ({ data, height = 220 }) => {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--divider)" />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--text-2)', fontSize: 11, fontWeight: 600 }}
          dy={8}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--text-2)', fontSize: 11, fontWeight: 600 }}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(16,24,32,0.035)' }}
          content={<ChartTooltip />}
        />
        <Bar
          dataKey="count"
          fill="#22B578"
          radius={[5, 5, 3, 3]}
          maxBarSize={26}
          isAnimationActive={!reducedMotion}
          animationDuration={500}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default UsageTrendChart;
