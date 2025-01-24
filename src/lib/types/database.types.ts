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
      organizations: {
        Row: {
          created_at: string | null
          description: string | null
          name: string
          organization_id: string
          updated_at: string | null
          customer_code: string
          agent_code: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          name: string
          organization_id?: string
          updated_at?: string | null
          customer_code?: string
          agent_code?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          name?: string
          organization_id?: string
          updated_at?: string | null
          customer_code?: string
          agent_code?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          agent_id: string
          team_id: string | null
          organization_id: string
          name: string
          email: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          agent_id?: string
          team_id?: string | null
          organization_id: string
          name: string
          email: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          team_id?: string | null
          organization_id?: string
          name?: string
          email?: string
          role?: string
          created_at?: string
          updated_at?: string
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
          },
        ]
      }
      custom_fields: {
        Row: {
          custom_field_id: string
          field_name: string
          field_value: string
          ticket_id: string
        }
        Insert: {
          custom_field_id?: string
          field_name: string
          field_value: string
          ticket_id: string
        }
        Update: {
          custom_field_id?: string
          field_name?: string
          field_value?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      customers: {
        Row: {
          customer_id: string
          organization_id: string
          name: string
          email: string
          phone: string | null
          created_at: string
          updated_at: string
          avatar_url: string | null
          contact_preferences: {
            email: boolean
            phone: boolean
          } | null
          notification_settings: {
            ticket_updates: boolean
            marketing: boolean
          } | null
        }
        Insert: {
          customer_id?: string
          organization_id: string
          name: string
          email: string
          phone?: string | null
          created_at?: string
          updated_at?: string
          avatar_url?: string | null
          contact_preferences?: Json | null
          notification_settings?: Json | null
        }
        Update: {
          customer_id?: string
          organization_id?: string
          name?: string
          email?: string
          phone?: string | null
          created_at?: string
          updated_at?: string
          avatar_url?: string | null
          contact_preferences?: Json | null
          notification_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          is_active: boolean | null
          name: string
          organization_id: string
          subject: string
          template_id: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          created_at?: string | null
          is_active?: boolean | null
          name: string
          organization_id: string
          subject: string
          template_id?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          created_at?: string | null
          is_active?: boolean | null
          name?: string
          organization_id?: string
          subject?: string
          template_id?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      interactions: {
        Row: {
          interaction_id: string
          ticket_id: string
          agent_id: string | null
          customer_id: string | null
          content: string
          interaction_type: string
          created_at: string
          is_private: boolean
        }
        Insert: {
          interaction_id?: string
          ticket_id: string
          agent_id?: string | null
          customer_id?: string | null
          content: string
          interaction_type: string
          created_at?: string
          is_private?: boolean
        }
        Update: {
          interaction_id?: string
          ticket_id?: string
          agent_id?: string | null
          customer_id?: string | null
          content?: string
          interaction_type?: string
          created_at?: string
          is_private?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "interactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "interactions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          organization_id: string
          setting_id: string
          settings_key: string
          settings_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          organization_id: string
          setting_id?: string
          settings_key: string
          settings_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          organization_id?: string
          setting_id?: string
          settings_key?: string
          settings_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      tags: {
        Row: {
          name: string
          tag_id: string
        }
        Insert: {
          name: string
          tag_id?: string
        }
        Update: {
          name?: string
          tag_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          name: string
          organization_id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          name: string
          organization_id: string
          team_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
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
          },
        ]
      }
      ticket_tags: {
        Row: {
          tag_id: string
          ticket_id: string
        }
        Insert: {
          tag_id: string
          ticket_id: string
        }
        Update: {
          tag_id?: string
          ticket_id?: string
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
          },
        ]
      }
      tickets: {
        Row: {
          ticket_id: string
          customer_id: string
          agent_id: string | null
          team_id: string | null
          title: string
          description: string
          status: string
          priority: string
          created_at: string
          updated_at: string
          satisfaction_score: number | null
        }
        Insert: {
          ticket_id?: string
          customer_id: string
          agent_id?: string | null
          team_id?: string | null
          title: string
          description: string
          status: string
          priority: string
          created_at?: string
          updated_at?: string
          satisfaction_score?: number | null
        }
        Update: {
          ticket_id?: string
          customer_id?: string
          agent_id?: string | null
          team_id?: string | null
          title?: string
          description?: string
          status?: string
          priority?: string
          created_at?: string
          updated_at?: string
          satisfaction_score?: number | null
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
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tickets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["team_id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          article_id: string
          organization_id: string
          title: string
          content: string
          category: string | null
          tags: string[] | null
          view_count: number
          is_published: boolean
          created_at: string
          updated_at: string
          pdf_url: string | null
          pdf_filename: string | null
          pdf_size_bytes: number | null
          pdf_last_modified: string | null
        }
        Insert: {
          article_id?: string
          organization_id: string
          title: string
          content: string
          category?: string | null
          tags?: string[] | null
          view_count?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
          pdf_url?: string | null
          pdf_filename?: string | null
          pdf_size_bytes?: number | null
          pdf_last_modified?: string | null
        }
        Update: {
          article_id?: string
          organization_id?: string
          title?: string
          content?: string
          category?: string | null
          tags?: string[] | null
          view_count?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
          pdf_url?: string | null
          pdf_filename?: string | null
          pdf_size_bytes?: number | null
          pdf_last_modified?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          }
        ]
      }
      categories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_private_notes: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_current_user_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
