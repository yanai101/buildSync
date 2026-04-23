
// ── BuildPro SHARED COMPONENTS ───────────────────────────────────────────────

const PATHS = {
  home:["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z","M9 22V12h6v10"],
  layers:["M12 2L2 7l10 5 10-5-10-5z","M2 17l10 5 10-5","M2 12l10 5 10-5"],
  users:["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75"],
  clipboard:["M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2","M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2","M9 12h6","M9 16h4"],
  camera:["M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z","M12 17a4 4 0 100-8 4 4 0 000 8z"],
  message:["M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"],
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
  trash:["M3 6h18","M8 6V4h8v2","M19 6l-1 14H6L5 6"],
  "arrow-right":["M5 12h14","M12 5l7 7-7 7"],
  pen:["M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"],
  square:["M3 3h18v18H3z"],
  "zoom-in":["M11 19a8 8 0 100-16 8 8 0 000 16z","M21 21l-4.35-4.35","M11 8v6","M8 11h6"],
  mail:["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"],
  filter:["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"],
  settings:["M12 15a3 3 0 100-6 3 3 0 000 6z","M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"],
};

const Icon = ({n, s=18, c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    {(PATHS[n]||[]).map((d,i)=><path key={i} d={d}/>)}
  </svg>
);

const statusMeta = {
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

const tagMeta = {
  "התקדמות":{cls:"badge-active"},"בעיה":{cls:"badge-problem"},
  "בדיקה":{cls:"badge-pending"},"אישור":{cls:"badge-done"},
};

const Badge = ({type, children}) => {
  const m = statusMeta[type] || {};
  return <span className={`badge ${m.cls||'badge-pending'}`}>{children ?? m.label}</span>;
};

const TagBadge = ({tag}) => {
  const m = tagMeta[tag] || {cls:"badge-pending"};
  return <span className={`badge ${m.cls}`}>{tag}</span>;
};

const ProgressBar = ({value, color, height=6}) => (
  <div style={{height,background:"var(--border)",borderRadius:height/2,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${value}%`,background:color||"var(--accent)",borderRadius:height/2,transition:"width .4s"}}/>
  </div>
);

const Avatar = ({letter, color="#E07A38", size=36}) => (
  <div style={{width:size,height:size,borderRadius:"50%",background:`${color}22`,color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.38,flexShrink:0}}>
    {letter}
  </div>
);

const Stars = ({rating}) => {
  if(!rating) return <span style={{color:"var(--text3)",fontSize:12}}>לא דורג</span>;
  return (
    <span style={{color:"#F59E0B",fontSize:12,display:"flex",alignItems:"center",gap:2}}>
      <Icon n="star" s={12} c="#F59E0B"/>
      {rating.toFixed(1)}
    </span>
  );
};

const Modal = ({onClose, title, children, width=660}) => (
  <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal-box" style={{maxWidth:width}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid var(--border)"}}>
        <span style={{fontWeight:700,fontSize:16}}>{title}</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text2)",padding:4,display:"flex"}}><Icon n="x" s={16}/></button>
      </div>
      <div style={{padding:20}}>{children}</div>
    </div>
  </div>
);

const StatCard = ({label, value, sub, accent, icon}) => (
  <div className="card" style={{padding:"20px 20px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{fontSize:26,fontWeight:800,letterSpacing:"-1px",color:accent||"var(--text1)",lineHeight:1}}>{value}</div>
        <div style={{fontSize:13,color:"var(--text2)",marginTop:4}}>{label}</div>
        {sub && <div style={{fontSize:11,color:"var(--text3)",marginTop:6}}>{sub}</div>}
      </div>
      {icon && <div style={{color:accent||"var(--text3)",opacity:.6}}><Icon n={icon} s={22}/></div>}
    </div>
  </div>
);

const Btn = ({onClick, children, variant="primary", size="md", disabled, style:sx}) => {
  const base = {display:"inline-flex",alignItems:"center",gap:6,border:"none",borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:600,transition:"all .15s",opacity:disabled?.5:1,...sx};
  const sizeS = size==="sm"?{padding:"5px 10px",fontSize:12}:{padding:"9px 16px",fontSize:13};
  const variantS = variant==="ghost"?{background:"transparent",color:"var(--text2)",border:"1px solid var(--border)"}:{background:"var(--accent)",color:"#fff"};
  return <button onClick={onClick} style={{...base,...sizeS,...variantS}} disabled={disabled}>{children}</button>;
};

const Input = ({value, onChange, placeholder, type="text", style:sx}) => (
  <input className="bp-input" type={type} value={value} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder} style={sx}/>
);

const Select = ({value, onChange, children, style:sx}) => (
  <select className="bp-input" value={value} onChange={e=>onChange(e.target.value)} style={sx}>
    {children}
  </select>
);

Object.assign(window, { Icon, Badge, TagBadge, ProgressBar, Avatar, Stars, Modal, StatCard, Btn, Input, Select, statusMeta });
