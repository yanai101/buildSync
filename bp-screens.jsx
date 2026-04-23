
// ── BuildPro SCREENS ─────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
const DashboardScreen = () => {
  const {PROJECT,STAGES,CONTRACTORS_DATA,BUDGET_CATS,fmtMoney,fmt} = window;
  const [showAllStages, setShowAllStages] = React.useState(false);
  const doneStages = STAGES.filter(s=>s.status==="done").length;
  const activeStage = STAGES.find(s=>s.status==="active");
  const totalSpent = BUDGET_CATS.reduce((a,c)=>a+c.spent,0);
  const totalBudget = BUDGET_CATS.reduce((a,c)=>a+c.budget,0);
  const alerts = [
    {type:"warning",text:"טיח חוץ לא הושלם — סיכון גשמי חורף",date:"היום"},
    {type:"warning",text:"קבלן ריצוף ממתין לחתימת חוזה",date:"לפני 2 ימים"},
    {type:"info",text:"תשלום לברק חשמל — ₪25,000 מגיע ב-01/11",date:"בעוד 3 ימים"},
  ];
  const recentActivity = [
    {role:"inspector",name:"רון לוי",text:"בדיקת טיח קומה ב' — עבר. ניתן להמשיך.",time:"לפני שעה"},
    {role:"manager",name:"אבי כהן",text:"צולמה התקדמות — 8 תמונות חדשות הועלו",time:"לפני 3 שעות"},
    {role:"contractor",name:"יעקב פרץ",text:"טיח פנים קומה ב' הושלם",time:"אתמול, 16:30"},
    {role:"owner",name:"יוסי רוזנברג",text:"אושרה בחירת ספק ריצוף — כרמל ריצוף",time:"אתמול, 11:00"},
  ];
  const rc = window.ROLE_COLORS;
  return (
    <div>
      {/* Alerts bar */}
      <div style={{background:"#FEF3C7",borderBottom:"1px solid #FDE68A",padding:"10px 28px",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        <Icon n="alert" s={16} c="#D97706"/>
        <span style={{fontSize:13,color:"#92400E",fontWeight:500}}>{alerts[0].text}</span>
        <span style={{fontSize:12,color:"#B45309",marginRight:"auto"}}>{alerts[0].date}</span>
        <span style={{fontSize:12,color:"#B45309",cursor:"pointer",textDecoration:"underline"}}>ראה הכל ({alerts.length})</span>
      </div>

      <div className="page-content">
        {/* Stats row */}
        <div className="grid-4" style={{marginBottom:24}}>
          <StatCard label="התקדמות כוללת" value={`${PROJECT.progress}%`} sub={`שלב נוכחי: ${PROJECT.currentStage}`} accent="var(--accent)" icon="layers"/>
          <StatCard label="תקציב שנוצל" value={fmtMoney(totalSpent)} sub={`מתוך ${fmtMoney(totalBudget)}`} icon="chart"/>
          <StatCard label="שלבים שהושלמו" value={`${doneStages}/14`} sub={`${14-doneStages} שלבים נותרו`} accent="var(--success)" icon="check-circle"/>
          <StatCard label="קבלנים פעילים" value={CONTRACTORS_DATA.filter(c=>c.status==="active").length} sub="מתוך 6 קבלנים" icon="users"/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
          {/* Left col */}
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            {/* Progress */}
            <div className="card">
              <div className="card-header">התקדמות פרויקט</div>
              <div className="card-body" style={{paddingTop:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:600}}>סה"כ</span>
                  <span style={{fontSize:18,fontWeight:800,color:"var(--accent)"}}>{PROJECT.progress}%</span>
                </div>
                <ProgressBar value={PROJECT.progress} height={10}/>
                <div style={{marginTop:20,display:"flex",flexDirection:"column",gap:8}}>
                  {(showAllStages ? STAGES : STAGES.slice(0,7)).map(s=>(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:120,fontSize:12,color:s.status==="active"?"var(--text1)":"var(--text2)",fontWeight:s.status==="active"?600:400,textAlign:"right",flexShrink:0}}>{s.name}</div>
                      <div style={{flex:1}}><ProgressBar value={s.progress} color={s.status==="done"?"var(--success)":s.status==="active"?"var(--accent)":"var(--border)"} height={5}/></div>
                      <Badge type={s.status}/>
                    </div>
                  ))}
                  <button onClick={()=>setShowAllStages(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"var(--accent)",fontFamily:"'Heebo',sans-serif",fontWeight:600,padding:"4px 0",textAlign:"center",width:"100%"}}>
                    {showAllStages ? "הסתר שלבים ▲" : `הצג את כל ${STAGES.length} השלבים ▼`}
                  </button>
                </div>
              </div>
            </div>

            {/* Budget overview */}
            <div className="card">
              <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>תקציב ותשלומים</span>
                <span style={{fontSize:12,color:"var(--text3)",fontWeight:400}}>עודף: {fmtMoney(totalBudget-totalSpent)}</span>
              </div>
              <div className="card-body" style={{paddingTop:12}}>
                <div style={{display:"flex",gap:24,marginBottom:16}}>
                  {[{label:"תקציב",v:totalBudget,c:"var(--text1)"},{label:"הוצא",v:totalSpent,c:"var(--accent)"},{label:"מחויב",v:PROJECT.committed,c:"var(--warning)"}].map(x=>(
                    <div key={x.label}>
                      <div style={{fontSize:20,fontWeight:800,color:x.c}}>{fmtMoney(x.v)}</div>
                      <div style={{fontSize:12,color:"var(--text2)"}}>{x.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{height:12,background:"var(--border)",borderRadius:6,overflow:"hidden",display:"flex"}}>
                  <div style={{width:`${totalSpent/totalBudget*100}%`,background:"var(--accent)",transition:"width .4s"}}/>
                  <div style={{width:`${PROJECT.committed/totalBudget*100}%`,background:"#FDE68A"}}/>
                </div>
                <div style={{display:"flex",gap:16,marginTop:8,fontSize:11,color:"var(--text3)"}}>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:"var(--accent)",display:"inline-block"}}/> הוצא {(totalSpent/totalBudget*100).toFixed(1)}%</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:"#FDE68A",display:"inline-block"}}/> מחויב {(PROJECT.committed/totalBudget*100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            {/* Project info */}
            <div className="card">
              <div className="card-header">פרטי פרויקט</div>
              <div className="card-body" style={{paddingTop:12}}>
                {[["שם הפרויקט",PROJECT.name],["כתובת",PROJECT.address],["בעל הבית",PROJECT.owner],["בעל בנייה",PROJECT.manager],["מפקח",PROJECT.inspector],["תחילת עבודה",PROJECT.startDate],["סיום צפוי",PROJECT.expectedEnd]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                    <span style={{color:"var(--text2)"}}>{k}</span>
                    <span style={{fontWeight:500}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div className="card">
              <div className="card-header">פעילות אחרונה</div>
              <div style={{padding:"0 0 4px"}}>
                {recentActivity.map((a,i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"10px 16px",borderBottom:i<recentActivity.length-1?"1px solid var(--border)":"none"}}>
                    <Avatar letter={a.name[0]} color={rc[a.role]} size={30}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:"var(--text1)"}}>{a.name}</div>
                      <div style={{fontSize:12,color:"var(--text2)",marginTop:2,textWrap:"pretty"}}>{a.text}</div>
                      <div style={{fontSize:11,color:"var(--text3)",marginTop:3}}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// STAGES
// ═══════════════════════════════════════════════
const StagesScreen = () => {
  const {STAGES} = window;
  const [stages,setStages] = React.useState(STAGES.map(s=>({...s,tasks:[...s.tasks.map(t=>({...t}))]})));
  const [open,setOpen] = React.useState(null);

  const toggleTask = (stageId, taskId) => {
    setStages(prev=>prev.map(s=>{
      if(s.id!==stageId) return s;
      const tasks = s.tasks.map(t=>t.id===taskId?{...t,done:!t.done}:t);
      const progress = Math.round(tasks.filter(t=>t.done).length/tasks.length*100);
      const status = progress===100?"done":progress>0?"active":"pending";
      return {...s,tasks,progress,status};
    }));
  };

  return (
    <div className="page-content">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:13,color:"var(--text2)"}}>
          {stages.filter(s=>s.status==="done").length} / {stages.length} שלבים הושלמו
        </div>
        <Btn size="sm"><Icon n="plus" s={14}/> שלב חדש</Btn>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {stages.map((s,idx)=>(
          <div key={s.id} className="card" style={{overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer"}} onClick={()=>setOpen(open===s.id?null:s.id)}>
              <div style={{width:28,height:28,borderRadius:"50%",background:s.status==="done"?"#D1FAE5":s.status==="active"?"var(--accent-light)":"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {s.status==="done"
                  ?<Icon n="check" s={14} c="var(--success)"/>
                  :<span style={{fontSize:11,fontWeight:700,color:s.status==="active"?"var(--accent)":"var(--text3)"}}>{idx+1}</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:14}}>{s.name}</span>
                  <Badge type={s.status}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1,maxWidth:200}}><ProgressBar value={s.progress} color={s.status==="done"?"var(--success)":s.status==="active"?"var(--accent)":"var(--border)"} height={4}/></div>
                  <span style={{fontSize:11,color:"var(--text3)",whiteSpace:"nowrap"}}>{s.progress}%</span>
                  <span style={{fontSize:11,color:"var(--text3)",whiteSpace:"nowrap"}}>{s.tasks.filter(t=>t.done).length}/{s.tasks.length} משימות</span>
                </div>
              </div>
              <div style={{textAlign:"left",fontSize:11,color:"var(--text3)",whiteSpace:"nowrap",display:"flex",flexDirection:"column",gap:2}}>
                <span>{s.start?.slice(5).replace("-","/")}</span>
                <span>{s.end?.slice(5).replace("-","/")}</span>
              </div>
              <Icon n="chevron-down" s={16} c="var(--text3)"/>
            </div>

            {open===s.id && (
              <div style={{borderTop:"1px solid var(--border)",background:"#FAFAF8",padding:"12px 16px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontSize:12,color:"var(--text2)",fontWeight:600}}>קבלן: {s.contractor}</span>
                  <span style={{fontSize:12,color:"var(--text3)"}}>{s.start} — {s.end}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {s.tasks.map(t=>(
                    <label key={t.id} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"6px 8px",borderRadius:6,background:t.done?"#F0FDF4":"var(--surface)",border:"1px solid",borderColor:t.done?"#BBF7D0":"var(--border)"}}>
                      <input type="checkbox" checked={t.done} onChange={()=>toggleTask(s.id,t.id)} style={{accentColor:"var(--success)",width:14,height:14,cursor:"pointer"}}/>
                      <span style={{fontSize:13,flex:1,textDecoration:t.done?"line-through":"none",color:t.done?"var(--text3)":"var(--text1)"}}>{t.name}</span>
                      <span style={{fontSize:11,color:"var(--text3)"}}>{t.assignee}</span>
                    </label>
                  ))}
                </div>
                <div style={{marginTop:12,display:"flex",gap:8}}>
                  <Btn size="sm" variant="ghost"><Icon n="camera" s={13}/> תמונות</Btn>
                  <Btn size="sm" variant="ghost"><Icon n="message" s={13}/> הערה</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// CONTRACTORS
// ═══════════════════════════════════════════════

const DEFAULT_PAYMENT_SCHEDULES = {
  "קבלן שלד": [
    {name:"מקדמה לפני התחלה",       pct:20, trigger:"לפני תחילת עבודה"},
    {name:"אחרי יציקת יסודות",      pct:20, trigger:"אחרי יסודות ובטון כושי"},
    {name:"אחרי סיום קומה א'",      pct:20, trigger:"שלד קומה א' + תקרה"},
    {name:"אחרי סיום שלד מלא",      pct:25, trigger:"גמר שלד כל הקומות"},
    {name:"תשלום סופי",             pct:15, trigger:"בדיקת מפקח + אישור"},
  ],
  "קבלן עפר": [
    {name:"מקדמה",                  pct:30, trigger:"לפני תחילת עבודה"},
    {name:"אחרי חפירה",             pct:40, trigger:"סיום חפירה"},
    {name:"סיום",                   pct:30, trigger:"אחרי פינוי שטח"},
  ],
  "קבלן טיח": [
    {name:"מקדמה",                  pct:25, trigger:"לפני תחילת עבודה"},
    {name:"אחרי טיח פנים קומה א'", pct:25, trigger:"אחרי בדיקת מפקח"},
    {name:"אחרי טיח פנים קומה ב'", pct:25, trigger:"אחרי בדיקת מפקח"},
    {name:"אחרי טיח חוץ + גמר",    pct:25, trigger:"סיום ואישור מפקח"},
  ],
  "חשמלאי ראשי": [
    {name:"מקדמה",                  pct:20, trigger:"לפני תחילת עבודה"},
    {name:"אחרי גולמי",             pct:30, trigger:"הטמנת צינורות ולוח"},
    {name:"אחרי עדין — תאורה",     pct:30, trigger:"נקודות תאורה ושקעים"},
    {name:"סיום ובדיקה",            pct:20, trigger:"בדיקת חשמלאי מוסמך"},
  ],
  "אינסטלטור": [
    {name:"מקדמה",                  pct:20, trigger:"לפני תחילת עבודה"},
    {name:"אחרי גולמי",             pct:35, trigger:"צנרת מים וביוב"},
    {name:"אחרי עדין",              pct:30, trigger:"כלים סניטריים + ברזים"},
    {name:"סיום ובדיקה",            pct:15, trigger:"בדיקת לחץ ואיטום"},
  ],
  "קבלן עד מפתח": [
    {name:"מקדמה לפני התחלה",         pct:10, trigger:"חתימת חוזה + ערבות בנקאית"},
    {name:"אחרי יסודות ושלד",          pct:20, trigger:"שלד מלא + אישור מפקח קונסטרוקציה"},
    {name:"אחרי גג וחיפוי חיצוני",    pct:10, trigger:"איטום גג + חיפוי אבן חיצוני"},
    {name:"אחרי אינסטלציה וחשמל גולמי",pct:15, trigger:"צנרת + חשמל גולמי + אישור מפקח"},
    {name:"אחרי טיח ופנים",            pct:15, trigger:"טיח פנים וחוץ + אישור מפקח"},
    {name:"אחרי ריצוף וחיפוי",         pct:10, trigger:"ריצוף + חיפויים + אישור מפקח"},
    {name:"אחרי נגרות וגבס",           pct:10, trigger:"ארונות + תקרות גבס + דלתות"},
    {name:"אחרי צביעה וגמרים",         pct:7,  trigger:"צביעה + חשמל עדין + אינסטלציה עדינה"},
    {name:"מסירה סופית + טופס 4",      pct:3,  trigger:"טופס 4 + בדיקות גמר + מפתח ביד"},
  ],
  "קבלן ריצוף": [
    {name:"מקדמה + חומרים",         pct:30, trigger:"לפני תחילת עבודה"},
    {name:"אחרי ריצוף קומה א'",    pct:30, trigger:"אחרי בדיקת מפקח"},
    {name:"אחרי ריצוף קומה ב'",    pct:25, trigger:"אחרי בדיקת מפקח"},
    {name:"גמר + חיפויים",          pct:15, trigger:"סיום ואישור"},
  ],
};

const DEFAULT_SCHEDULE = [
  {name:"מקדמה לפני התחלה",  pct:30, trigger:"לפני תחילת עבודה"},
  {name:"תשלום ביניים א'",  pct:25, trigger:"אחרי 30% מהעבודה"},
  {name:"תשלום ביניים ב'",  pct:25, trigger:"אחרי 70% מהעבודה"},
  {name:"תשלום סופי",        pct:20, trigger:"סיום ואישור מפקח"},
];

const PaymentSchedule = ({contractor, fmtMoney}) => {
  const base = DEFAULT_PAYMENT_SCHEDULES[contractor.role] || DEFAULT_SCHEDULE;
  const [milestones, setMilestones] = React.useState(() =>
    base.map((m,i) => ({
      ...m, id:i+1,
      amount: Math.round(contractor.budget * m.pct / 100),
      paid: contractor.paid >= contractor.budget * (base.slice(0,i+1).reduce((a,x)=>a+x.pct,0)/100),
      date: null,
    }))
  );
  const [adding, setAdding] = React.useState(false);
  const [newM, setNewM] = React.useState({name:"", pct:10, trigger:""});

  const totalPaid = milestones.filter(m=>m.paid).reduce((a,m)=>a+m.amount,0);
  const totalPct  = milestones.filter(m=>m.paid).reduce((a,m)=>a+m.pct,0);

  const toggle = (id) => setMilestones(prev=>prev.map(m=>m.id===id?{...m,paid:!m.paid,date:!m.paid?new Date().toLocaleDateString('he-IL'):null}:m));

  const addMilestone = () => {
    if(!newM.name) return;
    setMilestones(prev=>[...prev,{...newM,id:Date.now(),amount:Math.round(contractor.budget*newM.pct/100),paid:false,date:null}]);
    setNewM({name:"",pct:10,trigger:""});
    setAdding(false);
  };

  const recalcAmounts = (ms) => {
    const total = ms.reduce((a,m)=>a+m.pct,0);
    return ms.map(m=>({...m,amount:Math.round(contractor.budget*m.pct/100)}));
  };

  return (
    <div className="card">
      <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>לוח תשלומים</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:12,color:"var(--text3)",fontWeight:400}}>שולם: {totalPct}% · {fmtMoney(totalPaid)}</span>
          <Btn size="sm" onClick={()=>setAdding(v=>!v)}><Icon n="plus" s={12}/> שלב תשלום</Btn>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{padding:"10px 18px 0"}}>
        <div style={{height:8,background:"var(--border)",borderRadius:4,overflow:"hidden",display:"flex"}}>
          {milestones.map((m,i)=>(
            <div key={m.id} style={{width:`${m.pct}%`,background:m.paid?"var(--success)":"transparent",borderLeft:i>0?"1px solid var(--bg)":""}} title={`${m.name}: ${m.pct}%`}/>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text3)",marginTop:4}}>
          <span>₪0</span><span>{fmtMoney(contractor.budget)}</span>
        </div>
      </div>

      {/* Milestones */}
      <div style={{overflowX:"auto"}}>
        <table className="bp-table" style={{width:"100%"}}>
          <thead><tr><th>#</th><th>שלב תשלום</th><th>תנאי לתשלום</th><th>%</th><th>סכום</th><th>תאריך</th><th>סטטוס</th></tr></thead>
          <tbody>
            {milestones.map((m,i)=>(
              <tr key={m.id} style={{background:m.paid?"#F0FDF4":"transparent"}}>
                <td style={{fontSize:12,color:"var(--text3)",fontWeight:700}}>{i+1}</td>
                <td style={{fontWeight:500,fontSize:13}}>{m.name}</td>
                <td style={{fontSize:12,color:"var(--text2)"}}>{m.trigger}</td>
                <td style={{fontSize:13,fontWeight:600}}>{m.pct}%</td>
                <td style={{fontSize:13,fontWeight:700,color:m.paid?"var(--success)":"var(--text1)"}}>{fmtMoney(m.amount)}</td>
                <td style={{fontSize:12,color:"var(--text3)"}}>{m.date||"—"}</td>
                <td>
                  <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                    <input type="checkbox" checked={m.paid} onChange={()=>toggle(m.id)} style={{accentColor:"var(--success)",width:14,height:14}}/>
                    <span className={`badge ${m.paid?"badge-done":"badge-pending"}`}>{m.paid?"שולם":"ממתין"}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{background:"#F9F8F6"}}>
              <td colSpan={3} style={{padding:"10px 12px",fontSize:13,fontWeight:700}}>סה"כ</td>
              <td style={{fontSize:13,fontWeight:700}}>{milestones.reduce((a,m)=>a+m.pct,0)}%</td>
              <td style={{fontSize:13,fontWeight:700}}>{fmtMoney(milestones.reduce((a,m)=>a+m.amount,0))}</td>
              <td/>
              <td style={{fontSize:12,color:"var(--success)",fontWeight:600}}>{fmtMoney(totalPaid)} שולם</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add milestone form */}
      {adding && (
        <div style={{margin:"12px 18px",padding:14,background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>שלב תשלום חדש</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:2,minWidth:140}}>
              <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>שם השלב</div>
              <input className="bp-input" value={newM.name} onChange={e=>setNewM(n=>({...n,name:e.target.value}))} placeholder="לדוגמה: אחרי ריצוף קומה ב'"/>
            </div>
            <div style={{flex:2,minWidth:140}}>
              <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>תנאי לתשלום</div>
              <input className="bp-input" value={newM.trigger} onChange={e=>setNewM(n=>({...n,trigger:e.target.value}))} placeholder="מה צריך להיות מוכן?"/>
            </div>
            <div style={{flex:"0 0 80px"}}>
              <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>אחוז %</div>
              <input className="bp-input" type="number" value={newM.pct} onChange={e=>setNewM(n=>({...n,pct:Number(e.target.value)}))} min={1} max={100}/>
            </div>
            <div style={{fontSize:12,color:"var(--text2)",alignSelf:"center",paddingBottom:2}}>
              = {fmtMoney(Math.round(contractor.budget*newM.pct/100))}
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={addMilestone}><Icon n="plus" s={13}/> הוסף</Btn>
              <Btn variant="ghost" onClick={()=>setAdding(false)}>ביטול</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ContractorRoles = [
  "קבלן עד מפתח","קבלן שלד","קבלן עפר","קבלן טיח","חשמלאי ראשי",
  "אינסטלטור","קבלן ריצוף","קבלן גג","קבלן גבס","קבלן נגרות","צבעי","קבלן גינה","אחר"
];

const ContractorsScreen = () => {
  const {CONTRACTORS_DATA, fmtMoney} = window;
  const [contractors, setContractors] = React.useState(CONTRACTORS_DATA);
  const [selected, setSelected] = React.useState(null);
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState({name:"",company:"",role:"קבלן עד מפתח",phone:"",email:"",budget:0});
  const c = selected;

  if(c) return (
    <div className="page-content">
      <button onClick={()=>setSelected(null)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text2)",fontSize:13,marginBottom:16,padding:0}}>
        <Icon n="arrow-right" s={14}/> חזרה לרשימה
      </button>
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:20}}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div className="card" style={{padding:20,textAlign:"center"}}>
            <Avatar letter={c.avatar} color={c.color} size={64} />
            <div style={{fontWeight:700,fontSize:17,marginTop:12}}>{c.name}</div>
            <div style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{c.company}</div>
            <div style={{marginTop:8}}><Badge type={c.status}/></div>
            <div style={{marginTop:8}}><Stars rating={c.rating}/></div>
          </div>
          <div className="card card-body">
            {[[<Icon n="phone" s={14}/>,c.phone],[<Icon n="mail" s={14}/>,c.email]].map(([icon,val],i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i===0?"1px solid var(--border)":"none",fontSize:13}}>
                <span style={{color:"var(--text3)"}}>{icon}</span>{val}
              </div>
            ))}
          </div>
          <div className="card card-body">
            <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>סיכום תשלומים</div>
            {[["תקציב מוסכם",fmtMoney(c.budget)],["שולם",fmtMoney(c.paid)],["יתרה",fmtMoney(c.budget-c.paid)]].map(([k,v],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderBottom:i<2?"1px solid var(--border)":"none"}}>
                <span style={{color:"var(--text2)"}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:10}}><ProgressBar value={c.budget?c.paid/c.budget*100:0} color="var(--success)" height={5}/></div>
            <div style={{fontSize:11,color:"var(--text3)",marginTop:4,textAlign:"left"}}>{c.budget?Math.round(c.paid/c.budget*100):0}% שולם</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <PaymentSchedule contractor={c} fmtMoney={fmtMoney}/>
          <div className="card">
            <div className="card-header">הערות ותיעוד</div>
            <div className="card-body" style={{color:"var(--text3)",fontSize:13}}>אין הערות עדיין.</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-content">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:13,color:"var(--text2)"}}>{contractors.length} קבלנים בפרויקט</div>
        <Btn size="sm" onClick={()=>setAdding(true)}><Icon n="plus" s={14}/> קבלן חדש</Btn>
      </div>

      {/* Turnkey banner */}
      {contractors.some(c=>c.role==="קבלן עד מפתח") && (
        <div style={{background:"#EEF2FF",border:"1px solid #C7D2FE",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#3730A3",display:"flex",alignItems:"center",gap:8}}>
          <Icon n="check-circle" s={14} c="#3730A3"/>
          יש בפרויקט קבלן עד מפתח — לוח התשלומים שלו מחובר לשלבי הבנייה
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
        {contractors.map(c=>(
          <div key={c.id} className="card" style={{padding:20,cursor:"pointer",transition:"box-shadow .15s"}} onClick={()=>setSelected(c)}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--shadow-lg)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--shadow)"}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <Avatar letter={c.avatar||c.name[0]} color={c.color}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:12,color:"var(--text2)"}}>{c.role}</div>
              </div>
              <div style={{marginRight:"auto"}}><Badge type={c.status}/></div>
            </div>
            {c.role==="קבלן עד מפתח" && (
              <div style={{fontSize:11,background:"#EEF2FF",color:"#3730A3",borderRadius:4,padding:"2px 6px",marginBottom:8,display:"inline-block",fontWeight:600}}>עד מפתח · 9 שלבים</div>
            )}
            <div style={{fontSize:12,color:"var(--text3)",marginBottom:10}}>{c.company}</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:"var(--text2)"}}>תקציב</span>
              <span style={{fontSize:12,fontWeight:600}}>{fmtMoney(c.budget)}</span>
            </div>
            <ProgressBar value={c.budget?c.paid/c.budget*100:0} color="var(--success)" height={4}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"var(--text3)"}}>
              <span>שולם: {fmtMoney(c.paid)}</span>
              <Stars rating={c.rating}/>
            </div>
          </div>
        ))}
      </div>

      {/* Add contractor modal */}
      {adding && (
        <Modal onClose={()=>setAdding(false)} title="הוספת קבלן חדש" width={520}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>סוג קבלן</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:4}}>
                {ContractorRoles.map(r=>(
                  <button key={r} onClick={()=>setForm(f=>({...f,role:r}))} style={{padding:"5px 10px",borderRadius:20,border:"1px solid",borderColor:form.role===r?"var(--accent)":"var(--border)",background:form.role===r?"var(--accent-light)":"var(--surface)",color:form.role===r?"var(--accent)":"var(--text2)",fontSize:12,cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:form.role===r?700:400,transition:"all .12s"}}>
                    {r}
                  </button>
                ))}
              </div>
              {form.role==="קבלן עד מפתח" && (
                <div style={{fontSize:11,color:"#3730A3",background:"#EEF2FF",borderRadius:6,padding:"6px 10px",marginTop:4}}>
                  לוח תשלומים של 9 שלבים לפי התקדמות הבנייה יוגדר אוטומטית
                </div>
              )}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["name","שם הקבלן"],["company","שם חברה"],["phone","טלפון"],["email","אימייל"]].map(([k,label])=>(
                <div key={k}>
                  <div style={{fontSize:12,color:"var(--text2)",marginBottom:3,fontWeight:500}}>{label}</div>
                  <input className="bp-input" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:3,fontWeight:500}}>תקציב מוסכם (₪)</div>
                <input className="bp-input" type="number" value={form.budget} onChange={e=>setForm(f=>({...f,budget:Number(e.target.value)}))}/>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
              <Btn variant="ghost" onClick={()=>setAdding(false)}>ביטול</Btn>
              <Btn onClick={()=>{
                if(!form.name) return;
                const colors=["#7B9B8A","#8B7B5A","#7B8FA1","#E07A38","#6B8B6B","#8B5A5A","#5A5A8B"];
                setContractors(prev=>[...prev,{...form,id:Date.now(),status:"pending",rating:0,paid:0,avatar:form.name[0],color:colors[prev.length%colors.length]}]);
                setAdding(false);
                setForm({name:"",company:"",role:"קבלן עד מפתח",phone:"",email:"",budget:0});
              }}>
                <Icon n="plus" s={13}/> הוסף קבלן
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// BOQ — Bill of Quantities
// ═══════════════════════════════════════════════
const BOQScreen = () => {
  const {ROOMS_LIST, BOQ_DATA, fmtMoney} = window;
  const [room,setRoom] = React.useState("living");
  const [items,setItems] = React.useState(BOQ_DATA);
  const [adding,setAdding] = React.useState(false);
  const [form,setForm] = React.useState({name:"",cat:"ריצוף",qty:1,unit:"יח'",unitPrice:0,supplier:"",spec:"",status:"pending"});

  const roomItems = items[room]||[];
  const total = roomItems.reduce((a,i)=>a+i.qty*i.unitPrice,0);
  const allTotal = Object.values(items).flat().reduce((a,i)=>a+i.qty*i.unitPrice,0);

  const addItem = () => {
    if(!form.name) return;
    setItems(prev=>({...prev,[room]:[...prev[room],{...form,id:Date.now(),qty:Number(form.qty),unitPrice:Number(form.unitPrice)}]}));
    setForm({name:"",cat:"ריצוף",qty:1,unit:"יח'",unitPrice:0,supplier:"",spec:"",status:"pending"});
    setAdding(false);
  };

  const toggleStatus = (id) => {
    setItems(prev=>({...prev,[room]:prev[room].map(i=>i.id===id?{...i,status:i.status==="approved"?"pending":"approved"}:i)}));
  };

  const cats = [...new Set(roomItems.map(i=>i.cat))];

  return (
    <div className="page-content">
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <select className="bp-input" value={room} onChange={e=>setRoom(e.target.value)} style={{width:"auto",minWidth:180}}>
          {ROOMS_LIST.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <span style={{fontSize:13,color:"var(--text2)"}}>סה"כ חדר: <strong>{fmtMoney(total)}</strong></span>
        <span style={{fontSize:13,color:"var(--text3)"}}>| כלל הבית: <strong>{fmtMoney(allTotal)}</strong></span>
        <div style={{marginRight:"auto",display:"flex",gap:8}}>
          <Btn size="sm" variant="ghost"><Icon n="download" s={13}/> ייצוא PDF</Btn>
          <Btn size="sm" onClick={()=>setAdding(true)}><Icon n="plus" s={13}/> פריט חדש</Btn>
        </div>
      </div>

      {adding && (
        <div className="card" style={{padding:16,marginBottom:16,border:"2px solid var(--accent)"}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>הוספת פריט חדש — {ROOMS_LIST.find(r=>r.id===room)?.name}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
            {[["name","שם פריט"],["cat","קטגוריה"],["qty","כמות"],["unit","יחידה"],["unitPrice","מחיר ליח'"],["supplier","ספק"],["spec","מפרט טכני"]].map(([k,label])=>(
              <div key={k}>
                <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>{label}</div>
                <input className="bp-input" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{width:"100%"}}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,display:"flex",gap:8}}>
            <Btn onClick={addItem}>שמור</Btn>
            <Btn variant="ghost" onClick={()=>setAdding(false)}>ביטול</Btn>
          </div>
        </div>
      )}

      {roomItems.length === 0
        ? <div className="card card-body" style={{textAlign:"center",color:"var(--text3)",padding:40}}>אין פריטים עדיין. לחץ "פריט חדש" להוסיף.</div>
        : cats.map(cat=>(
          <div key={cat} className="card" style={{marginBottom:16}}>
            <div className="card-header" style={{fontSize:13,display:"flex",justifyContent:"space-between"}}>
              <span>{cat}</span>
              <span style={{fontWeight:400,color:"var(--text3)"}}>{fmtMoney(roomItems.filter(i=>i.cat===cat).reduce((a,i)=>a+i.qty*i.unitPrice,0))}</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table className="bp-table" style={{width:"100%",minWidth:600}}>
                <thead><tr><th>פריט</th><th>כמות</th><th>יחידה</th><th>מחיר/יח'</th><th>סה"כ</th><th>ספק</th><th>מפרט</th><th>סטטוס</th></tr></thead>
                <tbody>
                  {roomItems.filter(i=>i.cat===cat).map(item=>(
                    <tr key={item.id}>
                      <td style={{fontWeight:500,fontSize:13}}>{item.name}</td>
                      <td style={{fontSize:13}}>{item.qty}</td>
                      <td style={{fontSize:13,color:"var(--text3)"}}>{item.unit}</td>
                      <td style={{fontSize:13}}>{fmtMoney(item.unitPrice)}</td>
                      <td style={{fontSize:13,fontWeight:600}}>{fmtMoney(item.qty*item.unitPrice)}</td>
                      <td style={{fontSize:12,color:"var(--text2)"}}>{item.supplier}</td>
                      <td style={{fontSize:11,color:"var(--text3)",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.spec}</td>
                      <td><span style={{cursor:"pointer"}} onClick={()=>toggleStatus(item.id)}><Badge type={item.status}/></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      }
      <div style={{background:"var(--surface)",borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"flex-end",gap:24,fontSize:14,border:"1px solid var(--border)"}}>
        <span style={{color:"var(--text2)"}}>סה"כ {ROOMS_LIST.find(r=>r.id===room)?.name}</span>
        <span style={{fontWeight:800,fontSize:16}}>{fmtMoney(total)}</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// PHOTOS
// ═══════════════════════════════════════════════
const PhotosScreen = () => {
  const {PHOTOS_DATA} = window;
  const [photos,setPhotos] = React.useState(PHOTOS_DATA);
  const [selected,setSelected] = React.useState(null);
  const [filter,setFilter] = React.useState("הכל");
  const [drawMode,setDrawMode] = React.useState("pen");
  const [drawColor,setDrawColor] = React.useState("#FF3B30");
  const [noteText,setNoteText] = React.useState("");
  const canvasRef = React.useRef(null);
  const drawing = React.useRef(false);
  const lastPos = React.useRef(null);

  const tags = ["הכל","התקדמות","בעיה","בדיקה","אישור"];
  const filtered = filter==="הכל"?photos:photos.filter(p=>p.tag===filter);

  const startDraw = (e) => {
    drawing.current=true;
    const r=canvasRef.current.getBoundingClientRect();
    lastPos.current={x:e.clientX-r.left,y:e.clientY-r.top};
  };
  const doDraw = (e) => {
    if(!drawing.current||!canvasRef.current) return;
    const r=canvasRef.current.getBoundingClientRect();
    const x=e.clientX-r.left,y=e.clientY-r.top;
    const ctx=canvasRef.current.getContext("2d");
    ctx.strokeStyle=drawColor; ctx.lineWidth=3; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(lastPos.current.x,lastPos.current.y); ctx.lineTo(x,y); ctx.stroke();
    lastPos.current={x,y};
  };
  const endDraw = () => { drawing.current=false; };
  const clearCanvas = () => { const c=canvasRef.current; if(c) c.getContext("2d").clearRect(0,0,c.width,c.height); };

  const addNote = () => {
    if(!noteText||!selected) return;
    setPhotos(prev=>prev.map(p=>p.id===selected.id?{...p,notesCount:p.notesCount+1}:p));
    setNoteText("");
  };

  return (
    <div className="page-content">
      {/* Filter + upload */}
      <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        {tags.map(t=>(
          <button key={t} onClick={()=>setFilter(t)} style={{padding:"5px 12px",border:"1px solid",borderColor:filter===t?"var(--accent)":"var(--border)",borderRadius:20,fontSize:12,background:filter===t?"var(--accent-light)":"var(--surface)",color:filter===t?"var(--accent)":"var(--text2)",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:filter===t?600:400}}>
            {t}
          </button>
        ))}
        <Btn size="sm" style={{marginRight:"auto"}}><Icon n="camera" s={13}/> העלה תמונה</Btn>
      </div>

      <div className="photo-grid">
        {filtered.map(p=>(
          <div key={p.id} className="photo-card" onClick={()=>setSelected(p)}>
            <div className="photo-thumb" style={{background:p.color,position:"relative"}}>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                <Icon n="camera" s={28} c="rgba(255,255,255,.5)"/>
                <span style={{fontSize:11,color:"rgba(255,255,255,.7)",textAlign:"center",padding:"0 8px"}}>{p.label}</span>
              </div>
              {p.notesCount>0 && <div style={{position:"absolute",top:6,left:6,background:"var(--accent)",color:"#fff",borderRadius:10,fontSize:10,fontWeight:700,padding:"1px 5px"}}>{p.notesCount}</div>}
              <div style={{position:"absolute",top:6,right:6}}><TagBadge tag={p.tag}/></div>
            </div>
            <div className="photo-info">
              <div style={{fontWeight:500,fontSize:12,marginBottom:2}}>{p.location}</div>
              <div style={{color:"var(--text3)",fontSize:11,display:"flex",justifyContent:"space-between"}}>
                <span>{p.stage}</span><span>{p.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <Modal onClose={()=>setSelected(null)} title={`${selected.label} — ${selected.date}`} width={760}>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {/* Photo + canvas */}
            <div style={{flex:"1 1 400px"}}>
              <div style={{position:"relative",borderRadius:8,overflow:"hidden",userSelect:"none"}}>
                <div style={{height:300,background:selected.color,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{color:"rgba(255,255,255,.5)",fontSize:13}}>{selected.label}</span>
                </div>
                <canvas ref={canvasRef} width={400} height={300}
                  style={{position:"absolute",inset:0,cursor:drawMode==="pen"?"crosshair":"default"}}
                  onMouseDown={startDraw} onMouseMove={doDraw} onMouseUp={endDraw} onMouseLeave={endDraw}/>
              </div>
              {/* Drawing tools */}
              <div style={{marginTop:10,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"var(--text2)",marginLeft:4}}>כלי עריכה:</span>
                {["pen","square"].map(t=>(
                  <button key={t} onClick={()=>setDrawMode(t)} style={{padding:"4px 8px",borderRadius:6,border:"1px solid",borderColor:drawMode===t?"var(--accent)":"var(--border)",background:drawMode===t?"var(--accent-light)":"var(--surface)",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,fontFamily:"'Heebo',sans-serif",color:drawMode===t?"var(--accent)":"var(--text2)"}}>
                    <Icon n={t==="pen"?"pen":"square"} s={12}/>{t==="pen"?"עט":"מלבן"}
                  </button>
                ))}
                {["#FF3B30","#FF9500","#34C759","#007AFF"].map(c=>(
                  <div key={c} onClick={()=>setDrawColor(c)} style={{width:18,height:18,borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${drawColor===c?"var(--text1)":"transparent"}`,transition:"border .1s"}}/>
                ))}
                <button onClick={clearCanvas} style={{marginRight:"auto",fontSize:11,color:"var(--text3)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>נקה</button>
              </div>
            </div>
            {/* Notes panel */}
            <div style={{flex:"0 0 200px",display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>הערות ({selected.notesCount})</div>
              <div style={{flex:1,maxHeight:240,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
                {selected.notesCount>0
                  ? Array.from({length:selected.notesCount}).map((_,i)=>(
                    <div key={i} style={{background:"#FAFAF8",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",fontSize:12}}>
                      <span style={{fontWeight:600,color:"var(--accent)"}}>הערה {i+1}</span>
                      <p style={{marginTop:4,color:"var(--text2)"}}>טקסט לדוגמה לתיעוד ממגיע מהשטח</p>
                    </div>
                  ))
                  : <div style={{color:"var(--text3)",fontSize:12}}>אין הערות עדיין</div>
                }
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="הוסף הערה..." rows={3}
                  style={{width:"100%",border:"1px solid var(--border)",borderRadius:8,padding:"8px",fontSize:12,fontFamily:"'Heebo',sans-serif",resize:"none",outline:"none"}}/>
                <div style={{display:"flex",gap:6}}>
                  <Select value="manager" onChange={()=>{}} style={{flex:1,fontSize:11}}>
                    <option value="manager">בעל בנייה</option>
                    <option value="inspector">מפקח</option>
                    <option value="contractor">לקבלן</option>
                  </Select>
                  <Btn size="sm" onClick={addNote}><Icon n="send" s={12}/></Btn>
                </div>
              </div>
            </div>
          </div>
          <div style={{marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:8}}>
              <TagBadge tag={selected.tag}/>
              <span style={{fontSize:12,color:"var(--text3)"}}>{selected.stage} · {selected.location}</span>
            </div>
            <Btn size="sm" variant="ghost"><Icon n="download" s={13}/> שמור תמונה</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════
const NotesScreen = () => {
  const {NOTES_INITIAL, ROLE_LABELS, ROLE_COLORS} = window;
  const [notes,setNotes] = React.useState(NOTES_INITIAL);
  const [thread,setThread] = React.useState("all");
  const [text,setText] = React.useState("");
  const [myRole,setMyRole] = React.useState("manager");
  const [targetThread,setTargetThread] = React.useState("internal");
  const endRef = React.useRef(null);

  const threads = [{id:"all",label:"הכל"},{id:"internal",label:"פנימי"},{id:"contractor",label:"לקבלן"}];
  const filtered = thread==="all"?notes:notes.filter(n=>n.thread===thread);

  const send = () => {
    if(!text.trim()) return;
    setNotes(prev=>[...prev,{id:Date.now(),fromName:["בעל הבית","אבי כהן","רון לוי","יעקב פרץ"][["owner","manager","inspector","contractor"].indexOf(myRole)],role:myRole,text:text.trim(),date:"היום",time:new Date().toTimeString().slice(0,5),thread:targetThread,resolved:false}]);
    setText("");
    setTimeout(()=>endRef.current?.scrollIntoView({block:"nearest"}),50);
  };

  const toggleResolved = (id) => setNotes(prev=>prev.map(n=>n.id===id?{...n,resolved:!n.resolved}:n));

  return (
    <div className="page-content" style={{display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"}}>
      {/* Thread tabs */}
      <div style={{display:"flex",gap:0,marginBottom:16,background:"var(--surface)",borderRadius:8,border:"1px solid var(--border)",padding:3,alignSelf:"flex-start"}}>
        {threads.map(t=>(
          <button key={t.id} onClick={()=>setThread(t.id)} style={{padding:"6px 14px",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:13,fontWeight:thread===t.id?600:400,background:thread===t.id?"var(--accent)":"transparent",color:thread===t.id?"#fff":"var(--text2)",transition:"all .15s"}}>
            {t.label}
            <span style={{marginRight:5,fontSize:11,opacity:.7}}>{t.id==="all"?notes.length:notes.filter(n=>n.thread===t.id).length}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:0,paddingBottom:16}}>
        {filtered.map((n,i)=>{
          const isMe = n.role===myRole;
          const color = ROLE_COLORS[n.role]||"#888";
          return (
            <div key={n.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-start":"flex-end",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"flex-end",gap:8,flexDirection:isMe?"row":"row-reverse",maxWidth:"72%"}}>
                <Avatar letter={n.fromName[0]} color={color} size={28}/>
                <div>
                  <div style={{fontSize:11,color:"var(--text3)",marginBottom:3,textAlign:isMe?"right":"left"}}>{n.fromName} · {ROLE_LABELS[n.role]} · {n.date} {n.time}</div>
                  <div style={{padding:"10px 14px",borderRadius:12,fontSize:13,lineHeight:1.5,background:isMe?"var(--accent)":"var(--surface)",color:isMe?"#fff":"var(--text1)",border:isMe?"none":"1px solid var(--border)",borderBottomRightRadius:isMe?4:12,borderBottomLeftRadius:isMe?12:4}}>
                    {n.text}
                  </div>
                  <div style={{marginTop:4,display:"flex",gap:6,justifyContent:isMe?"flex-start":"flex-end"}}>
                    {n.thread==="contractor" && <span style={{fontSize:10,color:"var(--text3)"}}>לקבלן</span>}
                    <button onClick={()=>toggleResolved(n.id)} style={{fontSize:10,color:n.resolved?"var(--success)":"var(--text3)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
                      {n.resolved?"✓ טופל":"סמן כטופל"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>

      {/* Compose */}
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:12}}>
        <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())} placeholder="כתוב הערה... (Enter לשליחה)" rows={2}
          style={{width:"100%",border:"none",outline:"none",fontSize:13,fontFamily:"'Heebo',sans-serif",resize:"none",color:"var(--text1)",background:"transparent"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
          <div style={{display:"flex",gap:8}}>
            <Select value={myRole} onChange={setMyRole} style={{fontSize:12,width:"auto"}}>
              <option value="owner">בעל הבית</option>
              <option value="manager">בעל בנייה</option>
              <option value="inspector">מפקח</option>
              <option value="contractor">קבלן</option>
            </Select>
            <Select value={targetThread} onChange={setTargetThread} style={{fontSize:12,width:"auto"}}>
              <option value="internal">פנימי</option>
              <option value="contractor">לקבלן</option>
            </Select>
          </div>
          <Btn onClick={send}><Icon n="send" s={14}/> שלח</Btn>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// BUDGET
// ═══════════════════════════════════════════════
const BudgetScreen = () => {
  const {BUDGET_CATS, PROJECT, fmtMoney} = window;
  const [view,setView] = React.useState("overview");
  const totalBudget = BUDGET_CATS.reduce((a,c)=>a+c.budget,0);
  const totalSpent = BUDGET_CATS.reduce((a,c)=>a+c.spent,0);
  const [expenses] = React.useState([
    {date:"15/09/25",desc:"תשלום לקבלן שלד — מקדמה",cat:"שלד ויסודות",amount:135000,status:"שולם"},
    {date:"01/10/25",desc:"תשלום לחשמלאי — ביניים",cat:"חשמל",amount:45000,status:"שולם"},
    {date:"10/10/25",desc:"חומרי טיח — פרץ טיח",cat:"טיח",amount:28000,status:"שולם"},
    {date:"20/10/25",desc:"תשלום לאינסטלטור",cat:"אינסטלציה",amount:40000,status:"שולם"},
    {date:"25/10/25",desc:"תשלום לקבלן טיח — ביניים",cat:"טיח",amount:44000,status:"שולם"},
    {date:"01/11/25",desc:"תשלום לחשמלאי — סיום גולמי",cat:"חשמל",amount:20000,status:"ממתין"},
  ]);

  return (
    <div className="page-content">
      {/* Summary cards */}
      <div className="grid-4" style={{marginBottom:20}}>
        <StatCard label="תקציב כולל" value={fmtMoney(totalBudget)} icon="chart"/>
        <StatCard label="הוצא עד כה" value={fmtMoney(totalSpent)} accent="var(--accent)" sub={`${Math.round(totalSpent/totalBudget*100)}% מהתקציב`} icon="arrow-right"/>
        <StatCard label="מחויב (חוזים)" value={fmtMoney(PROJECT.committed)} accent="var(--warning)" icon="clipboard"/>
        <StatCard label="יתרה פנויה" value={fmtMoney(totalBudget-totalSpent-PROJECT.committed)} accent="var(--success)" icon="check-circle"/>
      </div>

      {/* Budget bar */}
      <div className="card" style={{marginBottom:20,padding:20}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>ניצול תקציב</div>
        <div style={{height:16,background:"var(--border)",borderRadius:8,overflow:"hidden",display:"flex",marginBottom:10}}>
          <div style={{width:`${totalSpent/totalBudget*100}%`,background:"var(--accent)",transition:"width .4s",borderRadius:"8px 0 0 8px"}}/>
          <div style={{width:`${PROJECT.committed/totalBudget*100}%`,background:"#FDE68A"}}/>
        </div>
        <div style={{display:"flex",gap:20,fontSize:12}}>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:"var(--accent)",display:"inline-block"}}/> הוצא: {fmtMoney(totalSpent)} ({Math.round(totalSpent/totalBudget*100)}%)</span>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:"#FDE68A",display:"inline-block"}}/> מחויב: {fmtMoney(PROJECT.committed)} ({Math.round(PROJECT.committed/totalBudget*100)}%)</span>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:"var(--border)",display:"inline-block"}}/> נותר: {fmtMoney(totalBudget-totalSpent-PROJECT.committed)} ({Math.round((totalBudget-totalSpent-PROJECT.committed)/totalBudget*100)}%)</span>
        </div>
      </div>

      {/* Categories */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header">פירוט לפי קטגוריה</div>
        <div style={{overflowX:"auto"}}>
          <table className="bp-table" style={{width:"100%"}}>
            <thead><tr><th>קטגוריה</th><th>תקציב</th><th>הוצא</th><th>יתרה</th><th>%</th><th>גרף</th></tr></thead>
            <tbody>
              {BUDGET_CATS.map((c,i)=>{
                const pct=c.budget?Math.round(c.spent/c.budget*100):0;
                const over=c.spent>c.budget;
                return (
                  <tr key={i}>
                    <td style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
                      <span style={{width:8,height:8,borderRadius:2,background:c.color,display:"inline-block",flexShrink:0}}/>
                      {c.name}
                    </td>
                    <td style={{fontSize:13}}>{fmtMoney(c.budget)}</td>
                    <td style={{fontSize:13,color:over?"var(--danger)":"inherit",fontWeight:over?700:400}}>{fmtMoney(c.spent)}</td>
                    <td style={{fontSize:13,color:c.budget-c.spent<0?"var(--danger)":"var(--success)"}}>{fmtMoney(c.budget-c.spent)}</td>
                    <td style={{fontSize:12,color:over?"var(--danger)":"var(--text2)"}}>{pct}%</td>
                    <td style={{minWidth:100}}><ProgressBar value={Math.min(pct,100)} color={over?"var(--danger)":c.color} height={5}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses */}
      <div className="card">
        <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>הוצאות אחרונות</span>
          <Btn size="sm"><Icon n="plus" s={12}/> הוצאה חדשה</Btn>
        </div>
        <div style={{overflowX:"auto"}}>
          <table className="bp-table" style={{width:"100%"}}>
            <thead><tr><th>תאריך</th><th>תיאור</th><th>קטגוריה</th><th>סכום</th><th>סטטוס</th></tr></thead>
            <tbody>
              {expenses.map((e,i)=>(
                <tr key={i}>
                  <td style={{fontSize:13,color:"var(--text3)"}}>{e.date}</td>
                  <td style={{fontSize:13,fontWeight:500}}>{e.desc}</td>
                  <td style={{fontSize:12,color:"var(--text2)"}}>{e.cat}</td>
                  <td style={{fontSize:13,fontWeight:600}}>{fmtMoney(e.amount)}</td>
                  <td><span className={`badge ${e.status==="שולם"?"badge-done":"badge-active"}`}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// TIMELINE (Gantt)
// ═══════════════════════════════════════════════
const TimelineScreen = () => {
  const {TIMELINE_DATA, TOTAL_WEEKS, STAGES} = window;
  const today = 30; // week 30 of 58
  const months = ["ינו","פבר","מרץ","אפר","מאי","יונ","יול","אוג","ספט","אוק","נוב","דצמ","ינו","פבר","מרץ"];
  const monthMarks = months.map((m,i)=>({m,w:i*4}));

  const statusColors = {done:"#16A34A",active:"#E07A38",pending:"#D1D5DB"};
  const [hovered,setHovered] = React.useState(null);

  return (
    <div className="page-content">
      <div className="card" style={{overflow:"hidden"}}>
        <div className="card-header" style={{display:"flex",justifyContent:"space-between"}}>
          <span>לוח זמנים — ינואר 2025 עד מרץ 2026</span>
          <span style={{fontSize:12,color:"var(--text3)",fontWeight:400}}>שבוע נוכחי: {today}</span>
        </div>
        <div style={{overflowX:"auto",padding:"0 0 16px"}}>
          <div style={{minWidth:800}}>
            {/* Month headers */}
            <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"#FAFAF8",position:"sticky",top:0,zIndex:5}}>
              <div style={{width:150,flexShrink:0,borderLeft:"1px solid var(--border)",padding:"8px 12px",fontSize:11,fontWeight:600,color:"var(--text3)"}}>שלב</div>
              <div style={{flex:1,position:"relative",height:34}}>
                {monthMarks.filter(m=>m.w<=TOTAL_WEEKS).map(({m,w})=>(
                  <div key={w} style={{position:"absolute",left:`${w/TOTAL_WEEKS*100}%`,fontSize:10,color:"var(--text3)",paddingTop:10,whiteSpace:"nowrap"}}>
                    <div style={{width:1,height:6,background:"var(--border)",margin:"0 auto 2px"}}/>
                    {m}
                  </div>
                ))}
                {/* Today line */}
                <div style={{position:"absolute",left:`${today/TOTAL_WEEKS*100}%`,top:0,bottom:-9999,width:2,background:"var(--accent)",opacity:.5,zIndex:10}}/>
              </div>
            </div>
            {/* Rows */}
            {TIMELINE_DATA.map(item=>(
              <div key={item.id} style={{display:"flex",borderBottom:"1px solid var(--border)",minHeight:40,alignItems:"center"}}
                onMouseEnter={()=>setHovered(item.id)} onMouseLeave={()=>setHovered(null)}>
                <div style={{width:150,flexShrink:0,borderLeft:"1px solid var(--border)",padding:"8px 12px",fontSize:12,fontWeight:500,color:item.status==="active"?"var(--accent)":item.status==="done"?"var(--text2)":"var(--text3)",background:hovered===item.id?"#FAFAF8":"transparent"}}>
                  {item.name}
                </div>
                <div style={{flex:1,position:"relative",height:40,padding:"8px 0"}}>
                  {/* Today vertical */}
                  <div style={{position:"absolute",left:`${today/TOTAL_WEEKS*100}%`,top:0,bottom:0,width:1,background:"var(--accent)",opacity:.25}}/>
                  {/* Bar */}
                  <div style={{
                    position:"absolute",
                    left:`${item.col/TOTAL_WEEKS*100}%`,
                    width:`${item.span/TOTAL_WEEKS*100}%`,
                    height:24,top:8,borderRadius:4,
                    background:statusColors[item.status],
                    opacity:hovered===item.id?1:.8,
                    transition:"opacity .15s",
                    display:"flex",alignItems:"center",paddingRight:6,overflow:"hidden"
                  }}>
                    <span style={{fontSize:10,color:item.status==="pending"?"var(--text3)":"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",paddingRight:6}}>
                      {item.span>=4?item.name:""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {/* Legend */}
            <div style={{display:"flex",gap:16,padding:"12px 16px",fontSize:11,color:"var(--text2)"}}>
              {[["done","הושלם","#16A34A"],["active","בביצוע","#E07A38"],["pending","מתוכנן","#D1D5DB"]].map(([k,l,c])=>(
                <span key={k} style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:16,height:8,background:c,borderRadius:2,display:"inline-block"}}/>{l}
                </span>
              ))}
              <span style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:2,height:14,background:"var(--accent)",borderRadius:1,display:"inline-block"}}/> היום
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { DashboardScreen, StagesScreen, ContractorsScreen, BOQScreen, PhotosScreen, NotesScreen, BudgetScreen, TimelineScreen });
