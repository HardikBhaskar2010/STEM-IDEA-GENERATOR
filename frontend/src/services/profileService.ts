import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  interests: string[];
  skills: string[];
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  interests?: string[];
  skills?: string[];
}

// Predefined STEM interests for suggestions
export const STEM_INTERESTS = [
  'Arduino',
  'Raspberry Pi',
  'IoT',
  '3D Printing',
  'Robotics',
  'AI & Machine Learning',
  'Web Development',
  'Mobile Apps',
  'Circuits & Electronics',
  'Sensors',
  'Automation',
  'Programming',
  'Python',
  'JavaScript',
  'C++',
  'Embedded Systems',
  'Drones',
  'Smart Home',
  'Wearables',
  'Data Science',
  'Computer Vision',
  'PCB Design',
  'Soldering',
  'Microcontrollers',
  'Cloud Computing',
];

class ProfileService {
  /**
   * Get user profile from Supabase
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist
          return null;
        }
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }

  /**
   * Create a new profile (called after signup)
   */
  async createProfile(
    userId: string,
    username: string,
    email: string
  ): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username: username,
          display_name: username,
          email: email,
        })
        .select()
        .single();

      if (error) throw error;

      return data as UserProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: ProfileUpdateData
  ): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data as UserProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Upload avatar image to Supabase Storage
   */
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<string | null> {
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(
    username: string,
    currentUserId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('profiles')
        .select('user_id')
        .eq('username', username);

      // If checking for current user, exclude their own record
      if (currentUserId) {
        query = query.neq('user_id', currentUserId);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Username is available if no data found
      return !data;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  }

  /**
   * Get or create profile for a user
   */
  async getOrCreateProfile(user: User): Promise<UserProfile | null> {
    try {
      // Try to get existing profile
      let profile = await this.getProfile(user.id);

      // If profile doesn't exist, create it
      if (!profile) {
        const username = user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`;
        profile = await this.createProfile(user.id, username, user.email || '');
      }

      return profile;
    } catch (error) {
      console.error('Error getting or creating profile:', error);
      return null;
    }
  }

  /**
   * Generate avatar URL from initials (fallback)
   */
  generateAvatarUrl(name: string): string {
    const seed = name.replace(/\s+/g, '');
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  }
}

export const profileService = new ProfileService();
