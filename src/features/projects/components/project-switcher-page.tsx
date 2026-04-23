import {
	Alert,
	Button,
	Card,
	CardContent,
	Chip,
	Stack,
	Typography,
} from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageContainer } from "../../../shared/components/page-container";
import { useCurrentProject } from "../hooks/use-current-project";

export function ProjectSwitcherPage() {
	const { t } = useTranslation("common");
	const navigate = useNavigate();
	const { projects, projectId, setCurrentProject, isPending } = useCurrentProject();
	const [isSwitching, setIsSwitching] = useState<string | null>(null);

	const handleSwitchProject = async (nextProjectId: string) => {
		setIsSwitching(nextProjectId);
		try {
			await setCurrentProject(nextProjectId as never);
			await navigate({ to: "/app/home" });
		} finally {
			setIsSwitching(null);
		}
	};

	return (
		<PageContainer title={t("projects.title", "Projects")}>
			<Stack spacing={2.5}>
				<Typography color="text.secondary">
					{t(
						"projects.subtitle",
						"Choose which project you want to load right now.",
					)}
				</Typography>

				{!isPending && projects.length <= 1 ? (
					<Alert severity="info">
						{t(
							"projects.singleProjectHint",
							"You only have one project at the moment.",
						)}
					</Alert>
				) : null}

				<Stack spacing={2}>
					{projects.map((project) => {
						const isCurrent = project._id === projectId;
						return (
							<Card key={project._id} variant="outlined">
								<CardContent>
									<Stack spacing={1.5}>
										<Stack
											direction="row"
											spacing={1}
											alignItems="center"
											justifyContent="space-between"
										>
											<Typography variant="h6" fontWeight={700}>
												{project.name}
											</Typography>
											{isCurrent ? (
												<Chip
													color="primary"
													size="small"
													label={t("projects.current", "Current")}
												/>
											) : null}
										</Stack>

										<Typography color="text.secondary">
											{[
												project.region,
												t(`onboarding.buildTypeOptions.${buildTypeToI18nKey(project.buildType)}`),
												`${project.sqm} ${t("projects.sqm", "sqm")}`,
											]
												.filter(Boolean)
												.join(" • ")}
										</Typography>

										<Button
											variant={isCurrent ? "outlined" : "contained"}
											onClick={() => void handleSwitchProject(project._id)}
											disabled={isCurrent || isSwitching === project._id}
										>
											{isCurrent
												? t("projects.activeProject", "Already selected")
												: t("projects.switchAction", "Switch to this project")}
										</Button>
									</Stack>
								</CardContent>
							</Card>
						);
					})}
				</Stack>
			</Stack>
		</PageContainer>
	);
}

function buildTypeToI18nKey(buildType: string) {
	switch (buildType) {
		case "single_story":
			return "singleStory";
		case "two_story":
			return "twoStory";
		default:
			return "renovation";
	}
}
