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
            title: 'ברוכים הבאים ל-BuildSync! 🎉',
            description: 'כאן תוכלו ליצור פרויקטים חדשים ולעבור בין הפרויקטים הפעילים שלכם.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-setup',
          popover: {
            title: 'הגדרות בית',
            description: 'בשלב הראשון, מגדירים את מבנה הבית ואת רשימת החדרים עבור הפרויקט.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-stages',
          popover: {
            title: 'שלבי בנייה וקבלנים',
            description: 'כאן תוכלו לנהל את התקדמות הבנייה, להגדיר קבלנים ולעקוב אחרי התשלומים לכל שלב.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-boqwizard',
          popover: {
            title: 'אשף כמויות',
            description: 'אשף חכם שיעזור לכם לייצר אוטומטית רשימת קניות (כתב כמויות) המבוססת על החדרים שהגדרתם.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-budget',
          popover: {
            title: 'ניהול תקציב',
            description: 'מעקב מדויק אחר כל ההוצאות הפרויקט שלכם מול התקציב שהגדרתם.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-nav-quotes',
          popover: {
            title: 'הצעות מחיר',
            description: 'כאן תוכלו לרכז ולהשוות הצעות מחיר מספקים שונים בצורה מסודרת.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-user-menu',
          popover: {
            title: 'הגדרות אישיות',
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
