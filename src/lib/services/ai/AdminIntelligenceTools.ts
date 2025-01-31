import { Tool } from '@langchain/core/tools';
import { SupabaseClient } from '@supabase/supabase-js';
import { Langfuse } from 'langfuse';
import { BaseTracer } from '@langchain/core/tracers/base';
import { LangChainTracer } from 'langchain/callbacks';
import { Client as LangSmithClient } from 'langsmith';
import { AccuracyMetricsService } from './AccuracyMetricsService';
import { UUID } from 'crypto';

interface ToolProps {
  supabase: SupabaseClient;
  langfuse?: Langfuse;
  langsmith?: LangSmithClient;
}

interface SupabaseRawTicket {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  customer: {
    name: string;
    email: string;
    customer_id: string;
  };
}

interface RawTicket {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  customer: {
    name: string;
    email: string;
    customer_id: string;
  };
}

interface Ticket {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  customer: {
    name: string;
    email: string;
    customer_id: string;
  };
}

interface TicketSummary {
  total: number;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
}

// Enhanced tracing interfaces
interface TracingContext {
  parentTraceId?: string;
  rootTraceId: string;
  depth: number;
  startTime: number;
}

interface TracingMetadata {
  userId?: string;
  sessionId?: string;
  organizationId: string;
  toolName: string;
  actionType: 'query' | 'mutation';
  startTime: number;
  total?: number;
  context?: TracingContext;
  metadata?: {
    performance?: {
      duration_ms?: number;
      query_complexity?: number;
      total_processed?: number;
      retry_count?: number;
    };
    data?: {
      ticket_count?: number;
      filters?: any;
      agent_id?: string;
      mutation_type?: string;
      total?: number;
      processed?: number;
    };
    error?: {
      message?: string;
      type?: string;
      stack?: string;
    };
  };
}

interface TraceFilters {
  excludeFields: string[];
  minDuration: number;
  maxDepth: number;
  samplingRate: number;
}

// Add error type
interface AIToolError extends Error {
  name: string;
  message: string;
  stack?: string;
}

class EnhancedTracer extends BaseTracer {
  name = 'enhanced_tracer';
  private traceQueue: TracingMetadata[] = [];
  private readonly QUEUE_SIZE_LIMIT = 10;
  private readonly filters: TraceFilters = {
    excludeFields: ['sensitive_data', 'internal_ids'],
    minDuration: 100,
    maxDepth: 5,
    samplingRate: 0.1
  };
  
  constructor(private langfuse: Langfuse | undefined) {
    super();
  }

  protected async persistRun(run: any): Promise<void> {
    if (!this.langfuse) return;
    
    const trace: TracingMetadata = {
      toolName: run.name || 'unknown',
      actionType: 'query',
      startTime: Date.now(),
      organizationId: run.inputs?.organizationId || '',
      total: run.inputs?.total || 0,
      metadata: {
        performance: {
          duration_ms: run.end_time ? run.end_time - run.start_time : undefined,
          total_processed: run.outputs?.total || 0
        },
        data: {
          total: run.inputs?.total || 0,
          processed: run.outputs?.processed || 0
        }
      }
    };

    await this.addTrace(trace);
  }

  private shouldSample(): boolean {
    return Math.random() < this.filters.samplingRate;
  }

  private async flushTraces(): Promise<void> {
    if (!this.langfuse || this.traceQueue.length === 0) return;

    const traces = [...this.traceQueue];
    this.traceQueue = [];

    const validTraces = traces.filter(trace => 
      (!trace.metadata?.performance?.duration_ms || 
       trace.metadata.performance.duration_ms >= this.filters.minDuration) &&
      (!trace.context?.depth || 
       trace.context.depth <= this.filters.maxDepth)
    );

    await Promise.all(
      validTraces.map(trace => 
        this.langfuse!.trace({
          name: `${trace.toolName}_execution`,
          metadata: this.sanitizeMetadata(trace)
        })
      )
    );
  }

