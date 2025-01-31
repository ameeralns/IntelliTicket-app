import { SupabaseClient } from '@supabase/supabase-js';
import { Langfuse } from 'langfuse';
import { Client as LangSmithClient } from 'langsmith';
import { UUID } from 'crypto';

export interface AccuracyMetrics {
  toolName: string;
  success: boolean;
  latencyMs: number;
  confidence: number;
  errorType?: string;
  errorMessage?: string;
  organizationId: UUID;
  metadata?: Record<string, any>;
}

export interface ToolMetricsResponse {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  average_latency_ms: number;
  average_confidence: number;
  error_distribution: Record<string, number>;
  p95_latency_ms: number;
  p99_latency_ms: number;
}

export interface PerformanceTrend {
  period: string;
  metrics: {
    total_calls: number;
    successful_calls: number;
    success_rate: number;
    avg_latency: number;
    avg_confidence: number;
    changes: {
      total_calls_change: number;
      success_rate_change: number;
      latency_change: number;
      confidence_change: number;
    };
  };
}

export class AccuracyMetricsService {
  constructor(
    private supabase: SupabaseClient,
    private langsmith?: LangSmithClient,
    private langfuse?: Langfuse
  ) {}

  async recordMetrics(metrics: AccuracyMetrics): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Record to database - exclude metadata if column doesn't exist
      const { error } = await this.supabase
        .from('ai_tool_metrics')
        .insert([{
          tool_name: metrics.toolName,
          success: metrics.success,
          latency_ms: metrics.latencyMs,
          confidence: metrics.confidence,
          error_type: metrics.errorType,
          error_message: metrics.errorMessage,
          organization_id: metrics.organizationId
        }]);

      if (error) throw error;

      // Record to LangSmith if available
      if (this.langsmith) {
        await this.langsmith.createRun({
          name: metrics.toolName,
          run_type: 'tool',
          start_time: startTime,
          end_time: Date.now(),
          error: metrics.errorMessage || undefined,
          inputs: {
            confidence: metrics.confidence,
            latency_ms: metrics.latencyMs
          }
        });
      }

      // Record to Langfuse if available
      if (this.langfuse) {
        await this.langfuse.trace({
          name: `${metrics.toolName}_accuracy`,
          metadata: {
            success: metrics.success,
            confidence: metrics.confidence,
            latency_ms: metrics.latencyMs,
            error: metrics.errorMessage
          }
        });
      }
    } catch (error) {
      console.error('Failed to record accuracy metrics:', error);
      // Don't throw - we don't want metrics recording to break the main flow
    }
  }

  async getToolMetrics(
    toolName?: string,
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day',
    organizationId?: UUID
  ): Promise<ToolMetricsResponse> {
    const { data, error } = await this.supabase
      .rpc('get_ai_tool_metrics', {
        p_tool_name: toolName,
        p_timeframe: timeframe,
        p_organization_id: organizationId
      });

    if (error) throw error;
    return data as ToolMetricsResponse;
  }

  async analyzePerformanceTrends(
    toolName: string,
    timeframe: 'day' | 'week' | 'month' = 'week',
    organizationId?: UUID
  ): Promise<{ periods: PerformanceTrend[] }> {
    const { data, error } = await this.supabase
      .rpc('analyze_tool_performance_trends', {
        p_tool_name: toolName,
        p_timeframe: timeframe,
        p_organization_id: organizationId
      });

    if (error) throw error;
    return data as { periods: PerformanceTrend[] };
  }
} 