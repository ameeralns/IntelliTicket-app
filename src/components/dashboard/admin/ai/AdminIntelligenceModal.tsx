import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RiSendPlaneFill, RiRobot2Line, RiUser3Line, RiTicketLine, RiTeamLine, RiBrainLine, RiPulseLine, RiLightbulbFlashLine } from 'react-icons/ri';
import { AILoadingIndicator } from './AILoadingIndicator';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, initializeAgentExecutorWithOptions } from 'langchain/agents';
import { Tool } from '@langchain/core/tools';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Badge } from '@/components/ui/badge';
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { UUID } from 'crypto';
import { OrganizationStructureTool, TicketAssignmentTool } from '@/lib/services/ai/AdminIntelligenceTools';
import { ConsoleCallbackHandler } from '@langchain/core/tracers/console';
import { LangChainTracer } from 'langchain/callbacks';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Client } from 'langsmith';

// Types
interface Ticket {
  ticket_id: UUID;
  title: string;
  status: string;
  priority: string;
  agent_id?: UUID;
  organization_id: UUID;
  created_at: Date;
  assigned_at?: Date;
  updated_at: Date;
}

interface OrgCustomer {
  name: string;
  email: string;
  customer_id: string;
  total_tickets?: number;
}

interface Agent {
  agent_id: UUID;
  name: string;
  email: string;
  role: string;
  team_name: string;
  ticket_count: number;
  organization_id: UUID;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    thought?: string;
    action?: string;
    observation?: string;
    trace_id?: string;
    execution_time?: number;
    entityReferences?: EntityReference[];
    originalInput?: string;
    mentions?: Array<{
      id: string;
      type: keyof typeof TYPE_COLORS;
      label: string;
      index: number;
      length: number;
    }>;
    showThought?: boolean;
  };
}

interface SelectedEntity {
  id: string;
  type: 'ticket' | 'customer' | 'agent';
  label: string;
  metadata?: Record<string, any>;
}

interface AdminIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: UUID;
}

interface MentionState {
  isOpen: boolean;
  type: 'category' | 'item';
  trigger: string;
  search: string;
  items: Array<{
    id: string;
    label: string;
    type?: 'ticket' | 'customer' | 'agent';
    metadata?: Record<string, any>;
  }>;
  position: { top: number; left: number } | null;
  selectedCategory?: 'ticket' | 'customer' | 'agent';
}

// Add color constants at the top with other interfaces
const TYPE_COLORS = {
  ticket: 'text-blue-500',
  agent: 'text-green-500',
  customer: 'text-purple-500'
} as const;

// Update the SYSTEM_PROMPT constant
const SYSTEM_PROMPT = `You are an AI assistant helping manage a customer support system.
You have access to information about tickets, teams, and customers.

Your goal is to help users manage tickets and team workload efficiently.
You can:
1. View and analyze ticket data
2. Suggest ticket assignments
3. Provide workload insights
4. Answer questions about team performance

When responding:
- Be concise but informative
- Prioritize urgent tickets
- Consider agent workload and expertise
- Provide clear actionable recommendations

Current context:
Organization ID: {organizationId}
Previous Messages: {previousMessages}

How can I assist you today?`;

// Add this interface for entity references
interface EntityReference {
  id: string;
  type: 'ticket' | 'customer' | 'agent';
  value: string;
  metadata?: {
    name?: string;
    email?: string;
    status?: string;
    priority?: string;
    team?: string;
    role?: string;
    index?: number;
    length?: number;
  };
}

// Add this interface for text blocks
interface TextBlock {
  type: 'text' | 'mention';
  content: string;
  entityId?: string;
  entityType?: 'ticket' | 'customer' | 'agent';
  entityLabel?: string;
}

