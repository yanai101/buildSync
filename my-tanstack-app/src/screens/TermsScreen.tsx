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
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, color: 'var(--text1)' }}>תנאי שימוש והגבלת אחריות</h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: 'var(--text2)', lineHeight: 1.6, fontSize: 15 }}>
            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>1. מטרת המערכת</h2>
              <p>
                מערכת BuildSync הינה פלטפורמה טכנולוגית שנועדה לייעל, לשקף ולהקל על תהליכי ניהול ותיעוד הבנייה עבור יזמים, מפקחים, קבלנים ובעלי נכסים. המערכת נועדה לספק כלים דיגיטליים מתקדמים, אך היא אינה מהווה תחליף לייעוץ או שירות מקצועי, הנדסי, בטיחותי או משפטי.
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
