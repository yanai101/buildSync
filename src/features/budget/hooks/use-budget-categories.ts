import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export function useBudgetCategories(projectId: Id<"projects"> | null) {
	const query = useQuery({
		...convexQuery(api.budgetCategories.listByProject, {
			projectId: (projectId ?? "") as Id<"projects">,
		}),
		enabled: !!projectId,
	}) as { data?: Doc<"budgetCategories">[]; isPending: boolean };

	return { ...query, categories: query.data ?? [] };
}
