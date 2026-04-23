import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvex } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useCreatePayment(projectId: Id<"projects"> | null) {
	const convex = useConvex();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			supplierId: Id<"suppliers">;
			amount: number;
			dueDate?: string;
			note?: string;
		}) => {
			if (!projectId) {
				throw new Error("Missing projectId");
			}

			return await convex.mutation(api.payments.create, {
				projectId,
				supplierId: input.supplierId,
				amount: input.amount,
				dueDate: input.dueDate,
				status: "planned",
				note: input.note,
			});
		},
		onSuccess: async () => {
			if (!projectId) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: convexQuery(api.payments.listByProject, { projectId })
					.queryKey,
			});
		},
	});
}
