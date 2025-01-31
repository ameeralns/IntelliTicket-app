import { AIInput } from '@/types/ai';

class AgentTicketsTool {
  private parseInput(input: string | any) {
    let parsedInput: any;
    
    if (typeof input === 'string') {
      try {
        parsedInput = JSON.parse(input);
      } catch {
        throw new Error('Invalid input format');
      }
    } else {
      parsedInput = input;
    }

    // Extract agentId from input context if available
    if (parsedInput.context?.agentContext?.agentId) {
      parsedInput.agentId = parsedInput.context.agentContext.agentId;
    }

    // Validate required fields
    if (!parsedInput.agentId) {
      throw new Error('Invalid input format: Missing required parameter: agentId');
    }

    return {
      agentId: parsedInput.agentId,
      status: parsedInput.status || ['new', 'open'],
      priority: parsedInput.priority || ['high', 'medium', 'low'],
      limit: parsedInput.limit || 50
    };
  }

  async _call(input: string | AIInput) {
    try {
      const params = this.parseInput(input);
      return await this.fetchTickets(params);
    } catch (error: unknown) {
      console.error('Error in AgentTicketsTool:', { error, input });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch tickets: ${errorMessage}`);
    }
  }

  private async fetchTickets(params: any) {
    // Implementation of ticket fetching
    // This would interact with your database or API
    return {
      tickets: [],
      total: 0
    };
  }
}

export default AgentTicketsTool; 