import * as React from 'react';
import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import { PROJECT } from '../utils/mockData';

type ProjectContextType = {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
};

const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.me, {});
  const isMock = typeof window !== 'undefined' && localStorage.getItem('buildsync:ds:project') === 'mock';
  
  const storageKey = React.useMemo(() => {
    const userId = user?._id ?? 'anonymous';
    const mode = isMock ? 'mock' : 'db';
    return `buildsync:selected-project:${userId}:${mode}`;
  }, [user?._id, isMock]);

  const [selectedProjectId, setSelectedProjectIdState] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setSelectedProjectIdState(window.localStorage.getItem(storageKey));
  }, [storageKey]);

  const setSelectedProjectId = React.useCallback((id: string | null) => {
    setSelectedProjectIdState(id);
    if (typeof window !== 'undefined') {
      if (id) window.localStorage.setItem(storageKey, id);
      else window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useCurrentProject() {
  const context = React.useContext(ProjectContext);
  if (!context) {
    throw new Error('useCurrentProject must be used within a ProjectProvider');
  }
  const { selectedProjectId, setSelectedProjectId } = context;

  const isMock = typeof window !== 'undefined' && localStorage.getItem('buildsync:ds:project') === 'mock';
  const dbProjects = useQuery(api.projects.listMine, {}) ?? [];
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
    return dbProjects;
  }, [isMock, dbProjects]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (projects.length === 0) {
      if (selectedProjectId) setSelectedProjectId(null);
      return;
    }

    const existingSelected = selectedProjectId
      ? projects.find((p: any) => p._id === selectedProjectId)
      : null;

    if (!existingSelected && projects.length > 0) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

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
    projectId: project?._id ?? null,
    hasMultipleProjects: projects.length > 1,
    setCurrentProject,
    isMock
  };
}
