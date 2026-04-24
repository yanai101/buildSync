import React from 'react';
import { motion } from 'framer-motion';
import { Icon, Avatar, Badge, Stars, Btn, Modal, ProgressBar } from '../components/Shared';
import { Contractor, Milestone } from '../types';
import { useDataSource } from '../hooks/useDataSource';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { fmtMoney } from '../utils/mockData';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const DEFAULT_SCHEDULE = [
  {name:"מקדמה לפני התחלה", pct:30, triggerText:"לפני תחילת עבודה"},
  {name:"תשלום ביניים א'", pct:25, triggerText:"אחרי 30% מהעבודה"},
  {name:"תשלום ביניים ב'", pct:25, triggerText:"אחרי 70% מהעבודה"},
  {name:"תשלום סופי", pct:20, triggerText:"סיום ואישור מפקח"},
];

const DEFAULT_PAYMENT_SCHEDULES: Record<string, typeof DEFAULT_SCHEDULE> = {
  "קבלן עד מפתח": [
    {name:"מקדמה וחתימת חוזה", pct:10, triggerText:"חתימת חוזה ותחילת עבודה"},
    {name:"סיום עבודות עפר", pct:10, triggerText:"אישור מפקח לסיום חפירה ויסודות"},
    {name:"סיום שלד", pct:20, triggerText:"אישור קונסטרוקטור ומפקח"},
    {name:"מערכות גולמיות", pct:15, triggerText:"חשמל, אינסטלציה ומיזוג לפני טיח"},
    {name:"סיום טיח", pct:10, triggerText:"אישור מפקח לטיח פנים וחוץ"},
    {name:"ריצוף וחיפויים", pct:15, triggerText:"סיום ריצוף וחיפוי רטובים"},
    {name:"גמרים", pct:10, triggerText:"צבע, נגרות, אביזרים וחשמל עדין"},
    {name:"פיתוח חוץ", pct:5, triggerText:"סיום עבודות חוץ וגינה"},
    {name:"מסירה סופית", pct:5, triggerText:"פרוטוקול מסירה ותיקון ליקויים"},
  ],
};

const ContractorRoles = [
  "קבלן עד מפתח","קבלן שלד","קבלן עפר","קבלן טיח","חשמלאי ראשי",
  "אינסטלטור","קבלן ריצוף","קבלן גג","קבלן גבס","קבלן נגרות","צבעי","קבלן גינה","אחר"
];

const COLORS = ["#7B9B8A","#8B7B5A","#7B8FA1","#E07A38","#6B8B6B","#8B5A5A","#5A5A8B"];

type ContractorForm = {
  name: string;
  company: string;
  role: string;
  phone: string;
  email: string;
  budget: number;
};

const emptyForm: ContractorForm = {
  name: "",
  company: "",
  role: "קבלן עד מפתח",
  phone: "",
  email: "",
  budget: 0,
};

const normalizeMilestones = (contractor: Contractor): Milestone[] => {
  if (contractor.milestones?.length) {
    return contractor.milestones.map(m => ({
      ...m,
      status: m.paid ? 'paid' : m.status,
      paidAt: m.paidAt ?? null,
    }));
  }

  const base = DEFAULT_PAYMENT_SCHEDULES[contractor.role] || DEFAULT_SCHEDULE;
  return base.map((m, i) => {
    const cumulativePct = base.slice(0, i + 1).reduce((total, step) => total + step.pct, 0);
    const paid = contractor.paid >= contractor.budget * (cumulativePct / 100);
    return {
      id: `${contractor.id}-${i}`,
      name: m.name,
      pct: m.pct,
      taskIds: [],
      amount: Math.round(contractor.budget * m.pct / 100),
      triggerText: m.triggerText,
      paid,
      status: paid ? 'paid' : 'pending',
      paidAt: null,
    };
  });
};

const contractorDbId = (contractor: Contractor) => String(contractor._id ?? contractor.id);

type DraftMilestone = Milestone & { isNew?: boolean };

const clampPct = (pct: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(pct) ? pct : 0)));

const withAmounts = (contractor: Contractor, milestones: DraftMilestone[]): DraftMilestone[] =>
  milestones.map(m => ({
    ...m,
    amount: Math.round(contractor.budget * m.pct / 100),
  }));

