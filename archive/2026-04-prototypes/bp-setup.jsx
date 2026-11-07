
// ── BuildPro: PROJECT SETUP + BOQ WIZARD ─────────────────────────────────────

const ROOM_TYPE_OPTS = [
  {id:"living",   label:"סלון",              defaultSize:35, wet:false, needsAC:true},
  {id:"dining",   label:"פינת אוכל",         defaultSize:20, wet:false, needsAC:false},
  {id:"kitchen",  label:"מטבח",              defaultSize:18, wet:true,  needsAC:false},
  {id:"master",   label:"חדר שינה ראשי",    defaultSize:22, wet:false, needsAC:true},
  {id:"bedroom",  label:"חדר שינה",          defaultSize:16, wet:false, needsAC:true},
  {id:"bathroom", label:"חדר אמבטיה",        defaultSize:9,  wet:true,  needsAC:false},
  {id:"toilet",   label:"שירותים",            defaultSize:4,  wet:true,  needsAC:false},
  {id:"entrance", label:"כניסה/מסדרון",      defaultSize:10, wet:false, needsAC:false},
  {id:"utility",  label:"חדר שירות",         defaultSize:6,  wet:true,  needsAC:false},
  {id:"office",   label:"חדר עבודה",         defaultSize:14, wet:false, needsAC:true},
  {id:"storage",  label:"מחסן",              defaultSize:8,  wet:false, needsAC:false},
  {id:"garage",   label:"חניה/מחסן",         defaultSize:20, wet:false, needsAC:false},
  {id:"balcony",  label:"מרפסת/גינה",       defaultSize:15, wet:false, needsAC:false},
];

const DEFAULT_ROOMS = [
  {uid:"r1",  type:"living",   name:"סלון",             floor:1, size:40},
  {uid:"r2",  type:"kitchen",  name:"מטבח",             floor:1, size:20},
  {uid:"r3",  type:"dining",   name:"פינת אוכל",        floor:1, size:18},
  {uid:"r4",  type:"toilet",   name:"שירותי אורחים",   floor:1, size:4},
  {uid:"r5",  type:"entrance", name:"כניסה ומסדרון",   floor:1, size:12},
  {uid:"r6",  type:"master",   name:"חדר שינה ראשי",  floor:2, size:22},
  {uid:"r7",  type:"bedroom",  name:"חדר שינה 2",      floor:2, size:16},
  {uid:"r8",  type:"bedroom",  name:"חדר שינה 3",      floor:2, size:15},
  {uid:"r9",  type:"bathroom", name:"חדר אמבטיה 1",    floor:2, size:9},
  {uid:"r10", type:"bathroom", name:"חדר אמבטיה 2",    floor:2, size:7},
];

// ── Smart defaults engine ─────────────────────────────────────────────────────
const calcSmartItems = (room) => {
  const {size, type} = room;
  const rt = ROOM_TYPE_OPTS.find(r=>r.id===type)||{};
  const items = [];

  // Flooring
  items.push({id:`${room.uid}_fl`, cat:"ריצוף", name:"ריצוף", qty:Math.ceil(size*1.1), unit:'מ"ר', hint:`${size}מ"ר + 10% פסולת`});

  // Wall tiling (wet rooms)
  if(rt.wet){
    const wallArea = Math.round((Math.sqrt(size)*2 + Math.sqrt(size)*2) * 2.7);
    items.push({id:`${room.uid}_wt`, cat:"חיפוי קירות", name:"חיפוי קיר", qty:wallArea, unit:'מ"ר', hint:"גובה 2.7מ'"});
  }

  // Ceiling
  items.push({id:`${room.uid}_cl`, cat:"תקרה", name:"תקרה / גבס", qty:Math.ceil(size), unit:'מ"ר'});

  // Lighting
  items.push({id:`${room.uid}_sp`, cat:"תאורה", name:"ספוט שקוע LED", qty:Math.ceil(size/8), unit:"יח'", hint:'1 ל-8מ"ר'});
  if(type!=="toilet" && type!=="bathroom"){
    items.push({id:`${room.uid}_main`, cat:"תאורה", name:"גוף תאורה מרכזי", qty:1, unit:"יח'"});
  }

  // Electrical
  const sockets = type==="kitchen" ? Math.ceil(size/5) : Math.ceil(size/8);
  items.push({id:`${room.uid}_sock`, cat:"חשמל", name:"שקע כפול", qty:sockets, unit:"יח'", hint:'1 ל-8מ"ר'});
  items.push({id:`${room.uid}_sw`, cat:"חשמל", name:"מפסק", qty: Math.ceil(size/20)+1, unit:"יח'"});
  if(type==="kitchen"){
    items.push({id:`${room.uid}_oven`, cat:"חשמל", name:"שקע כיריים/תנור", qty:1, unit:"יח'"});
    items.push({id:`${room.uid}_fridge`, cat:"חשמל", name:"שקע מקרר", qty:1, unit:"יח'"});
  }

  // Plumbing
  if(type==="bathroom"){
    items.push({id:`${room.uid}_wc`, cat:"אינסטלציה", name:"אסלה", qty:1, unit:"יח'"});
    items.push({id:`${room.uid}_bs`, cat:"אינסטלציה", name:"כיור", qty:1, unit:"יח'"});
    items.push({id:`${room.uid}_sh`, cat:"אינסטלציה", name:"אמבטיה / מקלחון", qty:1, unit:"יח'"});
    items.push({id:`${room.uid}_bfau`, cat:"אינסטלציה", name:"ברז", qty:2, unit:"יח'"});
  } else if(type==="toilet"){
    items.push({id:`${room.uid}_twc`, cat:"אינסטלציה", name:"אסלה", qty:1, unit:"יח'"});
    items.push({id:`${room.uid}_tbs`, cat:"אינסטלציה", name:"כיור קטן", qty:1, unit:"יח'"});
  } else if(type==="kitchen"){
    items.push({id:`${room.uid}_ks`, cat:"אינסטלציה", name:"כיור מטבח", qty:1, unit:"יח'"});
    items.push({id:`${room.uid}_kf`, cat:"אינסטלציה", name:"ברז מטבח", qty:1, unit:"יח'"});
  } else if(type==="utility"){
    items.push({id:`${room.uid}_us`, cat:"אינסטלציה", name:"כיור שירות", qty:1, unit:"יח'"});
  }

  // Carpentry
  if(type==="bedroom"||type==="master"){
    items.push({id:`${room.uid}_ward`, cat:"נגרות", name:"ארון הזזה", qty:1, unit:"יח'"});
    items.push({id:`${room.uid}_door`, cat:"נגרות", name:"דלת פנים", qty:1, unit:"יח'"});
  } else if(type==="kitchen"){
    items.push({id:`${room.uid}_kb`, cat:"נגרות", name:"ארון מטבח תחתון", qty:Math.ceil(Math.sqrt(size)*0.65), unit:"מ'"});
    items.push({id:`${room.uid}_ku`, cat:"נגרות", name:"ארון מטבח עליון", qty:Math.ceil(Math.sqrt(size)*0.5), unit:"מ'"});
  } else if(type!=="bathroom"&&type!=="toilet"&&type!=="utility"&&type!=="garage"&&type!=="storage"){
    items.push({id:`${room.uid}_dr`, cat:"נגרות", name:"דלת פנים", qty:1, unit:"יח'"});
  }

  // AC
  if(rt.needsAC){
    const btu = size<=12?9:size<=20?12:size<=30?18:24;
    items.push({id:`${room.uid}_ac`, cat:"מיזוג", name:`מזגן ${btu}K BTU`, qty:1, unit:"יח'", hint:`לפי ${size}מ"ר`});
  }

  return items.map(i=>({...i, userQty:i.qty}));
};

