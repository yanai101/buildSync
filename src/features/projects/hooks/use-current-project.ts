import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export function useCurrentProject() {
	const projectsQuery = useQuery(convexQuery(api.projects.listMine, {})) as {
		data?: Doc<"projects">[];
		isPending: boolean;
	};
	const userQuery = useQuery(convexQuery(api.users.me, {})) as {
		data?: Doc<"users"> | null;
		isPending: boolean;
	};

	const projects = projectsQuery.data ?? [];
	const storageKey = useMemo(() => {
		const userId = userQuery.data?._id ?? "anonymous";
		return `buildflow:selected-project:${userId}`;
	}, [userQuery.data?._id]);
	const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(
		null,
	);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const savedProjectId = window.localStorage.getItem(storageKey) as Id<"projects"> | null;
		setSelectedProjectId(savedProjectId);
	}, [storageKey]);

	useEffect(() => {
		if (typeof window === "undefined" || projects.length === 0) {
			return;
		}

		const selectedProjectStillExists = selectedProjectId
			? projects.some((project) => project._id === selectedProjectId)
			: false;

		if (selectedProjectStillExists) {
			window.localStorage.setItem(storageKey, selectedProjectId as string);
			return;
		}

		const fallbackProjectId = projects[0]?._id ?? null;
		setSelectedProjectId(fallbackProjectId);

		if (fallbackProjectId) {
			window.localStorage.setItem(storageKey, fallbackProjectId);
		} else {
			window.localStorage.removeItem(storageKey);
		}
	}, [projects, selectedProjectId, storageKey]);

	const project =
		(selectedProjectId
			? projects.find((candidate) => candidate._id === selectedProjectId)
			: null) ?? projects[0] ?? null;

	const setCurrentProject = async (projectId: Id<"projects"> | null) => {
		setSelectedProjectId(projectId);
		if (typeof window === "undefined") {
			return;
		}

		if (projectId) {
			window.localStorage.setItem(storageKey, projectId);
		} else {
			window.localStorage.removeItem(storageKey);
		}
	};

	return {
		...projectsQuery,
		projects,
		user: userQuery.data ?? null,
		isPending: projectsQuery.isPending || userQuery.isPending,
		project,
		projectId: project?._id ?? null,
		setCurrentProject,
	};
}
