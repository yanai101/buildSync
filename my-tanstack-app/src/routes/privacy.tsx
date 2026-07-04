import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'


export const Route = createFileRoute('/privacy')({
  component: PrivacyScreen,
})

function PrivacyScreen() {
  return (
    <div style={{ flex: 1, backgroundColor: '#0a0a0c', color: '#fff', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Heebo', sans-serif" }} dir="rtl">
      <div style={{ maxWidth: 800, margin: '0 auto', background: '#131318', padding: 40, borderRadius: 16, border: `1px solid rgba(255,255,255,0.05)`, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>מדיניות פרטיות</h1>
          <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            חזרה לדף הבית
          </Link>
        </div>
        
        <div style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#ccc' }}>
          <p style={{ marginBottom: 20 }}>
            ברוכים הבאים למערכת BuildSync. פרטיות המשתמשים שלנו חשובה לנו מאוד. מסמך זה מפרט כיצד אנו אוספים, משתמשים ושומרים על המידע שלך בעת השימוש באפליקציה.
          </p>

          <h2 style={{ fontSize: '1.5rem', color: '#fff', marginTop: 30, marginBottom: 15 }}>1. איסוף מידע</h2>
          <p style={{ marginBottom: 20 }}>
            אנו אוספים מידע שאתה מספק לנו ישירות, כגון בעת יצירת חשבון, עדכון פרופיל, שימוש במערכת באמצעות התחברות עם גוגל (Google OAuth), והזנת נתונים במערכת. המידע עשוי לכלול שם, כתובת דוא"ל, מספר טלפון ומידע הקשור לפרויקטים שלך.
          </p>

          <h2 style={{ fontSize: '1.5rem', color: '#fff', marginTop: 30, marginBottom: 15 }}>2. שימוש במידע</h2>
          <p style={{ marginBottom: 20 }}>
            המידע שאנו אוספים משמש לאספקת השירותים של המערכת, שיפור חוויית המשתמש, יצירת קשר במקרה הצורך, ואבטחת המערכת. אנו משתמשים בפרטי חשבון הגוגל שלך אך ורק לצורך זיהוי ואימות במערכת.
          </p>

          <h2 style={{ fontSize: '1.5rem', color: '#fff', marginTop: 30, marginBottom: 15 }}>3. שיתוף מידע</h2>
          <p style={{ marginBottom: 20 }}>
            איננו מוכרים, סוחרים או מעבירים בדרך אחרת את המידע האישי שלך לצדדים שלישיים ללא הסכמתך, אלא אם כן הדבר נדרש על פי חוק או לשם אספקת השירות (כגון שירותי ענן מאובטחים המאחסנים את הנתונים).
          </p>

          <h2 style={{ fontSize: '1.5rem', color: '#fff', marginTop: 30, marginBottom: 15 }}>4. אבטחת מידע</h2>
          <p style={{ marginBottom: 20 }}>
            אנו נוקטים באמצעי אבטחה טכנולוגיים מתקדמים כדי להגן על המידע שלך מפני גישה, שימוש או חשיפה בלתי מורשים.
          </p>

          <h2 style={{ fontSize: '1.5rem', color: '#fff', marginTop: 30, marginBottom: 15 }}>5. שינויים במדיניות זו</h2>
          <p style={{ marginBottom: 20 }}>
            אנו עשויים לעדכן את מדיניות הפרטיות מעת לעת. במקרה של שינוי מהותי, נודיע על כך למשתמשים דרך המערכת או באמצעות דוא"ל.
          </p>

          <p style={{ marginTop: 40, color: '#888', fontSize: '0.9rem' }}>
            עודכן לאחרונה: 4 ביולי, 2026
          </p>
        </div>
      </div>
    </div>
  )
}
