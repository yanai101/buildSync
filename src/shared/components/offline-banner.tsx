import WifiOffOutlinedIcon from "@mui/icons-material/WifiOffOutlined";
import { Alert, Slide } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function OfflineBanner() {
	const { t } = useTranslation("common");
	const [isOffline, setIsOffline] = useState(false);

	useEffect(() => {
		const onOnline = () => setIsOffline(false);
		const onOffline = () => setIsOffline(true);

		setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);

		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
		};
	}, []);

	return (
		<Slide in={isOffline} direction="down" mountOnEnter unmountOnExit>
			<Alert
				severity="warning"
				icon={<WifiOffOutlinedIcon fontSize="inherit" />}
				sx={{ borderRadius: 0 }}
			>
				{t("app.offline")}
			</Alert>
		</Slide>
	);
}
