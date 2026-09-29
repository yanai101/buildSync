import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../components/Shared';
import { Link } from '@tanstack/react-router';

export const TermsScreen = () => {
  return (
    <div style={{ background: '#fcfcfc', minHeight: '100vh', direction: 'rtl', fontFamily: "'Heebo', sans-serif" }}>
      {/* Header */}
      <header style={{ padding: '20px 5%', background: '#08080a', color: '#fff', display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
          <Icon n="arrow-right" s={18} /> חזרה לדף הבית
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
          <img 
            src="/logo.png" 
            alt="BuildSync Logo" 
            style={{ 
              width: 28, 
              height: 28, 
              borderRadius: 6,
              objectFit: 'cover'
            }} 
          />
          <span style={{ fontSize: 20, fontWeight: 800 }}>BuildSync</span>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 800, margin: '60px auto', padding: '0 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ background: '#fff', padding: '40px', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, color: 'var(--text1)' }}>תנאי שימוש, הגבלת אחריות והסדר עסקי</h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: 'var(--text2)', lineHeight: 1.6, fontSize: 15 }}>
            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>1. זהות המפעילים ומטרת המערכת</h2>
              <p>
                מערכת BuildSync (להלן: "המערכת" או "השירות") הינה פלטפורמה טכנולוגית שנועדה לייעל, לשקף ולהקל על תהליכי ניהול ותיעוד הבנייה עבור יזמים, מפקחים, קבלנים ובעלי נכסים. המערכת מופעלת ומנוהלת ע״י ינאי אדרי ונריה זמירי (ירוחם, ישראל). המערכת נועדה לספק כלים דיגיטליים מתקדמים, אך היא אינה מהווה תחליף לייעוץ או שירות מקצועי, הנדסי, בטיחותי או משפטי.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>2. היעדר אחריות משפטית ומקצועית</h2>
              <p>
                המערכת מסופקת למשתמשים כמות שהיא ("AS-IS"). מפעילי המערכת אינם נושאים בשום אחריות משפטית, ישירה או עקיפה, לטיב העבודה, לחריגות תקציב, לעיכובים בלוחות זמנים, לפגמים במבנה, או לכל ליקוי בטיחותי העלול להתרחש בפרויקט. האחריות המלאה על ביצוע הפרויקט, הפיקוח והתשלומים חלה אך ורק על המשתמשים עצמם בהתאם לחוזים ביניהם.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>3. אי-התערבות בסכסוכים משפטיים</h2>
              <p>
                למרות שהחומר, התמונות, יומני העבודה וההודעות מתועדים, נשמרים וזמינים לאורך הפרויקט, מפעילי BuildSync אינם, ולא יהיו, צד בשום עניין או סכסוך משפטי, מסחרי או חוזי שיתגלע בין המשתמשים במערכת (קבלנים, מפקחים, יזמים או לקוחות). המידע נשמר לצורך נוחות המשתמשים בלבד ואינו מהווה ערובה לתקינותו המשפטית בבית משפט. המערכת משמשת ככלי תיעוד ניטרלי בלבד.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>4. הסדר עסקי, מנויים ותשלומים</h2>
              <p style={{ marginBottom: 10 }}>
                המערכת מציעה מסלול שימוש בסיסי ללא תשלום (Free), וכן מסלולי פרימיום מתקדמים (Pro) הכוללים ניהול פרויקטים ללא הגבלה, הפקת יומני עבודה ל-PDF, ניהול עלויות רכש וכלים נוספים.
              </p>
              <ul style={{ paddingRight: 20, margin: '8px 0', listStyleType: 'disc' }}>
                <li style={{ marginBottom: 6 }}>
                  <strong>דמי מנוי:</strong> עלות מנוי Pro הינה 149 ₪ לחודש, או 1,490 ₪ למנוי שנתי (כולל מע״מ כחוק ככל שחל).
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong>אבטחת תשלומים וחשבוניות:</strong> החיוב מבוצע בסליקה מאובטחת בהתאם לתקני האבטחה המחמירים ביותר. כנגד כל תשלום מופקת קבלה / חשבונית מס כחוק הנשלחת לכתובת הדוא״ל של המשתמש.
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong>ביטול עסקה והחזר כספי (חוק הגנת הצרכן):</strong> משתמש רשאי לבטל את המנוי בכל עת. בהתאם לחוק הגנת הצרכן, ביטול עסקה שייעשה בתוך 14 ימים ממועד ההצטרפות יזכה את המשתמש בהחזר כספי מלא. לאחר 14 יום, ביטול מנוי יחול בסיום תקופת החיוב השוטפת ללא חיובים נוספים.
                </li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>5. בעלות על המידע ואבטחה</h2>
              <p>
                כלל התכנים, התמונות, המסמכים, נתוני התקציב ויומני העבודה שמועלים ע״י המשתמש למערכת הינם בבעלותו הבלעדית של המשתמש. מפעילי המערכת מתחייבים שלא לעשות כל שימוש מסחרי במידע של המשתמש, לא למכור אותו ולא להעבירו לצדדים שלישיים שלא לצורך מתן השירות הטכנולוגי השוטף.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>6. שירות לקוחות ופרטי התקשרות</h2>
              <p style={{ marginBottom: 8 }}>
                לכל שאלה, בירור עסקי, תיאום הדגמה או בקשת תמיכה טכנית, ניתן לפנות אלינו באחד מערוצי הקשר הבאים:
              </p>
              <ul style={{ paddingRight: 20, margin: 0, listStyleType: 'disc' }}>
                <li style={{ marginBottom: 6 }}>
                  <strong>שיווק, מכירות ותיאום הדגמות:</strong> נריה זמירי – טלפון / וואטסאפ: <a href="https://wa.me/972505074064" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>050-5074064</a>
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong>תמיכה טכנית ופניות שירות בדוא"ל:</strong> <a href="mailto:support@buildsync.co.il" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>support@buildsync.co.il</a>
                </li>
                <li>
                  <strong>פניות ישירות במערכת:</strong> משתמשים רשומים יכולים לשלוח פנייה ישירה בכל עת באמצעות כפתור "תמיכה / יצירת קשר" המובנה במערכת.
                </li>
              </ul>
            </section>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
            
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>
              עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
