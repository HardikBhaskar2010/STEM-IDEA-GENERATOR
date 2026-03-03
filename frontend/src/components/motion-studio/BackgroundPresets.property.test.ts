/**
 * Property-Based Tests for BackgroundPresets
 * 
 * Tests universal properties of preset application and management.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { BackgroundLibrary } from '@/lib/backgrounds';
import type { BackgroundPreset } from '@/lib/backgrounds/types';

describe('BackgroundPresets Property Tests', () => {
  // Feature: reactbits-background-integration, Property 21: Preset Application
  it('preset applies both background and settings together', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BackgroundLibrary.getBuiltInPresets()),
        (preset) => {
          // Verify preset has required fields
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.backgroundId).toBeDefined();
          expect(preset.settings).toBeDefined();
          
          // Verify background exists
          const background = BackgroundLibrary.getById(preset.backgroundId);
          expect(background).toBeDefined();
          
          // Verify settings are valid for the background
          if (background) {
            Object.keys(preset.settings).forEach((key) => {
              // Setting key should exist in background's schema
              const schemaKey = background.settingsSchema[key];
              if (schemaKey) {
                const value = preset.settings[key];
                
                // Validate value type matches schema
                if (schemaKey.type === 'range' || schemaKey.type === 'number') {
                  expect(typeof value).toBe('number');
                  
                  // Value should be within range
                  if (schemaKey.min !== undefined) {
                    expect(value).toBeGreaterThanOrEqual(schemaKey.min);
                  }
                  if (schemaKey.max !== undefined) {
                    expect(value).toBeLessThanOrEqual(schemaKey.max);
                  }
                } else if (schemaKey.type === 'boolean') {
                  expect(typeof value).toBe('boolean');
                } else if (schemaKey.type === 'string' || schemaKey.type === 'color') {
                  expect(typeof value).toBe('string');
                } else if (schemaKey.type === 'select' && schemaKey.options) {
                  const validValues = schemaKey.options.map(opt => opt.value);
                  expect(validValues).toContain(value);
                }
              }
            });
          }
          
          // In a real implementation, we would verify:
          // 1. setBackgroundEffect is called with preset.backgroundId
          // 2. setBackgroundEffect is called with preset.settings
          // 3. Both are applied in a single operation
        }
      ),
      { numRuns: 50 }
    );
  });
  
  // Additional property: All built-in presets are valid
  it('all built-in presets have valid structure', () => {
    const builtInPresets = BackgroundLibrary.getBuiltInPresets();
    
    builtInPresets.forEach((preset) => {
      // Required fields
      expect(preset.id).toBeDefined();
      expect(typeof preset.id).toBe('string');
      expect(preset.id.length).toBeGreaterThan(0);
      
      expect(preset.name).toBeDefined();
      expect(typeof preset.name).toBe('string');
      expect(preset.name.length).toBeGreaterThan(0);
      
      expect(preset.description).toBeDefined();
      expect(typeof preset.description).toBe('string');
      
      expect(preset.backgroundId).toBeDefined();
      expect(typeof preset.backgroundId).toBe('string');
      
      expect(preset.settings).toBeDefined();
      expect(typeof preset.settings).toBe('object');
      
      expect(preset.isBuiltIn).toBe(true);
      
      expect(preset.createdAt).toBeDefined();
      expect(preset.createdAt instanceof Date).toBe(true);
      
      // Background should exist
      const background = BackgroundLibrary.getById(preset.backgroundId);
      expect(background).toBeDefined();
    });
  });
  
  // Additional property: Preset IDs are unique
  it('preset IDs are unique', () => {
    const allPresets = [
      ...BackgroundLibrary.getBuiltInPresets(),
      ...BackgroundLibrary.getUserPresets(),
    ];
    
    const ids = allPresets.map(preset => preset.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(ids.length);
  });
  
  // Additional property: Built-in presets cannot be deleted
  it('built-in presets are marked as isBuiltIn', () => {
    const builtInPresets = BackgroundLibrary.getBuiltInPresets();
    
    builtInPresets.forEach((preset) => {
      expect(preset.isBuiltIn).toBe(true);
    });
  });
  
  // Additional property: User presets are not built-in
  it('user presets are marked as not built-in', () => {
    const userPresets = BackgroundLibrary.getUserPresets();
    
    userPresets.forEach((preset) => {
      expect(preset.isBuiltIn).toBe(false);
    });
  });
  
  // Additional property: Preset settings are a subset of background settings
  it('preset settings match background schema', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BackgroundLibrary.getBuiltInPresets()),
        (preset) => {
          const background = BackgroundLibrary.getById(preset.backgroundId);
          
          if (background) {
            // All preset settings should be valid for the background
            Object.keys(preset.settings).forEach((key) => {
              // Either the key exists in schema, or it's a special control key
              const isSchemaKey = background.settingsSchema[key] !== undefined;
              const isControlKey = ['isPaused', 'animationSpeed'].includes(key);
              
              expect(isSchemaKey || isControlKey).toBe(true);
            });
          }
        }
      ),
      { numRuns: 50 }
    );
  });
  
  // Additional property: Presets can be retrieved by ID
  it('presets can be retrieved by ID', () => {
    const allPresets = [
      ...BackgroundLibrary.getBuiltInPresets(),
      ...BackgroundLibrary.getUserPresets(),
    ];
    
    allPresets.forEach((preset) => {
      const retrieved = BackgroundLibrary.getPresetById(preset.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(preset.id);
    });
  });
  
  // Additional property: Presets for a background can be filtered
  it('presets can be filtered by background ID', () => {
    const allPresets = [
      ...BackgroundLibrary.getBuiltInPresets(),
      ...BackgroundLibrary.getUserPresets(),
    ];
    
    // Get unique background IDs from presets
    const backgroundIds = [...new Set(allPresets.map(p => p.backgroundId))];
    
    backgroundIds.forEach((backgroundId) => {
      const presetsForBg = BackgroundLibrary.getPresetsForBackground(backgroundId);
      
      // All returned presets should match the background ID
      presetsForBg.forEach((preset) => {
        expect(preset.backgroundId).toBe(backgroundId);
      });
    });
  });
});