// ── PROJECT SETUP SCREEN ──────────────────────────────────────────────────────
const ProjectSetupScreen = () => {
  const [step, setStep] = React.useState(0);
  const [saved, setSaved] = React.useState(false);
  const [cfg, setCfg] = React.useState({
    name:"בית רוזנברג", address:"רחוב הכרם 14, נהריה",
    owner:"יוסי רוזנברג", manager:"אבי כהן", inspector:"רון לוי",
    floors:2, area:200,
    rooms: DEFAULT_ROOMS.map(r=>({...r})),
  });

  const setField = (k,v) => setCfg(c=>({...c,[k]:v}));
  const setRoom = (uid,k,v) => setCfg(c=>({...c,rooms:c.rooms.map(r=>r.uid===uid?{...r,[k]:v}:r)}));
  const addRoom = () => {
    const uid = `r${Date.now()}`;
    setCfg(c=>({...c,rooms:[...c.rooms,{uid,type:"bedroom",name:"חדר שינה חדש",floor:1,size:16}]}));
  };
  const removeRoom = (uid) => setCfg(c=>({...c,rooms:c.rooms.filter(r=>r.uid!==uid)}));

  const STEPS = ["פרטי הפרויקט","מבנה הבית","חדרים","צוות","סיכום"];
  const totalArea = cfg.rooms.reduce((a,r)=>a+Number(r.size||0),0);

  const floorRooms = (f) => cfg.rooms.filter(r=>Number(r.floor)===f);

  if(saved) return (
    <div className="page-content" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400}}>
      <div style={{textAlign:"center",maxWidth:400}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:"#D1FAE5",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <Icon n="check" s={28} c="var(--success)"/>
        </div>
        <div style={{fontSize:22,fontWeight:800,marginBottom:8}}>הפרויקט הוגדר בהצלחה!</div>
        <div style={{fontSize:14,color:"var(--text2)",marginBottom:24}}>{cfg.rooms.length} חדרים · {cfg.floors} קומות · {totalArea} מ"ר</div>
        <Btn onClick={()=>setSaved(false)}>עריכה נוספת</Btn>
      </div>
    </div>
  );

  return (
    <div className="page-content">
      {/* Stepper */}
      <div style={{display:"flex",alignItems:"center",marginBottom:28,overflowX:"auto",paddingBottom:4}}>
        {STEPS.map((s,i)=>(
          <React.Fragment key={i}>
            <div onClick={()=>setStep(i)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",flexShrink:0}}>
              <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,
                background:step===i?"var(--accent)":i<step?"var(--success)":"var(--border)",
                color:step===i||i<step?"#fff":"var(--text3)",transition:"all .2s"}}>
                {i<step?<Icon n="check" s={13} c="#fff"/>:i+1}
              </div>
              <span style={{fontSize:13,fontWeight:step===i?600:400,color:step===i?"var(--text1)":"var(--text3)",whiteSpace:"nowrap"}}>{s}</span>
            </div>
            {i<STEPS.length-1&&<div style={{flex:1,height:1,background:i<step?"var(--success)":"var(--border)",margin:"0 8px",minWidth:16}}/>}
          </React.Fragment>
        ))}
      </div>

      <div className="card" style={{marginBottom:20}}>
        {/* Step 0: Project info */}
        {step===0 && (
          <div className="card-body">
            <div style={{fontWeight:700,fontSize:16,marginBottom:20}}>פרטי הפרויקט</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[["name","שם הפרויקט"],["address","כתובת"],["owner","בעל הבית"]].map(([k,label])=>(
                <div key={k}>
                  <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:500}}>{label}</div>
                  <input className="bp-input" value={cfg[k]} onChange={e=>setField(k,e.target.value)}/>
                </div>
              ))}
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:500}}>תאריך התחלה צפוי</div>
                <input className="bp-input" type="date" defaultValue="2025-01-01"/>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Structure */}
        {step===1 && (
          <div className="card-body">
            <div style={{fontWeight:700,fontSize:16,marginBottom:20}}>מבנה הבית</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:500}}>מספר קומות</div>
                <div style={{display:"flex",gap:8}}>
                  {[1,2,3,4].map(n=>(
                    <div key={n} onClick={()=>setField("floors",n)} style={{width:44,height:44,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,cursor:"pointer",border:"2px solid",borderColor:cfg.floors===n?"var(--accent)":"var(--border)",background:cfg.floors===n?"var(--accent-light)":"var(--surface)",color:cfg.floors===n?"var(--accent)":"var(--text2)",transition:"all .15s"}}>
                      {n}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:500}}>שטח כולל (מ"ר)</div>
                <input className="bp-input" type="number" value={cfg.area} onChange={e=>setField("area",e.target.value)} style={{width:100}}/>
              </div>
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:500}}>שטח מוגדר</div>
                <div style={{fontSize:22,fontWeight:800,color:"var(--accent)"}}>{totalArea} <span style={{fontSize:14,fontWeight:400,color:"var(--text2)"}}>מ"ר</span></div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10}}>
              {[
                {label:"חדר שינה",count:cfg.rooms.filter(r=>r.type==="bedroom"||r.type==="master").length},
                {label:"חדרי אמבטיה",count:cfg.rooms.filter(r=>r.type==="bathroom").length},
                {label:"שירותים",count:cfg.rooms.filter(r=>r.type==="toilet").length},
                {label:"סה\"כ חדרים",count:cfg.rooms.length},
              ].map(({label,count})=>(
                <div key={label} style={{background:"var(--bg)",borderRadius:8,padding:"12px 14px",textAlign:"center"}}>
                  <div style={{fontSize:24,fontWeight:800}}>{count}</div>
                  <div style={{fontSize:11,color:"var(--text2)",marginTop:2}}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Rooms */}
        {step===2 && (
          <div>
            <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:15}}>הגדרת חדרים</span>
              <Btn size="sm" onClick={addRoom}><Icon n="plus" s={13}/> חדר חדש</Btn>
            </div>
            {Array.from({length:cfg.floors},(_,fi)=>(
              <div key={fi} style={{padding:"14px 18px 8px",borderBottom:"1px solid var(--border)"}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>קומה {fi+1}</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {floorRooms(fi+1).length===0 && <div style={{fontSize:13,color:"var(--text3)",padding:"8px 0"}}>אין חדרים בקומה זו</div>}
                  {floorRooms(fi+1).map(r=>(
                    <div key={r.uid} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 10px",background:"var(--bg)",borderRadius:8}}>
                      <select className="bp-input" value={r.type} onChange={e=>{
                        const t=ROOM_TYPE_OPTS.find(x=>x.id===e.target.value);
                        setRoom(r.uid,"type",e.target.value);
                        if(t) setRoom(r.uid,"name",t.label);
                      }} style={{width:150,fontSize:12}}>
                        {ROOM_TYPE_OPTS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                      <input className="bp-input" value={r.name} onChange={e=>setRoom(r.uid,"name",e.target.value)} placeholder="שם חדר" style={{flex:1,fontSize:12}}/>
                      <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                        <input className="bp-input" type="number" value={r.size} onChange={e=>setRoom(r.uid,"size",Number(e.target.value))} style={{width:60,fontSize:12}}/>
                        <span style={{fontSize:11,color:"var(--text3)",whiteSpace:"nowrap"}}>מ"ר</span>
                      </div>
                      <select className="bp-input" value={r.floor} onChange={e=>setRoom(r.uid,"floor",Number(e.target.value))} style={{width:70,fontSize:12}}>
                        {Array.from({length:cfg.floors},(_,i)=><option key={i+1} value={i+1}>קומה {i+1}</option>)}
                      </select>
                      <button onClick={()=>removeRoom(r.uid)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",padding:4,display:"flex",flexShrink:0}}>
                        <Icon n="trash" s={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{padding:"10px 18px",background:"#FAFAF8",borderRadius:"0 0 10px 10px",display:"flex",gap:20,fontSize:12,color:"var(--text2)"}}>
              <span>סה"כ חדרים: <strong>{cfg.rooms.length}</strong></span>
              <span>שטח מוגדר: <strong>{totalArea} מ"ר</strong></span>
              <span>ממוצע לחדר: <strong>{cfg.rooms.length?Math.round(totalArea/cfg.rooms.length):0} מ"ר</strong></span>
            </div>
          </div>
        )}

        {/* Step 3: Team */}
        {step===3 && (
          <div className="card-body">
            <div style={{fontWeight:700,fontSize:16,marginBottom:20}}>צוות הפרויקט</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[["manager","בעל בנייה / מנהל פרויקט"],["inspector","מפקח"],["owner","בעל הבית (יזם)"]].map(([k,label])=>(
                <div key={k}>
                  <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:500}}>{label}</div>
                  <input className="bp-input" value={cfg[k]} onChange={e=>setField(k,e.target.value)}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step===4 && (
          <div className="card-body">
            <div style={{fontWeight:700,fontSize:16,marginBottom:20}}>סיכום הגדרות</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--text3)",marginBottom:10,textTransform:"uppercase",letterSpacing:".5px"}}>פרטי פרויקט</div>
                {[["שם",cfg.name],["כתובת",cfg.address],["בעל הבית",cfg.owner],["בעל בנייה",cfg.manager],["מפקח",cfg.inspector]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                    <span style={{color:"var(--text2)"}}>{k}</span><span style={{fontWeight:500}}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--text3)",marginBottom:10,textTransform:"uppercase",letterSpacing:".5px"}}>מבנה הבית</div>
                {[["קומות",cfg.floors],["חדרים",cfg.rooms.length],["שטח כולל",`${totalArea} מ"ר`]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                    <span style={{color:"var(--text2)"}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
                  </div>
                ))}
                <div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:6}}>
                  {cfg.rooms.map(r=>(
                    <span key={r.uid} style={{fontSize:11,padding:"3px 8px",borderRadius:12,background:"var(--bg)",border:"1px solid var(--border)"}}>
                      {r.name} ({r.size}מ"ר)
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{background:"#D1FAE5",border:"1px solid #6EE7B7",borderRadius:8,padding:"12px 16px",fontSize:13,color:"#065F46",display:"flex",gap:10,alignItems:"center"}}>
              <Icon n="check-circle" s={16} c="#065F46"/>
              הכל מוכן! לחץ "שמור" כדי לעדכן את האפליקציה לפי הגדרות הבית.
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <Btn variant="ghost" onClick={()=>setStep(s=>Math.max(0,s-1))} style={{visibility:step===0?"hidden":"visible"}}>
          <Icon n="arrow-right" s={14}/> הקודם
        </Btn>
        {step<STEPS.length-1
          ? <Btn onClick={()=>setStep(s=>s+1)}>הבא <Icon n="chevron-right" s={14}/></Btn>
          : <Btn onClick={()=>{ window.PROJECT_ROOMS=cfg.rooms; window.PROJECT_CFG=cfg; setSaved(true); }}>
              <Icon n="check" s={14}/> שמור הגדרות
            </Btn>
        }
      </div>
    </div>
  );
};

// ── ITEM CATALOG ─────────────────────────────────────────────────────────────

const CATALOG = {
  kitchen:[
    {name:"מקרר",           cat:"מכשירים",   unit:"יח'", qty:1},
    {name:"תנור בנוי",      cat:"מכשירים",   unit:"יח'", qty:1},
    {name:"מיקרוגל בנוי",  cat:"מכשירים",   unit:"יח'", qty:1},
    {name:"מדיח כלים",      cat:"מכשירים",   unit:"יח'", qty:1},
    {name:"מנדף / קולט אדים",cat:"מכשירים", unit:"יח'", qty:1},
    {name:"פח אשפה מובנה",  cat:"נגרות",     unit:"יח'", qty:1},
    {name:"ארון פינתי",     cat:"נגרות",     unit:"יח'", qty:1},
    {name:"מגירות תחתית",  cat:"נגרות",     unit:"יח'", qty:2},
    {name:"משטח עבודה גרניט",cat:"אינסטלציה",unit:'מ"ר', qty:2},
    {name:"מתקן כוסות",     cat:"נגרות",     unit:"יח'", qty:1},
    {name:"מייחם חשמלי שקוע",cat:"חשמל",    unit:"יח'", qty:1},
  ],
  living:[
    {name:"יחידת טלוויזיה", cat:"ריהוט",    unit:"יח'", qty:1},
    {name:"ספה פינתית",     cat:"ריהוט",    unit:"יח'", qty:1},
    {name:"שולחן קפה",      cat:"ריהוט",    unit:"יח'", qty:1},
    {name:"וילונות",        cat:"טקסטיל",   unit:"מ'",  qty:4},
    {name:"תריסים / רולו",  cat:"טקסטיל",   unit:"יח'", qty:2},
    {name:"מדף קיר",        cat:"נגרות",    unit:"יח'", qty:2},
    {name:"שטיח",           cat:"ריהוט",    unit:'מ"ר', qty:6},
    {name:"נקודת טלוויזיה", cat:"חשמל",     unit:"יח'", qty:1},
    {name:"רמקולים שקועים", cat:"חשמל",     unit:"יח'", qty:4},
    {name:"מערכת קולנוע",  cat:"חשמל",     unit:"יח'", qty:1},
  ],
  dining:[
    {name:"שולחן אוכל",     cat:"ריהוט",    unit:"יח'", qty:1},
    {name:"כיסאות אוכל",    cat:"ריהוט",    unit:"יח'", qty:6},
    {name:"שידת בופה",      cat:"ריהוט",    unit:"יח'", qty:1},
    {name:"וילונות",        cat:"טקסטיל",   unit:"מ'",  qty:3},
    {name:"שטיח",           cat:"ריהוט",    unit:'מ"ר', qty:4},
  ],
  master:[
    {name:"מיטה זוגית 180",  cat:"ריהוט",   unit:"יח'", qty:1},
    {name:"שידות (זוג)",     cat:"ריהוט",   unit:"יח'", qty:2},
    {name:"מנורת לילה",      cat:"תאורה",   unit:"יח'", qty:2},
    {name:"וילונות",         cat:"טקסטיל",  unit:"מ'",  qty:3},
    {name:"שטיח",            cat:"ריהוט",   unit:'מ"ר', qty:4},
    {name:"מראה מלאה",       cat:"ריהוט",   unit:"יח'", qty:1},
    {name:"נקודת טלוויזיה",  cat:"חשמל",    unit:"יח'", qty:1},
  ],
  bedroom:[
    {name:"מיטה יחיד / זוגי",cat:"ריהוט",  unit:"יח'", qty:1},
    {name:"שידה",             cat:"ריהוט",  unit:"יח'", qty:1},
    {name:"מנורת לילה",       cat:"תאורה",  unit:"יח'", qty:1},
    {name:"וילונות",          cat:"טקסטיל", unit:"מ'",  qty:2},
    {name:"שולחן כתיבה",      cat:"ריהוט",  unit:"יח'", qty:1},
    {name:"כיסא לימוד",       cat:"ריהוט",  unit:"יח'", qty:1},
    {name:"שטיח",             cat:"ריהוט",  unit:'מ"ר', qty:3},
  ],
  bathroom:[
    {name:"מראה מוארת",       cat:"אינסטלציה", unit:"יח'", qty:1},
    {name:"ארון אמבטיה תלוי", cat:"נגרות",     unit:"יח'", qty:1},
    {name:"מגבייה חשמלית",    cat:"חשמל",      unit:"יח'", qty:1},
    {name:"ווי מגבת",         cat:"אינסטלציה", unit:"יח'", qty:3},
    {name:"מגש סבון",         cat:"אינסטלציה", unit:"יח'", qty:1},
    {name:"נייר טואלט מחזיק", cat:"אינסטלציה", unit:"יח'", qty:1},
    {name:"מייבש שיער שקוע",  cat:"חשמל",      unit:"יח'", qty:1},
    {name:"שימוש מדפי זכוכית",cat:"נגרות",     unit:"יח'", qty:2},
  ],
  toilet:[
    {name:"מראה",             cat:"אינסטלציה", unit:"יח'", qty:1},
    {name:"מחזיק ניר",        cat:"אינסטלציה", unit:"יח'", qty:1},
    {name:"וו מגבת",          cat:"אינסטלציה", unit:"יח'", qty:1},
    {name:"ארוניות קטן",      cat:"נגרות",     unit:"יח'", qty:1},
  ],
  entrance:[
    {name:"ארון נעלים",       cat:"נגרות",  unit:"יח'", qty:1},
    {name:"קולב קיר",         cat:"נגרות",  unit:"יח'", qty:1},
    {name:"שידת כניסה",       cat:"ריהוט",  unit:"יח'", qty:1},
    {name:"מראה גדולה",       cat:"ריהוט",  unit:"יח'", qty:1},
    {name:"שטיח כניסה",       cat:"ריהוט",  unit:"יח'", qty:1},
  ],
  office:[
    {name:"שולחן עבודה",      cat:"ריהוט",  unit:"יח'", qty:1},
    {name:"כיסא משרדי",       cat:"ריהוט",  unit:"יח'", qty:1},
    {name:"ספרייה",           cat:"נגרות",  unit:"יח'", qty:1},
    {name:"מדפים",            cat:"נגרות",  unit:"יח'", qty:3},
    {name:"תאורת שולחן",      cat:"תאורה",  unit:"יח'", qty:1},
    {name:"נקודת טלפון",      cat:"חשמל",   unit:"יח'", qty:1},
  ],
  utility:[
    {name:"מכונת כביסה",      cat:"מכשירים", unit:"יח'", qty:1},
    {name:"מייבש כביסה",      cat:"מכשירים", unit:"יח'", qty:1},
    {name:"ארון אחסון",        cat:"נגרות",   unit:"יח'", qty:1},
    {name:"קרש גיהוץ",        cat:"ריהוט",   unit:"יח'", qty:1},
  ],
  balcony:[
    {name:"ריצוף חוץ",        cat:"ריצוף",   unit:'מ"ר', qty:0},
    {name:"גדר / מעקה",       cat:"בנייה",   unit:"מ'",  qty:0},
    {name:"ריהוט חוץ",        cat:"ריהוט",   unit:"יח'", qty:1},
    {name:"פרגולה",           cat:"בנייה",   unit:"יח'", qty:1},
    {name:"תאורת חוץ",        cat:"תאורה",   unit:"יח'", qty:2},
  ],
};

// Universal items for all rooms
const CATALOG_UNIVERSAL = [
  {name:"גלאי עשן",           cat:"בטיחות",  unit:"יח'", qty:1},
  {name:"גלאי גז",            cat:"בטיחות",  unit:"יח'", qty:1},
  {name:"מצלמת אבטחה",        cat:"בטיחות",  unit:"יח'", qty:1},
  {name:"נקודת אינטרנט",      cat:"חשמל",    unit:"יח'", qty:1},
  {name:"טלפון שקוע",         cat:"חשמל",    unit:"יח'", qty:1},
  {name:"נקודת טלוויזיה",     cat:"חשמל",    unit:"יח'", qty:1},
  {name:"תאורת חירום",        cat:"בטיחות",  unit:"יח'", qty:1},
  {name:"וילונות",            cat:"טקסטיל",  unit:"מ'",  qty:3},
  {name:"תריסים",             cat:"טקסטיל",  unit:"יח'", qty:1},
  {name:"שטיח",               cat:"ריהוט",   unit:'מ"ר', qty:4},
];

const getCatalogForRoom = (type) => {
  const specific = CATALOG[type] || [];
  return [...specific, ...CATALOG_UNIVERSAL];
};

// ── ADD ITEM WIDGET ─────────────────────────────────────────────────────────
const AddItemWidget = ({roomUid, roomType, existingItems, onAdd}) => {
  const {useState:us, useRef:ur, useEffect:ue} = React;
  const [open, setOpen] = us(false);
  const [query, setQuery] = us("");
  const [manualCat, setManualCat] = us("ריהוט");
  const [manualUnit, setManualUnit] = us("יח'");
  const [manualQty, setManualQty] = us(1);
  const [focused, setFocused] = us(false);
  const inputRef = ur(null);

  const catalog = getCatalogForRoom(roomType);
  const existingNames = existingItems.map(i=>i.name.trim().toLowerCase());

  // autocomplete suggestions
  const suggestions = query.length>=1
    ? catalog.filter(c=>c.name.includes(query) && !existingNames.includes(c.name.toLowerCase())).slice(0,8)
    : [];

  const quickAdds = catalog.filter(c=>!existingNames.includes(c.name.toLowerCase())).slice(0,12);

  const addFromCatalog = (item) => {
    onAdd({id:`cat_${Date.now()}_${Math.random()}`,cat:item.cat,name:item.name,qty:item.qty||1,unit:item.unit,userQty:item.qty||1});
    setQuery(""); setFocused(false);
  };

  const addManual = () => {
    if(!query.trim()) return;
    onAdd({id:`manual_${Date.now()}`,cat:manualCat,name:query.trim(),qty:Number(manualQty),unit:manualUnit,userQty:Number(manualQty)});
    setQuery(""); setManualQty(1);
  };

  const CATS = ["ריצוף","חיפוי קירות","תקרה","תאורה","חשמל","אינסטלציה","נגרות","מיזוג","מכשירים","ריהוט","טקסטיל","בטיחות","אחר"];
  const UNITS = ["יח'", 'מ"ר', "מ'", "קג", "ליטר", "ס\"מ"];

  if(!open) return (
    <button onClick={()=>{setOpen(true);setTimeout(()=>inputRef.current?.focus(),50)}} style={{width:"100%",padding:"10px",border:"2px dashed var(--border)",borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:"var(--text2)",fontFamily:"'Heebo',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .15s",marginTop:4}}
      onMouseEnter={e=>{e.target.style.borderColor="var(--accent)";e.target.style.color="var(--accent)"}}
      onMouseLeave={e=>{e.target.style.borderColor="var(--border)";e.target.style.color="var(--text2)"}}>
      <Icon n="plus" s={14}/> הוסף פריט
    </button>
  );

  return (
    <div style={{border:"1px solid var(--accent)",borderRadius:10,padding:14,marginTop:8,background:"#FFFBF8"}}>
      <div style={{fontWeight:600,fontSize:13,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
        <span>הוספת פריט</span>
        <button onClick={()=>{setOpen(false);setQuery("")}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",padding:0,display:"flex"}}><Icon n="x" s={14}/></button>
      </div>

      {/* Search / Autocomplete */}
      <div style={{position:"relative",marginBottom:12}}>
        <input ref={inputRef} className="bp-input" value={query} onChange={e=>setQuery(e.target.value)}
          onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),150)}
          placeholder="חפש פריט מהקטלוג או הקלד שם חדש..." style={{paddingRight:32}}/>
        <div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"var(--text3)"}}>
          <Icon n="zoom-in" s={14}/>
        </div>
        {focused && suggestions.length>0 && (
          <div style={{position:"absolute",top:"100%",right:0,left:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,boxShadow:"var(--shadow-lg)",zIndex:50,maxHeight:220,overflowY:"auto"}}>
            {suggestions.map((s,i)=>(
              <div key={i} onMouseDown={()=>addFromCatalog(s)} style={{padding:"8px 12px",cursor:"pointer",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--border)"}}
                onMouseEnter={e=>e.currentTarget.style.background="var(--bg)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span>{s.name}</span>
                <span style={{fontSize:11,color:"var(--text3)"}}>{s.cat} · {s.unit}</span>
              </div>
            ))}
          </div>
        )}
        {focused && query && suggestions.length===0 && (
          <div style={{position:"absolute",top:"100%",right:0,left:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,boxShadow:"var(--shadow-lg)",zIndex:50,padding:"10px 12px",fontSize:13,color:"var(--text2)"}}>
            לא נמצא בקטלוג — ניתן להוסיף ידנית
          </div>
        )}
      </div>

      {/* Manual form (shown when query exists and not in catalog) */}
      {query && (
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:"var(--text2)",whiteSpace:"nowrap"}}>הוסף: <strong>"{query}"</strong></span>
          <select className="bp-input" value={manualCat} onChange={e=>setManualCat(e.target.value)} style={{width:110,fontSize:12}}>
            {CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          <input type="number" className="bp-input" value={manualQty} onChange={e=>setManualQty(e.target.value)} style={{width:60,fontSize:12}} min={0}/>
          <select className="bp-input" value={manualUnit} onChange={e=>setManualUnit(e.target.value)} style={{width:70,fontSize:12}}>
            {UNITS.map(u=><option key={u}>{u}</option>)}
          </select>
          <Btn size="sm" onClick={addManual}><Icon n="plus" s={12}/> הוסף</Btn>
        </div>
      )}

      {/* Quick-add chips from catalog */}
      {!query && (
        <div>
          <div style={{fontSize:11,color:"var(--text3)",marginBottom:6,fontWeight:600}}>פריטים נפוצים לחדר זה:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {quickAdds.map((item,i)=>(
              <button key={i} onClick={()=>addFromCatalog(item)} style={{padding:"4px 10px",borderRadius:20,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",fontSize:12,fontFamily:"'Heebo',sans-serif",color:"var(--text1)",display:"flex",alignItems:"center",gap:4,transition:"all .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--accent)";e.currentTarget.style.color="var(--accent)";e.currentTarget.style.background="var(--accent-light)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--text1)";e.currentTarget.style.background="var(--surface)"}}>
                <Icon n="plus" s={11}/>{item.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── BOQ WIZARD SCREEN ─────────────────────────────────────────────────────────
const BOQWizardScreen = () => {
  const rooms = window.PROJECT_ROOMS || DEFAULT_ROOMS;
  const {fmtMoney} = window;
  const [idx, setIdx] = React.useState(0);
  const [view, setView] = React.useState("wizard"); // "wizard" | "import"
  const [allItems, setAllItems] = React.useState(() => {
    const init = {};
    rooms.forEach(r=>{ init[r.uid]=calcSmartItems(r); });
    return init;
  });
  const [completed, setCompleted] = React.useState(new Set());

  const room = rooms[idx];
  const items = room ? allItems[room.uid]||[] : [];

  const setQty = (roomUid, itemId, qty) => {
    setAllItems(prev=>({...prev,[roomUid]:prev[roomUid].map(i=>i.id===itemId?{...i,userQty:Math.max(0,Number(qty))}:i)}));
  };
  const addItem = (roomUid, item) => {
    setAllItems(prev=>({...prev,[roomUid]:[...prev[roomUid],item]}));
  };
  const removeItem = (roomUid, itemId) => {
    setAllItems(prev=>({...prev,[roomUid]:prev[roomUid].filter(i=>i.id!==itemId)}));
  };

  const markDone = () => {
    setCompleted(s=>new Set([...s,room.uid]));
    if(idx<rooms.length-1) setIdx(i=>i+1);
    else setView("import");
  };

  // Aggregate import list
  const importList = React.useMemo(()=>{
    const catMap = {};
    Object.entries(allItems).forEach(([uid,items])=>{
      const r = rooms.find(r=>r.uid===uid);
      if(!r) return;
      items.forEach(item=>{
        const key = `${item.cat}__${item.name}__${item.unit}`;
        if(!catMap[key]) catMap[key]={cat:item.cat,name:item.name,unit:item.unit,total:0,rooms:[]};
        if(item.userQty>0){
          catMap[key].total+=item.userQty;
          catMap[key].rooms.push({room:r.name,qty:item.userQty});
        }
      });
    });
    // Group by cat
    const byCat = {};
    Object.values(catMap).forEach(i=>{
      if(!byCat[i.cat]) byCat[i.cat]=[];
      byCat[i.cat].push(i);
    });
    return byCat;
  },[allItems,rooms]);

  const CAT_ORDER = ["ריצוף","חיפוי קירות","תקרה","תאורה","חשמל","אינסטלציה","נגרות","מיזוג","אחר"];

  if(view==="import") return (
    <div className="page-content">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{fontSize:20,fontWeight:800}}>רשימת יבוא מרוכזת</div>
          <div style={{fontSize:13,color:"var(--text2)",marginTop:2}}>כל הכמויות המאוחדות לפי קטגוריה — מוכן לרכישה</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" size="sm" onClick={()=>setView("wizard")}><Icon n="arrow-right" s={13}/> חזרה לאשף</Btn>
          <Btn size="sm"><Icon n="download" s={13}/> ייצוא PDF</Btn>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid-4" style={{marginBottom:20}}>
        {[
          {label:'סה"כ ריצוף',v:(importList["ריצוף"]||[]).reduce((a,i)=>a+i.total,0)+' מ"ר',c:"var(--accent)"},
          {label:"נקודות תאורה",v:(importList["תאורה"]||[]).reduce((a,i)=>a+i.total,0)+' יח\'',c:"var(--warning)"},
          {label:"שקעים",v:(importList["חשמל"]||[]).filter(i=>i.name.includes("שקע")).reduce((a,i)=>a+i.total,0)+' יח\'',c:"var(--success)"},
          {label:"חדרים שהוגדרו",v:`${rooms.length} חדרים`,c:"var(--text1)"},
        ].map(({label,v,c})=>(
          <div key={label} className="card" style={{padding:"16px 20px"}}>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:12,color:"var(--text2)",marginTop:4}}>{label}</div>
          </div>
        ))}
      </div>

      {CAT_ORDER.filter(cat=>importList[cat]?.length).map(cat=>(
        <div key={cat} className="card" style={{marginBottom:16}}>
          <div className="card-header" style={{display:"flex",justifyContent:"space-between"}}>
            <span>{cat}</span>
            <span style={{fontWeight:400,color:"var(--text3)",fontSize:12}}>{(importList[cat]||[]).length} פריטים</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table className="bp-table" style={{width:"100%"}}>
              <thead><tr><th>פריט</th><th>סה"כ</th><th>יחידה</th><th>פירוט לפי חדר</th></tr></thead>
              <tbody>
                {(importList[cat]||[]).map((item,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:500}}>{item.name}</td>
                    <td style={{fontWeight:800,fontSize:16,color:"var(--accent)"}}>{item.total}</td>
                    <td style={{color:"var(--text2)"}}>{item.unit}</td>
                    <td>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {item.rooms.map((r,ri)=>(
                          <span key={ri} style={{fontSize:11,padding:"2px 7px",background:"var(--bg)",borderRadius:10,border:"1px solid var(--border)",whiteSpace:"nowrap"}}>
                            {r.room}: {r.qty}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-content">
      <div style={{display:"flex",gap:20,alignItems:"flex-start"}}>
        {/* Room list sidebar */}
        <div style={{width:200,flexShrink:0,display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--text3)",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>חדרים</div>
          {rooms.map((r,i)=>{
            const rt = ROOM_TYPE_OPTS.find(x=>x.id===r.type);
            const done = completed.has(r.uid);
            return (
              <div key={r.uid} onClick={()=>setIdx(i)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,cursor:"pointer",
                background:idx===i?"var(--accent-light)":"var(--surface)",border:"1px solid",
                borderColor:idx===i?"var(--accent)":done?"#BBF7D0":"var(--border)",transition:"all .15s"}}>
                <div style={{width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                  background:done?"var(--success)":idx===i?"var(--accent)":"var(--border)"}}>
                  {done?<Icon n="check" s={11} c="#fff"/>:<span style={{fontSize:10,fontWeight:700,color:"#fff"}}>{i+1}</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:idx===i?"var(--accent)":done?"var(--success)":"var(--text1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                  <div style={{fontSize:10,color:"var(--text3)"}}>{r.size} מ"ר</div>
                </div>
              </div>
            );
          })}
          <div style={{marginTop:8,padding:"10px 12px",background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:8,fontSize:11,color:"var(--success)",textAlign:"center",cursor:"pointer"}} onClick={()=>setView("import")}>
            <Icon n="download" s={12} c="var(--success)"/> צפה ברשימת יבוא
          </div>
        </div>

        {/* Main area */}
        <div style={{flex:1,minWidth:0}}>
          {room && (
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div>
                  <div style={{fontSize:18,fontWeight:800}}>{room.name}</div>
                  <div style={{fontSize:13,color:"var(--text2)",marginTop:2}}>
                    {ROOM_TYPE_OPTS.find(r=>r.id===room.type)?.label} · קומה {room.floor} · {room.size} מ"ר
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn size="sm" onClick={markDone}>
                    <Icon n="check" s={13}/>{idx<rooms.length-1?"אישור ולחדר הבא":"סיום וצפייה ברשימה"}
                  </Btn>
                </div>
              </div>

              {/* Progress */}
              <div style={{marginBottom:16}}>
                <ProgressBar value={(idx+1)/rooms.length*100} height={4}/>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>{idx+1} / {rooms.length} חדרים</div>
              </div>

              {/* Items by category */}
              {[...new Set(items.map(i=>i.cat))].map(cat=>(
                <div key={cat} className="card" style={{marginBottom:12}}>
                  <div className="card-header" style={{fontSize:13,padding:"10px 16px",display:"flex",justifyContent:"space-between"}}>
                    <span>{cat}</span>
                    <span style={{fontWeight:400,color:"var(--text3)",fontSize:11}}>{items.filter(i=>i.cat===cat).length} פריטים</span>
                  </div>
                  <div style={{padding:"4px 0 8px"}}>
                    {items.filter(i=>i.cat===cat).map(item=>(
                      <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px",borderBottom:"1px solid var(--border)"}}>
                        <span style={{flex:1,fontSize:13}}>{item.name}</span>
                        {item.hint && <span style={{fontSize:11,color:"var(--text3)",flexShrink:0}}>{item.hint}</span>}
                        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          <button onClick={()=>setQty(room.uid,item.id,item.userQty-1)} style={{width:26,height:26,borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"var(--text2)",fontWeight:600}}>−</button>
                          <input type="number" value={item.userQty} onChange={e=>setQty(room.uid,item.id,e.target.value)} style={{width:54,textAlign:"center",border:"1px solid var(--border)",borderRadius:6,padding:"4px",fontSize:13,fontFamily:"'Heebo',sans-serif",outline:"none",direction:"ltr"}}/>
                          <button onClick={()=>setQty(room.uid,item.id,item.userQty+1)} style={{width:26,height:26,borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"var(--text2)",fontWeight:600}}>+</button>
                          <span style={{fontSize:12,color:"var(--text3)",width:32,flexShrink:0}}>{item.unit}</span>
                          <button onClick={()=>removeItem(room.uid,item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",padding:2,display:"flex",transition:"color .1s"}}
                            onMouseEnter={e=>e.currentTarget.style.color="var(--danger)"}
                            onMouseLeave={e=>e.currentTarget.style.color="#ccc"}>
                            <Icon n="x" s={13}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Add item widget */}
              <AddItemWidget
                roomUid={room.uid}
                roomType={room.type}
                existingItems={items}
                onAdd={item=>addItem(room.uid, item)}
              />

              {/* Nav buttons */}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                <Btn variant="ghost" onClick={()=>setIdx(i=>Math.max(0,i-1))} style={{visibility:idx===0?"hidden":"visible"}}>
                  <Icon n="arrow-right" s={14}/> חדר קודם
                </Btn>
                <Btn onClick={markDone}>
                  <Icon n="check" s={13}/>{idx<rooms.length-1?"אישור ולחדר הבא":"סיום וצפייה ברשימה"}
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ProjectSetupScreen, BOQWizardScreen, ROOM_TYPE_OPTS, DEFAULT_ROOMS });
