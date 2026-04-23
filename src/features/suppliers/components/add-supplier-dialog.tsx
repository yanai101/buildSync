import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Stack,
	TextField,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { createSupplierSchema } from "../types";

type Props = {
	open: boolean;
	onClose: () => void;
	onSubmit: (input: {
		name: string;
		trade: string;
		contactPhone?: string;
		contactEmail?: string;
		agreedAmount?: number;
		notes?: string;
	}) => Promise<unknown>;
	isPending?: boolean;
};

export function AddSupplierDialog({
	open,
	onClose,
	onSubmit,
	isPending,
}: Props) {
	const { t } = useTranslation("common");
	const [name, setName] = useState("");
	const [trade, setTrade] = useState("");
	const [contactPhone, setContactPhone] = useState("");
	const [contactEmail, setContactEmail] = useState("");
	const [agreedAmount, setAgreedAmount] = useState("");
	const [notes, setNotes] = useState("");

	const canSubmit = useMemo(
		() => name.trim().length > 1 && trade.trim().length > 1,
		[name, trade],
	);

	const handleSubmit = async () => {
		const parsed = createSupplierSchema.safeParse({
			name: name.trim(),
			trade: trade.trim(),
			contactPhone: contactPhone.trim() || undefined,
			contactEmail: contactEmail.trim() || undefined,
			agreedAmount: agreedAmount ? Number(agreedAmount) : undefined,
			notes: notes.trim() || undefined,
		});

		if (!parsed.success) {
			return;
		}

		await onSubmit({
			name: parsed.data.name,
			trade: parsed.data.trade,
			contactPhone: parsed.data.contactPhone,
			contactEmail:
				parsed.data.contactEmail && parsed.data.contactEmail.length > 0
					? parsed.data.contactEmail
					: undefined,
			agreedAmount: parsed.data.agreedAmount,
			notes: parsed.data.notes,
		});

		setName("");
		setTrade("");
		setContactPhone("");
		setContactEmail("");
		setAgreedAmount("");
		setNotes("");
		onClose();
	};

	return (
		<Dialog fullWidth open={open} onClose={onClose}>
			<DialogTitle>{t("suppliers.addSupplier")}</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					<TextField
						label={t("suppliers.name")}
						value={name}
						onChange={(event) => setName(event.target.value)}
						fullWidth
						required
					/>
					<TextField
						label={t("suppliers.trade")}
						value={trade}
						onChange={(event) => setTrade(event.target.value)}
						fullWidth
						required
					/>
					<TextField
						label={t("suppliers.phone")}
						value={contactPhone}
						onChange={(event) => setContactPhone(event.target.value)}
						fullWidth
					/>
					<TextField
						label={t("suppliers.email")}
						value={contactEmail}
						onChange={(event) => setContactEmail(event.target.value)}
						fullWidth
					/>
					<TextField
						label={t("suppliers.agreedAmount")}
						type="number"
						value={agreedAmount}
						onChange={(event) => setAgreedAmount(event.target.value)}
						fullWidth
					/>
					<TextField
						label={t("budget.note")}
						value={notes}
						onChange={(event) => setNotes(event.target.value)}
						multiline
						minRows={2}
						fullWidth
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
					{t("suppliers.addSupplier")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
