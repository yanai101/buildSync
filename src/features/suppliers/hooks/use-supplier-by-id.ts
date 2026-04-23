import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export function useSupplierById(
	projectId: Id<"projects"> | null,
	supplierId: Id<"suppliers">,
) {
	const query = useQuery({
		...convexQuery(api.suppliers.getById, {
			projectId: (projectId ?? "") as Id<"projects">,
			supplierId,
		}),
		enabled: !!projectId,
	}) as { data?: Doc<"suppliers"> | null; isPending: boolean };

	return {
		...query,
		supplier: query.data ?? null,
	};
}