const balanceMilestones = (milestones: DraftMilestone[], changedIndex: number): DraftMilestone[] => {
  const next = milestones.map(m => ({ ...m, pct: clampPct(m.pct) }));
  if (next.length === 0) return next;

  const total = next.reduce((sum, m) => sum + m.pct, 0);
  let delta = total - 100;

  if (delta > 0) {
    const indexes = [
      ...Array.from({ length: changedIndex }, (_, i) => changedIndex - 1 - i),
      ...next.map((_, i) => i).filter(i => i > changedIndex),
    ];

    for (const index of indexes) {
      if (delta <= 0) break;
      const reduction = Math.min(next[index].pct, delta);
      next[index].pct -= reduction;
      delta -= reduction;
    }

    if (delta > 0) {
      next[changedIndex].pct = Math.max(0, next[changedIndex].pct - delta);
    }
  }

  if (delta < 0) {
    const targetIndex = changedIndex > 0 ? changedIndex - 1 : next.findIndex((_, i) => i !== changedIndex);
    next[targetIndex >= 0 ? targetIndex : changedIndex].pct += Math.abs(delta);
  }

  const balancedTotal = next.reduce((sum, m) => sum + m.pct, 0);
  if (balancedTotal !== 100) {
    const targetIndex = next.findIndex((_, i) => i !== changedIndex);
    next[targetIndex >= 0 ? targetIndex : changedIndex].pct += 100 - balancedTotal;
  }

  return next.map(m => ({ ...m, pct: clampPct(m.pct) }));
};

