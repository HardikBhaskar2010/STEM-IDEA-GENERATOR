/**
 * Preset Service - CRUD operations for effect presets
 * Phase 8: Preset System & Persistence
 */

import { supabase } from '@/lib/supabase';
import { UserIdManager } from '@/utils/userIdManager';
import type { EffectPreset } from '@/types/effects';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PresetCreateInput {
  name: string;
  description?: string;
  effects: EffectPreset['effects'];
  isPublic?: boolean;
  thumbnail?: string;
}

export interface PresetUpdateInput {
  name?: string;
  description?: string;
  effects?: EffectPreset['effects'];
  isPublic?: boolean;
  thumbnail?: string;
}

// ============================================================================
// PRESET CRUD OPERATIONS
// ============================================================================

/**
 * Save a new preset to the database
 */
export async function savePreset(input: PresetCreateInput): Promise<EffectPreset | null> {
  try {
    const userId = await UserIdManager.ensureUserExists();
    
    const { data, error } = await supabase
      .from('effect_presets')
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description || null,
        effects: input.effects,
        is_public: input.isPublic || false,
        thumbnail: input.thumbnail || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving preset:', error);
      return null;
    }

    return mapDatabasePresetToEffectPreset(data);
  } catch (error) {
    console.error('Unexpected error saving preset:', error);
    return null;
  }
}

/**
 * Get all presets for the current user
 */
export async function getUserPresets(): Promise<EffectPreset[]> {
  try {
    const userId = await UserIdManager.ensureUserExists();
    
    const { data, error } = await supabase
      .from('effect_presets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user presets:', error);
      return [];
    }

    return data.map(mapDatabasePresetToEffectPreset);
  } catch (error) {
    console.error('Unexpected error fetching user presets:', error);
    return [];
  }
}

/**
 * Get all public presets
 */
export async function getPublicPresets(): Promise<EffectPreset[]> {
  try {
    const { data, error } = await supabase
      .from('effect_presets')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching public presets:', error);
      return [];
    }

    return data.map(mapDatabasePresetToEffectPreset);
  } catch (error) {
    console.error('Unexpected error fetching public presets:', error);
    return [];
  }
}

/**
 * Get a specific preset by ID
 */
export async function getPresetById(id: string): Promise<EffectPreset | null> {
  try {
    const { data, error } = await supabase
      .from('effect_presets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching preset:', error);
      return null;
    }

    return mapDatabasePresetToEffectPreset(data);
  } catch (error) {
    console.error('Unexpected error fetching preset:', error);
    return null;
  }
}

/**
 * Update an existing preset
 */
export async function updatePreset(
  id: string,
  updates: PresetUpdateInput
): Promise<EffectPreset | null> {
  try {
    const userId = await UserIdManager.ensureUserExists();
    
    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.effects !== undefined) updateData.effects = updates.effects;
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
    if (updates.thumbnail !== undefined) updateData.thumbnail = updates.thumbnail;

    const { data, error } = await supabase
      .from('effect_presets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Ensure user owns the preset
      .select()
      .single();

    if (error) {
      console.error('Error updating preset:', error);
      return null;
    }

    return mapDatabasePresetToEffectPreset(data);
  } catch (error) {
    console.error('Unexpected error updating preset:', error);
    return null;
  }
}

/**
 * Delete a preset
 */
export async function deletePreset(id: string): Promise<boolean> {
  try {
    const userId = await UserIdManager.ensureUserExists();
    
    const { error } = await supabase
      .from('effect_presets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Ensure user owns the preset

    if (error) {
      console.error('Error deleting preset:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error deleting preset:', error);
    return false;
  }
}

/**
 * Duplicate a preset (create a copy)
 */
export async function duplicatePreset(id: string): Promise<EffectPreset | null> {
  try {
    // First, fetch the original preset
    const original = await getPresetById(id);
    
    if (!original) {
      console.error('Preset not found for duplication');
      return null;
    }

    // Create a new preset with copied data
    const duplicate = await savePreset({
      name: `${original.name} (Copy)`,
      description: original.description || undefined,
      effects: original.effects,
      isPublic: false, // Duplicates are private by default
      thumbnail: original.thumbnail || undefined,
    });

    return duplicate;
  } catch (error) {
    console.error('Unexpected error duplicating preset:', error);
    return null;
  }
}

/**
 * Toggle preset public visibility
 */
export async function togglePresetPublic(id: string): Promise<EffectPreset | null> {
  try {
    const userId = await UserIdManager.ensureUserExists();
    
    // First get current state
    const { data: current, error: fetchError } = await supabase
      .from('effect_presets')
      .select('is_public')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !current) {
      console.error('Error fetching preset for toggle:', fetchError);
      return null;
    }

    // Toggle the value
    const { data, error } = await supabase
      .from('effect_presets')
      .update({ 
        is_public: !current.is_public,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling preset visibility:', error);
      return null;
    }

    return mapDatabasePresetToEffectPreset(data);
  } catch (error) {
    console.error('Unexpected error toggling preset:', error);
    return null;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map database row to EffectPreset type
 */
function mapDatabasePresetToEffectPreset(data: any): EffectPreset {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    userId: data.user_id,
    isPublic: data.is_public,
    effects: data.effects,
    thumbnail: data.thumbnail,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Validate preset structure before import
 */
export function validatePresetStructure(preset: any): boolean {
  try {
    // Check required fields
    if (!preset || typeof preset !== 'object') return false;
    if (!preset.name || typeof preset.name !== 'string') return false;
    if (!preset.effects || typeof preset.effects !== 'object') return false;

    // Check effects structure
    const { effects } = preset;
    
    // At least one effect type should be present
    if (!effects.text && !effects.cursor && !effects.background && !effects.ui) {
      return false;
    }

    // Validate each effect if present
    if (effects.text && !validateEffectConfig(effects.text)) return false;
    if (effects.cursor && !validateEffectConfig(effects.cursor)) return false;
    if (effects.background && !validateEffectConfig(effects.background)) return false;
    if (effects.ui && !validateEffectConfig(effects.ui)) return false;

    return true;
  } catch (error) {
    console.error('Error validating preset structure:', error);
    return false;
  }
}

/**
 * Validate individual effect configuration
 */
function validateEffectConfig(config: any): boolean {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.effectId === 'string' &&
    typeof config.settings === 'object'
  );
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const presetService = {
  savePreset,
  getUserPresets,
  getPublicPresets,
  getPresetById,
  updatePreset,
  deletePreset,
  duplicatePreset,
  togglePresetPublic,
  validatePresetStructure,
};
