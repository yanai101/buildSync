import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	TextField,
	useMediaQuery,
	useTheme,
    IconButton,
    Typography
} from "@mui/material";
import { Camera, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface AddExpenseModalProps {
	open: boolean;
	onClose: () => void;
	onSave: (data: any) => void;
	categories: { id: string; name: string }[];
	suppliers: { id: string; name: string }[];
}

export function AddExpenseModal({
	open,
	onClose,
	onSave,
	categories,
	suppliers,
}: AddExpenseModalProps) {
	const { t } = useTranslation();
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

	const [amount, setAmount] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [supplierId, setSupplierId] = useState("");
	const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
	const [note, setNote] = useState("");

	const handleSave = () => {
		onSave({
			amount: Number.parseFloat(amount),
			categoryId,
			supplierId,
			date,
			note,
		});
		onClose();
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullScreen={isMobile}
			fullWidth
			maxWidth="sm"
			PaperProps={{
				sx: {
					borderRadius: isMobile ? 0 : 4,
					bgcolor: "background.paper",
				},
			}}
		>
			<DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={700}>{t("expense.addTitle", "Add New Expense")}</Typography>
                <IconButton onClick={onClose} edge="end" color="inherit">
                    <X size={24} />
                </IconButton>
            </DialogTitle>
			<DialogContent dividers>
				<Stack spacing={3} sx={{ mt: 1 }}>
					{/* Amount - Big Input */}
					<TextField
						label={t("expense.amount", "Amount")}
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						type="number"
						fullWidth
						autoFocus
						InputProps={{
							style: { fontSize: "1.5rem", fontWeight: 600 },
							startAdornment: <span style={{ marginRight: 8 }}>₪</span>,
						}}
						variant="outlined"
					/>

					{/* Category */}
					<FormControl fullWidth>
						<InputLabel>{t("expense.category", "Category")}</InputLabel>
						<Select
							value={categoryId}
							label={t("expense.category", "Category")}
							onChange={(e) => setCategoryId(e.target.value)}
						>
							{categories.map((cat) => (
								<MenuItem key={cat.id} value={cat.id}>
									{cat.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					{/* Supplier */}
					<FormControl fullWidth>
						<InputLabel>{t("expense.supplier", "Supplier")}</InputLabel>
						<Select
							value={supplierId}
							label={t("expense.supplier", "Supplier")}
							onChange={(e) => setSupplierId(e.target.value)}
						>
							<MenuItem value="">{t("common.none", "None")}</MenuItem>
							{suppliers.map((sup) => (
								<MenuItem key={sup.id} value={sup.id}>
									{sup.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					{/* Date */}
					<TextField
						label={t("expense.date", "Date")}
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						fullWidth
						InputLabelProps={{ shrink: true }}
					/>

					{/* Note */}
					<TextField
						label={t("expense.note", "Note")}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						multiline
						rows={2}
						fullWidth
					/>
                    
                    {/* Image Upload Placeholder */}
                    <Button 
                        variant="outlined" 
                        startIcon={<Camera />} 
                        sx={{ borderStyle: 'dashed', py: 2 }}
                    >
                        {t("expense.uploadInvoice", "Attach Invoice/Photo")}
                    </Button>
				</Stack>
			</DialogContent>
			<DialogActions sx={{ p: 2 }}>
				<Button onClick={onClose} color="inherit">
					{t("common.cancel", "Cancel")}
				</Button>
				<Button
					onClick={handleSave}
					variant="contained"
					size="large"
					disabled={!amount || !categoryId}
                    sx={{ px: 4 }}
				>
					{t("common.save", "Save Expense")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
