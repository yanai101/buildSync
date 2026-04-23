import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";

import { convexClient } from "./client";

export default function AppConvexProvider({
	children,
}: {
	children: ReactNode;
}) {
	return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}