  private sanitizeMetadata(trace: TracingMetadata): any {
    const metadata = { ...trace };
    if (metadata.metadata?.data) {
      metadata.metadata.data.total = metadata.total;
    }
    this.filters.excludeFields.forEach(field => {
      delete metadata[field as keyof typeof metadata];
    });
    return metadata;
  }

  public async addTrace(trace: TracingMetadata): Promise<void> {
    if (!this.langfuse || !this.shouldSample()) return;

    this.traceQueue.push(trace);
    if (this.traceQueue.length >= this.QUEUE_SIZE_LIMIT) {
      await this.flushTraces();
    }
  }

  public createContext(parentContext?: TracingContext): TracingContext {
    return {
      parentTraceId: parentContext?.rootTraceId,
      rootTraceId: parentContext?.rootTraceId || crypto.randomUUID(),
      depth: (parentContext?.depth || 0) + 1,
      startTime: Date.now()
    };
  }
}

export class OrganizationStructureTool extends Tool {
  name = "get_organization_structure";
  description = "Get organization structure with teams, agents, and tickets. ONLY use this tool when you need to: 1) Get total number of agents/customers, 2) Get team structure information, 3) Get workload distribution, 4) Get ticket summaries. Do NOT use this tool if you already have the information in your context.";
  private supabase: SupabaseClient;
  private tracer: EnhancedTracer;
  private currentContext?: TracingContext;
  private metricsService: AccuracyMetricsService;
  
  constructor(props: ToolProps) {
    super();
    this.supabase = props.supabase;
    this.tracer = new EnhancedTracer(props.langfuse);
    this.metricsService = new AccuracyMetricsService(
      props.supabase, 
      props.langsmith, 
      props.langfuse
    );
  }

  private checkDataQuality(result: any): number {
    if (!result?.data) return 0;
    
    let score = 0;
    const data = result.data;
    
    // Check for presence of key data structures
    if (data.tickets?.summary) score += 0.3;
    if (data.teams) score += 0.3;
    if (data.customers) score += 0.3;
    
    // Check for data completeness
    const hasCompleteData = Object.values(data).every(val => val !== null && val !== undefined);
    if (hasCompleteData) score += 0.1;
    
    return Math.min(1, score);
  }

  private checkResponseQuality(result: any): number {
    if (!result) return 0;
    
    let score = 0;
    
    // Check response structure
    if (result.success === true) score += 0.3;
    if (typeof result.data === 'object') score += 0.2;
    
    // Check for meaningful content
    const hasContent = result.data && Object.keys(result.data).length > 0;
    if (hasContent) score += 0.3;
    
    // Check for error handling
    const hasErrorHandling = result.error === undefined || (result.error && result.error.message);
    if (hasErrorHandling) score += 0.2;
    
    return score;
  }

  private calculateConfidence(input: string, result: any): number {
    if (!result) return 0;
    
    const dataQuality = this.checkDataQuality(result);
    const responseQuality = this.checkResponseQuality(result);
    
    // Weight the factors
    const weights = {
      dataQuality: 0.6,
      responseQuality: 0.4
    };
    
    return (
      dataQuality * weights.dataQuality +
      responseQuality * weights.responseQuality
    );
  }

