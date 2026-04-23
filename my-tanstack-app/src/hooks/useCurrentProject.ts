import * as React from 'react';
import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';

type ProjectDoc = NonNullable<ReturnType<typeof useProjectList>[number]>;

function useProjectList() {
  return (useQuery(api.projects.listMine, {}) ?? []) as any[];
}

export function useCurrentProject() {
  const projects = useProjectList();
  const user = useQuery(api.users.me, {});
  const storageKey = React.useMemo(() => {
    const userId = user?._id ?? 'anonymous';
    return `buildsync:selected-project:${userId}`;
  }, [user?._id]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setSelectedProjectId(window.localStorage.getItem(storageKey));
  }, [storageKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (projects.length === 0) {
      window.localStorage.removeItem(storageKey);
      setSelectedProjectId(null);
      return;
    }

    const existingSelected = selectedProjectId
      ? projects.find((project) => project._id === selectedProjectId)
      : null;

    if (existingSelected) {
      window.localStorage.setItem(storageKey, selectedProjectId!);
      return;
    }

    const fallbackProjectId = projects[0]._id;
    setSelectedProjectId(fallbackProjectId);
    window.localStorage.setItem(storageKey, fallbackProjectId);
  }, [projects, selectedProjectId, storageKey]);

  const project =
    (selectedProjectId
      ? projects.find((candidate) => candidate._id === selectedProjectId)
      : null) ?? projects[0] ?? null;

  const setCurrentProject = React.useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, projectId);
    }
  }, [storageKey]);

  return {
    user,
    projects,
    project: project as ProjectDoc | null,
    projectId: project?._id ?? null,
    hasMultipleProjects: projects.length > 1,
    setCurrentProject,
  };
}
