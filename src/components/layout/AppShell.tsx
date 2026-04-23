import {
	AppBar,
	Box,
	Container,
	IconButton,
	MenuItem,
	Select,
	Button,
	Toolbar,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { Moon, Sun, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MobileBottomNavigation } from "./BottomNavigation";
import { useThemeMode } from "../../shared/theme/mui-rtl";
import { OfflineBanner } from "../../shared/components/offline-banner";
import { authClient } from "../../lib/auth-client";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCurrentProject } from "../../features/projects/hooks/use-current-project";

interface AppShellProps {
	children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
	const { t } = useTranslation();
	const theme = useTheme();
	const { mode, toggleMode } = useThemeMode();
	const navigate = useNavigate();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const { projects, projectId, setCurrentProject } = useCurrentProject();

	const handleLogout = async () => {
		await authClient.signOut();
		navigate({ to: "/auth/login" });
	};

	return (
		<Box
			sx={{
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				bgcolor: "background.default",
			}}
		>
			{/* Top AppBar */}
			<AppBar
				position="sticky"
				elevation={0}
				sx={{
					backgroundColor: "background.default", // More minimal, let content shine
					borderBottom: "1px solid",
					borderColor: "divider",
					backdropFilter: "blur(12px)",
					background: `linear-gradient(to bottom, ${theme.palette.background.default} 0%, ${theme.palette.background.default}80 100%)`
				}}
			>
				<Toolbar>
					<Typography
						variant="h6"
						component="div"
						sx={{ fontWeight: 700, color: "text.primary", mr: 2 }}
					>
						{t("app.name", "BuildFlow")}
					</Typography>

					<Box sx={{ flexGrow: 1, maxWidth: 280 }}>
						{projects.length > 0 ? (
							<Select
								size="small"
								fullWidth
								value={projectId ?? ""}
								displayEmpty
								onChange={(event) =>
									void setCurrentProject(
										(event.target.value || null) as Parameters<
											typeof setCurrentProject
										>[0],
									)
								}
								sx={{ bgcolor: "background.paper" }}
							>
								{projects.map((project) => (
									<MenuItem key={project._id} value={project._id}>
										{project.name}
									</MenuItem>
								))}
							</Select>
						) : null}
					</Box>

					{projects.length > 1 ? (
						<Button component={Link} to="/app/projects" sx={{ mr: 1 }}>
							{t("projects.switchPageAction", "All projects")}
						</Button>
					) : null}

					<IconButton onClick={toggleMode} color="inherit">
						{mode === "dark" ? (
							<Sun size={20} className="text-yellow-400" />
						) : (
							<Moon size={20} className="text-slate-600" />
						)}
					</IconButton>
					
					<IconButton onClick={handleLogout} color="inherit" sx={{ ml: 1 }}>
						<LogOut size={20} className="text-slate-500" />
					</IconButton>
				</Toolbar>
			</AppBar>

			<OfflineBanner />

			{/* Main Content Area */}
			<Container
				maxWidth="md"
				component="main"
				sx={{
					flex: 1,
					py: 3,
					pb: isMobile ? 12 : 3, // Padding for bottom nav
					display: "flex",
					flexDirection: "column",
				}}
			>
				{children}
			</Container>

			{/* Mobile Navigation */}
			{isMobile && <MobileBottomNavigation />}
		</Box>
	);
}
