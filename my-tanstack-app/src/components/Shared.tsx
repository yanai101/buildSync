import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── BuildSync SHARED COMPONENTS ───────────────────────────────────────────────

export const PATHS: Record<string, string[]> = {
  home:["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z","M9 22V12h6v10"],
  layers:["M12 2L2 7l10 5 10-5-10-5z","M2 17l10 5 10-5","M2 12l10 5 10-5"],
  users:["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75"],
  clipboard:["M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2","M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2","M9 12h6","M9 16h4"],
  camera:["M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z","M12 17a4 4 0 100-8 4 4 0 000 8z"],
  message:["M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"],
  "message-circle":["M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"],
  menu:["M3 12h18","M3 6h18","M3 18h18"],
  chart:["M18 20V10","M12 20V4","M6 20v-6"],
  calendar:["M3 4h18v18H3z","M16 2v4","M8 2v4","M3 10h18"],
  check:["M20 6L9 17l-5-5"],
  "check-circle":["M22 11.08V12a10 10 0 11-5.93-9.14","M22 4L12 14.01l-3-3"],
  clock:["M12 22a10 10 0 100-20 10 10 0 000 20z","M12 6v6l4 2"],
  alert:["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z","M12 9v4","M12 17h.01"],
  plus:["M12 5v14","M5 12h14"],
  edit:["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7","M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"],
  x:["M18 6L6 18","M6 6l12 12"],
  "chevron-down":["M6 9l6 6 6-6"],
  "chevron-right":["M9 18l6-6-6-6"],
  star:["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"],
  phone:["M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"],
  send:["M22 2L11 13","M22 2L15 22l-4-9-9-4 20-7z"],
  download:["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4","M7 10l5 5 5-5","M12 15V3"],
  "upload-cloud":["M16 16l-4-4-4 4","M12 12v9","M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3","M16 16l-4-4-4 4"],
  eye:["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 15a3 3 0 100-6 3 3 0 000 6z"],
  "file-text":["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"],
  trash:["M3 6h18","M8 6V4h8v2","M19 6l-1 14H6L5 6"],
  "arrow-right":["M5 12h14","M12 5l7 7-7 7"],
  pen:["M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"],
  square:["M3 3h18v18H3z"],
  "zoom-in":["M11 19a8 8 0 100-16 8 8 0 000 16z","M21 21l-4.35-4.35","M11 8v6","M8 11h6"],
  mail:["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"],
  filter:["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"],
  settings:["M12 15a3 3 0 100-6 3 3 0 000 6z","M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"],
  lock:["M5 11h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z","M7 11V7a5 5 0 0110 0v4"],
  search:["M11 19a8 8 0 100-16 8 8 0 000 16z","M21 21l-4.35-4.35"],
  wand:["M15 4V2","M15 16v-2","M8 9h2","M20 9h2","M17.8 11.8l1.4 1.4","M17.8 6.2l1.4-1.4","M12.2 6.2l-1.4-1.4","M2 22l7.5-7.5"],
};

export const Icon = ({n, s=18, c="currentColor"}: any) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    {(PATHS[n]||[]).map((d: any, i: number)=><path key={i} d={d}/>)}
  </svg>
);

export const statusMeta: any = {
  done:    {label:"הושלם",   cls:"badge-done"},
  active:  {label:"פעיל",    cls:"badge-active"},
  pending: {label:"ממתין",   cls:"badge-pending"},
  completed:{label:"הושלם",  cls:"badge-done"},
  approved:{label:"אושר",    cls:"badge-done"},
  problem: {label:"בעיה",    cls:"badge-problem"},
  internal:{label:"פנימי",   cls:"badge-pending"},
  contractor:{label:"לקבלן", cls:"badge-active"},
  issue:   {label:"בעיה",    cls:"badge-problem"},
  progress:{label:"התקדמות", cls:"badge-active"},
  check:   {label:"בדיקה",   cls:"badge-pending"},
  approval:{label:"אישור",   cls:"badge-done"},
};

const tagMeta: any = {
  "התקדמות":{cls:"badge-active"},"בעיה":{cls:"badge-problem"},
  "בדיקה":{cls:"badge-pending"},"אישור":{cls:"badge-done"},
};

export const Badge = ({type, children}: any) => {
  const m = statusMeta[type] || {};
  return <span className={`badge ${m.cls||'badge-pending'}`}>{children ?? m.label}</span>;
};

export const TagBadge = ({tag}: any) => {
  const m = tagMeta[tag] || {cls:"badge-pending"};
  return <span className={`badge ${m.cls}`}>{tag}</span>;
};

