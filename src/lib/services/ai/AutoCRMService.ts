import { OpenAI } from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { Langfuse } from 'langfuse';
import { Tool } from '@langchain/core/tools';
import { 
  TeamQueryTool, 
  CustomerAnalysisTool, 
  AgentPerformanceTool, 
  WorkloadOptimizationTool,
  BulkTicketManagementTool,
  TeamManagementTool,
  KnowledgeBaseTool,
  AutomationRulesTool,
  SLAManagementTool
} from './AdminIntelligenceTools';

interface AutoCRMConfig {
  organizationId: string;
  supabase: SupabaseClient;
  langfuse: Langfuse | null;
  openAIApiKey: string;
}

interface Intent {
  type: 'TICKET_ASSIGNMENT' | 'TICKET_UPDATE' | 'WORKLOAD_QUERY' | 'PERFORMANCE_QUERY' | 
        'CUSTOMER_QUERY' | 'KNOWLEDGE_BASE' | 'TEAM_MANAGEMENT' | 'SLA_MANAGEMENT';
  subType?: string;
  entities: Array<{
    type: 'ticket' | 'agent' | 'team' | 'customer';
    id: string;
    value: string;
  }>;
  confidence: number;
}

interface ToolExecutionResult {
  tools: string[];
  results: Array<{
    success: boolean;
    message?: string;
    data?: any;
  }>;
}

export class AutoCRMService {
  private openai: OpenAI;
  private tools: Tool[];
  private supabase: SupabaseClient;
  private langfuse: Langfuse | null;
  private organizationId: string;

  constructor(config: AutoCRMConfig) {
    this.openai = new OpenAI({
      apiKey: config.openAIApiKey
    });

    this.supabase = config.supabase;
    this.langfuse = config.langfuse;
    this.organizationId = config.organizationId;

    // Initialize all tools with Langfuse tracing
    this.tools = [
      new TeamQueryTool({ supabase: this.supabase, langfuse: this.langfuse }),
      new CustomerAnalysisTool({ supabase: this.supabase, langfuse: this.langfuse }),
      new AgentPerformanceTool({ supabase: this.supabase, langfuse: this.langfuse }),
      new WorkloadOptimizationTool({ supabase: this.supabase, langfuse: this.langfuse }),
      new BulkTicketManagementTool({ supabase: this.supabase, langfuse: this.langfuse }),
      new TeamManagementTool({ supabase: this.supabase, langfuse: this.langfuse }),
      new KnowledgeBaseTool({ supabase: this.supabase, langfuse: this.langfuse }),
      new AutomationRulesTool({ supabase: this.supabase, langfuse: this.langfuse }),
      new SLAManagementTool({ supabase: this.supabase, langfuse: this.langfuse })
    ];
  }

  async processUserQuery(query: string): Promise<{ response: string; traceId?: string }> {
    const trace = this.langfuse?.trace({
      name: 'user-query-processing',
      input: { query }
    });

    try {
      // Create a span for intent classification
      const intentSpan = trace?.span({ name: 'intent-classification' });
      
      // Classify the intent of the query
      const intent = await this.classifyIntent(query);
      
      intentSpan?.update({
        metadata: { 
          classified_intent: intent,
          confidence: intent.confidence
        }
      });

      // Create a span for tool selection and execution
      const toolSpan = trace?.span({ name: 'tool-execution' });
      
      // Select and execute appropriate tool based on intent
      const result = await this.executeToolChain(intent, query);
      
      toolSpan?.update({
        metadata: { 
          selected_tools: result.tools,
          execution_results: result.results
        }
      });

      // Format the response
      const response = this.formatResponse(result);

      trace?.update({
        output: { 
          success: true,
          response,
          execution_path: {
            intent,
            tools: result.tools,
            results: result.results
          }
        }
      });

      return {
        response,
        traceId: trace?.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      trace?.update({
        output: {
          success: false,
          error: errorMessage
        }
      });

      throw error;
    }
  }

  private async classifyIntent(query: string): Promise<Intent> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier for a customer service system. Classify the following query into one of these categories:
          - TICKET_ASSIGNMENT
          - TICKET_UPDATE
          - WORKLOAD_QUERY
          - PERFORMANCE_QUERY
          - CUSTOMER_QUERY
          - KNOWLEDGE_BASE
          - TEAM_MANAGEMENT
          - SLA_MANAGEMENT
          
          Also extract any relevant entities (tickets, agents, teams, customers).
          
          Respond in JSON format with type, subType (if applicable), entities (with type, id, and value), and confidence score.`
        },
        {
          role: 'user',
          content: query
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('Failed to classify intent');
    }

    return JSON.parse(response) as Intent;
  }

  private async executeToolChain(intent: Intent, query: string): Promise<ToolExecutionResult> {
    const tools: string[] = [];
    const results: Array<{
      success: boolean;
      message?: string;
      data?: any;
    }> = [];

    // Select tools based on intent
    switch (intent.type) {
      case 'TICKET_ASSIGNMENT': {
        const tool = this.tools.find(t => t instanceof BulkTicketManagementTool);
        if (tool) {
          tools.push('BulkTicketManagementTool');
          const ticketIds = intent.entities
            .filter(e => e.type === 'ticket')
            .map(e => e.id);
          const agentId = intent.entities.find(e => e.type === 'agent')?.id;

          if (ticketIds.length > 0 && agentId) {
            const result = await tool.call(JSON.stringify({
              action: 'assign',
              ticketIds,
              data: { agent_id: agentId }
            }));
            results.push(JSON.parse(result));
          }
        }
        break;
      }

      case 'WORKLOAD_QUERY': {
        const tool = this.tools.find(t => t instanceof WorkloadOptimizationTool);
        if (tool) {
          tools.push('WorkloadOptimizationTool');
          const teamId = intent.entities.find(e => e.type === 'team')?.id;

          if (teamId) {
            const result = await tool.call(JSON.stringify({
              teamId,
              optimizationType: 'current_workload'
            }));
            results.push(JSON.parse(result));
          }
        }
        break;
      }

      // Add more cases for other intents
      case 'PERFORMANCE_QUERY': {
        const tool = this.tools.find(t => t instanceof AgentPerformanceTool);
        if (tool) {
          tools.push('AgentPerformanceTool');
          const agentId = intent.entities.find(e => e.type === 'agent')?.id;

          if (agentId) {
            const result = await tool.call(JSON.stringify({
              agentId,
              metricType: 'all'
            }));
            results.push(JSON.parse(result));
          }
        }
        break;
      }

      case 'CUSTOMER_QUERY': {
        const tool = this.tools.find(t => t instanceof CustomerAnalysisTool);
        if (tool) {
          tools.push('CustomerAnalysisTool');
          const customerId = intent.entities.find(e => e.type === 'customer')?.id;

          if (customerId) {
            const result = await tool.call(JSON.stringify({
              customerId,
              analysisType: 'full'
            }));
            results.push(JSON.parse(result));
          }
        }
        break;
      }
    }

    return { tools, results };
  }

  private formatResponse(result: ToolExecutionResult): string {
    if (result.results.length === 0) {
      return "I apologize, but I couldn't process your request. Please try rephrasing or provide more specific information.";
    }

    // Format the results into a natural language response
    let response = '';

    result.results.forEach(r => {
      if (r.success && r.message) {
        response += r.message + '\n';
      }
    });

    return response.trim() || "I've processed your request, but I'm not sure how to present the results. Please check the system for updates.";
  }
} 