import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import {
	CssBaseline,
	createTheme,
	ThemeProvider,
	useMediaQuery,
} from "@mui/material";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { components } from "./components";
import { darkPalette, lightPalette } from "./palette";
import { typography } from "./typography";

// Fix for stylis-plugin-rtl type issue
const rtlStylisPlugin = ((rtlPlugin as { default?: unknown }).default ??
	rtlPlugin) as never;

const rtlCache = createCache({
	key: "mui-rtl",
	stylisPlugins: [prefixer, rtlStylisPlugin],
});

type ThemeMode = "light" | "dark";

type ThemeModeContextValue = {
	mode: ThemeMode;
	toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function useThemeMode() {
	const value = useContext(ThemeModeContext);
	if (!value) {
		throw new Error("useThemeMode must be used inside MuiRtlProvider");
	}
	return value;
}

export function MuiRtlProvider({ children }: { children: ReactNode }) {
	const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
	const [mode, setMode] = useState<ThemeMode>(
		prefersDarkMode ? "dark" : "light",
	);

	useEffect(() => {
		const savedMode = window.localStorage.getItem("buildflow-theme-mode");
		if (savedMode === "light" || savedMode === "dark") {
			setMode(savedMode);
		}
	}, []);

	useEffect(() => {
		window.localStorage.setItem("buildflow-theme-mode", mode);
	}, [mode]);

	const theme = useMemo(
		() =>
			createTheme({
				direction: "rtl",
				palette: mode === "dark" ? darkPalette : lightPalette,
				typography,
				shape: { borderRadius: 16 },
				components,
			}),
		[mode],
	);

	return (
		<CacheProvider value={rtlCache}>
			<ThemeProvider theme={theme}>
				<ThemeModeContext.Provider
					value={{
						mode,
						toggleMode: () =>
							setMode((current) => (current === "dark" ? "light" : "dark")),
					}}
				>
					<CssBaseline />
					{children}
				</ThemeModeContext.Provider>
			</ThemeProvider>
		</CacheProvider>
	);
}
