import * as React from 'react';
export const __CACHE_BUSTER = 'v4';
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
  minus:["M5 12h14"],
  edit:["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7","M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"],
  x:["M18 6L6 18","M6 6l12 12"],
  "chevron-down":["M6 9l6 6 6-6"],
  "chevron-right":["M9 18l6-6-6-6"],
  "chevron-left":["M15 18l-6-6 6-6"],
  star:["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"],
  phone:["M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"],
  send:["M22 2L11 13","M22 2L15 22l-4-9-9-4 20-7z"],
  download:["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4","M7 10l5 5 5-5","M12 15V3"],
  "upload-cloud":["M16 16l-4-4-4 4","M12 12v9","M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3","M16 16l-4-4-4 4"],
  eye:["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 15a3 3 0 100-6 3 3 0 000 6z"],
  "file-text":["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"],
  trash:["M3 6h18","M8 6V4h8v2","M19 6l-1 14H6L5 6"],
  "trash-2":["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6","M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2","M10 11v6","M14 11v6"],
  "arrow-right":["M5 12h14","M12 5l7 7-7 7"],
  "arrow-left":["M19 12H5","M12 19l-7-7 7-7"],
  pen:["M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"],
  square:["M3 3h18v18H3z"],
  "zoom-in":["M11 19a8 8 0 100-16 8 8 0 000 16z","M21 21l-4.35-4.35","M11 8v6","M8 11h6"],
  mail:["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"],
  filter:["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"],
  settings:["M12 15a3 3 0 100-6 3 3 0 000 6z","M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"],
  lock:["M5 11h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z","M7 11V7a5 5 0 0110 0v4"],
  search:["M11 19a8 8 0 100-16 8 8 0 000 16z","M21 21l-4.35-4.35"],
  wand:["M15 4V2","M15 16v-2","M8 9h2","M20 9h2","M17.8 11.8l1.4 1.4","M17.8 6.2l1.4-1.4","M12.2 6.2l-1.4-1.4","M2 22l7.5-7.5"],
  folder:["M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"],
  "pie-chart":["M21.21 15.89A10 10 0 1 1 8 2.83","M22 12A10 10 0 0 0 12 2v10z"],
  "maximize-2":["M15 3h6v6","M9 21H3v-6","M21 3l-7 7","M3 21l7-7"],
  video:["M23 7l-7 5 7 5V7z","M1 5h14a2 2 0 012 2v10a2 2 0 01-2 2H1a2 2 0 01-2-2V7a2 2 0 012-2z"],
  play:["M5 3l14 9-14 9V3z"],
  shield:["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  "help-circle":["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", "M12 17h.01"],
  archive:["M21 8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V8z","M3 6h18","M10 12h4"],
  info:["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 16v-4","M12 8h.01"],
  image:["M21 19a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14z","M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z","M21 15l-5-5L5 21"],
  wallet:["M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z","M16 12a1 1 0 100-2 1 1 0 000 2z"],
  package:["M16.5 9.4l-9-5.19","M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z","M3.27 6.96L12 12.01l8.73-5.05","M12 22.08V12"],
  activity:["M22 12h-4l-3 9L9 3l-3 9H2"],
  receipt:["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z","M14 2v6h6","M9 15h6","M9 18h4"],
  "check-square":["M9 11l3 3L22 4","M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"],
  "calendar-range":["M3 4h18v18H3z","M16 2v4","M8 2v4","M3 10h18","M8 14h.01","M12 14h.01","M16 14h.01","M8 18h.01","M12 18h.01"],
  "clipboard-list":["M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2","M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2","M9 12h6","M9 16h4"],
  "hard-hat":["M2 22a10 10 0 0120 0","M6.6 10a6 6 0 0110.8 0","M2 22h20"],
  "file-check":["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M9 15l2 2 4-4"],
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

export const Badge = ({type, children, size}: any) => {
  const m = statusMeta[type] || {};
  const sizeClass = size === 'sm' ? ' badge-sm' : size === 'lg' ? ' badge-lg' : '';
  return <span className={`badge ${m.cls||'badge-pending'}${sizeClass}`}>{children ?? m.label}</span>;
};

export const TagBadge = ({tag}: any) => {
  const m = tagMeta[tag] || {cls:"badge-pending"};
  return <span className={`badge ${m.cls}`}>{tag}</span>;
};

export const ProgressBar = ({value, color, height=6, noShimmer}: any) => (
  <div style={{height,background:"var(--border)",borderRadius:height/2,overflow:"hidden",position:"relative"}}>
    <div style={{
      height:"100%",
      width:`${Math.min(100,Math.max(0,value||0))}%`,
      background: color
        ? color
        : `linear-gradient(90deg, var(--accent), var(--accent-dark))`,
      borderRadius:height/2,
      transition:"width 0.6s cubic-bezier(0.4,0,0.2,1)",
      position:"relative",
      overflow:"hidden"
    }}>
      {!noShimmer && (
        <div style={{
          position:"absolute",inset:0,
          background:"linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.32) 50%, transparent 100%)",
          animation:"shimmer 2.5s ease-in-out infinite"
        }}/>
      )}
    </div>
  </div>
);

export const Avatar = ({letter, color="#E07A38", size=36, status}: any) => (
  <div style={{position:"relative",flexShrink:0,width:size,height:size}}>
    <div style={{
      width:size,height:size,borderRadius:"50%",
      background:`linear-gradient(135deg, ${color}33 0%, ${color}18 100%)`,
      color,display:"flex",alignItems:"center",justifyContent:"center",
      fontWeight:800,fontSize:size*0.4,
      border:`1.5px solid ${color}30`,
      boxShadow:`0 2px 8px ${color}20`
    }}>
      {letter}
    </div>
    {status && (
      <div style={{
        position:"absolute",bottom:0,right:0,
        width:size*0.28,height:size*0.28,
        borderRadius:"50%",
        background:status==="online"?"var(--success)":status==="busy"?"var(--warning)":"var(--border)",
        border:`2px solid var(--surface)`,
        boxShadow:status==="online"?"0 0 6px var(--success-glow)":"none"
      }}/>
    )}
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
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:"1px solid var(--border)",position:"sticky",top:0,zIndex:3,background:"var(--surface)"}}>
          <span style={{fontWeight:800,fontSize:18}}>{title}</span>
          <motion.button whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={onClose} style={{background:"var(--bg)",border:"none",borderRadius:"50%",cursor:"pointer",color:"var(--text2)",padding:6,display:"flex"}}><Icon n="x" s={18}/></motion.button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

