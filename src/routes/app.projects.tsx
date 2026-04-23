import { createFileRoute } from "@tanstack/react-router";

import { ProjectSwitcherPage } from "../features/projects/components/project-switcher-page";

export const Route = createFileRoute("/app/projects")({
	component: AppProjectsRoute,
});

function AppProjectsRoute() {
	return <ProjectSwitcherPage />;
}
