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

/**
 * Fallback Project Service using localStorage
 * Used when Supabase is unavailable
 */
class ProjectServiceFallback {
  private readonly STORAGE_KEY = 'stem_projects_fallback';

  /**
   * Save project to localStorage
   */
  async saveProject(projectData: CreateProjectData): Promise<SavedProject | null> {
    try {
      const projects = this.getStoredProjects();
      const newProject: SavedProject = {
        id: this.generateId(),
        title: projectData.title,
        description: projectData.description,
        difficulty: projectData.difficulty,
        estimatedTime: projectData.estimated_time,
        estimatedCost: projectData.estimated_cost,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      projects.push(newProject);
      this.saveToStorage(projects);

      console.log('✅ Project saved to localStorage (fallback):', newProject.title);
      return newProject;
    } catch (error) {
      console.error('Fallback save project error:', error);
      return null;
    }
  }

  /**
   * Get all projects from localStorage
   */
  async getProjects(filters?: {
    status?: string;
    projectType?: string;
  }): Promise<SavedProject[]> {
    try {
      let projects = this.getStoredProjects();

      // Apply filters
      if (filters?.status) {
        projects = projects.filter(p => p.status === filters.status);
      }

      if (filters?.projectType) {
        projects = projects.filter(p => 
          p.generated_from_params?.projectType === filters.projectType
        );
      }

      return projects.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Fallback get projects error:', error);
      return [];
    }
  }

  /**
   * Get single project by ID
   */
  async getProjectById(id: string): Promise<SavedProject | null> {
    try {
      const projects = this.getStoredProjects();
      return projects.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Fallback get project error:', error);
      return null;
    }
  }

  /**
   * Update project
   */
  async updateProject(id: string, updates: UpdateProjectData): Promise<SavedProject | null> {
    try {
      const projects = this.getStoredProjects();
      const projectIndex = projects.findIndex(p => p.id === id);
      
      if (projectIndex === -1) {
        throw new Error('Project not found');
      }

      projects[projectIndex] = {
        ...projects[projectIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      this.saveToStorage(projects);
      return projects[projectIndex];
    } catch (error) {
      console.error('Fallback update project error:', error);
      return null;
    }
  }

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<boolean> {
    try {
      const projects = this.getStoredProjects();
      const filteredProjects = projects.filter(p => p.id !== id);
      
      if (filteredProjects.length === projects.length) {
        throw new Error('Project not found');
      }

      this.saveToStorage(filteredProjects);
      return true;
    } catch (error) {
      console.error('Fallback delete project error:', error);
      return false;
    }
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
      console.error('Fallback revive project error:', error);
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
      console.error('Fallback toggle step completion error:', error);
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
      console.error('Fallback get project stats error:', error);
      return null;
    }
  }

  /**
   * Get projects from localStorage
   */
  private getStoredProjects(): SavedProject[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      let projects = stored ? JSON.parse(stored) : [];
      
      // Return empty array if no projects exist
      if (projects.length === 0) {
        return [];
      }
      
      return projects;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  /**
   * Save projects to localStorage
   */
  private saveToStorage(projects: SavedProject[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all stored projects (for testing)
   */
  clearAllProjects(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const projectServiceFallback = new ProjectServiceFallback();