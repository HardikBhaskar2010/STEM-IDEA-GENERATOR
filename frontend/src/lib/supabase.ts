import { createClient } from '@supabase/supabase-js';
import { UserIdManager } from '@/utils/userIdManager';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL or Anon Key is missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Database type definitions
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          guest_id: string;
          created_at: string;
          last_active: string;
          preferences: any;
          metadata: any;
        };
        Insert: {
          id?: string;
          guest_id: string;
          created_at?: string;
          last_active?: string;
          preferences?: any;
          metadata?: any;
        };
        Update: {
          guest_id?: string;
          last_active?: string;
          preferences?: any;
          metadata?: any;
        };
      };

      components: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string;
          price: number;
          currency: string;
          in_stock: boolean;
          stock_count: number;
          manufacturer: string;
          model_number: string;
          datasheet_url: string;
          image_url: string;
          specifications: any;
          tags: string[];
          dimensions: any;
          weight: number;
          operating_voltage_min: number;
          operating_voltage_max: number;
          operating_current: number;
          power_consumption: number;
          interface_type: string;
          pin_count: number;
          package_type: string;
          created_at: string;
          updated_at: string;
        };
      };

      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          difficulty: string;
          estimated_time: string;
          estimated_cost: string;
          components: string[];
          skills: string[];
          steps: string[];
          status: string;
          progress: number;
          notes: string;
          starred: boolean;
          tags: string[];
          completed_steps: number[];
          generated_from_params: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          difficulty?: string;
          estimated_time?: string;
          estimated_cost?: string;
          components?: string[];
          skills?: string[];
          steps?: string[];
          status?: string;
          progress?: number;
          notes?: string;
          starred?: boolean;
          tags?: string[];
          completed_steps?: number[];
          generated_from_params?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          difficulty?: string;
          estimated_time?: string;
          estimated_cost?: string;
          components?: string[];
          skills?: string[];
          steps?: string[];
          status?: string;
          progress?: number;
          notes?: string;
          starred?: boolean;
          tags?: string[];
          completed_steps?: number[];
          generated_from_params?: any;
          updated_at?: string;
        };
      };

      chat_messages: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          session_id: string;
          role: string;
          content: string;
          message_type: string;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          session_id: string;
          role: string;
          content: string;
          message_type?: string;
          metadata?: any;
          created_at?: string;
        };
      };

      effect_presets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          effects: any; // JSONB - EffectPreset['effects']
          is_public: boolean;
          thumbnail: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          effects: any;
          is_public?: boolean;
          thumbnail?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          effects?: any;
          is_public?: boolean;
          thumbnail?: string | null;
          updated_at?: string;
        };
      };
    };
  };
};

/**
 * Initialize or get user in Supabase
 */
export async function ensureUserExists(): Promise<string | null> {
  try {
    const guestId = UserIdManager.getGuestId();

    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('guest_id', guestId)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking user:', selectError);
      return null;
    }

    if (existingUser) {
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('guest_id', guestId);

      return existingUser.id;
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        guest_id: guestId,
        last_active: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return null;
    }

    console.log('✅ New user created in Supabase:', newUser.id);
    return newUser.id;
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    return null;
  }
}
