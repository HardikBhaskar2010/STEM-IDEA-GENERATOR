import { supabase } from '@/lib/supabase';

export interface Component {
  id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: 'In Stock' | 'Out of Stock' | 'Limited';
  tags: string[];
  specifications?: Record<string, string>;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class ComponentService {
  // Add a new component
  async addComponent(component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('components')
        .insert({
          name: component.name,
          description: component.description,
          category: component.category,
          price: Number(component.price),
          stock: component.stock,
          tags: component.tags,
          specifications: component.specifications || {},
          image_url: component.imageUrl || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding component:', error);
        throw new Error('Failed to add component');
      }

      return data.id;
    } catch (error) {
      console.error('Error adding component:', error);
      throw new Error('Failed to add component');
    }
  }

  // Get all components
  async getComponents(): Promise<Component[]> {
    try {
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting components:', error);
        throw new Error('Failed to fetch components');
      }

      return (data || []).map(this.mapFromDatabase);
    } catch (error) {
      console.error('Error getting components:', error);
      throw new Error('Failed to fetch components');
    }
  }

  // Get components by category
  async getComponentsByCategory(category: string): Promise<Component[]> {
    try {
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting components by category:', error);
        throw new Error('Failed to fetch components by category');
      }

      return (data || []).map(this.mapFromDatabase);
    } catch (error) {
      console.error('Error getting components by category:', error);
      throw new Error('Failed to fetch components by category');
    }
  }

  // Update a component
  async updateComponent(id: string, updates: Partial<Component>): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.price !== undefined) {
        updateData.price = typeof updates.price === 'string' 
          ? parseFloat(updates.price.replace(/[^0-9.]/g, '')) 
          : updates.price;
      }
      if (updates.stock) updateData.stock = updates.stock;
      if (updates.tags) updateData.tags = updates.tags;
      if (updates.specifications) updateData.specifications = updates.specifications;
      if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;

      const { error } = await supabase
        .from('components')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating component:', error);
        throw new Error('Failed to update component');
      }
    } catch (error) {
      console.error('Error updating component:', error);
      throw new Error('Failed to update component');
    }
  }

  // Delete a component
  async deleteComponent(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('components')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting component:', error);
        throw new Error('Failed to delete component');
      }
    } catch (error) {
      console.error('Error deleting component:', error);
      throw new Error('Failed to delete component');
    }
  }

  // Subscribe to real-time updates
  subscribeToComponents(
    callback: (components: Component[]) => void,
    category?: string
  ): () => void {
    try {
      let channel;

      const fetchAndNotify = async () => {
        try {
          const components = category && category !== 'all' 
            ? await this.getComponentsByCategory(category)
            : await this.getComponents();
          callback(components);
        } catch (error) {
          console.error('Error fetching components:', error);
        }
      };

      // Initial fetch
      fetchAndNotify();

      // Subscribe to changes
      channel = supabase
        .channel('components-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'components',
            ...(category && category !== 'all' ? { filter: `category=eq.${category}` } : {})
          },
          () => {
            fetchAndNotify();
          }
        )
        .subscribe();

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    } catch (error) {
      console.error('Error subscribing to components:', error);
      throw new Error('Failed to subscribe to components');
    }
  }

  // Search components
  async searchComponents(searchTerm: string): Promise<Component[]> {
    try {
      const components = await this.getComponents();
      const lowercaseSearch = searchTerm.toLowerCase();
      
      return components.filter(component =>
        component.name.toLowerCase().includes(lowercaseSearch) ||
        component.description.toLowerCase().includes(lowercaseSearch) ||
        component.category.toLowerCase().includes(lowercaseSearch) ||
        component.tags.some(tag => tag.toLowerCase().includes(lowercaseSearch))
      );
    } catch (error) {
      console.error('Error searching components:', error);
      throw new Error('Failed to search components');
    }
  }

  // Get detailed component information
  async getComponentDetails(componentId: string): Promise<any> {
    try {
      // First try to get details from backend API (which has mock data)
      const response = await fetch(`/api/components/${componentId}/details`);
      
      if (response.ok) {
        const details = await response.json();
        return details;
      }
      
      // Fallback to Supabase if backend API fails
      const { data, error } = await supabase
        .rpc('get_component_details', { component_uuid: componentId });

      if (error) {
        console.error('Error fetching component details from Supabase:', error);
        // Return basic component info as fallback
        const basicComponent = await this.getBasicComponentInfo(componentId);
        return basicComponent;
      }

      return data;
    } catch (error) {
      console.error('Error fetching component details:', error);
      // Return basic component info as fallback
      const basicComponent = await this.getBasicComponentInfo(componentId);
      return basicComponent;
    }
  }

  // Get basic component information as fallback
  private async getBasicComponentInfo(componentId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('id', componentId)
        .single();

      if (error) {
        throw new Error('Component not found');
      }

      // Transform to match expected format
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        category: data.category,
        price: data.price,
        manufacturer: data.manufacturer,
        model_number: data.model_number,
        specifications: data.specifications || {},
        tags: data.tags || [],
        dimensions: data.dimensions,
        operating_voltage_min: data.operating_voltage_min,
        operating_voltage_max: data.operating_voltage_max,
        operating_current: data.operating_current,
        power_consumption: data.power_consumption,
        interface_type: data.interface_type,
        pin_count: data.pin_count,
        package_type: data.package_type,
        datasheet_url: data.datasheet_url,
        image_url: data.image_url,
        reviews: [],
        projects: [],
        alternatives: [],
        stats: {
          average_rating: 0,
          review_count: 0,
          project_count: 0,
          alternative_count: 0
        }
      };
    } catch (error) {
      console.error('Error fetching basic component info:', error);
      throw new Error('Failed to fetch component details');
    }
  }

  // Helper method to map database fields to Component interface
  private mapFromDatabase(dbComponent: any): Component {
    return {
      id: dbComponent.id,
      name: dbComponent.name,
      description: dbComponent.description,
      category: dbComponent.category,
      price: dbComponent.price,
      stock: dbComponent.stock,
      tags: dbComponent.tags || [],
      specifications: dbComponent.specifications || {},
      imageUrl: dbComponent.image_url,
      createdAt: dbComponent.created_at,
      updatedAt: dbComponent.updated_at,
    };
  }
}

// Export instance for convenience
export const componentService = new ComponentService();
