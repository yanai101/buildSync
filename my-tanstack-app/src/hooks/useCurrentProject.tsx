import * as React from 'react';
import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { PROJECT } from '../utils/mockData';
import { getActiveTier } from '../../convex/_lib/entitlements';

// ── Shared identity type (mirrors the shape of api.users.currentIdentity) ──
export type Identity = {
  userId: string;
  email: string | null;
  name: string | null;
  role: string | null;
  isSuperAdmin: boolean;
  subscriptionTier: string | undefined;
  subscriptionExpiresAt: number | undefined;
  isSubscriptionExpired: boolean;
};

export type SubscriptionInfo = {
  isLoaded: boolean;
  tier: string;
  isProOrPremium: boolean;
  isSelfProOrPremium: boolean;
  isPremium: boolean;
  isSuperAdmin: boolean;
};

export type AccessInfo = {
  canViewBudget: boolean;
  canViewSchedule: boolean;
} | undefined;

type ProjectContextType = {
  // ── Auth / user ──
  user: any; // raw user doc from api.users.me
  identity: Identity | null; // computed identity (same shape as currentIdentity)
  guardedUserId: string | null | undefined;

  // ── Project selection ──
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  isInitialized: boolean;

  // ── Project data (hoisted from useCurrentProject) ──
  projects: any[];
  project: any | null;
  projectId: Id<'projects'> | null;
  hasMultipleProjects: boolean;
  setCurrentProject: (projectId: string) => void;
  isMock: boolean;
  isLoading: boolean;

  // ── Subscription (hoisted from useSubscription) ──
  subscription: SubscriptionInfo;

  // ── Access info (hoisted — avoids per-screen duplication) ──
  accessInfo: AccessInfo;
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

  // ── Computed identity (same shape as api.users.currentIdentity) ──
  // Avoids a separate WebSocket subscription while providing the exact same
  // fields that consumers of currentIdentity expect.
  const identity = React.useMemo<Identity | null>(() => {
    if (!user) return null;
    const isExpired = !!(user.subscriptionExpiresAt && Date.now() > user.subscriptionExpiresAt);
    return {
      userId: user._id,
      email: user.email ?? null,
      name: user.name ?? null,
      role: user.role ?? null,
      isSuperAdmin: user.isSuperAdmin ?? false,
      subscriptionTier: isExpired ? undefined : user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      isSubscriptionExpired: isExpired,
    };
  }, [user]);

  // ── Hoist project list query — called ONCE instead of per-consumer ──
  const dbProjects = useQuery(api.projects.listMine, {});

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

  // Auto-selection effect — runs ONCE in the Provider instead of per-consumer
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

  const projectId = (project?._id ?? null) as Id<'projects'> | null;

  const setCurrentProject = React.useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, [setSelectedProjectId]);

  // ── Hoist subscription query — called ONCE ──
  const ownerSubscription = useQuery(
    api.projects.getOwnerSubscription,
    projectId ? { projectId } : 'skip'
  );

  const subscription = React.useMemo<SubscriptionInfo>(() => {
    if (!user) {
      return { isLoaded: false, tier: 'free', isProOrPremium: false, isSelfProOrPremium: false, isPremium: false, isSuperAdmin: false };
    }
    const selfActiveTier = getActiveTier(user);
    const selfProOrPremium = selfActiveTier !== 'free';
    const activeTier = projectId ? (ownerSubscription?.tier || 'free') : selfActiveTier;
    const isProOrPremium = projectId ? !!ownerSubscription?.isProOrPremium : selfProOrPremium;
    const isPremium = activeTier === 'premium';
    return {
      isLoaded: user !== undefined && user !== null && (projectId ? ownerSubscription !== undefined : true),
      tier: activeTier,
      isProOrPremium,
      isSelfProOrPremium: selfProOrPremium,
      isPremium,
      isSuperAdmin: !!user.isSuperAdmin,
    };
  }, [user, projectId, ownerSubscription]);

  // ── Hoist access info query — called ONCE ──
  const accessInfo = useQuery(
    api.projects.getProjectAccessInfo,
    projectId ? { projectId } : 'skip'
  );

  const contextValue = React.useMemo<ProjectContextType>(() => ({
    user, identity, guardedUserId,
    selectedProjectId, setSelectedProjectId, isInitialized,
    projects, project: project as any | null, projectId,
    hasMultipleProjects: projects.length > 1,
    setCurrentProject, isMock, isLoading,
    subscription, accessInfo,
  }), [
    user, identity, guardedUserId,
    selectedProjectId, setSelectedProjectId, isInitialized,
    projects, project, projectId,
    setCurrentProject, isMock, isLoading,
    subscription, accessInfo,
  ]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useCurrentProject() {
  const context = React.useContext(ProjectContext);
  if (!context) {
    throw new Error('useCurrentProject must be used within a ProjectProvider');
  }
  // Simply return the context — all data is computed in the Provider
  return context;
}
