import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { LegalShell, LegalSection } from '~/components/LegalShell'


export const Route = createFileRoute('/privacy')({
  component: PrivacyScreen,
})

function PrivacyScreen() {
  return (
    <LegalShell
      photo="stage-5"
      eyebrow="מסמכים משפטיים"
      title="מדיניות פרטיות"
      lede="ברוכים הבאים למערכת BuildSync. המערכת מופעלת ומנוהלת ע״י ינאי אדרי ונריה זמירי (ירוחם, ישראל). פרטיות המשתמשים שלנו עומדת בראש סדר העדיפויות שלנו. מסמך זה מפרט כיצד אנו אוספים, משתמשים ושומרים על המידע שלך בעת השימוש באפליקציה ובשירותים הנלווים."
    >
      <LegalSection title="1. איסוף מידע">
        <p>
          אנו אוספים מידע שאתה מספק לנו ישירות, כגון בעת יצירת חשבון, עדכון פרופיל, שימוש במערכת באמצעות התחברות עם גוגל (Google OAuth), והזנת נתונים במערכת. המידע עשוי לכלול שם, כתובת דוא"ל, מספר טלפון ומידע הקשור לפרויקטים שלך.
        </p>
      </LegalSection>

      <LegalSection title="2. שימוש במידע ונתוני משתמש גוגל (Google User Data)">
        <p>
          המידע שאנו אוספים משמש לאספקת השירותים של המערכת, שיפור חוויית המשתמש, יצירת קשר במקרה הצורך, ואבטחת המערכת.
        </p>
        <div className="legal__callout" lang="en">
          <h3>Google User Data Policy</h3>
          <ul>
            <li>
              <strong>BuildSync may access basic Google account information</strong>, such as the user's email address, name, and profile information, only for the purpose of authentication and account identification.
            </li>
            <li>
              <strong>BuildSync does not sell, share, or transfer Google user data</strong> to third parties except as necessary to provide the service, comply with applicable law, or protect users and the service.
            </li>
            <li>
              <strong>BuildSync does not use Google user data for advertising purposes.</strong>
            </li>
            <li>
              <strong>BuildSync does not use Google user data to train AI or machine learning models.</strong>
            </li>
          </ul>
        </div>
      </LegalSection>

      <LegalSection title="3. שיתוף מידע">
        <p>
          איננו מוכרים, סוחרים או מעבירים בדרך אחרת את המידע האישי שלך לצדדים שלישיים ללא הסכמתך, אלא אם כן הדבר נדרש על פי חוק או לשם אספקת השירות (כגון שירותי ענן מאובטחים המאחסנים את הנתונים).
        </p>
      </LegalSection>

      <LegalSection title="4. אבטחת מידע">
        <p>
          אנו נוקטים באמצעי אבטחה טכנולוגיים מתקדמים כדי להגן על המידע שלך מפני גישה, שימוש או חשיפה בלתי מורשים.
        </p>
      </LegalSection>

      <LegalSection title="5. שינויים במדיניות זו">
        <p>
          אנו עשויים לעדכן את מדיניות הפרטיות מעת לעת. במקרה של שינוי מהותי, נודיע על כך למשתמשים דרך המערכת או באמצעות דוא"ל.
        </p>
      </LegalSection>

      <LegalSection title="6. יצירת קשר ובירורים">
        <p>
          אם יש לך שאלות או בקשות בנוגע למדיניות פרטיות זו, מימוש זכויותיך או בקשה למחיקת מידע, ניתן לפנות אלינו ישירות:
        </p>
        <ul>
          <li>
            דוא"ל תמיכה ופרטיות:{' '}
            <a href="mailto:support@buildsync.co.il" className="legal__ltr">support@buildsync.co.il</a>
          </li>
          <li>
            פניות ובירורים (נריה זמירי):{' '}
            <a href="https://wa.me/972505074064">050-5074064 (טלפון / וואטסאפ)</a>
          </li>
        </ul>
      </LegalSection>

      <p className="legal__updated">
        עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}
      </p>
    </LegalShell>
  )
}
