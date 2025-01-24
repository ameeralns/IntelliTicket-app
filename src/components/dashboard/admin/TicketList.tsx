'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'

type Ticket = {
  ticket_id: string
  title: string
  description: string
  status: 'New' | 'In Progress' | 'Resolved' | 'Closed'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  created_at: string
  customer_id: string
  agent_id: string | null
  customers: {
    name: string
    email: string
    avatar_url?: string
  }
  agents: {
    name: string
    email: string
  } | null
}

interface TicketListProps {
  searchQuery: string
  statusFilter: string
  priorityFilter: string
  isAssigned: boolean
}

export function TicketList({ 
  searchQuery, 
  statusFilter, 
  priorityFilter,
  isAssigned
}: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, statusFilter, priorityFilter])

  useEffect(() => {
    const channel = supabase
      .channel('tickets-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchTickets()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchTickets() {
    try {
      setLoading(true)

      let query = supabase
        .from('tickets')
        .select(`
          *,
          customers (
            name,
            email,
            avatar_url
          ),
          agents (
            name,
            email
          )
        `)

      // Assignment filter
      if (isAssigned) {
        query = query.not('agent_id', 'is', null)
      } else {
        query = query.is('agent_id', null)
      }

      // Status filter
      if (statusFilter && statusFilter !== 'All') {
        query = query.eq('status', statusFilter)
      }

      // Priority filter
      if (priorityFilter && priorityFilter !== 'All') {
        query = query.eq('priority', priorityFilter)
      }

      // Search functionality
      if (searchQuery && searchQuery.trim()) {
        const search = searchQuery.trim().toLowerCase()
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      }

      // Order by creation date
      const { data: ticketsData, error: ticketsError } = await query
        .order('created_at', { ascending: false })

      if (ticketsError) throw ticketsError

      // If there's a search query, also search in related tables
      if (searchQuery && searchQuery.trim()) {
        const search = searchQuery.trim().toLowerCase()
        
        // Filter results based on customer and agent names
        const filteredTickets = ticketsData.filter(ticket => {
          const customerMatch = ticket.customers?.name.toLowerCase().includes(search) ||
                              ticket.customers?.email.toLowerCase().includes(search)
          const agentMatch = isAssigned && ticket.agents?.name.toLowerCase().includes(search)
          
          return customerMatch || agentMatch
        })

        setTickets(filteredTickets)
      } else {
        setTickets(ticketsData || [])
      }

    } catch (error) {
      console.error('Error fetching tickets:', error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = tickets

  const getStatusColor = (status: Ticket['status']) => {
    const colors = {
      'New': 'bg-blue-100 text-blue-800 border border-blue-200',
      'In Progress': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'Resolved': 'bg-green-100 text-green-800 border border-green-200',
      'Closed': 'bg-gray-100 text-gray-700 border border-gray-200'
    }
    return colors[status]
  }

  const getPriorityColor = (priority: Ticket['priority']) => {
    const colors = {
      'Low': 'bg-slate-100 text-slate-700 border border-slate-200',
      'Medium': 'bg-blue-100 text-blue-700 border border-blue-200',
      'High': 'bg-orange-100 text-orange-700 border border-orange-200',
      'Urgent': 'bg-red-100 text-red-700 border border-red-200'
    }
    return colors[priority]
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-gray-600">Loading tickets...</div>
      </div>
    )
  }

  if (filteredTickets.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-gray-600">
          {isAssigned ? 'No assigned tickets found' : 'No unassigned tickets found'}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
      {filteredTickets.map((ticket) => (
        <Card key={ticket.ticket_id} className="overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-start gap-4">
              <h3 className="font-semibold text-lg text-gray-900 leading-tight">{ticket.title}</h3>
              <div className="flex gap-2 flex-shrink-0">
                <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
              </div>
            </div>

            <p className="text-gray-600 text-sm line-clamp-2">{ticket.description}</p>

            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Avatar className="border border-gray-200">
                    {ticket.customers.avatar_url && (
                      <AvatarImage src={ticket.customers.avatar_url} alt={ticket.customers.name} />
                    )}
                    <AvatarFallback className="bg-gray-100 text-gray-700">
                      {ticket.customers.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ticket.customers.name}</p>
                    <p className="text-xs text-gray-500">{ticket.customers.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Created {formatDistanceToNow(new Date(ticket.created_at))} ago
                  </p>
                  {ticket.agents && (
                    <p className="text-xs font-medium text-gray-700 mt-1">
                      Assigned to {ticket.agents.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
} 