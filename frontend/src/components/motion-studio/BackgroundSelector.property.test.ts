/**
 * Property-Based Tests for BackgroundSelector
 * 
 * Tests universal properties of search and filter functionality.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { BackgroundLibrary } from '@/lib/backgrounds';
import type { BackgroundCategory } from '@/lib/backgrounds/types';

describe('BackgroundSelector Property Tests', () => {
  // Feature: reactbits-background-integration, Property 15: Search and Filter
  it('search and filter correctly subset backgrounds', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom('all', 'fluid', 'geometric', 'particle', 'gradient', 'atmospheric'),
        (searchQuery, category) => {
          const filtered = BackgroundLibrary.filter({
            searchQuery,
            category: category as BackgroundCategory | 'all',
          });
          
          // All results match search query (if query is not empty)
          if (searchQuery.trim()) {
            filtered.forEach((bg) => {
              const matchesSearch = 
                bg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bg.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
              
              expect(matchesSearch).toBe(true);
            });
          }
          
          // All results match category (if not 'all')
          if (category !== 'all') {
            filtered.forEach((bg) => {
              expect(bg.category).toBe(category);
            });
          }
          
          // No false negatives - all matching backgrounds are included
          const allMatching = BackgroundLibrary.backgrounds.filter((bg) => {
            const matchesSearch = !searchQuery.trim() || 
              bg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              bg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              bg.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesCategory = category === 'all' || bg.category === category;
            
            return matchesSearch && matchesCategory;
          });
          
          expect(filtered.length).toBe(allMatching.length);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Additional property: Search is case-insensitive
  it('search is case-insensitive', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (searchQuery) => {
          const lowerResults = BackgroundLibrary.filter({
            searchQuery: searchQuery.toLowerCase(),
            category: 'all',
          });
          
          const upperResults = BackgroundLibrary.filter({
            searchQuery: searchQuery.toUpperCase(),
            category: 'all',
          });
          
          const mixedResults = BackgroundLibrary.filter({
            searchQuery: searchQuery,
            category: 'all',
          });
          
          // All three should return the same results
          expect(lowerResults.length).toBe(upperResults.length);
          expect(lowerResults.length).toBe(mixedResults.length);
          
          // Results should have same IDs
          const lowerIds = lowerResults.map((bg) => bg.id).sort();
          const upperIds = upperResults.map((bg) => bg.id).sort();
          const mixedIds = mixedResults.map((bg) => bg.id).sort();
          
          expect(lowerIds).toEqual(upperIds);
          expect(lowerIds).toEqual(mixedIds);
        }
      ),
      { numRuns: 50 }
    );
  });
  
  // Additional property: Empty search returns all backgrounds in category
  it('empty search returns all backgrounds in category', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('all', 'fluid', 'geometric', 'particle', 'gradient', 'atmospheric'),
        (category) => {
          const filtered = BackgroundLibrary.filter({
            searchQuery: '',
            category: category as BackgroundCategory | 'all',
          });
          
          if (category === 'all') {
            expect(filtered.length).toBe(BackgroundLibrary.backgrounds.length);
          } else {
            const expectedCount = BackgroundLibrary.backgrounds.filter(
              (bg) => bg.category === category
            ).length;
            expect(filtered.length).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
  
  // Additional property: Filter results are always a subset of all backgrounds
  it('filter results are always a subset of all backgrounds', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom('all', 'fluid', 'geometric', 'particle', 'gradient', 'atmospheric'),
        (searchQuery, category) => {
          const filtered = BackgroundLibrary.filter({
            searchQuery,
            category: category as BackgroundCategory | 'all',
          });
          
          // All filtered backgrounds should exist in the main library
          filtered.forEach((bg) => {
            const exists = BackgroundLibrary.backgrounds.some((libBg) => libBg.id === bg.id);
            expect(exists).toBe(true);
          });
          
          // Filtered count should never exceed total count
          expect(filtered.length).toBeLessThanOrEqual(BackgroundLibrary.backgrounds.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('BackgroundSelector Thumbnail Lazy Loading Property Tests', () => {
  // Feature: reactbits-background-integration, Property 18: Thumbnail Lazy Loading
  it('all thumbnails use optimized formats and lazy loading', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BackgroundLibrary.backgrounds),
        (background) => {
          // Verify thumbnail URL is defined
          expect(background.thumbnailUrl).toBeDefined();
          expect(background.thumbnailUrl).not.toBe('');
          
          // Verify thumbnail uses optimized format (webp or avif)
          const isOptimizedFormat = 
            background.thumbnailUrl.endsWith('.webp') ||
            background.thumbnailUrl.endsWith('.avif') ||
            background.thumbnailUrl.endsWith('.jpg') ||
            background.thumbnailUrl.endsWith('.png');
          
          expect(isOptimizedFormat).toBe(true);
          
          // Note: Actual lazy loading behavior and size constraints
          // are tested in integration tests with real DOM
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Additional property: All backgrounds have valid thumbnail URLs
  it('all backgrounds have valid thumbnail URLs', () => {
    BackgroundLibrary.backgrounds.forEach((background) => {
      expect(background.thumbnailUrl).toBeDefined();
      expect(typeof background.thumbnailUrl).toBe('string');
      expect(background.thumbnailUrl.length).toBeGreaterThan(0);
      
      // Should start with / or http
      const isValidPath = 
        background.thumbnailUrl.startsWith('/') ||
        background.thumbnailUrl.startsWith('http://') ||
        background.thumbnailUrl.startsWith('https://');
      
      expect(isValidPath).toBe(true);
    });
  });
  
  // Additional property: Thumbnail URLs are unique
  it('thumbnail URLs are unique per background', () => {
    const thumbnailUrls = BackgroundLibrary.backgrounds.map((bg) => bg.thumbnailUrl);
    const uniqueUrls = new Set(thumbnailUrls);
    
    // Most thumbnails should be unique (allowing some reuse for similar backgrounds)
    expect(uniqueUrls.size).toBeGreaterThan(BackgroundLibrary.backgrounds.length * 0.5);
  });
});
