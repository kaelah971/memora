import type {
  CreatorActionStatus,
  CreatorActionType,
  CreatorEventType,
  InteractionType,
  Platform,
  QuestionStatus,
  SourceType,
} from "@/types/data";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      creators: TableDefinition<
        {
          id: string;
          user_id: string | null;
          display_name: string;
          slug: string | null;
          timezone: string | null;
          voice_preference: import("@/types/data").CreatorVoice;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string | null;
          display_name: string;
          slug?: string | null;
          timezone?: string | null;
          voice_preference?: import("@/types/data").CreatorVoice;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string | null;
          display_name?: string;
          slug?: string | null;
          timezone?: string | null;
          voice_preference?: import("@/types/data").CreatorVoice;
          created_at?: string;
          updated_at?: string;
        }
      >;
      discord_connections: TableDefinition<
        {
          id: string;
          creator_id: string;
          guild_id: string;
          guild_name: string;
          installed_by_user_id: string | null;
          selected_channel_ids: string[];
          created_at: string;
          updated_at: string;
          last_import_at: string | null;
        },
        {
          id?: string;
          creator_id: string;
          guild_id: string;
          guild_name: string;
          installed_by_user_id?: string | null;
          selected_channel_ids?: string[];
          created_at?: string;
          updated_at?: string;
          last_import_at?: string | null;
        },
        {
          id?: string;
          creator_id?: string;
          guild_id?: string;
          guild_name?: string;
          installed_by_user_id?: string | null;
          selected_channel_ids?: string[];
          created_at?: string;
          updated_at?: string;
          last_import_at?: string | null;
        }
      >;
      discord_onboarding_settings: TableDefinition<
        {
          id: string;
          creator_id: string;
          discord_connection_id: string;
          enabled: boolean;
          send_mode: "draft_only" | "auto_send_welcome_only" | "auto_send_clear_guide_requests";
          welcome_channel_id: string | null;
          resource_channel_id: string | null;
          question_channel_id: string | null;
          support_channel_id: string | null;
          builder_channel_id: string | null;
          beginner_guide_text: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          creator_id: string;
          discord_connection_id: string;
          enabled?: boolean;
          send_mode?: "draft_only" | "auto_send_welcome_only" | "auto_send_clear_guide_requests";
          welcome_channel_id?: string | null;
          resource_channel_id?: string | null;
          question_channel_id?: string | null;
          support_channel_id?: string | null;
          builder_channel_id?: string | null;
          beginner_guide_text?: string;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          creator_id?: string;
          discord_connection_id?: string;
          enabled?: boolean;
          send_mode?: "draft_only" | "auto_send_welcome_only" | "auto_send_clear_guide_requests";
          welcome_channel_id?: string | null;
          resource_channel_id?: string | null;
          question_channel_id?: string | null;
          support_channel_id?: string | null;
          builder_channel_id?: string | null;
          beginner_guide_text?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      discord_onboarding_receipts: TableDefinition<
        {
          id: string;
          creator_id: string;
          discord_connection_id: string;
          guild_id: string;
          channel_id: string;
          discord_user_id: string;
          discord_username: string;
          trigger_type: "member_join" | "first_message" | "guide_request" | "manual_test";
          source_message_id: string | null;
          mind_conversation_id: string | null;
          generated_message: string;
          sent_message_id: string | null;
          status: "drafted" | "sent" | "skipped" | "failed";
          reason: string;
          created_at: string;
        },
        {
          id?: string;
          creator_id: string;
          discord_connection_id: string;
          guild_id: string;
          channel_id: string;
          discord_user_id: string;
          discord_username: string;
          trigger_type: "member_join" | "first_message" | "guide_request" | "manual_test";
          source_message_id?: string | null;
          mind_conversation_id?: string | null;
          generated_message: string;
          sent_message_id?: string | null;
          status: "drafted" | "sent" | "skipped" | "failed";
          reason: string;
          created_at?: string;
        },
        {
          id?: string;
          creator_id?: string;
          discord_connection_id?: string;
          guild_id?: string;
          channel_id?: string;
          discord_user_id?: string;
          discord_username?: string;
          trigger_type?: "member_join" | "first_message" | "guide_request" | "manual_test";
          source_message_id?: string | null;
          mind_conversation_id?: string | null;
          generated_message?: string;
          sent_message_id?: string | null;
          status?: "drafted" | "sent" | "skipped" | "failed";
          reason?: string;
          created_at?: string;
        }
      >;
      sources: TableDefinition<
        {
          id: string;
          creator_id: string;
          platform: Platform;
          source_type: SourceType;
          external_id: string | null;
          title: string;
          url: string | null;
          published_at: string | null;
          imported_at: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          creator_id: string;
          platform: Platform;
          source_type: SourceType;
          external_id?: string | null;
          title: string;
          url?: string | null;
          published_at?: string | null;
          imported_at?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          creator_id?: string;
          platform?: Platform;
          source_type?: SourceType;
          external_id?: string | null;
          title?: string;
          url?: string | null;
          published_at?: string | null;
          imported_at?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      audience_members: TableDefinition<
        {
          id: string;
          creator_id: string;
          platform: Platform;
          platform_user_id: string | null;
          display_name: string;
          avatar_url: string | null;
          first_seen_at: string;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          creator_id: string;
          platform: Platform;
          platform_user_id?: string | null;
          display_name: string;
          avatar_url?: string | null;
          first_seen_at: string;
          last_seen_at: string;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          creator_id?: string;
          platform?: Platform;
          platform_user_id?: string | null;
          display_name?: string;
          avatar_url?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      interactions: TableDefinition<
        {
          id: string;
          creator_id: string;
          audience_member_id: string;
          source_id: string;
          platform: Platform;
          interaction_type: InteractionType;
          external_id: string | null;
          text: string;
          published_at: string;
          creator_replied: boolean;
          parent_interaction_id: string | null;
          like_count: number | null;
          reply_count: number | null;
          raw_metadata: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          creator_id: string;
          audience_member_id: string;
          source_id: string;
          platform: Platform;
          interaction_type: InteractionType;
          external_id?: string | null;
          text: string;
          published_at: string;
          creator_replied?: boolean;
          parent_interaction_id?: string | null;
          like_count?: number | null;
          reply_count?: number | null;
          raw_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          creator_id?: string;
          audience_member_id?: string;
          source_id?: string;
          platform?: Platform;
          interaction_type?: InteractionType;
          external_id?: string | null;
          text?: string;
          published_at?: string;
          creator_replied?: boolean;
          parent_interaction_id?: string | null;
          like_count?: number | null;
          reply_count?: number | null;
          raw_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      unresolved_questions: TableDefinition<
        {
          id: string;
          creator_id: string;
          audience_member_id: string;
          interaction_id: string;
          question_text: string;
          status: QuestionStatus;
          resolution_type: string | null;
          resolved_by_interaction_id: string | null;
          resolved_at: string | null;
          dismissed_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          creator_id: string;
          audience_member_id: string;
          interaction_id: string;
          question_text: string;
          status?: QuestionStatus;
          resolution_type?: string | null;
          resolved_by_interaction_id?: string | null;
          resolved_at?: string | null;
          dismissed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          creator_id?: string;
          audience_member_id?: string;
          interaction_id?: string;
          question_text?: string;
          status?: QuestionStatus;
          resolution_type?: string | null;
          resolved_by_interaction_id?: string | null;
          resolved_at?: string | null;
          dismissed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      creator_events: TableDefinition<
        {
          id: string;
          creator_id: string;
          event_type: CreatorEventType;
          source_id: string | null;
          external_id: string | null;
          title: string;
          description: string | null;
          occurred_at: string;
          payload: Json;
          processed_for_followups_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          creator_id: string;
          event_type: CreatorEventType;
          source_id?: string | null;
          external_id?: string | null;
          title: string;
          description?: string | null;
          occurred_at: string;
          payload?: Json;
          processed_for_followups_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          creator_id?: string;
          event_type?: CreatorEventType;
          source_id?: string | null;
          external_id?: string | null;
          title?: string;
          description?: string | null;
          occurred_at?: string;
          payload?: Json;
          processed_for_followups_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      creator_actions: TableDefinition<
        {
          id: string;
          creator_id: string;
          audience_member_id: string | null;
          interaction_id: string | null;
          creator_event_id: string | null;
          action_type: CreatorActionType;
          status: CreatorActionStatus;
          text: string | null;
          created_at: string;
          completed_at: string | null;
          metadata: Json;
        },
        {
          id?: string;
          creator_id: string;
          audience_member_id?: string | null;
          interaction_id?: string | null;
          creator_event_id?: string | null;
          action_type: CreatorActionType;
          status?: CreatorActionStatus;
          text?: string | null;
          created_at?: string;
          completed_at?: string | null;
          metadata?: Json;
        },
        {
          id?: string;
          creator_id?: string;
          audience_member_id?: string | null;
          interaction_id?: string | null;
          creator_event_id?: string | null;
          action_type?: CreatorActionType;
          status?: CreatorActionStatus;
          text?: string | null;
          created_at?: string;
          completed_at?: string | null;
          metadata?: Json;
        }
      >;
      follow_up_mind_reasoning: TableDefinition<
        {
          id: string;
          creator_id: string;
          opportunity_id: string;
          interaction_id: string;
          mind_id: string;
          conversation_id: string;
          reasoning_text: string;
          tone: string;
          variants: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          creator_id: string;
          opportunity_id: string;
          interaction_id: string;
          mind_id: string;
          conversation_id: string;
          reasoning_text: string;
          tone: string;
          variants?: Json;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          creator_id?: string;
          opportunity_id?: string;
          interaction_id?: string;
          mind_id?: string;
          conversation_id?: string;
          reasoning_text?: string;
          tone?: string;
          variants?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      youtube_connections: TableDefinition<
        {
          id: string;
          creator_id: string;
          google_account_id: string | null;
          youtube_channel_id: string;
          youtube_channel_title: string;
          youtube_channel_handle: string | null;
          access_token_ciphertext: string;
          refresh_token_ciphertext: string | null;
          token_expires_at: string | null;
          scopes: string[];
          connected_at: string;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          creator_id: string;
          google_account_id?: string | null;
          youtube_channel_id: string;
          youtube_channel_title: string;
          youtube_channel_handle?: string | null;
          access_token_ciphertext: string;
          refresh_token_ciphertext?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          connected_at?: string;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          creator_id?: string;
          google_account_id?: string | null;
          youtube_channel_id?: string;
          youtube_channel_title?: string;
          youtube_channel_handle?: string | null;
          access_token_ciphertext?: string;
          refresh_token_ciphertext?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          connected_at?: string;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
