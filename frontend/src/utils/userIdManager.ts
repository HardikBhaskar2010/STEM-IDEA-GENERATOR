/**
 * User ID Manager
 * Generates and manages unique guest user IDs without authentication
 */

const STORAGE_KEY = 'stem_guest_user_id';

export class UserIdManager {
  private static guestId: string | null = null;

  /**
   * Generate a unique guest user ID
   * Format: guest_[timestamp]_[random]
   */
  private static generateGuestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `guest_${timestamp}_${random}`;
  }

  /**
   * Get or create guest user ID
   * Stores in localStorage for persistence
   */
  static getGuestId(): string {
    // Return cached ID if available
    if (this.guestId) {
      return this.guestId;
    }

    // Try to get from localStorage
    try {
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId) {
        this.guestId = storedId;
        console.log('📝 Retrieved existing guest ID:', storedId);
        return storedId;
      }
    } catch (error) {
      console.error('Error reading guest ID from localStorage:', error);
    }

    // Generate new ID if not found
    const newId = this.generateGuestId();
    this.setGuestId(newId);
    console.log('🆕 Generated new guest ID:', newId);
    return newId;
  }

  /**
   * Set guest user ID
   */
  static setGuestId(id: string): void {
    this.guestId = id;
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch (error) {
      console.error('Error saving guest ID to localStorage:', error);
    }
  }

  /**
   * Clear guest user ID (for testing or logout)
   */
  static clearGuestId(): void {
    this.guestId = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Guest ID cleared');
    } catch (error) {
      console.error('Error clearing guest ID:', error);
    }
  }

  /**
   * Check if user has a guest ID
   */
  static hasGuestId(): boolean {
    return !!this.getGuestId();
  }

  /**
   * Validate guest ID format
   */
  static isValidGuestId(id: string): boolean {
    return /^guest_\d+_[a-z0-9]+$/.test(id);
  }
}

// Initialize on first import
export const guestId = UserIdManager.getGuestId();
