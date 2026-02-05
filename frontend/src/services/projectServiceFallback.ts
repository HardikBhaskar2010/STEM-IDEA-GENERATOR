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
      
      // If no projects exist, create some sample projects for testing
      if (projects.length === 0) {
        projects = this.createSampleProjects();
        this.saveToStorage(projects);
      }
      
      return projects;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return this.createSampleProjects();
    }
  }

  /**
   * Create sample projects for testing
   */
  private createSampleProjects(): SavedProject[] {
    const now = new Date().toISOString();
    
    return [
      {
        id: 'sample_1',
        title: 'Smart Home LED Controller',
        description: 'Build an Arduino-based LED controller that can be controlled via smartphone app with color changing and scheduling features.',
        difficulty: 'intermediate',
        estimatedTime: '4-6 hours',
        estimatedCost: '$25-35',
        components: ['Arduino Uno', 'RGB LED Strip', 'Bluetooth Module', 'Resistors', 'Breadboard'],
        skills: ['Arduino Programming', 'Circuit Design', 'Mobile App Integration'],
        steps: [
          'Set up Arduino development environment',
          'Wire RGB LED strip to Arduino',
          'Install and configure Bluetooth module',
          'Write Arduino code for LED control',
          'Create smartphone app interface',
          'Test and debug the system'
        ],
        status: 'in-progress',
        progress: 65,
        notes: 'Working on the mobile app integration. Hardware is complete.',
        starred: true,
        tags: ['arduino', 'iot', 'smart-home'],
        completed_steps: [0, 1, 2, 3],
        generated_from_params: {
          projectType: 'electronics',
          skillLevel: 'intermediate',
          interests: 'smart home, lighting',
          budget: '$30',
          duration: '5 hours'
        },
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      },
      {
        id: 'sample_2',
        title: 'Weather Station Dashboard',
        description: 'Create a web-based weather monitoring system using Raspberry Pi with sensors for temperature, humidity, and pressure.',
        difficulty: 'advanced',
        estimatedTime: '8-12 hours',
        estimatedCost: '$45-60',
        components: ['Raspberry Pi 4', 'DHT22 Sensor', 'BMP280 Sensor', 'LCD Display', 'Case'],
        skills: ['Python Programming', 'Web Development', 'Sensor Integration', 'Data Visualization'],
        steps: [
          'Set up Raspberry Pi OS',
          'Connect and calibrate sensors',
          'Write Python data collection script',
          'Create web dashboard with Flask',
          'Implement data logging and charts',
          'Deploy and test the system'
        ],
        status: 'planning',
        progress: 0,
        notes: 'Waiting for sensors to arrive. Planning the database structure.',
        starred: false,
        tags: ['raspberry-pi', 'web-dev', 'sensors'],
        completed_steps: [],
        generated_from_params: {
          projectType: 'web',
          skillLevel: 'advanced',
          interests: 'weather, data visualization',
          budget: '$50',
          duration: '10 hours'
        },
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'sample_3',
        title: 'Mobile Robot Car',
        description: 'Build a remote-controlled robot car with obstacle avoidance using ultrasonic sensors and camera streaming.',
        difficulty: 'intermediate',
        estimatedTime: '6-8 hours',
        estimatedCost: '$35-50',
        components: ['Arduino Mega', 'Motor Driver', 'DC Motors', 'Ultrasonic Sensor', 'Camera Module', 'Chassis'],
        skills: ['Robotics', 'Motor Control', 'Sensor Programming', 'Wireless Communication'],
        steps: [
          'Assemble robot chassis and motors',
          'Wire motor driver and sensors',
          'Program basic movement controls',
          'Implement obstacle avoidance',
          'Add camera streaming',
          'Create remote control interface'
        ],
        status: 'completed',
        progress: 100,
        notes: 'Project completed successfully! Works great for indoor navigation.',
        starred: true,
        tags: ['robotics', 'arduino', 'mobile'],
        completed_steps: [0, 1, 2, 3, 4, 5],
        generated_from_params: {
          projectType: 'robotics',
          skillLevel: 'intermediate',
          interests: 'robotics, remote control',
          budget: '$40',
          duration: '7 hours'
        },
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      },
      {
        id: 'sample_4',
        title: 'Plant Monitoring System',
        description: 'IoT system to monitor soil moisture, light levels, and automatically water plants when needed.',
        difficulty: 'beginner',
        estimatedTime: '3-4 hours',
        estimatedCost: '$20-30',
        components: ['ESP32', 'Soil Moisture Sensor', 'Light Sensor', 'Water Pump', 'Relay Module'],
        skills: ['IoT Programming', 'Sensor Reading', 'Automation'],
        steps: [
          'Set up ESP32 development environment',
          'Connect soil moisture and light sensors',
          'Program sensor reading logic',
          'Add water pump control',
          'Create simple web interface',
          'Test automated watering'
        ],
        status: 'in-progress',
        progress: 40,
        notes: 'Sensors are working. Need to add the water pump control.',
        starred: false,
        tags: ['iot', 'automation', 'plants'],
        completed_steps: [0, 1, 2],
        generated_from_params: {
          projectType: 'iot',
          skillLevel: 'beginner',
          interests: 'gardening, automation',
          budget: '$25',
          duration: '4 hours'
        },
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      }
    ];
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