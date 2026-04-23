import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type DashboardSummary = {
	budgetRemaining: number;
	budgetTotal: number;
	spent: number;
	topOverruns: Array<{
		categoryId: string;
		categoryName: string;
		overrun: number;
	}>;
	currentStage: {
		id: string;
		name: string;
		progress: number;
		status: "not_started" | "in_progress" | "done";
	} | null;
	nextStage: {
		id: string;
		name: string;
		status: "not_started" | "in_progress" | "done";
	} | null;
	nextPayment: {
		id: string;
		amount: number;
		dueDate: string | null;
		status: "planned" | "paid" | "overdue";
		supplierId: string;
	} | null;
	openTasks: string[];
};

export function useDashboardSummary(projectId: Id<"projects"> | null) {
	const query = useQuery({
		...convexQuery(api.dashboard.summary, {
			projectId: (projectId ?? "") as Id<"projects">,
		}),
		enabled: !!projectId,
	}) as { data?: DashboardSummary; isPending: boolean };

	return {
		...query,
		summary: query.data ?? {
			budgetRemaining: 0,
			budgetTotal: 0,
			spent: 0,
			topOverruns: [],
			currentStage: null,
			nextStage: null,
			nextPayment: null,
			openTasks: [],
		},
	};
}
