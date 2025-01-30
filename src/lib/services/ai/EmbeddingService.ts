import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseClient } from '@supabase/supabase-js';

export class EmbeddingService {
  private embeddings: OpenAIEmbeddings;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002',
      batchSize: 512, // Process 512 texts at a time
      stripNewLines: true,
    });
  }

  private generateCustomerText(customer: any): string {
    return `Customer Name: ${customer.name}
Email: ${customer.email}
Phone: ${customer.phone || 'N/A'}
Created: ${new Date(customer.created_at).toLocaleDateString()}
${customer.metadata ? `Additional Info: ${JSON.stringify(customer.metadata)}` : ''}`;
  }

  private generateAgentText(agent: any): string {
    return `Agent Name: ${agent.name}
Email: ${agent.email}
Role: ${agent.role}
Team: ${agent.team_id || 'N/A'}
Skills: ${agent.skills ? agent.skills.join(', ') : 'N/A'}
Created: ${new Date(agent.created_at).toLocaleDateString()}`;
  }

  async updateCustomerEmbedding(customerId: string): Promise<void> {
    // Get customer details
    const { data: customer, error: customerError } = await this.supabase
      .from('customers')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (customerError || !customer) {
      throw new Error(`Failed to fetch customer: ${customerError?.message}`);
    }

    // Generate text representation
    const text = this.generateCustomerText(customer);

    // Generate embedding
    const [embedding] = await this.embeddings.embedDocuments([text]);

    // Update or insert embedding
    const { error: upsertError } = await this.supabase
      .from('customer_embeddings')
      .upsert({
        customer_id: customerId,
        organization_id: customer.organization_id,
        embedding,
        metadata: {
          last_text: text,
          customer_name: customer.name,
          customer_email: customer.email
        },
        last_updated: new Date().toISOString()
      });

    if (upsertError) {
      throw new Error(`Failed to update customer embedding: ${upsertError.message}`);
    }
  }

  async updateAgentEmbedding(agentId: string): Promise<void> {
    // Get agent details
    const { data: agent, error: agentError } = await this.supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error(`Failed to fetch agent: ${agentError?.message}`);
    }

    // Generate text representation
    const text = this.generateAgentText(agent);

    // Generate embedding
    const [embedding] = await this.embeddings.embedDocuments([text]);

    // Update or insert embedding
    const { error: upsertError } = await this.supabase
      .from('agent_embeddings')
      .upsert({
        agent_id: agentId,
        organization_id: agent.organization_id,
        embedding,
        metadata: {
          last_text: text,
          agent_name: agent.name,
          agent_email: agent.email,
          agent_role: agent.role
        },
        last_updated: new Date().toISOString()
      });

    if (upsertError) {
      throw new Error(`Failed to update agent embedding: ${upsertError.message}`);
    }
  }

  async searchCustomers(query: string): Promise<any[]> {
    // Generate embedding for the query
    const [queryEmbedding] = await this.embeddings.embedDocuments([query]);

    // Search using the database function
    const { data, error } = await this.supabase
      .rpc('search_customers', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 10
      });

    if (error) {
      throw new Error(`Failed to search customers: ${error.message}`);
    }

    return data || [];
  }

  async searchAgents(query: string): Promise<any[]> {
    // Generate embedding for the query
    const [queryEmbedding] = await this.embeddings.embedDocuments([query]);

    // Search using the database function
    const { data, error } = await this.supabase
      .rpc('search_agents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 10
      });

    if (error) {
      throw new Error(`Failed to search agents: ${error.message}`);
    }

    return data || [];
  }

  // Function to update all embeddings for an organization
  async updateAllEmbeddings(organizationId: string): Promise<void> {
    // Update customer embeddings
    const { data: customers, error: customerError } = await this.supabase
      .from('customers')
      .select('customer_id')
      .eq('organization_id', organizationId);

    if (customerError) {
      throw new Error(`Failed to fetch customers: ${customerError.message}`);
    }

    for (const customer of customers || []) {
      await this.updateCustomerEmbedding(customer.customer_id);
    }

    // Update agent embeddings
    const { data: agents, error: agentError } = await this.supabase
      .from('agents')
      .select('agent_id')
      .eq('organization_id', organizationId);

    if (agentError) {
      throw new Error(`Failed to fetch agents: ${agentError.message}`);
    }

    for (const agent of agents || []) {
      await this.updateAgentEmbedding(agent.agent_id);
    }
  }
} 