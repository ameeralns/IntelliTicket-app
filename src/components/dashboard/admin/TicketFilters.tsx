'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const statusOptions = ['All', 'New', 'In Progress', 'Resolved', 'Closed']
const priorityOptions = ['All', 'Low', 'Medium', 'High', 'Urgent']

interface TicketFiltersProps {
  onStatusChange: (value: string) => void
  onPriorityChange: (value: string) => void
}

export function TicketFilters({
  onStatusChange,
  onPriorityChange
}: TicketFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <Select defaultValue="All" onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue="All" onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by priority" />
        </SelectTrigger>
        <SelectContent>
          {priorityOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 