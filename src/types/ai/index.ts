export interface TicketMetadata {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  description: string;
  created_at: string;
  updated_at: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    customer_id: string;
  };
}

export interface EntityReference {
  id: string;
  type: string;
  label: string;
  metadata: TicketMetadata;
}

export interface AIContext {
  previousMessages: any[];
  currentTimestamp: string;
  agentContext: {
    agentId: string;
  };
}

export interface AIInput {
  input: string;
  entityReferences: EntityReference[];
  agentId: string;
  context: AIContext;
  chat_history: any[];
}

export interface ChatInteractionResponse {
  content: string;
  metadata: {
    is_automated: boolean;
    requires_followup: boolean;
    ticket_context: {
      title: string;
      priority: string;
      customer_id: string;
    };
  };
} 