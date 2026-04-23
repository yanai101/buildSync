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
import { useCreateSupplier } from "../hooks/use-create-supplier";
import { useRemoveSupplier } from "../hooks/use-remove-supplier";
import { useSuppliersList } from "../hooks/use-suppliers-list";
import { AddSupplierDialog } from "./add-supplier-dialog";

export function SuppliersPage() {
	const { t } = useTranslation("common");
	const { projectId } = useCurrentProject();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<
		"all" | "active" | "inactive"
	>("all");
	const [dialogOpen, setDialogOpen] = useState(false);

	const { suppliers, isPending } = useSuppliersList(projectId);
	const createSupplier = useCreateSupplier(projectId);
	const removeSupplier = useRemoveSupplier(projectId);

	const filtered = useMemo(() => {
		return suppliers.filter((supplier) => {
			const searchMatch =
				supplier.name.toLowerCase().includes(search.toLowerCase()) ||
				supplier.trade.toLowerCase().includes(search.toLowerCase());

			const statusMatch =
				statusFilter === "all" ? true : supplier.status === statusFilter;

			return searchMatch && statusMatch;
		});
	}, [search, statusFilter, suppliers]);

	return (
		<PageContainer title={t("suppliers.title")}>
			<Stack spacing={2}>
				<Button variant="contained" onClick={() => setDialogOpen(true)}>
					{t("suppliers.addSupplier")}
				</Button>

				<TextField
					placeholder={t("suppliers.searchPlaceholder")}
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					fullWidth
				/>

				<Stack direction="row" spacing={1}>
					<Chip
						label={t("suppliers.filters.all")}
						color={statusFilter === "all" ? "primary" : "default"}
						onClick={() => setStatusFilter("all")}
					/>
					<Chip
						label={t("suppliers.filters.active")}
						color={statusFilter === "active" ? "primary" : "default"}
						onClick={() => setStatusFilter("active")}
					/>
					<Chip
						label={t("suppliers.filters.inactive")}
						color={statusFilter === "inactive" ? "primary" : "default"}
						onClick={() => setStatusFilter("inactive")}
					/>
				</Stack>

				{isPending ? <CircularProgress size={24} /> : null}

				{filtered.map((supplier) => (
					<Card key={supplier._id} variant="outlined">
						<CardContent>
							<Stack spacing={1}>
								<Link
									to="/app/suppliers/$supplierId"
									params={{ supplierId: supplier._id as Id<"suppliers"> }}
									style={{ textDecoration: "none" }}
								>
									<Typography fontWeight={700} color="text.primary">
										{supplier.name}
									</Typography>
								</Link>

								<Typography variant="body2" color="text.secondary">
									{supplier.trade}
								</Typography>

								<Stack direction="row" spacing={1} alignItems="center">
									<Chip
										label={
											supplier.status === "active"
												? t("suppliers.filters.active")
												: t("suppliers.filters.inactive")
										}
										color={supplier.status === "active" ? "success" : "default"}
										size="small"
									/>
									<Button
										size="small"
										color="error"
										onClick={() => removeSupplier.mutate(supplier._id)}
									>
										{t("suppliers.removeSupplier")}
									</Button>
								</Stack>
							</Stack>
						</CardContent>
					</Card>
				))}

				<AddSupplierDialog
					open={dialogOpen}
					onClose={() => setDialogOpen(false)}
					onSubmit={createSupplier.mutateAsync}
					isPending={createSupplier.isPending}
				/>
			</Stack>
		</PageContainer>
	);
}
