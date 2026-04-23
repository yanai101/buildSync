import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvex } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useCreateExpense(projectId: Id<"projects"> | null) {
	const convex = useConvex();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			categoryId: Id<"budgetCategories">;
			amount: number;
			expenseDate: string;
			supplierId?: Id<"suppliers">;
			note?: string;
		}) => {
			if (!projectId) {
				throw new Error("Missing projectId");
			}

			return await convex.mutation(api.expenses.create, {
				projectId,
				...input,
			});
		},
		onSuccess: async () => {
			if (!projectId) {
				return;
			}

			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: convexQuery(api.expenses.listByProject, { projectId })
						.queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: convexQuery(api.budgetCategories.listByProject, {
						projectId,
					}).queryKey,
				}),
			]);
		},
	});
}
