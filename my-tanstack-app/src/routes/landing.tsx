import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon } from '~/components/Shared'
import { motion, useScroll, useTransform } from 'framer-motion'

export const Route = createFileRoute('/landing')({
  component: LandingPage,
})

function LandingPage() {
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  // Interactive Tasks State
  const [tasks, setTasks] = useState([
    { id: 1, text: "התקנת משקופים עיוורים", done: true },
    { id: 2, text: "שכבת טיח מיישר בסלון", done: false },
    { id: 3, text: "אישור מפקח לטיח (אבי כהן)", done: false }
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const completedTasks = tasks.filter(t => t.done).length;
  const progressPercent = Math.round((completedTasks / tasks.length) * 100);

  const fadeIn: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  };

  const staggerContainer: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="landing-page" style={{ flex: 1, width: '100%', height: '100vh', overflowY: 'auto', background: '#0a0a0c', color: '#fff', fontFamily: "'Heebo', sans-serif", overflowX: 'hidden' }}>
      
      {/* GLOBAL SCOPED STYLES */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #0a0a0c; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--accent); }

        .section-padding { padding: 140px 5%; position: relative; }
        .content-width { max-width: 1300px; margin: 0 auto; width: 100%; }

        .hero-section { min-height: 100vh; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .hero-title { font-size: clamp(3.5rem, 8vw, 6.5rem); max-width: 1400px; margin: 0 auto; line-height: 1.05; letter-spacing: -0.04em; }
        
        .split-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .split-layout.reversed .split-text { order: 2; }
        .split-layout.reversed .split-media { order: 1; }

        .feature-badge {
          display: inline-block; font-size: 13px; font-weight: 800; color: var(--accent);
          letter-spacing: 1.5px; margin-bottom: 24px; text-transform: uppercase;
        }
        
        .feature-title { font-size: clamp(2.5rem, 4vw, 3.5rem); font-weight: 800; margin-bottom: 32px; line-height: 1.1; letter-spacing: -0.02em; }
        .feature-desc { color: #a0a0a0; font-size: 1.25rem; line-height: 1.7; margin-bottom: 40px; }
        
        .bullet-list { list-style: none; display: flex; flex-direction: column; gap: 20px; }
        .bullet-item { display: flex; align-items: flex-start; gap: 16px; font-size: 1.15rem; color: #ddd; }
        
        .mockup-container { position: relative; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.08); }
        .mockup-img { width: 100%; height: auto; display: block; transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
        .mockup-container:hover .mockup-img { transform: scale(1.03); }

        .floating-card {
          position: absolute; background: rgba(20,20,25,0.65); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          padding: 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1); z-index: 10;
        }

        .cta-btn {
          display: inline-block; background: linear-gradient(135deg, var(--accent) 0%, #B45309 100%); color: #fff; padding: 20px 48px;
          border-radius: 14px; font-weight: 800; font-size: 1.25rem; text-decoration: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 10px 30px rgba(224,122,56,0.3);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .cta-btn:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(224,122,56,0.5); border-color: rgba(255,255,255,0.3); }
        
        .cta-secondary {
          display: inline-block; background: rgba(255,255,255,0.03); color: #fff; padding: 20px 48px; backdrop-filter: blur(10px);
          border-radius: 14px; font-weight: 700; font-size: 1.25rem; text-decoration: none; border: 1px solid rgba(255,255,255,0.15);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cta-secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.4); transform: translateY(-4px); }

        .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 32px; }
        .info-card { background: rgba(19,19,24,0.6); backdrop-filter: blur(20px); padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.06); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .info-card:hover { transform: translateY(-8px); border-color: rgba(255,255,255,0.2); box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(224,122,56,0.1); }

        .interactive-task { cursor: pointer; transition: all 0.2s; padding: 6px 8px; border-radius: 8px; }
        .interactive-task:hover { background: rgba(255,255,255,0.05); }

        .gradient-text {
          background: linear-gradient(135deg, #fff 0%, #aaa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Mobile Adjustments */
        @media (max-width: 1024px) {
          .split-layout { grid-template-columns: 1fr; gap: 60px; }
          .split-layout.reversed .split-text { order: 1; }
          .split-layout.reversed .split-media { order: 2; }
          .section-padding { padding: 80px 5%; }
        }
      `}</style>
      
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <motion.div style={{ position: 'absolute', inset: 0, zIndex: 0, y: yBg }}>
          <img src="/hero.png" alt="Construction background" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,12,0.6) 0%, rgba(10,10,12,0.9) 60%, rgba(10,10,12,1) 100%)' }} />
        </motion.div>

        <header style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', padding: '30px 5%', alignItems: 'center' }}>
          <div className="sidebar-logo" style={{ marginBottom: 0 }}>
            <div className="sidebar-logo-mark" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #B45309 100%)', color: '#fff', boxShadow: '0 0 15px rgba(224,122,56,0.4)' }}>B</div>
            <div>
              <div className="sidebar-logo-text" style={{fontSize: 28, color: '#fff'}}>Build<span style={{color: 'var(--accent)'}}>Pro</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/" style={{ color: '#ddd', fontWeight: 600, fontSize: 16, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#ddd'}>
              היכנס למערכת
            </Link>
          </div>
        </header>

        <motion.div 
          initial="hidden" animate="visible" variants={staggerContainer}
          style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', padding: '0 5% 80px', textAlign: 'center' }}
        >
          <motion.div variants={fadeIn} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: 40, fontSize: 15, color: '#fff', fontWeight: 600, marginBottom: 40 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 15px var(--success)' }} />
            הפלטפורמה המקיפה ביותר למנהלי עבודה, יזמים ומשפצים
          </motion.div>
          
          <motion.h1 variants={fadeIn} className="hero-title gradient-text" style={{ fontWeight: 900, textShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            לנהל פרויקט בנייה או שיפוץ<br/>
            <span style={{ color: 'var(--accent)', display: 'inline-block', marginTop: 10, background: 'linear-gradient(135deg, var(--accent) 0%, #FDE68A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>בעיניים עצומות.</span>
          </motion.h1>
          
          <motion.p variants={fadeIn} style={{ fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', color: '#bbb', margin: '40px auto 60px', lineHeight: 1.6, maxWidth: 850, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            הפסק לרדוף אחרי קבלנים, קבלות בוואטסאפ וקובצי אקסל שבורים. <strong style={{color:'#fff'}}>BuildSync</strong> מרכזת את עולמות התקציב, ניהול משימות הקבלן, התקשורת ועריכת כתבי הכמויות אל תוך דשבורד אחד שמבין את השטח.
          </motion.p>
          
          <motion.div variants={fadeIn} style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="cta-btn">הקם פרויקט חדש עכשיו</Link>
            <Link to="/" className="cta-secondary">צפה בתצוגת תכלית (דמו)</Link>
          </motion.div>
        </motion.div>
      </section>

      {/* 2. CORE TRIAD (Quick Highlights) */}
      <section className="section-padding" style={{ background: '#0a0a0c', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingTop: 60 }}>
        <div className="content-width">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {[
              { icon: 'clock', color: '#007AFF', title: 'חסוך משאבים וזמן', desc: 'שליטה בכל שלבי הפרויקט מונעת הפסקות עבודה מיותרות, חיכוך מול ספקים ועיכובים.' },
              { icon: 'chart', color: 'var(--warning)', title: 'שקיפות כספית מלאה', desc: 'כל הוצאה, חריגה ותשלום עתידי לקבלן מוצגים תמיד באחוזים אל מול אבני הדרך בשטח.' },
              { icon: 'check-circle', color: 'var(--success)', title: 'איכות עבודה ללא טעויות', desc: 'מנגנון הערות פנימי ששומר על תקן. אישורי ביצוע מונעים התקדמות בלי בדיקת איכות.' }
            ].map((f, i) => (
              <motion.div variants={fadeIn} key={i} style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ width: 80, height: 80, background: `rgba(255,255,255,0.03)`, margin: '0 auto 24px', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                  <Icon n={f.icon} s={36} c={f.color} />
                </div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 16 }}>{f.title}</h3>
                <p style={{ color: '#888', fontSize: '1.1rem', lineHeight: 1.5 }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 3. FEATURE DEEP DIVE: COMMUNICATION & PHOTOS */}
      <section className="section-padding" style={{ background: '#0a0a0c' }}>
        <div className="content-width split-layout">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="split-text">
            <span className="feature-badge">חווית תקשורת מתקדמת</span>
            <h2 className="feature-title">צ'אטים שמחוברים לבלוקים בשטח.</h2>
            <p className="feature-desc">
              איבדתם את הידיים והרגליים בהודעות וואטסאפ פרטיות? במערכת BuildSync מובנה מודול 'תיעוד ותקשורת' מהפכני שמאפשר לקשור טקסט ישירות אל התמונה מהשטח.
            </p>
            <ul className="bullet-list">
              <li className="bullet-item"><Icon n="pen" s={28} c="var(--accent)" style={{marginTop:4}} /> <div><strong>ציור טכני על תמונות:</strong> סמן בעיות טיח, חוסר אטימה או מיקומים ישירות על התמונה שצולמה מהשטח מתוך הנייד.</div></li>
              <li className="bullet-item"><Icon n="users" s={28} c="var(--accent)" style={{marginTop:4}} /> <div><strong>תיבות שיחה מופרדות:</strong> נהל שרשור שיח "פנימי" יחד עם היזם, ושרשור "קבלן" שמיועד להוראות עבודה - הכל על אותו התיעוד מבלי להתערבב.</div></li>
              <li className="bullet-item"><Icon n="alert" s={28} c="var(--accent)" style={{marginTop:4}} /> <div><strong>תגיות סטטוס:</strong> סמן תמונה בטאג כגון "בעיה", "ממתין לבדיקה" או "אושר" כדי לא לאבד משימות בין הקירות.</div></li>
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="split-media relative">
            <div className="mockup-container">
              <img src="/dashboard_mockup.png" className="mockup-img" alt="Communication Dashboard" />
            </div>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="floating-card" style={{ bottom: -40, left: -20, minWidth: 320 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #E07A38 0%, #B45309 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>ק</div>
                <div><div style={{ fontSize: 13, fontWeight: 'bold' }}>יוסי (קבלן שלד)</div><div style={{ fontSize: 11, color: '#aaa' }}>הגיב על: תמונת חזית מזרחית</div></div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: 16, borderRadius: 12, fontSize: 14, color: '#ddd', border: '1px solid rgba(255,255,255,0.05)' }}>
                 בוצע התיקון בטפסנות בהתאם להערה המסומנת באדום על התמונה. מבקש להריץ בדיקת מפקח לאישור יציקה מחר.
              </div>
              <div style={{ background: 'rgba(22, 163, 74, 0.1)', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: 'var(--success)', marginTop: 12, display: 'inline-block', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
                ✓ בוצעה בדיקה. סטטוס עודכן ל"אושר".
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 4. FEATURE DEEP DIVE: BUDGET & BOQ (Reversed) */}
      <section className="section-padding" style={{ background: '#111115' }}>
        <div className="content-width split-layout reversed">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="split-text">
            <span className="feature-badge" style={{color: 'var(--warning)'}}>שליטה פיננסית עליונה</span>
            <h2 className="feature-title">סוף לחריגות התקציב ולאקסלים הישנים.</h2>
            <p className="feature-desc">
              המערכת מספקת לך מעטפת מלאה לבקרה על הכסף, תוך שימוש באשף כתבי כמויות (BOQ) שמונע רכש מיותר ואובדן שליטה.
            </p>
            <ul className="bullet-list">
              <li className="bullet-item"><Icon n="clipboard" s={28} c="var(--warning)" style={{marginTop:4}} /> <div><strong>אשף כתבי כמויות (BOQ):</strong> בניית מפרטי רכש רוחביים לפי כל חדר בבית (אינסטלציה, ריצוף, חשמל). המערכת מסכמת אוטומטית שטח כולל ועלויות צפויות.</div></li>
              <li className="bullet-item"><Icon n="chart" s={28} c="var(--warning)" style={{marginTop:4}} /> <div><strong>מנגנון תשלום לקבלנים:</strong> אל תשלם מקדמות אקסטרה. BuildSync בונה אוטומטית לוחות סילוקין לתשלום לפי "אבני דרך" (לדוג: 20% בגמר שלד חוץ). התשלום נפתח רק כשהמפקח סימן שהשלב הסתיים.</div></li>
              <li className="bullet-item"><Icon n="calendar" s={28} c="var(--warning)" style={{marginTop:4}} /> <div><strong>מעקב תקציב דינמי:</strong> בכל רגע נתון תוכל לראות כמה הוצאת, כמה מהתקציב כבר 'משוריין' לקבלנים קיימים, והיכן יש לך עודפים פיננסיים.</div></li>
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="split-media relative">
            <div className="mockup-container">
              <img src="/blueprints.png" className="mockup-img" alt="Budget and BOQ Features" />
            </div>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }} className="floating-card" style={{ top: -30, right: -20, minWidth: 320 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                 <span style={{ color: '#aaa', fontSize: 14 }}> תקציב כולל שנוצל</span>
                 <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.2rem' }}>₪ 840,000</span>
              </div>
              <div style={{ width: '100%', height: 10, background: 'rgba(0,0,0,0.5)', borderRadius: 5, overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)' }}>
                 <motion.div initial={{ width: 0 }} whileInView={{ width: '45%' }} transition={{ duration: 1.5, delay: 0.5 }} viewport={{ once: true }} style={{ height: '100%', background: 'var(--accent)' }}></motion.div>
                 <motion.div initial={{ width: 0 }} whileInView={{ width: '20%' }} transition={{ duration: 1.5, delay: 2 }} viewport={{ once: true }} style={{ height: '100%', background: '#FDE68A' }}></motion.div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, color: '#aaa' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{width: 10, height: 10, borderRadius: 3, background: 'var(--accent)'}}></span> הוצא 45%</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{width: 10, height: 10, borderRadius: 3, background: '#FDE68A'}}></span> מחויב 20%</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 5. FEATURE DEEP DIVE: MANAGING STAGES & CONTRACTORS */}
      <section className="section-padding" style={{ background: '#0a0a0c' }}>
        <div className="content-width split-layout">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="split-text">
            <span className="feature-badge" style={{color: 'var(--success)'}}>ניהול ביצוע ושקיפות יומית</span>
            <h2 className="feature-title">מעקב זעיר אחר כל קבלן ובכל חדר.</h2>
            <p className="feature-desc">
              הציר המרכזי של BuildSync הוא היכולת לפרק בית שלם או פרויקט שיפוץ למאות משימות קטנות, לשייך אותן לקבלנים ולעקוב אחריהן בזמן אמת ללא צורך להיות 24/7 באתר.
            </p>
            <ul className="bullet-list">
              <li className="bullet-item"><Icon n="layers" s={28} c="var(--success)" style={{marginTop:4}} /> <div><strong>מעקב התקדמות שלבי:</strong> 14 שלבי הבנייה המרכזיים פרוסים בצורה חזותית. ניתן להרחיב כל שלב ולסמן V על תת-משימות שיקפיצו את מד ההתקדמות הכללי.</div></li>
              <li className="bullet-item"><Icon n="users" s={28} c="var(--success)" style={{marginTop:4}} /> <div><strong>כרטסת קבלנים חכמה:</strong> מחיפויי גבס ועד חשמלאי ראשי – לכל קבלן כרטיס אישי עם היסטוריית תשלומים, ציון איכות עבודה, וריכוז הסכמים. תמיכה מובנית ב'קבלן עד מפתח' (Turnkey).</div></li>
              <li className="bullet-item"><Icon n="check" s={28} c="var(--success)" style={{marginTop:4}} /> <div><strong>התראות מפעילות בשטח:</strong> המערכת קוראת את פעילות הצוות ומתריעה בזמן אמת אם "טיח חוץ לא הושלם ומסתמן סיכון לחורף" או שקבלן ריצוף טרם הוחתם על חוזה.</div></li>
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="split-media">
             {/* INTERACTIVE STAGES UI */}
             <div style={{ background: 'rgba(19, 19, 24, 0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
               <h3 style={{ fontSize: '1.2rem', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span>התקדמות פרויקט - שלבי ביצוע</span>
                 <span style={{ fontSize: '0.85rem', color: 'var(--accent)', background: 'rgba(224,122,56,0.1)', padding: '4px 10px', borderRadius: 12 }}>אינטראקטיבי! נסה ללחוץ</span>
               </h3>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                 {/* Stage 1: Done */}
                 <div style={{ opacity: 0.7 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                     <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><strong style={{color: '#fff'}}>1. יסודות ושלד תחתון</strong> <span style={{ background: 'rgba(52, 199, 89, 0.2)', color: '#34C759', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>הושלם</span></div>
                     <span style={{ color: '#34C759', fontWeight: 'bold' }}>100%</span>
                   </div>
                   <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: '100%', height: '100%', background: '#34C759', borderRadius: 3 }}></div></div>
                 </div>
                 
                 {/* Stage 2: Active */}
                 <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                     <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><strong style={{color: '#fff'}}>2. מעטפת וטיח פנים</strong> <span style={{ background: 'rgba(224, 122, 56, 0.2)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>בביצוע</span></div>
                     <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.3 }} key={progressPercent} style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{progressPercent}%</motion.span>
                   </div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }}>
                      <motion.div animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent) 0%, #FDE68A 100%)', borderRadius: 3, boxShadow: '0 0 10px rgba(224,122,56,0.5)' }}></motion.div>
                    </div>
                   
                   {/* Subtasks rendering */}
                   <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                     {tasks.map((task) => (
                       <div key={task.id} onClick={() => toggleTask(task.id)} className="interactive-task" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: task.done ? '#aaa' : '#fff', textDecoration: task.done ? 'line-through' : 'none' }}>
                         <span style={{ width: 18, height: 18, background: task.done ? '#34C759' : 'rgba(0,0,0,0.3)', border: task.done ? 'none' : '1px solid rgba(255,255,255,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                           {task.done && <Icon n="check" s={12} c="#fff" />}
                         </span> 
                         {task.text}
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* Stage 3: Pending */}
                 <div style={{ opacity: 0.5 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                     <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><strong style={{color: '#888'}}>3. אינסטלציה - כלים סניטריים</strong> <span style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#888', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>ממתין</span></div>
                     <span style={{ color: '#888', fontWeight: 'bold' }}>0%</span>
                   </div>
                   <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 3, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}></div>
                 </div>
               </div>
             </div>
          </motion.div>
        </div>
      </section>

      {/* 6. AT-A-GLANCE GRID */}
      <section className="section-padding" style={{ background: '#111115', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
        <div className="content-width">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} style={{ textAlign: 'center', marginBottom: 80 }}>
            <h2 className="gradient-text" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: 20 }}>מערכת כל-כך חכמה שהיא חוסכת עובד.</h2>
            <p style={{ color: '#a0a0a0', fontSize: '1.25rem', maxWidth: 800, margin: '0 auto' }}>כל מה שחברת פיקוח מודרנית וקבלן מקצועי צריכים כדי לסיים פרויקט בזמן, מתחת לתקציב ובאיכות חסרת פשרות.</p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="card-grid">
            {[
              { icon: 'home', title: 'דשבורד התראות רוחבי', desc: 'מסך פתיחה המסכם את כלל הפעילות היומית בשטח, מהסטטוס הפיננסי הכולל, עד לאילו קבלנים יעבדו היום.' },
              { icon: 'settings', title: 'הקמת תבניות בית', desc: 'הגדר בלחיצת כפתור את חלוקת החדרים בנכס כדי להכין אותו לממשק הכמויות והצילום.' },
              { icon: 'calendar', title: 'ממשק חזותי קל ללמידה', desc: 'המערכת פותחה כך שגם קבלנים בשטח וגם יזמים במשרד יעבדו איתה בהרמוניה ובמהירות.' }
            ].map((f, i) => (
              <motion.div variants={fadeIn} key={i} className="info-card">
                <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, rgba(224,122,56,0.2) 0%, rgba(224,122,56,0.05) 100%)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, border: '1px solid rgba(224,122,56,0.1)' }}>
                  <Icon n={f.icon} s={32} c="var(--accent)" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16, color: '#fff' }}>{f.title}</h3>
                <p style={{ color: '#888', lineHeight: 1.6, fontSize: '1.1rem' }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 7. FINAL CALL TO ACTION (FULL WIDTH) */}
      <section style={{ padding: '140px 5%', background: 'linear-gradient(135deg, var(--accent) 0%, #92400E 100%)', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle decorative circles */}
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 40, ease: "linear" }} style={{ position: 'absolute', top: -150, right: -150, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', zIndex: 0 }} />
        <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 50, ease: "linear" }} style={{ position: 'absolute', bottom: -200, left: -100, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,0,0,0.15) 0%, transparent 70%)', zIndex: 0 }} />
        
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', fontWeight: 900, marginBottom: 30, textShadow: '0 10px 30px rgba(0,0,0,0.2)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            תתקדם לניהול של העתיד.
          </h2>
          <p style={{ fontSize: 'clamp(1.3rem, 2vw, 1.6rem)', margin: '0 auto 50px', opacity: 0.95, lineHeight: 1.6 }}>
            הצטרף לעשרות המפקחים והחברות שכבר מנהלים את אתרי העבודה שלהם עם BuildSync. שלט על כל האספקטים הפיננסיים, התפעוליים והתקשורתיים מבוססי מובייל ודסקטופ בסביבה אחת מאובטחת וחכמה.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            <Link to="/register" className="cta-btn" style={{ background: '#fff', color: 'var(--accent)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: 'none' }}>
              פתח חשבון ונסה חינם
            </Link>
          </div>
        </motion.div>
      </section>
      
      <footer style={{ padding: '60px 5%', textAlign: 'center', color: '#666', background: '#08080a', fontSize: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        © {new Date().getFullYear()} BuildSync. פותח במטרה לייעל את הבנייה בעולם היזמות, הקבלנות והשיפוצים. כל הזכויות שמורות.
      </footer>
    </div>
  )
}