// Update the InputArea component
const InputArea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  mentions: Array<{ 
    id: string; 
    type: keyof typeof TYPE_COLORS; 
    label: string; 
    index: number; 
    length: number; 
  }>;
}> = ({ value, onChange, onKeyDown, disabled, mentions }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  const renderContent = () => {
    let lastIndex = 0;
    const elements = [];
    const sortedMentions = [...mentions].sort((a, b) => a.index - b.index);

    sortedMentions.forEach((mention, i) => {
      // Add text before mention
      if (mention.index > lastIndex) {
        elements.push(
          <span key={`text-${i}`} className="text-white">
            {value.slice(lastIndex, mention.index)}
          </span>
        );
      }

      // Add mention badge
      elements.push(
        <Badge
          key={`mention-${mention.id}`}
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1 bg-gradient-to-r p-[1px] rounded-full mx-1",
            {
              'from-blue-500/20 to-blue-600/20 text-blue-300': mention.type === 'ticket',
              'from-green-500/20 to-green-600/20 text-green-300': mention.type === 'agent',
              'from-purple-500/20 to-purple-600/20 text-purple-300': mention.type === 'customer'
            }
          )}
        >
          <span className="px-2 py-0.5 bg-gray-900/90 rounded-full flex items-center gap-1">
            {mention.type === 'ticket' && <RiTicketLine className="w-3 h-3" />}
            {mention.type === 'agent' && <RiTeamLine className="w-3 h-3" />}
            {mention.type === 'customer' && <RiUser3Line className="w-3 h-3" />}
            {mention.label}
          </span>
        </Badge>
      );

      lastIndex = mention.index + mention.length;
    });

    // Add remaining text
    if (lastIndex < value.length) {
      elements.push(
        <span key="text-end" className="text-white">
          {value.slice(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <motion.div 
      className="relative min-h-[40px] bg-gradient-to-r from-indigo-900/5 to-purple-900/5 rounded-xl border border-indigo-200/30 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 p-3 pointer-events-none whitespace-pre-wrap break-words">
        {renderContent()}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder="Ask me anything... (Use @ to mention)"
        className="w-full min-h-[40px] p-3 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 rounded-xl border-0 overflow-hidden text-transparent caret-white placeholder-gray-400"
        style={{ caretColor: 'white' }}
      />
    </motion.div>
  );
};

interface TicketSummary {
  total: number;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
}

interface TicketData {
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

interface AgentWithWorkload extends Agent {
  workload: {
    current: number;
    capacity: number;
  };
}

export function AdminIntelligenceModal({ isOpen, onClose }: Omit<AdminIntelligenceModalProps, 'organizationId'>) {
  const supabase = createClientComponentClient();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State hooks
  const [input, setInput] = useState('');
  const [organizationId, setOrganizationId] = useState<UUID | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you manage tickets and team workload. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<OrgCustomer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<SelectedEntity[]>([]);
  const [mention, setMention] = useState<MentionState>({
    isOpen: false,
    type: 'category',
    trigger: '',
    search: '',
    items: [],
    position: null
  });
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([{ type: 'text', content: '' }]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [mentions, setMentions] = useState<Array<{
    id: string;
    type: keyof typeof TYPE_COLORS;
    label: string;
    index: number;
    length: number;
  }>>([]);

  // Memoized values
  const langsmithClient = useMemo(() => {
    return new Client({
      apiUrl: process.env.NEXT_PUBLIC_LANGSMITH_ENDPOINT,
      apiKey: process.env.NEXT_PUBLIC_LANGSMITH_API_KEY,
    });
  }, []);

  const openaiClient = useMemo(() => {
    const tracer = new LangChainTracer({
      projectName: process.env.NEXT_PUBLIC_LANGSMITH_PROJECT || "intelliticket-admin-ai",
      client: langsmithClient,
    });

    return new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 1000,
      openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      callbacks: [
        tracer,
        new ConsoleCallbackHandler(),
        {
          handleLLMStart: async (llm: any, prompts: string[]) => {
            console.debug('LLM Started:', llm.name);
          },
          handleLLMEnd: async (output: any) => {
            console.debug('LLM Finished');
          },
          handleLLMError: async (error: Error) => {
            console.error('LLM Error:', error);
          }
        }
      ]
    });
  }, [langsmithClient]);

  const tools = useMemo(() => {
    const toolProps = { 
      supabase,
      langsmith: langsmithClient
    };
    return [
      new OrganizationStructureTool(toolProps),
      new TicketAssignmentTool(toolProps)
    ];
  }, [supabase, langsmithClient]);

  // Effects
  useEffect(() => {
    const getOrganizationId = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user?.email) throw new Error('No user email found');

        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('organization_id')
          .eq('email', user.email)
          .single();

        if (agentError) throw agentError;
        if (!agentData?.organization_id) throw new Error('No organization found');

        setOrganizationId(agentData.organization_id as UUID);
    } catch (error) {
        console.error('Error fetching organization ID:', error);
        setError('Failed to load organization data. Please try again.');
      }
    };

    getOrganizationId();
  }, [supabase]);

  useEffect(() => {
    if (!organizationId) return;

    const fetchData = async () => {
      try {
        // Fetch tickets
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select(`
              ticket_id,
              title,
              status,
              priority,
            assigned_to,
            organization_id,
            created_at,
            assigned_at,
            updated_at
          `)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (ticketsError) throw ticketsError;
        setTickets(ticketsData || []);

        // Fetch agents
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select(`
            agent_id,
            name,
            email,
            role,
            team_id,
            organization_id,
            teams (
              name
            ),
            assigned_tickets:tickets!tickets_assigned_to_fkey(count)
          `)
          .eq('organization_id', organizationId);

        if (agentsError) throw agentsError;
        setAgents(agentsData?.map(agent => ({
          agent_id: agent.agent_id,
          name: agent.name,
          email: agent.email,
          role: agent.role,
          team_name: agent.teams?.[0]?.name || 'Unassigned',
          ticket_count: agent.assigned_tickets?.[0]?.count || 0,
          organization_id: agent.organization_id
        })) || []);

        // Fetch customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select(`
            customer_id,
            name,
            email,
            organization_id,
            tickets:tickets(count)
          `)
          .eq('organization_id', organizationId);

        if (customersError) throw customersError;
        setCustomers(customersData?.map(customer => ({
          ...customer,
          total_tickets: customer.tickets?.[0]?.count || 0
        })) || []);

    } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data. Please try again.');
      }
    };

    fetchData();
  }, [organizationId, supabase]);

  // Early return if no organizationId
  if (!organizationId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px] h-[800px] flex flex-col p-0 gap-0 bg-white">
          <DialogTitle className="px-6 py-4 border-b">AI Assistant</DialogTitle>
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700">
            <span className="text-red-500">⚠️</span>
            Loading organization data...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Update getItemsByType to properly filter items based on search
  const getItemsByType = (type: 'ticket' | 'customer' | 'agent', search: string = '') => {
    const searchLower = search.toLowerCase();
    
    switch (type) {
      case 'ticket':
        return tickets
          .filter(t => t.title.toLowerCase().includes(searchLower))
          .map(t => ({
            id: t.ticket_id,
            label: t.title,
            type: 'ticket' as const,
            metadata: { status: t.status, priority: t.priority }
          }));
      case 'agent':
        return agents
          .filter(a => a.name.toLowerCase().includes(searchLower))
          .map(a => ({
            id: a.agent_id,
            label: a.name,
            type: 'agent' as const,
            metadata: { role: a.role, team: a.team_name }
          }));
      case 'customer':
        return customers
          .filter(c => c.name.toLowerCase().includes(searchLower))
          .map(c => ({
            id: c.customer_id,
            label: c.name,
            type: 'customer' as const,
            metadata: { email: c.email }
          }));
      default:
        return [];
    }
  };

  // Update handleInputChange to properly track mention positions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setInput(value);

    const beforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && 
        (lastAtIndex === 0 || value[lastAtIndex - 1] === ' ') && 
        !value.slice(lastAtIndex, cursorPosition).includes(' ')) {
      const searchText = value.slice(lastAtIndex + 1, cursorPosition);
      
      if (!mention.isOpen || mention.type === 'category') {
        // Show category selection
        setMention({
          isOpen: true,
          type: 'category',
          trigger: value.slice(lastAtIndex),
          search: searchText,
          items: [
            { id: 'ticket', label: 'Tickets', type: 'ticket' },
            { id: 'agent', label: 'Agents', type: 'agent' },
            { id: 'customer', label: 'Customers', type: 'customer' }
          ],
          position: null
        });
      } else if (mention.type === 'item' && mention.selectedCategory) {
        // Filter items based on search text
        const filteredItems = getItemsByType(mention.selectedCategory, searchText);
        setMention(prev => ({
          ...prev,
          search: searchText,
          items: filteredItems
        }));
      }
    } else {
      setMention(prev => ({ ...prev, isOpen: false }));
    }

    // Update positions of existing mentions after the cursor
    setMentions(prev => {
      const lengthDiff = value.length - input.length;
      return prev.map(m => {
        if (m.index >= cursorPosition) {
          return { ...m, index: m.index + lengthDiff };
        }
        return m;
      });
    });
  };

  // Update handleMentionSelect to properly insert badges
  const handleMentionSelect = (item: { id: string; label: string; type?: 'ticket' | 'customer' | 'agent' }) => {
    if (mention.type === 'category') {
      // When selecting a category, show filtered items of that type
      const items = getItemsByType(item.type as 'ticket' | 'customer' | 'agent', '');
      setMention(prev => ({
        ...prev,
        type: 'item',
        items,
        search: '',
        isOpen: true,
        selectedCategory: item.type
      }));
    } else {
      // When selecting an item, insert it into the input
      const cursorPosition = input.lastIndexOf('@');
      const beforeMention = input.slice(0, cursorPosition);
      const afterMention = input.slice(cursorPosition + mention.search.length + 1);
      const newValue = beforeMention + item.label + ' ' + afterMention;
      
      // Add the new mention with correct position information
      const newMention = {
        id: item.id,
        type: item.type!,
        label: item.label,
        index: cursorPosition,
        length: item.label.length
      };
      
      // Update mentions array, maintaining order and adjusting positions
      setMentions(prev => {
        const updatedMentions = prev.map(m => {
          if (m.index > cursorPosition) {
            return {
              ...m,
              index: m.index + (newValue.length - input.length)
            };
          }
          return m;
        });
        return [...updatedMentions, newMention].sort((a, b) => a.index - b.index);
      });

      setInput(newValue);
      setMention(prev => ({ ...prev, isOpen: false }));

      // Update selected entities
      handleEntitySelect({
        id: item.id,
        type: item.type as 'ticket' | 'customer' | 'agent',
        label: item.label,
        metadata: mention.items.find(i => i.id === item.id)?.metadata
      });
    }
  };

  // Handle entity selection
  const handleEntitySelect = (entity: SelectedEntity) => {
    setSelectedEntities(prev => {
      const exists = prev.some(e => e.id === entity.id);
      if (exists) return prev;
      return [...prev, entity];
    });
  };

  // Remove selected entity
  const removeEntity = (entityId: string) => {
    setSelectedEntities(prev => prev.filter(e => e.id !== entityId));
  };

  // Add this helper function before handleSubmit
  const isFollowUpQuestion = (currentQuery: string, previousMessages: Message[]) => {
    const lastUserMessage = [...previousMessages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return false;

    // Check if current query is a follow-up about customers
    if (lastUserMessage.content.toLowerCase().includes('customer') &&
        (currentQuery.includes('their') || currentQuery.includes('them'))) {
      return 'customers';
    }

    // Add more follow-up patterns as needed
    return false;
  };

  // Update the renderMessage function to respect the showThought flag
  const renderMessage = (message: Message) => {
    const renderUserContent = (content: string, metadata?: Message['metadata']) => {
      if (!metadata?.mentions || metadata.mentions.length === 0) {
        return <span className="text-white">{content}</span>;
      }

      let lastIndex = 0;
      const elements = [];
      const sortedMentions = [...metadata.mentions].sort((a, b) => a.index - b.index);

      sortedMentions.forEach((mention, i) => {
        // Add text before mention
        if (mention.index > lastIndex) {
          elements.push(
            <span key={`text-${i}`} className="text-white whitespace-pre-wrap">
              {content.slice(lastIndex, mention.index)}
            </span>
          );
        }

        // Add mention badge exactly as it was input
        elements.push(
          <Badge
            key={`mention-${mention.id}`}
            variant="outline"
            className={cn(
              "inline-flex items-center gap-1 bg-gradient-to-r p-[1px] rounded-full mx-1 align-baseline",
              {
                'from-blue-500/20 to-blue-600/20 text-blue-300': mention.type === 'ticket',
                'from-green-500/20 to-green-600/20 text-green-300': mention.type === 'agent',
                'from-purple-500/20 to-purple-600/20 text-purple-300': mention.type === 'customer'
              }
            )}
          >
            <span className="px-2 py-0.5 bg-gray-900/90 rounded-full flex items-center gap-1">
              {mention.type === 'ticket' && <RiTicketLine className="w-3 h-3" />}
              {mention.type === 'agent' && <RiTeamLine className="w-3 h-3" />}
              {mention.type === 'customer' && <RiUser3Line className="w-3 h-3" />}
              {mention.label}
            </span>
          </Badge>
        );

        lastIndex = mention.index + mention.length;
      });

      // Add remaining text after last mention
      if (lastIndex < content.length) {
        elements.push(
          <span key="text-end" className="text-white whitespace-pre-wrap">
            {content.slice(lastIndex)}
          </span>
        );
      }

      return <div className="inline-flex flex-wrap items-baseline gap-0">{elements}</div>;
    };

    return (
      <motion.div 
        className={cn(
          "flex mb-4",
          message.role === 'assistant' ? "justify-start" : "justify-end"
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <div className={cn(
          "flex items-start max-w-[80%] rounded-2xl p-4 shadow-lg",
          message.role === 'assistant' 
            ? "bg-gray-900/50 border border-indigo-500/20 backdrop-blur-sm" 
            : "bg-gradient-to-r from-indigo-600/90 to-purple-600/90 backdrop-blur-sm"
        )}>
          {message.role === 'assistant' && (
            <div className="relative mr-3">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur" />
              <RiRobot2Line className="w-6 h-6 text-indigo-400 relative" />
            </div>
          )}
          <div className="flex-1">
            <div className={cn(
              "text-base",
              message.role === 'assistant' ? "text-gray-100" : "text-white"
            )}>
              {message.role === 'assistant' 
                ? message.content 
                : renderUserContent(message.content, message.metadata)
              }
            </div>
            {message.role === 'assistant' && 
             message.metadata?.thought && 
             message.metadata?.showThought !== false && (
              <div className="mt-2 space-y-1">
                <div className="text-sm text-indigo-300/80 border-t border-indigo-500/20 pt-2">
                  <p className="flex items-center gap-2">
                    <RiBrainLine className="w-4 h-4" />
                    <span className="text-indigo-300/90">{message.metadata.thought}</span>
                  </p>
                  {message.metadata.action && (
                    <p className="flex items-center gap-2 mt-1">
                      <RiLightbulbFlashLine className="w-4 h-4" />
                      <span className="text-purple-300/90">{message.metadata.action}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Update handleSubmit to properly initialize the agent
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing || !organizationId) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Create entity references while preserving exact message structure
      const entityReferences: EntityReference[] = mentions.map(mention => ({
        id: mention.id,
        type: mention.type,
        value: mention.label,
        metadata: {
          index: mention.index,
          length: mention.length
        }
      }));

      // Store the exact user input with badge positions
      const userMessage: Message = {
        role: 'user',
        content: input,
        timestamp: new Date(),
        metadata: { 
          entityReferences,
          originalInput: input,
          mentions: mentions
        }
      };
      setMessages(prev => [...prev, userMessage]);

      // Create AI message version with entity references
      let aiMessage = input;
      mentions.sort((a, b) => b.index - a.index).forEach(mention => {
        aiMessage = aiMessage.slice(0, mention.index) + 
                   `<${mention.type}:${mention.id}>` + 
                   aiMessage.slice(mention.index + mention.length);
      });

      // Create wrapped tools with context
      const wrappedTools = tools.map(tool => {
        const originalCall = tool.call.bind(tool);
        tool.call = async (input: any) => {
          // Parse input if it's a string
          const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
          
          // Add organizationId to the input
          const enrichedInput = {
            ...parsedInput,
            organizationId
          };

          // Call the original tool with the enriched input
          return originalCall(JSON.stringify(enrichedInput));
        };
        return tool;
      });

      // Initialize agent with wrapped tools and enhanced context
      const agent = await initializeAgentExecutorWithOptions(wrappedTools, openaiClient, {
        agentType: "chat-zero-shot-react-description",
        verbose: true,
        maxIterations: 5,
        returnIntermediateSteps: true,
        callbacks: [
          new LangChainTracer({
            projectName: process.env.NEXT_PUBLIC_LANGSMITH_PROJECT || "intelliticket-admin-ai",
            client: langsmithClient,
          })
        ],
        agentArgs: {
          prefix: SYSTEM_PROMPT,
          inputVariables: ["input", "organizationId", "previousMessages"]
        }
      });

      if (!agent) throw new Error('Failed to initialize AI assistant');

      // Execute agent with enhanced context
      const result = await agent.invoke({
        input: aiMessage,
        organizationId,
        previousMessages: messages.slice(-5).map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      // Parse and format the response
      let response = result.output || 'Request processed successfully.';
      let showThought = true;

      // If we have intermediate steps, try to enhance the response
      if (result.intermediateSteps?.length > 0) {
        const lastStep = result.intermediateSteps[result.intermediateSteps.length - 1];
        if (lastStep.observation) {
          try {
            const parsedObservation = JSON.parse(lastStep.observation);
            if (!parsedObservation.success) {
              throw new Error(parsedObservation.error || 'Failed to process request');
            }
            
            // Format the response based on the data structure
            const { data } = parsedObservation;
            // Only format as ticket response if we have ticket summary data AND no teams/agents data
            if (data?.tickets?.summary && !data?.teams) {
              response = formatTicketResponse(
                data.tickets.summary as TicketSummary,
                data.tickets.categorized as Record<string, TicketData[]>,
                data.teams as AgentWithWorkload[]
              );
              showThought = false;
            } else if (data?.teams) {
              // If we have teams data, use the agent's formatted response
              response = result.output;
              showThought = true;
            }
          } catch (e) {
            console.error('Error enhancing response:', e);
            // Fall back to the agent's output if we can't enhance the response
            response = result.output;
          }
        }
      }

      // Add assistant message with enhanced metadata
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        metadata: {
          execution_time: Date.now() - userMessage.timestamp.getTime(),
          entityReferences,
          thought: result.intermediateSteps?.[0]?.action?.log,
          action: result.intermediateSteps?.[0]?.action?.tool,
          showThought
        }
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Clear input state
      setInput('');
      setSelectedEntities([]);
      setMentions([]);
      setMention({
        isOpen: false,
        type: 'category',
        trigger: '',
        search: '',
        items: [],
        position: null
      });

    } catch (error) {
      console.error('Error processing message:', error);
      setError(error instanceof Error ? error.message : 'Failed to process your request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add resetChat function before the return statement
  const resetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant. I can help you manage tickets and team workload. What would you like to know?',
      timestamp: new Date(),
      },
    ]);
    setInput('');
    setSelectedEntities([]);
    setMention({
      isOpen: false,
      type: 'category',
      trigger: '',
      search: '',
      items: [],
      position: null
    });
    setTextBlocks([{ type: 'text', content: '' }]);
    setCurrentBlockIndex(0);
  };

  // Update handleKeyDown function to properly handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (mention.isOpen) {
        e.preventDefault();
          return;
        }
      if (!e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }

    if (mention.isOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMention(prev => ({ ...prev, isOpen: false }));
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'Backspace') {
      const cursorPosition = e.currentTarget.selectionStart;
      const mention = mentions.find(m => 
        cursorPosition > m.index && 
        cursorPosition <= (m.index + m.length + 1)
      );

      if (mention) {
        e.preventDefault();
        const newValue = input.slice(0, mention.index) + input.slice(mention.index + mention.length + 1);
        setInput(newValue);
        setMentions(prev => prev.filter(m => m.id !== mention.id));
        removeEntity(mention.id);
      }
    }
  };

  // Add this helper method to the class:
  const formatTicketResponse = (
    summary: TicketSummary,
    categorized: Record<string, TicketData[]>,
    teams: AgentWithWorkload[]
  ): string => {
    const priorities = ['urgent', 'high', 'medium', 'low'];
    let response = `I found ${summary.total} tickets:\n\n`;

    // Add summary section
    response += 'Summary:\n';
    priorities.forEach(priority => {
      const count = summary.by_priority[priority] || 0;
      response += `• ${priority.charAt(0).toUpperCase() + priority.slice(1)}: ${count} tickets\n`;
    });

    // Add detailed sections for each priority
    priorities.forEach(priority => {
      const tickets = categorized[priority];
      if (tickets?.length > 0) {
        response += `\n${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Tickets:\n`;
        tickets.forEach(ticket => {
          response += `• ${ticket.title} - Customer: ${ticket.customer.name}\n`;
          response += `  Status: ${ticket.status}, Created: ${new Date(ticket.created_at).toLocaleDateString()}\n`;
        });
      }
    });

    // Add recommendations if there are unassigned tickets
    if (summary.total > 0) {
      response += '\nRecommended Actions:\n';
      const availableAgents = teams
        .filter(agent => agent.workload.current < agent.workload.capacity)
        .sort((a, b) => a.workload.current - b.workload.current);

      if (summary.by_priority.urgent > 0) {
        const seniorAgents = availableAgents.filter(agent => 
          agent.role.toLowerCase().includes('senior')
        );
        response += `1. Assign urgent tickets to ${
          seniorAgents.length > 0 ? 'available senior agents' : 'experienced team members'
        }\n`;
      }
      
      response += `2. Distribute remaining tickets based on current workload and agent expertise\n`;
    }

    return response;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] h-[800px] flex flex-col p-0 gap-0 bg-gradient-to-br from-gray-900 to-indigo-900 text-white overflow-hidden rounded-2xl border border-indigo-500/20">
        <motion.div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-purple-500/5 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        
        <DialogTitle className="px-6 py-4 border-b border-indigo-500/20 flex justify-between items-center bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <RiBrainLine className="w-6 h-6 text-indigo-400" />
            </motion.div>
            <span className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              AI Assistant
            </span>
          </div>
          <Button
            onClick={resetChat}
            variant="ghost"
            size="sm"
            className="text-indigo-300 hover:text-indigo-100 hover:bg-indigo-500/20"
          >
            <RiLightbulbFlashLine className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </DialogTitle>

        {error ? (
          <motion.div 
            className="flex items-center gap-2 p-4 bg-red-900/20 text-red-300 border-l-4 border-red-500"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-red-400">⚠️</span>
            {error}
          </motion.div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-6 custom-scrollbar">
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {renderMessage(message)}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </ScrollArea>

            <div className="p-6 border-t border-indigo-500/20 bg-gray-900/50 backdrop-blur-sm">
              <motion.div 
                className="flex flex-wrap gap-2 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <AnimatePresence>
                  {selectedEntities.map((entity) => (
                    <motion.div
                      key={entity.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "flex items-center gap-1 bg-gradient-to-r p-[1px] rounded-full",
                          {
                            'from-blue-500/20 to-blue-600/20 text-blue-300': entity.type === 'ticket',
                            'from-green-500/20 to-green-600/20 text-green-300': entity.type === 'agent',
                            'from-purple-500/20 to-purple-600/20 text-purple-300': entity.type === 'customer'
                          }
                        )}
                      >
                        <span className="px-2 py-1 bg-gray-900/90 rounded-full flex items-center gap-1">
                          {entity.type === 'ticket' && <RiTicketLine className="w-4 h-4" />}
                          {entity.type === 'agent' && <RiTeamLine className="w-4 h-4" />}
                          {entity.type === 'customer' && <RiUser3Line className="w-4 h-4" />}
                          {entity.label}
                          <button
                            onClick={() => removeEntity(entity.id)}
                            className="ml-1 hover:text-white transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2 relative">
                  <div className="flex-1">
                    <InputArea
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      disabled={isProcessing}
                      mentions={mentions}
                    />
                    <AnimatePresence>
                      {mention.isOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full left-0 w-64 bg-gray-900/95 rounded-lg shadow-lg border border-indigo-500/20 mb-2 backdrop-blur-sm"
                          style={{
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}
                        >
                          <div className="w-full">
                            {mention.type === 'category' ? (
                              <>
                                <div className="px-2 py-1.5 text-sm font-semibold text-gray-500">
                                  Select Type
                                </div>
                                {mention.items.map((item) => (
                                  <div
                                    key={item.id}
                                    onClick={() => handleMentionSelect(item)}
                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 cursor-pointer"
                                  >
                                    {item.type === 'ticket' && <RiTicketLine className="w-4 h-4 text-blue-500" />}
                                    {item.type === 'agent' && <RiTeamLine className="w-4 h-4 text-green-500" />}
                                    {item.type === 'customer' && <RiUser3Line className="w-4 h-4 text-purple-500" />}
                                    <span className="text-sm">{item.label}</span>
                                  </div>
                                ))}
                              </>
                            ) : (
                              <>
                                <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 flex items-center justify-between">
                                  <span>Select {mention.selectedCategory?.charAt(0).toUpperCase()}{mention.selectedCategory?.slice(1)}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setMention(prev => ({ ...prev, type: 'category' }));
                                    }}
                                    className="text-xs text-blue-500 hover:text-blue-700"
                                  >
                                    Back
                                  </button>
                                </div>
                                {mention.items.length > 0 ? (
                                  mention.items.map((item) => (
                                    <div
                                      key={item.id}
                                      onClick={() => handleMentionSelect(item)}
                                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 cursor-pointer"
                                    >
                                      {item.type === 'ticket' && <RiTicketLine className="w-4 h-4 text-blue-500" />}
                                      {item.type === 'agent' && <RiTeamLine className="w-4 h-4 text-green-500" />}
                                      {item.type === 'customer' && <RiUser3Line className="w-4 h-4 text-purple-500" />}
                                      <span className="text-sm">{item.label}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-2 py-1.5 text-sm text-gray-500">
                                    No matches found
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <Button
                    type="submit" 
                    disabled={isProcessing || !input.trim()}
                    className={cn(
                      "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 self-end rounded-xl transition-all duration-300",
                      isProcessing && "opacity-75"
                    )}
                  >
                    {isProcessing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <RiPulseLine className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <RiSendPlaneFill className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 


