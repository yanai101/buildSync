import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export function useBudgetExpenses(projectId: Id<"projects"> | null) {
	const query = useQuery({
		...convexQuery(api.expenses.listByProject, {
			projectId: (projectId ?? "") as Id<"projects">,
		}),
		enabled: !!projectId,
	}) as { data?: Doc<"expenses">[]; isPending: boolean };

	return { ...query, expenses: query.data ?? [] };
}
