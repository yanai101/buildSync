import {
	Alert,
	Box,
	Button,
	Chip,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { authClient } from "../lib/auth-client";
import { PageContainer } from "../shared/components/page-container";

export const Route = createFileRoute("/auth/login")({
	component: LoginRoute,
});

function LoginRoute() {
	const { t } = useTranslation("common");
	const session = authClient.useSession();

	const [isSignUp, setIsSignUp] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	if (session.data) {
		return <Navigate to="/app/home" />;
	}

	const onSubmit = async () => {
		setError("");
		setLoading(true);

		try {
			if (isSignUp) {
				const result = await authClient.signUp.email({
					name,
					email,
					password,
				});

				if (result.error) {
					setError(result.error.message ?? t("auth.genericError"));
				}
			} else {
				const result = await authClient.signIn.email({
					email,
					password,
				});

				if (result.error) {
					setError(result.error.message ?? t("auth.genericError"));
				}
			}
		} catch {
			setError(t("auth.genericError"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box
			sx={{
				maxWidth: 980,
				mx: "auto",
				display: "grid",
				gap: 2,
				gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
				alignItems: "stretch",
			}}
		>
			<Box
				sx={{
					display: { xs: "none", md: "block" },
					borderRadius: 4,
					p: 4,
					border: "1px solid",
					borderColor: "divider",
					background:
						"linear-gradient(140deg, rgba(0,109,119,0.16), rgba(106,76,147,0.18))",
					animation: "soft-float 4.6s ease-in-out infinite",
				}}
			>
				<Chip label="BuildFlow Pro" color="primary" sx={{ mb: 2 }} />
				<Typography variant="h4" sx={{ mb: 1.5 }}>
					{t("auth.loginSubtitle")}
				</Typography>
				<Typography color="text.secondary">
					גישה מהירה לתקציב, ספקים, תשלומים ושלבי הבנייה במקום אחד.
				</Typography>
			</Box>
			<PageContainer title={t("auth.loginTitle")}>
				<Stack spacing={2}>
					{isSignUp ? (
						<TextField
							label={t("auth.name")}
							value={name}
							onChange={(event) => setName(event.target.value)}
							fullWidth
						/>
					) : null}

					<TextField
						label={t("auth.email")}
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						fullWidth
					/>

					<TextField
						label={t("auth.password")}
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						fullWidth
					/>

					{error ? <Alert severity="error">{error}</Alert> : null}

					<Button
						variant="contained"
						size="large"
						onClick={onSubmit}
						disabled={loading || !email || !password || (isSignUp && !name)}
					>
						{isSignUp ? t("auth.signUpCta") : t("auth.loginCta")}
					</Button>

					<Button variant="text" onClick={() => setIsSignUp((prev) => !prev)}>
						{isSignUp ? t("auth.switchToLogin") : t("auth.switchToSignUp")}
					</Button>
				</Stack>
			</PageContainer>
		</Box>
	);
}