export const ProgressBar = ({value, color, height=6}: any) => (
  <div style={{height,background:"var(--border)",borderRadius:height/2,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${value}%`,background:color||"var(--accent)",borderRadius:height/2,transition:"width .4s"}}/>
  </div>
);

export const Avatar = ({letter, color="#E07A38", size=36}: any) => (
  <div style={{width:size,height:size,borderRadius:"50%",background:`${color}22`,color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.38,flexShrink:0}}>
    {letter}
  </div>
);

export const Stars = ({rating}: any) => {
  if(!rating) return <span style={{color:"var(--text3)",fontSize:12}}>לא דורג</span>;
  return (
    <span style={{color:"#F59E0B",fontSize:12,display:"flex",alignItems:"center",gap:2}}>
      <Icon n="star" s={12} c="#F59E0B"/>
      {rating.toFixed(1)}
    </span>
  );
};

export const Modal = ({onClose, title, children, width=660}: any) => (
  <AnimatePresence>
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="modal-overlay" onClick={(e: any)=>e.target===e.currentTarget&&onClose()}>
      <motion.div initial={{scale:0.95,opacity:0,y:10}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.95,opacity:0,y:10}} transition={{type:"spring",stiffness:300,damping:30}} className="modal-box" style={{maxWidth:width}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:"1px solid var(--border)"}}>
          <span style={{fontWeight:800,fontSize:18}}>{title}</span>
          <motion.button whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={onClose} style={{background:"var(--bg)",border:"none",borderRadius:"50%",cursor:"pointer",color:"var(--text2)",padding:6,display:"flex"}}><Icon n="x" s={18}/></motion.button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

export const StatCard = ({label, value, sub, accent, icon}: any) => (
  <motion.div whileHover={{y:-4,boxShadow:"var(--shadow-xl)"}} transition={{duration:0.2}} className="card" style={{padding:"24px 24px 20px",borderLeft:`4px solid ${accent||"var(--accent)"}`}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{fontSize:28,fontWeight:800,letterSpacing:"-1px",color:accent||"var(--text1)",lineHeight:1}}>{value}</div>
        <div style={{fontSize:14,color:"var(--text2)",marginTop:8,fontWeight:600}}>{label}</div>
        {sub && <div style={{fontSize:12,color:"var(--text3)",marginTop:6}}>{sub}</div>}
      </div>
      {icon && <div style={{color:accent||"var(--text3)",opacity:.8,background:"var(--bg)",padding:10,borderRadius:"50%"}}><Icon n={icon} s={24}/></div>}
    </div>
  </motion.div>
);

export const Btn = ({onClick, children, variant="primary", size="md", disabled, style:sx, type="button", ...rest}: any) => {
  const base = {display:"inline-flex",alignItems:"center",gap:8,border:"none",borderRadius:10,cursor:disabled?"not-allowed":"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:700,transition:"all .2s",opacity:disabled?.5:1,...sx};
  const sizeS = size==="sm"?{padding:"6px 12px",fontSize:13}:{padding:"10px 20px",fontSize:14};
  const variantS = variant==="ghost"?{background:"transparent",color:"var(--text2)",border:"1px solid var(--border)"}:{background:"linear-gradient(135deg, var(--accent) 0%, #c96b30 100%)",color:"#fff",boxShadow:"0 2px 8px rgba(224,122,56,0.3)"};
  return <motion.button type={type} whileHover={disabled?{}:{scale:1.02,boxShadow:variant==="primary"?"0 4px 12px rgba(224,122,56,0.4)":"none"}} whileTap={disabled?{}:{scale:0.97}} onClick={onClick} style={{...base,...sizeS,...variantS,...sx}} disabled={disabled} {...rest}>{children}</motion.button>;
};

export const Input = ({value, onChange, placeholder, type="text", style:sx}: any) => (
  <input className="bp-input" type={type} value={value} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder} style={sx}/>
);

export const Select = ({value, onChange, children, style:sx, ...rest}: any) => (
  <select className="bp-input" value={value} onChange={e=>onChange(e.target.value)} style={sx} {...rest}>
    {children}
  </select>
);

export const AppDialog = ({
  onClose,
  title,
  message,
  type = "info",
  primaryText = "הבנתי",
  secondaryText,
  onPrimary,
  onSecondary,
  primaryVariant = "primary",
  loading = false,
}: any) => {
  const iconMap: any = {
    success: { n: "check-circle", c: "var(--success)" },
    error:   { n: "alert", c: "var(--danger)" },
    warning: { n: "alert", c: "var(--warning)" },
    info:    { n: "message", c: "var(--accent)" }
  };
  const { n, c } = iconMap[type] || iconMap.info;
  const close = onClose || (() => {});
  const handlePrimary = () => {
    if (loading) return;
    if (onPrimary) onPrimary();
    else close();
  };
  const handleSecondary = () => {
    if (loading) return;
    if (onSecondary) onSecondary();
    else close();
  };
  
  return (
    <Modal onClose={close} title={title} width={420}>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ 
          width: 64, 
          height: 64, 
          margin: "0 auto 20px", 
          background: `${c}11`, 
          color: c, 
          borderRadius: "50%", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
          <Icon n={n} s={32} />
        </div>
        <div style={{ fontSize: 16, color: "var(--text2)", lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </div>
        <div style={{display:"flex",gap:10,flexDirection:secondaryText?"row":"column"}}>
          {secondaryText && (
            <Btn variant="ghost" onClick={handleSecondary} disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
              {secondaryText}
            </Btn>
          )}
          <Btn
            onClick={handlePrimary}
            disabled={loading}
            variant={primaryVariant}
            style={{
              flex: 1,
              justifyContent: "center",
              ...(primaryVariant === "danger" ? {
                background: "var(--danger)",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(239,68,68,0.28)"
              } : {})
            }}
          >
            {loading ? "מבצע..." : primaryText}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

export const FeedbackModal = ({onClose, title, message, type="info", buttonText="הבנתי"}: any) => (
  <AppDialog
    onClose={onClose}
    title={title}
    message={message}
    type={type}
    primaryText={buttonText}
  />
);

export const ConfirmDialog = ({onClose, onConfirm, title, message, confirmText="אישור", cancelText="ביטול", loading=false, type="warning"}: any) => (
  <AppDialog
    onClose={onClose}
    title={title}
    message={message}
    type={type}
    primaryText={confirmText}
    secondaryText={cancelText}
    onPrimary={onConfirm}
    onSecondary={onClose}
    primaryVariant="danger"
    loading={loading}
  />
);

export const Spinner = ({size=24, color="var(--accent)"}: any) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    style={{ width: size, height: size, border: `3px solid ${color}22`, borderTop: `3px solid ${color}`, borderRadius: "50%" }}
  />
);

export const ErrorState = ({message, onRetry}: any) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,textAlign:"center"}}>
    <div style={{width:64,height:64,background:"var(--problem-light)",color:"var(--danger)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
      <Icon n="alert" s={32}/>
    </div>
    <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>אופס, משהו השתבש</div>
    <div style={{fontSize:14,color:"var(--text3)",marginBottom:24,maxWidth:300}}>{message || "לא הצלחנו לטעון את המידע המבוקש. אנא נסו שוב."}</div>
    {onRetry && <Btn onClick={onRetry}><Icon n="check" s={14}/> נסה שוב</Btn>}
  </div>
);

export const PageBackground = ({ image, opacity = 0.05 }: { image: string, opacity?: number }) => (
  <div style={{
    position: 'absolute',
    inset: 0,
    backgroundImage: `url(${image})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity,
    zIndex: -1,
    pointerEvents: 'none',
    borderRadius: 24,
  }} />
);

