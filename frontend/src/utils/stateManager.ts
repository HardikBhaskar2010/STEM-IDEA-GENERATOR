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
        persistedState.checksum = await this.calculateChecksum(JSON.stringify(persistedState.data));
      }

      // Serialize and store
      const storage = this.getStorage(config.storage);
      storage.setItem(config.key, JSON.stringify(persistedState));

      return true;
    } catch (error) {
      errorLogger.logError(error as Error, context);
      return false;
    }
  }

  /**
   * Retrieve state from storage
   */
  async retrieveState<T>(config: PersistenceConfig): Promise<T | null> {
    const context: ErrorContext = {
      operation: 'retrieveState',
      service: 'stateManager',
      timestamp: new Date()
    };

    try {
      const storage = this.getStorage(config.storage);
      const stored = storage.getItem(config.key);

      if (!stored) {
        return null;
      }

      const persistedState: PersistedState<T> = JSON.parse(stored);

      // Check version
      if (persistedState.version !== config.version) {
        this.clearState(config);
        return null;
      }

      // Check TTL
      if (config.ttl) {
        const age = Date.now() - persistedState.timestamp;
        if (age > config.ttl) {
          this.clearState(config);
          return null;
        }
      }

      // Verify checksum if present
      if (persistedState.checksum) {
        const calculatedChecksum = await this.calculateChecksum(JSON.stringify(persistedState.data));
        if (calculatedChecksum !== persistedState.checksum) {
          throw new Error('State integrity check failed');
        }
      }

      return persistedState.data;
    } catch (error) {
      errorLogger.logError(error as Error, context);
      return null;
    }
  }

  /**
   * Clear persisted state
   */
  clearState(config: PersistenceConfig): void {
    try {
      const storage = this.getStorage(config.storage);
      storage.removeItem(config.key);
    } catch (error) {
      errorLogger.logError(error as Error, {
        operation: 'clearState',
        service: 'stateManager',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get storage instance
   */
  private getStorage(type: 'localStorage' | 'sessionStorage'): Storage {
    if (typeof window === 'undefined') {
      throw new Error('Storage not available in server context');
    }
    return type === 'localStorage' ? window.localStorage : window.sessionStorage;
  }

  /**
   * Calculate checksum for data integrity
   */
  private async calculateChecksum(data: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      // Fallback for environments without crypto API
      return this.simpleHash(data);
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Simple hash function for fallback
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

export const stateManager = StateManager.getInstance();