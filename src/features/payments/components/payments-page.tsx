import {
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Id } from "../../../../convex/_generated/dataModel";
import { PageContainer } from "../../../shared/components/page-container";
import { useCurrentProject } from "../../projects/hooks/use-current-project";
import { useSuppliersList } from "../../suppliers/hooks/use-suppliers-list";
import { useCreatePayment } from "../hooks/use-create-payment";
import { useMarkPaymentPaid } from "../hooks/use-mark-payment-paid";
import { usePaymentsList } from "../hooks/use-payments-list";
import { useReschedulePayment } from "../hooks/use-reschedule-payment";
import { AddPaymentDialog } from "./add-payment-dialog";

function sortByDueDate(a?: string, b?: string) {
	if (!a && !b) return 0;
	if (!a) return 1;
	if (!b) return -1;
	return new Date(a).getTime() - new Date(b).getTime();
}

export function PaymentsPage() {
	const { t } = useTranslation("common");
	const { projectId } = useCurrentProject();
	const { suppliers } = useSuppliersList(projectId);
	const { payments, isPending } = usePaymentsList(projectId);
	const createPayment = useCreatePayment(projectId);
	const markPaid = useMarkPaymentPaid(projectId);
	const reschedule = useReschedulePayment(projectId);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [rescheduleDate, setRescheduleDate] = useState<Record<string, string>>(
		{},
	);

	const supplierById = useMemo(() => {
		const map = new Map<string, string>();
		for (const supplier of suppliers) {
			map.set(String(supplier._id), supplier.name);
		}
		return map;
	}, [suppliers]);

	const sorted = useMemo(
		() => [...payments].sort((a, b) => sortByDueDate(a.dueDate, b.dueDate)),
		[payments],
	);

	return (
		<PageContainer title={t("payments.title")}>
			<Stack spacing={2}>
				<Button variant="contained" onClick={() => setDialogOpen(true)}>
					{t("payments.addPayment")}
				</Button>

				{isPending ? <CircularProgress size={24} /> : null}

				{sorted.map((payment) => {
					const due = payment.dueDate ?? "-";
					const supplierName =
						supplierById.get(String(payment.supplierId)) ?? "-";

					return (
						<Card key={payment._id} variant="outlined">
							<CardContent>
								<Stack spacing={1}>
									<Link
										to="/app/suppliers/$supplierId"
										params={{
											supplierId: payment.supplierId as Id<"suppliers">,
										}}
										style={{ textDecoration: "none" }}
									>
										<Typography color="text.primary" sx={{ fontWeight: 700 }}>
											{supplierName}
										</Typography>
									</Link>

									<Typography>
										{t("payments.amount")}: {payment.amount}
									</Typography>
									<Typography>
										{t("payments.dueDate")}: {due}
									</Typography>

									<Chip
										label={t(`payments.status.${payment.status}`)}
										color={
											payment.status === "paid"
												? "success"
												: payment.status === "overdue"
													? "error"
													: "default"
										}
										size="small"
									/>

									<Stack direction="row" spacing={1}>
										<Button
											size="small"
											onClick={() => markPaid.mutate(payment._id)}
											disabled={payment.status === "paid"}
										>
											{t("payments.markPaid")}
										</Button>

										<TextField
											type="date"
											size="small"
											value={rescheduleDate[String(payment._id)] ?? ""}
											onChange={(event) =>
												setRescheduleDate((prev) => ({
													...prev,
													[String(payment._id)]: event.target.value,
												}))
											}
											InputLabelProps={{ shrink: true }}
										/>

										<Button
											size="small"
											onClick={() => {
												const nextDate = rescheduleDate[String(payment._id)];
												if (!nextDate) return;
												reschedule.mutate({
													paymentId: payment._id,
													dueDate: nextDate,
												});
											}}
										>
											{t("payments.reschedule")}
										</Button>
									</Stack>
								</Stack>
							</CardContent>
						</Card>
					);
				})}

				<AddPaymentDialog
					open={dialogOpen}
					onClose={() => setDialogOpen(false)}
					suppliers={suppliers}
					onSubmit={createPayment.mutateAsync}
					isPending={createPayment.isPending}
				/>
			</Stack>
		</PageContainer>
	);
}