const PaymentSchedule = ({
  contractor,
  onTogglePaid,
  onSaveSchedule,
}: {
  contractor: Contractor;
  onTogglePaid: (milestone: Milestone, paid: boolean) => Promise<void>;
  onSaveSchedule: (contractor: Contractor, milestones: DraftMilestone[]) => Promise<void>;
}) => {
  const sourceMilestones = React.useMemo(() => normalizeMilestones(contractor), [contractor]);
  const [milestones, setMilestones] = React.useState<DraftMilestone[]>(() => sourceMilestones);
  const [adding, setAdding] = React.useState(false);
  const [newM, setNewM] = React.useState({name:"", pct:10, triggerText:""});
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [savingNew, setSavingNew] = React.useState(false);
  const [savingSchedule, setSavingSchedule] = React.useState(false);

  React.useEffect(() => {
    setMilestones(sourceMilestones);
  }, [sourceMilestones]);

  const totalPaid = milestones.filter(m=>m.paid).reduce((a,m)=>a+m.amount,0);
  const totalPct = milestones.filter(m=>m.paid).reduce((a,m)=>a+m.pct,0);
  const totalPctAll = milestones.reduce((a,m)=>a+m.pct,0);
  const totalAmount = milestones.reduce((a,m)=>a+m.amount,0);

  const toggle = async (milestone: Milestone) => {
    setPendingId(String(milestone.id));
    try {
      await onTogglePaid(milestone, !milestone.paid);
    } finally {
      setPendingId(null);
    }
  };

  const saveSchedule = async (nextMilestones = milestones) => {
    setSavingSchedule(true);
    try {
      await onSaveSchedule(contractor, nextMilestones);
    } finally {
      setSavingSchedule(false);
    }
  };

  const updateMilestone = (index: number, patch: Partial<DraftMilestone>, shouldBalance = false) => {
    setMilestones(prev => {
      const edited = prev.map((m, i) => i === index ? { ...m, ...patch } : m);
      return withAmounts(contractor, shouldBalance ? balanceMilestones(edited, index) : edited);
    });
  };

  const addMilestone = async () => {
    if (!newM.name.trim()) return;
    setSavingNew(true);
    try {
      const next = withAmounts(contractor, balanceMilestones([
        ...milestones,
        {
          id: `new-${Date.now()}`,
          name: newM.name.trim(),
          triggerText: newM.triggerText.trim(),
          pct: clampPct(Number(newM.pct)),
          taskIds: [],
          amount: 0,
          status: 'pending',
          paid: false,
          paidAt: null,
          isNew: true,
        },
      ], milestones.length));
      setMilestones(next);
      await onSaveSchedule(contractor, next);
      setNewM({name:"", pct:10, triggerText:""});
      setAdding(false);
    } finally {
      setSavingNew(false);
    }
  };

  const saveOnBlur = async () => {
    await saveSchedule(withAmounts(contractor, balanceMilestones(milestones, Math.max(0, milestones.length - 1))));
  };

  return (
    <div className="card">
      <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>לוח תשלומים</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:12,color:"var(--text3)",fontWeight:400}}>שולם: {totalPct}% · {fmtMoney(totalPaid)}</span>
          <span style={{fontSize:12,color:totalPctAll===100?"var(--success)":"var(--danger)",fontWeight:700}}>סה"כ: {totalPctAll}%</span>
          <Btn size="sm" onClick={()=>setAdding(v=>!v)}><Icon n="plus" s={12}/> שלב תשלום</Btn>
        </div>
      </div>

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

      <div style={{overflowX:"auto"}}>
        <table className="bp-table" style={{width:"100%"}}>
          <thead><tr><th>#</th><th>שלב תשלום</th><th>תנאי לתשלום</th><th>%</th><th>סכום</th><th>תאריך</th><th>סטטוס</th></tr></thead>
          <tbody>
            {milestones.map((m,i)=>(
              <tr key={m.id} style={{background:m.paid?"#F0FDF4":"transparent"}}>
                <td style={{fontSize:12,color:"var(--text3)",fontWeight:700}}>{i+1}</td>
                <td>
                  <input
                    className="bp-input"
                    value={m.name}
                    disabled={savingSchedule}
                    onChange={e=>updateMilestone(i, {name:e.target.value})}
                    onBlur={saveOnBlur}
                    style={{minWidth:150,fontSize:13,fontWeight:500}}
                  />
                </td>
                <td>
                  <input
                    className="bp-input"
                    value={m.triggerText || ""}
                    disabled={savingSchedule}
                    onChange={e=>updateMilestone(i, {triggerText:e.target.value})}
                    onBlur={saveOnBlur}
                    style={{minWidth:180,fontSize:12}}
                  />
                </td>
                <td>
                  <input
                    className="bp-input"
                    type="number"
                    min={0}
                    max={100}
                    value={m.pct}
                    disabled={savingSchedule}
                    onChange={e=>updateMilestone(i, {pct:Number(e.target.value)}, true)}
                    onBlur={saveOnBlur}
                    style={{width:72,fontSize:13,fontWeight:600}}
                  />
                </td>
                <td style={{fontSize:13,fontWeight:700,color:m.paid?"var(--success)":"var(--text1)"}}>{fmtMoney(m.amount)}</td>
                <td style={{fontSize:12,color:"var(--text3)"}}>{m.paidAt || "—"}</td>
                <td>
                  <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                    <input
                      type="checkbox"
                      checked={Boolean(m.paid)}
                      disabled={pendingId === String(m.id) || m.isNew}
                      onChange={()=>toggle(m)}
                      style={{accentColor:"var(--success)",width:14,height:14}}
                    />
                    <span className={`badge ${m.paid?"badge-done":"badge-pending"}`}>{m.paid?"שולם":"ממתין"}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{background:"#F9F8F6"}}>
              <td colSpan={3} style={{padding:"10px 12px",fontSize:13,fontWeight:700}}>סה"כ</td>
              <td style={{fontSize:13,fontWeight:700,color:totalPctAll===100?"var(--text1)":"var(--danger)"}}>{totalPctAll}%</td>
              <td style={{fontSize:13,fontWeight:700}}>{fmtMoney(totalAmount)}</td>
              <td/>
              <td style={{fontSize:12,color:"var(--success)",fontWeight:600}}>{fmtMoney(totalPaid)} שולם</td>
            </tr>
          </tfoot>
        </table>
      </div>

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
              <input className="bp-input" value={newM.triggerText} onChange={e=>setNewM(n=>({...n,triggerText:e.target.value}))} placeholder="מה צריך להיות מוכן?"/>
            </div>
            <div style={{flex:"0 0 80px"}}>
              <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>אחוז %</div>
              <input className="bp-input" type="number" value={newM.pct} onChange={e=>setNewM(n=>({...n,pct:Number(e.target.value)}))} min={1} max={100}/>
            </div>
            <div style={{fontSize:12,color:"var(--text2)",alignSelf:"center",paddingBottom:2}}>
              = {fmtMoney(Math.round(contractor.budget*newM.pct/100))}
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn onClick={addMilestone} disabled={savingNew}><Icon n="plus" s={13}/> הוסף</Btn>
              <Btn variant="ghost" onClick={()=>setAdding(false)} disabled={savingNew}>ביטול</Btn>
            </div>
          </div>
          <div style={{fontSize:11,color:"var(--text3)",marginTop:8}}>
            ההוספה מאזנת אוטומטית את האחוזים כך שכל השלבים יחד נשארים 100%.
          </div>
        </div>
      )}
    </div>
  );
};

