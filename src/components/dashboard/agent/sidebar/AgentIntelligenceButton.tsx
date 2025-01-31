import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RiRobot2Line } from 'react-icons/ri';
import { AgentIntelligenceModal } from '../ai/AgentIntelligenceModal';
import type { UUID } from 'crypto';

interface AgentIntelligenceButtonProps {
  agentId: UUID;
}

export function AgentIntelligenceButton({ agentId }: AgentIntelligenceButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="ghost"
        className="w-full justify-start gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:text-primary hover:bg-gray-50 group"
      >
        <RiRobot2Line
          className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-primary"
          aria-hidden="true"
        />
        AI Assistant
      </Button>

      <AgentIntelligenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agentId={agentId}
      />
    </>
  );
} 