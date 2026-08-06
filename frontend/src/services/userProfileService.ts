/**
 * userProfileService.ts
 *
 * Syncs an authenticated Supabase user's profile data into public.users
 * on every sign-in / profile update. Works silently — never throws; all
 * errors are logged only.
 *
 * Usage:
 *   import { userProfileService } from '@/services/userProfileService';
 *   await userProfileService.syncOnLogin(supabaseUser);
 */

import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserRow {
  auth_user_id: string;
  guest_id: string;          // always 'N/A' for email/OAuth users
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  provider: string;
  bio: string | null;
  email_notifications: boolean;
  email_marketing: boolean;
  last_active: string;
  preferences: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ProfileUpdatePayload {
  display_name?: string;
  avatar_url?: string;
  username?: string;
  bio?: string;
  email_notifications?: boolean;
  email_marketing?: boolean;
  preferences?: Record<string, unknown>;
}

// ── Service ──────────────────────────────────────────────────────────────────

class UserProfileService {
  /**
   * Called automatically on sign-in / token refresh.
   *
   * Behaviour for EXISTING users:
   *   1. Fetch their current row from public.users
   *   2. Merge auth-metadata on top (only filling NULL columns, never overwriting
   *      display_name / avatar_url the user manually set)
   *   3. Upsert the merged row and return it
   *
   * Behaviour for NEW users:
   *   Creates the row from scratch using auth metadata.
   */
  async syncOnLogin(user: User): Promise<UserRow | null> {
    try {
      const meta = user.user_metadata ?? {};
      const provider =
        (user.app_metadata?.provider as string | undefined) ??
        (user.app_metadata?.providers?.[0] as string | undefined) ??
        'email';

      // ── Step 1: fetch existing row ──────────────────────────────────────────
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      // ── Step 2: derive fallback values from auth metadata ───────────────────
      const authDisplayName =
        meta.full_name ??
        meta.name ??
        meta.display_name ??
        (user.email ? user.email.split('@')[0] : null);

      const authAvatarUrl = meta.avatar_url ?? meta.picture ?? null;
      const authUsername =
        meta.username ??
        (user.email ? user.email.split('@')[0] : null);

      // ── Step 3: build upsert payload (existing values take priority) ─────────
      const payload: Partial<UserRow> & { auth_user_id: string } = {
        auth_user_id:        user.id,
        guest_id:            existing?.guest_id ?? `auth:${user.id}`,
        email:               user.email ?? existing?.email ?? null,
        // Preserve manually set display_name; fall back to auth metadata
        display_name:
          existing?.display_name && existing.display_name !== authDisplayName
            ? existing.display_name   // user edited it — keep their version
            : authDisplayName,
        // Same for avatar
        avatar_url:
          existing?.avatar_url && existing.avatar_url !== authAvatarUrl
            ? existing.avatar_url
            : authAvatarUrl,
        username:            existing?.username ?? authUsername,
        provider,
        bio:                 existing?.bio ?? (meta.bio as string | undefined) ?? null,
        email_notifications: existing?.email_notifications ?? true,
        email_marketing:     existing?.email_marketing ?? false,
        last_active:         new Date().toISOString(),
        preferences:         existing?.preferences ?? {},
        metadata:            existing?.metadata ?? {},
      };

      // ── Step 4: insert or update manually ────────────────────────────────────
      // PostgREST ON CONFLICT only works with regular (non-partial) unique constraints.
      // Since idx_users_auth_user_id is a partial index, we do a manual SELECT → INSERT/UPDATE.
      let data: UserRow | null = null;
      let error: { message: string } | null = null;

      if (existing) {
        // Row exists → UPDATE
        const { data: updated, error: updateErr } = await supabase
          .from('users')
          .update({
            email:               payload.email,
            display_name:        payload.display_name,
            avatar_url:          payload.avatar_url,
            username:            payload.username,
            provider:            payload.provider,
            bio:                 payload.bio,
            email_notifications: payload.email_notifications,
            email_marketing:     payload.email_marketing,
            last_active:         payload.last_active,
            preferences:         payload.preferences,
            metadata:            payload.metadata,
          })
          .eq('auth_user_id', user.id)
          .select()
          .single();
        data = updated as UserRow | null;
        error = updateErr;
      } else {
        // No row yet → INSERT
        const { data: inserted, error: insertErr } = await supabase
          .from('users')
          .insert(payload)
          .select()
          .single();
        data = inserted as UserRow | null;
        error = insertErr;
      }

      if (error) {
        console.warn('⚠️ userProfileService.syncOnLogin failed:', error.message);
        // Still return existing data so the UI doesn't break
        return (existing ?? null) as UserRow | null;
      }

      console.log(
        existing
          ? '🔄 Existing user profile synced:'
          : '✅ New user profile created:',
        data?.auth_user_id,
      );
      return data as UserRow;
    } catch (err) {
      console.warn('⚠️ userProfileService.syncOnLogin threw:', err);
      return null;
    }
  }

  /**
   * Fetch the current user's row from public.users.
   */
  async getProfile(userId: string): Promise<UserRow | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (error || !data) {return null;}
      return data as UserRow;
    } catch {
      return null;
    }
  }

  /**
   * Partial update — only sends changed fields.
   * Updates both public.users and public.profiles in parallel.
   */
  async updateProfile(
    userId: string,
    updates: ProfileUpdatePayload,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Update public.users
      const { error: usersError } = await supabase
        .from('users')
        .update({ ...updates, last_active: new Date().toISOString() })
        .eq('auth_user_id', userId);

      // Mirror display_name / avatar_url / username into public.profiles
      const profileUpdates: Record<string, unknown> = {};
      if (updates.display_name !== undefined) {profileUpdates.display_name = updates.display_name;}
      if (updates.avatar_url !== undefined)   {profileUpdates.avatar_url   = updates.avatar_url;}
      if (updates.username !== undefined)     {profileUpdates.username      = updates.username;}
      if (updates.bio !== undefined)          {profileUpdates.bio           = updates.bio;}
      if (updates.preferences !== undefined)  {profileUpdates.preferences   = updates.preferences;}

      let profilesError: { message: string } | null = null;
      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('user_id', userId);
        profilesError = error;
      }

      if (usersError || profilesError) {
        const msg = usersError?.message ?? profilesError?.message ?? 'Unknown error';
        console.warn('⚠️ updateProfile error:', msg);
        return { ok: false, error: msg };
      }

      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  }

  /**
   * Update last_active timestamp (call on meaningful interactions).
   */
  async touchLastActive(_userId: string): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
    } catch {
      // Ignore background active timestamp update failure
    }
  }
}

export const userProfileService = new UserProfileService();
