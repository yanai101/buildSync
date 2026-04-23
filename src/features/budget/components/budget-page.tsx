import {
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Stack,
	Typography,
} from "@mui/material";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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

export function BudgetPage() {
	const { t } = useTranslation("common");
	const [dialogOpen, setDialogOpen] = useState(false);
	const { projectId, isPending: projectPending } = useCurrentProject();
	const { categories, isPending: categoriesPending } =
		useBudgetCategories(projectId);
	const { expenses } = useBudgetExpenses(projectId);
	const { suppliers } = useSuppliers(projectId);
	const createExpense = useCreateExpense(projectId);

	const actualByCategory = useMemo(() => {
		const totals = new Map<string, number>();

		for (const expense of expenses) {
			const key = String(expense.categoryId);
			totals.set(key, (totals.get(key) ?? 0) + expense.amount);
		}

		return totals;
	}, [expenses]);

	if (projectPending) {
		return (
			<PageContainer title={t("budget.title")}>
				<CircularProgress />
			</PageContainer>
		);
	}

	if (!projectId) {
		return (
			<PageContainer title={t("budget.title")}>
				<Stack spacing={1}>
					<Typography fontWeight={700}>{t("budget.noProject")}</Typography>
					<Typography color="text.secondary">
						{t("budget.createProjectFirst")}
					</Typography>
					<Button
						component={Link}
						to="/onboarding/new-project"
						variant="contained"
					>
						{t("onboarding.title")}
					</Button>
				</Stack>
			</PageContainer>
		);
	}

	return (
		<PageContainer title={t("budget.title")}>
			<Stack spacing={2}>
				<Button variant="contained" onClick={() => setDialogOpen(true)}>
					{t("budget.addExpense")}
				</Button>

				{categoriesPending ? <CircularProgress size={24} /> : null}

				{categories.map((category) => {
					const actual = actualByCategory.get(String(category._id)) ?? 0;
					const status = actual > category.plannedAmount ? "overrun" : "ok";

					return (
						<Card key={category._id} variant="outlined">
							<CardContent>
								<Stack spacing={1}>
									<Link
										to="/app/budget/$categoryId"
										params={{ categoryId: category._id }}
										style={{ textDecoration: "none" }}
									>
										<Typography color="text.primary" fontWeight={700}>
											{category.name}
										</Typography>
									</Link>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										flexWrap="wrap"
									>
										<Typography variant="body2">
											{t("budget.planned")}:{" "}
											{formatCurrency(category.plannedAmount)}
										</Typography>
										<Typography variant="body2">
											{t("budget.actual")}: {formatCurrency(actual)}
										</Typography>
										<Chip
											label={
												status === "overrun"
													? t("home.overruns")
													: t("budget.status")
											}
											color={status === "overrun" ? "error" : "success"}
											size="small"
										/>
									</Stack>
								</Stack>
							</CardContent>
						</Card>
					);
				})}

				<AddExpenseDialog
					open={dialogOpen}
					onClose={() => setDialogOpen(false)}
					categories={categories}
					suppliers={suppliers}
					onSubmit={createExpense.mutateAsync}
					isPending={createExpense.isPending}
				/>
			</Stack>
		</PageContainer>
	);
}
