import type { PaletteOptions } from "@mui/material";

export const lightPalette: PaletteOptions = {
	mode: "light",
	primary: {
		main: "#2E5C55", // Deep Sage Green (Trust, Stability)
		light: "#5F8D86",
		dark: "#1B3B36",
		contrastText: "#ffffff",
	},
	secondary: {
		main: "#D4A373", // Sand (Building, Warmth)
		light: "#EAD2B8",
		dark: "#A3784E",
		contrastText: "#212121",
	},
	background: {
		default: "#F9FAFB", // Very light gray
		paper: "#FFFFFF",
	},
	text: {
		primary: "#212121",
		secondary: "#757575",
	},
	success: {
		main: "#4CAF50",
	},
	warning: {
		main: "#FFC107",
	},
	error: {
		main: "#EF5350",
	},
};

export const darkPalette: PaletteOptions = {
	mode: "dark",
	primary: {
		main: "#5F8D86", // Lighter Sage for dark mode
		light: "#8EBDB6",
		dark: "#2E5C55",
		contrastText: "#000000",
	},
	secondary: {
		main: "#D4A373", // Keep Sand
		light: "#EAD2B8",
		dark: "#A3784E",
		contrastText: "#000000",
	},
	background: {
		default: "#121212",
		paper: "#1E1E1E",
	},
	text: {
		primary: "#FFFFFF",
		secondary: "#B0B0B0",
	},
	success: {
		main: "#66BB6A",
	},
	warning: {
		main: "#FFA726",
	},
	error: {
		main: "#F44336",
	},
};
