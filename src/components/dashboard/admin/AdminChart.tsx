'use client';

import { FC } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

interface AdminChartProps {
  title: string;
  data: Array<{ name: string; value: number }>;
  className?: string;
}

const AdminChart: FC<AdminChartProps> = ({ title, data, className }) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md",
      className
    )}>
      <div className="p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          {title}
        </h3>
        <div className="mt-6" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(99, 102, 241)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="rgb(99, 102, 241)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                }}
                labelStyle={{ color: '#111827', fontWeight: 600 }}
                itemStyle={{ color: '#6366F1' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366F1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Decorative background pattern */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 h-1" />
    </div>
  );
};

export default AdminChart; 