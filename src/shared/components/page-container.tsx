import { Card, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";

export function PageContainer({
	title,
	children,
	action,
}: {
	title: string;
	children: ReactNode;
	action?: ReactNode;
}) {
	const theme = useTheme();

	return (
		<Stack spacing={2}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h5" fontWeight={800}>
					{title}
				</Typography>
				{action}
			</Stack>
			<Card
				variant="outlined"
				sx={{
					p: { xs: 1.5, md: 2.5 },
					borderRadius: 4,
					background:
						theme.palette.mode === "dark"
							? "linear-gradient(145deg, rgba(24,29,36,0.95), rgba(18,22,28,0.92))"
							: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(247,250,252,0.95))",
				}}
			>
				{children}
			</Card>
		</Stack>
	);
}
