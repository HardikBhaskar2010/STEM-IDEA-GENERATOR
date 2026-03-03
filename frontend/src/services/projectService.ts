// Re-export everything from the Supabase-based service
// This file now acts as a proxy to maintain backward compatibility
// All project data is now stored in Supabase instead of localStorage
export type { SavedProject } from './projectServiceSupabase';
export { projectService } from './projectServiceSupabase';
