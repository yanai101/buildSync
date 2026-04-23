import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "../features/payments/components/payments-page";

export const Route = createFileRoute("/app/payments")({
	component: PaymentsRoute,
});

function PaymentsRoute() {
	return <PaymentsPage />;
}
