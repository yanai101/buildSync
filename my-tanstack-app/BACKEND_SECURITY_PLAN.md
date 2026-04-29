# תוכנית אכיפת הרשאות בשרת (Backend Security Plan)

הקובץ הזה מרכז את התוכנית לאכיפת Role-Based Access Control (RBAC) בשרת (Convex), כדי למנוע גישה ישירה לנתונים ממשתמשים לא מורשים.

## 1. פונקציות אימות עזר (`convex/_lib/projectAccess.ts`)
ניצור או נעדכן 3 פונקציות עזר גנריות לבדיקת הרשאות פרויקט, שישמשו בכל Queries ו-Mutations:
- **`requireProjectOwner(ctx, projectId)`**: מוודא שהמשתמש הוא יזם (`owner`).
- **`requireProjectManager(ctx, projectId)`**: מוודא שהמשתמש הוא יזם או מנהל פרויקט (`manager`).
- **`requireProjectInspector(ctx, projectId)`**: מוודא שהמשתמש מורשה ברמת מפקח ומעלה (`owner`, `manager`, `inspector`).

## 2. חלוקה לפי קבצי Convex ומודולים

### 2.1 תקציב והוצאות (`budget.ts`)
- **מגבלה:** `requireProjectOwner`
- **פעולות:** שליפת תקציב, יצירת קטגוריות תקציב, הוספת/עריכת/מחיקת הוצאות.

### 2.2 הצעות מחיר (`quotes.ts`)
- **מגבלה:** `requireProjectOwner`
- **פעולות:** שליפת רשימת הצעות, יצירה, עדכון, מחיקה ואישור של הצעות מחיר.

### 2.3 מסמכים אישיים / כספת (`personalFiles.ts`)
- **מגבלה:** בעל חשבון שהוא `owner` בלבד. אין צורך לשייך לפרויקט מסוים, אלא בדיקה שזה ה-identity.role.
- **פעולות:** העלאת מסמכים, צפייה במסמכים, מחיקה.

### 2.4 הגדרות הפרויקט (`projects.ts`)
- **פעולת העריכה (`saveProjectSetup`):** `requireProjectManager`.
- **משיכת פרטי הפרויקט (`getWithDetails`):** מורשית לכל חברי הצוות של הפרויקט.

### 2.5 אשף כמויות ו-BOQ (`mutations.ts` / `queries.ts`)
- **קריאה (`listBoq`):** `requireProjectInspector` (מפקח, מנהל, יזם).
- **פעולות עריכה (`addBoqItem`, `updateBoqItem`, `updateBoqItemStatus`):** `requireProjectManager` או לפחות מוגבל ליכולת של ה-inspector לעדכן רק סטטוס. (כרגע נגביל ל-Manager את עריכת המחירים/פריטים).

### 2.6 בירוקרטיה והיתרים (`permits.ts`)
- **מגבלה:** `requireProjectInspector`.
- **פעולות:** משיכת אישורים, העלאה, מחיקה, עדכון רשויות והערות.

---
**אופן הפעולה:** לכל תהליך שיתבצע מול השרת, נוסיף בתחילתו את שורת הבדיקה המתאימה. אם אין הרשאה - הבקשה תיחסם בשרת ויזרק חריג (Error).
