import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'


export const Route = createFileRoute('/privacy')({
  component: PrivacyScreen,
})

function PrivacyScreen() {
  return (
    <div style={{ flex: 1, width: '100%', height: '100vh', overflowY: 'auto', background: 'linear-gradient(180deg, rgba(10,10,12,0.85) 0%, rgba(10,10,12,0.98) 100%), url(/hero.webp) center/cover fixed', color: '#fff', padding: '60px 20px', fontFamily: "'Heebo', sans-serif" }} dir="rtl">
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'rgba(19, 19, 24, 0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: 50, borderRadius: 24, border: `1px solid rgba(255,255,255,0.08)`, boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
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

          <h2 style={{ fontSize: '1.5rem', color: '#fff', marginTop: 30, marginBottom: 15 }}>2. שימוש במידע ונתוני משתמש גוגל (Google User Data)</h2>
          <p style={{ marginBottom: 20 }}>
            המידע שאנו אוספים משמש לאספקת השירותים של המערכת, שיפור חוויית המשתמש, יצירת קשר במקרה הצורך, ואבטחת המערכת.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid #3B82F6', padding: '20px', borderRadius: '8px', marginBottom: '20px', color: '#e0e0e0', direction: 'ltr', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#3B82F6', marginTop: 0, marginBottom: 15 }}>Google User Data Policy</h3>
            <ul style={{ paddingLeft: 20, margin: 0, listStyleType: 'disc' }}>
              <li style={{ marginBottom: 10 }}>
                <strong>BuildSync may access basic Google account information</strong>, such as the user's email address, name, and profile information, only for the purpose of authentication and account identification.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong>BuildSync does not sell, share, or transfer Google user data</strong> to third parties except as necessary to provide the service, comply with applicable law, or protect users and the service.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong>BuildSync does not use Google user data for advertising purposes.</strong>
              </li>
              <li style={{ marginBottom: 0 }}>
                <strong>BuildSync does not use Google user data to train AI or machine learning models.</strong>
              </li>
            </ul>
          </div>

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
