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

type Props = {
	open: boolean;
	onClose: () => void;
	suppliers: Array<Doc<"suppliers">>;
	onSubmit: (input: {
		supplierId: Id<"suppliers">;
		amount: number;
		dueDate?: string;
		note?: string;
	}) => Promise<unknown>;
	isPending?: boolean;
};

export function AddPaymentDialog({
	open,
	onClose,
	suppliers,
	onSubmit,
	isPending,
}: Props) {
	const { t } = useTranslation("common");
	const [supplierId, setSupplierId] = useState("");
	const [amount, setAmount] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [note, setNote] = useState("");

	const canSubmit = useMemo(() => {
		const parsedAmount = Number(amount);
		return (
			Boolean(supplierId) && Number.isFinite(parsedAmount) && parsedAmount > 0
		);
	}, [supplierId, amount]);

	const handleSubmit = async () => {
		if (!canSubmit) {
			return;
		}

		await onSubmit({
			supplierId: supplierId as Id<"suppliers">,
			amount: Number(amount),
			dueDate: dueDate || undefined,
			note: note || undefined,
		});

		setSupplierId("");
		setAmount("");
		setDueDate("");
		setNote("");
		onClose();
	};

	return (
		<Dialog open={open} onClose={onClose} fullWidth>
			<DialogTitle>{t("payments.addPayment")}</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					<TextField
						select
						label={t("suppliers.title")}
						value={supplierId}
						onChange={(event) => setSupplierId(event.target.value)}
						fullWidth
					>
						{suppliers.map((supplier) => (
							<MenuItem key={supplier._id} value={supplier._id}>
								{supplier.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						label={t("payments.amount")}
						type="number"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
						fullWidth
					/>
					<TextField
						label={t("payments.dueDate")}
						type="date"
						value={dueDate}
						onChange={(event) => setDueDate(event.target.value)}
						InputLabelProps={{ shrink: true }}
						fullWidth
					/>
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
					{t("payments.addPayment")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
