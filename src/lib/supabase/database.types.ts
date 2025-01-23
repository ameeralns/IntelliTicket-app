export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          agent_id: string
          created_at: string | null
          email: string
          name: string
          organization_id: string
          role: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string
          created_at?: string | null
          email: string
          name: string
          organization_id: string
          role: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          email?: string
          name?: string
          organization_id?: string
          role?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "agents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["team_id"]
          }
        ]
      }
      custom_fields: {
        Row: {
          created_at: string | null
          field_id: string
          field_name: string
          field_type: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          field_id?: string
          field_name: string
          field_type: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string
          field_name?: string
          field_type?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          }
        ]
      }
      customers: {
        Row: {
          contact_preferences: Json
          created_at: string | null
          customer_id: string
          email: string
          name: string
          notification_settings: Json
          organization_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          contact_preferences?: Json
          created_at?: string | null
          customer_id?: string
          email: string
          name: string
          notification_settings?: Json
          organization_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_preferences?: Json
          created_at?: string | null
          customer_id?: string
          email?: string
          name?: string
          notification_settings?: Json
          organization_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          }
        ]
      }
      email_templates: {
        Row: {
          content: string
          created_at: string | null
          organization_id: string
          template_id: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          organization_id: string
          template_id?: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          organization_id?: string
          template_id?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          }
        ]
      }
      interactions: {
        Row: {
          content: string
          created_at: string | null
          interaction_id: string
          ticket_id: string
          type: string
          updated_at: string | null
          user_email: string
          user_type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          interaction_id?: string
          ticket_id: string
          type: string
          updated_at?: string | null
          user_email: string
          user_type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          interaction_id?: string
          ticket_id?: string
          type?: string
          updated_at?: string | null
          user_email?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["ticket_id"]
          }
        ]
      }
      knowledge_base_articles: {
        Row: {
          article_id: string
          title: string
          content: string
          category: string
          read_time: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          article_id?: string
          title: string
          content: string
          category: string
          read_time: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          article_id?: string
          title?: string
          content?: string
          category?: string
          read_time?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string | null
          name: string
          organization_id: string
          settings: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          name: string
          organization_id?: string
          settings?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          name?: string
          organization_id?: string
          settings?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          key: string
          organization_id: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          key: string
          organization_id: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          key?: string
          organization_id?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          }
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          name: string
          organization_id: string
          tag_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          name: string
          organization_id: string
          tag_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          name?: string
          organization_id?: string
          tag_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          }
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          name: string
          organization_id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          name: string
          organization_id: string
          team_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          name?: string
          organization_id?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          }
        ]
      }
      ticket_tags: {
        Row: {
          created_at: string | null
          tag_id: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          tag_id: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          tag_id?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["tag_id"]
          },
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["ticket_id"]
          }
        ]
      }
      tickets: {
        Row: {
          agent_id: string | null
          created_at: string | null
          customer_id: string
          description: string
          priority: string
          status: string
          ticket_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          customer_id: string
          description: string
          priority: string
          status?: string
          ticket_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          customer_id?: string
          description?: string
          priority?: string
          status?: string
          ticket_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 