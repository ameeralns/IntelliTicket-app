import { Tool } from '@langchain/core/tools';
import { SupabaseClient } from '@supabase/supabase-js';
import { Langfuse } from 'langfuse';
import { BaseTracer } from '@langchain/core/tracers/base';
import { LangChainTracer } from 'langchain/callbacks';
import { Client as LangSmithClient } from 'langsmith';

interface ToolProps {
  supabase: SupabaseClient;
  langfuse?: Langfuse | null;
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

class EnhancedTracer extends BaseTracer {
  name = 'enhanced_tracer';
  private traceQueue: TracingMetadata[] = [];
  private readonly QUEUE_SIZE_LIMIT = 10;
  private readonly filters: TraceFilters = {
    excludeFields: ['sensitive_data', 'internal_ids'],
    minDuration: 100, // ms
    maxDepth: 5,
    samplingRate: 0.1 // 10% sampling rate
  };
  
  constructor(private langfuse: Langfuse | null) {
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
  
  constructor(props: ToolProps) {
    super();
    this.supabase = props.supabase;
    this.tracer = new EnhancedTracer(props.langfuse || null);
  }

  protected async _call(input: string): Promise<string> {
    this.currentContext = this.tracer.createContext(this.currentContext);
    const startTime = this.currentContext.startTime;

    const traceMetadata: TracingMetadata = {
      toolName: this.name,
      actionType: 'query',
      startTime,
      organizationId: '', // Will be set from input
      total: 0, // Will be updated with actual total
      context: this.currentContext
    };

    try {
      const parsedInput = this.parseAndValidateInput(input);
      traceMetadata.organizationId = parsedInput.organizationId;

      const { orgStructure, tickets } = await this.fetchData(parsedInput);
      const processedData = this.processTicketData(tickets);
      const queryComplexity = this.calculateQueryComplexity(parsedInput.filters);

      traceMetadata.total = processedData.summary.total;

      const response = this.formatResponse(orgStructure, processedData);
      
      await this.tracer.addTrace({
        ...traceMetadata,
        metadata: {
          performance: {
            duration_ms: Date.now() - startTime,
            query_complexity: queryComplexity,
            total_processed: processedData.summary.total
          },
          data: {
            ticket_count: processedData.summary.total,
            filters: parsedInput.filters,
            total: processedData.summary.total,
            processed: processedData.summary.total
          }
        }
      });

      return JSON.stringify(response);

    } catch (error) {
      const err = error as Error;
      await this.tracer.addTrace({
        ...traceMetadata,
        metadata: {
          performance: {
            duration_ms: Date.now() - startTime
          },
          error: {
            message: err.message,
            type: err.name,
            stack: err.stack
          }
        }
      });
      throw error;
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
      const { organizationId, filters = this.getDefaultFilters() } = parsedInput;

      if (!organizationId) {
        throw new Error("organizationId is required");
      }

      return { organizationId, filters };
    } catch (e) {
      throw new Error("Invalid input format");
    }
  }

  private getDefaultFilters() {
    return {
      ticket_status: ['New', 'Open', 'In Progress'],
      exclude_status: ['Closed', 'Resolved'],
      include_assigned: false
    };
  }

  private async fetchData(params: { organizationId: string; filters: any }) {
    const [orgStructure, tickets] = await Promise.all([
      this.fetchOrgStructure(params.organizationId),
      this.fetchTickets(params.organizationId, params.filters)
    ]);

    return { orgStructure, tickets };
  }

  private async fetchOrgStructure(organizationId: string) {
    const { data, error } = await this.supabase
      .rpc('get_organization_structure', {
        p_organization_id: organizationId
      });

    if (error) throw error;
    return data;
  }

  private async fetchTickets(organizationId: string, filters: any) {
    const query = this.buildTicketQuery(organizationId, filters);
    const { data, error } = await query;
    
    if (error) throw error;
    return this.mapTicketData(data || []);
  }

  private buildTicketQuery(organizationId: string, filters: any) {
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
}

export class TicketAssignmentTool extends Tool {
  name = "manage_ticket_assignment";
  description = "Assign or reassign tickets to agents. Required parameters: ticketIds (array of UUIDs), agentId (UUID).";
  private supabase: SupabaseClient;
  private tracer: EnhancedTracer;
  private currentContext?: TracingContext;

  constructor(props: ToolProps) {
    super();
    this.supabase = props.supabase;
    this.tracer = new EnhancedTracer(props.langfuse || null);
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

    try {
      const parsedInput = this.parseAndValidateInput(input);
      traceMetadata.organizationId = parsedInput.organizationId;

      const result = await this.assignTickets(parsedInput);
      
      await this.tracer.addTrace({
        ...traceMetadata,
        metadata: {
          performance: {
            duration_ms: Date.now() - startTime,
            query_complexity: this.calculateMutationComplexity(parsedInput)
          },
          data: {
            ticket_count: parsedInput.ticketIds.length,
            agent_id: parsedInput.agentId
          }
        }
      });

      return JSON.stringify(result);

    } catch (error) {
      const err = error as Error;
      await this.tracer.addTrace({
        ...traceMetadata,
        metadata: {
          performance: {
            duration_ms: Date.now() - startTime
          },
          error: {
            message: err.message,
            type: err.name,
            stack: err.stack
          }
        }
      });

      return JSON.stringify({
        success: false,
        error: err.message
      });
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