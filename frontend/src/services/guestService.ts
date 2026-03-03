// Guest User Service - Manages guest mode with localStorage

export interface GuestUser {
  id: string;
  isGuest: boolean;
  createdAt: string;
  projects: any[];
  preferences: any;
}

const GUEST_STORAGE_KEY = 'stem_guest_user';
const GUEST_PROJECTS_KEY = 'stem_guest_projects';
const GUEST_PREFERENCES_KEY = 'stem_guest_preferences';

class GuestService {
  // Create or get existing guest user
  getOrCreateGuest(): GuestUser {
    const existing = localStorage.getItem(GUEST_STORAGE_KEY);
    
    if (existing) {
      return JSON.parse(existing);
    }

    // Create new guest user
    const guestUser: GuestUser = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      isGuest: true,
      createdAt: new Date().toISOString(),
      projects: [],
      preferences: {
        theme: 'system',
        language: 'en',
      },
    };

    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
    return guestUser;
  }

  // Check if user is guest
  isGuest(): boolean {
    const guest = localStorage.getItem(GUEST_STORAGE_KEY);
    return !!guest;
  }

  // Get guest data
  getGuest(): GuestUser | null {
    const guest = localStorage.getItem(GUEST_STORAGE_KEY);
    return guest ? JSON.parse(guest) : null;
  }

  // Save guest projects
  saveGuestProjects(projects: any[]): void {
    localStorage.setItem(GUEST_PROJECTS_KEY, JSON.stringify(projects));
    
    // Update guest user object
    const guest = this.getGuest();
    if (guest) {
      guest.projects = projects;
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
    }
  }

  // Get guest projects
  getGuestProjects(): any[] {
    const projects = localStorage.getItem(GUEST_PROJECTS_KEY);
    return projects ? JSON.parse(projects) : [];
  }

  // Save guest preferences
  saveGuestPreferences(preferences: any): void {
    localStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify(preferences));
    
    // Update guest user object
    const guest = this.getGuest();
    if (guest) {
      guest.preferences = preferences;
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
    }
  }

  // Get guest preferences
  getGuestPreferences(): any {
    const preferences = localStorage.getItem(GUEST_PREFERENCES_KEY);
    return preferences ? JSON.parse(preferences) : { theme: 'system', language: 'en' };
  }

  // Clear guest data (on logout or upgrade)
  clearGuestData(): void {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(GUEST_PROJECTS_KEY);
    localStorage.removeItem(GUEST_PREFERENCES_KEY);
  }

  // Get data for migration when guest upgrades to real account
  getDataForMigration(): { projects: any[], preferences: any } {
    return {
      projects: this.getGuestProjects(),
      preferences: this.getGuestPreferences(),
    };
  }
}

export const guestService = new GuestService();
