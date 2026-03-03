import { supabase } from '@/lib/supabase';

export interface SavedComponent {
  id: string;
  user_id: string;
  component_name: string;
  component_category: string;
  component_price: string;
  component_specs?: Record<string, string>;
  external_url?: string;
  created_at: string;
}

interface CreateSavedComponent {
  component_name: string;
  component_category: string;
  component_price: string;
  component_specs?: Record<string, string>;
  external_url?: string;
}

class SavedComponentService {
  async saveComponent(data: CreateSavedComponent): Promise<SavedComponent | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { data: savedData, error } = await supabase
        .from('saved_components')
        .insert({
          user_id: user.id,
          component_name: data.component_name,
          component_category: data.component_category,
          component_price: data.component_price,
          component_specs: data.component_specs || {},
          external_url: data.external_url || null,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error saving component:', error);
        throw error;
      }

      return savedData as SavedComponent;
    } catch (error) {
      console.error('Save component error:', error);
      return null;
    }
  }

  async getSavedComponents(): Promise<SavedComponent[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('saved_components')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved components:', error);
        return [];
      }

      return (data || []) as SavedComponent[];
    } catch (error) {
      console.error('Get saved components error:', error);
      return [];
    }
  }

  async deleteSavedComponent(id: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { error } = await supabase
        .from('saved_components')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting component:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Delete component error:', error);
      return false;
    }
  }

  async isSaved(componentName: string): Promise<boolean> {
    try {
      const saved = await this.getSavedComponents();
      return saved.some(c => c.component_name.toLowerCase() === componentName.toLowerCase());
    } catch (error) {
      console.error('Error checking if saved:', error);
      return false;
    }
  }
}

export const savedComponentService = new SavedComponentService();
