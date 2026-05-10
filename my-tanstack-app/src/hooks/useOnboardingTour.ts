import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export function useOnboardingTour() {
  const driverRef = useRef<any>(null);

  useEffect(() => {
    driverRef.current = driver({
      showProgress: true,
      nextBtnText: 'הבא',
      prevBtnText: 'הקודם',
      doneBtnText: 'סיום',
      progressText: '{{current}} מתוך {{total}}',
      allowClose: true,
      popoverClass: 'buildsync-tour-theme',
      steps: [
        {
          element: '#tour-nav-projects',
          popover: {
            title: 'שלב 1: בחירת או יצירת פרויקט',
            description: 'צרו פרויקט חדש או בחרו פרויקט קיים מתוך הרשימה, ורכזו בו את כל המידע הרלוונטי בצורה מסודרת.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-setup',
          popover: {
            title: 'שלב 2: הגדרת הבית',
            description: 'הגדירו את הבית שלכם: הוסיפו קומות, חדרים ויחידות דיור כדי לבנות את התשתית לפרויקט כולו.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-contractors',
          popover: {
            title: 'שלב 3: הוספת קבלנים וצוות',
            description: 'הוסיפו קבלנים, מפקחים ובעלי מקצוע לפרויקט. נהלו את ההסכמים ואנשי הקשר שלהם בקלות.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-boqwizard',
          popover: {
            title: 'שלב 4: אשף כמויות (BOQ)',
            description: 'השתמשו באשף כמויות חכם כדי ליצור אוטומטית רשימות קניות מבוססות על החדרים שהגדרתם.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-orders',
          popover: {
            title: 'שלב 5: מעקב הזמנות',
            description: 'עקבו אחר כל ההזמנות שלכם במקום אחד. עדכנו סטטוס משלוחים, ספקים והעלו קבלות רכישה.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-budget',
          popover: {
            title: 'שלב 6: ניהול תקציב',
            description: 'נהלו את התקציב שלכם בזמן אמת ושלטו בהוצאות כדי למנוע חריגות מהתקנון.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-quotes',
          popover: {
            title: 'השוואת הצעות מחיר',
            description: 'בנוסף, תוכלו לרכז ולהשוות הצעות מחיר מספקים שונים לפני שאתם סוגרים עסקה.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-daily-logs',
          popover: {
            title: 'שלב 7: יומן עבודה ותיעוד',
            description: 'תעדו את התקדמות הפרויקט ברמה היומית. הוסיפו תמונות, הערות שטח ומלאו צ\'קליסטים מקצועיים.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-user-menu',
          popover: {
            title: 'הכל מוכן! יוצאים לדרך',
            description: 'כאן תוכלו לשנות את פרטי החשבון שלכם או להפעיל את המדריך הזה שוב מתי שתרצו. שיהיה בהצלחה!',
            side: 'bottom',
            align: 'end'
          }
        }
      ]
    });
  }, []);

  const startTour = () => {
    if (driverRef.current) {
      driverRef.current.drive();
    }
  };

  return { startTour };
}
