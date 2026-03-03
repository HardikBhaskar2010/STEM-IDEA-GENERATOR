/**
 * Effects Registry - Central Hub for All Effects
 * 
 * This is the single source of truth for all available effects in the system.
 * Effects are registered here and can be retrieved by ID, type, or performance mode.
 */

import type {
  AnyEffect,
  EffectType,
  EffectsRegistryInterface,
  PerformanceMode,
} from '@/types/effects';

class EffectsRegistry implements EffectsRegistryInterface {
  private effects: Map<string, AnyEffect> = new Map();
  
  /**
   * Register a new effect in the registry
   */
  register(effect: AnyEffect): void {
    if (this.effects.has(effect.id)) {
      console.warn(`Effect with id "${effect.id}" is already registered. Overwriting.`);
    }
    this.effects.set(effect.id, effect);
  }
  
  /**
   * Unregister an effect from the registry
   */
  unregister(id: string): void {
    if (!this.effects.has(id)) {
      console.warn(`Effect with id "${id}" not found in registry.`);
      return;
    }
    this.effects.delete(id);
  }
  
  /**
   * Get a specific effect by ID
   */
  get(id: string): AnyEffect | undefined {
    return this.effects.get(id);
  }
  
  /**
   * Get all effects of a specific type
   */
  getByType(type: EffectType): AnyEffect[] {
    return Array.from(this.effects.values()).filter(
      (effect) => effect.type === type
    );
  }
  
  /**
   * Get all registered effects
   */
  getAll(): AnyEffect[] {
    return Array.from(this.effects.values());
  }
  
  /**
   * Search effects by name, description, or tags
   */
  search(query: string): AnyEffect[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.effects.values()).filter(
      (effect) =>
        effect.name.toLowerCase().includes(lowerQuery) ||
        effect.description?.toLowerCase().includes(lowerQuery) ||
        effect.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }
  
  /**
   * Filter effects by custom predicate
   */
  filter(predicate: (effect: AnyEffect) => boolean): AnyEffect[] {
    return Array.from(this.effects.values()).filter(predicate);
  }
  
  /**
   * Get effects that support a specific performance mode
   */
  getForPerformanceMode(mode: PerformanceMode): AnyEffect[] {
    return Array.from(this.effects.values()).filter((effect) =>
      effect.performanceModes.includes(mode)
    );
  }
  
  /**
   * Get effect statistics
   */
  getStats() {
    const all = this.getAll();
    return {
      total: all.length,
      text: this.getByType('text').length,
      cursor: this.getByType('cursor').length,
      background: this.getByType('background').length,
      ui: this.getByType('ui').length,
    };
  }
}

// Singleton instance
export const effectsRegistry = new EffectsRegistry();

// Export type for dependency injection
export type { EffectsRegistryInterface };
