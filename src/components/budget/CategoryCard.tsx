import {
	Box,
	Card,
	CardActionArea,
	CardContent,
	LinearProgress,
	Stack,
	Typography,
} from "@mui/material";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface CategoryCardProps {
	title: string;
	spent: number;
	total: number;
	currency?: string;
	icon?: ReactNode;
	onClick?: () => void;
}

import { useTranslation } from "react-i18next";

export function CategoryCard({
	title,
	spent,
	total,
	currency = "₪",
	icon,
	onClick,
}: CategoryCardProps) {
	const { t } = useTranslation();
	const percentage = Math.min((spent / total) * 100, 100);
	const isOverBudget = spent > total;
	const isNearBudget = percentage > 85;

	let statusColor: "success" | "warning" | "error" | "primary" = "primary";
	if (isOverBudget) statusColor = "error";
	else if (isNearBudget) statusColor = "warning";
	else statusColor = "success";

	return (
		<Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
			<CardActionArea onClick={onClick}>
				<CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
					<Stack direction="row" spacing={2} alignItems="center">
						{/* Icon Box */}
						{icon && (
							<Box
								sx={{
									width: 48,
									height: 48,
									borderRadius: 3,
									bgcolor: (theme) =>
										theme.palette.mode === "dark"
											? "rgba(255,255,255,0.05)"
											: "rgba(0,0,0,0.04)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "text.primary",
								}}
							>
								{icon}
							</Box>
						)}

						{/* Content */}
						<Box sx={{ flex: 1 }}>
							<Stack
								direction="row"
								justifyContent="space-between"
								alignItems="center"
								mb={0.5}
							>
								<Typography variant="subtitle1" fontWeight={600}>
									{title}
								</Typography>
								{onClick && (
									<ChevronLeft size={16} className="text-gray-400 rtl:rotate-180" />
								)}
							</Stack>

							<Stack
								direction="row"
								justifyContent="space-between"
								alignItems="baseline"
								mb={1}
							>
								<Typography variant="body2" color="text.secondary">
									{currency}
									{spent.toLocaleString()}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									{t("budget.of")} {currency}
									{total.toLocaleString()}
								</Typography>
							</Stack>

							<LinearProgress
								variant="determinate"
								value={percentage}
								color={statusColor}
								sx={{
									height: 8,
									borderRadius: 4,
									bgcolor: (theme) =>
										theme.palette.mode === "dark"
											? "rgba(255,255,255,0.1)"
											: "rgba(0,0,0,0.05)",
								}}
							/>
						</Box>
					</Stack>
				</CardContent>
			</CardActionArea>
		</Card>
	);
}

