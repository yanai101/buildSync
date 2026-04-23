import { createFileRoute } from "@tanstack/react-router";
import { SuppliersPage } from "../features/suppliers/components/suppliers-page";

export const Route = createFileRoute("/app/suppliers")({
	component: SuppliersRoute,
});

function SuppliersRoute() {
	return <SuppliersPage />;
}