export const StatCard = ({label, value, sub, accent, icon, className}: any) => {
  const color = accent || "var(--accent)";
  const colorLight = accent ? `${accent}18` : "var(--accent-light)";
  return (
    <motion.div
      whileHover={{y:-3,boxShadow:"var(--shadow-lg)"}}
      transition={{duration:0.18,ease:[0.4,0,0.2,1]}}
      className={`card-stat ${className||''}`}
      style={{"--stat-color":color, "--stat-color-light":colorLight, height:"100%"} as any}
    >
      {icon && (
        <div className="card-stat-icon">
          <Icon n={icon} s={22}/>
        </div>
      )}
      <div className="card-stat-value">{value}</div>
      <div className="card-stat-label">{label}</div>
      {sub && <div className="card-stat-sub">{sub}</div>}
    </motion.div>
  );
};

export const Btn = ({onClick, children, variant="primary", size="md", disabled, style:sx, type="button", icon, ...rest}: any) => {
  const variantClass = ({
    primary: "btn-primary",
    ghost: "btn-ghost",
    secondary: "btn-secondary",
    danger: "btn-danger",
    success: "btn-success",
  } as Record<string, string>)[variant] || "btn-primary";
  const sizeClass = size==="sm"?"btn-sm":size==="lg"?"btn-lg":"";
  return (
    <motion.button
      type={type}
      whileHover={disabled?{}:{y:-1}}
      whileTap={disabled?{}:{scale:0.97}}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantClass} ${sizeClass}`}
      style={{opacity:disabled?.5:1,cursor:disabled?"not-allowed":"pointer",...sx}}
      {...rest}
    >
      {icon && <Icon n={icon} s={size==="sm"?13:15}/>}
      {children}
    </motion.button>
  );
};

export const Input = ({value, onChange, placeholder, type="text", style:sx}: any) => (
  <input className="bp-input" type={type} value={value} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder} style={sx}/>
);

export const STAGE_ICONS = [
  // Construction & Tools
  "📌","🏗️","🧱","🛠️","🚜","📏","🪚","🔨","🪛","🔧","🪜","🧰","🚧","👷","👷‍♂️","👷‍♀️",
  // Electrical, Water, HVAC
  "⚡","🔌","💡","🔦","💧","🚿","🛁","🚽","❄️","🌬️","🔥","🌡️",
  // Rooms & Materials
  "🚪","🪟","🪵","🪨","🎨","🖌️","🛋️","🛏️","🪑","🏡","🏠","🏢","🏰",
  // Nature & Outdoors
  "🌳","🌲","🪴","🍃","🌻","☀️","⛈️","🚗","🛣️",
  // General & Documents
  "📋","📄","📑","📝","📅","📆","✅","✔️","💰","💵","💳","🔐","🔑","📦"
];

// ─── Dark Mode Toggle ────────────────────────────────────────────────────────

/**
 * Returns the localStorage key for the current user's theme preference.
 * Per-user when userId is provided, falls back to the legacy device-level key.
 */
const themeKey = (userId?: string | null) =>
  userId ? `buildsync:theme:${userId}` : 'buildsync:theme';

type ThemeMode = 'light' | 'dark' | 'auto';

const getSystemDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (mode: ThemeMode) => {
  const dark = mode === 'dark' || (mode === 'auto' && getSystemDark());
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
};

export const useDarkMode = (userId?: string | null) => {
  const [mode, setModeState] = React.useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'auto';
    const saved =
      localStorage.getItem(themeKey(userId)) ??
      localStorage.getItem('buildsync:theme');
    if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
    // Legacy: old keys stored 'true'/'false' as strings or just 'dark'/'light'
    if (saved === 'true') return 'dark';
    if (saved === 'false') return 'light';
    return 'auto'; // default: follow OS
  });

  // Apply theme + listen for OS changes when in auto mode
  React.useEffect(() => {
    applyTheme(mode);
    // Always write to per-user key AND generic fallback key.
    // The inline <script> in __root.tsx reads the generic key before React
    // boots, so the loading screen always shows the correct theme.
    localStorage.setItem(themeKey(userId), mode);
    localStorage.setItem('buildsync:theme', mode);

    if (mode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => applyTheme('auto');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
  }, [mode, userId]);

  // When userId becomes known, load that user's saved preference
  React.useEffect(() => {
    if (!userId) return;
    const saved = localStorage.getItem(themeKey(userId));
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      setModeState(saved);
    } else {
      // Migrate device-level pref to per-user key
      const device = localStorage.getItem('buildsync:theme');
      if (device === 'light' || device === 'dark' || device === 'auto') {
        localStorage.setItem(themeKey(userId), device);
        setModeState(device as ThemeMode);
      }
    }
  }, [userId]);

  const isDark = mode === 'dark' || (mode === 'auto' && getSystemDark());

  return {
    dark: isDark,
    mode,
    setMode: (m: ThemeMode) => setModeState(m),
    // kept for back-compat
    toggle: () => setModeState(d => d === 'dark' ? 'light' : 'dark'),
  };
};

export const DarkModeToggle = ({ userId }: { userId?: string | null }) => {
  const { mode, setMode } = useDarkMode(userId);

  const options: { value: ThemeMode; icon: string; title: string }[] = [
    { value: 'light', icon: '☀️', title: 'מצב בהיר' },
    { value: 'dark',  icon: '🌙', title: 'מצב כהה' },
    { value: 'auto',  icon: '💻', title: 'אוטומטי (לפי המחשב)' },
  ];

  return (
    <div className="theme-toggle-group" role="group" aria-label="בחר מצב תצוגה">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => setMode(opt.value)}
          title={opt.title}
          aria-label={opt.title}
          aria-pressed={mode === opt.value}
          className={`theme-toggle-btn${mode === opt.value ? ' active' : ''}`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
};

export const IconPicker = ({ value, onChange }: { value?: string, onChange: (v: string) => void }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
       <div 
         onClick={() => setOpen(!open)}
         style={{ width: '100%', height: 42, display: 'flex', alignItems: 'center', padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontSize: 20, transition: 'border-color 0.2s' }}
       >
         {value || "📌"}
       </div>
       {open && (
         <div style={{ 
           position: 'absolute', top: 50, right: 0, width: 220, 
           maxHeight: 280, overflowY: 'auto',
           background: 'var(--surface)', border: '1px solid var(--border)', 
           borderRadius: 12, padding: 8, display: 'grid', 
           gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, 
           zIndex: 100, boxShadow: 'var(--shadow-lg)' 
         }}>
           {STAGE_ICONS.map(ic => (
             <div 
               key={ic} 
               onClick={(e) => { e.stopPropagation(); onChange(ic); setOpen(false); }}
               style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 4, background: value === ic ? 'var(--accent-light)' : 'transparent', fontSize: 20 }}
             >
               {ic}
             </div>
           ))}
         </div>
       )}
    </div>
  );
};

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
        <div style={{ fontSize: 16, color: "var(--text2)", lineHeight: 1.6, marginBottom: 24, whiteSpace: "pre-line" }}>
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
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 10, background: 'linear-gradient(180deg, transparent 0%, var(--surface) 55%, var(--surface) 100%)' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} style={{ background: 'var(--card, var(--surface))', borderRadius: 24, padding: 32, maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.18)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 20, boxShadow: '0 10px 20px rgba(245,158,11,0.3)' }}>
            <Icon n="lock" s={28} />
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--text1)' }}>{title}</h3>
          <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.5 }}>{description}</p>
          <Btn style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', boxShadow: '0 4px 12px rgba(217,119,6,0.3)' }} onClick={() => window.dispatchEvent(new CustomEvent('buildsync:open-upgrade', { detail: { title, reason: description } }))}>
            <Icon n="star" s={16} /> שדרג ל-Pro
          </Btn>
        </motion.div>
      </div>
    </div>
  );
};

// Standalone subscription paywall (no content to blur). Used by route guards
// where a strict role check would otherwise short-circuit the in-screen
// PremiumLock teaser, so non-subscribed / unregistered users still get the
// upgrade prompt instead of a bare "no access" message.
export const SubscriptionLock = ({
  title = "פיצ'ר זה זמין ב-Pro",
  description = "שדרג את החשבון שלך כדי לקבל גישה לכלי זה ולכלים מתקדמים נוספים.",
}: { title?: string; description?: string }) => (
  <div className="page-content">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24 }}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} style={{ background: 'var(--card, var(--surface))', borderRadius: 24, padding: 32, maxWidth: 420, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.18)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 20, boxShadow: '0 10px 20px rgba(245,158,11,0.3)' }}>
          <Icon n="lock" s={28} />
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--text1)' }}>{title}</h3>
        <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.5 }}>{description}</p>
        <Btn style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', boxShadow: '0 4px 12px rgba(217,119,6,0.3)' }} onClick={() => window.dispatchEvent(new CustomEvent('buildsync:open-upgrade', { detail: { title, reason: description } }))}>
          <Icon n="star" s={16} /> שדרג ל-Pro
        </Btn>
      </motion.div>
    </div>
  </div>
);
