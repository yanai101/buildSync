import {
	BottomNavigation,
	BottomNavigationAction,
	Paper,
	useTheme,
} from "@mui/material";
import { Link, useLocation } from "@tanstack/react-router";
import {
	CreditCard,
	HardHat,
	Home,
	LayoutGrid,
	Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function MobileBottomNavigation() {
	const { t } = useTranslation();
	const location = useLocation();
	const theme = useTheme();

	const getValue = () => {
		const path = location.pathname;
		if (path === "/" || path.startsWith("/app/home")) return "home";
		if (path.startsWith("/app/budget")) return "budget";
		if (path.startsWith("/app/suppliers")) return "suppliers";
		if (path.startsWith("/app/payments")) return "payments";
		if (path.startsWith("/app/stages")) return "stages";
		if (path.startsWith("/app/files")) return "files";
		return "";
	};

	return (
		<Paper
			sx={{
				position: "fixed",
				bottom: 16, // Floating effect
				left: 16,
				right: 16,
				zIndex: 1000,
				borderRadius: 4, // Higher border radius for floating look
				overflow: "hidden",
				border: "1px solid",
				borderColor: "divider",
				boxShadow: theme.shadows[4],
			}}
			elevation={0}
		>
			<BottomNavigation
				showLabels
				value={getValue()}
				sx={{
					height: 72, // Slightly taller for better touch targets
					backgroundColor: "rgba(255, 255, 255, 0.85)", // Glassmorphism base
					backdropFilter: "blur(12px)",
					...theme.applyStyles("dark", {
						backgroundColor: "rgba(30, 30, 30, 0.85)",
					}),
				}}
			>
				<BottomNavigationAction
					label={t("nav.home", "Overview")}
					value="home"
					icon={<Home size={22} />}
					component={Link}
					to="/app/home"
					activeOptions={{ exact: true }}
				/>
				<BottomNavigationAction
					label={t("nav.budget", "Budget")}
					value="budget"
					icon={<LayoutGrid size={22} />}
					component={Link}
					to="/app/budget"
				/>
				<BottomNavigationAction
					label={t("nav.suppliers", "Suppliers")}
					value="suppliers"
					icon={<HardHat size={22} />}
					component={Link}
					to="/app/suppliers"
				/>
				<BottomNavigationAction
					label={t("nav.payments", "Expenses")}
					value="payments"
					icon={<CreditCard size={22} />}
					component={Link}
					to="/app/payments"
				/>
				{/* 
                // Creating a simplified nav for MVP - keeping 4 main items is better for mobile space.
                // We can put Stages and Files in a "More" menu or just rely on Dashboard links if space is tight.
                // For now, I'll include them but check width. 6 items is too many for mobile.
                // Let's hide Stages/Files behind a "More" or just remove them from BottomNav and put them in Dashboard.
                // The requirements asked for "Mobile bottom navigation". 4-5 items is max.
                // I will stick to 4 core items + maybe a floating "Add" button handles the rest?
                // The user request listed: Home, Budget, Expenses, Suppliers suitable for bottom nav.
                // I will Comment out Stages/Files for now to keep it clean, as per "Avoid clutter" rule.
                */}
			</BottomNavigation>
		</Paper>
	);
}
