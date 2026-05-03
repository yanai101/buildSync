import React from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Icon, Btn, ProgressBar, Badge, Modal, ConfirmDialog, FeedbackModal } from '../components/Shared';
import { PaymentGatesPanel, PaymentBadge, computeGates, resolveStatus, aggregateStageStatus, ReleasePaymentModal } from '../components/PaymentControl';
import { Stage, Milestone } from '../types';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { STAGES, fmtMoney } from '../utils/mockData';
import { useRequireRole } from '../hooks/useRequireRole';
import { useSubscription } from '../hooks/useSubscription';
import { useAppNotify } from '../hooks/useAppNotify';

type StageGuideTask = {
  legacyId: number;
  name: string;
  assignee: string;
  required: boolean;
  paymentRequired: boolean;
  paymentAmount: number;
};

type StageGuideMilestone = {
  legacyKey: string;
  name: string;
  pct: number;
  taskLegacyIds: number[];
};

type StageGuideStage = {
  legacyId: number;
  name: string;
  icon?: string;
  contractorRole?: string;
  contractorIds?: string[];
  startDate: string;
  endDate: string;
  dependsOnPrevious?: boolean;
  amount: number;
  paymentAtEnd?: boolean;
  tasks: StageGuideTask[];
  milestones: StageGuideMilestone[];
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isoFromUTC = (t: number) => {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const utcMs = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const shiftIsoDate = (iso: string, days: number) => isoFromUTC(utcMs(iso) + days * 86400000);
const diffIsoDays = (a: string, b: string) => Math.round((utcMs(b) - utcMs(a)) / 86400000);

const makeStageTemplate = (projectStartDate?: string): StageGuideStage[] => {
  const baseStart = STAGES[0]?.start;
  const usableProjectStart = projectStartDate && ISO_DATE_RE.test(projectStartDate.slice(0, 10))
    ? projectStartDate.slice(0, 10)
    : '';
  const offsetDays = usableProjectStart && baseStart ? diffIsoDays(baseStart, usableProjectStart) : 0;

  return STAGES.map((stage: Stage, index: number) => ({
    legacyId: Number(stage.id),
    name: stage.name,
    icon: stage.icon,
    contractorRole: stage.contractor,
    startDate: offsetDays && stage.start ? shiftIsoDate(stage.start, offsetDays) : stage.start,
    endDate: offsetDays && stage.end ? shiftIsoDate(stage.end, offsetDays) : stage.end,
    dependsOnPrevious: index > 0,
    amount: stage.payment?.amount ?? 0,
    tasks: (stage.tasks || []).map(task => ({
      legacyId: Number(task.id),
      name: task.name,
      assignee: task.assignee,
      required: task.required !== false,
      paymentRequired: Boolean(task.paymentRequired),
      paymentAmount: Number(task.paymentAmount || 0),
    })),
    milestones: [],
  }));
};

const makeSingleStageTemplate = (stages: Stage[], projectStartDate?: string): StageGuideStage[] => {
  const lastStage = stages[stages.length - 1];
  const usableProjectStart = projectStartDate && ISO_DATE_RE.test(projectStartDate.slice(0, 10))
    ? projectStartDate.slice(0, 10)
    : '';
  const startDate = lastStage?.end && ISO_DATE_RE.test(lastStage.end.slice(0, 10))
    ? shiftIsoDate(lastStage.end.slice(0, 10), 1)
    : usableProjectStart;
  const endDate = startDate ? shiftIsoDate(startDate, 7) : '';
  const legacyId = Math.max(0, ...stages.map(stage => Number(stage.id) || 0)) + 1;

  return [{
    legacyId,
    name: 'שלב חדש',
    icon: '📌',
    contractorRole: 'לא הוגדר',
    contractorIds: [],
    startDate,
    endDate,
    dependsOnPrevious: stages.length > 0,
    amount: 0,
    paymentAtEnd: false,
    tasks: [{
      legacyId: legacyId * 10 + 1,
      name: 'משימה ראשונה',
      assignee: 'לא הוגדר',
      required: true,
      paymentRequired: false,
      paymentAmount: 0,
    }],
    milestones: [],
  }];
};

const nextLegacyId = (items: { legacyId: number }[], fallback: number) =>
  Math.max(fallback, ...items.map(item => item.legacyId)) + 1;

const hasStageStarted = (stage: Stage) =>
  stage.status !== 'pending' ||
  stage.progress > 0 ||
  (stage.tasks || []).some(task => task.done) ||
  Boolean(stage.payment && stage.payment.status !== 'draft');

const contractorKey = (contractor: { id?: unknown; _id?: unknown }) => String(contractor._id ?? contractor.id);

const contractorNamesFromIds = (ids: string[], contractors?: Array<{ id?: unknown; _id?: unknown; name: string }>) =>
  ids
    .map((id) => contractors?.find((contractor) => contractorKey(contractor) === id)?.name)
    .filter((name): name is string => Boolean(name));

const ScrollShadow = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [edge, setEdge] = React.useState({ top: false, bottom: false });

  const updateEdge = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    setEdge({
      top: el.scrollTop > 2,
      bottom: maxScroll - el.scrollTop > 2,
    });
  }, []);

  React.useEffect(() => {
    updateEdge();
  }, [children, updateEdge]);

  return (
    <div style={{position:"relative",height:"100%",minHeight:0,...style}}>
      {edge.top && (
        <div style={{position:"absolute",top:0,left:0,right:0,height:18,background:"linear-gradient(to bottom, rgba(24,24,27,.16), rgba(24,24,27,0))",pointerEvents:"none",zIndex:2,borderTopLeftRadius:8,borderTopRightRadius:8}}/>
      )}
      <div
        ref={ref}
        onScroll={updateEdge}
        style={{height:"100%",overflowY:"auto",paddingInlineEnd:4,scrollbarGutter:"stable"}}
      >
        {children}
      </div>
      {edge.bottom && (
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:18,background:"linear-gradient(to top, rgba(24,24,27,.16), rgba(24,24,27,0))",pointerEvents:"none",zIndex:2,borderBottomLeftRadius:8,borderBottomRightRadius:8}}/>
      )}
    </div>
  );
};

