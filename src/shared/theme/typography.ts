import type { TypographyOptions } from "@mui/material/styles/createTypography";

export const typography: TypographyOptions = {
	fontFamily: "Rubik, Assistant, Arial, sans-serif",
	h1: {
		fontWeight: 700,
		fontSize: "2rem", // 32px
		lineHeight: 1.2,
	},
	h2: {
		fontWeight: 600,
		fontSize: "1.5rem", // 24px
		lineHeight: 1.3,
	},
	h3: {
		fontWeight: 500,
		fontSize: "1.25rem", // 20px
		lineHeight: 1.4,
	},
	h4: {
		fontWeight: 500,
		fontSize: "1.125rem", // 18px
		lineHeight: 1.4,
	},
	h5: {
		fontWeight: 500,
		fontSize: "1rem", // 16px
		lineHeight: 1.5,
	},
	h6: {
		fontWeight: 500,
		fontSize: "0.875rem", // 14px
		lineHeight: 1.5,
		letterSpacing: "0.1px",
	},
	body1: {
		fontWeight: 400,
		fontSize: "1rem", // 16px
		lineHeight: 1.5,
	},
	body2: {
		fontWeight: 400,
		fontSize: "0.875rem", // 14px
		lineHeight: 1.5,
	},
	button: {
		fontWeight: 600,
		fontSize: "0.875rem", // 14px
		textTransform: "none", // Modern feel
	},
	caption: {
		fontSize: "0.75rem", // 12px
		lineHeight: 1.4,
		color: "text.secondary",
	},
};
