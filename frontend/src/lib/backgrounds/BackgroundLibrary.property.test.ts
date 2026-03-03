/**
 * BackgroundLibrary Property-Based Tests
 * 
 * Task 1.3: Write property test for BackgroundLibrary completeness
 * 
 * Property 1: Background Library Completeness
 * **Validates: Requirements 1.3, 8.4, 15.1, 20.1**
 * 
 * For any background in the BackgroundLibrary, it SHALL have all required 
 * metadata fields populated (id, name, description, category, tags, thumbnailUrl, 
 * performanceLevel, estimatedFPS, supportsTheme, supportsAnimationControl, 
 * supportsSpeedControl, defaultSettings, settingsSchema, importPath, bundleSize).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import BackgroundLibrary from './BackgroundLibrary';
import type { BackgroundMetadata } from './types';

describe('BackgroundLibrary Property-Based Tests', () => {
  describe('Property 1: Background Library Completeness', () => {
    // Feature: reactbits-background-integration, Property 1: Background Library Completeness
    it('all backgrounds have complete metadata with all required fields populated', () => {
      // Get all backgrounds from the library
      const backgrounds = BackgroundLibrary.backgrounds;
      
      // Ensure we have backgrounds to test
      expect(backgrounds.length).toBeGreaterThan(0);
      
      // Property test: For any background in the library, all required fields must be present and valid
      fc.assert(
        fc.property(
          fc.constantFrom(...backgrounds),
          (background: BackgroundMetadata) => {
            // Required field: id (non-empty string)
            expect(background.id).toBeDefined();
            expect(typeof background.id).toBe('string');
            expect(background.id.length).toBeGreaterThan(0);
            
            // Required field: name (non-empty string)
            expect(background.name).toBeDefined();
            expect(typeof background.name).toBe('string');
            expect(background.name.length).toBeGreaterThan(0);
            
            // Required field: description (non-empty string)
            expect(background.description).toBeDefined();
            expect(typeof background.description).toBe('string');
            expect(background.description.length).toBeGreaterThan(0);
            
            // Required field: category (valid category value)
            expect(background.category).toBeDefined();
            expect(typeof background.category).toBe('string');
            expect(['fluid', 'geometric', 'particle', 'gradient', 'atmospheric']).toContain(background.category);
            
            // Required field: tags (non-empty array)
            expect(background.tags).toBeDefined();
            expect(Array.isArray(background.tags)).toBe(true);
            expect(background.tags.length).toBeGreaterThan(0);
            background.tags.forEach(tag => {
              expect(typeof tag).toBe('string');
              expect(tag.length).toBeGreaterThan(0);
            });
            
            // Required field: thumbnailUrl (non-empty string)
            expect(background.thumbnailUrl).toBeDefined();
            expect(typeof background.thumbnailUrl).toBe('string');
            expect(background.thumbnailUrl.length).toBeGreaterThan(0);
            
            // Required field: performanceLevel (valid value)
            expect(background.performanceLevel).toBeDefined();
            expect(typeof background.performanceLevel).toBe('string');
            expect(['light', 'medium', 'heavy']).toContain(background.performanceLevel);
            
            // Required field: estimatedFPS (positive number)
            expect(background.estimatedFPS).toBeDefined();
            expect(typeof background.estimatedFPS).toBe('number');
            expect(background.estimatedFPS).toBeGreaterThan(0);
            
            // Required field: supportsTheme (boolean)
            expect(background.supportsTheme).toBeDefined();
            expect(typeof background.supportsTheme).toBe('boolean');
            
            // Required field: supportsAnimationControl (boolean)
            expect(background.supportsAnimationControl).toBeDefined();
            expect(typeof background.supportsAnimationControl).toBe('boolean');
            
            // Required field: supportsSpeedControl (boolean)
            expect(background.supportsSpeedControl).toBeDefined();
            expect(typeof background.supportsSpeedControl).toBe('boolean');
            
            // Required field: defaultSettings (non-null object)
            expect(background.defaultSettings).toBeDefined();
            expect(typeof background.defaultSettings).toBe('object');
            expect(background.defaultSettings).not.toBeNull();
            
            // Required field: settingsSchema (non-null object)
            expect(background.settingsSchema).toBeDefined();
            expect(typeof background.settingsSchema).toBe('object');
            expect(background.settingsSchema).not.toBeNull();
            
            // Required field: importPath (non-empty string)
            expect(background.importPath).toBeDefined();
            expect(typeof background.importPath).toBe('string');
            expect(background.importPath.length).toBeGreaterThan(0);
            
            // Required field: bundleSize (positive number)
            expect(background.bundleSize).toBeDefined();
            expect(typeof background.bundleSize).toBe('number');
            expect(background.bundleSize).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validates all 21 backgrounds have complete metadata using validateMetadata method', () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      // Verify we have exactly 21 backgrounds as specified in requirements
      expect(backgrounds.length).toBe(21);
      
      // Property test: Every background passes the validateMetadata check
      fc.assert(
        fc.property(
          fc.constantFrom(...backgrounds),
          (background: BackgroundMetadata) => {
            const isValid = BackgroundLibrary.validateMetadata(background);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ensures no background has null, undefined, or empty string values for required fields', () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      fc.assert(
        fc.property(
          fc.constantFrom(...backgrounds),
          (background: BackgroundMetadata) => {
            // Check all string fields are not empty
            const stringFields: (keyof BackgroundMetadata)[] = [
              'id', 'name', 'description', 'category', 'thumbnailUrl', 
              'performanceLevel', 'importPath'
            ];
            
            stringFields.forEach(field => {
              const value = background[field];
              expect(value).not.toBeNull();
              expect(value).not.toBeUndefined();
              expect(value).not.toBe('');
            });
            
            // Check numeric fields are valid numbers
            expect(background.estimatedFPS).not.toBeNull();
            expect(background.estimatedFPS).not.toBeUndefined();
            expect(Number.isFinite(background.estimatedFPS)).toBe(true);
            
            expect(background.bundleSize).not.toBeNull();
            expect(background.bundleSize).not.toBeUndefined();
            expect(Number.isFinite(background.bundleSize)).toBe(true);
            
            // Check boolean fields are actual booleans
            expect(typeof background.supportsTheme).toBe('boolean');
            expect(typeof background.supportsAnimationControl).toBe('boolean');
            expect(typeof background.supportsSpeedControl).toBe('boolean');
            
            // Check object fields are not null
            expect(background.defaultSettings).not.toBeNull();
            expect(background.settingsSchema).not.toBeNull();
            expect(background.tags).not.toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verifies settingsSchema has valid structure for all backgrounds', () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      fc.assert(
        fc.property(
          fc.constantFrom(...backgrounds),
          (background: BackgroundMetadata) => {
            const schema = background.settingsSchema;
            
            // Schema should be an object with at least one setting
            expect(Object.keys(schema).length).toBeGreaterThan(0);
            
            // Each setting should have required properties
            Object.entries(schema).forEach(([key, setting]) => {
              expect(key).toBeTruthy();
              expect(setting).toBeDefined();
              expect(setting.type).toBeDefined();
              expect(typeof setting.type).toBe('string');
              expect(setting.defaultValue).toBeDefined();
              
              // Label should be present and non-empty
              if ('label' in setting) {
                expect(typeof setting.label).toBe('string');
                expect(setting.label.length).toBeGreaterThan(0);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verifies defaultSettings keys match settingsSchema keys for all backgrounds', () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      fc.assert(
        fc.property(
          fc.constantFrom(...backgrounds),
          (background: BackgroundMetadata) => {
            const defaultKeys = Object.keys(background.defaultSettings).sort();
            const schemaKeys = Object.keys(background.settingsSchema).sort();
            
            // Every key in defaultSettings should have a corresponding schema entry
            defaultKeys.forEach(key => {
              expect(schemaKeys).toContain(key);
            });
            
            // Every key in settingsSchema should have a default value
            schemaKeys.forEach(key => {
              expect(defaultKeys).toContain(key);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ensures documentationUrl is present and valid when provided', () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      fc.assert(
        fc.property(
          fc.constantFrom(...backgrounds),
          (background: BackgroundMetadata) => {
            // documentationUrl is optional but if present should be valid
            if (background.documentationUrl) {
              expect(typeof background.documentationUrl).toBe('string');
              expect(background.documentationUrl.length).toBeGreaterThan(0);
              // Should be a URL starting with http or https
              expect(
                background.documentationUrl.startsWith('http://') || 
                background.documentationUrl.startsWith('https://')
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verifies all backgrounds have unique IDs', () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const ids = backgrounds.map(bg => bg.id);
      const uniqueIds = new Set(ids);
      
      // All IDs should be unique
      expect(uniqueIds.size).toBe(ids.length);
      
      // Property test: Each background ID should be unique
      fc.assert(
        fc.property(
          fc.constantFrom(...backgrounds),
          (background: BackgroundMetadata) => {
            const matchingBackgrounds = backgrounds.filter(bg => bg.id === background.id);
            expect(matchingBackgrounds.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Category Organization', () => {
    // Feature: reactbits-background-integration, Property 2: Category Organization
    it('each background belongs to exactly one valid category', () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const validCategories: BackgroundCategory[] = ['fluid', 'geometric', 'particle', 'gradient', 'atmospheric'];
      
      // Property test: For any background, it must have exactly one valid category
      fc.assert(
        fc.property(
          fc.constantFrom(...backgrounds),
          (background: BackgroundMetadata) => {
            // Background must have a category
            expect(background.category).toBeDefined();
            expect(typeof background.category).toBe('string');
            
            // Category must be one of the valid categories
            expect(validCategories).toContain(background.category);
            
            // Category must be exactly one value (not an array or multiple values)
            expect(Array.isArray(background.category)).toBe(false);
            
            // Verify using the library's validation method
            expect(BackgroundLibrary.isValidCategory(background.category)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('category grouping function correctly groups all backgrounds by their assigned category', () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const categories = BackgroundLibrary.categories;
      const validCategories: BackgroundCategory[] = ['fluid', 'geometric', 'particle', 'gradient', 'atmospheric'];
      
      // Verify all valid categories exist in the grouping
      validCategories.forEach(category => {
        expect(categories[category]).toBeDefined();
        expect(Array.isArray(categories[category])).toBe(true);
      });
      
      // Property test: For any background, it appears in exactly one category group
      fc.assert(
        fc.property(
          fc.constantFrom(...backgrounds),
          (background: BackgroundMetadata) => {
            let foundCount = 0;
            let foundInCategory: BackgroundCategory | null = null;
            
            // Check each category group
            validCategories.forEach(category => {
              if (categories[category].includes(background.id)) {
                foundCount++;
                foundInCategory = category;
              }
            });
            
            // Background must appear in exactly one category group
            expect(foundCount).toBe(1);
            
            // The category it's found in must match its assigned category
            expect(foundInCategory).toBe(background.category);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all backgrounds are accounted for in category grouping', () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const categories = BackgroundLibrary.categories;
      
      // Collect all background IDs from category groups
      const allGroupedIds = new Set<string>();
      Object.values(categories).forEach(categoryIds => {
        categoryIds.forEach(id => allGroupedIds.add(id));
      });
      
      // Every background should be in exactly one category group
      backgrounds.forEach(background => {
        expect(allGroupedIds.has(background.id)).toBe(true);
      });
      
      // Total count should match
      expect(allGroupedIds.size).toBe(backgrounds.length);
    });

    it('category groups contain only valid background IDs', () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const categories = BackgroundLibrary.categories;
      const validIds = new Set(backgrounds.map(bg => bg.id));
      
      // Property test: For any category, all IDs in that category group are valid
      fc.assert(
        fc.property(
          fc.constantFrom(...BackgroundLibrary.getValidCategories()),
          (category: BackgroundCategory) => {
            const categoryIds = categories[category];
            
            // All IDs in the category group must be valid background IDs
            categoryIds.forEach(id => {
              expect(validIds.has(id)).toBe(true);
              
              // Verify the background with this ID actually has this category
              const background = BackgroundLibrary.getById(id);
              expect(background).toBeDefined();
              expect(background?.category).toBe(category);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getByCategory method returns backgrounds matching the specified category', () => {
      const validCategories = BackgroundLibrary.getValidCategories();
      
      // Property test: For any category, getByCategory returns only backgrounds with that category
      fc.assert(
        fc.property(
          fc.constantFrom(...validCategories),
          (category: BackgroundCategory) => {
            const categoryBackgrounds = BackgroundLibrary.getByCategory(category);
            
            // All returned backgrounds must have the specified category
            categoryBackgrounds.forEach(background => {
              expect(background.category).toBe(category);
            });
            
            // The count should match the category grouping
            const categoryIds = BackgroundLibrary.categories[category];
            expect(categoryBackgrounds.length).toBe(categoryIds.length);
            
            // All IDs should match
            const returnedIds = categoryBackgrounds.map(bg => bg.id).sort();
            const expectedIds = [...categoryIds].sort();
            expect(returnedIds).toEqual(expectedIds);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('no background appears in multiple category groups', () => {
      const categories = BackgroundLibrary.categories;
      const validCategories = BackgroundLibrary.getValidCategories();
      
      // Build a map of background ID to categories it appears in
      const idToCategoriesMap = new Map<string, BackgroundCategory[]>();
      
      validCategories.forEach(category => {
        categories[category].forEach(id => {
          if (!idToCategoriesMap.has(id)) {
            idToCategoriesMap.set(id, []);
          }
          idToCategoriesMap.get(id)!.push(category);
        });
      });
      
      // Every background ID should appear in exactly one category
      idToCategoriesMap.forEach((categoriesList, id) => {
        expect(categoriesList.length).toBe(1);
      });
    });

    it('category distribution is reasonable (no empty categories)', () => {
      const categories = BackgroundLibrary.categories;
      const validCategories = BackgroundLibrary.getValidCategories();
      
      // Each category should have at least one background
      validCategories.forEach(category => {
        expect(categories[category].length).toBeGreaterThan(0);
      });
    });
  });
});
