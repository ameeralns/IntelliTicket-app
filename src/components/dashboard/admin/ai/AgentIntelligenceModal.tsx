import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RiSendPlaneFill, RiRobot2Line, RiUser3Line, RiTicketLine, RiTeamLine, RiBrainLine, RiPulseLine, RiLightbulbFlashLine, RiArticleLine } from 'react-icons/ri';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, initializeAgentExecutorWithOptions } from 'langchain/agents';
import { Tool } from '@langchain/core/tools';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Badge } from '@/components/ui/badge';
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { UUID } from 'crypto';
import { ConsoleCallbackHandler } from '@langchain/core/tracers/console';
import { LangChainTracer } from 'langchain/callbacks';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Client } from 'langsmith';
import { 
  ChatInteractionTool, 
  CustomerFetchTool, 
  KnowledgeArticleTool, 
  AgentTicketsTool,
  TicketUpdateTool,
  TicketStatus 
} from '@/lib/services/ai/AgentIntelligenceTools';

interface Ticket {
  ticket_id: UUID;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: string;
  agent_id?: UUID;
  organization_id: UUID;
  created_at: Date;
  assigned_at?: Date;
  updated_at: Date;
  resolved_at?: Date;
  satisfaction_score?: number;
  customer?: {
    customer_id: string;
    name: string;
    email: string;
  };
} 