import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	MenuItem,
	Stack,
	TextField,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { createExpenseSchema } from "../types";

type Props = {
	open: boolean;
	onClose: () => void;
	categories: Array<Doc<"budgetCategories">>;
	suppliers: Array<Doc<"suppliers">>;
	onSubmit: (payload: {
		categoryId: Id<"budgetCategories">;
		amount: number;
		expenseDate: string;
		supplierId?: Id<"suppliers">;
		note?: string;
	}) => Promise<unknown>;
	defaultCategoryId?: Id<"budgetCategories">;
	isPending?: boolean;
};

function todayIso() {
	return new Date().toISOString().slice(0, 10);
}

export function AddExpenseDialog({
	open,
	onClose,
	categories,
	suppliers,
	onSubmit,
	defaultCategoryId,
	isPending,
}: Props) {
	const { t } = useTranslation("common");
	const [categoryId, setCategoryId] = useState<string>(defaultCategoryId ?? "");
	const [amount, setAmount] = useState<string>("");
	const [expenseDate, setExpenseDate] = useState<string>(todayIso());
	const [supplierId, setSupplierId] = useState<string>("");
	const [note, setNote] = useState<string>("");

	const canSubmit = useMemo(() => {
		const parsedAmount = Number(amount);
		return (
			Boolean(categoryId) && Number.isFinite(parsedAmount) && parsedAmount > 0
		);
	}, [amount, categoryId]);

	const handleSubmit = async () => {
		const parsed = createExpenseSchema.safeParse({
			categoryId,
			amount: Number(amount),
			expenseDate,
			supplierId: supplierId || undefined,
			note: note || undefined,
		});

		if (!parsed.success) {
			return;
		}

		await onSubmit({
			categoryId: parsed.data.categoryId as Id<"budgetCategories">,
			amount: parsed.data.amount,
			expenseDate: parsed.data.expenseDate,
			supplierId: parsed.data.supplierId as Id<"suppliers"> | undefined,
			note: parsed.data.note,
		});

		setAmount("");
		setNote("");
		setSupplierId("");
		setExpenseDate(todayIso());
		onClose();
	};

	return (
		<Dialog fullWidth open={open} onClose={onClose}>
			<DialogTitle>{t("budget.addExpense")}</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					<TextField
						select
						label={t("budget.categoryDetails")}
						value={categoryId}
						onChange={(event) => setCategoryId(event.target.value)}
						required
						fullWidth
					>
						{categories.map((category) => (
							<MenuItem key={category._id} value={category._id}>
								{category.name}
							</MenuItem>
						))}
					</TextField>

					<TextField
						label={t("budget.amount")}
						type="number"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
						inputProps={{ inputMode: "decimal" }}
						required
						fullWidth
					/>

					<TextField
						label={t("budget.date")}
						type="date"
						value={expenseDate}
						onChange={(event) => setExpenseDate(event.target.value)}
						fullWidth
						InputLabelProps={{ shrink: true }}
					/>

					<TextField
						select
						label={t("suppliers.title")}
						value={supplierId}
						onChange={(event) => setSupplierId(event.target.value)}
						fullWidth
					>
						<MenuItem value="">{t("common.placeholder")}</MenuItem>
						{suppliers.map((supplier) => (
							<MenuItem key={supplier._id} value={supplier._id}>
								{supplier.name}
							</MenuItem>
						))}
					</TextField>

					<TextField
						label={t("budget.note")}
						value={note}
						onChange={(event) => setNote(event.target.value)}
						fullWidth
						multiline
						minRows={2}
					/>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>{t("common.back")}</Button>
				<Button
					onClick={handleSubmit}
					variant="contained"
					disabled={!canSubmit || isPending}
				>
					{t("budget.addExpense")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
