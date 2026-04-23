import { Typography } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageContainer } from "../shared/components/page-container";

export const Route = createFileRoute("/app/stages")({
	component: StagesRoute,
});

function StagesRoute() {
	const { t } = useTranslation("common");

	return (
		<PageContainer title={t("stages.title")}>
			<Typography variant="body2" color="text.secondary">
				{t("common.placeholder")}
			</Typography>
		</PageContainer>
	);
}
