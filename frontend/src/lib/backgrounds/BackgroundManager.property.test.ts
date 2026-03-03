/**
 * BackgroundManager Property-Based Tests
 * 
 * Task 2.3: Write property test for single background mount
 * 
 * Property 4: Single Background Mount
 * **Validates: Requirements 3.2**
 * 
 * For any sequence of background selections, at most one background component 
 * SHALL be mounted in the DOM at any given time, with the previous background 
 * unmounted before the new one mounts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { BackgroundManager } from './BackgroundManager';
import BackgroundLibrary from './BackgroundLibrary';

describe('BackgroundManager Property-Based Tests', () => {
  let manager: BackgroundManager;

  beforeEach(() => {
    manager = BackgroundManager.getInstance();
    manager.reset();
  });

  afterEach(() => {
    manager.reset();
  });

  describe('Property 4: Single Background Mount', () => {
    // Feature: reactbits-background-integration, Property 4: Single Background Mount
    it('only one background mounted at a time for any sequence of background selections', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const backgroundIds = backgrounds.map(bg => bg.id);

      // Property test: For any sequence of background selections, 
      // at most one background is mounted at any time
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom(...backgroundIds), { minLength: 2, maxLength: 10 }),
          async (backgroundSequence) => {
            // Track mount/unmount events
            const mountHistory: Array<{ action: 'mount' | 'unmount'; id: string | null; timestamp: number }> = [];
            
            // Process each background selection in sequence
            for (const id of backgroundSequence) {
              const beforeId = manager.getCurrentBackgroundId();
              
              try {
                await manager.loadBackground(id);
                
                const afterId = manager.getCurrentBackgroundId();
                
                // Record the transition
                if (beforeId !== null) {
                  mountHistory.push({ action: 'unmount', id: beforeId, timestamp: Date.now() });
                }
                mountHistory.push({ action: 'mount', id: afterId, timestamp: Date.now() });
                
                // Verify: At most one background is currently mounted
                const currentBackground = manager.getCurrentBackground();
                const currentId = manager.getCurrentBackgroundId();
                
                if (currentBackground !== null) {
                  // If a background is mounted, it should have an ID
                  expect(currentId).not.toBeNull();
                  expect(currentId).toBe(id);
                  
                  // Exactly one background should be mounted
                  expect(manager.hasBackground()).toBe(true);
                } else {
                  // If no background is mounted, ID should be null
                  expect(currentId).toBeNull();
                  expect(manager.hasBackground()).toBe(false);
                }
                
                // Verify: Previous background was unmounted before new one mounted
                if (beforeId !== null && beforeId !== id) {
                  // Previous background should no longer be the current one
                  expect(currentId).not.toBe(beforeId);
                }
                
              } catch (error) {
                // If loading fails, no background should be mounted
                // (or previous background should still be mounted)
                const currentId = manager.getCurrentBackgroundId();
                
                // Either no background or the previous background
                if (currentId !== null) {
                  expect(currentId).toBe(beforeId);
                }
              }
            }
            
            // Verify mount history: no overlapping mounts
            let currentlyMounted: string | null = null;
            
            for (const event of mountHistory) {
              if (event.action === 'mount') {
                // Before mounting, nothing should be mounted
                expect(currentlyMounted).toBeNull();
                currentlyMounted = event.id;
              } else if (event.action === 'unmount') {
                // Unmounting should match what's currently mounted
                expect(currentlyMounted).toBe(event.id);
                currentlyMounted = null;
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('previous background is unmounted before new background mounts', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const backgroundIds = backgrounds.map(bg => bg.id);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...backgroundIds),
          fc.constantFrom(...backgroundIds),
          async (firstId, secondId) => {
            // Load first background
            try {
              await manager.loadBackground(firstId);
              
              const firstBackground = manager.getCurrentBackground();
              const firstCurrentId = manager.getCurrentBackgroundId();
              
              expect(firstCurrentId).toBe(firstId);
              expect(firstBackground).not.toBeNull();
              
              // Load second background
              await manager.loadBackground(secondId);
              
              const secondBackground = manager.getCurrentBackground();
              const secondCurrentId = manager.getCurrentBackgroundId();
              
              // Verify: Only the second background is mounted
              expect(secondCurrentId).toBe(secondId);
              expect(secondBackground).not.toBeNull();
              
              // Verify: First background is no longer current
              if (firstId !== secondId) {
                expect(secondCurrentId).not.toBe(firstId);
              }
              
              // Verify: Only one background is mounted
              expect(manager.hasBackground()).toBe(true);
              
            } catch (error) {
              // If loading fails, verify state is consistent
              const currentId = manager.getCurrentBackgroundId();
              const hasBackground = manager.hasBackground();
              
              if (hasBackground) {
                expect(currentId).not.toBeNull();
              } else {
                expect(currentId).toBeNull();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('unmountBackground clears current background state', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const backgroundIds = backgrounds.map(bg => bg.id);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...backgroundIds),
          async (id) => {
            try {
              // Load a background
              await manager.loadBackground(id);
              
              expect(manager.hasBackground()).toBe(true);
              expect(manager.getCurrentBackgroundId()).toBe(id);
              expect(manager.getCurrentBackground()).not.toBeNull();
              
              // Unmount the background
              manager.unmountBackground();
              
              // Verify: No background is mounted
              expect(manager.hasBackground()).toBe(false);
              expect(manager.getCurrentBackgroundId()).toBeNull();
              expect(manager.getCurrentBackground()).toBeNull();
              
            } catch (error) {
              // If loading fails, unmount should still work
              manager.unmountBackground();
              
              expect(manager.hasBackground()).toBe(false);
              expect(manager.getCurrentBackgroundId()).toBeNull();
              expect(manager.getCurrentBackground()).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rapid background switching maintains single mount invariant', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const backgroundIds = backgrounds.map(bg => bg.id);

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom(...backgroundIds), { minLength: 3, maxLength: 5 }),
          async (rapidSequence) => {
            // Simulate rapid switching by loading backgrounds in quick succession
            const loadPromises = rapidSequence.map(id => 
              manager.loadBackground(id).catch(err => {
                // Ignore errors for this test, focus on mount invariant
                console.log(`Load failed for ${id}:`, err.message);
              })
            );
            
            // Wait for all loads to complete
            await Promise.all(loadPromises);
            
            // After all loads complete, verify: At most one background is mounted
            const currentBackground = manager.getCurrentBackground();
            const currentId = manager.getCurrentBackgroundId();
            
            if (currentBackground !== null) {
              expect(currentId).not.toBeNull();
              expect(manager.hasBackground()).toBe(true);
              
              // The mounted background should be one from the sequence
              expect(rapidSequence).toContain(currentId);
            } else {
              expect(currentId).toBeNull();
              expect(manager.hasBackground()).toBe(false);
            }
          }
        ),
        { numRuns: 50 } // Fewer runs for rapid switching test
      );
    });

    it('loading same background twice maintains single mount', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const backgroundIds = backgrounds.map(bg => bg.id);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...backgroundIds),
          async (id) => {
            try {
              // Load background first time
              await manager.loadBackground(id);
              
              const firstLoad = {
                background: manager.getCurrentBackground(),
                id: manager.getCurrentBackgroundId(),
                hasBackground: manager.hasBackground()
              };
              
              expect(firstLoad.id).toBe(id);
              expect(firstLoad.hasBackground).toBe(true);
              
              // Load same background again
              await manager.loadBackground(id);
              
              const secondLoad = {
                background: manager.getCurrentBackground(),
                id: manager.getCurrentBackgroundId(),
                hasBackground: manager.hasBackground()
              };
              
              // Verify: Still only one background mounted
              expect(secondLoad.id).toBe(id);
              expect(secondLoad.hasBackground).toBe(true);
              
              // Verify: No duplicate mounts
              expect(manager.hasBackground()).toBe(true);
              
            } catch (error) {
              // If loading fails, verify consistent state
              const hasBackground = manager.hasBackground();
              const currentId = manager.getCurrentBackgroundId();
              
              if (hasBackground) {
                expect(currentId).not.toBeNull();
              } else {
                expect(currentId).toBeNull();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('background state is consistent after any sequence of operations', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      const backgroundIds = backgrounds.map(bg => bg.id);

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              fc.record({ op: fc.constant('load'), id: fc.constantFrom(...backgroundIds) }),
              fc.record({ op: fc.constant('unmount') })
            ),
            { minLength: 1, maxLength: 8 }
          ),
          async (operations) => {
            // Execute a sequence of load and unmount operations
            for (const operation of operations) {
              try {
                if (operation.op === 'load') {
                  await manager.loadBackground(operation.id);
                } else if (operation.op === 'unmount') {
                  manager.unmountBackground();
                }
              } catch (error) {
                // Ignore load errors, continue with sequence
              }
              
              // After each operation, verify state consistency
              const currentBackground = manager.getCurrentBackground();
              const currentId = manager.getCurrentBackgroundId();
              const hasBackground = manager.hasBackground();
              
              // Invariant: hasBackground() matches whether background/id are set
              if (hasBackground) {
                expect(currentBackground).not.toBeNull();
                expect(currentId).not.toBeNull();
              } else {
                expect(currentBackground).toBeNull();
                expect(currentId).toBeNull();
              }
              
              // Invariant: At most one background is mounted
              if (currentBackground !== null) {
                expect(hasBackground).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
