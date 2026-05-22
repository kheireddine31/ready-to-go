export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          exchange_rate_dzd_per_usd: number
          id: number
          redotpay_qr_path: string | null
          updated_at: string
        }
        Insert: {
          exchange_rate_dzd_per_usd?: number
          id?: number
          redotpay_qr_path?: string | null
          updated_at?: string
        }
        Update: {
          exchange_rate_dzd_per_usd?: number
          id?: number
          redotpay_qr_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      models: {
        Row: {
          badge: string | null
          cost_in_usd_per_1k: number
          cost_out_usd_per_1k: number
          created_at: string
          icon_emoji: string
          is_active: boolean
          is_popular: boolean
          name: string
          provider: string
          slug: string
          sort_order: number
        }
        Insert: {
          badge?: string | null
          cost_in_usd_per_1k?: number
          cost_out_usd_per_1k?: number
          created_at?: string
          icon_emoji?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          provider: string
          slug: string
          sort_order?: number
        }
        Update: {
          badge?: string | null
          cost_in_usd_per_1k?: number
          cost_out_usd_per_1k?: number
          created_at?: string
          icon_emoji?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          provider?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount_dzd: number
          created_at: string
          id: string
          payment_method: string
          plan_slug: string
          proof_path: string | null
          receipt_number: string
          rejection_reason: string | null
          status: string
          user_email: string
          user_id: string
        }
        Insert: {
          amount_dzd: number
          created_at?: string
          id?: string
          payment_method: string
          plan_slug: string
          proof_path?: string | null
          receipt_number: string
          rejection_reason?: string | null
          status?: string
          user_email: string
          user_id: string
        }
        Update: {
          amount_dzd?: number
          created_at?: string
          id?: string
          payment_method?: string
          plan_slug?: string
          proof_path?: string | null
          receipt_number?: string
          rejection_reason?: string | null
          status?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_plan_slug_fkey"
            columns: ["plan_slug"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["slug"]
          },
        ]
      }
      plans: {
        Row: {
          ai_value_usd: number
          created_at: string
          is_popular: boolean
          margin_percent: number
          models: string[]
          name: string
          provider_cost_usd: number
          slug: string
          sort_order: number
        }
        Insert: {
          ai_value_usd: number
          created_at?: string
          is_popular?: boolean
          margin_percent?: number
          models?: string[]
          name: string
          provider_cost_usd?: number
          slug: string
          sort_order?: number
        }
        Update: {
          ai_value_usd?: number
          created_at?: string
          is_popular?: boolean
          margin_percent?: number
          models?: string[]
          name?: string
          provider_cost_usd?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          openrouter_api_key: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          openrouter_api_key?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          openrouter_api_key?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          cost_dzd: number
          created_at: string
          id: string
          model_name: string
          model_slug: string
          source: string
          tokens_in: number
          tokens_out: number
          used_own_key: boolean
          user_id: string
        }
        Insert: {
          cost_dzd?: number
          created_at?: string
          id?: string
          model_name: string
          model_slug: string
          source?: string
          tokens_in?: number
          tokens_out?: number
          used_own_key?: boolean
          user_id: string
        }
        Update: {
          cost_dzd?: number
          created_at?: string
          id?: string
          model_name?: string
          model_slug?: string
          source?: string
          tokens_in?: number
          tokens_out?: number
          used_own_key?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_dzd: number
          created_at: string
          total_credited_dzd: number
          total_spent_dzd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_dzd?: number
          created_at?: string
          total_credited_dzd?: number
          total_spent_dzd?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_dzd?: number
          created_at?: string
          total_credited_dzd?: number
          total_spent_dzd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
