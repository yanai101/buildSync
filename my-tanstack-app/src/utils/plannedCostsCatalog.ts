// Costs self-builders commonly forget, grouped by phase. Only items not
// already covered by contractor trades or the BOQ. Each selected item is
// added as a pending expense (the estimate) under its phase category.

export type PlannedCostItem = { name: string; tip?: string };

export type PlannedCostPhase = {
  category: string;
  color: string;
  items: PlannedCostItem[];
};

export const PLANNED_COST_PHASES: PlannedCostPhase[] = [
  {
    category: 'מגרש ורכישה',
    color: '#6366F1',
    items: [
      { name: 'עלות מגרש' },
      { name: 'פיתוח קרקע' },
      { name: 'מס רכישה' },
      { name: 'עורך דין' },
      { name: 'רישום בטאבו / אישור זכויות' },
    ],
  },
  {
    category: 'תכנון והיתרים',
    color: '#3B82F6',
    items: [
      { name: 'אדריכל' },
      { name: 'קונסטרוקטור' },
      { name: 'מודד' },
      { name: 'יועץ קרקע + קידוח' },
      { name: 'יועץ אינסטלציה' },
      { name: 'מעצב/ת פנים' },
      { name: 'פתיחת תיק מידע' },
      { name: 'אגרות בנייה' },
      { name: 'היטל השבחה' },
      { name: 'אגרת חיבור מים' },
      { name: 'אגרות ביוב' },
      { name: 'אגרת כיבוי אש' },
      { name: 'פרסום הקלות' },
      { name: 'העתקות תכניות' },
      { name: 'מפקח / מנהל פרויקט' },
      { name: 'מעבדה לבדיקות איכות' },
      { name: 'ביטוח "בנה ביתך"', tip: 'יש לעשות לפני תחילת העבודות' },
    ],
  },
  {
    category: 'מימון ומשכנתא',
    color: '#14B8A6',
    items: [
      { name: 'ערבות בנקאית + עמלה' },
      { name: 'שמאי מטעם הבנק' },
      { name: 'יועץ משכנתאות' },
      { name: 'עמלת פתיחת תיק משכנתא' },
      { name: 'ביטוח משכנתא (חיים)' },
      { name: 'משכון ונוטריון' },
    ],
  },
  {
    category: 'לפני הכניסה לבית',
    color: '#EC4899',
    items: [
      { name: 'מודד לטופס 4' },
      { name: 'בדק בית' },
      { name: 'ביטוח מבנה', tip: 'בתוקף רק אחרי קבלת טופס 4' },
      { name: "ביטוח תכולה וצד ג'" },
      { name: 'ניקיון ופינוי פסולת' },
      { name: 'הובלה' },
      { name: 'מזוזות' },
    ],
  },
];
