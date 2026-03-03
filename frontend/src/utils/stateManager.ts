/**
 * State persistence and hydration utilities
 * Handles saving and restoring application state across sessions
 */

import { errorLogger, ErrorContext } from './errorHandler';

export interface PersistenceConfig {
  key: string;
  version: number;
  storage: 'localStorage' | 'sessionStorage';
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number; // Time to live in milliseconds
}

export interface PersistedState<T> {
  data: T;
  timestamp: number;
  version: number;
  checksum?: string;
}

/**
 * State manager for persistence and hydration
 */
export class StateManager {
  private static instance: StateManager;
  private encryptionKey: string | null = null;

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Set encryption key for sensitive data
   */
  setEncryptionKey(key: string): void {
    this.encryptionKey = key;
  }

  /**
   * Persist state to storage
   */
  async persistState<T>(
    state: T,
    config: PersistenceConfig
  ): Promise<boolean> {
    const context: ErrorContext = {
      operation: 'persistState',
      service: 'stateManager',
      timestamp: new Date()
    };

    try {
      // Validate state
      if (state === null || state === undefined) {
        throw new Error('Cannot persist null or undefined state');
      }

      // Create persisted state object
      const persistedState: PersistedState<T> = {
        data: state,
        timestamp: Date.now(),
        version: config.version
      };

      // Add checksum for integrity verification
      if (config.encrypt || config.compress) {
        persistedState.checksum = await this.calculateChe