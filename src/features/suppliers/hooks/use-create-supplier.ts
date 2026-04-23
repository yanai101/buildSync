import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvex } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useCreateSupplier(projectId: Id<"projects"> | null) {
	const convex = useConvex();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			name: string;
			trade: string;
			contactPhone?: string;
			contactEmail?: string;
			agreedAmount?: number;
			notes?: string;
		}) => {
			if (!projectId) {
				throw new Error("Missing projectId");
			}

			return await convex.mutation(api.suppliers.create, {
				projectId,
				status: "active",
				...input,
			});
		},
		onSuccess: async () => {
			if (!projectId) {
				return;
			}

			await queryClient.invalidateQueries({
				queryKey: convexQuery(api.suppliers.listByProject, { projectId })
					.queryKey,
			});
		},
	});
}
