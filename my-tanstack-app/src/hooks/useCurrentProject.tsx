import * as React from 'react';
import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { PROJECT } from '../utils/mockData';

type ProjectContextType = {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  isInitialized: boolean;
  user: any; // shared — avoids second api.users.me subscription
  guardedUserId: string | null | undefined;
};

const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.me, {});
  const [isInitialized, setIsInitialized] = React.useState(false);
  const isMock = typeof window !== 'undefined' && localStorage.getItem('buildsync:ds:project') === 'mock';
  // Track previous userId to detect account switches within the same session
  const prevUserIdRef = React.useRef<string | undefined>(undefined);
  // guardedUserId only advances to the current userId *after* the localStorage
  // read for that user has completed — while it differs from user?._id the
  // rest of the hook treats the project list as empty so stale Convex cache
  // data from the previous account can never bleed into the new session.
  const [guardedUserId, setGuardedUserId] = React.useState<string | null | undefined>(undefined);
  
  const storageKey = React.useMemo(() => {
    if (!isInitialized || (!isMock && user === undefined)) return null;
    const userId = user?._id ?? 'anonymous';
    const mode = isMock ? 'mock' : 'db';
    return `buildsync:selected-project:${userId}:${mode}`;
  }, [user?._id, isMock, isInitialized]);

  const [selectedProjectId, setSelectedProjectIdState] = React.useState<string | null>(null);

  // Wait for user to load before reading from localStorage.
  // Also reset state when the logged-in account changes so that
  // a newly-logged-in user never briefly sees the previous user's projects.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMock && user === undefined) return; // Wait for real user if not mock

    const currentUserId = user?._id ?? null;

    // If the userId changed (logout → new login) wipe the selection first.
    // guardedUserId stays at the OLD value until the end of this effect so
    // that the render BEFORE this effect's state updates resolves as loading.
    if (
      prevUserIdRef.current !== undefined &&
      prevUserIdRef.current !== (user?._id)
    ) {
      setSelectedProjectIdState(null);
      setIsInitialized(false);
    }
    prevUserIdRef.current = user?._id;
    
    const userId = currentUserId ?? 'anonymous';
    const mode = isMock ? 'mock' : 'db';
    const key = `buildsync:selected-project:${userId}:${mode}`;
    
    setSelectedProjectIdState(window.localStorage.getItem(key));
    setIsInitialized(true);
    // Advance the guard LAST so any render during this batch still sees the
    // guard as stale and treats projects as empty.
    setGuardedUserId(currentUserId);
  }, [user?._id, isMock]);

  const setSelectedProjectId = React.useCallback((id: string | null) => {
    setSelectedProjectIdState(id);
    if (typeof window !== 'undefined' && storageKey) {
      if (id) window.localStorage.setItem(storageKey, id);
      else window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId, isInitialized, user, guardedUserId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useCurrentProject() {
  const context = React.useContext(ProjectContext);
  if (!context) {
    throw new Error('useCurrentProject must be used within a ProjectProvider');
  }
  const { selectedProjectId, setSelectedProjectId, isInitialized, user, guardedUserId } = context;

  const isMock = typeof window !== 'undefined' && localStorage.getItem('buildsync:ds:project') === 'mock';
  const dbProjects = useQuery(api.projects.listMine, {});
  // user is already subscribed in ProjectProvider — reuse from context (no second useQuery)

  // guardedUserId lags one batch behind user?._id during an account switch.
  // While they differ, treat the project list as empty so stale Convex cache
  // data from the PREVIOUS account cannot leak into the new user's session.
  const userSwitchInProgress = guardedUserId !== (user?._id ?? null);

  const projects = React.useMemo(() => {
    if (userSwitchInProgress) return [];
    if (isMock) {
      return [{ 
        _id: 'mock-p1', 
        name: PROJECT.name, 
        address: PROJECT.address, 
        areaSqm: PROJECT.area,
        currentStageName: PROJECT.currentStage,
        status: 'active',
        ownerUserId: user?._id
      }] as any[];
    }
    return dbProjects ?? [];
  }, [isMock, dbProjects, user?._id, userSwitchInProgress]);

  const isLoading = userSwitchInProgress || !isInitialized || (!isMock && (dbProjects === undefined || user === undefined));

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

  // While loading (including during account switch), never return a stale project
  const project = isLoading
    ? null
    : selectedProjectId
      ? (projects.find((candidate: any) => candidate._id === selectedProjectId) ?? projects[0] ?? null)
      : projects[0] ?? null;

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
    isMock,
    isLoading
  };
}
