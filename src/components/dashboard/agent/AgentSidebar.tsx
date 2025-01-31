"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Book,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { AgentIntelligenceButton } from "./sidebar/AgentIntelligenceButton";
import type { UUID } from 'crypto';

interface AgentProfile {
  agent_id: UUID;
  name: string;
  organization_name: string;
}

interface AgentData {
  agent_id: UUID;
  name: string;
  organizations: {
    name: string;
  };
}

const navigation = [
  {
    name: "Overview",
    href: "/dashboard/agent",
    icon: LayoutDashboard,
  },
  {
    name: "Tickets",
    href: "/dashboard/agent/tickets",
    icon: Ticket,
  },
  {
    name: "Customers",
    href: "/dashboard/agent/customers",
    icon: Users,
  },
  {
    name: "Knowledge Base",
    href: "/dashboard/agent/knowledge",
    icon: Book,
  },
];

export function AgentSidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<AgentProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClientComponentClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: agentData } = await supabase
        .from('agents')
        .select(`
          agent_id,
          name,
          organizations (
            name
          )
        `)
        .eq('email', user.email)
        .single<AgentData>();

      if (agentData) {
        setProfile({
          agent_id: agentData.agent_id,
          name: agentData.name,
          organization_name: agentData.organizations.name,
        });
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="flex h-full flex-col gap-y-5 bg-white px-6 py-4">
      {profile && (
        <Link 
          href="/dashboard/agent/profile"
          className="flex flex-col px-2 py-3 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-bold text-gray-900">{profile.name}</span>
          <span className="text-xs text-gray-500">{profile.organization_name}</span>
        </Link>
      )}

      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        isActive
                          ? "bg-gray-50 text-primary"
                          : "text-gray-700 hover:text-primary hover:bg-gray-50",
                        "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? "text-primary" : "text-gray-400 group-hover:text-primary",
                          "h-6 w-6 shrink-0"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>

          {/* AI Assistant Button */}
          {profile && (
            <li className="-mx-2">
              <AgentIntelligenceButton agentId={profile.agent_id} />
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
} 