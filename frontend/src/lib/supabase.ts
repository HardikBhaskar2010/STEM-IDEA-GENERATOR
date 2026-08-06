import { createClient } from '@supabase/supabase-js';
import { UserIdManager } from '@/utils/userIdManager';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL or Anon Key is missing. Please check your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

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
          chat_id: string;
          user_id: string | null;
          guest_id: string | null;
          role: string;
          content: string;
          intent: string | null;
          confidence: number | null;
          actions: any;
          project_snap: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          user_id?: string | null;
          guest_id?: string | null;
          role: string;
          content: string;
          intent?: string | null;
          confidence?: number | null;
          actions?: any;
          project_snap?: any;
          created_at?: string;
        };
      };

      veronica_project_chats: {
        Row: {
          id: string;
          user_id: string | null;
          guest_id: string | null;
          title: string;
          mode: string;
          project_id: string | null;
          message_count: number;
          last_message_at: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          guest_id?: string | null;
          title?: string;
          mode?: string;
          project_id?: string | null;
          is_archived?: boolean;
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

// ============================================================================
// User Preferences
// ============================================================================

const PREFS_LOCAL_KEY = 'user_preferences';

/**
 * Save user preferences.
 *
 * - **Authenticated**: upserts into `public.user_preferences` table.
 * - **Guest**: persists to localStorage under key `user_preferences`.
 *
 * @param prefs  Flat preference dict e.g. `{ dark_mode: true, language: 'en' }`
 * @param category  Preference namespace (default: 'general').
 */
export async function saveUserPreferences(
  prefs: Record<string, unknown>,
  category = 'general',
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Build upsert rows for each key
      const rows = Object.entries(prefs).map(([key, value]) => ({
        user_id: user.id,
        category,
        key,
        value,
      }));
      const { error } = await supabase
        .from('user_preferences')
        .upsert(rows, { onConflict: 'user_id,category,key' });
      if (error) {
        console.error('saveUserPreferences (Supabase):', error);
        return false;
      }
      return true;
    }

    // Fallback: localStorage
    const existing = JSON.parse(localStorage.getItem(PREFS_LOCAL_KEY) || '{}');
    localStorage.setItem(
      PREFS_LOCAL_KEY,
      JSON.stringify({ ...existing, [category]: { ...existing[category], ...prefs } }),
    );
    return true;
  } catch (err) {
    console.error('saveUserPreferences:', err);
    return false;
  }
}

/**
 * Load user preferences.
 *
 * - **Authenticated**: reads from `public.user_preferences`.
 * - **Guest**: reads from localStorage.
 *
 * Returns a nested dict: `{ general: { dark_mode: true }, veronica: { ... } }`
 * or filtered to a single category if `category` is provided.
 */
export async function loadUserPreferences(
  category?: string,
): Promise<Record<string, unknown>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      let query = supabase
        .from('user_preferences')
        .select('category, key, value')
        .eq('user_id', user.id);
      if (category) {query = query.eq('category', category);}

      const { data, error } = await query;
      if (error) {
        console.error('loadUserPreferences (Supabase):', error);
        return {};
      }
      if (category) {
        return Object.fromEntries((data ?? []).map(r => [r.key, r.value]));
      }
      const result: Record<string, Record<string, unknown>> = {};
      for (const row of data ?? []) {
        (result[row.category] ??= {})[row.key] = row.value;
      }
      return result;
    }

    // Fallback: localStorage
    const raw = localStorage.getItem(PREFS_LOCAL_KEY);
    if (!raw) {return {};}
    const all = JSON.parse(raw) as Record<string, Record<string, unknown>>;
    return category ? (all[category] ?? {}) : all;
  } catch (err) {
    console.error('loadUserPreferences:', err);
    return {};
  }
}

// ============================================================================
// Projects
// ============================================================================

/**
 * Upsert a project for the currently authenticated user.
 * Returns the saved project row, or null for guests / on error.
 */
export async function upsertProject(
  project: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return null;}

    const row = {
      ...(project.id ? { id: project.id } : {}),
      user_id:               user.id,
      title:                 project.title ?? project.name ?? 'Untitled',
      description:           project.description ?? null,
      difficulty:            project.difficulty ?? null,
      estimated_time:        project.estimatedTime ?? project.estimated_time ?? null,
      estimated_cost:        project.estimatedCost ?? project.estimated_cost ?? null,
      components:            project.components ?? [],
      skills:                project.skills ?? [],
      steps:                 project.steps ?? [],
      status:                project.status ?? 'planning',
      progress:              project.progress ?? 0,
      notes:                 project.notes ?? '',
      starred:               project.starred ?? false,
      tags:                  project.tags ?? [],
      completed_steps:       project.completedSteps ?? project.completed_steps ?? [],
      generated_from_params: project.generatedFromParams ?? project.generated_from_params ?? {},
    };

    const { data, error } = await supabase
      .from('projects')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('upsertProject:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('upsertProject:', err);
    return null;
  }
}

