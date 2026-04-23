// @ts-nocheck

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, Badge, TagBadge, ProgressBar, Avatar, Stars, Modal, StatCard, Btn, Input, Select, statusMeta } from './Shared';
import { PROJECT, STAGES, CONTRACTORS_DATA, BUDGET_CATS, PHOTOS_DATA, NOTES_INITIAL, ROOMS_LIST, BOQ_DATA, TIMELINE_DATA, TOTAL_WEEKS, fmt, fmtMoney, ROLE_LABELS, ROLE_COLORS, QUOTE_TOPICS, QUOTES_DATA } from '../utils/mockData';
import { computeHealth, ProjectHealthBanner, InsightCardsRow } from './DashboardInsights';
import { computeGates, resolveStatus, aggregateStageStatus, PaymentBadge, PaymentGatesPanel, ReleasePaymentModal } from './PaymentControl';

// ── BuildPro SCREENS ─────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
export const DashboardScreen = () => {
  
  const [showAllStages, setShowAllStages] = React.useState(false);
  const doneStages = STAGES.filter(s=>s.status==="done").length;
  const activeStage = STAGES.find(s=>s.status==="active");
  const totalSpent = BUDGET_CATS.reduce((a,c)=>a+c.spent,0);
  const totalBudget = BUDGET_CATS.reduce((a,c)=>a+c.budget,0);
  const health = React.useMemo(()=>computeHealth(),[]);
  const recentActivity = [
    {role:"inspector",name:"רון לוי",text:"בדיקת טיח קומה ב' — עבר. ניתן להמשיך.",time:"לפני שעה"},
    {role:"manager",name:"אבי כהן",text:"צולמה התקדמות — 8 תמונות חדשות הועלו",time:"לפני 3 שעות"},
    {role:"contractor",name:"יעקב פרץ",text:"טיח פנים קומה ב' הושלם",time:"אתמול, 16:30"},
    {role:"owner",name:"יוסי רוזנברג",text:"אושרה בחירת ספק ריצוף — כרמל ריצוף",time:"אתמול, 11:00"},
  ];
  const rc = ROLE_COLORS;
  return (
    <div>
      {/* Project Health Banner — Decision Engine headline */}
      <ProjectHealthBanner overall={health.overall}/>

      <div className="page-content">
        {/* Insight Cards — actionable insights instead of raw numbers */}
        <InsightCardsRow health={health}/>

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
              <motion.div
                style={{padding:"0 0 4px"}}
                variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                initial="hidden"
                animate="show"
              >
                {recentActivity.map((a,i)=>(
                  <motion.div
                    key={i}
                    variants={{ hidden:{opacity:0,x:16}, show:{opacity:1,x:0,transition:{type:"spring",stiffness:280,damping:24}} }}
                    style={{display:"flex",gap:12,padding:"12px 20px",borderBottom:i<recentActivity.length-1?"1px solid var(--border)":"none",cursor:"pointer"}}
                    whileHover={{background:"#FAFAF9"}}
                  >
                    <Avatar letter={a.name[0]} color={rc[a.role]} size={32}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text1)"}}>{a.name}</div>
                      <div style={{fontSize:13,color:"var(--text2)",marginTop:3,lineHeight:1.4}}>{a.text}</div>
                      <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>{a.time}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
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
// Amount per stage — demo seed. In production this comes from contracts.
const STAGE_AMOUNTS: Record<number, number> = {
  1:80000, 2:85000, 3:450000, 4:60000, 5:65000, 6:50000, 7:120000,
  8:140000, 9:40000, 10:45000, 11:120000, 12:45000, 13:30000, 14:20000,
};

// Milestone templates — only stages that naturally split into chunks.
// Each milestone ties to specific taskIds within its stage.
const STAGE_MILESTONES: Record<number, any[]> = {
  3: [ // שלד
    { id: 'm3a', name: "תקרה קומה א'",      pct: 30, taskIds: [31, 32] },
    { id: 'm3b', name: "קירות קומה ב'",     pct: 40, taskIds: [33] },
    { id: 'm3c', name: "גג",                 pct: 30, taskIds: [34] },
  ],
  7: [ // טיח
    { id: 'm7a', name: "טיח פנים קומה א'",  pct: 25, taskIds: [71] },
    { id: 'm7b', name: "טיח פנים קומה ב'",  pct: 25, taskIds: [72] },
    { id: 'm7c', name: "טיח חוץ",            pct: 30, taskIds: [73] },
    { id: 'm7d', name: "גמר + אינסטלציה עדינה", pct: 20, taskIds: [74] },
  ],
};

const seedStages = () => STAGES.map(s => {
  const tasks = s.tasks.map(t => ({...t}));
  let paymentStatus = 'draft';
  let supervisorApproval = null;
  let paidAt = null;
  if (s.status === 'done') {
    paymentStatus = 'paid';
    supervisorApproval = { by: 'רון לוי', at: s.end };
    paidAt = s.end;
  } else if (s.status === 'active') {
    paymentStatus = 'in_progress';
  }
  const amount = STAGE_AMOUNTS[s.id] || 0;
  const milestoneTemplate = STAGE_MILESTONES[s.id];
  const milestones = milestoneTemplate?.map(m => ({
    ...m,
    amount: Math.round(amount * m.pct / 100),
    // For done stages: seed all milestones as paid.
    // For active stages: leave at draft — user triggers the flow.
    status: s.status === 'done' ? 'paid' : 'draft',
    supervisorApproval: s.status === 'done' ? { by: 'רון לוי', at: s.end } : null,
    extraProofPhotos: 0,
    paidAt: s.status === 'done' ? s.end : null,
  }));
  return {
    ...s, tasks, supervisorApproval,
    payment: { amount, status: paymentStatus, paidAt, milestones },
    extraProofPhotos: 0,
  };
});

export const StagesScreen = () => {

  const [stages,setStages] = React.useState(seedStages());
  const [open,setOpen] = React.useState(null);
  const [releaseFor,setReleaseFor] = React.useState(null);

  const updateStage = (stageId, updater) => {
    setStages(prev => prev.map(s => s.id === stageId ? updater(s) : s));
  };

  const requestReview = (stageId) => {
    updateStage(stageId, s => ({...s, payment: {...s.payment, status: 'review_requested'}}));
  };
  const supervisorApprove = (stageId) => {
    updateStage(stageId, s => ({
      ...s,
      supervisorApproval: { by: 'רון לוי', at: new Date().toLocaleDateString('he-IL') },
    }));
  };
  const addProofPhoto = (stageId) => {
    updateStage(stageId, s => ({...s, extraProofPhotos: (s.extraProofPhotos||0) + 1}));
  };
  const confirmRelease = () => {
    if (!releaseFor) return;
    const { stage: rStage, milestoneId } = releaseFor;
    const id = rStage.id;
    const today = new Date().toLocaleDateString('he-IL');
    updateStage(id, s => {
      if (milestoneId) {
        return {
          ...s,
          payment: {
            ...s.payment,
            milestones: s.payment.milestones.map(m =>
              m.id === milestoneId ? { ...m, status: 'paid', paidAt: today } : m
            ),
          },
        };
      }
      return {
        ...s,
        payment: { ...s.payment, status: 'paid', paidAt: today },
      };
    });
    setReleaseFor(null);
  };

  // ── Milestone handlers ─────────────────────────────────────────────────────
  const updateMilestone = (stageId, milestoneId, updater) => {
    updateStage(stageId, s => ({
      ...s,
      payment: {
        ...s.payment,
        milestones: s.payment.milestones.map(m =>
          m.id === milestoneId ? updater(m) : m
        ),
      },
    }));
  };
  const requestReviewMs = (stageId, milestoneId) =>
    updateMilestone(stageId, milestoneId, m => ({ ...m, status: 'review_requested' }));
  const supervisorApproveMs = (stageId, milestoneId) =>
    updateMilestone(stageId, milestoneId, m => ({
      ...m,
      supervisorApproval: { by: 'רון לוי', at: new Date().toLocaleDateString('he-IL') },
    }));
  const addProofPhotoMs = (stageId, milestoneId) =>
    updateMilestone(stageId, milestoneId, m => ({
      ...m, extraProofPhotos: (m.extraProofPhotos || 0) + 1,
    }));
  const releaseMs = (stage, milestone) =>
    setReleaseFor({ stage, milestoneId: milestone.id, milestoneName: milestone.name, amount: milestone.amount });

  const toggleTask = (stageId, taskId) => {
    setStages(prev=>prev.map(s=>{
      if(s.id!==stageId) return s;
      const tasks = s.tasks.map(t=>t.id===taskId?{...t,done:!t.done}:t);
      const progress = Math.round(tasks.filter(t=>t.done).length/tasks.length*100);
      const status = progress===100?"done":progress>0?"active":"pending";
      // Spec rule: task change after supervisor approval invalidates it.
      // Task change after payment → dispute.
      const wasPaid = s.payment?.status === 'paid';
      const payment = wasPaid
        ? {...s.payment, status: 'disputed'}
        : s.payment;
      return {
        ...s, tasks, progress, status,
        supervisorApproval: wasPaid ? s.supervisorApproval : null,
        payment,
      };
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
        {stages.map((s,idx)=>{
          const gates = computeGates(s, s.extraProofPhotos||0);
          const payStatus = aggregateStageStatus(s) || resolveStatus(s, gates);
          return (
          <div key={s.id} className="card" style={{overflow:"hidden",borderRight:`4px solid ${s.status==="done"?"var(--success)":s.status==="active"?"var(--accent)":"var(--border)"}`}}>
            <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",cursor:"pointer"}} onClick={()=>setOpen(open===s.id?null:s.id)}>
              <div style={{width:32,height:32,borderRadius:"50%",background:s.status==="done"?"#D1FAE5":s.status==="active"?"var(--accent-light)":"#F4F4F6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1.5px solid ${s.status==="done"?"#BBF7D0":s.status==="active"?"rgba(224,122,56,.4)":"var(--border)"}`}}>
                {s.status==="done"
                  ?<Icon n="check" s={15} c="var(--success)"/>
                  :<span style={{fontSize:12,fontWeight:700,color:s.status==="active"?"var(--accent)":"var(--text3)"}}>{idx+1}</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:14.5}}>{s.name}</span>
                  <Badge type={s.status}/>
                  <PaymentBadge status={payStatus} amount={s.payment?.amount}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{flex:1,maxWidth:220}}><ProgressBar value={s.progress} color={s.status==="done"?"var(--success)":s.status==="active"?"var(--accent)":"#D1D5DB"} height={5}/></div>
                  <span style={{fontSize:12,color:s.status==="active"?"var(--accent)":"var(--text3)",fontWeight:600,whiteSpace:"nowrap"}}>{s.progress}%</span>
                  <span style={{fontSize:12,color:"var(--text3)",whiteSpace:"nowrap"}}>{s.tasks.filter(t=>t.done).length}/{s.tasks.length} משימות</span>
                </div>
              </div>
              <div style={{textAlign:"left",fontSize:11.5,color:"var(--text3)",whiteSpace:"nowrap",display:"flex",flexDirection:"column",gap:3,lineHeight:1.4}}>
                <span>{s.start?.slice(5).replace("-","/")}</span>
                <span>{s.end?.slice(5).replace("-","/")}</span>
              </div>
              <motion.div animate={{rotate: open===s.id ? 180 : 0}} transition={{duration:0.2}}>
                <Icon n="chevron-down" s={16} c="var(--text3)"/>
              </motion.div>
            </div>

            <AnimatePresence>
            {open===s.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                <div style={{borderTop:"1px solid var(--border)",background:"#FAFAF8",padding:"12px 16px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:12,color:"var(--text2)",fontWeight:600}}>קבלן: {s.contractor}</span>
                    <span style={{fontSize:12,color:"var(--text3)"}}>{s.start} — {s.end}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {s.tasks.map(t=>(
                      <motion.label whileHover={{scale:1.01}} whileTap={{scale:0.99}} key={t.id} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"8px 12px",borderRadius:8,background:t.done?"#F0FDF4":"var(--surface)",border:"1px solid",borderColor:t.done?"#BBF7D0":"var(--border)",transition:"background 0.2s, border-color 0.2s"}}>
                        <input type="checkbox" checked={t.done} onChange={()=>toggleTask(s.id,t.id)} style={{accentColor:"var(--success)",width:16,height:16,cursor:"pointer"}}/>
                        <span style={{fontSize:14,flex:1,textDecoration:t.done?"line-through":"none",color:t.done?"var(--text3)":"var(--text1)",fontWeight:t.done?400:500}}>{t.name}</span>
                        <span style={{fontSize:12,color:"var(--text3)"}}>{t.assignee}</span>
                      </motion.label>
                    ))}
                  </div>
                  <div style={{marginTop:16,display:"flex",gap:10}}>
                    <Btn size="sm" variant="ghost"><Icon n="camera" s={14}/> תמונות</Btn>
                    <Btn size="sm" variant="ghost"><Icon n="message" s={14}/> הערה</Btn>
                  </div>

                  <PaymentGatesPanel
                    stage={s}
                    gates={gates}
                    status={payStatus}
                    onRequestReview={()=>requestReview(s.id)}
                    onSupervisorApprove={()=>supervisorApprove(s.id)}
                    onAddProofPhoto={()=>addProofPhoto(s.id)}
                    onReleasePayment={()=>setReleaseFor({stage: s, milestoneId: null, amount: s.payment?.amount, milestoneName: null})}
                    onRequestReviewMs={(mid)=>requestReviewMs(s.id, mid)}
                    onSupervisorApproveMs={(mid)=>supervisorApproveMs(s.id, mid)}
                    onAddProofPhotoMs={(mid)=>addProofPhotoMs(s.id, mid)}
                    onReleaseMs={(m)=>releaseMs(s, m)}
                  />
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
          );
        })}
      </div>

      {releaseFor && (
        <ReleasePaymentModal
          stage={releaseFor.stage}
          milestoneName={releaseFor.milestoneName}
          amount={releaseFor.amount}
          gates={
            releaseFor.milestoneId
              ? undefined
              : computeGates(releaseFor.stage, releaseFor.stage.extraProofPhotos||0)
          }
          onClose={()=>setReleaseFor(null)}
          onConfirm={confirmRelease}
        />
      )}
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

export const ContractorsScreen = () => {
  
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

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(295px,1fr))",gap:22}}>
        {contractors.map(c=>(
          <motion.div
            key={c.id}
            className="card"
            style={{padding:24,cursor:"pointer"}}
            whileHover={{y:-5,boxShadow:"var(--shadow-xl)",borderColor:"rgba(224,122,56,0.3)"}}
            whileTap={{scale:0.99}}
            onClick={()=>setSelected(c)}
          >
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <Avatar letter={c.avatar||c.name[0]} color={c.color} size={44}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:12.5,color:"var(--text2)",marginTop:2}}>{c.role}</div>
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
          </motion.div>
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
export const BOQScreen = () => {
  
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
export const PhotosScreen = () => {
  
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

      <motion.div
        className="photo-grid"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        initial="hidden"
        animate="show"
      >
        {filtered.map(p=>(
          <motion.div
            key={p.id}
            className="photo-card"
            variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
            whileHover={{ y: -5, boxShadow: "var(--shadow-xl)" }}
            whileTap={{ scale: 0.97 }}
            onClick={()=>setSelected(p)}
          >
            <div className="photo-thumb" style={{background:p.color,position:"relative"}}>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                <Icon n="camera" s={28} c="rgba(255,255,255,.5)"/>
                <span style={{fontSize:11,color:"rgba(255,255,255,.7)",textAlign:"center",padding:"0 8px"}}>{p.label}</span>
              </div>
              {p.notesCount>0 && <div style={{position:"absolute",top:6,left:6,background:"var(--accent)",color:"#fff",borderRadius:10,fontSize:10,fontWeight:700,padding:"1px 5px"}}>{p.notesCount}</div>}
              <div style={{position:"absolute",top:6,right:6}}><TagBadge tag={p.tag}/></div>
            </div>
            <div className="photo-info">
              <div style={{fontWeight:600,fontSize:13,marginBottom:3}}>{p.location}</div>
              <div style={{color:"var(--text3)",fontSize:11,display:"flex",justifyContent:"space-between"}}>
                <span>{p.stage}</span><span>{p.date}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

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
export const NotesScreen = () => {
  
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
        <AnimatePresence initial={false}>
        {filtered.map((n,i)=>{
          const isMe = n.role===myRole;
          const color = ROLE_COLORS[n.role]||"#888";
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: isMe ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",marginBottom:16}}
            >
              <div style={{display:"flex",alignItems:"flex-end",gap:8,flexDirection:isMe?"row-reverse":"row",maxWidth:"72%"}}>
                <Avatar letter={n.fromName[0]} color={color} size={32}/>
                <div>
                  <div style={{fontSize:11,color:"var(--text3)",marginBottom:5,textAlign:isMe?"left":"right"}}>{n.fromName} · {ROLE_LABELS[n.role]} · {n.date} {n.time}</div>
                  <div style={{padding:"13px 17px",borderRadius:16,fontSize:14,lineHeight:1.65,background:isMe?"linear-gradient(135deg, var(--accent) 0%, #c96b30 100%)":"var(--surface)",color:isMe?"#fff":"var(--text1)",border:isMe?"none":"1px solid var(--border)",boxShadow:isMe?"0 3px 12px rgba(224,122,56,0.28)":"var(--shadow-sm)",borderTopLeftRadius:isMe?16:4,borderTopRightRadius:isMe?4:16}}>
                    {n.text}
                  </div>
                  <div style={{marginTop:6,display:"flex",gap:6,justifyContent:isMe?"flex-end":"flex-start"}}>
                    {n.thread==="contractor" && <span style={{fontSize:10,color:"var(--text3)",background:"var(--bg)",padding:"1px 6px",borderRadius:10,border:"1px solid var(--border)"}}>לקבלן</span>}
                    <motion.button whileTap={{scale:0.9}} onClick={()=>toggleResolved(n.id)} style={{fontSize:11,color:n.resolved?"var(--success)":"var(--text3)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:n.resolved?700:400}}>
                      {n.resolved?"✓ טופל":"סמן כטופל"}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
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
export const BudgetScreen = () => {
  
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
      <motion.div
        className="grid-4"
        style={{marginBottom:24}}
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        initial="hidden"
        animate="show"
      >
        {[
          { label:"תקציב כולל",    value:fmtMoney(totalBudget),                                                      icon:"chart" },
          { label:"הוצא עד כה",   value:fmtMoney(totalSpent),   accent:"var(--accent)",  sub:`${Math.round(totalSpent/totalBudget*100)}% מהתקציב`, icon:"arrow-right" },
          { label:"מחויב (חוזים)",value:fmtMoney(PROJECT.committed), accent:"var(--warning)", icon:"clipboard" },
          { label:"יתרה פנויה",   value:fmtMoney(totalBudget-totalSpent-PROJECT.committed), accent:"var(--success)", icon:"check-circle" },
        ].map((card,i) => (
          <motion.div key={i} variants={{ hidden:{opacity:0,y:20}, show:{opacity:1,y:0,transition:{type:"spring",stiffness:280,damping:24}} }}>
            <StatCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      {/* Budget bar */}
      <div className="card" style={{marginBottom:20,padding:20}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>ניצול תקציב</div>
        <div style={{height:18,background:"var(--bg)",borderRadius:99,overflow:"hidden",display:"flex",marginBottom:12,border:"1px solid var(--border)"}}>
          <div style={{width:`${totalSpent/totalBudget*100}%`,background:"linear-gradient(90deg, var(--accent) 0%, #c96b30 100%)",transition:"width .6s cubic-bezier(.4,0,.2,1)",borderRadius:"99px 0 0 99px"}}/>
          <div style={{width:`${PROJECT.committed/totalBudget*100}%`,background:"#FDE68A"}}/>
        </div>
        <div style={{display:"flex",gap:24,fontSize:12.5}}>
          <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"var(--accent)",display:"inline-block"}}/> הוצא: <strong>{fmtMoney(totalSpent)}</strong> ({Math.round(totalSpent/totalBudget*100)}%)</span>
          <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"#F59E0B",display:"inline-block"}}/> מחויב: <strong>{fmtMoney(PROJECT.committed)}</strong> ({Math.round(PROJECT.committed/totalBudget*100)}%)</span>
          <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"#D1D5DB",display:"inline-block"}}/> נותר: <strong>{fmtMoney(totalBudget-totalSpent-PROJECT.committed)}</strong> ({Math.round((totalBudget-totalSpent-PROJECT.committed)/totalBudget*100)}%)</span>
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
export const TimelineScreen = () => {
  
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
export const ProjectSetupScreen = () => {
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
export const BOQWizardScreen = () => {
  const rooms = window.PROJECT_ROOMS || DEFAULT_ROOMS;
  
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

// ═══════════════════════════════════════════════
// QUOTES — הצעות מחיר
// ═══════════════════════════════════════════════
export const QuotesScreen = () => {

  const [quotes, setQuotes] = React.useState(QUOTES_DATA);
  const [customTopics, setCustomTopics] = React.useState([]);
  const [filter, setFilter] = React.useState("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null); // quote being edited
  const [compareTopicId, setCompareTopicId] = React.useState(null);
  const [topicInputOpen, setTopicInputOpen] = React.useState(false);
  const [newTopicName, setNewTopicName] = React.useState("");

  const topics = [...QUOTE_TOPICS.filter(t=>t.id!=="other"), ...customTopics, QUOTE_TOPICS.find(t=>t.id==="other")];
  const topicById = (id) => topics.find(t=>t.id===id) || {id, name:id, icon:"clipboard"};

  // Build per-topic groups, including only topics that currently have quotes
  const topicsWithQuotes = topics.filter(t => quotes.some(q=>q.topicId===t.id));
  const visibleTopics = filter==="all" ? topicsWithQuotes : topicsWithQuotes.filter(t=>t.id===filter);

  // KPIs
  const totalQuotes = quotes.length;
  const activeTopicsCount = topicsWithQuotes.length;
  const biggestDiff = topicsWithQuotes.reduce((max, t)=>{
    const arr = quotes.filter(q=>q.topicId===t.id);
    if(arr.length < 2) return max;
    const vals = arr.map(q=>q.total);
    return Math.max(max, Math.max(...vals) - Math.min(...vals));
  }, 0);

  // --- helpers ---
  const emptyForm = { topicId:"kitchen", supplier:"", contact:"", phone:"", email:"", total:"", validity:"", notes:"", fileName:"" };
  const [form, setForm] = React.useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm({...emptyForm, topicId: filter!=="all" ? filter : "kitchen"}); setAddOpen(true); };
  const openEdit = (q) => { setEditing(q); setForm({ topicId:q.topicId, supplier:q.supplier, contact:q.contact||"", phone:q.phone||"", email:q.email||"", total:String(q.total), validity:q.validity||"", notes:q.notes||"", fileName:q.fileName||"" }); setAddOpen(true); };
  const closeModal = () => { setAddOpen(false); setEditing(null); };

  const saveQuote = () => {
    if(!form.topicId || !form.supplier.trim() || !form.total) return;
    const total = Number(form.total);
    if(Number.isNaN(total) || total <= 0) return;
    if(editing){
      setQuotes(prev => prev.map(q => q.id===editing.id ? {...q, ...form, total} : q));
    } else {
      const q = { id: Date.now(), ...form, total, status:"pending", createdAt: new Date().toISOString().slice(0,10) };
      setQuotes(prev => [...prev, q]);
    }
    closeModal();
  };

  const deleteQuote = (id) => {
    if(!confirm("למחוק את הצעת המחיר?")) return;
    setQuotes(prev => prev.filter(q=>q.id!==id));
  };

  const approveQuote = (id) => {
    const target = quotes.find(q=>q.id===id);
    if(!target) return;
    setQuotes(prev => prev.map(q => {
      if(q.topicId !== target.topicId) return q;
      if(q.id === id) return {...q, status: q.status==="approved" ? "pending" : "approved"};
      return q.status==="approved" ? {...q, status:"pending"} : (target.status==="approved" ? q : {...q, status:"rejected"});
    }));
  };

  const addCustomTopic = () => {
    const name = newTopicName.trim();
    if(!name) return;
    const existing = topics.find(t => t.name.trim().toLowerCase() === name.toLowerCase());
    if(existing){
      setForm(f => ({...f, topicId: existing.id}));
    } else {
      const id = `custom_${Date.now()}`;
      setCustomTopics(prev => [...prev, {id, name, icon:"clipboard"}]);
      setForm(f => ({...f, topicId: id}));
    }
    setNewTopicName("");
    setTopicInputOpen(false);
  };

  const onFilePick = (file) => {
    if(!file){ setForm(f=>({...f, fileName:""})); return; }
    setForm(f => ({...f, fileName: file.name}));
  };

  // --- render helpers ---
  const statusBadgeType = (s) => s==="approved" ? "done" : s==="rejected" ? "problem" : "pending";

  const compareTopic = compareTopicId ? topicById(compareTopicId) : null;
  const compareRows = compareTopic ? [...quotes.filter(q=>q.topicId===compareTopic.id)].sort((a,b)=>a.total-b.total) : [];
  const cmpMin = compareRows.length ? Math.min(...compareRows.map(q=>q.total)) : 0;
  const cmpMax = compareRows.length ? Math.max(...compareRows.map(q=>q.total)) : 0;
  const cmpAvg = compareRows.length ? compareRows.reduce((a,q)=>a+q.total,0) / compareRows.length : 0;

  return (
    <div className="page-content">
      {/* Toolbar */}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <Select value={filter} onChange={setFilter} style={{width:"auto",minWidth:180}}>
          <option value="all">כל הנושאים</option>
          {topics.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>

        <div style={{display:"flex",gap:14,fontSize:13,color:"var(--text2)",alignItems:"center",flexWrap:"wrap"}}>
          <span>נושאים פעילים: <strong style={{color:"var(--text1)"}}>{activeTopicsCount}</strong></span>
          <span style={{color:"var(--text3)"}}>·</span>
          <span>סה"כ הצעות: <strong style={{color:"var(--text1)"}}>{totalQuotes}</strong></span>
          {biggestDiff > 0 && <>
            <span style={{color:"var(--text3)"}}>·</span>
            <span>הפרש מקסימלי: <strong style={{color:"var(--accent)"}}>{fmtMoney(biggestDiff)}</strong></span>
          </>}
        </div>

        <div style={{marginRight:"auto",display:"flex",gap:8}}>
          <Btn size="sm" variant="ghost" onClick={()=>{ setTopicInputOpen(true); setAddOpen(false); }}>
            <Icon n="plus" s={13}/> נושא חדש
          </Btn>
          <Btn size="sm" onClick={openAdd}>
            <Icon n="plus" s={13}/> הצעה חדשה
          </Btn>
        </div>
      </div>

      {/* Inline "add custom topic" card */}
      {topicInputOpen && !addOpen && (
        <div className="card" style={{padding:16,marginBottom:16,border:"2px solid var(--accent)"}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>הוספת נושא חדש</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <Input value={newTopicName} onChange={setNewTopicName} placeholder='למשל: "מערכות אזעקה" או "ריהוט גן"' style={{flex:1}}/>
            <Btn onClick={addCustomTopic} disabled={!newTopicName.trim()}>שמור נושא</Btn>
            <Btn variant="ghost" onClick={()=>{ setTopicInputOpen(false); setNewTopicName(""); }}>ביטול</Btn>
          </div>
          <div style={{fontSize:11,color:"var(--text3)",marginTop:8}}>הנושא יתווסף לרשימה ותוכלו לצרף אליו הצעות מחיר.</div>
        </div>
      )}

      {/* Body */}
      {visibleTopics.length === 0 ? (
        <div className="card card-body" style={{textAlign:"center",padding:48}}>
          <div style={{width:56,height:56,margin:"0 auto 14px",background:"var(--accent-light)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)"}}>
            <Icon n="clipboard" s={28}/>
          </div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>אין עדיין הצעות מחיר</div>
          <div style={{fontSize:13,color:"var(--text3)",marginBottom:16}}>הוסיפו הצעות לפי נושא (מטבח, ריצוף, טיח וכו׳) כדי להתחיל להשוות בין ספקים.</div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <Btn onClick={openAdd}><Icon n="plus" s={13}/> הוסף הצעה ראשונה</Btn>
            <Btn variant="ghost" onClick={()=>setTopicInputOpen(true)}><Icon n="plus" s={13}/> נושא חדש</Btn>
          </div>
        </div>
      ) : visibleTopics.map(topic => {
        const tQuotes = quotes.filter(q => q.topicId === topic.id);
        const minTotal = Math.min(...tQuotes.map(q=>q.total));
        const maxTotal = Math.max(...tQuotes.map(q=>q.total));
        const diff = maxTotal - minTotal;
        const approved = tQuotes.find(q=>q.status==="approved");
        return (
          <motion.div key={topic.id} className="card" style={{marginBottom:18}} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.2}}>
            <div className="card-header" style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:10,background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Icon n={topic.icon} s={16}/>
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:700}}>{topic.name}</div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>
                    {tQuotes.length} {tQuotes.length===1 ? "הצעה" : "הצעות"}
                    {tQuotes.length>=2 && <> · הפרש <strong style={{color:diff>0?"var(--accent)":"var(--text3)"}}>{fmtMoney(diff)}</strong></>}
                    {approved && <> · <span style={{color:"var(--success)",fontWeight:700}}>נבחר: {approved.supplier}</span></>}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn size="sm" variant="ghost" onClick={()=>{ setForm({...emptyForm, topicId: topic.id}); setEditing(null); setAddOpen(true); }}>
                  <Icon n="plus" s={12}/> הצעה לנושא
                </Btn>
                <Btn size="sm" disabled={tQuotes.length<2} onClick={()=>setCompareTopicId(topic.id)}>
                  <Icon n="chart" s={12}/> השווה ({tQuotes.length})
                </Btn>
              </div>
            </div>
            <div className="card-body" style={{paddingTop:16}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:14}}>
                {tQuotes.map(q => {
                  const isCheapest = tQuotes.length>=2 && q.total === minTotal;
                  const isApproved = q.status === "approved";
                  const isRejected = q.status === "rejected";
                  const accentColor = isApproved ? "var(--success)" : isCheapest ? "var(--success)" : isRejected ? "var(--border)" : "var(--border)";
                  return (
                    <motion.div key={q.id}
                      whileHover={{y:-3, boxShadow:"var(--shadow-lg)"}}
                      transition={{duration:0.2}}
                      style={{
                        background:"var(--surface)",
                        border:"1px solid var(--border)",
                        borderRight:`4px solid ${accentColor}`,
                        borderRadius:14,
                        padding:16,
                        display:"flex",
                        flexDirection:"column",
                        gap:10,
                        opacity:isRejected?0.6:1,
                        position:"relative",
                      }}>
                      {isCheapest && !isApproved && (
                        <div style={{position:"absolute",top:50,left:10,background:"var(--success-light)",color:"#065F46",border:"1px solid rgba(16,185,129,.25)",borderRadius:999,fontSize:10.5,fontWeight:700,padding:"3px 9px",letterSpacing:0.2}}>הזולה ביותר</div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                        <div style={{minWidth:0,flex:1}}>
                          <div style={{fontWeight:700,fontSize:14,color:"var(--text1)",overflow:"hidden",textOverflow:"ellipsis"}}>{q.supplier}</div>
                          {q.contact && <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{q.contact}</div>}
                        </div>
                        <Badge type={statusBadgeType(q.status)}>{q.status==="approved"?"נבחר":q.status==="rejected"?"נדחה":"ממתין"}</Badge>
                      </div>

                      <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                        <div style={{fontSize:24,fontWeight:800,color:"var(--text1)",letterSpacing:"-0.5px"}}>{fmtMoney(q.total)}</div>
                      </div>

                      <div style={{display:"flex",flexDirection:"column",gap:4,fontSize:12,color:"var(--text2)"}}>
                        {q.phone && <div style={{display:"flex",alignItems:"center",gap:6}}><Icon n="phone" s={11} c="var(--text3)"/> {q.phone}</div>}
                        {q.email && <div style={{display:"flex",alignItems:"center",gap:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><Icon n="mail" s={11} c="var(--text3)"/> <span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{q.email}</span></div>}
                        {q.validity && <div style={{display:"flex",alignItems:"center",gap:6}}><Icon n="calendar" s={11} c="var(--text3)"/> תוקף: {q.validity}</div>}
                        {q.fileName && <div style={{display:"flex",alignItems:"center",gap:6,color:"var(--accent)"}}><Icon n="download" s={11} c="var(--accent)"/> <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.fileName}</span></div>}
                      </div>

                      {q.notes && <div style={{fontSize:11.5,color:"var(--text3)",lineHeight:1.45,borderTop:"1px dashed var(--border)",paddingTop:8}}>{q.notes}</div>}

                      <div style={{display:"flex",gap:6,marginTop:"auto",paddingTop:8,borderTop:"1px solid var(--border)"}}>
                        <button onClick={()=>approveQuote(q.id)} style={{flex:1,background:isApproved?"var(--success-light)":"transparent",color:isApproved?"#065F46":"var(--text2)",border:`1px solid ${isApproved?"rgba(16,185,129,.35)":"var(--border)"}`,borderRadius:8,padding:"6px 8px",fontSize:12,fontWeight:600,fontFamily:"'Heebo',sans-serif",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:4}}>
                          <Icon n="check" s={12}/> {isApproved?"נבחר":"בחר"}
                        </button>
                        <button onClick={()=>openEdit(q)} title="ערוך" style={{background:"transparent",color:"var(--text2)",border:"1px solid var(--border)",borderRadius:8,padding:"6px 8px",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                          <Icon n="edit" s={12}/>
                        </button>
                        <button onClick={()=>deleteQuote(q.id)} title="מחק" style={{background:"transparent",color:"var(--danger)",border:"1px solid var(--border)",borderRadius:8,padding:"6px 8px",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                          <Icon n="trash" s={12}/>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Add / Edit Modal */}
      {addOpen && (
        <Modal onClose={closeModal} title={editing ? "עריכת הצעת מחיר" : "הצעת מחיר חדשה"} width={600}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:12}}>
            <div style={{gridColumn:"1 / -1"}}>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>נושא *</div>
              <Select value={form.topicId} onChange={(v)=>{ if(v==="__add__"){ setTopicInputOpen(true); } else { setForm(f=>({...f,topicId:v})); } }}>
                {topics.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
                <option value="__add__">➕ הוסף נושא חדש…</option>
              </Select>
              {topicInputOpen && (
                <div style={{marginTop:8,display:"flex",gap:6}}>
                  <Input value={newTopicName} onChange={setNewTopicName} placeholder="שם הנושא החדש" style={{flex:1}}/>
                  <Btn size="sm" onClick={addCustomTopic} disabled={!newTopicName.trim()}>הוסף</Btn>
                  <Btn size="sm" variant="ghost" onClick={()=>{ setTopicInputOpen(false); setNewTopicName(""); }}>ביטול</Btn>
                </div>
              )}
            </div>

            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>שם ספק / קבלן *</div>
              <Input value={form.supplier} onChange={v=>setForm(f=>({...f,supplier:v}))} placeholder="למשל: מטבחי גולן"/>
            </div>
            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>איש קשר</div>
              <Input value={form.contact} onChange={v=>setForm(f=>({...f,contact:v}))} placeholder="שם איש הקשר"/>
            </div>

            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>טלפון</div>
              <Input value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="050-0000000"/>
            </div>
            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>דוא"ל</div>
              <Input value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="name@example.com"/>
            </div>

            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>סה"כ הצעה (₪) *</div>
              <Input type="number" value={form.total} onChange={v=>setForm(f=>({...f,total:v}))} placeholder="0"/>
            </div>
            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>תוקף ההצעה</div>
              <Input type="date" value={form.validity} onChange={v=>setForm(f=>({...f,validity:v}))}/>
            </div>

            <div style={{gridColumn:"1 / -1"}}>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>הערות</div>
              <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="פירוט, הכללות, תנאי תשלום…" rows={3}
                style={{width:"100%",border:"1.5px solid var(--border)",borderRadius:10,padding:"11px 14px",fontSize:14,fontFamily:"'Heebo',sans-serif",resize:"vertical",outline:"none",direction:"rtl",background:"var(--surface)",color:"var(--text1)"}}/>
            </div>

            <div style={{gridColumn:"1 / -1"}}>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>קובץ הצעה (אופציונלי)</div>
              <div style={{display:"flex",alignItems:"center",gap:10,border:"1.5px dashed var(--border)",borderRadius:10,padding:"10px 12px",background:"var(--bg)"}}>
                <label style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,color:"var(--accent)",fontSize:13,fontWeight:600}}>
                  <Icon n="download" s={14} c="var(--accent)"/> בחר קובץ PDF / תמונה
                  <input type="file" accept="application/pdf,image/*" onChange={e=>onFilePick(e.target.files && e.target.files[0])} style={{display:"none"}}/>
                </label>
                <span style={{fontSize:12,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {form.fileName ? form.fileName : "לא נבחר קובץ"}
                </span>
                {form.fileName && (
                  <button onClick={()=>setForm(f=>({...f,fileName:""}))} style={{marginRight:"auto",background:"transparent",border:"none",cursor:"pointer",color:"var(--text3)",display:"inline-flex"}}>
                    <Icon n="x" s={14}/>
                  </button>
                )}
              </div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:6}}>הקובץ עצמו יישמר במערכת לאחר חיבור דאטהבייס. כרגע נשמר שם הקובץ בלבד.</div>
            </div>
          </div>

          <div style={{marginTop:20,display:"flex",justifyContent:"flex-end",gap:8}}>
            <Btn variant="ghost" onClick={closeModal}>ביטול</Btn>
            <Btn onClick={saveQuote} disabled={!form.supplier.trim() || !form.total || !form.topicId}>
              <Icon n="check" s={13}/> {editing ? "שמור שינויים" : "שמור הצעה"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Compare Modal */}
      {compareTopic && (
        <Modal onClose={()=>setCompareTopicId(null)} title={`השוואת הצעות — ${compareTopic.name}`} width={900}>
          <div style={{overflowX:"auto"}}>
            <table className="bp-table" style={{width:"100%",minWidth:760}}>
              <thead>
                <tr>
                  <th>ספק</th>
                  <th>איש קשר</th>
                  <th>טלפון</th>
                  <th>תוקף</th>
                  <th>סה"כ</th>
                  <th>סטטוס</th>
                  <th style={{textAlign:"center"}}>בחירה</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((q, i)=>{
                  const isCheapest = q.total === cmpMin && compareRows.length >= 2;
                  const isApproved = q.status === "approved";
                  return (
                    <tr key={q.id} style={{background: isApproved ? "rgba(16,185,129,.08)" : isCheapest ? "rgba(16,185,129,.04)" : "transparent"}}>
                      <td style={{fontWeight:600}}>
                        {q.supplier}
                        {isCheapest && <span className="badge badge-done" style={{marginRight:8,fontSize:10}}>הזולה</span>}
                      </td>
                      <td style={{fontSize:13,color:"var(--text2)"}}>{q.contact || "—"}</td>
                      <td style={{fontSize:13,color:"var(--text2)"}}>{q.phone || "—"}</td>
                      <td style={{fontSize:13,color:"var(--text2)"}}>{q.validity || "—"}</td>
                      <td style={{fontWeight:800,fontSize:15,color:isCheapest?"var(--success)":"var(--text1)"}}>{fmtMoney(q.total)}</td>
                      <td><Badge type={statusBadgeType(q.status)}>{q.status==="approved"?"נבחר":q.status==="rejected"?"נדחה":"ממתין"}</Badge></td>
                      <td style={{textAlign:"center"}}>
                        <Btn size="sm" variant={isApproved?"primary":"ghost"} onClick={()=>approveQuote(q.id)}>
                          <Icon n="check" s={12}/> {isApproved?"נבחר":"בחר הצעה"}
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:10}}>
            <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"var(--text3)",fontWeight:600}}>הצעה זולה</div>
              <div style={{fontSize:15,fontWeight:800,color:"var(--success)",marginTop:2}}>{fmtMoney(cmpMin)}</div>
            </div>
            <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"var(--text3)",fontWeight:600}}>הצעה יקרה</div>
              <div style={{fontSize:15,fontWeight:800,color:"var(--text1)",marginTop:2}}>{fmtMoney(cmpMax)}</div>
            </div>
            <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"var(--text3)",fontWeight:600}}>הפרש</div>
              <div style={{fontSize:15,fontWeight:800,color:"var(--accent)",marginTop:2}}>{fmtMoney(cmpMax-cmpMin)}</div>
            </div>
            <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"var(--text3)",fontWeight:600}}>ממוצע</div>
              <div style={{fontSize:15,fontWeight:800,color:"var(--text1)",marginTop:2}}>{fmtMoney(cmpAvg)}</div>
            </div>
          </div>

          <div style={{marginTop:16,fontSize:12,color:"var(--text3)",lineHeight:1.6}}>
            בחירת הצעה מסמנת אותה כמאושרת ומעבירה את שאר ההצעות בנושא זה למצב "נדחה". ניתן לבטל בחירה בלחיצה נוספת על הכפתור.
          </div>
        </Modal>
      )}
    </div>
  );
};