export const ContractorsScreen = () => {
  const { projectId } = useCurrentProject();
  const dbContractors = useQuery(api.queries.listContractors, projectId ? { projectId } : "skip");
  const contractorsSource = useDataSource<Contractor[]>('contractors', { db: dbContractors as any });
  const { loading, error, refetch, mode } = contractorsSource;
  const contractors = contractorsSource.data ?? [];
  const createContractor = useMutation(api.mutations.createContractor);
  const saveSchedule = useMutation(api.mutations.saveContractorPaymentSchedule);
  const setMilestonePaid = useMutation(api.mutations.setContractorPaymentMilestonePaid);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [savingContractor, setSavingContractor] = React.useState(false);
  const [form, setForm] = React.useState<ContractorForm>(emptyForm);

  const selected = contractors.find(c => String(c.id) === selectedId || String(c._id) === selectedId) ?? null;

  React.useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selected, selectedId]);

  const addContractor = async () => {
    if (!projectId || !form.name.trim()) return;
    setSavingContractor(true);
    try {
      await createContractor({
        projectId,
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        role: form.role as any,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        budget: Number(form.budget) || 0,
        avatarColor: COLORS[contractors.length % COLORS.length],
      });
      setAdding(false);
      setForm(emptyForm);
    } finally {
      setSavingContractor(false);
    }
  };

  const handleTogglePaid = async (milestone: Milestone, paid: boolean) => {
    if (mode !== 'db') return;
    await setMilestonePaid({ milestoneId: String(milestone.id) as any, paid });
  };

  const handleSaveSchedule = async (contractor: Contractor, milestones: DraftMilestone[]) => {
    if (mode !== 'db') return;
    await saveSchedule({
      contractorId: contractorDbId(contractor) as any,
      milestones: milestones.map(milestone => ({
        milestoneId: milestone.isNew ? undefined : String(milestone.id) as any,
        name: milestone.name,
        triggerText: milestone.triggerText || '',
        pct: milestone.pct,
      })),
    });
  };

  const c = selected;

  if (c) return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content">
        <button onClick={()=>setSelectedId(null)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text2)",fontSize:13,marginBottom:16,padding:0}}>
          <Icon n="arrow-right" s={14}/> חזרה לרשימה
        </button>
        <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:20}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="card" style={{padding:20,textAlign:"center"}}>
              <Avatar letter={c.avatar || c.name[0]} color={c.color} size={64} />
              <div style={{fontWeight:700,fontSize:17,marginTop:12}}>{c.name}</div>
              <div style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{c.company}</div>
              <div style={{marginTop:8}}><Badge type={c.status}/></div>
              <div style={{marginTop:8}}><Stars rating={c.rating}/></div>
            </div>
            <div className="card card-body">
              {[[<Icon n="phone" s={14}/>,c.phone || "—"],[<Icon n="mail" s={14}/>,c.email || "—"]].map(([icon,val],i)=>(
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
            <PaymentSchedule contractor={c} onTogglePaid={handleTogglePaid} onSaveSchedule={handleSaveSchedule}/>
            <div className="card">
              <div className="card-header">הערות ותיעוד</div>
              <div className="card-body" style={{color:"var(--text3)",fontSize:13}}>אין הערות עדיין.</div>
            </div>
          </div>
        </div>
      </div>
    </ScreenBoundary>
  );

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:13,color:"var(--text2)"}}>{contractors.length} קבלנים בפרויקט</div>
          <Btn size="sm" onClick={()=>setAdding(true)} disabled={!projectId || mode !== 'db'}><Icon n="plus" s={14}/> קבלן חדש</Btn>
        </div>

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
              onClick={()=>setSelectedId(String(c.id))}
            >
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                <Avatar letter={c.avatar || c.name[0]} color={c.color} size={44}/>
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
                {[
                  ["name","שם הקבלן"],
                  ["company","שם חברה"],
                  ["phone","טלפון"],
                  ["email","אימייל"],
                ].map(([k,label])=>(
                  <div key={k}>
                    <div style={{fontSize:12,color:"var(--text2)",marginBottom:3,fontWeight:500}}>{label}</div>
                    <input className="bp-input" value={form[k as keyof ContractorForm]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
                  </div>
                ))}
                <div>
                  <div style={{fontSize:12,color:"var(--text2)",marginBottom:3,fontWeight:500}}>תקציב מוסכם (₪)</div>
                  <input className="bp-input" type="number" value={form.budget} onChange={e=>setForm(f=>({...f,budget:Number(e.target.value)}))}/>
                </div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
                <Btn variant="ghost" onClick={()=>setAdding(false)} disabled={savingContractor}>ביטול</Btn>
                <Btn onClick={addContractor} disabled={savingContractor || !form.name.trim()}>
                  <Icon n="plus" s={13}/> הוסף קבלן
                </Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ScreenBoundary>
  );
};
