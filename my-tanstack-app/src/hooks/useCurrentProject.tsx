import * as React from 'react';
import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { PROJECT } from '../utils/mockData';

type ProjectContextType = {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  isInitialized: boolean;
};

const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.me, {});
  const [isInitialized, setIsInitialized] = React.useState(false);
  const isMock = typeof window !== 'undefined' && localStorage.getItem('buildsync:ds:project') === 'mock';
  
  const storageKey = React.useMemo(() => {
    if (!isInitialized || (!isMock && user === undefined)) return null;
    const userId = user?._id ?? 'anonymous';
    const mode = isMock ? 'mock' : 'db';
    return `buildsync:selected-project:${userId}:${mode}`;
  }, [user?._id, isMock, isInitialized]);

  const [selectedProjectId, setSelectedProjectIdState] = React.useState<string | null>(null);

  // 1. Wait for user to load before reading from localStorage
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMock && user === undefined) return; // Wait for real user if not mock
    
    const userId = user?._id ?? 'anonymous';
    const mode = isMock ? 'mock' : 'db';
    const key = `buildsync:selected-project:${userId}:${mode}`;
    
    setSelectedProjectIdState(window.localStorage.getItem(key));
    setIsInitialized(true);
  }, [user?._id, isMock]);

  const setSelectedProjectId = React.useCallback((id: string | null) => {
    setSelectedProjectIdState(id);
    if (typeof window !== 'undefined' && storageKey) {
      if (id) window.localStorage.setItem(storageKey, id);
      else window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId, isInitialized }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useCurrentProject() {
  const context = React.useContext(ProjectContext);
  if (!context) {
    throw new Error('useCurrentProject must be used within a ProjectProvider');
  }
  const { selectedProjectId, setSelectedProjectId, isInitialized } = context;

  const isMock = typeof window !== 'undefined' && localStorage.getItem('buildsync:ds:project') === 'mock';
  const dbProjects = useQuery(api.projects.listMine, {});
  const user = useQuery(api.users.me, {});

  const projects = React.useMemo(() => {
    if (isMock) {
      return [{ 
        _id: 'mock-p1', 
        name: PROJECT.name, 
        address: PROJECT.address, 
        areaSqm: PROJECT.area,
        currentStageName: PROJECT.currentStage,
        status: 'active'
      }];
    }
    return dbProjects ?? [];
  }, [isMock, dbProjects]);

  const isLoading = !isInitialized || (!isMock && (dbProjects === undefined || user === undefined));

  React.useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    
    // If we finished loading and there are no projects, clear selection
    if (projects.length === 0) {
      if (selectedProjectId) setSelectedProjectId(null);
      return;
    }

    // If we have a selection, check if it's still valid
    const existingSelected = selectedProjectId
      ? projects.find((p: any) => p._id === selectedProjectId)
      : null;

    // If selection is invalid OR none selected, pick the first one
    if (!existingSelected && projects.length > 0) {
      // Only auto-select if we don't have a valid selection yet
      setSelectedProjectId(projects[0]._id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId, isLoading]);

  const project =
    (selectedProjectId
      ? projects.find((candidate: any) => candidate._id === selectedProjectId)
      : null) ?? projects[0] ?? null;

  const setCurrentProject = React.useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, [setSelectedProjectId]);

  return {
    user,
    projects,
    project: project as any | null,
    projectId: (project?._id ?? null) as Id<'projects'> | null,
    hasMultipleProjects: projects.length > 1,
    setCurrentProject,
    isMock
  };
}
