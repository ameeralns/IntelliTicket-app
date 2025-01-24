import { AgentSidebar } from "@/components/dashboard/agent/AgentSidebar";
import { Toaster } from "@/components/ui/toaster";

export default function AgentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <div className="w-64 border-r border-gray-200">
        <AgentSidebar />
      </div>
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
} 