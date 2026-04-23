import {
	Box,
	Card,
	CardContent,
	LinearProgress,
	Stack,
	Typography,
	useTheme,
} from "@mui/material";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";

interface DashboardCardProps {
	title: string;
	value: string;
	trend?: {
		value: number;
		isPositive: boolean; // positive means "good" (e.g. under budget) or "bad" (over budget) depending on context?
		// for this app, let's say isPositive = true means GREEN (good), false means RED (bad).
		label: string;
	};
	progress?: {
		value: number; // 0-100
		color?: "primary" | "secondary" | "error" | "warning" | "success";
	};
	icon?: React.ReactNode;
}

export function DashboardCard({
	title,
	value,
	trend,
	progress,
	icon,
}: DashboardCardProps) {
	const theme = useTheme();

	return (
		<Card
			sx={{
				height: "100%",
				position: "relative",
				overflow: "hidden",
				// subtle gradient background if needed, or just clean white
			}}
		>
			<CardContent>
				<Stack spacing={2}>
					{/* Header */}
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="flex-start"
					>
						<Typography
							variant="subtitle2"
							color="text.secondary"
							fontWeight={500}
						>
							{title}
						</Typography>
						{icon && (
							<Box
								sx={{
									color: "primary.main",
									opacity: 0.8,
									p: 1,
									borderRadius: "50%",
									bgcolor: (theme) =>
										theme.palette.mode === "dark"
											? "rgba(255,255,255,0.05)"
											: "rgba(0,0,0,0.04)",
								}}
							>
								{icon}
							</Box>
						)}
					</Stack>

					{/* Main Value */}
					<Typography variant="h4" fontWeight={700} sx={{ letterSpacing: -0.5 }}>
						{value}
					</Typography>

					{/* Trend & Progress */}
					{(trend || progress) && (
						<Stack spacing={1}>
							{progress && (
								<Box>
									<LinearProgress
										variant="determinate"
										value={progress.value}
										color={progress.color || "primary"}
										sx={{
											height: 6,
											borderRadius: 3,
											bgcolor: (theme) =>
												theme.palette.mode === "dark"
													? "rgba(255,255,255,0.1)"
													: "rgba(0,0,0,0.08)",
										}}
									/>
								</Box>
							)}

							{trend && (
								<Stack direction="row" alignItems="center" spacing={0.5}>
									{trend.isPositive ? (
										<ArrowUpRight size={16} color={theme.palette.success.main} />
									) : (
										<ArrowDownRight size={16} color={theme.palette.error.main} />
									)}
									<Typography
										variant="caption"
										fontWeight={600}
										sx={{
											color: trend.isPositive ? "success.main" : "error.main",
										}}
									>
										{Math.abs(trend.value)}%
									</Typography>
									<Typography variant="caption" color="text.secondary">
										{trend.label}
									</Typography>
								</Stack>
							)}
						</Stack>
					)}
				</Stack>
			</CardContent>
		</Card>
	);
}
