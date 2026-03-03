import { supabase } from '@/lib/supabase';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'es' | 'fr' | 'de' | 'hi' | 'ja';
  notifications: {
    ai_suggestions: boolean;
    new_components: boolean;
    weekly_ideas: boolean;
    feature_updates: boolean;
  };
}

export interface PrivacySettings {
  profile_visibility: 'private' | 'public';
  allow_data_usage: boolean;
  ai_personalization: boolean;
}

export interface EmailPreferences {
  account_created: boolean;
  project_first_save: boolean;
  weekly_digest: boolean;
  feature_updates: boolean;
  unsubscribe_all: boolean;
}

class UserPreferencesService {
  // ===== USER PREFERENCES =====
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching preferences:', error);
        return null;
      }

      return {
        theme: data.theme,
        language: data.language,
        notifications: data.notifications,
      };
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
        });

      if (error) {
        console.error('Error updating preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  }

  // ===== PRIVACY SETTINGS =====
  async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching privacy settings:', error);
        return null;
      }

      return {
        profile_visibility: data.profile_visibility,
        allow_data_usage: data.allow_data_usage,
        ai_personalization: data.ai_personalization,
      };
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      return null;
    }
  }

  async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('privacy_settings')
        .upsert({
          user_id: userId,
          ...settings,
        });

      if (error) {
        console.error('Error updating privacy settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      return false;
    }
  }

  // ===== EMAIL PREFERENCES =====
  async getEmailPreferences(userId: string): Promise<EmailPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching email preferences:', error);
        return null;
      }

      return {
        account_created: data.account_created,
        project_first_save: data.project_first_save,
        weekly_digest: data.weekly_digest,
        feature_updates: data.feature_updates,
        unsubscribe_all: data.unsubscribe_all,
      };
    } catch (error) {
      console.error('Error fetching email preferences:', error);
      return null;
    }
  }

  async updateEmailPreferences(userId: string, preferences: Partial<EmailPreferences>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
        });

      if (error) {
        console.error('Error updating email preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating email preferences:', error);
      return false;
    }
  }
}

export const userPreferencesService = new UserPreferencesService();
