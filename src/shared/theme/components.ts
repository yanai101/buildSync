import type { Components, Theme } from "@mui/material";

export const components: Components<Theme> = {
	MuiCssBaseline: {
		styleOverrides: (theme) => ({
			body: {
				backgroundColor: theme.palette.background.default,
				// Subtle gradient for depth, adapted to Sage Green theme if needed
				// backgroundImage: "...", // Can add subtle texture later
				scrollbarWidth: "thin",
			},
		}),
	},
	MuiButton: {
		styleOverrides: {
			root: {
				borderRadius: 12,
				padding: "8px 16px",
				boxShadow: "none",
				"&:hover": {
					boxShadow: "0px 4px 12px rgba(46, 92, 85, 0.15)", // Subtle shadow on hover
					transform: "translateY(-1px)",
				},
				transition: "all 0.2s ease-in-out",
			},
			containedPrimary: {
				// background: "linear-gradient(135deg, #2E5C55 0%, #1B3B36 100%)", // REMOVED to fix contrast
                // Let the palette control the color
			},
			sizeLarge: {
				padding: "12px 24px",
				fontSize: "1rem",
			},
		},
	},
	MuiCard: {
		styleOverrides: {
			root: {
				borderRadius: 16,
				boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)", // Soft floating shadow
				backgroundImage: "none", // Remove default gradient if any
				border: "1px solid rgba(0,0,0,0.04)",
			},
		},
	},
	MuiTextField: {
		styleOverrides: {
			root: {
				"& .MuiOutlinedInput-root": {
					borderRadius: 12,
					backgroundColor: "transparent",
					"& fieldset": {
						borderColor: "rgba(0, 0, 0, 0.15)",
					},
					"&:hover fieldset": {
						borderColor: "rgba(46, 92, 85, 0.5)",
					},
					"&.Mui-focused fieldset": {
						borderWidth: 2,
					},
				},
			},
		},
	},
	MuiPaper: {
		styleOverrides: {
			rounded: {
				borderRadius: 16,
			},
		},
	},
    MuiAppBar: {
        styleOverrides: {
            root: {
                backgroundColor: "transparent",
                boxShadow: "none",
                // backgroundImage: "none" 
            }
        }
    }
};