export const EmptyState = ({ icon, image, title, description, action, accentColor = "var(--accent)" }: any) => {
  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '80px 20px', 
      textAlign: 'center',
      background: `radial-gradient(circle at center, ${accentColor}0a 0%, transparent 60%), url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z' fill='%239C92AC' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E")`,
      borderRadius: '24px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      margin: '20px 0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {image ? (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ marginBottom: 32 }}
        >
          <img src={image} alt="illustration" style={{width: 240, height: 240, objectFit: 'contain', mixBlendMode: 'multiply', opacity: 0.95}} />
        </motion.div>
      ) : (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{
            width: 80, 
            height: 80, 
            borderRadius: 30, 
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            boxShadow: `0 20px 40px ${accentColor}44`, 
            marginBottom: 24
          }}
        >
          <Icon n={icon} s={36} c="#fff" />
        </motion.div>
      )}
      <h2 style={{fontSize: 24, fontWeight: 800, marginBottom: 12, color: 'var(--text1)'}}>{title}</h2>
      <p style={{fontSize: 16, color: 'var(--text2)', marginBottom: 32, maxWidth: 400, lineHeight: 1.6}}>
        {description}
      </p>
      {action && action}
    </div>
  );
};

export const PremiumLock = ({ isLocked, title = "פיצ'ר זה זמין ב-Pro", description = "שדרג את החשבון שלך כדי לקבל גישה לכלי זה ולכלים מתקדמים נוספים.", children }: any) => {
  if (!isLocked) return <>{children}</>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 24 }}>
      <div style={{ filter: 'blur(10px) grayscale(0.5)', opacity: 0.6, pointerEvents: 'none', userSelect: 'none', height: '100%' }}>
        {children}
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 10, background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.95) 100%)' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} style={{ background: '#fff', borderRadius: 24, padding: 32, maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 20, boxShadow: '0 10px 20px rgba(245,158,11,0.3)' }}>
            <Icon n="lock" s={28} />
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--text1)' }}>{title}</h3>
          <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.5 }}>{description}</p>
          <Btn style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', boxShadow: '0 4px 12px rgba(217,119,6,0.3)' }} onClick={() => alert('שדרוג חשבון יתווסף בהמשך')}>
            <Icon n="star" s={16} /> שדרג ל-Pro
          </Btn>
        </motion.div>
      </div>
    </div>
  );
};
