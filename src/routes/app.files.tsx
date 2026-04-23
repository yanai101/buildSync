import { Stack, Typography } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageContainer } from "../shared/components/page-container";

export const Route = createFileRoute("/app/files")({
	component: FilesRoute,
});

function FilesRoute() {
	const { t } = useTranslation("common");

	return (
		<PageContainer title={t("files.title")}>
			<Stack spacing={2}>
				<Typography variant="body2" color="text.secondary">
					{t("common.placeholder")}
				</Typography>
			</Stack>
		</PageContainer>
	);
}
