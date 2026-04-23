import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { AppShell } from "../components/layout/AppShell";

export const Route = createFileRoute("/app")({
	component: ProtectedAppLayoutRoute,
});

function ProtectedAppLayoutRoute() {
	const session = authClient.useSession();

	if (!session.data) {
		return <Navigate to="/auth/login" />;
	}

	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}
