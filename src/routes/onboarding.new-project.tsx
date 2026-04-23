import {
	Alert,
	Box,
	Button,
	Chip,
	MenuItem,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../../convex/_generated/api";
import { PageContainer } from "../shared/components/page-container";

export const Route = createFileRoute("/onboarding/new-project")({
	component: NewProjectOnboardingRoute,
});

function NewProjectOnboardingRoute() {
	const { t } = useTranslation("common");
	const navigate = useNavigate();
	const convex = useConvex();

	const [name, setName] = useState("");
	const [region, setRegion] = useState("");
	const [buildType, setBuildType] = useState<
		"single_story" | "two_story" | "renovation"
	>("single_story");
	const [sqm, setSqm] = useState("");
	const [finishLevel, setFinishLevel] = useState<"basic" | "standard" | "high">(
		"standard",
	);
	const [targetBudget, setTargetBudget] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");

	const onSubmit = async () => {
		setError("");

		const parsedSqm = Number(sqm);
		if (
			!name.trim() ||
			!region.trim() ||
			!Number.isFinite(parsedSqm) ||
			parsedSqm <= 0
		) {
			setError(t("onboarding.validationError"));
			return;
		}

		setIsSubmitting(true);
		try {
			const projectId = await convex.mutation(api.projects.create, {
				name: name.trim(),
				region: region.trim(),
				buildType,
				sqm: parsedSqm,
				finishLevel,
				targetBudget: targetBudget ? Number(targetBudget) : undefined,
			});

			await convex.mutation(api.seeds.seedProjectDefaults, {
				projectId,
				useTemplateBudget: true,
			});

			await navigate({ to: "/app/home" });
		} catch {
			setError(t("onboarding.createError"));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Box sx={{ maxWidth: 960, mx: "auto" }}>
			<PageContainer title={t("onboarding.title")}>
				<Stack spacing={2.25}>
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={1}
						alignItems={{ xs: "flex-start", sm: "center" }}
					>
						<Chip label="Step 1/1" color="primary" size="small" />
						<Typography color="text.secondary">{t("onboarding.subtitle")}</Typography>
					</Stack>
					<TextField
						label={t("onboarding.projectName")}
						value={name}
						onChange={(event) => setName(event.target.value)}
						fullWidth
					/>
					<TextField
						label={t("onboarding.region")}
						value={region}
						onChange={(event) => setRegion(event.target.value)}
						fullWidth
					/>
					<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
						<TextField
							select
							label={t("onboarding.buildType")}
							value={buildType}
							onChange={(event) =>
								setBuildType(
									event.target.value as "single_story" | "two_story" | "renovation",
								)
							}
							fullWidth
						>
							<MenuItem value="single_story">
								{t("onboarding.buildTypeOptions.singleStory")}
							</MenuItem>
							<MenuItem value="two_story">
								{t("onboarding.buildTypeOptions.twoStory")}
							</MenuItem>
							<MenuItem value="renovation">
								{t("onboarding.buildTypeOptions.renovation")}
							</MenuItem>
						</TextField>
						<TextField
							select
							label={t("onboarding.finishLevel")}
							value={finishLevel}
							onChange={(event) =>
								setFinishLevel(event.target.value as "basic" | "standard" | "high")
							}
							fullWidth
						>
							<MenuItem value="basic">
								{t("onboarding.finishLevelOptions.basic")}
							</MenuItem>
							<MenuItem value="standard">
								{t("onboarding.finishLevelOptions.standard")}
							</MenuItem>
							<MenuItem value="high">
								{t("onboarding.finishLevelOptions.high")}
							</MenuItem>
						</TextField>
					</Stack>
					<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
						<TextField
							label={t("onboarding.sqm")}
							type="number"
							value={sqm}
							onChange={(event) => setSqm(event.target.value)}
							fullWidth
						/>
						<TextField
							label={t("onboarding.targetBudget")}
							type="number"
							value={targetBudget}
							onChange={(event) => setTargetBudget(event.target.value)}
							fullWidth
						/>
					</Stack>

					{error ? <Alert severity="error">{error}</Alert> : null}

					<Button variant="contained" onClick={onSubmit} disabled={isSubmitting}>
						{t("onboarding.submit")}
					</Button>
				</Stack>
			</PageContainer>
		</Box>
	);
}
