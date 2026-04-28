export type BoqCatalogItem = {
  name: string;
  cat: string;
  unit: string;
  qty: number;
  spec?: string;
};

const roomItems = {
  kitchen: [
    { name: "ארונות מטבח תחתונים", cat: "מטבח", unit: "מ'", qty: 3 },
    { name: "ארונות מטבח עליונים", cat: "מטבח", unit: "מ'", qty: 3 },
    { name: "אי מטבח", cat: "אי מטבח", unit: "יח'", qty: 1 },
    { name: "משטח עבודה שיש / קוורץ", cat: "משטחי שיש וקוורץ", unit: "מ'", qty: 3 },
    { name: "חיפוי קיר מטבח", cat: "חיפויי מטבח", unit: 'מ"ר', qty: 5 },
    { name: "כיור מטבח", cat: "כיורים", unit: "יח'", qty: 1 },
    { name: "ברז מטבח", cat: "ברזים ואביזרי מים", unit: "יח'", qty: 1 },
    { name: "נקודת מים למקרר", cat: "אינסטלציה", unit: "יח'", qty: 1 },
    { name: "כיריים", cat: "כיריים", unit: "יח'", qty: 1 },
    { name: "תנור בנוי", cat: "תנור", unit: "יח'", qty: 1 },
    { name: "מדיח כלים", cat: "מדיח", unit: "יח'", qty: 1 },
    { name: "מקרר", cat: "מקרר", unit: "יח'", qty: 1 },
    { name: "קולט אדים", cat: "קולט אדים", unit: "יח'", qty: 1 },
    { name: "תאורת עבודה מתחת לארונות", cat: "גופי תאורה פנים", unit: "מ'", qty: 3 },
    { name: "שקעי שירות למטבח", cat: "נקודות חשמל", unit: "יח'", qty: 6 },
  ],
  living: [
    { name: "ריצוף סלון", cat: "ריצוף פנים", unit: 'מ"ר', qty: 30 },
    { name: "ספה / מערכת ישיבה", cat: "ריהוט סלון", unit: "יח'", qty: 1 },
    { name: "שולחן סלון", cat: "ריהוט סלון", unit: "יח'", qty: 1 },
    { name: "מזנון / קיר טלוויזיה", cat: "נגרות", unit: "יח'", qty: 1 },
    { name: "מערכת קולנוע ביתית", cat: "מערכת קולנוע ביתית", unit: "יח'", qty: 1 },
    { name: "מערכת שמע", cat: "מערכת שמע", unit: "יח'", qty: 1 },
    { name: "וילונות סלון", cat: "וילונות ופתרונות הצללה", unit: "מ'", qty: 5 },
    { name: "תאורה מרכזית", cat: "גופי תאורה פנים", unit: "יח'", qty: 1 },
    { name: "תאורת אווירה", cat: "גופי תאורה פנים", unit: "יח'", qty: 2 },
    { name: "שקע כפול", cat: "נקודות חשמל", unit: "יח'", qty: 6 },
    { name: "נקודת תקשורת / אינטרנט", cat: "תקשורת ואינטרנט", unit: "יח'", qty: 2 },
    { name: "מזגן לסלון", cat: "מיזוג אוויר", unit: "יח'", qty: 1 },
  ],
  dining: [
    { name: "שולחן אוכל", cat: "ריהוט פינת אוכל", unit: "יח'", qty: 1 },
    { name: "כיסאות אוכל", cat: "ריהוט פינת אוכל", unit: "יח'", qty: 6 },
    { name: "גוף תאורה תלוי", cat: "גופי תאורה פנים", unit: "יח'", qty: 1 },
    { name: "שקע כפול", cat: "נקודות חשמל", unit: "יח'", qty: 2 },
    { name: "וילונות פינת אוכל", cat: "וילונות ופתרונות הצללה", unit: "מ'", qty: 3 },
  ],
  master: [
    { name: "ריצוף חדר שינה ראשי", cat: "ריצוף פנים", unit: 'מ"ר', qty: 20 },
    { name: "פרקט חדר שינה ראשי", cat: "פרקטים", unit: 'מ"ר', qty: 20 },
    { name: "מיטה זוגית / מסגרת", cat: "ריהוט חדרי שינה", unit: "יח'", qty: 1 },
    { name: "מזרן", cat: "ריהוט חדרי שינה", unit: "יח'", qty: 1 },
    { name: "שידות צד", cat: "ריהוט חדרי שינה", unit: "יח'", qty: 2 },
    { name: "ארון הזזה", cat: "ארונות חדרים", unit: "יח'", qty: 1 },
    { name: "תאורה מרכזית", cat: "גופי תאורה פנים", unit: "יח'", qty: 1 },
    { name: "מנורות קריאה", cat: "גופי תאורה פנים", unit: "יח'", qty: 2 },
    { name: "שקע כפול ליד מיטה", cat: "נקודות חשמל", unit: "יח'", qty: 2 },
    { name: "נקודת תקשורת", cat: "תקשורת ואינטרנט", unit: "יח'", qty: 1 },
    { name: "וילונות האפלה", cat: "וילונות ופתרונות הצללה", unit: "מ'", qty: 4 },
    { name: "מזגן חדר שינה", cat: "מיזוג אוויר", unit: "יח'", qty: 1 },
  ],
  bedroom: [
    { name: "ריצוף חדר שינה", cat: "ריצוף פנים", unit: 'מ"ר', qty: 15 },
    { name: "פרקט חדר שינה", cat: "פרקטים", unit: 'מ"ר', qty: 15 },
    { name: "מיטה / מזרן", cat: "ריהוט חדרי שינה", unit: "יח'", qty: 1 },
    { name: "ארון בגדים", cat: "ארונות חדרים", unit: "יח'", qty: 1 },
    { name: "שולחן עבודה / לימודים", cat: "ריהוט משרד / פינת עבודה", unit: "יח'", qty: 1 },
    { name: "תאורה מרכזית", cat: "גופי תאורה פנים", unit: "יח'", qty: 1 },
    { name: "שקע כפול ליד מיטה", cat: "נקודות חשמל", unit: "יח'", qty: 2 },
    { name: "נקודת תקשורת", cat: "תקשורת ואינטרנט", unit: "יח'", qty: 1 },
    { name: "וילון / תריס", cat: "וילונות ופתרונות הצללה", unit: "יח'", qty: 1 },
    { name: "מזגן חדר", cat: "מיזוג אוויר", unit: "יח'", qty: 1 },
  ],
  bathroom: [
    { name: "ריצוף חדר רחצה", cat: "קרמיקה וחיפויי חדרים רטובים", unit: 'מ"ר', qty: 8 },
    { name: "חיפוי קירות חדר רחצה", cat: "קרמיקה וחיפויי חדרים רטובים", unit: 'מ"ר', qty: 18 },
    { name: "אסלה תלויה", cat: "אסלות וניאגרות", unit: "יח'", qty: 1 },
    { name: "מיכל הדחה סמוי", cat: "אסלות וניאגרות", unit: "יח'", qty: 1 },
    { name: "כיור אמבטיה", cat: "כיורים", unit: "יח'", qty: 1 },
    { name: "ארון אמבטיה", cat: "ארונות אמבטיה", unit: "יח'", qty: 1 },
    { name: "ברז כיור", cat: "ברזים ואביזרי מים", unit: "יח'", qty: 1 },
    { name: "מקלחון זכוכית", cat: "מקלחונים", unit: "יח'", qty: 1 },
    { name: "ראש מקלחת / אינטרפוץ", cat: "ברזים ואביזרי מים", unit: "יח'", qty: 1 },
    { name: "אמבטיה", cat: "אמבטיות", unit: "יח'", qty: 1 },
    { name: "ניקוזים", cat: "מערכת ביוב וניקוז", unit: "יח'", qty: 2 },
    { name: "תאורת אמבטיה", cat: "גופי תאורה פנים", unit: "יח'", qty: 2 },
    { name: "שקע מוגן מים", cat: "נקודות חשמל", unit: "יח'", qty: 1 },
  ],
  toilet: [
    { name: "ריצוף שירותים", cat: "קרמיקה וחיפויי חדרים רטובים", unit: 'מ"ר', qty: 4 },
    { name: "חיפוי קירות שירותים", cat: "קרמיקה וחיפויי חדרים רטובים", unit: 'מ"ר', qty: 10 },
    { name: "אסלה תלויה", cat: "אסלות וניאגרות", unit: "יח'", qty: 1 },
    { name: "מיכל הדחה סמוי", cat: "אסלות וניאגרות", unit: "יח'", qty: 1 },
    { name: "כיור נטילת ידיים", cat: "כיורים", unit: "יח'", qty: 1 },
    { name: "ברז כיור", cat: "ברזים ואביזרי מים", unit: "יח'", qty: 1 },
    { name: "מראה", cat: "חדרי רחצה", unit: "יח'", qty: 1 },
    { name: "תאורת שירותים", cat: "גופי תאורה פנים", unit: "יח'", qty: 1 },
    { name: "ניקוז", cat: "מערכת ביוב וניקוז", unit: "יח'", qty: 1 },
  ],
  entrance: [
    { name: "דלת כניסה", cat: "דלת כניסה", unit: "יח'", qty: 1 },
    { name: "מנעול חכם / מנעול אבטחה", cat: "אביזרי בטיחות", unit: "יח'", qty: 1 },
    { name: "אינטרקום / טאבלט כניסה", cat: "מערכת אינטרקום", unit: "יח'", qty: 1 },
    { name: "ארון נעליים", cat: "ארונות שירות", unit: "יח'", qty: 1 },
    { name: "ספסל / אחסון כניסה", cat: "נגרות", unit: "יח'", qty: 1 },
    { name: "תאורת כניסה", cat: "גופי תאורה פנים", unit: "יח'", qty: 1 },
    { name: "שקע כפול", cat: "נקודות חשמל", unit: "יח'", qty: 1 },
  ],
  utility: [
    { name: "מכונת כביסה", cat: "מכונת כביסה", unit: "יח'", qty: 1 },
    { name: "מייבש כביסה", cat: "מייבש", unit: "יח'", qty: 1 },
    { name: "ארונות אחסון", cat: "ארונות שירות", unit: "יח'", qty: 1 },
    { name: "כיור שירות", cat: "כיורים", unit: "יח'", qty: 1 },
    { name: "משטח קיפול", cat: "חדר שירות", unit: "יח'", qty: 1 },
    { name: "נקודות מים וניקוז", cat: "מערכת ביוב וניקוז", unit: "יח'", qty: 2 },
    { name: "אוורור / מאוורר", cat: "אוורור", unit: "יח'", qty: 1 },
    { name: "תאורה", cat: "גופי תאורה פנים", unit: "יח'", qty: 1 },
  ],
  balcony: [
    { name: "ריצוף מרפסת אנטיסליפ", cat: "ריצוף חוץ", unit: 'מ"ר', qty: 10 },
    { name: "דק למרפסת", cat: "דק", unit: 'מ"ר', qty: 8 },
    { name: "מעקה מרפסת", cat: "מעקות", unit: "מ'", qty: 6 },
    { name: "מערכת השקיה", cat: "מערכת השקיה", unit: "יח'", qty: 1 },
    { name: "תאורת חוץ", cat: "גופי תאורה חוץ", unit: "יח'", qty: 2 },
    { name: "נקודת מים חוץ", cat: "ברזים ואביזרי מים", unit: "יח'", qty: 1 },
    { name: "שקע חוץ מוגן", cat: "נקודות חשמל", unit: "יח'", qty: 1 },
    { name: "מטבח חוץ / מנגל", cat: "מטבח חוץ", unit: "יח'", qty: 1 },
  ],
  garage: [
    { name: "ריצוף חניה", cat: "ריצוף חניה", unit: 'מ"ר', qty: 18 },
    { name: "שער חשמלי", cat: "שער חשמלי", unit: "יח'", qty: 1 },
    { name: "תאורת חניה", cat: "גופי תאורה חוץ", unit: "יח'", qty: 2 },
    { name: "נקודת טעינה לרכב חשמלי", cat: "חשמל", unit: "יח'", qty: 1 },
    { name: "שקע חוץ מוגן", cat: "נקודות חשמל", unit: "יח'", qty: 2 },
    { name: "מצלמת אבטחה לחניה", cat: "מצלמות אבטחה", unit: "יח'", qty: 1 },
  ],
  storage: [
    { name: "מדפים למחסן", cat: "מחסן", unit: "יח'", qty: 2 },
    { name: "ארון שירות", cat: "ארונות שירות", unit: "יח'", qty: 1 },
    { name: "תאורה למחסן", cat: "גופי תאורה פנים", unit: "יח'", qty: 1 },
    { name: "שקע כפול", cat: "נקודות חשמל", unit: "יח'", qty: 1 },
  ],
} satisfies Record<string, BoqCatalogItem[]>;