/**
 * List all projects for the current authenticated user, newest first.
 * Returns empty array for guests.
 */
export async function getUserProjects(): Promise<Record<string, unknown>[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return [];}

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getUserProjects:', error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('getUserProjects:', err);
    return [];
  }
}

// ============================================================================
// Veronica Chats
// ============================================================================

/**
 * Upsert a Veronica chat session for the current user.
 * Returns the saved chat row, or null for guests / on error.
 */
export async function upsertVeronicaChat(chat: {
  id?: string;
  title?: string;
  mode?: 'idea' | 'full_build' | 'debug';
  project_id?: string;
  is_archived?: boolean;
}): Promise<Record<string, unknown> | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const guest_id = user ? null : UserIdManager.getGuestId();

    if (!user && !guest_id) {return null;}

    const row = {
      ...(chat.id ? { id: chat.id } : {}),
      user_id:    user ? user.id : null,
      guest_id:   user ? null : guest_id,
      title:      chat.title ?? 'New Chat',
      mode:       chat.mode ?? 'idea',
      project_id: chat.project_id ?? null,
      is_archived: chat.is_archived ?? false,
    };

    const { data, error } = await supabase
      .from('veronica_project_chats')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('upsertVeronicaChat:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('upsertVeronicaChat:', err);
    return null;
  }
}

/**
 * Append or update a message in a Veronica chat.
 * Used for syncing real-time build logs to the DB.
 */
export async function upsertVeronicaMessage(
  msgId: string,
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
  meta?: { intent?: string; confidence?: number; actions?: unknown[]; projectSnap?: unknown },
): Promise<Record<string, unknown> | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const guest_id = user ? null : UserIdManager.getGuestId();

    if (!user && !guest_id) {return null;}

    const row = {
      id:          msgId,
      chat_id:     chatId,
      user_id:     user ? user.id : null,
      guest_id:    user ? null : guest_id,
      role,
      content,
      intent:      meta?.intent ?? null,
      confidence:  meta?.confidence ?? null,
      actions:     meta?.actions ?? [],
      project_snap: meta?.projectSnap ?? null,
    };

    const { data, error } = await supabase
      .from('veronica_chat_messages')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('upsertVeronicaMessage:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('upsertVeronicaMessage:', err);
    return null;
  }
}

/**
 * Append a message to a Veronica chat.
 * The DB trigger auto-updates message_count and last_message_at on the parent chat.
 */
export async function saveVeronicaMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
  meta?: { intent?: string; confidence?: number; actions?: unknown[]; projectSnap?: unknown },
): Promise<Record<string, unknown> | null> {
  // We can just proxy to upsert with a new UUID or use .insert
  return upsertVeronicaMessage(crypto.randomUUID(), chatId, role, content, meta);
}

/**
 * Load all non-archived Veronica chats for the current user,
 * with their messages nested inline.
 */
export async function getVeronicaChats(): Promise<Record<string, unknown>[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const guest_id = user ? null : UserIdManager.getGuestId();

    if (!user && !guest_id) {return [];}

    let query = supabase
      .from('veronica_project_chats')
      .select('*, veronica_chat_messages(id, role, content, intent, confidence, actions, created_at)')
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false });

    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.eq('guest_id', guest_id!);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getVeronicaChats:', error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('getVeronicaChats:', err);
    return [];
  }
}

/**
 * Permanently delete a Veronica chat and all its messages.
 */
export async function deleteVeronicaChat(chatId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const guest_id = user ? null : UserIdManager.getGuestId();

    if (!user && !guest_id) {return false;}

    let query = supabase
      .from('veronica_project_chats')
      .delete()
      .eq('id', chatId);

    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.eq('guest_id', guest_id!);
    }

    const { error } = await query;

    if (error) {
      console.error('deleteVeronicaChat:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteVeronicaChat:', err);
    return false;
  }
}

/**
 * Migrate all guest data to an authenticated user account.
 * This is called automatically upon user login.
 */
export async function migrateGuestData(guestId: string, userId: string): Promise<void> {
  try {
    // 1. Migrate chats
    await supabase.from('veronica_project_chats')
      .update({ user_id: userId, guest_id: null })
      .eq('guest_id', guestId);
      
    // 2. Migrate messages
    await supabase.from('veronica_chat_messages')
      .update({ user_id: userId, guest_id: null })
      .eq('guest_id', guestId);
      
    // 3. Clear guest ID since it's fully migrated
    UserIdManager.clearGuestId();
    console.log(`✅ Guest data (${guestId}) beautifully migrated to user account (${userId}).`);
  } catch (error) {
    console.error('Failed to migrate guest data:', error);
  }
}

