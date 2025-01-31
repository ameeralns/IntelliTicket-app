import { Tool } from '@langchain/core/tools';
import { SupabaseClient } from '@supabase/supabase-js';
import { BaseTracer } from '@langchain/core/tracers/base';
import { LangChainTracer } from 'langchain/callbacks';
import { Client as LangSmithClient } from 'langsmith';
import { AccuracyMetricsService } from './AccuracyMetricsService';
import { UUID } from 'crypto';
import { Serialized } from '@langchain/core/load/serializable';

// Replace Langfuse import with a type declaration
type Langfuse = any; // TODO: Replace with proper type when available

interface ToolConfig {
  supabase: SupabaseClient;
  langsmith: LangSmithClient;
}

interface ToolProps {
  supabase: SupabaseClient;
  langsmith?: LangSmithClient;
}

interface TracingContext {
  parentTraceId?: string;
  rootTraceId: string;
  depth: number;
  startTime: number;
}

interface KnowledgeArticleInput {
  agentId: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  sourceTicketIds?: string[];
  metadata?: Record<string, any>;
}

interface AgentToolData {
  ticket_count?: number;
  ticket_id?: string;
  filters?: any;
  agent_id?: string;
  mutation_type?: string;
  total?: number;
  processed?: number;
  articles_count?: number;
  knowledge_articles_count?: number;
  interaction_count?: number;
  draft_id?: string;
  article_id?: string;
  category?: string;
  ticket_updates?: {
    status?: string;
    priority?: string;
  };
  enriched_context?: boolean;
  draft_status?: KnowledgeDraftStatus;
}

interface TracingMetadata {
  userId?: string;
  sessionId?: string;
  organizationId: string;
  toolName: string;
  actionType: 'query' | 'mutation' | 'error' | 'performance';
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
    data?: AgentToolData;
    error?: {
      type?: string;
      message?: string;
      stack?: string;
    };
  };
}

interface AccuracyMetrics {
  toolName: string;
  success: boolean;
  latencyMs: number;
  confidence: number;
  organizationId: UUID;
  metadata?: any;
}

interface AgentMetrics extends AccuracyMetrics {}

interface AIToolError extends Error {
  name: string;
  message: string;
  stack?: string;
}

// Add ticket status type
export type TicketStatus = 'New' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';

interface TicketQuery {
  agentId: string;
  status?: TicketStatus[];
  priority?: string[];
  timeframe?: string;
  limit?: number;
  startTime?: number;
  organizationId?: UUID;
}

interface TicketCustomer {
  customer_id: string;
  name: string;
  email: string;
}

interface RawTicket {
  ticket_id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: string;
  created_at: string;
  updated_at: string;
  customer: TicketCustomer | null;
}

interface TicketHistory {
  ticket_id: string;
  type: string;
  created_at: string;
  data?: any;
}

interface EnrichedTicket extends RawTicket {
  history: TicketHistory[];
  metrics?: {
    response_time: number | null;
    update_count: number;
    age_hours: number;
  };
  customer: TicketCustomer;
}

interface TraceFilters {
  excludeFields: string[];
  minDuration: number;
  maxDepth: number;
  samplingRate: number;
}

interface AgentToolMetrics {
  toolName: string;
  success: boolean;
  latencyMs: number;
  confidence: number;
  errorType?: string;
  errorMessage?: string;
  organizationId: UUID;
  metadata: {
    input_quality?: number;
    processing_success?: number;
    data_enrichment?: number;
    context_quality?: number;
    error_context?: string;
    ticket_id?: string;
    agent_id?: string;
    input_data?: any;
    customer_count?: number;
    has_knowledge_context?: boolean;
    draft_id?: string;
    article_id?: string;
    parsed_query?: any;
    response_length?: number;
    total_tickets?: number;
    category?: string;
    performance?: {
      duration_ms: number;
      complexity: number;
      processed_items: number;
      retry_count: number;
    };
  };
}

