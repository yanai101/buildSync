import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvex } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useReschedulePayment(projectId: Id<"projects"> | null) {
	const convex = useConvex();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			paymentId: Id<"payments">;
			dueDate: string;
		}) => {
			if (!projectId) {
				throw new Error("Missing projectId");
			}

			return await convex.mutation(api.payments.reschedule, {
				projectId,
				paymentId: input.paymentId,
				dueDate: input.dueDate,
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
