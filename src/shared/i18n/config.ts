import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import heCommon from "./locales/he/common.json";

const resources = {
	he: { common: heCommon },
	en: { common: enCommon },
} as const;

if (!i18n.isInitialized) {
	i18n.use(initReactI18next).init({
		resources,
		lng: "he",
		fallbackLng: "he",
		defaultNS: "common",
		interpolation: {
			escapeValue: false,
		},
	});
}

export default i18n;