  protected async _call(input: string): Promise<string> {
    this.currentContext = this.tracer.createContext(this.currentContext);
    const startTime = this.currentContext.startTime;
    let success = false;
    let errorType = undefined;
    let errorMessage = undefined;
    let result;
    let parsedInput = { organizationId: '', filters: {}, queryType: '' };

    try {
      // Parse and validate input early
      const tempInput = typeof input === 'string' ? JSON.parse(input) : input;
      parsedInput = {
        organizationId: tempInput.organizationId || '',
        filters: tempInput.filters || {},
        queryType: tempInput.queryType || ''
      };
      
      if (!parsedInput.organizationId) {
        throw new Error('Organization ID is required');
      }
      const parsedOrgId = parsedInput.organizationId as UUID;

      // Initialize trace metadata
      const traceMetadata: TracingMetadata = {
        toolName: this.name,
        actionType: 'query',
        startTime,
        organizationId: parsedOrgId,
        context: this.currentContext
      };

      // Implement retry mechanism with backoff
      const maxRetries = 2;
      let retryCount = 0;
      let lastError: Error | null = null;

      while (retryCount <= maxRetries) {
        try {
          const { orgStructure, tickets } = await this.fetchData(parsedOrgId, parsedInput.filters || {});
          const processedData = this.processTicketData(tickets);
          const queryComplexity = this.calculateQueryComplexity(parsedInput.filters || {});

          // Filter response based on query type
          const filteredResponse = this.filterResponse(orgStructure, processedData, parsedInput.queryType);

          traceMetadata.total = processedData.summary.total;
          result = this.formatResponse(filteredResponse);
          success = true;
          
          await this.tracer.addTrace({
            ...traceMetadata,
            metadata: {
              performance: {
                duration_ms: Date.now() - startTime,
                query_complexity: queryComplexity,
                total_processed: processedData.summary.total,
                retry_count: retryCount
              },
              data: {
                ticket_count: processedData.summary.total,
                filters: parsedInput.filters,
                total: processedData.summary.total,
                processed: processedData.summary.total
              }
            }
          });

          break;
        } catch (error) {
          lastError = error as Error;
          if (retryCount === maxRetries) {
            throw error;
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      const latencyMs = Date.now() - startTime;
      const confidence = this.calculateConfidence(input, result);

      await this.metricsService.recordMetrics({
        toolName: this.name,
        success,
        latencyMs,
        confidence,
        errorType,
        errorMessage,
        organizationId: parsedOrgId,
        metadata: {
          input_type: 'organization_query',
          data_points: Object.keys(result?.data || {}).length,
          query_complexity: this.calculateQueryComplexity(parsedInput.filters || {}),
          retry_count: retryCount
        }
      });

      return JSON.stringify(result);

    } catch (err) {
      const error = err as AIToolError;
      errorType = error.name;
      errorMessage = error.message;
      
      await this.metricsService.recordMetrics({
        toolName: this.name,
        success: false,
        latencyMs: Date.now() - startTime,
        confidence: 0,
        errorType,
        errorMessage,
        organizationId: parsedInput.organizationId as UUID,
        metadata: {
          error_context: error.stack
        }
      });

      return JSON.stringify({
        success: false,
        error: {
          type: errorType,
          message: errorMessage,
          details: error.stack
        }
      });
    }
  }

  private calculateQueryComplexity(filters: any): number {
    let complexity = 1; // Base complexity
    if (filters.ticket_status?.length) complexity += 0.5;
    if (filters.exclude_status?.length) complexity += 0.5;
    if (filters.include_assigned) complexity += 0.5;
    return complexity;
  }

  private parseAndValidateInput(input: string) {
    try {
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      
      // Validate organizationId
      if (!parsedInput.organizationId) {
        throw new Error("organizationId is required in the input");
      }

      // Ensure organizationId is a valid UUID
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsedInput.organizationId)) {
        throw new Error("organizationId must be a valid UUID");
      }

      const filters = parsedInput.filters || this.getDefaultFilters();

      return { 
        organizationId: parsedInput.organizationId as UUID, 
        filters 
      };
    } catch (e) {
      const error = e as Error;
      throw new Error(`Invalid input format: ${error.message}`);
    }
  }

  private getDefaultFilters() {
    return {
      ticket_status: ['New', 'Open', 'In Progress'],
      exclude_status: ['Closed', 'Resolved'],
      include_assigned: false
    };
  }

  private async fetchData(organizationId: string, filters: any) {
    const [orgStructure, tickets] = await Promise.all([
      this.fetchOrgStructure(organizationId),
      this.fetchTickets(organizationId, filters)
    ]);

    return { orgStructure, tickets };
  }

  private async fetchOrgStructure(organizationId: string) {
    const { data, error } = await this.supabase
      .rpc('get_organization_structure', {
        p_organization_id: organizationId
      });

    if (error) {
      console.error('Error fetching organization structure:', error);
      throw new Error(`Failed to fetch organization structure: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No organization structure found');
    }
    
    return data;
  }

  private async fetchTickets(organizationId: string, filters: any) {
    try {
      const query = this.buildTicketQuery(organizationId, filters);
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching tickets:', error);
        throw new Error(`Failed to fetch tickets: ${error.message}`);
      }
      
      if (!data) {
        return [];
      }
      
      return this.mapTicketData(data);
    } catch (error) {
      console.error('Error in fetchTickets:', error);
      throw error;
    }
  }

  private buildTicketQuery(organizationId: string, filters: any) {
    if (!organizationId) {
      throw new Error('Organization ID is required for ticket query');
    }

    const query = this.supabase
      .from('tickets')
      .select(`
        ticket_id,
        title,
        status,
        priority,
        created_at,
        updated_at,
        customer:customers!inner(
          name,
          email,
          customer_id
        )
      `)
      .eq('organization_id', organizationId);

    if (!filters.include_assigned) {
      query.is('assigned_to', null);
    }
    if (filters.ticket_status?.length > 0) {
      query.in('status', filters.ticket_status);
    }
    if (filters.exclude_status?.length > 0) {
      const excludeList = filters.exclude_status.join(',');
      query.not('status', 'in', `(${excludeList})`);
    }

    return query.order('priority', { ascending: false })
                .order('created_at', { ascending: false });
  }

  private mapTicketData(rawTickets: any[]): Ticket[] {
    return rawTickets.map((ticket): Ticket => ({
      ticket_id: ticket.ticket_id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      customer: {
        name: ticket.customer.name,
        email: ticket.customer.email,
        customer_id: ticket.customer.customer_id
      }
    }));
  }

  private processTicketData(tickets: Ticket[]): any {
    return {
      summary: this.calculateTicketSummary(tickets),
      categorized: this.categorizeTickets(tickets),
      all: tickets
    };
  }

  private categorizeTickets(tickets: Ticket[]): Record<string, Ticket[]> {
    return tickets.reduce((acc: Record<string, Ticket[]>, ticket) => {
      const priority = ticket.priority.toLowerCase();
      if (!acc[priority]) acc[priority] = [];
      acc[priority].push(ticket);
      return acc;
    }, {});
  }

  private calculateTicketSummary(tickets: Ticket[]): TicketSummary {
    return {
      total: tickets.length,
      by_priority: Object.entries(this.categorizeTickets(tickets)).reduce((acc: Record<string, number>, [priority, priorityTickets]) => {
        acc[priority] = priorityTickets.length;
        return acc;
      }, {}),
      by_status: tickets.reduce((acc: Record<string, number>, ticket) => {
        const status = ticket.status.toLowerCase();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    };
  }

  private formatResponse(orgStructure: any, processedData: any) {
    return {
      success: true,
      data: {
        ...orgStructure,
        tickets: processedData
      },
      message: 'Organization structure and ticket data retrieved successfully'
    };
  }

  private filterResponse(orgStructure: any, processedData: any, queryType?: string): any {
    switch (queryType) {
      case 'ticket_count':
        return {
          tickets: {
            summary: processedData.summary
          }
        };
      case 'customer_list':
        return {
          customers: orgStructure.customers
        };
      case 'team_structure':
        return {
          teams: orgStructure.teams
        };
      default:
        return {
          teams: orgStructure.teams,
          customers: orgStructure.customers,
          tickets: processedData
        };
    }
  }
}

export class TicketAssignmentTool extends Tool {
  name = "manage_ticket_assignment";
  description = "Assign or reassign tickets to agents. Required parameters: ticketIds (array of UUIDs), agentId (UUID).";
  private supabase: SupabaseClient;
  private tracer: EnhancedTracer;
  private currentContext?: TracingContext;
  private metricsService: AccuracyMetricsService;

  constructor(props: ToolProps) {
    super();
    this.supabase = props.supabase;
    this.tracer = new EnhancedTracer(props.langfuse);
    this.metricsService = new AccuracyMetricsService(
      props.supabase, 
      props.langsmith, 
      props.langfuse
    );
  }

  private calculateConfidence(input: any, result: any): number {
    let confidence = 0;
    
    const factors = {
      validInput: 0.25,
      agentAvailability: 0.25,
      assignmentSuccess: 0.25,
      matchQuality: 0.25
    };

    try {
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      
      // Check input validity
      if (parsedInput.ticketIds?.length > 0 && parsedInput.agentId) {
        confidence += factors.validInput;
      }

      // Check agent availability
      if (result?.data?.agent_available) {
        confidence += factors.agentAvailability;
      }

      // Check assignment success
      if (result?.success) {
        confidence += factors.assignmentSuccess;
      }

      // Check match quality (if agent skills match ticket requirements)
      if (result?.data?.skill_match_score > 0.7) {
        confidence += factors.matchQuality;
      }

    } catch (error) {
      console.error('Error calculating confidence:', error);
      return 0;
    }

    return confidence * 100;
  }

  protected async _call(input: string): Promise<string> {
    this.currentContext = this.tracer.createContext(this.currentContext);
    const startTime = this.currentContext.startTime;

    const traceMetadata: TracingMetadata = {
      toolName: this.name,
      actionType: 'mutation',
      startTime,
      organizationId: '', // Will be set from input
      context: this.currentContext
    };

    let success = false;
    let errorType = undefined;
    let errorMessage = undefined;
    let result;

    try {
      const parsedInput = this.parseAndValidateInput(input);
      const parsedOrgId = parsedInput.organizationId as UUID;
      traceMetadata.organizationId = parsedOrgId;

      result = await this.assignTickets(parsedInput);
      success = true;
      
      const latencyMs = Date.now() - startTime;
      const confidence = this.calculateConfidence(input, result);

      await this.metricsService.recordMetrics({
        toolName: this.name,
        success,
        latencyMs,
        confidence,
        errorType,
        errorMessage,
        organizationId: parsedOrgId,
        metadata: {
          tickets_count: parsedInput.ticketIds.length,
          assignment_type: 'direct',
          agent_id: parsedInput.agentId
        }
      });

      return JSON.stringify(result);

    } catch (err) {
      const error = err as AIToolError;
      const parsedOrgId = JSON.parse(input).organizationId as UUID;
      errorType = error.name;
      errorMessage = error.message;
      
      await this.metricsService.recordMetrics({
        toolName: this.name,
        success: false,
        latencyMs: Date.now() - startTime,
        confidence: 0,
        errorType,
        errorMessage,
        organizationId: parsedOrgId,
        metadata: {
          error_context: error.stack
        }
      });

      throw error;
    }
  }

  private parseAndValidateInput(input: string): {
    ticketIds: string[];
    agentId: string;
    organizationId: string;
  } {
    try {
      let parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      if (parsedInput.input && typeof parsedInput.input === 'string') {
        parsedInput = JSON.parse(parsedInput.input);
      }

      const { ticketIds, agentId, organizationId } = parsedInput;

      if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        throw new Error("ticketIds must be a non-empty array");
      }
      if (!agentId || typeof agentId !== 'string') {
        throw new Error("agentId is required and must be a string");
      }
      if (!organizationId || typeof organizationId !== 'string') {
        throw new Error("organizationId not found in context");
      }

      return { ticketIds, agentId, organizationId };
    } catch (e) {
      throw new Error("Invalid input format or missing required fields");
    }
  }

  private async assignTickets(params: {
    ticketIds: string[];
    agentId: string;
    organizationId: string;
  }) {
    const { data, error } = await this.supabase.rpc('manage_ticket_assignment', {
      p_ticket_ids: params.ticketIds,
      p_agent_id: params.agentId,
      p_organization_id: params.organizationId
    });

    if (error) {
      throw new Error(`Failed to assign tickets: ${error.message}`);
    }

    return {
      success: true,
      message: `Successfully assigned ${params.ticketIds.length} ticket(s) to agent ${params.agentId}`,
      data
    };
  }

  private calculateMutationComplexity(params: {
    ticketIds: string[];
    agentId: string;
  }): number {
    return 1 + (params.ticketIds.length * 0.1); // Base complexity + 0.1 per ticket
  }
} 