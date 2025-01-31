import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { AccuracyMetricsService, ToolMetricsResponse, PerformanceTrend } from '@/lib/services/ai/AccuracyMetricsService';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Client as LangSmithClient } from 'langsmith';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RiPulseLine, RiBrainLine, RiTimeLine, RiErrorWarningLine } from 'react-icons/ri';

interface MetricsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number;
  description: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, icon, trend, description }) => (
  <Card className="p-6 bg-gradient-to-br from-gray-900 to-indigo-900/90 text-white border border-indigo-500/20">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-indigo-300">{title}</p>
        <h3 className="text-2xl font-bold mt-2">{value}</h3>
      </div>
      <div className="p-2 bg-indigo-500/10 rounded-lg">
        {icon}
      </div>
    </div>
    {trend !== undefined && (
      <div className={`mt-2 text-sm ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
      </div>
    )}
    <p className="mt-2 text-sm text-gray-300">{description}</p>
  </Card>
);

export const AIMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ToolMetricsResponse>();
  const [trends, setTrends] = useState<{ periods: PerformanceTrend[] }>();
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('day');
  const [selectedTool, setSelectedTool] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const supabase = createClientComponentClient();
  const langsmith = new LangSmithClient({
    apiUrl: process.env.NEXT_PUBLIC_LANGSMITH_ENDPOINT,
    apiKey: process.env.NEXT_PUBLIC_LANGSMITH_API_KEY,
  });

  const metricsService = new AccuracyMetricsService(supabase, langsmith);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const [toolMetrics, performanceTrends] = await Promise.all([
          metricsService.getToolMetrics(selectedTool, timeframe),
          selectedTool ? metricsService.analyzePerformanceTrends(selectedTool, timeframe) : undefined
        ]);
        
        setMetrics(toolMetrics);
        setTrends(performanceTrends);
      } catch (error) {
        console.error('Error fetching metrics:', error);
        setError('Failed to load metrics data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [selectedTool, timeframe]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RiPulseLine className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Average Confidence"
          value={`${Math.round(metrics?.average_confidence || 0)}%`}
          icon={<RiBrainLine className="w-6 h-6 text-indigo-400" />}
          trend={trends?.periods[0]?.metrics.changes.confidence_change}
          description="AI decision-making confidence score"
        />
        <MetricsCard
          title="Success Rate"
          value={`${Math.round((metrics?.successful_calls || 0) / (metrics?.total_calls || 1) * 100)}%`}
          icon={<RiPulseLine className="w-6 h-6 text-green-400" />}
          trend={trends?.periods[0]?.metrics.changes.success_rate_change}
          description="Successful AI operations rate"
        />
        <MetricsCard
          title="Average Latency"
          value={`${Math.round(metrics?.average_latency_ms || 0)}ms`}
          icon={<RiTimeLine className="w-6 h-6 text-blue-400" />}
          trend={trends?.periods[0]?.metrics.changes.latency_change}
          description="Average response time"
        />
        <MetricsCard
          title="Error Rate"
          value={`${Math.round((metrics?.failed_calls || 0) / (metrics?.total_calls || 1) * 100)}%`}
          icon={<RiErrorWarningLine className="w-6 h-6 text-red-400" />}
          description="Failed operations percentage"
        />
      </div>

      {trends && (
        <Card className="p-6 bg-gradient-to-br from-gray-900 to-indigo-900/90 text-white border border-indigo-500/20">
          <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.periods}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="period" 
                  stroke="#9CA3AF"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="metrics.avg_confidence" 
                  stroke="#6366F1" 
                  name="Confidence"
                />
                <Line 
                  type="monotone" 
                  dataKey="metrics.success_rate" 
                  stroke="#34D399" 
                  name="Success Rate"
                />
                <Line 
                  type="monotone" 
                  dataKey="metrics.avg_latency" 
                  stroke="#60A5FA" 
                  name="Latency"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {metrics?.error_distribution && Object.keys(metrics.error_distribution).length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-gray-900 to-indigo-900/90 text-white border border-indigo-500/20">
          <h3 className="text-lg font-semibold mb-4">Error Distribution</h3>
          <div className="space-y-2">
            {Object.entries(metrics.error_distribution).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-gray-300">{type}</span>
                <span className="text-red-400">{count} occurrences</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}; 