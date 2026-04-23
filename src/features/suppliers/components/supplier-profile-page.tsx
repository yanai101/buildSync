import { Button, Stack, Typography } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { Id } from "../../../../convex/_generated/dataModel";
import { PageContainer } from "../../../shared/components/page-container";
import { useCurrentProject } from "../../projects/hooks/use-current-project";
import { useSupplierById } from "../hooks/use-supplier-by-id";

export function SupplierProfilePage({
	supplierId,
}: {
	supplierId: Id<"suppliers">;
}) {
	const { t } = useTranslation("common");
	const { projectId } = useCurrentProject();
	const { supplier, isPending } = useSupplierById(projectId, supplierId);

	if (isPending) {
		return (
			<PageContainer title={t("suppliers.profile")}>
				<Typography>{t("app.loading")}</Typography>
			</PageContainer>
		);
	}

	if (!supplier) {
		return (
			<PageContainer title={t("suppliers.profile")}>
				<Typography>{t("common.placeholder")}</Typography>
			</PageContainer>
		);
	}

	return (
		<PageContainer title={supplier.name}>
			<Stack spacing={2}>
				<Typography>
					{t("suppliers.trade")}: {supplier.trade}
				</Typography>
				<Typography>
					{t("suppliers.phone")}: {supplier.contactPhone ?? "-"}
				</Typography>
				<Typography>
					{t("suppliers.email")}: {supplier.contactEmail ?? "-"}
				</Typography>
				<Typography>
					{t("suppliers.agreedAmount")}: {supplier.agreedAmount ?? "-"}
				</Typography>
				<Typography>
					{t("budget.note")}: {supplier.notes ?? "-"}
				</Typography>

				<Button component={Link} to="/app/payments" variant="outlined">
					{t("suppliers.addPayment")}
				</Button>

				<Typography component={Link} to="/app/suppliers" color="primary">
					{t("common.back")}
				</Typography>
			</Stack>
		</PageContainer>
	);
}
