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
      mage_events: {
        Row: {
          counter: string
          created_at: string
          id: string
          predicted: string | null
          source: string
          user_id: string
          world: string
        }
        Insert: {
          counter: string
          created_at?: string
          id?: string
          predicted?: string | null
          source?: string
          user_id: string
          world: string
        }
        Update: {
          counter?: string
          created_at?: string
          id?: string
          predicted?: string | null
          source?: string
          user_id?: string
          world?: string
        }
        Relationships: []
      }
      mage_memory: {
        Row: {
          history: Json
          queue: Json
          stack: Json
          total_actions: number
          updated_at: string
          user_id: string
          world: string
        }
        Insert: {
          history?: Json
          queue?: Json
          stack?: Json
          total_actions?: number
          updated_at?: string
          user_id: string
          world: string
        }
        Update: {
          history?: Json
          queue?: Json
          stack?: Json
          total_actions?: number
          updated_at?: string
          user_id?: string
          world?: string
        }
        Relationships: []
      }
      player_stats: {
        Row: {
          deaths: number
          kills: number
          max_combo: number
          score: number
          signature_moves: number
          updated_at: string
          user_id: string
          world: string
        }
        Insert: {
          deaths?: number
          kills?: number
          max_combo?: number
          score?: number
          signature_moves?: number
          updated_at?: string
          user_id: string
          world: string
        }
        Update: {
          deaths?: number
          kills?: number
          max_combo?: number
          score?: number
          signature_moves?: number
          updated_at?: string
          user_id?: string
          world?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          username: string
          character_skin: string | null
          last_seen_at: string | null
          status: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          username: string
          character_skin?: string | null
          last_seen_at?: string | null
          status?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
          character_skin?: string | null
          last_seen_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string | null
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      game_invites: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          world: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          world: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          world?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      game_history: {
        Row: {
          id: string
          session_id: string | null
          player_id: string
          world: string
          action_type: string
          source: string
          is_signature: boolean
          created_at: string
          stack_order: number | null
          queue_order: number | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          player_id: string
          world: string
          action_type: string
          source?: string
          is_signature?: boolean
          created_at?: string
          stack_order?: number | null
          queue_order?: number | null
        }
        Update: {
          id?: string
          session_id?: string | null
          player_id?: string
          world?: string
          action_type?: string
          source?: string
          is_signature?: boolean
          created_at?: string
          stack_order?: number | null
          queue_order?: number | null
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          id: string
          invite_id: string | null
          world: string
          host_id: string
          guest_id: string | null
          status: string
          started_at: string
          ended_at: string | null
          round_duration_seconds: number
          host_score: number
          guest_score: number
          winner_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invite_id?: string | null
          world: string
          host_id: string
          guest_id?: string | null
          status?: string
          started_at?: string
          ended_at?: string | null
          round_duration_seconds?: number
          host_score?: number
          guest_score?: number
          winner_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invite_id?: string | null
          world?: string
          host_id?: string
          guest_id?: string | null
          status?: string
          started_at?: string
          ended_at?: string | null
          round_duration_seconds?: number
          host_score?: number
          guest_score?: number
          winner_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      world_blocks: {
        Row: {
          id: string
          session_id: string | null
          player_id: string
          world: string
          x: number
          y: number
          z: number
          block_type: string
          color: string
          placed_at: string
          is_removed: boolean
          removed_at: string | null
          removed_by: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          player_id: string
          world?: string
          x: number
          y: number
          z: number
          block_type?: string
          color?: string
          placed_at?: string
          is_removed?: boolean
          removed_at?: string | null
          removed_by?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          player_id?: string
          world?: string
          x?: number
          y?: number
          z?: number
          block_type?: string
          color?: string
          placed_at?: string
          is_removed?: boolean
          removed_at?: string | null
          removed_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_public: {
        Row: {
          deaths: number | null
          kills: number | null
          max_combo: number | null
          score: number | null
          signature_moves: number | null
          updated_at: string | null
          username: string | null
          world: string | null
        }
        Relationships: []
      }
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
