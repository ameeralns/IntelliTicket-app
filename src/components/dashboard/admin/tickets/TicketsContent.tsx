'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TicketList from './TicketList';

interface TicketsContentProps {}

const TicketsContent: React.FC<TicketsContentProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Tickets Management</h1>
      </div>
      
      {/* Filters Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm text-gray-900 placeholder:text-gray-500 bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white text-gray-900 border-gray-200">
                <SelectValue placeholder="Status" className="text-gray-900" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="All" className="text-gray-900">All Status</SelectItem>
                <SelectItem value="New" className="text-gray-900">New</SelectItem>
                <SelectItem value="In Progress" className="text-gray-900">In Progress</SelectItem>
                <SelectItem value="Resolved" className="text-gray-900">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px] bg-white text-gray-900 border-gray-200">
                <SelectValue placeholder="Priority" className="text-gray-900" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="All" className="text-gray-900">All Priority</SelectItem>
                <SelectItem value="Low" className="text-gray-900">Low</SelectItem>
                <SelectItem value="Medium" className="text-gray-900">Medium</SelectItem>
                <SelectItem value="High" className="text-gray-900">High</SelectItem>
                <SelectItem value="Urgent" className="text-gray-900">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Unassigned Tickets Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-900">Unassigned Tickets</h2>
          <p className="text-sm text-gray-500 mt-1">Tickets that need to be assigned to an agent</p>
        </div>
        <TicketList 
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          isAssigned={false}
        />
      </div>

      {/* Assigned Tickets Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-900">Assigned Tickets</h2>
          <p className="text-sm text-gray-500 mt-1">Tickets currently being handled by agents</p>
        </div>
        <TicketList 
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          isAssigned={true}
        />
      </div>

      {/* Closed Tickets Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-900">Closed Tickets</h2>
          <p className="text-sm text-gray-500 mt-1">Tickets that have been resolved and closed</p>
        </div>
        <TicketList 
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          isAssigned={false}
          isClosed={true}
        />
      </div>
    </div>
  );
};

export default TicketsContent; 