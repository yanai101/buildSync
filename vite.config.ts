import contentCollections from "@content-collections/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	plugins: [
		devtools(),
		netlify(),
		contentCollections(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		VitePWA({
			registerType: "autoUpdate",
			injectRegister: "auto",
			includeAssets: [
				"favicon.ico",
				"logo192.png",
				"logo512.png",
				"robots.txt",
			],
			manifest: {
				name: "BuildFlow",
				short_name: "BuildFlow",
				description: "ניהול תקציב ותשלומים לבניית בית פרטי",
				lang: "he",
				dir: "rtl",
				start_url: "/",
				scope: "/",
				display: "standalone",
				background_color: "#faf7ef",
				theme_color: "#0d5a5f",
				icons: [
					{
						src: "logo192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "logo512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "logo512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
				navigateFallback: "/index.html",
			},
		}),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
