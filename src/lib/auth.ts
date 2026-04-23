import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET || "buildflow-dev-only-secret",
	emailAndPassword: {
		enabled: true,
	},
	plugins: [tanstackStartCookies()],
});
