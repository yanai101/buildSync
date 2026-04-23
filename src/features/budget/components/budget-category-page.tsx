import { Button, Stack, Typography } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Id } from "../../../../convex/_generated/dataModel";
import { PageContainer } from "../../../shared/components/page-container";
import { useCurrentProject } from "../../projects/hooks/use-current-project";
import { useBudgetCategories } from "../hooks/use-budget-categories";
import { useBudgetExpenses } from "../hooks/use-budget-expenses";
import { useCreateExpense } from "../hooks/use-create-expense";
import { useSuppliers } from "../hooks/use-suppliers";
import { AddExpenseDialog } from "./add-expense-dialog";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("he-IL", {
		style: "currency",
		currency: "ILS",
		maximumFractionDigits: 0,
	}).format(value);
}

export function BudgetCategoryPage({
	categoryId,
}: {
	categoryId: Id<"budgetCategories">;
}) {
	const { t } = useTranslation("common");
	const [dialogOpen, setDialogOpen] = useState(false);
	const { projectId } = useCurrentProject();
	const { categories } = useBudgetCategories(projectId);
	const { expenses } = useBudgetExpenses(projectId);
	const { suppliers } = useSuppliers(projectId);
	const createExpense = useCreateExpense(projectId);

	const category = categories.find((item) => item._id === categoryId);
	const categoryExpenses = useMemo(
		() => expenses.filter((expense) => expense.categoryId === categoryId),
		[categoryId, expenses],
	);

	const totalActual = categoryExpenses.reduce(
		(sum, item) => sum + item.amount,
		0,
	);

	if (!category) {
		return (
			<PageContainer title={t("budget.categoryDetails")}>
				<Typography>{t("common.placeholder")}</Typography>
			</PageContainer>
		);
	}

	return (
		<PageContainer title={category.name}>
			<Stack spacing={2}>
				<Typography>
					{t("budget.planned")}: {formatCurrency(category.plannedAmount)}
				</Typography>
				<Typography>
					{t("budget.actual")}: {formatCurrency(totalActual)}
				</Typography>

				<Button variant="contained" onClick={() => setDialogOpen(true)}>
					{t("budget.addExpense")}
				</Button>

				{categoryExpenses.map((expense) => (
					<Stack
						key={expense._id}
						direction="row"
						justifyContent="space-between"
					>
						<Typography>{expense.expenseDate}</Typography>
						<Typography>{formatCurrency(expense.amount)}</Typography>
					</Stack>
				))}

				<Typography component={Link} to="/app/budget" color="primary">
					{t("common.back")}
				</Typography>

				<AddExpenseDialog
					open={dialogOpen}
					onClose={() => setDialogOpen(false)}
					categories={categories}
					suppliers={suppliers}
					defaultCategoryId={categoryId}
					onSubmit={createExpense.mutateAsync}
					isPending={createExpense.isPending}
				/>
			</Stack>
		</PageContainer>
	);
}
