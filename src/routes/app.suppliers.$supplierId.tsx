import { createFileRoute } from "@tanstack/react-router";
import type { Id } from "../../convex/_generated/dataModel";
import { SupplierProfilePage } from "../features/suppliers/components/supplier-profile-page";

export const Route = createFileRoute("/app/suppliers/$supplierId")({
	component: SupplierProfileRoute,
});

function SupplierProfileRoute() {
	const { supplierId } = Route.useParams();
	return <SupplierProfilePage supplierId={supplierId as Id<"suppliers">} />;
}
