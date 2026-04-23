import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export function usePaymentsList(projectId: Id<"projects"> | null) {
	const query = useQuery({
		...convexQuery(api.payments.listByProject, {
			projectId: (projectId ?? "") as Id<"projects">,
		}),
		enabled: !!projectId,
	}) as { data?: Doc<"payments">[]; isPending: boolean };

	return {
		...query,
		payments: query.data ?? [],
	};
}
