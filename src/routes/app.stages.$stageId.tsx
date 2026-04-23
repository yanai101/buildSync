import { Stack, Typography } from "@mui/material";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageContainer } from "../shared/components/page-container";

export const Route = createFileRoute("/app/stages/$stageId")({
	component: StageDetailsRoute,
});

function StageDetailsRoute() {
	const { t } = useTranslation("common");

	return (
		<PageContainer title={t("stages.details")}>
			<Stack spacing={2}>
				<Typography variant="body2" color="text.secondary">
					{t("common.placeholder")}
				</Typography>
				<Typography component={Link} to="/app/stages" color="primary">
					{t("common.back")}
				</Typography>
			</Stack>
		</PageContainer>
	);
}
