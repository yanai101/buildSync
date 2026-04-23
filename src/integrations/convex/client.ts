import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
	console.error("missing env var VITE_CONVEX_URL");
}

export const convexClient = new ConvexReactClient(CONVEX_URL);
export const convexQueryClient = new ConvexQueryClient(convexClient);
