export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'agent' | 'customer'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          logo_url?: string | null
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          full_name: string
          avatar_url: string | null
          role: UserRole
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          email: string
          full_name: string
          avatar_url?: string | null
          role?: UserRole
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          role?: UserRole
          organization_id?: string | null
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          created_at: string
          title: string
          description: string
          status: TicketStatus
          priority: TicketPriority
          category: string
          assigned_to: string | null
          created_by: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          description: string
          status?: TicketStatus
          priority: TicketPriority
          category: string
          assigned_to?: string | null
          created_by: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          description?: string
          status?: TicketStatus
          priority?: TicketPriority
          category?: string
          assigned_to?: string | null
          created_by?: string
          organization_id?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          created_at: string
          content: string
          ticket_id: string
          user_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          content: string
          ticket_id: string
          user_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          content?: string
          ticket_id?: string
          user_id?: string
          updated_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          created_at: string
          file_url: string
          file_name: string
          file_size: number
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          file_url: string
          file_name: string
          file_size: number
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          id?: string
          created_at?: string
          file_url?: string
          file_name?: string
          file_size?: number
          ticket_id?: string
          uploaded_by?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          created_at: string
          action: string
          entity_type: string
          entity_id: string
          user_id: string
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          action: string
          entity_type: string
          entity_id: string
          user_id: string
          metadata: Json
        }
        Update: {
          id?: string
          created_at?: string
          action?: string
          entity_type?: string
          entity_id?: string
          user_id?: string
          metadata?: Json
        }
      }
    }
  }
} 