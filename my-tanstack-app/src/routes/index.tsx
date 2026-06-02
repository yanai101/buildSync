import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon } from '~/components/Shared'
import { motion, useScroll, useTransform } from 'framer-motion'

export const Route = createFileRoute('/')({
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
  const [logSigned, setLogSigned] = useState(false);
  const [isOwnerView, setIsOwnerView] = useState(true);

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
          <div className="sidebar-logo" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/logo.png" 
              alt="BuildSync Icon" 
              style={{ 
                width: 40, 
                height: 40, 
                display: 'block', 
                borderRadius: '10px',
                objectFit: 'cover'
              }} 
            />
            <div className="sidebar-logo-text" style={{ fontSize: 28, color: '#fff', margin: 0 }}>Build<span style={{color: 'var(--accent)'}}>Sync</span></div>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link
              to="/login"
              style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '8px 20px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.06)',
                textDecoration: 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
            >
              נסה עכשיו
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
            <Link to="/login" className="cta-btn">הקם פרויקט</Link>
          </motion.div>
        </motion.div>
      </section>

      {/* 1.5 LIVE ALERTS MARQUEE */}
      <div style={{ background: '#0a0a0c', overflow: 'hidden', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', position: 'relative' }}>
         <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 100, background: 'linear-gradient(to right, transparent, #0a0a0c)', zIndex: 2 }} />
         <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 100, background: 'linear-gradient(to left, transparent, #0a0a0c)', zIndex: 2 }} />
        <motion.div 
          animate={{ x: [0, -1500] }} 
          transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
          style={{ display: 'flex', whiteSpace: 'nowrap', gap: 40, fontWeight: 600, fontSize: 14 }}
        >
          {Array(4).fill([
            { text: "חריגה צפויה של 2% בתקציב אינסטלציה", icon: "alert", color: "var(--warning)" },
            { text: "המפקח אישר את שלב יציקת הרצפה", icon: "check-circle", color: "var(--success)" },
            { text: "יומן עבודה יומי אושר וננעל לשינויים", icon: "file-text", color: "#3B82F6" },
            { text: "התקבלה תמונה חדשה עם הערת ביצוע", icon: "camera", color: "var(--accent)" }
          ]).flat().map((item: any, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
              <Icon n={item.icon} s={16} c={item.color} />
              {item.text}
            </span>
          ))}
        </motion.div>
      </div>

      {/* 2. CORE TRIAD (Quick Highlights) */}
      <section className="section-padding" style={{ background: 'linear-gradient(180deg, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.5) 50%, rgba(10,10,12,0.95) 100%), url(/images/bg_core_triad.png) center/cover no-repeat', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingTop: 60 }}>
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
      <section className="section-padding" style={{ background: 'linear-gradient(180deg, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.6) 50%, rgba(10,10,12,0.95) 100%), url(/images/bg_communication.png) center/cover no-repeat', backgroundAttachment: 'fixed' }}>
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
              המערכת מספקת לך מעטפת מלאה לבקרה על הכסף, תוך שימוש באשף כמויות שמונע רכש מיותר ואובדן שליטה.
            </p>
            <ul className="bullet-list">
              <li className="bullet-item"><Icon n="clipboard" s={28} c="var(--warning)" style={{marginTop:4}} /> <div><strong>אשף כמויות:</strong> בניית מפרטי רכש רוחביים לפי כל חדר בבית (אינסטלציה, ריצוף, חשמל). המערכת מסכמת אוטומטית שטח כולל ועלויות צפויות.</div></li>
              <li className="bullet-item"><Icon n="search" s={28} c="var(--warning)" style={{marginTop:4}} /> <div><strong>מעקב הזמנות חכם:</strong> שליטה מלאה באספקת חומרים לאתר - הזמנות חסרות, קבלות חלקיות ותעודות משלוח מצורפות הכל במקום אחד.</div></li>
              <li className="bullet-item"><Icon n="chart" s={28} c="var(--warning)" style={{marginTop:4}} /> <div><strong>מנגנון תשלום לקבלנים:</strong> אל תשלם מקדמות אקסטרה. BuildSync בונה אוטומטית לוחות סילוקין לתשלום לפי "אבני דרך" (לדוג: 20% בגמר שלד חוץ). התשלום נפתח רק כשהמפקח סימן שהשלב הסתיים.</div></li>
              <li className="bullet-item"><Icon n="calendar" s={28} c="var(--warning)" style={{marginTop:4}} /> <div><strong>מעקב תקציב דינמי:</strong> בכל רגע נתון תוכל לראות כמה הוצאת, כמה מהתקציב כבר 'משוריין' לקבלנים קיימים, והיכן יש לך עודפים פיננסיים.</div></li>
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="split-media relative">
            <div className="mockup-container">
              <img src="/images/budget_dashboard.png" className="mockup-img" alt="Budget and BOQ Features" style={{ objectFit: 'cover' }} />
            </div>
            <motion.div className="floating-card" style={{ top: -30, right: -20, minWidth: 340, padding: 0, overflow: 'hidden' }}>
               <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: 12, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>שקיפות סלקטיבית</span>
                 <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 4, cursor: 'pointer' }} onClick={() => setIsOwnerView(!isOwnerView)}>
                   <div style={{ padding: '4px 12px', fontSize: 12, borderRadius: 16, background: isOwnerView ? 'var(--accent)' : 'transparent', color: isOwnerView ? '#fff' : '#888', fontWeight: isOwnerView ? 'bold' : 'normal', transition: 'all 0.2s' }}>יזם/מפקח</div>
                   <div style={{ padding: '4px 12px', fontSize: 12, borderRadius: 16, background: !isOwnerView ? '#333' : 'transparent', color: !isOwnerView ? '#fff' : '#888', fontWeight: !isOwnerView ? 'bold' : 'normal', transition: 'all 0.2s' }}>קבלן שטח</div>
                 </div>
               </div>
               
               <div style={{ padding: 24 }}>
                 {isOwnerView ? (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <span style={{ color: '#aaa', fontSize: 14 }}> תקציב כולל שנוצל</span>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.2rem' }}>₪ 840,000</span>
                     </div>
                     <div style={{ width: '100%', height: 10, background: 'rgba(0,0,0,0.5)', borderRadius: 5, overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} style={{ height: '100%', background: 'var(--accent)' }}></motion.div>
                        <motion.div initial={{ width: 0 }} animate={{ width: '20%' }} style={{ height: '100%', background: '#FDE68A' }}></motion.div>
                     </div>
                     <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, color: '#aaa' }}>
                       <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{width: 10, height: 10, borderRadius: 3, background: 'var(--accent)'}}></span> שולם: ₪378K</span>
                       <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{width: 10, height: 10, borderRadius: 3, background: 'var(--warning)'}}></span> חריגה: ₪12K</span>
                     </div>
                   </motion.div>
                 ) : (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center' }}>
                     <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                       <Icon n="lock" s={24} c="#888" />
                     </div>
                     <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 8 }}>הנתונים הפיננסיים מוסתרים</div>
                     <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>
                       הקבלן לא נחשף לתקציב, עלויות או קבלנים אחרים, אלא רק למשימות הביצוע שלו.
                     </div>
                   </motion.div>
                 )}
               </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 5. FEATURE DEEP DIVE: MANAGING STAGES & CONTRACTORS */}
      <section className="section-padding" style={{ background: 'linear-gradient(180deg, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.5) 50%, rgba(10,10,12,0.95) 100%), url(/images/bg_stages.png) center/cover no-repeat' }}>
        <div className="content-width split-layout">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="split-text">
            <span className="feature-badge" style={{color: 'var(--success)'}}>ניהול ביצוע ושקיפות יומית</span>
            <h2 className="feature-title">מעקב מדויק אחר התקדמות המשימות של כל קבלן.</h2>
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

      {/* 5.5 FEATURE DEEP DIVE: LEGAL DAILY LOGS */}
      <section className="section-padding" style={{ background: '#111115', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
        <div className="content-width split-layout reversed">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="split-text">
            <span className="feature-badge" style={{color: '#3B82F6'}}>תיעוד אמין ומוגן משינויים</span>
            <h2 className="feature-title">יומן עבודה יומי שמגן עליכם.</h2>
            <p className="feature-desc">
              אל תשאירו מקום לספקות או ויכוחים. המערכת מאפשרת הפקת דוח PDF מקיף ונעול לשינויים, עם תמונות, מזג אוויר ונוכחות פועלים שמונע סכסוכי קבלנים.
            </p>
            <ul className="bullet-list">
              <li className="bullet-item"><Icon n="file-text" s={28} c="#3B82F6" style={{marginTop:4}} /> <div><strong>ריכוז נתונים:</strong> מזג אוויר, נוכחות קבלנים, אישורי מפקח ותמונות מאוגדים לקובץ מסודר.</div></li>
              <li className="bullet-item"><Icon n="lock" s={28} c="#3B82F6" style={{marginTop:4}} /> <div><strong>נעילת יומן ל-PDF:</strong> בלחיצת כפתור היומן ננעל ומופק למסמך אמין שאינו ניתן לעריכה בדיעבד.</div></li>
            </ul>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="split-media" style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 12, padding: 32, color: '#000', position: 'relative', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => setLogSigned(true)} className="info-card">
              <div style={{ borderBottom: '2px solid #eee', paddingBottom: 16, marginBottom: 24, textAlign: 'center' }}>
                <h3 style={{ fontSize: 24, fontWeight: 900, color: '#111' }}>יומן עבודה יומי</h3>
                <div style={{ color: '#666', fontSize: 14 }}>12 באפריל, 2026 • אתר "וילה כהן"</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40, color: '#333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                  <span style={{ color: '#666' }}>מזג אוויר</span>
                  <strong>24°C, שמש מלאה</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                  <span style={{ color: '#666' }}>כוח אדם</span>
                  <strong>4 פועלי שלד, 2 רצפים</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                  <span style={{ color: '#666' }}>אישורי בטיחות</span>
                  <strong style={{ color: '#16A34A' }}>תקין. ציוד אושר.</strong>
                </div>
              </div>

              {!logSigned ? (
                <div style={{ background: '#3B82F6', color: '#fff', textAlign: 'center', padding: 16, borderRadius: 8, fontWeight: 'bold', boxShadow: '0 10px 20px rgba(59,130,246,0.3)', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  <Icon n="lock" s={18} />
                  לחץ כדי לאשר ולנעול
                </div>
              ) : (
                <div style={{ background: '#f3f4f6', color: '#aaa', textAlign: 'center', padding: 16, borderRadius: 8, fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  <Icon n="lock" s={18} />
                  ננעל
                </div>
              )}

              {logSigned && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', border: '6px solid #DC2626', color: '#DC2626', padding: '10px 20px', borderRadius: 8, fontSize: 32, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, pointerEvents: 'none', background: 'rgba(255,255,255,0.9)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                  אושר וננעל
                </motion.div>
              )}

              {/* Added PDF Export indication */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon n="download" s={14} /> גיבוי ל-PDF הושלם
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5.8 FEATURE DEEP DIVE: BUREAUCRACY & PERMITS */}
      <section className="section-padding" style={{ background: 'linear-gradient(180deg, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.5) 50%, rgba(10,10,12,0.95) 100%), url(/images/bg_bureaucracy.png) center/cover no-repeat', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
        <div className="content-width split-layout">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="split-text">
            <span className="feature-badge" style={{color: '#EAB308'}}>סדר בניירת וברישוי</span>
            <h2 className="feature-title">המקום היחיד שמרכז את כל ההיתרים.</h2>
            <p className="feature-desc">
              שכחו מקלסרים אבודים ותיקיות מסורבלות במחשב. כל האישורים, התוכניות האדריכליות, היתרי הבנייה ותעודות האחריות נמצאים במקום אחד, מאובטח וזמין מכל מכשיר.
            </p>
            <ul className="bullet-list">
              <li className="bullet-item"><Icon n="folder" s={28} c="#EAB308" style={{marginTop:4}} /> <div><strong>תיק פרויקט חכם:</strong> כל המסמכים מאורגנים לפי קטגוריות - מהיתרי בנייה ועד קבלות ותעודות ביטוח של קבלנים.</div></li>
              <li className="bullet-item"><Icon n="clock" s={28} c="#EAB308" style={{marginTop:4}} /> <div><strong>מעקב פגות תוקף:</strong> המערכת מסמנת מסמכים זמניים או היתרים שפג תוקפם, כך שלעולם לא תיתקעו בשטח בגלל ביורוקרטיה.</div></li>
              <li className="bullet-item"><Icon n="link" s={28} c="#EAB308" style={{marginTop:4}} /> <div><strong>שליפה מהירה:</strong> בלחיצת כפתור תוכלו לשלוף כל היתר או מסמך למפקחים, עורכי דין או רשויות מקומיות ישירות מהשטח.</div></li>
            </ul>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="split-media relative">
            <div className="mockup-container" style={{ background: '#111115', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon n="folder" s={24} c="#EAB308" />
                  <span style={{ fontSize: 18, fontWeight: 'bold' }}>רישוי והיתרים</span>
                </div>
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#EAB308', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 'bold' }}>
                  מסמכים מאומתים
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { name: "היתר בנייה ראשי", status: "בתוקף", color: "var(--success)" },
                  { name: "אישור מהנדס - שלד", status: "ממתין", color: "var(--warning)" },
                  { name: "ביטוח קבלנים", status: "בתוקף עד 2027", color: "var(--success)" },
                  { name: "אישור חברת חשמל", status: "חסר", color: "#EF4444" }
                ].map((doc, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8 }}>
                        <Icon n="file-text" s={20} c="#ccc" />
                      </div>
                      <span style={{ fontWeight: 600 }}>{doc.name}</span>
                    </div>
                    <span style={{ color: doc.color, fontSize: 13, fontWeight: 600, background: `rgba(255,255,255,0.05)`, padding: '4px 10px', borderRadius: 20 }}>{doc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5.9 FEATURE DEEP DIVE: LOGISTICS & ORDERS */}
      <section className="section-padding" style={{ background: 'linear-gradient(180deg, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.6) 50%, rgba(10,10,12,0.95) 100%), url(/images/bg_orders.png) center/cover no-repeat', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
        <div className="content-width split-layout reversed">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="split-text">
            <span className="feature-badge" style={{color: '#10B981'}}>לוגיסטיקה ורכש באתר</span>
            <h2 className="feature-title">מעקב הזמנות מקצה לקצה.</h2>
            <p className="feature-desc">
              שליטה ובקרה בשטח על כל סחורה שמגיעה. המערכת מוודאת שמה שהוזמן זה מה שהגיע, ושום ציוד או חומר לא "נופל בין הכיסאות" באתר הבנייה.
            </p>
            <ul className="bullet-list">
              <li className="bullet-item"><Icon n="check-circle" s={28} c="#10B981" style={{marginTop:4}} /> <div><strong>בקרת קבלת סחורה בשטח:</strong> מאפשר למפקח לאמת, לבדוק ולאשר סחורות שמגיעות לאתר בזמן אמת, כולל העלאה ואחסון של שטרי מטען מצולמים ותעודות משלוח.</div></li>
              <li className="bullet-item"><Icon n="package" s={28} c="#10B981" style={{marginTop:4}} /> <div><strong>ניהול חוסרים ואספקות חלקיות:</strong> הגיע רק חצי מהריצוף? סמנו כמות חלקית שהתקבלה, והמערכת תזכור בדיוק איזה ציוד חסר להשלמת ההזמנה.</div></li>
            </ul>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="split-media" style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: 400, background: 'rgba(20, 20, 25, 0.9)', backdropFilter: 'blur(20px)', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon n="truck" s={24} c="#10B981" />
                  <span style={{ fontSize: 18, fontWeight: 'bold' }}>משלוחים קרובים</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { name: "ברזל בניין 12 מ''מ", supplier: "פקר פלדה", status: "התקבל חלקי", icon: "box", color: "var(--warning)" },
                  { name: "ריצוף גרניט פורצלן", supplier: "נגב קרמיקה", status: "בדרך", icon: "truck", color: "#3B82F6" },
                  { name: "מלט לבן ושחור", supplier: "נשר", status: "התקבל במלואו", icon: "check-circle", color: "var(--success)" }
                ].map((order, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(255,255,255,0.05)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon n={order.icon} s={20} c={order.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{order.name}</div>
                      <div style={{ fontSize: 13, color: '#888' }}>{order.supplier}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6. THE "WHY BUILDSYNC" / VALUE PROP SECTION */}
      {/* 6.1 HERO HOOK */}
      <section className="section-padding" style={{ background: 'linear-gradient(180deg, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.8) 100%), url(/images/bg_hero_chaos.png) center/cover no-repeat', borderTop: '1px solid rgba(255,255,255,0.02)', paddingBottom: 80 }}>
        <div className="content-width">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} style={{ textAlign: 'center', maxWidth: 900, margin: '0 auto', marginBottom: 80 }}>
            <h2 className="gradient-text" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 900, marginBottom: 24, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              השקעה של מיליונים<br/>לא משאירים למזל.
            </h2>
            <p style={{ color: '#a0a0a0', fontSize: '1.4rem', maxWidth: 700, margin: '0 auto', lineHeight: 1.6 }}>
              BuildSync מחברת בין המפקח בשטח לבין בעלי הבית —<br/>עם תיעוד, תקציב, יומני עבודה ותמונות בזמן אמת.
            </p>
           </motion.div>

           {/* 6.2 BEFORE / AFTER */}
           <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 40 }}>
             {/* BEFORE */}
             <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} style={{ background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, rgba(20,20,25,0.85) 100%)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 24, padding: 40, position: 'relative', overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                 <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Icon n="x" s={28} c="#EF4444" />
                 </div>
                 <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#EF4444', margin: 0 }}>לפני BuildSync</h3>
               </div>
               
               <ul className="bullet-list" style={{ gap: 24 }}>
                 <li className="bullet-item"><Icon n="message-circle" s={24} c="#EF4444" style={{marginTop:2, opacity: 0.7}} /> <div style={{ color: '#ccc', fontSize: '1.2rem' }}>תמונות והחלטות מפוזרות בוואטסאפ</div></li>
                 <li className="bullet-item"><Icon n="message" s={24} c="#EF4444" style={{marginTop:2, opacity: 0.7}} /> <div style={{ color: '#ccc', fontSize: '1.2rem' }}>"מה הסטטוס של החשמל?"</div></li>
                 <li className="bullet-item"><Icon n="phone" s={24} c="#EF4444" style={{marginTop:2, opacity: 0.7}} /> <div style={{ color: '#ccc', fontSize: '1.2rem' }}>קבלנים מתקשרים כל היום בשאלות</div></li>
                 <li className="bullet-item"><Icon n="alert" s={24} c="#EF4444" style={{marginTop:2, opacity: 0.7}} /> <div style={{ color: '#ccc', fontSize: '1.2rem' }}>אין מעקב מסודר על חריגות תשלומים</div></li>
                 <li className="bullet-item"><Icon n="users" s={24} c="#EF4444" style={{marginTop:2, opacity: 0.7}} /> <div style={{ color: '#ccc', fontSize: '1.2rem' }}>ויכוחים אינסופיים של "לא אמרת לי"</div></li>
               </ul>
             </motion.div>

             {/* AFTER */}
             <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }} style={{ background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(20,20,25,0.85) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 24, padding: 40, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(16, 185, 129, 0.05)', backdropFilter: 'blur(10px)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                 <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Icon n="check" s={28} c="#10B981" />
                 </div>
                 <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981', margin: 0 }}>אחרי BuildSync</h3>
               </div>

               <ul className="bullet-list" style={{ gap: 24 }}>
                 <li className="bullet-item"><Icon n="check-circle" s={24} c="#10B981" style={{marginTop:2}} /> <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 500 }}>כל שלב מתועד, מצולם ומאושר</div></li>
                 <li className="bullet-item"><Icon n="pie-chart" s={24} c="#10B981" style={{marginTop:2}} /> <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 500 }}>תקציב, חריגות ותשלומים במקום אחד</div></li>
                 <li className="bullet-item"><Icon n="file-text" s={24} c="#10B981" style={{marginTop:2}} /> <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 500 }}>יומן עבודה יומי חתום ומגובה</div></li>
                 <li className="bullet-item"><Icon n="eye" s={24} c="#10B981" style={{marginTop:2}} /> <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 500 }}>הלקוח רואה הכל בזמן אמת באפליקציה</div></li>
                 <li className="bullet-item"><Icon n="lock" s={24} c="#10B981" style={{marginTop:2}} /> <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 500 }}>שקט נפשי - הכל שמור, מסודר ומוגן</div></li>
               </ul>
             </motion.div>
           </div>
        </div>
      </section>

      {/* 6.3 ROI SECTION */}
      <section className="section-padding" style={{ background: 'linear-gradient(180deg, rgba(17,17,21,0.95) 0%, rgba(10,10,12,0.85) 100%), url(/images/bg_roi_section.png) center/cover no-repeat', backgroundAttachment: 'fixed', borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
        <div className="content-width">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer} className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
             <motion.div variants={fadeIn} className="info-card" style={{ padding: 32, background: 'rgba(20,20,25,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                 <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Icon n="clock" s={28} c="#EF4444" />
                 </div>
                 <h4 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>עיכוב של שבוע בבנייה</h4>
               </div>
               <p style={{ color: '#aaa', fontSize: '1.1rem', lineHeight: 1.6, margin: 0 }}>
                 שכירות כפולה, משכנתא דוחפת וקבלנים שעומדים. <strong style={{color:'#fff'}}>שבוע בודד של עיכוב עולה הרבה יותר משנה שלמה של שימוש במערכת.</strong>
               </p>
             </motion.div>

             <motion.div variants={fadeIn} className="info-card" style={{ padding: 32, background: 'rgba(20,20,25,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                 <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Icon n="alert" s={28} c="#F59E0B" />
                 </div>
                 <h4 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>טעות באיטום או צנרת</h4>
               </div>
               <p style={{ color: '#aaa', fontSize: '1.1rem', lineHeight: 1.6, margin: 0 }}>
                 פיקוח ללא תיעוד ותמונות מהשטח מוביל לנזקים. <strong style={{color:'#fff'}}>תיקון אחד אחרי ריצוף יעלה לכם עשרות אלפי שקלים מיותרים.</strong>
               </p>
             </motion.div>

             <motion.div variants={fadeIn} className="info-card" style={{ padding: 32, background: 'rgba(20,20,25,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                 <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Icon n="file-text" s={28} c="#10B981" />
                 </div>
                 <h4 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>תיעוד מונע כפילויות</h4>
               </div>
               <p style={{ color: '#aaa', fontSize: '1.1rem', lineHeight: 1.6, margin: 0 }}>
                 כשהכל מתועד באפליקציה אין ויכוחים של "לא שילמת לי" או "לא סוכם על התוספת הזו". <strong style={{color:'#fff'}}>מונע מריבות ותשלומי כפל.</strong>
               </p>
             </motion.div>
           </motion.div>
        </div>
      </section>

      {/* 6.4 SPLIT VALUE PROP */}
      <section className="section-padding" style={{ background: 'linear-gradient(180deg, rgba(17,17,21,0.95) 0%, rgba(17,17,21,0.7) 100%), url(/images/bg_split_value_prop.png) center/cover no-repeat', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <div className="content-width">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 60 }}>
             
             {/* SUPERVISOR */}
             <motion.div variants={fadeIn} style={{ background: 'rgba(20,20,25,0.85)', backdropFilter: 'blur(12px)', padding: 40, borderRadius: 24, border: '1px solid rgba(224,122,56,0.15)', display: 'flex', flexDirection: 'column' }}>
               <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(224,122,56,0.1)', color: 'var(--accent)', padding: '6px 16px', borderRadius: 20, fontSize: 14, fontWeight: 'bold', marginBottom: 24, alignSelf: 'flex-start' }}>
                 <Icon n="layers" s={16} /> עבור המפקח
               </div>
               <h3 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 32, lineHeight: 1.2 }}>הופכים את השירות שלך לפרימיום.</h3>
               <ul className="bullet-list" style={{ gap: 20, marginBottom: 40, flex: 1 }}>
                 <li className="bullet-item"><Icon n="star" s={24} c="var(--accent)" style={{marginTop:2}} /> <div style={{fontSize: '1.15rem', color: '#eee'}}>אזור אישי ומרשים לכל לקוח</div></li>
                 <li className="bullet-item"><Icon n="phone" s={24} c="var(--accent)" style={{marginTop:2}} /> <div style={{fontSize: '1.15rem', color: '#eee'}}>פחות טלפונים, הודעות ועדכונים ידניים</div></li>
                 <li className="bullet-item"><Icon n="camera" s={24} c="var(--accent)" style={{marginTop:2}} /> <div style={{fontSize: '1.15rem', color: '#eee'}}>תיעוד מלא ומגובה לכל החלטה בשטח</div></li>
                 <li className="bullet-item"><Icon n="star" s={24} c="var(--accent)" style={{marginTop:2}} /> <div style={{fontSize: '1.15rem', color: '#eee'}}>כלי טכנולוגי שמבדל אותך ממפקחים אחרים</div></li>
               </ul>
               <div style={{ padding: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 12, borderLeft: '4px solid var(--accent)', color: '#aaa', fontSize: '1.1rem', fontStyle: 'italic', lineHeight: 1.6 }}>
                 "לקוחות לא מקבלים ממני רק פיקוח - הם מקבלים מערכת ניהול ובקרה מלאה שנותנת להם לישון בשקט."
               </div>
             </motion.div>

             {/* HOME OWNER */}
             <motion.div variants={fadeIn} style={{ background: 'rgba(20,20,25,0.85)', backdropFilter: 'blur(12px)', padding: 40, borderRadius: 24, border: '1px solid rgba(59,130,246,0.15)', display: 'flex', flexDirection: 'column' }}>
               <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', padding: '6px 16px', borderRadius: 20, fontSize: 14, fontWeight: 'bold', marginBottom: 24, alignSelf: 'flex-start' }}>
                 <Icon n="home" s={16} /> עבור בעלי הבית / יזמים
               </div>
               <h3 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 32, lineHeight: 1.2 }}>לדעת בדיוק מה קורה בנכס שלך.</h3>
               <ul className="bullet-list" style={{ gap: 20, marginBottom: 40, flex: 1 }}>
                 <li className="bullet-item"><Icon n="chart" s={24} c="#3B82F6" style={{marginTop:2}} /> <div style={{fontSize: '1.15rem', color: '#eee'}}>מעקב התקדמות ויזואלי בזמן אמת</div></li>
                 <li className="bullet-item"><Icon n="chart" s={24} c="#3B82F6" style={{marginTop:2}} /> <div style={{fontSize: '1.15rem', color: '#eee'}}>שקיפות מלאה על התקציב ולאן הולך הכסף</div></li>
                 <li className="bullet-item"><Icon n="clipboard" s={24} c="#3B82F6" style={{marginTop:2}} /> <div style={{fontSize: '1.15rem', color: '#eee'}}>כל התמונות, החוזים והאישורים במקום אחד</div></li>
                 <li className="bullet-item"><Icon n="check-circle" s={24} c="#3B82F6" style={{marginTop:2}} /> <div style={{fontSize: '1.15rem', color: '#eee'}}>בקרה קפדנית שמונעת הפתעות וטעויות יקרות</div></li>
               </ul>
               <div style={{ padding: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 12, borderLeft: '4px solid #3B82F6', color: '#aaa', fontSize: '1.1rem', fontStyle: 'italic', lineHeight: 1.6 }}>
                 "השקעה קטנה שמגינה על פרויקט של מיליונים. השקט הנפשי שלי שווה כל שקל."
               </div>
             </motion.div>

           </motion.div>
        </div>
      </section>

      {/* 6.5 SUBSCRIPTION TIERS HIGHLIGHT */}
      <section className="section-padding" style={{ background: '#0a0a0c' }}>
        <div className="content-width">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} style={{ textAlign: 'center', marginBottom: 60 }}>
            <span className="feature-badge" style={{color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6}}><Icon n="star" s={14} c="var(--accent)" /> חדש במערכת</span>
            <h2 className="gradient-text" style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 800, marginBottom: 20 }}>
              בחרו את המסלול שמתאים לכם
            </h2>
            <p style={{ color: '#a0a0a0', fontSize: '1.25rem', maxWidth: 800, margin: '0 auto' }}>
              שדרגו את היכולות שלכם עם מסלול ה-Pro וקבלו כלים מתקדמים לניהול פרויקטים מרובים, הפקת דוחות PDF מקצועיים ושליטה כספית מלאה.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', maxWidth: 1200, margin: '0 auto' }}>
            {/* Free Tier */}
            <motion.div variants={fadeIn} className="info-card" style={{ background: 'linear-gradient(180deg, rgba(20,20,25,0.8) 0%, rgba(20,20,25,0.4) 100%)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--text3)' }} />
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Free</h3>
              <div style={{ color: '#aaa', marginBottom: 24, fontSize: '1.1rem' }}>מעולה כדי להתחיל וללמוד את המערכת</div>
              <ul className="bullet-list" style={{ gap: 16 }}>
                <li className="bullet-item" style={{ fontSize: '1rem' }}><Icon n="check" s={20} c="var(--success)" /> <div>פרויקט אחד בלבד</div></li>
                <li className="bullet-item" style={{ fontSize: '1rem' }}><Icon n="check" s={20} c="var(--success)" /> <div>ניהול תקציב, משימות וצ'אט בסיסי</div></li>
                <li className="bullet-item" style={{ fontSize: '1rem', opacity: 0.5 }}><Icon n="x" s={20} c="#888" /> <div>ללא ניהול עלויות רכש</div></li>
                <li className="bullet-item" style={{ fontSize: '1rem', opacity: 0.5 }}><Icon n="x" s={20} c="#888" /> <div>ללא יומני עבודה (Daily Logs)</div></li>
                <li className="bullet-item" style={{ fontSize: '1rem', opacity: 0.5 }}><Icon n="x" s={20} c="#888" /> <div>ללא מעקב הזמנות מול ספקים</div></li>
              </ul>
            </motion.div>
            
            {/* Pro Tier */}
            <motion.div variants={fadeIn} className="info-card" style={{ background: 'linear-gradient(180deg, rgba(224,122,56,0.15) 0%, rgba(20,20,25,0.8) 100%)', border: '1px solid rgba(224,122,56,0.3)', position: 'relative', overflow: 'hidden', transform: 'scale(1.05)', zIndex: 2 }}>
              <div style={{ position: 'absolute', top: 16, left: -30, background: 'var(--accent)', color: '#fff', padding: '4px 40px', transform: 'rotate(-45deg)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>מומלץ</div>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Pro</h3>
              <div style={{ color: '#aaa', marginBottom: 24, fontSize: '1.1rem' }}>למפקחים, קבלנים ויזמים שמנהלים שטח</div>
              <ul className="bullet-list" style={{ gap: 16 }}>
                <li className="bullet-item" style={{ fontSize: '1rem' }}><Icon n="check" s={20} c="var(--accent)" /> <div>עד 5 פרויקטים במקביל</div></li>
                <li className="bullet-item" style={{ fontSize: '1rem' }}><Icon n="check" s={20} c="var(--accent)" /> <div>ניהול עלויות רכש אינטראקטיבי והצעות מחיר</div></li>
                <li className="bullet-item" style={{ fontSize: '1rem' }}><Icon n="check" s={20} c="var(--accent)" /> <div>מעקב קבלת סחורות ושטרי מטען מהשטח</div></li>
                <li className="bullet-item" style={{ fontSize: '1rem' }}><Icon n="check" s={20} c="var(--accent)" /> <div>הפקת יומני עבודה ל-PDF</div></li>
              </ul>
              <div style={{ marginTop: 32 }}>
                <Link to="/login" className="cta-btn" style={{ width: '100%', textAlign: 'center', display: 'block', padding: '16px', fontSize: '1.1rem' }}>
                  הירשם עכשיו
                </Link>
              </div>
            </motion.div>

            {/* Premium Tier */}
            <motion.div variants={fadeIn} className="info-card" style={{ background: 'linear-gradient(180deg, rgba(59,130,246,0.1) 0%, rgba(20,20,25,0.8) 100%)', border: '1px solid rgba(59,130,246,0.2)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 16, left: -30, background: '#3B82F6', color: '#fff', padding: '4px 40px', transform: 'rotate(-45deg)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>בקרוב</div>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#3B82F6' }} />
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Premium</h3>
              <div style={{ color: '#aaa', marginBottom: 24, fontSize: '1.1rem' }}>למפקחים וקבלנים שרוצים לנהל חכם עם AI</div>
              <ul className="bullet-list" style={{ gap: 16 }}>
                <li className="bullet-item" style={{ fontSize: '1rem' }}><Icon n="check" s={20} c="#3B82F6" /> <div>כל היכולות של מסלול ה-Pro</div></li>
                <li className="bullet-item" style={{ fontSize: '1rem' }}><Icon n="cpu" s={20} c="#3B82F6" /> <div>עוזר AI אישי שמסכם יומנים ופגישות</div></li>
                <li className="bullet-item" style={{ fontSize: '1rem' }}><Icon n="cpu" s={20} c="#3B82F6" /> <div>תובנות אוטומטיות והמלצות לחיסכון</div></li>
                <li className="bullet-item" style={{ fontSize: '1rem' }}><Icon n="check" s={20} c="#3B82F6" /> <div>מספר פרויקטים ומשתמשים ללא הגבלה</div></li>
              </ul>
              <div style={{ marginTop: 32 }}>
                <Link to="/login" className="cta-secondary" style={{ width: '100%', textAlign: 'center', display: 'block', padding: '16px', background: '#3B82F6', color: '#fff', border: 'none', fontSize: '1.1rem' }}>
                  הירשם עכשיו
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 7. FINAL CALL TO ACTION (FULL WIDTH) */}
      <section style={{ padding: '140px 5%', background: 'linear-gradient(135deg, rgba(224,122,56,0.85) 0%, rgba(146,64,14,0.95) 100%), url(/images/house_cta_bg.png) center/cover no-repeat', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle decorative circles */}
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 40, ease: "linear" }} style={{ position: 'absolute', top: -150, right: -150, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', zIndex: 0 }} />
        <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 50, ease: "linear" }} style={{ position: 'absolute', bottom: -200, left: -100, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,0,0,0.15) 0%, transparent 70%)', zIndex: 0 }} />
        
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', marginBottom: '24px', fontSize: '0.875rem', fontWeight: 'bold', color: '#fff', background: 'rgba(255,255,255,0.15)', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            ההרשמה פתוחה
          </div>
          <h2 style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', fontWeight: 900, marginBottom: 30, textShadow: '0 10px 30px rgba(0,0,0,0.5)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            מוכנים לעבוד חכם יותר?
          </h2>
          <p style={{ fontSize: 'clamp(1.3rem, 2vw, 1.6rem)', margin: '0 auto 50px', opacity: 0.95, lineHeight: 1.6, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            המערכת שתחסוך לכם זמן וכסף בכל פרויקט כבר זמינה עבורכם. אל תישארו מאחור – הירשמו עכשיו והתחילו לנהל את הבנייה שלכם בצורה מקצועית.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            <Link 
              to="/login"
              className="cta-btn hover-scale" 
              style={{ background: '#fff', color: 'var(--accent)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
            >
              התחל לעבוד חכם עכשיו
              <svg style={{ width: 20, height: 20, transform: 'rotate(180deg)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
          <p style={{ marginTop: '24px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
            * הצטרפו למאות מנהלים, קבלנים ויזמים שכבר משדרגים את הבנייה שלהם.
          </p>
        </motion.div>
      </section>
      <footer style={{ padding: '60px 5%', textAlign: 'center', color: '#666', background: '#08080a', fontSize: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        © {new Date().getFullYear()} BuildSync. פותח במטרה לייעל את הבנייה בעולם היזמות, הקבלנות והשיפוצים. כל הזכויות שמורות.
        <div style={{ marginTop: '16px' }}>
          <Link to="/terms" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>
            תנאי שימוש והגבלת אחריות
          </Link>
        </div>
      </footer>
    </div>
  )
}
