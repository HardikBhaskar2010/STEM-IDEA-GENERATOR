/**
 * State persistence and hydration utilities
 * Handles saving and restoring application state across sessions
 */

import { errorLogger, type ErrorContext } from './errorHandler';

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
   * Calculate simple string checksum
   */
  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString(16);
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
      if (state === null || state === undefined) {
        throw new Error('Cannot persist null or undefined state');
      }

      const serialized = JSON.stringify(state);
      const persistedState: PersistedState<T> = {
        data: state,
        timestamp: Date.now(),
        version: config.version,
        checksum: this.calculateChecksum(serialized)
      };

      const storage = config.storage === 'sessionStorage' ? sessionStorage : localStorage;
      storage.setItem(config.key, JSON.stringify(persistedState));
      return true;
    } catch (error) {
      errorLogger.logError(error as Error, context);
      return false;
    }
  }

  /**
   * Restore state from storage
   */
  async restoreState<T>(config: PersistenceConfig): Promise<T | null> {
    const context: ErrorContext = {
      operation: 'restoreState',
      service: 'stateManager',
      timestamp: new Date()
    };

    try {
      const storage = config.storage === 'sessionStorage' ? sessionStorage : localStorage;
      const raw = storage.getItem(config.key);
      if (!raw) {
        return null;
      }

      const persisted: PersistedState<T> = JSON.parse(raw);

      // Check TTL
      if (config.ttl && Date.now() - persisted.timestamp > config.ttl) {
        storage.removeItem(config.key);
        return null;
      }

      // Check Version
      if (persisted.version !== config.version) {
        storage.removeItem(config.key);
        return null;
      }

      return persisted.data;
    } catch (error) {
      errorLogger.logError(error as Error, context);
      return null;
    }
  }

  /**
   * Clear state from storage
   */
  clearState(key: string, storageType: 'localStorage' | 'sessionStorage' = 'localStorage'): void {
    const storage = storageType === 'sessionStorage' ? sessionStorage : localStorage;
    storage.removeItem(key);
  }
}

export const stateManager = StateManager.getInstance();