export const BOQ_CATALOG_UNIVERSAL: BoqCatalogItem[] = [
  { name: "גלאי עשן", cat: "אביזרי בטיחות", unit: "יח'", qty: 1 },
  { name: "גלאי גז", cat: "אביזרי בטיחות", unit: "יח'", qty: 1 },
  { name: "נקודת אינטרנט LAN", cat: "תקשורת ואינטרנט", unit: "יח'", qty: 1 },
  { name: "נקודת טלוויזיה", cat: "תקשורת ואינטרנט", unit: "יח'", qty: 1 },
  { name: "מיזוג אוויר", cat: "מיזוג אוויר", unit: "יח'", qty: 1 },
  { name: "פתרון אחסון", cat: "ארונות שירות", unit: "יח'", qty: 1 },
];

export const BOQ_CATALOG_GENERAL: BoqCatalogItem[] = [
  { name: "עבודות עפר ופיתוח שטח", cat: "עבודות עפר ופיתוח שטח", unit: "קומפ'", qty: 1 },
  { name: "כלונסאות ויסודות", cat: "כלונסאות ויסודות", unit: "קומפ'", qty: 1 },
  { name: "שלד ובטונים", cat: "שלד ובטונים", unit: "קומפ'", qty: 1 },
  { name: "קירות, בלוקים ומחיצות", cat: "קירות, בלוקים ומחיצות", unit: 'מ"ר', qty: 1 },
  { name: "גגות ותקרות", cat: "גגות ותקרות", unit: "קומפ'", qty: 1 },
  { name: "איטום ובידוד", cat: "איטום ובידוד", unit: "קומפ'", qty: 1 },
  { name: "טיח פנים", cat: "טיח פנים", unit: 'מ"ר', qty: 1 },
  { name: "טיח חוץ ושליכט", cat: "טיח חוץ ושליכט", unit: 'מ"ר', qty: 1 },
  { name: "צבע פנים", cat: "צבע פנים", unit: 'מ"ר', qty: 1 },
  { name: "צבע חוץ", cat: "צבע חוץ", unit: 'מ"ר', qty: 1 },
  { name: "גבס / הנמכות תקרה", cat: "גבס", unit: 'מ"ר', qty: 1 },
  { name: "ניקיון לאחר בנייה", cat: "ניקיון לאחר בנייה", unit: "קומפ'", qty: 1 },
  { name: "פינוי פסולת", cat: "פינוי פסולת", unit: "קומפ'", qty: 1 },
  { name: "הובלות והרכבות", cat: "הובלות והרכבות", unit: "קומפ'", qty: 1 },
  { name: "אדריכלות", cat: "אדריכלות", unit: "קומפ'", qty: 1 },
  { name: "קונסטרוקציה", cat: "קונסטרוקציה", unit: "קומפ'", qty: 1 },
  { name: "יועץ קרקע", cat: "יועץ קרקע", unit: "קומפ'", qty: 1 },
  { name: "יועץ חשמל", cat: "יועץ חשמל", unit: "קומפ'", qty: 1 },
  { name: "יועץ אינסטלציה", cat: "יועץ אינסטלציה", unit: "קומפ'", qty: 1 },
  { name: "יועץ מיזוג", cat: "יועץ מיזוג", unit: "קומפ'", qty: 1 },
  { name: "פיקוח בנייה", cat: "פיקוח בנייה", unit: "קומפ'", qty: 1 },
  { name: "אגרות והיטלים", cat: "אגרות והיטלים", unit: "קומפ'", qty: 1 },
  { name: "בלתי צפוי / רזרבה", cat: "בלתי צפוי / רזרבה", unit: "קומפ'", qty: 1 },
  { name: "עבודות כלליות", cat: "עבודות כלליות", unit: "קומפ'", qty: 1 },
];

export const BOQ_CATALOG_BY_ROOM: Record<string, BoqCatalogItem[]> = roomItems;

export const getCatalogForRoom = (type?: string, includeGeneral = false) => {
  const specific = type ? BOQ_CATALOG_BY_ROOM[type] || [] : [];
  return includeGeneral
    ? [...specific, ...BOQ_CATALOG_UNIVERSAL, ...BOQ_CATALOG_GENERAL]
    : [...specific, ...BOQ_CATALOG_UNIVERSAL];
};

export const getAllBoqCatalogCategories = () => {
  const categories = [
    ...Object.values(BOQ_CATALOG_BY_ROOM).flat(),
    ...BOQ_CATALOG_UNIVERSAL,
    ...BOQ_CATALOG_GENERAL,
  ].map((item) => item.cat);
  return Array.from(new Set(categories));
};
