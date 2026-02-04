import { supabase, ensureUserExists } from '@/lib/supabase';
import { projectServiceFallback } from './projectServiceFallback';
import type { GeneratedProject } from './apiService';

export interface SavedProject extends GeneratedProject {
  id: string;
  status: 'planning' | 'in-progress' | 'completed' | 'abandoned';
  progress: number;
  notes: string;
  starred: boolean;
  tags: string[];
  completed_steps: number[];
  generated_from_params: {
    projectType: string;
    skillLevel: string;
    interests: string;
    budget: string;
    duration: string;
  };
  created_at: string;
  updated_at: string;
}

interface CreateProjectData {
  title: string;
  description: string;
  project_type: string;
  difficulty: string;
  estimated_time: string;
  estimated_cost: string;
  components: string[];
  skills: string[];
  steps: string[];
  generated_from_params?: Record<string, string>;
}

interface UpdateProjectData {
  title?: string;
  description?: string;
  status?: string;
  progress?: number;
  notes?: string;
  starred?: boolean;
  tags?: string[];
  estimated_time?: string;
  estimated_cost?: string;
  components?: string[];
  skills?: string[];
  steps?: string[];
  completed_steps?: number[];
}

class ProjectService {
  private isSupabaseAvailable = true;

  /**
   * Check if Supabase is available
   */
  private async checkSupabaseConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      this.isSupabaseAvailable = !error;
      return this.isSupabaseAvailable;
    } catch (error) {
      console.warn('Supabase connection check failed, using fallback storage');
      this.isSupabaseAvailable = false;
      return false;
    }
  }

  /**
   * Save project to Supabase or fallback to localStorage
   */
  async saveProject(projectData: CreateProjectData): Promise<SavedProject | null> {
    try {
      // Try Supabase first
      if (await this.checkSupabaseConnection()) {
        const userId = await ensureUserExists();
        if (!userId) {
          throw new Error('Failed to initialize user');
        }

        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            title: projectData.title,
            description: projectData.description,
            difficulty: projectData.difficulty,
            estimated_time: projectData.estimated_time,
            estimated_cost: projectData.estimated_cost,
            components: projectData.components,
            skills: projectData.skills,
            steps: projectData.steps,
            status: 'planning',
            progress: 0,
            notes: '',
            starred: false,
            tags: [],
            completed_steps: [],
            generated_from_params: projectData.generated_from_params || {},
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving project to Supabase:', error);
          throw new Error('Supabase save failed');
        }

        console.log('✅ Project saved to Supabase:', data.title);
        return this.mapFromDatabase(data);
      }
    } catch (error) {
      console.warn('Supabase save failed, using fallback storage:', error);
    }

    // Fallback to localStorage
    console.log('📦 Using localStorage fallback for project save');
    return await projectServiceFallback.saveProject(projectData);
  }

  /**
   * Get all projects for current user
   */
  async getProjects(filters?: {
    status?: string;
    projectType?: string;
  }): Promise<SavedProject[]> {
    try {
      // Try Supabase first
      if (await this.checkSupabaseConnection()) {
        const userId = await ensureUserExists();
        if (!userId) {
          return await projectServiceFallback.getProjects(filters);
        }

        let query = supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching projects from Supabase:', error);
          throw new Error('Supabase fetch failed');
        }

        let projects = (data || []).map(this.mapFromDatabase);

        // Filter by project type if needed
        if (filters?.projectType) {
          projects = projects.filter(p => 
            p.generated_from_params?.projectType === filters.projectType
          );
        }

        return projects;
      }
    } catch (error) {
      console.warn('Supabase fetch failed, using fallback storage:', error);
    }

    // Fallback to localStorage
    return await projectServiceFallback.getProjects(filters);
  }

  /**
   * Get single project by ID
   */
  async getProjectById(id: string): Promise<SavedProject | null> {
    try {
      // Try Supabase first
      if (await this.checkSupabaseConnection()) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching project:', error);
          throw new Error('Supabase fetch failed');
        }

        return this.mapFromDatabase(data);
      }
    } catch (error) {
      console.warn('Supabase fetch failed, using fallback storage:', error);
    }

    // Fallback to localStorage
    return await projectServiceFallback.getProjectById(id);
  }

  /**
   * Update project
   */
  async updateProject(id: string, updates: UpdateProjectData): Promise<SavedProject | null> {
    try {
      // Try Supabase first
      if (await this.checkSupabaseConnection()) {
        const { data, error } = await supabase
          .from('projects')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating project:', error);
          throw new Error('Supabase update failed');
        }

        return this.mapFromDatabase(data);
      }
    } catch (error) {
      console.warn('Supabase update failed, using fallback storage:', error);
    }

    // Fallback to localStorage
    return await projectServiceFallback.updateProject(id, updates);
  }

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<boolean> {
    try {
      // Try Supabase first
      if (await this.checkSupabaseConnection()) {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting project:', error);
          throw new Error('Supabase delete failed');
        }

        return true;
      }
    } catch (error) {
      console.warn('Supabase delete failed, using fallback storage:', error);
    }

    // Fallback to localStorage
    return await projectServiceFallback.deleteProject(id);
  }

  /**
   * Toggle star on project
   */
  async toggleStarProject(id: string, starred: boolean): Promise<SavedProject | null> {
    return this.updateProject(id, { starred });
  }

  /**
   * Update project progress
   */
  async updateProjectProgress(id: string, progress: number): Promise<SavedProject | null> {
    return this.updateProject(id, { progress: Math.min(100, Math.max(0, progress)) });
  }

  /**
   * Mark project as abandoned
   */
  async markAsAbandoned(id: string): Promise<SavedProject | null> {
    return this.updateProject(id, { status: 'abandoned' });
  }

  /**
   * Revive an abandoned project
   */
  async reviveProject(id: string): Promise<SavedProject | null> {
    try {
      const project = await this.getProjectById(id);
      if (!project) {
        throw new Error('Project not found');
      }

      let newStatus: 'planning' | 'in-progress' | 'completed';
      if (project.progress === 0) {
        newStatus = 'planning';
      } else if (project.progress === 100) {
        newStatus = 'completed';
      } else {
        newStatus = 'in-progress';
      }

      return this.updateProject(id, { status: newStatus });
    } catch (error) {
      console.error('Revive project error:', error);
      return null;
    }
  }

  /**
   * Toggle step completion
   */
  async toggleStepCompletion(id: string, stepIndex: number): Promise<SavedProject | null> {
    try {
      const project = await this.getProjectById(id);
      if (!project) {
        throw new Error('Project not found');
      }

      if (project.status === 'abandoned') {
        console.log('Project is abandoned. Use revive feature to continue working on it.');
        return project;
      }

      const completedSteps = project.completed_steps || [];
      let newCompletedSteps: number[];
      
      if (completedSteps.includes(stepIndex)) {
        newCompletedSteps = completedSteps.filter(s => s !== stepIndex);
      } else {
        newCompletedSteps = [...completedSteps, stepIndex];
      }

      const totalSteps = project.steps.length;
      const newProgress = totalSteps > 0 
        ? Math.round((newCompletedSteps.length / totalSteps) * 100)
        : 0;

      let newStatus: 'planning' | 'in-progress' | 'completed';
      if (newProgress === 0) {
        newStatus = 'planning';
      } else if (newProgress === 100) {
        newStatus = 'completed';
      } else {
        newStatus = 'in-progress';
      }

      return this.updateProject(id, {
        completed_steps: newCompletedSteps,
        progress: newProgress,
        status: newStatus,
      });
    } catch (error) {
      console.error('Toggle step completion error:', error);
      return null;
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStats(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    planning: number;
  } | null> {
    try {
      const projects = await this.getProjects();

      return {
        total: projects.length,
        completed: projects.filter(p => p.status === 'completed').length,
        inProgress: projects.filter(p => p.status === 'in-progress').length,
        planning: projects.filter(p => p.status === 'planning').length,
      };
    } catch (error) {
      console.error('Get project stats error:', error);
      return null;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { supabase: boolean; fallback: boolean } {
    return {
      supabase: this.isSupabaseAvailable,
      fallback: !this.isSupabaseAvailable
    };
  }

  /**
   * Map database record to SavedProject interface
   */
  private mapFromDatabase(dbProject: any): SavedProject {
    return {
      id: dbProject.id,
      title: dbProject.title,
      description: dbProject.description,
      difficulty: dbProject.difficulty,
      estimatedTime: dbProject.estimated_time,
      estimatedCost: dbProject.estimated_cost,
      components: dbProject.components || [],
      skills: dbProject.skills || [],
      steps: dbProject.steps || [],
      status: dbProject.status,
      progress: dbProject.progress,
      notes: dbProject.notes,
      starred: dbProject.starred,
      tags: dbProject.tags || [],
      completed_steps: dbProject.completed_steps || [],
      generated_from_params: dbProject.generated_from_params || {},
      created_at: dbProject.created_at,
      updated_at: dbProject.updated_at,
    };
  }
}

export const projectService = new ProjectService();
