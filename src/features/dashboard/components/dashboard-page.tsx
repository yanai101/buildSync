import {
	Grid2,
	Typography,
    Box,
    Button
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

import { PageContainer } from "../../../shared/components/page-container";
import { useCurrentProject } from "../../projects/hooks/use-current-project";
import { useDashboardSummary } from "../hooks/use-dashboard-summary";
import { DashboardCard } from "../../../components/dashboard/DashboardCard";
import { Link } from "@tanstack/react-router";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("he-IL", {
		style: "currency",
		currency: "ILS",
		maximumFractionDigits: 0,
	}).format(value);
}

export function DashboardPage() {
	const { t } = useTranslation("common");
	const { projectId, isPending: projectPending } = useCurrentProject();
	const { summary, isPending } = useDashboardSummary(projectId);

    // Mock data for visual dev if summary is empty/loading
    const safeSummary = isPending || !summary ? {
        budgetRemaining: 0,
        budgetTotal: 0,
        spent: 0,
        topOverruns: [],
        currentStage: null,
        nextPayment: null
    } : summary;

	return (
		<PageContainer 
            title={t("home.title", "Dashboard")} 
            action={
                <Button component={Link} to="/app/budget" endIcon={<ArrowLeft className="rtl:rotate-180"/>}>
                    {t("nav.budget", "Go to Budget")}
                </Button>
            }
        >
            <Box sx={{ mb: 4 }}>
                <Typography variant="body1" color="text.secondary">
                    {t("home.welcome", "Welcome back! Here is your project status.")}
                </Typography>
            </Box>

			<Grid2 container spacing={3}>
                {/* Main Stats Row */}
				<Grid2 size={{ xs: 12, md: 4 }}>
					<DashboardCard 
                        title={t("home.remainingBudget", "Remaining Budget")}
                        value={formatCurrency(safeSummary.budgetRemaining)}
                        trend={{
                            value: 10,
                            isPositive: true, // "Good" context
                            label: t("home.underBudget", "Under budget trend")
                        }}
                    />
				</Grid2>
                <Grid2 size={{ xs: 12, md: 4 }}>
					<DashboardCard 
                        title={t("home.spentSoFar", "Total Spent")}
                        value={formatCurrency(safeSummary.spent)}
                        progress={{
                            value: 45, // visual placeholder
                            color: "primary"
                        }}
                    />
				</Grid2>
                 <Grid2 size={{ xs: 12, md: 4 }}>
					<DashboardCard 
                        title={t("home.estimatedCompletion", "Est. Completion")}
                        value="Oct 2026"
                        icon={<ArrowLeft size={20} />} // just as an icon example
                    />
				</Grid2>

                {/* Overruns / Alerts */}
				<Grid2 size={{ xs: 12, md: 6 }}>
                    <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>{t("home.attentionNeeded", "Attention Needed")}</Typography>
                    {safeSummary.topOverruns.length > 0 ? (
                        safeSummary.topOverruns.map((item) => (
                             <Box key={item.categoryId} mb={2}>
                                <DashboardCard 
                                    title={item.categoryName}
                                    value={formatCurrency(item.overrun)}
                                    trend={{
                                        value: 15,
                                        isPositive: false, // "Bad" context
                                        label: t("home.overrun", "Over Budget")
                                    }}
                                />
                             </Box>
                        ))
                    ) : (
                         <DashboardCard 
                            title={t("home.overruns", "Budget Alerts")}
                            value={t("home.noOverruns", "All good!")}
                            progress={{ value: 100, color: "success" }}
                        />
                    )}
				</Grid2>

                {/* Next Payment */}
				<Grid2 size={{ xs: 12, md: 6 }}>
                     <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>{t("home.upcoming", "Upcoming")}</Typography>
                     <DashboardCard 
                        title={t("home.nextPayment", "Next Payment")}
                        value={safeSummary.nextPayment ? formatCurrency(safeSummary.nextPayment.amount) : "0 ₪"}
                        trend={safeSummary.nextPayment ? {
                            value: 0,
                            isPositive: true,
                            label: `Due: ${safeSummary.nextPayment.dueDate}`
                        } : undefined}
                    />
				</Grid2>
			</Grid2>
		</PageContainer>
	);
}