type KnowledgeDraftStatus = 'draft' | 'published';

interface KnowledgeArticleDraft {
  draft_id: UUID;
  agent_id: UUID;
  organization_id: UUID;
  title: string;
  content: string;
  category: string;
  suggested_tags?: string[];
  source_ticket_ids?: string[];
  status: KnowledgeDraftStatus;
  created_at?: string;
  published_article_id?: UUID;
}

interface ChatInteractionInput {
  ticketId: string;
  agentId: string;
  customerId?: string;
  message: string;
  isPrivate?: boolean;
  metadata?: Record<string, any>;
}

interface ChatInteractionResponse {
  content: string;
  metadata: {
    is_automated?: boolean;
    requires_followup?: boolean;
  };
}

// Update TicketUpdateInput to use TicketStatus
interface TicketUpdateInput {
  ticket_id: string;
  status?: TicketStatus;
  priority?: string;
  customer_priority?: string;
  category?: string;
  assigned_to?: string;
  response?: string;
  response_quality?: Record<string, any>;
  metadata?: Record<string, any>;
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

  private shouldSample(): boolean {
    return Math.random() < this.filters.samplingRate;
  }

  private sanitizeMetadata(trace: TracingMetadata): any {
    const metadata = { ...trace };
    this.filters.excludeFields.forEach(field => {
      delete metadata[field as keyof typeof metadata];
    });
    return metadata;
  }

  public createContext(parentContext?: TracingContext): TracingContext {
    return {
      parentTraceId: parentContext?.rootTraceId,
      rootTraceId: parentContext?.rootTraceId || crypto.randomUUID(),
      depth: (parentContext?.depth || 0) + 1,
      startTime: Date.now()
    };
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
          total_processed: run.outputs?.processed || 0
        },
        data: {
          total: run.inputs?.total || 0,
          processed: run.outputs?.processed || 0
        }
      }
    };

    await this.addTrace(trace);
  }

  public async addTrace(trace: TracingMetadata): Promise<void> {
    if (!this.langfuse || !this.shouldSample()) return;
    
    this.traceQueue.push(trace);
    if (this.traceQueue.length >= this.QUEUE_SIZE_LIMIT) {
      await this.flushTraces();
    }
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
}

abstract class BaseAgentTool extends Tool {
  protected supabase: SupabaseClient;
  protected langsmith: LangSmithClient;
  protected metricsService: AccuracyMetricsService;
  protected agentId?: string;

  constructor({ supabase, langsmith }: ToolProps) {
    super();
    if (!langsmith) {
      throw new Error('LangSmith client is required');
    }
    this.supabase = supabase;
    this.langsmith = langsmith;
    this.metricsService = new AccuracyMetricsService(supabase, langsmith);
  }

  protected async recordMetrics(metrics: AgentToolMetrics) {
    try {
      await this.metricsService.recordMetrics({
        toolName: metrics.toolName,
        success: metrics.success,
        latencyMs: metrics.latencyMs,
        confidence: metrics.confidence,
        errorType: metrics.errorType,
        errorMessage: metrics.errorMessage,
        organizationId: metrics.organizationId,
        metadata: metrics.metadata
      });
    } catch (error) {
      console.error('Failed to record metrics:', error);
    }
  }

  // Temporarily disable tracing until we resolve type issues
  protected async startTrace(metadata: TracingMetadata) {
    // TODO: Re-implement tracing with correct types
    console.debug('Tool execution started:', {
      tool: this.name,
      action: metadata.actionType,
      organizationId: metadata.organizationId
    });
    return null;
  }

  protected async endTrace(tracer: LangChainTracer | null, metadata: TracingMetadata) {
    // TODO: Re-implement tracing with correct types
    console.debug('Tool execution completed:', {
      tool: this.name,
      action: metadata.actionType,
      organizationId: metadata.organizationId
    });
  }
}

