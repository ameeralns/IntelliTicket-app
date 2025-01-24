'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { TicketList } from '@/components/dashboard/admin/TicketList'
import { TicketFilters } from '@/components/dashboard/admin/TicketFilters'
import { SearchInput } from '@/components/ui/SearchInput'

export function TicketsContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value)
  }

  const handlePriorityChange = (value: string) => {
    setSelectedPriority(value)
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Tickets Management</h1>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-72">
            <SearchInput 
              placeholder="Search tickets..." 
              onSearch={handleSearch}
            />
          </div>
          <TicketFilters 
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
          />
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
          statusFilter={selectedStatus}
          priorityFilter={selectedPriority}
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
          statusFilter={selectedStatus}
          priorityFilter={selectedPriority}
          isAssigned={true}
        />
      </div>
    </div>
  )
} 