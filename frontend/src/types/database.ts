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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      components: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: string | null
          specifications: Json | null
          stock: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: string | null
          specifications?: Json | null
          stock?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: string | null
          specifications?: Json | null
          stock?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          account_created: boolean | null
          created_at: string | null
          feature_updates: boolean | null
          id: string
          project_first_save: boolean | null
          unsubscribe_all: boolean | null
          updated_at: string | null
          user_id: string | null
          weekly_digest: boolean | null
        }
        Insert: {
          account_created?: boolean | null
          created_at?: string | null
          feature_updates?: boolean | null
          id?: string
          project_first_save?: boolean | null
          unsubscribe_all?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          weekly_digest?: boolean | null
        }
        Update: {
          account_created?: boolean | null
          created_at?: string | null
          feature_updates?: boolean | null
          id?: string
          project_first_save?: boolean | null
          unsubscribe_all?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          weekly_digest?: boolean | null
        }
        Relationships: []
      }
      guest_users: {
        Row: {
          created_at: string | null
          expires_at: string | null
          guest_id: string
          id: string
          last_active: string | null
          preferences: Json | null
          projects: Json | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          guest_id: string
          id?: string
          last_active?: string | null
          preferences?: Json | null
          projects?: Json | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          guest_id?: string
          id?: string
          last_active?: string | null
          preferences?: Json | null
          projects?: Json | null
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          ai_personalization: boolean | null
          allow_data_usage: boolean | null
          created_at: string | null
          id: string
          profile_visibility: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_personalization?: boolean | null
          allow_data_usage?: boolean | null
          created_at?: string | null
          id?: string
          profile_visibility?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_personalization?: boolean | null
          allow_data_usage?: boolean | null
          created_at?: string | null
          id?: string
          profile_visibility?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          components: string[] | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_cost: string | null
          estimated_time: string | null
          generated_from_params: Json | null
          id: string
          notes: string | null
          progress: number | null
          project_type: string | null
          skills: string[] | null
          starred: boolean | null
          status: string | null
          steps: string[] | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          components?: string[] | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_cost?: string | null
          estimated_time?: string | null
          generated_from_params?: Json | null
          id?: string
          notes?: string | null
          progress?: number | null
          project_type?: string | null
          skills?: string[] | null
          starred?: boolean | null
          status?: string | null
          steps?: string[] | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          components?: string[] | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_cost?: string | null
          estimated_time?: string | null
          generated_from_params?: Json | null
          id?: string
          notes?: string | null
          progress?: number | null
          project_type?: string | null
          skills?: string[] | null
          starred?: boolean | null
          status?: string | null
          steps?: string[] | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      saved_components: {
        Row: {
          component_category: string | null
          component_name: string
          component_price: string | null
          component_specs: Json | null
          created_at: string | null
          external_url: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          component_category?: string | null
          component_name: string
          component_price?: string | null
          component_specs?: Json | null
          created_at?: string | null
          external_url?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          component_category?: string | null
          component_name?: string
          component_price?: string | null
          component_specs?: Json | null
          created_at?: string | null
          external_url?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          language: string | null
          notifications: Json | null
          theme: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: string | null
          notifications?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string | null
          notifications?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_complete_settings: {
        Row: {
          account_created: boolean | null
          ai_personalization: boolean | null
          allow_data_usage: boolean | null
          feature_updates: boolean | null
          language: string | null
          notifications: Json | null
          profile_visibility: string | null
          project_first_save: boolean | null
          theme: string | null
          unsubscribe_all: boolean | null
          user_id: string | null
          weekly_digest: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_guests: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const