export class ChatInteractionTool extends BaseAgentTool {
  name = 'create_chat_interaction';
  description = 'Create a chat interaction for a ticket. Input should be a JSON string with ticketId, agentId, message, and optional metadata.';

  async _call(input: any): Promise<string> {
    const startTime = Date.now();
    let tracer = null;
    
    try {
      // Debug log the raw input
      console.debug('ChatInteractionTool received input:', input);
      console.debug('Input type:', typeof input);

      // Handle input parsing
      let parsedInput: ChatInteractionInput;
      if (typeof input === 'string') {
        try {
          parsedInput = JSON.parse(input);
        } catch (e) {
          console.error('Failed to parse string input:', e);
          throw new Error('Invalid input format: Input must be a valid JSON string');
        }
      } else if (typeof input === 'object' && input !== null) {
        parsedInput = input;
      } else {
        throw new Error('Invalid input: Input must be a string or object');
      }

      // Ensure agentId is included from the tool's context if not in input
      if (!parsedInput.agentId && this.agentId) {
        parsedInput.agentId = this.agentId;
      }

      console.debug('Final parsedInput:', parsedInput);

      // Validate required fields
      const { ticketId, agentId, message, customerId, isPrivate } = parsedInput;
      console.debug('Extracted fields:', { ticketId, agentId, message, customerId, isPrivate });

      if (!ticketId || !agentId || !message) {
        console.error('Missing required fields:', { ticketId: !!ticketId, agentId: !!agentId, message: !!message });
        throw new Error('Missing required fields: ticketId, agentId, and message are required');
      }

      // Get organization ID from agent data
      const { data: agentData, error: agentError } = await this.supabase
        .from('agents')
        .select('organization_id')
        .eq('agent_id', agentId)
        .single();

      if (agentError) {
        console.error('Failed to get agent data:', agentError);
        throw agentError;
      }

      if (!agentData?.organization_id) {
        throw new Error('Organization ID not found for agent');
      }

      // Create the interaction
      const { data: interaction, error } = await this.supabase
        .from('interactions')
        .insert({
          ticket_id: ticketId,
          agent_id: agentId,
          customer_id: customerId,
          content: message,
          interaction_type: 'Chat',
          is_private: isPrivate ?? false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.debug('Interaction created successfully:', interaction);

      const response: ChatInteractionResponse = {
        content: message,
        metadata: {
          is_automated: true,
          requires_followup: false
        }
      };

      await this.recordMetrics({
        toolName: this.name,
        success: true,
        latencyMs: Date.now() - startTime,
        confidence: 1.0,
        organizationId: agentData.organization_id,
        metadata: {
          ticket_id: ticketId,
          agent_id: agentId,
          input_data: parsedInput,
          response_length: message.length
        }
      });

      console.debug('Returning response:', response);
      return JSON.stringify(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('ChatInteractionTool error:', errorMessage);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Get organization ID for error metrics if possible
      let organizationId: UUID | undefined;
      if (typeof input === 'object' && input?.agentId) {
        try {
          const { data: agentData } = await this.supabase
            .from('agents')
            .select('organization_id')
            .eq('agent_id', input.agentId)
            .single();
          organizationId = agentData?.organization_id;
        } catch (e) {
          console.error('Failed to get organization ID for error metrics:', e);
        }
      }

      if (organizationId) {
        await this.recordMetrics({
          toolName: this.name,
          success: false,
          latencyMs: Date.now() - startTime,
          confidence: 0,
          errorType: error instanceof Error ? error.name : 'UnknownError',
          errorMessage,
          organizationId,
          metadata: { 
            error_context: errorMessage,
            agent_id: input?.agentId
          }
        });
      }

      throw new Error(`Failed to create chat interaction: ${errorMessage}`);
    } finally {
      if (tracer) {
        const orgId = typeof input === 'object' && input?.metadata?.organizationId ? 
          input.metadata.organizationId as UUID : 
          'unknown';
          
        await this.endTrace(tracer, {
          toolName: this.name,
          actionType: 'mutation',
          startTime,
          organizationId: orgId
        });
      }
    }
  }
}

export class CustomerFetchTool extends BaseAgentTool {
  name = 'fetch_agent_customers';
  description = 'Fetch customers for an agent with optional filters. Input should be a JSON string with agentId and optional filters.';

  async _call(input: string): Promise<string> {
    const startTime = Date.now();
    let tracer = null;

    try {
      const { agentId, filters, organizationId } = JSON.parse(input);

      tracer = await this.startTrace({
        toolName: this.name,
        actionType: 'query',
        startTime,
        organizationId: organizationId as UUID,
        metadata: { data: { agent_id: agentId } }
      });

      let query = this.supabase
        .from('customers')
        .select(`
          customer_id,
          name,
          email,
          organization_id,
          metadata,
          tickets:tickets(count),
          metrics:customer_metrics(
            total_tickets,
            open_tickets,
            avg_response_time,
            satisfaction_score
          )
        `)
        .eq('organization_id', organizationId);

      if (filters?.email) {
        query = query.ilike('email', `%${filters.email}%`);
      }
      if (filters?.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }

      const { data: customers, error, count } = await query.limit(10);

      if (error) throw error;

      const response = {
        total: count || customers?.length || 0,
        customers: customers?.map(customer => ({
          ...customer,
          metrics: {
            total_tickets: customer.metrics?.[0]?.total_tickets || 0,
            open_tickets: customer.metrics?.[0]?.open_tickets || 0,
            avg_response_time: customer.metrics?.[0]?.avg_response_time || 0,
            satisfaction: customer.metrics?.[0]?.satisfaction_score || 0
          }
        }))
      };

      await this.recordMetrics({
        toolName: this.name,
        success: true,
        latencyMs: Date.now() - startTime,
        confidence: 1.0,
        organizationId: organizationId as UUID,
        metadata: {
          agent_id: agentId,
          customer_count: response.total,
          parsed_query: filters
        }
      });

      return JSON.stringify(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('CustomerFetchTool error:', errorMessage);
      
      await this.recordMetrics({
        toolName: this.name,
        success: false,
        latencyMs: Date.now() - startTime,
        confidence: 0,
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage,
        organizationId: JSON.parse(input).organizationId as UUID,
        metadata: { error_context: errorMessage }
      });

      throw new Error(`Failed to fetch customers: ${errorMessage}`);
    } finally {
      if (tracer) {
        await this.endTrace(tracer, {
          toolName: this.name,
          actionType: 'query',
          startTime,
          organizationId: JSON.parse(input).organizationId as UUID
        });
      }
    }
  }
}

export class KnowledgeArticleTool extends BaseAgentTool {
  name = 'create_knowledge_article';
  description = 'Create a knowledge article from ticket context. Input should be a JSON string with title, content, category, and metadata.';

  async _call(input: any): Promise<string> {
    const startTime = Date.now();
    let tracer = null;
    let agentData = null;

    try {
      // Debug log the raw input
      console.debug('KnowledgeArticleTool received input:', input);
      console.debug('Input type:', typeof input);

      // Handle input parsing
      let parsedInput;
      if (typeof input === 'string') {
        try {
          parsedInput = JSON.parse(input);
        } catch (e) {
          console.error('Failed to parse string input:', e);
          throw new Error('Invalid input format: Input must be a valid JSON string');
        }
      } else if (typeof input === 'object' && input !== null) {
        parsedInput = input;
      } else {
        throw new Error('Invalid input: Input must be a string or object');
      }

      console.debug('Final parsedInput:', parsedInput);

      // Validate required fields
      const { title, content, category } = parsedInput;
      console.debug('Extracted fields:', { title, content, category });

      if (!title || !content || !category) {
        console.error('Missing required fields:', { title: !!title, content: !!content, category: !!category });
        throw new Error('Missing required fields: title, content, and category are required');
      }

      // Get current user and organization context
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      if (userError) {
        console.error('Failed to get user:', userError);
        throw userError;
      }
      
      console.debug('Got user:', user?.email);

      const { data: agentResult, error: agentError } = await this.supabase
        .from('agents')
        .select('agent_id, organization_id')
        .eq('email', user?.email)
        .single();

      if (agentError) {
        console.error('Failed to get agent:', agentError);
        throw agentError;
      }
      if (!agentResult?.agent_id) {
        console.error('Agent ID not found for user:', user?.email);
        throw new Error('Agent ID not found');
      }

      console.debug('Got agent data:', agentResult);

      agentData = agentResult;
      const organizationId = agentData.organization_id;

      // Check for existing article with same title
      const { data: existingArticle, error: existingError } = await this.supabase
        .from('knowledge_articles')
        .select('article_id')
        .eq('organization_id', organizationId)
        .eq('title', title)
        .single();

      if (existingArticle) {
        console.debug('Article with this title already exists:', existingArticle);
        return JSON.stringify({
          article_id: existingArticle.article_id,
          title,
          category,
          status: 'existing'
        });
      }

      // Create article directly in knowledge_articles table
      console.debug('Creating article with data:', {
        organization_id: organizationId,
        title,
        category,
        content_length: content.length,
        metadata: parsedInput.metadata
      });

      const { data: article, error: articleError } = await this.supabase
        .from('knowledge_articles')
        .insert({
          organization_id: organizationId,
          title,
          content,
          category,
          tags: parsedInput.tags,
          is_published: true,
          created_by: agentResult.agent_id,
          updated_by: agentResult.agent_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (articleError) {
        console.error('Failed to create article:', articleError);
        throw articleError;
      }

      console.debug('Article created successfully:', article);

      const response = {
        article_id: article.article_id,
        title,
        category
      };

      await this.recordMetrics({
        toolName: this.name,
        success: true,
        latencyMs: Date.now() - startTime,
        confidence: 1.0,
        organizationId,
        metadata: {
          agent_id: agentResult.agent_id,
          article_id: article.article_id,
          category
        }
      });

      console.debug('Returning response:', response);
      return JSON.stringify(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('KnowledgeArticleTool error:', errorMessage);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      if (agentData?.organization_id) {
        await this.recordMetrics({
          toolName: this.name,
          success: false,
          latencyMs: Date.now() - startTime,
          confidence: 0,
          errorType: error instanceof Error ? error.name : 'UnknownError',
          errorMessage,
          organizationId: agentData.organization_id,
          metadata: { error_context: errorMessage }
        });
      }

      throw new Error(`Failed to create knowledge article: ${errorMessage}`);
    } finally {
      if (tracer && agentData?.organization_id) {
        await this.endTrace(tracer, {
          toolName: this.name,
          actionType: 'mutation',
          startTime,
          organizationId: agentData.organization_id
        });
      }
    }
  }
}

export class AgentTicketsTool extends BaseAgentTool {
  name = 'fetch_agent_tickets';
  description = 'Fetch tickets assigned to an agent with optional filters. Input should be a JSON string with agentId and optional filters for status, priority, and timeframe.';

  async _call(input: any): Promise<string> {
    const startTime = Date.now();
    let agentData = null;

    try {
      // Parse and validate input
      let parsedInput: TicketQuery;
      if (typeof input === 'string') {
        try {
          parsedInput = JSON.parse(input);
        } catch (e) {
          throw new Error('Invalid input format: Input must be a valid JSON string');
        }
      } else if (typeof input === 'object' && input !== null) {
        parsedInput = input;
      } else {
        throw new Error('Invalid input: Input must be a string or object');
      }

      // Ensure agentId is included from the tool's context if not in input
      if (!parsedInput.agentId && this.agentId) {
        parsedInput.agentId = this.agentId;
      }

      if (!parsedInput.agentId) {
        throw new Error('Missing required field: agentId');
      }

      // Get organization ID from agent data
      const { data: agentResult, error: agentError } = await this.supabase
        .from('agents')
        .select('organization_id')
        .eq('agent_id', parsedInput.agentId)
        .single();

      if (agentError) {
        console.error('Failed to get agent data:', agentError);
        throw agentError;
      }

      if (!agentResult?.organization_id) {
        throw new Error('Organization ID not found for agent');
      }

      agentData = agentResult;

      // Build the query
      let query = this.supabase
        .from('tickets')
        .select(`
          ticket_id,
          title,
          description,
          status,
          priority,
          created_at,
          updated_at,
          assigned_to,
          customers!customer_id (
            customer_id,
            name,
            email
          ),
          history:ticket_history (
            type,
            created_at,
            data
          )
        `)
        .eq('assigned_to', parsedInput.agentId)
        .order('created_at', { ascending: false });

      if (parsedInput.status?.length) {
        query = query.in('status', parsedInput.status);
      }
      if (parsedInput.priority?.length) {
        query = query.in('priority', parsedInput.priority);
      }
      if (parsedInput.timeframe) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(parsedInput.timeframe));
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: tickets, error: ticketsError, count } = await query.limit(parsedInput.limit || 10);

      if (ticketsError) {
        console.error('Failed to fetch tickets:', ticketsError);
        throw ticketsError;
      }

      // Enrich tickets with metrics
      const enrichedTickets: EnrichedTicket[] = tickets?.map(ticket => {
        const history = (ticket.history || []).map(h => ({
          ticket_id: ticket.ticket_id,
          type: h.type,
          created_at: h.created_at,
          data: h.data
        }));
        const created = new Date(ticket.created_at);
        const now = new Date();
        const ageHours = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60));

        const customerData: TicketCustomer = {
          customer_id: ticket.customers?.[0]?.customer_id || '',
          name: ticket.customers?.[0]?.name || '',
          email: ticket.customers?.[0]?.email || ''
        };

        return {
          ticket_id: ticket.ticket_id,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          history,
          customer: customerData,
          metrics: {
            response_time: history.length > 0 ? 
              (new Date(history[0].created_at).getTime() - created.getTime()) / (1000 * 60) : 
              null,
            update_count: history.length,
            age_hours: ageHours
          }
        };
      }) || [];

      const response = {
        total: count || enrichedTickets?.length || 0,
        tickets: enrichedTickets
      };

      // Record success metrics
      await this.recordMetrics({
        toolName: this.name,
        success: true,
        latencyMs: Date.now() - startTime,
        confidence: 1.0,
        organizationId: agentResult.organization_id,
        metadata: {
          agent_id: parsedInput.agentId,
          total_tickets: response.total,
          parsed_query: { 
            status: parsedInput.status, 
            priority: parsedInput.priority, 
            timeframe: parsedInput.timeframe 
          }
        }
      });

      return JSON.stringify(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('AgentTicketsTool error:', errorMessage);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      // Record error metrics if we have organization ID
      if (agentData?.organization_id) {
        await this.recordMetrics({
          toolName: this.name,
          success: false,
          latencyMs: Date.now() - startTime,
          confidence: 0,
          errorType: error instanceof Error ? error.name : 'UnknownError',
          errorMessage,
          organizationId: agentData.organization_id,
          metadata: { 
            error_context: errorMessage,
            agent_id: typeof input === 'object' ? input?.agentId : undefined
          }
        });
      }

      throw new Error(`Failed to fetch tickets: ${errorMessage}`);
    }
  }
}

export class TicketUpdateTool extends BaseAgentTool {
  name = 'update_ticket';
  description = 'Update a ticket\'s status and other fields. Input should be a JSON string with ticketId and the fields to update. Valid status values are: New, Assigned, In Progress, Resolved, Closed';

  private validateStatus(status: string): TicketStatus {
    const validStatuses: TicketStatus[] = ['New', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status as TicketStatus)) {
      throw new Error(`Invalid status value. Must be one of: ${validStatuses.join(', ')}`);
    }
    return status as TicketStatus;
  }

  async _call(input: any): Promise<string> {
    const startTime = Date.now();
    let agentData = null;

    try {
      // Parse and validate input
      let parsedInput: TicketUpdateInput;
      if (typeof input === 'string') {
        try {
          parsedInput = JSON.parse(input);
        } catch (e) {
          throw new Error('Invalid input format: Input must be a valid JSON string');
        }
      } else if (typeof input === 'object' && input !== null) {
        parsedInput = input;
      } else {
        throw new Error('Invalid input: Input must be a string or object');
      }

      // Validate required fields
      if (!parsedInput.ticket_id) {
        throw new Error('Missing required field: ticket_id');
      }

      // Validate status if provided
      if (parsedInput.status !== undefined) {
        parsedInput.status = this.validateStatus(parsedInput.status);
      }

      // Get organization ID and validate ticket ownership
      const { data: ticketData, error: ticketError } = await this.supabase
        .from('tickets')
        .select('organization_id, assigned_to, status')
        .eq('ticket_id', parsedInput.ticket_id)
        .single();

      if (ticketError) {
        console.error('Failed to fetch ticket:', ticketError);
        throw ticketError;
      }

      if (!ticketData) {
        throw new Error('Ticket not found');
      }

      agentData = {
        organization_id: ticketData.organization_id
      };

      // Build update object with only provided fields and valid columns
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only include fields that exist in the database schema
      if (parsedInput.status !== undefined) updateData.status = parsedInput.status;
      if (parsedInput.priority !== undefined) updateData.priority = parsedInput.priority;
      if (parsedInput.customer_priority !== undefined) updateData.customer_priority = parsedInput.customer_priority;
      if (parsedInput.category !== undefined) updateData.category = parsedInput.category;
      if (parsedInput.assigned_to !== undefined) updateData.assigned_to = parsedInput.assigned_to;
      if (parsedInput.response !== undefined) updateData.response = parsedInput.response;
      if (parsedInput.response_quality !== undefined) updateData.response_quality = parsedInput.response_quality;

      // Update the ticket
      const { data: updatedTicket, error: updateError } = await this.supabase
        .from('tickets')
        .update(updateData)
        .eq('ticket_id', parsedInput.ticket_id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update ticket:', updateError);
        throw updateError;
      }

      // Record success metrics
      await this.recordMetrics({
        toolName: this.name,
        success: true,
        latencyMs: Date.now() - startTime,
        confidence: 1.0,
        organizationId: ticketData.organization_id,
        metadata: {
          ticket_id: parsedInput.ticket_id,
          agent_id: ticketData.assigned_to,
          input_data: {
            fields_updated: Object.keys(updateData).filter(k => k !== 'updated_at'),
            previous_status: ticketData.status,
            new_status: parsedInput.status
          }
        }
      });

      return JSON.stringify({
        ticket_id: updatedTicket.ticket_id,
        status: updatedTicket.status,
        updated_at: updatedTicket.updated_at,
        changes: Object.keys(updateData).filter(k => k !== 'updated_at')
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('TicketUpdateTool error:', errorMessage);
      
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }

      // Record error metrics if we have organization ID
      if (agentData?.organization_id) {
        await this.recordMetrics({
          toolName: this.name,
          success: false,
          latencyMs: Date.now() - startTime,
          confidence: 0,
          errorType: error instanceof Error ? error.name : 'UnknownError',
          errorMessage,
          organizationId: agentData.organization_id,
          metadata: {
            error_context: errorMessage,
            ticket_id: typeof input === 'object' ? input?.ticket_id : undefined
          }
        });
      }

      throw new Error(`Failed to update ticket: ${errorMessage}`);
    }
  }
} 