import { createFileRoute } from "@tanstack/react-router";
import type { Id } from "../../convex/_generated/dataModel";
import { BudgetCategoryPage } from "../features/budget/components/budget-category-page";

export const Route = createFileRoute("/app/budget/$categoryId")({
	component: BudgetCategoryDetailsRoute,
});

function BudgetCategoryDetailsRoute() {
	const { categoryId } = Route.useParams();
	return (
		<BudgetCategoryPage categoryId={categoryId as Id<"budgetCategories">} />
	);
}