const StageCreationGuide = ({
  onClose,
  onCreate,
  saving,
  projectId,
  projectStartDate,
  mode = 'template',
  initialStages,
  hasPreviousStage = false,
  setFeedback,
}: {
  onClose: () => void;
  onCreate: (stages: StageGuideStage[]) => Promise<void>;
  saving: boolean;
  projectId: any;
  projectStartDate?: string;
  mode?: 'template' | 'single';
  initialStages?: StageGuideStage[];
  hasPreviousStage?: boolean;
  setFeedback: (f: any) => void;
}) => {
  const contractors = useQuery(api.queries.listContractors, { projectId });
  const isSingle = mode === 'single';
  const [draft, setDraft] = React.useState<StageGuideStage[]>(() => initialStages ?? makeStageTemplate(projectStartDate));
  const [selected, setSelected] = React.useState(0);

  const { isProOrPremium } = useSubscription();

  const current = draft[selected] ?? draft[0];
  const contractorOptions = contractors ?? [];
  const selectedContractorIds = current?.contractorIds ?? [];
  const selectedContractorNames = contractorNamesFromIds(selectedContractorIds, contractorOptions);
  const milestoneTotal = current?.milestones.reduce((sum, milestone) => sum + Number(milestone.pct || 0), 0) ?? 0;
  const validation = React.useMemo(() => {
    if (draft.length === 0) return 'צריך לפחות שלב אחד';
    for (const stage of draft) {
      if (!stage.name.trim()) return 'לכל שלב חייב להיות שם';
      if (stage.tasks.length === 0) return `בשלב "${stage.name || 'ללא שם'}" חייבת להיות לפחות משימה אחת`;
      const taskIds = new Set(stage.tasks.map(task => task.legacyId));
      if (stage.milestones.some(milestone => milestone.taskLegacyIds.some(id => !taskIds.has(id)))) {
        return `יש אבן דרך בשלב "${stage.name}" שמחוברת למשימה שלא קיימת`;
      }
      if (stage.tasks.some(task => task.paymentRequired && Number(task.paymentAmount || 0) <= 0)) {
        return `יש משימה בתשלום בשלב "${stage.name}" ללא סכום תקין`;
      }
      if (!stage.paymentAtEnd && stage.amount > 0) {
        const paidTasks = stage.tasks.filter(t => t.paymentRequired);
        if (paidTasks.length > 0) {
          const sum = paidTasks.reduce((acc, t) => acc + Number(t.paymentAmount || 0), 0);
          if (sum !== stage.amount) {
            return `בשלב "${stage.name}", סך התשלומים למשימות (₪${sum}) לא תואם לסכום השלב (₪${stage.amount})`;
          }
        }
      }
    }
    return null;
  }, [draft]);

  const updateStage = (patch: Partial<StageGuideStage>) => {
    setDraft(prev => prev.map((stage, index) => index === selected ? { ...stage, ...patch } : stage));
  };

  const toggleStageContractor = (id: string, checked: boolean) => {
    const nextIds = checked
      ? [...selectedContractorIds, id]
      : selectedContractorIds.filter((contractorId) => contractorId !== id);
    updateStage({
      contractorIds: nextIds,
      contractorRole: contractorNamesFromIds(nextIds, contractorOptions).join(', '),
    });
  };

  const updateTask = (taskIndex: number, patch: Partial<StageGuideTask>) => {
    setDraft(prev => prev.map((stage, index) => {
      if (index !== selected) return stage;
      return {
        ...stage,
        tasks: stage.tasks.map((task, i) => i === taskIndex ? { ...task, ...patch } : task),
      };
    }));
  };

  const updateMilestone = (milestoneIndex: number, patch: Partial<StageGuideMilestone>) => {
    setDraft(prev => prev.map((stage, index) => {
      if (index !== selected) return stage;
      return {
        ...stage,
        milestones: stage.milestones.map((milestone, i) => i === milestoneIndex ? { ...milestone, ...patch } : milestone),
      };
    }));
  };


  const removeStage = (idx: number) => {
    setDraft(prev => prev.filter((_, index) => index !== idx));
    if (selected >= idx) setSelected(Math.max(0, selected - 1));
  };

  const addTask = () => {
    if (!current) return;
    updateStage({
      tasks: [
        ...current.tasks,
        {
          legacyId: nextLegacyId(current.tasks, current.legacyId * 10),
          name: 'משימה חדשה',
          assignee: selectedContractorNames[0] || current.contractorRole || 'לא הוגדר',
          required: true,
          paymentRequired: false,
          paymentAmount: 0,
        },
      ],
    });
  };

  const removeTask = (taskIndex: number) => {
    if (!current) return;
    const removed = current.tasks[taskIndex];
    updateStage({
      tasks: current.tasks.filter((_, index) => index !== taskIndex),
      milestones: current.milestones.map(milestone => ({
        ...milestone,
        taskLegacyIds: milestone.taskLegacyIds.filter(id => id !== removed.legacyId),
      })),
    });
  };

  const addMilestone = () => {
    if (!current) return;
    updateStage({
      milestones: [
        ...current.milestones,
        { legacyKey: `m-${Date.now()}`, name: 'אבן דרך חדשה', pct: 0, taskLegacyIds: [] },
      ],
    });
  };

  const toggleMilestoneTask = (milestoneIndex: number, taskId: number) => {
    const milestone = current.milestones[milestoneIndex];
    const hasTask = milestone.taskLegacyIds.includes(taskId);
    updateMilestone(milestoneIndex, {
      taskLegacyIds: hasTask
        ? milestone.taskLegacyIds.filter(id => id !== taskId)
        : [...milestone.taskLegacyIds, taskId],
    });
  };

  const addStage = () => {
    if (!isProOrPremium) {
      setFeedback({ title: 'שדרוג נדרש', message: 'הוספת שלבי בנייה מותאמים אישית זמינה במסלול Pro ומעלה.', type: 'error' });
      return;
    }
    const legacyId = nextLegacyId(draft, 0);
    setDraft(prev => [
      ...prev,
      {
        legacyId,
        name: 'שלב חדש',
        icon: '📌',
        contractorRole: 'לא הוגדר',
        contractorIds: [],
        startDate: '',
        endDate: '',
        dependsOnPrevious: draft.length > 0,
        amount: 0,
        paymentAtEnd: false,
        tasks: [{
          legacyId: legacyId * 10 + 1,
          name: 'משימה ראשונה',
          assignee: 'לא הוגדר',
          required: true,
          paymentRequired: false,
          paymentAmount: 0,
        }],
        milestones: [],
      },
    ]);
    setSelected(draft.length);
  };

  return (
    <Modal title={isSingle ? "הוספת שלב חדש" : "יצירת שלבי בנייה מתבנית"} onClose={onClose} width={isSingle ? 760 : 1040}>
      <div className={isSingle ? "stage-wizard-single" : "stage-wizard-layout"}>
        {!isSingle && (
        <div className="stage-wizard-master" style={{display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:800}}>תבנית מאסטר</div>
            <Btn size="sm" variant="ghost" onClick={addStage}><Icon n="plus" s={12}/> שלב</Btn>
          </div>
          <ScrollShadow style={{flex:1, minHeight: 150}}>
            <Reorder.Group
              axis="y"
              values={draft}
              onReorder={(nextDraft) => {
                const currentStage = draft[selected];
                setDraft(nextDraft);
                const nextIndex = nextDraft.findIndex(s => s.legacyId === currentStage.legacyId);
                if (nextIndex !== -1) setSelected(nextIndex);
              }}
              style={{display:"flex",flexDirection:"column",gap:8,paddingBlock:2,listStyle:"none",padding:0}}
            >
              {draft.map((stage, index) => (
                <Reorder.Item
                  key={stage.legacyId}
                  value={stage}
                  onClick={() => setSelected(index)}
                  style={{
                    border:"1px solid",
                    borderColor:index===selected?"var(--accent)":"var(--border)",
                    background:index===selected?"var(--accent-light)":"#fff",
                    borderRadius:8,
                    padding:"10px 12px",
                    textAlign:"right",
                    cursor:"grab",
                    fontFamily:"'Heebo',sans-serif",
                    position:"relative",
                  }}
                >
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span>{stage.icon || "•"}</span>
                    <span style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{stage.name}</span>
                    <div style={{marginInlineStart:"auto",display:"flex",alignItems:"center",gap:4}}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeStage(index); }}
                        style={{background:"none",border:"none",padding:4,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
                        title="מחק שלב"
                      >
                        <Icon n="trash" s={14} c="var(--danger)"/>
                      </button>
                      <Icon n="menu" s={14} c="var(--text3)"/>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>
                    {stage.tasks.length} משימות · {fmtMoney(stage.amount)}
                    {index > 0 && stage.dependsOnPrevious ? ' · מחובר לקודם' : ''}
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </ScrollShadow>
        </div>
        )}

        {current && (
          <div className="stage-wizard-detail" style={{display:"flex",flexDirection:"column",minHeight:0}}>
            <ScrollShadow style={{flex:1}}>
              <div style={{paddingInlineEnd:4,paddingBlock:2}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:14}}>
                  <div>
                <div style={{fontSize:18,fontWeight:800}}>עריכת שלב</div>
                <div style={{fontSize:12,color:"var(--text3)"}}>
                  {isSingle
                    ? "השלב יתווסף לסוף הרשימה, עם משימות לא מסומנות ותשלום במצב טיוטה."
                    : "כל השלבים ייווצרו כחדשים, עם משימות לא מסומנות ותשלום במצב טיוטה."}
                </div>
              </div>
            </div>

            <div className="card" style={{padding:16,marginBottom:14}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                <label style={{flex:"1 1 80px"}}>
                  <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>אייקון</div>
                  <input className="bp-input" value={current.icon || ""} onChange={e=>updateStage({icon:e.target.value})}/>
                </label>
                <label style={{flex:"1 1 180px"}}>
                  <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>שם שלב</div>
                  <input className="bp-input" value={current.name} onChange={e=>updateStage({name:e.target.value})}/>
                </label>
                <label style={{flex:"1 1 120px"}}>
                  <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>התחלה</div>
                  <input className="bp-input" type="date" value={current.startDate} onChange={e=>updateStage({startDate:e.target.value})}/>
                </label>
                <label style={{flex:"1 1 120px"}}>
                  <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>סיום</div>
                  <input className="bp-input" type="date" value={current.endDate} onChange={e=>updateStage({endDate:e.target.value})}/>
                </label>
              </div>
              <div style={{marginTop:10,border:"1px solid var(--border)",borderRadius:8,padding:10,background:"#fff"}}>
                <div style={{fontSize:11,color:"var(--text2)",fontWeight:700,marginBottom:8}}>קבלנים משתתפים בשלב</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {contractorOptions.length ? contractorOptions.map(contractor => {
                    const id = contractorKey(contractor);
                    const checked = selectedContractorIds.includes(id);
                    return (
                      <label key={id} style={{display:"flex",alignItems:"center",gap:6,border:"1px solid",borderColor:checked?"var(--accent)":"var(--border)",background:checked?"var(--accent-light)":"#fff",borderRadius:999,padding:"5px 9px",fontSize:12,cursor:"pointer"}}>
                        <input type="checkbox" checked={checked} onChange={e=>toggleStageContractor(id, e.target.checked)} />
                        <span>{contractor.name}</span>
                      </label>
                    );
                  }) : (
                    <span style={{fontSize:12,color:"var(--text3)"}}>אין עדיין קבלנים בפרויקט.</span>
                  )}
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:10}}>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <label style={{display:"block",maxWidth:180}}>
                    <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>סכום תשלום גלובלי</div>
                    <input className="bp-input" type="number" value={current.amount} onChange={e=>updateStage({amount:Number(e.target.value)})}/>
                  </label>
                  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",marginTop:14}}>
                    <input type="checkbox" checked={current.paymentAtEnd} onChange={e=>{
                      const isGlobal = e.target.checked;
                      updateStage({ paymentAtEnd: isGlobal });
                    }}/>
                    תשלום גלובלי בסיום השלב
                  </label>
                  {(() => {
                    const dependencyDisabled = !hasPreviousStage && selected === 0;
                    return (
                  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:dependencyDisabled?"not-allowed":"pointer",marginTop:14,color:dependencyDisabled?"var(--text3)":"var(--text2)"}}>
                    <input
                      type="checkbox"
                      checked={!dependencyDisabled && Boolean(current.dependsOnPrevious)}
                      disabled={dependencyDisabled}
                      onChange={e=>updateStage({dependsOnPrevious:e.target.checked})}
                    />
                    מחובר לשלב הקודם
                  </label>
                    );
                  })()}
                </div>
                {!isSingle && (
                <Btn size="sm" variant="ghost" onClick={()=>removeStage(selected)} disabled={draft.length<=1} style={{color:"var(--danger)"}}>
                  <Icon n="trash" s={14}/> הסר שלב
                </Btn>
                )}
              </div>
            </div>

            <div className="card" style={{padding:16,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:800}}>משימות</div>
                <Btn size="sm" variant="ghost" onClick={addTask}><Icon n="plus" s={12}/> משימה</Btn>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {current.tasks.map((task, taskIndex) => (
                  <div key={task.legacyId} style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center",background:"#f9f9f9",padding:8,borderRadius:8}}>
                    <input className="bp-input" value={task.name} onChange={e=>updateTask(taskIndex,{name:e.target.value})} style={{flex:"1 1 180px"}}/>
                    <select className="bp-input" value={task.assignee} onChange={e=>updateTask(taskIndex,{assignee:e.target.value})} style={{flex:"1 1 120px"}}>
                      <option value="">לא הוגדר</option>
                      <option value="מפקח">מפקח</option>
                      <option value="בעל הבית">בעל הבית</option>
                      <optgroup label="קבלנים">
                        {contractors?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </optgroup>
                    </select>
                    <label style={{fontSize:12,color:"var(--text2)",display:"flex",gap:6,alignItems:"center",flex:"0 0 auto"}}>
                      <input type="checkbox" checked={task.required} onChange={e=>updateTask(taskIndex,{required:e.target.checked})}/>
                      חובה
                    </label>
                    {!current.paymentAtEnd && (
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",flex:"1 1 200px"}}>
                        <label style={{fontSize:12,color:"var(--text2)",display:"flex",gap:6,alignItems:"center",flex:"0 0 auto"}}>
                          <input
                            type="checkbox"
                            checked={task.paymentRequired}
                            onChange={e=>updateTask(taskIndex,{
                              paymentRequired:e.target.checked,
                              paymentAmount:e.target.checked ? task.paymentAmount : 0,
                            })}
                          />
                          תשלום בסיום
                        </label>
                        <input
                          className="bp-input"
                          type="number"
                          min={0}
                          placeholder="סכום ₪"
                          value={task.paymentRequired ? task.paymentAmount : ''}
                          disabled={!task.paymentRequired}
                          onChange={e=>updateTask(taskIndex,{paymentAmount:Number(e.target.value) || 0})}
                          style={{flex:"1 1 80px"}}
                        />
                      </div>
                    )}
                    <Btn size="sm" variant="ghost" onClick={()=>removeTask(taskIndex)} style={{flex:"0 0 auto"}}>מחק</Btn>
                  </div>
                ))}
              </div>
              {!current.paymentAtEnd && current.tasks.some(t => t.paymentRequired) && (
                <div style={{marginTop: 12}}>
                  {(() => {
                    const sum = current.tasks.filter(t => t.paymentRequired).reduce((acc, t) => acc + Number(t.paymentAmount || 0), 0);
                    if (sum !== current.amount) {
                      const diff = current.amount - sum;
                      return (
                        <div style={{fontSize:12, color:"#991B1B", background:"#FEF2F2", padding:"8px 12px", borderRadius:6, border:"1px solid #F87171"}}>
                          <div style={{fontWeight:700, marginBottom:2}}>סכום המשימות לא תואם!</div>
                          <div>סך כל התשלומים במשימות ({fmtMoney(sum)}) {diff > 0 ? "נמוך" : "גבוה"} מהסכום הכולל של השלב ({fmtMoney(current.amount)}). הפרש: {fmtMoney(Math.abs(diff))}</div>
                        </div>
                      );
                    }
                    return (
                      <div style={{fontSize:12, color:"#065F46", background:"#D1FAE5", padding:"8px 12px", borderRadius:6, display:"flex", alignItems:"center", gap:6}}>
                        <Icon n="check" s={14}/>
                        <span>סך התשלומים למשימות תואם לסכום השלב ({fmtMoney(sum)}).</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="card" style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800}}>תשלומים לפי משימות</div>
                  <div style={{fontSize:11,color:"var(--text3)"}}>
                    התשלום נפתח רק אחרי שכל משימות השלב הושלמו
                  </div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {current.paymentAtEnd ? (
                  <div style={{border:"1px solid #10B981",background:"#F0FDF4",borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
                    <span style={{fontSize:13,fontWeight:700}}>תשלום גלובלי עבור סיום שלב: {current.name}</span>
                    <span style={{fontSize:13,color:"var(--success)",fontWeight:800}}>{fmtMoney(Number(current.amount) || 0)}</span>
                  </div>
                ) : current.tasks.filter(task => task.paymentRequired).length ? (
                  current.tasks.filter(task => task.paymentRequired).map(task => (
                    <div key={task.legacyId} style={{border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
                      <span style={{fontSize:13,fontWeight:700}}>{task.name}</span>
                      <span style={{fontSize:13,color:"var(--success)",fontWeight:800}}>{fmtMoney(Number(task.paymentAmount) || 0)}</span>
                    </div>
                  ))
                ) : (
                  <div style={{fontSize:12,color:"var(--text3)",border:"1px dashed var(--border)",borderRadius:8,padding:12}}>
                    לא הוגדרו תשלומים למשימות בשלב הזה.
                  </div>
                )}
              </div>
            </div>
          </div>
          </ScrollShadow>
          </div>
        )}
      </div>

      {validation && <div style={{marginTop:14,color:"var(--danger)",fontSize:13,fontWeight:700}}>{validation}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:18}}>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>ביטול</Btn>
        <Btn onClick={()=>onCreate(draft)} disabled={saving || Boolean(validation)}>
          <Icon n="check" s={14}/> {saving ? "יוצר..." : isSingle ? "הוסף שלב" : "צור שלבי בנייה"}
        </Btn>
      </div>
    </Modal>
  );
};

export const StagesScreen = () => {
  const { projectId } = useCurrentProject();
  const dbStages = useQuery(api.queries.listStages, projectId ? { projectId } : "skip");
  const project = useQuery(api.queries.getProject, projectId ? { projectId } : "skip");
  const initialData = (dbStages ?? null) as Stage[] | null;
  const loading = Boolean(projectId) && dbStages === undefined;
  const error = null as Error | null;
  const refetch = React.useCallback(() => {}, []);
  const { mutate } = useDataMutation('stages');
  const createStagesFromTemplate = useMutation(api.stages.createFromTemplate);
  const addStageMutation = useMutation(api.stages.addStage);
  const updateStageDetails = useMutation(api.stages.updateStageDetails);
  const updateStageAdvanced = useMutation(api.stages.updateStageAdvanced);
  const deleteStageMutation = useMutation(api.stages.deleteStage);
  const setStagePaymentPaid = useMutation(api.stages.setStagePaymentPaid);
  const setStageMilestonePaid = useMutation(api.stages.setStageMilestonePaid);
  
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const [releaseFor, setReleaseFor] = React.useState<{stage: Stage; milestoneId: string | null; amount: number; milestoneName: string | null} | null>(null);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [addStageOpen, setAddStageOpen] = React.useState(false);
  const { role } = useRequireRole(['owner', 'manager', 'inspector', 'contractor']);
  const isContractor = role === 'contractor';
  const { isProOrPremium } = useSubscription();
  const currentIdentity = useQuery(api.users.currentIdentity, {});
  const [savingGuide, setSavingGuide] = React.useState(false);
  const [editingStage, setEditingStage] = React.useState<Stage | null>(null);
  const [isAdvancedEdit, setIsAdvancedEdit] = React.useState(false);
  const [editForm, setEditForm] = React.useState({name:"", contractorRole:"", contractorIds: [] as string[], startDate:"", endDate:"", dependsOnPrevious:false, amount:0, paymentAtEnd:false, tasks:[] as any[]});
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Stage | null>(null);
  const [deletingStage, setDeletingStage] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const contractors = useQuery(api.queries.listContractors, projectId ? { projectId } : 'skip');
  const contractorOptions = contractors ?? [];
  const editContractorBudgetTotal = React.useMemo(() => {
    return editForm.contractorIds.reduce((sum, id) => {
      const contractor = contractorOptions.find((item) => contractorKey(item) === id);
      return sum + Number(contractor?.budget || 0);
    }, 0);
  }, [contractorOptions, editForm.contractorIds]);
  const editPaymentAmountMismatch =
    editForm.contractorIds.length > 0 &&
    Math.round(Number(editForm.amount) || 0) !== Math.round(editContractorBudgetTotal);
  const editContractorPaymentWarnings = React.useMemo(() => {
    if (!editingStage) return [];
    const editingStageDbId = String((editingStage as any)._id ?? '');

    return editForm.contractorIds
      .map((contractorId) => {
        const contractor = contractorOptions.find((item) => contractorKey(item) === contractorId);
        if (!contractor) return null;

        let stagePaymentTotal = 0;
        let hasAttributableStage = false;

        for (const stage of stages) {
          const isEditingStage = String((stage as any)._id ?? '') === editingStageDbId;
          const directContractorIds = isEditingStage
            ? editForm.contractorIds
            : (stage.contractors ?? [])
                .filter((stageContractor) => stageContractor.paymentMode !== 'stage_synced')
                .map((stageContractor) => String(stageContractor._id ?? stageContractor.id));

          if (directContractorIds.length === 1 && directContractorIds[0] === contractorId) {
            stagePaymentTotal += isEditingStage
              ? Number(editForm.amount) || 0
              : stage.payment?.amount || 0;
            hasAttributableStage = true;
          }
        }

        if (!hasAttributableStage || Math.round(stagePaymentTotal) === Math.round(contractor.budget)) {
          return null;
        }

        return {
          contractorName: contractor.name,
          stagePaymentTotal,
          contractorBudget: contractor.budget,
        };
      })
      .filter((warning): warning is { contractorName: string; stagePaymentTotal: number; contractorBudget: number } => Boolean(warning));
  }, [contractorOptions, editForm.amount, editForm.contractorIds, editingStage, stages]);

  React.useEffect(() => {
    if (initialData) setStages(initialData);
  }, [initialData]);

  const myContractorRecord = React.useMemo(() => {
    if (!isContractor || !currentIdentity?.userId || !contractors) return null;
    return contractors.find(c => c.userId === currentIdentity.userId);
  }, [isContractor, currentIdentity, contractors]);

  const visibleStages = React.useMemo(() => {
    if (!isContractor) return stages;
    if (!myContractorRecord) return [];
    return stages.filter(s => {
      const contractorIds = s.contractorIds || (s.contractors?.map(c => String((c as any)._id ?? c.id)) || []);
      return contractorIds.includes(myContractorRecord._id) || s.contractor === myContractorRecord.name;
    });
  }, [stages, isContractor, myContractorRecord]);

  const updateStageState = (stageId: number, updater: (s: Stage) => Stage) => {
    setStages(prev => prev.map(s => s.id === stageId ? updater(s) : s));
  };

  const applyUpdatedStageDates = React.useCallback((updatedStages?: Array<{stageId: string; startDate: string; endDate: string}>) => {
    if (!updatedStages?.length) return;
    setStages(prev => prev.map(stage => {
      const updated = updatedStages.find(item => item.stageId === (stage as any)._id);
      return updated ? { ...stage, start: updated.startDate, end: updated.endDate } : stage;
    }));
  }, []);

  const toggleStage = (id: number) => setExpanded(expanded === id ? null : id);

  const paymentSummary = React.useMemo(() => {
    const totalPaid = stages.reduce((sum, stage) => {
      const milestones = stage.payment?.milestones || [];
      if (milestones.length > 0) {
        return sum + milestones
          .filter(milestone => milestone.status === 'paid')
          .reduce((milestoneSum, milestone) => milestoneSum + milestone.amount, 0);
      }
      return sum + (stage.payment?.status === 'paid' ? stage.payment.amount : 0);
    }, 0);
    const totalPaymentAmount = stages.reduce((sum, stage) => {
      const milestones = stage.payment?.milestones || [];
      if (milestones.length > 0) {
        return sum + milestones.reduce((milestoneSum, milestone) => milestoneSum + milestone.amount, 0);
      }
      return sum + (stage.payment?.amount || 0);
    }, 0);
    const projectBudget = project?.budgetTotal || totalPaymentAmount;
    const paidPct = projectBudget > 0 ? Math.min(100, Math.round((totalPaid / projectBudget) * 100)) : 0;
    const remaining = Math.max(0, projectBudget - totalPaid);
    const isOverLimit = projectBudget > 0 && totalPaid >= projectBudget;
    const isNearLimit = projectBudget > 0 && totalPaid >= projectBudget * 0.9;
    return { totalPaid, totalPaymentAmount, projectBudget, paidPct, remaining, isNearLimit, isOverLimit };
  }, [project?.budgetTotal, stages]);

  const requestReview = async (stageId: number, dbId?: string) => {
    updateStageState(stageId, s => ({...s, payment: s.payment ? {...s.payment, status: 'review_requested'} : undefined}));
    if (dbId) await mutate('update', { id: dbId, patch: { 'payment.status': 'review_requested' } });
  };

  const supervisorApprove = async (stageId: number, dbId?: string) => {
    const today = new Date().toLocaleDateString('he-IL');
    updateStageState(stageId, s => ({
      ...s,
      supervisorApproval: { by: 'רון לוי', at: today },
    }));
    if (dbId) await mutate('update', { id: dbId, patch: { supervisorApprovalBy: 'רון לוי', supervisorApprovalAt: today } });
  };

  const confirmRelease = async (receipts?: string[]) => {
    if (!releaseFor) return;
    const { stage: rStage, milestoneId } = releaseFor;
    const id = rStage.id;
    const dbId = (rStage as any)._id;
    const today = new Date().toISOString().slice(0, 10);
    const previousStages = stages;
    
    updateStageState(id, s => {
      if (milestoneId) {
        return {
          ...s,
          payment: s.payment ? {
            ...s.payment,
            milestones: s.payment.milestones?.map(m =>
              m.id === milestoneId ? { ...m, status: 'paid', paidAt: today, receipts } : m
            ),
          } : undefined,
        };
      }
      return {
        ...s,
        payment: s.payment ? { ...s.payment, status: 'paid', paidAt: today, receipts } : undefined,
      };
    });

    try {
      if (milestoneId) {
        await setStageMilestonePaid({ milestoneId: milestoneId as any, paid: true, receipts });
      } else if (dbId) {
        await setStagePaymentPaid({ stageId: dbId, paid: true, receipts });
      }
      setReleaseFor(null);
      refetch();
    } catch (err) {
      setStages(previousStages);
      setFeedback({
        title: "שגיאה באישור תשלום",
        message: err instanceof Error ? err.message : "לא הצלחנו לאשר את התשלום. השינוי בוטל.",
        type: "error",
      });
    }
  };

  const toggleTask = async (stageId: number, taskId: number, taskDbId?: string) => {
    const stage = stages.find(s => s.id === stageId);
    const task = stage?.tasks?.find(t => t.id === taskId);
    if (!task) return;

    const newDone = !task.done;
    const previousStages = stages;

    // Optimistic UI update
    setStages(prev=>prev.map(s=>{
      if(s.id!==stageId) return s;
      const tasks = (s.tasks || []).map(t=>t.id===taskId?{...t,done:newDone}:t);
      const progress = tasks.length ? Math.round(tasks.filter(t=>t.done).length/tasks.length*100) : 0;
      const status = progress===100?"done":progress>0?"active":"pending";
      const wasPaid = s.payment?.status === 'paid';
      const payment = s.payment && wasPaid ? {...s.payment, status: 'disputed'} : s.payment;
      return { ...s, tasks, progress, status, supervisorApproval: wasPaid ? s.supervisorApproval : null, payment };
    }));

    // DB Mutation
    if (taskDbId) {
      try {
        await mutate('toggleTask', { id: taskDbId, done: newDone });
      } catch (err) {
        setStages(previousStages);
        setFeedback({
          title: "שגיאה בעדכון משימה",
          message: err instanceof Error ? err.message : "לא הצלחנו לעדכן את המשימה. השינוי בוטל.",
          type: "error",
        });
      }
    }
  };

  // Helper for milestones (simplified for now)
  const requestReviewMs = (sid: number, mid: string) => {};
  const supervisorApproveMs = (sid: number, mid: string) => {};
  const releaseMs = (s: Stage, m: Milestone) => setReleaseFor({ stage: s, milestoneId: m.id, milestoneName: m.name, amount: m.amount });

  const openEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setIsAdvancedEdit(false);
    const stageContractorIds = (stage.contractorIds ?? stage.contractors?.map(contractor => String(contractor._id ?? contractor.id)) ?? []);
    
    const tasks = (stage.tasks || []).map((t, index) => {
      const ms = stage.payment?.milestones?.find(m => m.taskIds.includes(t.id));
      return {
        _id: (t as any)._id,
        legacyId: t.id,
        name: t.name,
        assignee: t.assignee,
        required: t.required !== false,
        paymentRequired: !!ms,
        paymentAmount: ms ? ms.amount : 0,
      };
    });

    setEditForm({
      name: stage.name,
      contractorRole: stage.contractor || '',
      contractorIds: stageContractorIds,
      startDate: stage.start,
      endDate: stage.end,
      dependsOnPrevious: Boolean(stage.dependsOnPrevious),
      amount: stage.payment?.amount || 0,
      paymentAtEnd: !stage.payment?.milestones?.length && (stage.payment?.amount || 0) > 0,
      tasks,
    });
  };

  const updateEditTask = (index: number, patch: any) => {
    setEditForm(f => ({ ...f, tasks: f.tasks.map((t, i) => i === index ? { ...t, ...patch } : t) }));
  };

  const toggleEditContractor = (id: string, checked: boolean) => {
    setEditForm(f => {
      const nextIds = checked
        ? [...f.contractorIds, id]
        : f.contractorIds.filter(contractorId => contractorId !== id);
      return {
        ...f,
        contractorIds: nextIds,
        contractorRole: contractorNamesFromIds(nextIds, contractorOptions).join(', '),
      };
    });
  };

  const removeEditTask = (index: number) => {
    setEditForm(f => ({ ...f, tasks: f.tasks.filter((_, i) => i !== index) }));
  };

  const saveStageEdit = async () => {
    if (!editingStage) return;
    const stageId = (editingStage as any)._id;
    if (!stageId) return;

    if (isAdvancedEdit && !editForm.paymentAtEnd && editForm.amount > 0) {
      const paidTasks = editForm.tasks.filter(t => t.paymentRequired);
      if (paidTasks.length > 0) {
        const sum = paidTasks.reduce((acc, t) => acc + Number(t.paymentAmount || 0), 0);
        if (sum !== editForm.amount) {
          return; // Prevents saving if validation fails
        }
      }
    }

    setSavingEdit(true);
    try {
      const selectedContractorNames = contractorNamesFromIds(editForm.contractorIds, contractorOptions);
      const contractorRole = selectedContractorNames.join(', ') || editForm.contractorRole;
      if (isAdvancedEdit) {
        const result = await updateStageAdvanced({
          stageId,
          name: editForm.name,
          contractorRole,
          contractorIds: editForm.contractorIds as any[],
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          dependsOnPrevious: editForm.dependsOnPrevious,
          amount: Number(editForm.amount) || 0,
          paymentAtEnd: editForm.paymentAtEnd,
          tasks: editForm.tasks.map(t => ({
            _id: t._id,
            legacyId: t.legacyId,
            name: t.name,
            assignee: t.assignee,
            required: t.required,
            paymentRequired: t.paymentRequired,
            paymentAmount: t.paymentAmount,
          })),
        });
        applyUpdatedStageDates(result.updatedStages);
      } else {
        const result = await updateStageDetails({
          stageId,
          name: editForm.name,
          contractorRole,
          contractorIds: editForm.contractorIds as any[],
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          dependsOnPrevious: editForm.dependsOnPrevious,
          amount: Number(editForm.amount) || 0,
        });
        applyUpdatedStageDates(result.updatedStages);
      }
      setStages(prev => prev.map(stage => stage.id === editingStage.id ? {
        ...stage,
        name: editForm.name,
        contractor: contractorRole,
        contractorIds: editForm.contractorIds,
        contractors: contractorOptions
          .filter(contractor => editForm.contractorIds.includes(contractorKey(contractor)))
          .map(contractor => ({
            id: contractorKey(contractor),
            _id: contractorKey(contractor),
            name: contractor.name,
            role: contractor.role,
            company: contractor.company,
            avatar: contractor.avatar,
            color: contractor.color,
            budget: contractor.budget,
          })),
        start: editForm.startDate,
        end: editForm.endDate,
        dependsOnPrevious: ((editingStage as any).sortOrder ?? editingStage.id - 1) > 0 && editForm.dependsOnPrevious,
        payment: stage.payment ? { ...stage.payment, amount: Number(editForm.amount) || 0 } : stage.payment,
      } : stage));
      setEditingStage(null);
      refetch();
    } catch (err) {
      setFeedback({
        title: "שגיאה בשמירת השלב",
        message: err instanceof Error ? err.message : "לא הצלחנו לשמור את השינויים בשלב.",
        type: "error",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const requestDeleteStage = (stage: Stage) => {
    if (hasStageStarted(stage)) {
      setDeleteTarget(stage);
      return;
    }
    void confirmDeleteStage(stage);
  };

  const confirmDeleteStage = async (stage = deleteTarget) => {
    if (!stage) return;
    const stageId = (stage as any)._id;
    if (!stageId) return;
    setDeletingStage(true);
    try {
      await deleteStageMutation({ stageId });
      setStages(prev => prev.filter(item => item.id !== stage.id));
      if (expanded === stage.id) setExpanded(null);
      setDeleteTarget(null);
      refetch();
    } finally {
      setDeletingStage(false);
    }
  };

  const createStages = async (draftStages: StageGuideStage[]) => {
    if (!projectId) return;
    setSavingGuide(true);
    try {
      await createStagesFromTemplate({
        projectId,
        stages: draftStages.map(stage => ({
          legacyId: stage.legacyId,
          name: stage.name,
          ...(stage.icon ? { icon: stage.icon } : {}),
          ...(stage.contractorRole ? { contractorRole: stage.contractorRole } : {}),
          ...(stage.contractorIds?.length ? { contractorIds: stage.contractorIds as any[] } : {}),
          startDate: stage.startDate,
          endDate: stage.endDate,
          dependsOnPrevious: stage.dependsOnPrevious,
          amount: Number(stage.amount) || 0,
          paymentAtEnd: stage.paymentAtEnd,
          tasks: stage.tasks.map(task => ({
            legacyId: task.legacyId,
            name: task.name,
            assignee: task.assignee,
            required: task.required,
            paymentRequired: task.paymentRequired,
            paymentAmount: Number(task.paymentAmount) || 0,
          })),
          milestones: stage.milestones.map(milestone => ({
            legacyKey: milestone.legacyKey,
            name: milestone.name,
            pct: Number(milestone.pct) || 0,
            taskLegacyIds: milestone.taskLegacyIds,
          })),
        })),
      });
      setGuideOpen(false);
      refetch();
    } finally {
      setSavingGuide(false);
    }
  };

  const createSingleStage = async (draftStages: StageGuideStage[]) => {
    if (!projectId || !draftStages[0]) return;
    const stage = draftStages[0];
    setSavingGuide(true);
    try {
      await addStageMutation({
        projectId,
        stage: {
          name: stage.name,
          ...(stage.icon ? { icon: stage.icon } : {}),
          ...(stage.contractorRole ? { contractorRole: stage.contractorRole } : {}),
          ...(stage.contractorIds?.length ? { contractorIds: stage.contractorIds as any[] } : {}),
          startDate: stage.startDate,
          endDate: stage.endDate,
          dependsOnPrevious: stage.dependsOnPrevious,
          amount: Number(stage.amount) || 0,
          paymentAtEnd: stage.paymentAtEnd,
          tasks: stage.tasks.map(task => ({
            legacyId: task.legacyId,
            name: task.name,
            assignee: task.assignee,
            required: task.required,
            paymentRequired: task.paymentRequired,
            paymentAmount: Number(task.paymentAmount) || 0,
          })),
          milestones: stage.milestones.map(milestone => ({
            legacyKey: milestone.legacyKey,
            name: milestone.name,
            pct: Number(milestone.pct) || 0,
            taskLegacyIds: milestone.taskLegacyIds,
          })),
        },
      });
      setAddStageOpen(false);
      refetch();
    } catch (err) {
      setFeedback({
        title: "שגיאה בהוספת שלב",
        message: err instanceof Error ? err.message : "לא הצלחנו להוסיף את השלב.",
        type: "error",
      });
    } finally {
      setSavingGuide(false);
    }
  };

  return (
    <>
    <ScreenBoundary
      loading={loading}
      error={error}
      isEmpty={stages.length === 0}
      emptyIcon="layers"
      emptyImage="/empty_states/stages.png"
      emptyTitle="אין שלבי בנייה"
      emptyDesc="נראה שעדיין לא הוגדרו שלבים לפרויקט זה. אפשר להתחיל מתבנית המאסטר ולערוך אותה לפני יצירה."
      emptyAction={() => {
        setGuideOpen(true);
      }}
      emptyActionLabel="צור מתבנית"
      onRetry={refetch}
    >
      <div className="page-content">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:42,height:42,borderRadius:12,background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Icon n="layers" s={22}/>
            </div>
            <div>
              <h1 style={{fontSize:22,fontWeight:800,margin:0}}>שלבי הפרויקט</h1>
              <div style={{fontSize:13,color:"var(--text3)",marginTop:2}}>ניהול משימות, אישורים ותשלומים לפי שלבים</div>
            </div>
          </div>
          {!isContractor && (
            <Btn onClick={() => {
              if (!isProOrPremium) {
                setFeedback({ title: 'שדרוג נדרש', message: 'הוספת שלבי בנייה זמינה במסלול Pro ומעלה.', type: 'error' });
                return;
              }
              setAddStageOpen(true);
            }}>
              <Icon n="plus" s={14}/> שלב חדש
            </Btn>
          )}
        </div>

        {!isContractor && (
        <div className="card" style={{marginBottom:20,borderColor:paymentSummary.isOverLimit ? "var(--danger)" : paymentSummary.isNearLimit ? "var(--warning)" : "var(--border)"}}>
          <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <span>מעקב תשלומי שלבים</span>
            <span style={{
              fontSize:12,
              color:paymentSummary.isOverLimit ? "var(--danger)" : paymentSummary.isNearLimit ? "var(--warning)" : "var(--text3)",
              fontWeight:700,
            }}>
              {paymentSummary.isOverLimit
                ? "חריגה ממסגרת הפרויקט"
                : paymentSummary.isNearLimit
                  ? "קרוב למסגרת הפרויקט"
                  : "בתוך מסגרת הפרויקט"}
            </span>
          </div>
          <div className="card-body" style={{paddingTop:12}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3, minmax(0, 1fr))",gap:18,marginBottom:14}}>
              {[
                {label:"תקציב כולל", value:paymentSummary.projectBudget, color:"var(--text1)"},
                {label:"שולם עד כה", value:paymentSummary.totalPaid, color:paymentSummary.isOverLimit ? "var(--danger)" : paymentSummary.isNearLimit ? "var(--warning)" : "var(--success)"},
                {label:"נותר לתשלום", value:paymentSummary.remaining, color:paymentSummary.remaining === 0 ? "var(--danger)" : "var(--text1)"},
              ].map(item => (
                <div key={item.label}>
                  <div style={{fontSize:20,fontWeight:800,color:item.color}}>{fmtMoney(item.value)}</div>
                  <div style={{fontSize:12,color:"var(--text2)"}}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{height:12,background:"var(--border)",borderRadius:6,overflow:"hidden"}}>
              <div style={{
                width:`${paymentSummary.paidPct}%`,
                height:"100%",
                background:paymentSummary.isOverLimit ? "var(--danger)" : paymentSummary.isNearLimit ? "var(--warning)" : "var(--success)",
                transition:"width .4s",
              }}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,marginTop:8,fontSize:11,color:"var(--text3)"}}>
              <span>{paymentSummary.projectBudget ? `${paymentSummary.paidPct}% שולם מתוך מסגרת הפרויקט` : "אין תקציב פרויקט מוגדר"}</span>
              <span>סך תשלומי שלבים מתוכננים: {fmtMoney(paymentSummary.totalPaymentAmount)}</span>
            </div>
          </div>
        </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {visibleStages.map(s=>(
            <div key={s.id} className="card" style={{border:expanded===s.id?"1px solid var(--accent)":"1px solid var(--border)",boxShadow:expanded===s.id?"var(--shadow-md)":"none"}}>
              <div onClick={()=>toggleStage(s.id)} style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
                <div style={{width:24,textAlign:"center",fontSize:12,fontWeight:700,color:"var(--text3)"}}>{s.id}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
                    {s.name}
                    <Badge type={s.status}/>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                    {(s.contractors?.length ? s.contractors : (s.contractor ? [{id:s.contractor,name:s.contractor}] : [])).map(contractor => (
                      <span key={String(contractor.id)} style={{fontSize:11,color:"var(--text2)",background:"#fff",border:"1px solid var(--border)",borderRadius:999,padding:"2px 7px",whiteSpace:"nowrap"}}>
                        {contractor.name}
                      </span>
                    ))}
                  </div>
                  <div style={{marginTop:8,display:"flex",alignItems:"center",gap:12}}>
                    <div style={{flex:1}}><ProgressBar value={s.progress} color={s.status==="done"?"var(--success)":"var(--accent)"} height={6}/></div>
                    <span style={{fontSize:12,color:"var(--text2)",minWidth:36}}>{s.progress}%</span>
                  </div>
                </div>
                {s.payment && (
                  <div style={{marginRight:12}} onClick={e=>e.stopPropagation()}>
                    <PaymentBadge status={s.payment.milestones?.length ? (aggregateStageStatus(s) || 'draft') : resolveStatus(s, computeGates(s))}/>
                  </div>
                )}
                <div style={{display:"flex",gap:8}} onClick={e=>e.stopPropagation()}>
                  <Btn size="sm" variant="ghost" onClick={()=>openEditStage(s)}><Icon n="edit" s={13}/> ערוך</Btn>
                  <Btn size="sm" variant="ghost" onClick={()=>requestDeleteStage(s)}><Icon n="trash" s={13}/> מחק</Btn>
                </div>
                <Icon n={expanded===s.id?"arrow-up":"arrow-down"} s={18} c="var(--text3)"/>
              </div>

              <AnimatePresence>
                {expanded===s.id && (() => {
                  const stageHasContractor = ((s as any).contractorIds?.length ?? 0) > 0 || ((s as any).contractors?.length ?? 0) > 0;
                  return (
                  <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} style={{overflow:"hidden"}}>
                    <div style={{padding:"0 20px 20px",borderTop:"1px solid var(--border)",background:"#FAFAF9"}}>
                      {!stageHasContractor && (
                        <div style={{marginTop:16,border:"1px solid #FCD34D",background:"#FFFBEB",color:"#92400E",borderRadius:8,padding:"10px 12px",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                          <Icon n="alert" s={14} c="#92400E"/>
                          אין קבלן מקושר לשלב — אי אפשר לסמן משימות או לשלם. קשרו קבלן לשלב כדי להמשיך.
                        </div>
                      )}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20,marginTop:20}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--text2)",marginBottom:12}}>משימות בשלב זה</div>
                          <div className="card" style={{background:"#fff"}}>
                            {(s.tasks || []).map(t=>{
                              const taskPayment = s.payment?.milestones?.find(m => m.taskIds.includes(t.id));
                              const taskDisabled = !stageHasContractor;
                              return (
                                <div
                                  key={t.id}
                                  onClick={taskDisabled ? undefined : ()=>toggleTask(s.id,t.id, (t as any)._id)}
                                  style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:"1px solid var(--border)",cursor:taskDisabled?"not-allowed":"pointer",opacity:taskDisabled?0.55:1}}
                                  title={taskDisabled?"קשרו קבלן לשלב כדי לסמן משימות":undefined}
                                  onMouseEnter={taskDisabled ? undefined : e=>e.currentTarget.style.background="#F9FAFB"}
                                  onMouseLeave={taskDisabled ? undefined : e=>e.currentTarget.style.background="transparent"}
                                >
                                  <div style={{width:18,height:18,borderRadius:4,border:t.done?"none":"2px solid var(--border)",background:t.done?"var(--success)":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                    {t.done && <Icon n="check" s={12} c="#fff"/>}
                                  </div>
                                  <span style={{fontSize:13,color:t.done?"var(--text3)":"var(--text1)",textDecoration:t.done?"line-through":"none",flex:1}}>{t.name}</span>
                                  {taskPayment && (
                                    <span style={{
                                      fontSize:11,
                                      fontWeight:700,
                                      color:taskPayment.status === "paid" ? "var(--success)" : "var(--text2)",
                                      background:taskPayment.status === "paid" ? "#F0FDF4" : "#F9FAFB",
                                      border:"1px solid var(--border)",
                                      borderRadius:999,
                                      padding:"3px 8px",
                                      whiteSpace:"nowrap",
                                    }}>
                                      {taskPayment.status === "paid" ? "שולם" : "לתשלום"} · {fmtMoney(taskPayment.amount)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--text2)",marginBottom:12}}>תשלום ואישור</div>
                          {(s.contractorPaymentWarnings?.length ?? 0) > 0 && (
                            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                              {s.contractorPaymentWarnings!.map(warning => (
                                <div key={warning.contractorId} style={{border:"1px solid #FCD34D",background:"#FFFBEB",color:"#92400E",borderRadius:8,padding:"8px 10px",fontSize:12,fontWeight:700,lineHeight:1.45}}>
                                  {warning.reason}
                                </div>
                              ))}
                            </div>
                          )}
                          {s.hasSyncedContractorPayments ? (
                            <div className="card" style={{background:"#fff"}}>
                              <div className="card-body" style={{display:"flex",flexDirection:"column",gap:10}}>
                                <div style={{fontSize:13,fontWeight:800}}>התשלום מסונכרן לקבלנים</div>
                                <div style={{fontSize:12,color:"var(--text3)"}}>
                                  אבני התשלום מגיעות ממשימות ואבני הדרך של השלב, ואישור התשלום מתבצע בלוח התשלומים של הקבלן כדי למנוע הוצאה כפולה.
                                </div>
                                {(s.contractorPayments || []).map(contractorPayment => (
                                  <div key={contractorPayment.contractorId} style={{border:"1px solid var(--border)",borderRadius:8,padding:10}}>
                                    <div style={{fontSize:12,fontWeight:800,marginBottom:8}}>{contractorPayment.contractorName}</div>
                                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                      {contractorPayment.milestones.map(milestone => (
                                        <div key={milestone.id} style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",fontSize:12}}>
                                          <span style={{fontWeight:700}}>{milestone.name}</span>
                                          <span style={{color:milestone.paid?"var(--success)":milestone.readyToPay === false?"#B45309":"var(--text2)",fontWeight:800,textAlign:"left"}}>
                                            {milestone.paid ? "שולם" : milestone.readyToPay === false ? (milestone.lockedReason || "לא מוכן") : "ממתין"} · {fmtMoney(milestone.amount)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <PaymentGatesPanel
                              stage={s}
                              gates={computeGates(s)}
                              status={resolveStatus(s, computeGates(s))}
                              onRequestReview={() => requestReview(s.id, (s as any)._id)}
                              onSupervisorApprove={() => supervisorApprove(s.id, (s as any)._id)}
                              onReleasePayment={() => setReleaseFor({ stage: s, milestoneId: null, milestoneName: null, amount: s.payment?.amount || 0 })}
                              onRequestReviewMs={(mid: string) => requestReviewMs(s.id, mid)}
                              onSupervisorApproveMs={(mid: string) => supervisorApproveMs(s.id, mid)}
                              onReleaseMs={(m: Milestone) => releaseMs(s, m)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {releaseFor && (
          <ReleasePaymentModal
            stage={releaseFor.stage}
            milestoneName={releaseFor.milestoneName}
            amount={releaseFor.amount}
            gates={
              releaseFor.milestoneId
                ? undefined
                : computeGates(releaseFor.stage)
            }
            onClose={()=>setReleaseFor(null)}
            onConfirm={confirmRelease}
          />
        )}
      </div>
    </ScreenBoundary>
    {editingStage && (
      <Modal title="עריכת שלב בנייה" onClose={()=>setEditingStage(null)} width={560}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <label style={{gridColumn:"1 / -1"}}>
            <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>שם שלב</div>
            <input className="bp-input" value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/>
          </label>
          <div style={{gridColumn:"1 / -1",border:"1px solid var(--border)",borderRadius:8,padding:12,background:"#fff"}}>
            <div style={{fontSize:12,color:"var(--text2)",marginBottom:8,fontWeight:600}}>קבלנים משתתפים בשלב</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {contractorOptions.length ? contractorOptions.map(contractor => {
                const id = contractorKey(contractor);
                const checked = editForm.contractorIds.includes(id);
                return (
                  <label key={id} style={{display:"flex",alignItems:"center",gap:6,border:"1px solid",borderColor:checked?"var(--accent)":"var(--border)",background:checked?"var(--accent-light)":"#fff",borderRadius:999,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>
                    <input type="checkbox" checked={checked} onChange={e=>toggleEditContractor(id, e.target.checked)} />
                    <span>{contractor.name}</span>
                  </label>
                );
              }) : (
                <span style={{fontSize:12,color:"var(--text3)"}}>אין עדיין קבלנים בפרויקט.</span>
              )}
            </div>
          </div>
          <label>
            <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>סכום תשלום</div>
            <input className="bp-input" type="number" value={editForm.amount} onChange={e=>setEditForm(f=>({...f,amount:Number(e.target.value)}))}/>
          </label>
          {editForm.contractorIds.length > 0 && (
            <div style={{
              gridColumn:"1 / -1",
              border:"1px solid",
              borderColor:editPaymentAmountMismatch ? "#FCA5A5" : "#BBF7D0",
              background:editPaymentAmountMismatch ? "#FEF2F2" : "#F0FDF4",
              color:editPaymentAmountMismatch ? "#991B1B" : "#065F46",
              borderRadius:8,
              padding:"8px 10px",
              fontSize:12,
              fontWeight:700,
              lineHeight:1.45,
            }}>
              {editPaymentAmountMismatch
                ? `סכום השלב ${fmtMoney(Number(editForm.amount) || 0)} לא תואם לסכום החוזה של הקבלנים ${fmtMoney(editContractorBudgetTotal)}. אפשר לשמור, אבל אישור תשלום ייחסם עד לתיקון.`
                : `סכום השלב תואם לסכום החוזה של הקבלנים (${fmtMoney(editContractorBudgetTotal)}).`}
            </div>
          )}
          {editContractorPaymentWarnings.length > 0 && (
            <div style={{gridColumn:"1 / -1",display:"flex",flexDirection:"column",gap:6}}>
              {editContractorPaymentWarnings.map(warning => (
                <div key={warning.contractorName} style={{border:"1px solid #FCD34D",background:"#FFFBEB",color:"#92400E",borderRadius:8,padding:"8px 10px",fontSize:12,fontWeight:700,lineHeight:1.45}}>
                  סכום השלבים של {warning.contractorName} ({fmtMoney(warning.stagePaymentTotal)}) לא תואם לסכום החוזה ({fmtMoney(warning.contractorBudget)}). אפשר לשמור, אבל כדאי לתקן לפני תשלום.
                </div>
              ))}
            </div>
          )}
          <label>
            <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>תאריך התחלה</div>
            <input className="bp-input" type="date" value={editForm.startDate} onChange={e=>setEditForm(f=>({...f,startDate:e.target.value}))}/>
          </label>
          <label>
            <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>תאריך סיום</div>
            <input className="bp-input" type="date" value={editForm.endDate} onChange={e=>setEditForm(f=>({...f,endDate:e.target.value}))}/>
          </label>
          <label style={{gridColumn:"1 / -1",display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:((editingStage as any).sortOrder ?? editingStage.id - 1) <= 0?"not-allowed":"pointer",color:((editingStage as any).sortOrder ?? editingStage.id - 1) <= 0?"var(--text3)":"var(--text2)"}}>
            <input
              type="checkbox"
              checked={((editingStage as any).sortOrder ?? editingStage.id - 1) > 0 && editForm.dependsOnPrevious}
              disabled={((editingStage as any).sortOrder ?? editingStage.id - 1) <= 0}
              onChange={e=>setEditForm(f=>({...f,dependsOnPrevious:e.target.checked}))}
            />
            מחובר לשלב הקודם - שינוי בשלב הקודם יזיז גם את השלב הזה
          </label>

          {isAdvancedEdit ? (
            <div style={{gridColumn:"1 / -1", marginTop: 14}}>
              <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:16}}>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
                  <input type="checkbox" checked={editForm.paymentAtEnd} onChange={e=>setEditForm(f=>({...f, paymentAtEnd:e.target.checked}))}/>
                  תשלום גלובלי בסיום השלב
                </label>
              </div>
              
              <div className="card" style={{padding:16,marginBottom:14,background:"#FAFAFA"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:800}}>משימות ותשלומים</div>
                  <Btn size="sm" variant="ghost" onClick={() => setEditForm(f=>({...f, tasks: [...f.tasks, { legacyId: Date.now(), name: 'משימה חדשה', assignee: contractorNamesFromIds(f.contractorIds, contractorOptions)[0] || f.contractorRole || 'לא הוגדר', required: true, paymentRequired: false, paymentAmount: 0 }]}))}><Icon n="plus" s={12}/> משימה</Btn>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {editForm.tasks.map((task, taskIndex) => (
                    <div key={taskIndex} style={{display:"grid",gridTemplateColumns:editForm.paymentAtEnd ? "1.5fr 1fr 82px 70px" : "1.5fr 1fr 82px 130px 120px 70px",gap:8,alignItems:"center"}}>
                      <input className="bp-input" value={task.name} onChange={e=>updateEditTask(taskIndex,{name:e.target.value})}/>
                      <select className="bp-input" value={task.assignee} onChange={e=>updateEditTask(taskIndex,{assignee:e.target.value})}>
                        <option value="">לא הוגדר</option>
                        <option value="מפקח">מפקח</option>
                        <option value="בעל הבית">בעל הבית</option>
                        <optgroup label="קבלנים">
                          {contractors?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </optgroup>
                      </select>
                      <label style={{fontSize:12,color:"var(--text2)",display:"flex",gap:6,alignItems:"center"}}>
                        <input type="checkbox" checked={task.required} onChange={e=>updateEditTask(taskIndex,{required:e.target.checked})}/>
                        חובה
                      </label>
                      {!editForm.paymentAtEnd && (
                        <>
                          <label style={{fontSize:12,color:"var(--text2)",display:"flex",gap:6,alignItems:"center"}}>
                            <input type="checkbox" checked={task.paymentRequired} onChange={e=>updateEditTask(taskIndex,{paymentRequired:e.target.checked, paymentAmount:e.target.checked?task.paymentAmount:0})}/>
                            תשלום בסיום
                          </label>
                          <input className="bp-input" type="number" min={0} placeholder="סכום ₪" value={task.paymentRequired ? task.paymentAmount : ''} disabled={!task.paymentRequired} onChange={e=>updateEditTask(taskIndex,{paymentAmount:Number(e.target.value) || 0})}/>
                        </>
                      )}
                      <Btn size="sm" variant="ghost" onClick={()=>removeEditTask(taskIndex)} style={{color:"var(--danger)"}}>מחק</Btn>
                    </div>
                  ))}
                </div>
                {!editForm.paymentAtEnd && editForm.tasks.some(t => t.paymentRequired) && (
                  <div style={{marginTop: 12}}>
                    {(() => {
                      const sum = editForm.tasks.filter(t => t.paymentRequired).reduce((acc, t) => acc + Number(t.paymentAmount || 0), 0);
                      if (sum !== editForm.amount) {
                        const diff = editForm.amount - sum;
                        return (
                          <div style={{fontSize:12, color:"#991B1B", background:"#FEF2F2", padding:"8px 12px", borderRadius:6, border:"1px solid #F87171"}}>
                            <div style={{fontWeight:700, marginBottom:2}}>סכום המשימות לא תואם!</div>
                            <div>סך כל התשלומים במשימות ({fmtMoney(sum)}) {diff > 0 ? "נמוך" : "גבוה"} מהסכום הכולל של השלב ({fmtMoney(editForm.amount)}).</div>
                          </div>
                        );
                      }
                      return (
                        <div style={{fontSize:12, color:"#065F46", background:"#D1FAE5", padding:"8px 12px", borderRadius:6, display:"flex", alignItems:"center", gap:6}}>
                          <Icon n="check" s={14}/><span>סך התשלומים למשימות תואם לסכום השלב ({fmtMoney(sum)}).</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{gridColumn:"1 / -1", marginTop: 14}}>
              <Btn variant="ghost" onClick={() => setIsAdvancedEdit(true)} size="sm" style={{color:"var(--accent)"}}>
                <Icon n="settings" s={14}/> מתקדם - עריכת משימות ותשלומים
              </Btn>
            </div>
          )}

        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:22}}>
          <div>
             <Btn variant="ghost" onClick={()=>setEditingStage(null)} disabled={savingEdit}>ביטול</Btn>
          </div>
          <Btn 
            onClick={saveStageEdit} 
            disabled={
              savingEdit || 
              !editForm.name.trim() || 
              (isAdvancedEdit && !editForm.paymentAtEnd && editForm.amount > 0 && 
                editForm.tasks.filter(t => t.paymentRequired).reduce((acc, t) => acc + Number(t.paymentAmount || 0), 0) !== editForm.amount &&
                editForm.tasks.some(t => t.paymentRequired)
              )
            }
          >
            <Icon n="check" s={14}/> {savingEdit ? "שומר..." : "שמור שינויים"}
          </Btn>
        </div>
      </Modal>
    )}
    {feedback && (
      <FeedbackModal
        title={feedback.title}
        message={feedback.message}
        type={feedback.type}
        onClose={() => setFeedback(null)}
      />
    )}
    {deleteTarget && (
      <ConfirmDialog
        title="מחיקת שלב שהתחיל"
        message={`למחוק את "${deleteTarget.name}"? השלב כבר התחיל או כולל נתוני התקדמות. המחיקה תעדכן את בסיס הנתונים ותסיר גם משימות ואבני דרך לתשלום של השלב.`}
        confirmText="מחק שלב"
        cancelText="ביטול"
        loading={deletingStage}
        onConfirm={()=>confirmDeleteStage()}
        onClose={()=>setDeleteTarget(null)}
      />
    )}
    {guideOpen && (
      <StageCreationGuide
        projectId={projectId}
        projectStartDate={project?.startDate}
        onClose={() => setGuideOpen(false)}
        onCreate={async (stages) => {
          await createStages(stages);
        }}
        saving={savingGuide}
        setFeedback={setFeedback}
      />
    )}
    {addStageOpen && (
      <StageCreationGuide
        mode="single"
        projectId={projectId}
        projectStartDate={project?.startDate}
        initialStages={makeSingleStageTemplate(stages, project?.startDate)}
        hasPreviousStage={stages.length > 0}
        onClose={() => setAddStageOpen(false)}
        onCreate={createSingleStage}
        saving={savingGuide}
        setFeedback={setFeedback}
      />
    )}
    </>
  );
};
