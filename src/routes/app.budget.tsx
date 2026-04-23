import { createFileRoute } from "@tanstack/react-router";
import { BudgetPage } from "../features/budget/components/budget-page";

export const Route = createFileRoute("/app/budget")({
	component: BudgetRoute,
});

function BudgetRoute() {
	return <BudgetPage />;
}
