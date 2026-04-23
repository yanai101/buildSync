import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvex } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useMarkPaymentPaid(projectId: Id<"projects"> | null) {
	const convex = useConvex();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (paymentId: Id<"payments">) => {
			if (!projectId) {
				throw new Error("Missing projectId");
			}

			return await convex.mutation(api.payments.markPaid, {
				projectId,
				paymentId,
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
