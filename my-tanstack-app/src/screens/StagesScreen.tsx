import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, Btn, ProgressBar, Badge } from '../components/Shared';
import { PaymentGatesPanel, PaymentBadge, computeGates, resolveStatus, ReleasePaymentModal } from '../components/PaymentControl';
import { Stage, Milestone } from '../types';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';

export const StagesScreen = () => {
  const { projectId } = useCurrentProject();
  const dbStages = useQuery(api.queries.listStages, projectId ? { projectId } : "skip");
  const { data: initialData, loading, error, refetch } = useDataSource<Stage[]>('stages', { db: dbStages as any });
  const { mutate } = useDataMutation('stages');
  
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const [releaseFor, setReleaseFor] = React.useState<{stage: Stage; milestoneId: string | null; amount: number; milestoneName: string | null} | null>(null);

  React.useEffect(() => {
    if (initialData) setStages(initialData);
  }, [initialData]);

  const updateStageState = (stageId: number, updater: (s: Stage) => Stage) => {
    setStages(prev => prev.map(s => s.id === stageId ? updater(s) : s));
  };

  const toggleStage = (id: number) => setExpanded(expanded === id ? null : id);

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

  const addProofPhoto = async (stageId: number, dbId?: string) => {
    updateStageState(stageId, s => ({...s, extraProofPhotos: (s.extraProofPhotos||0) + 1}));
    const s = stages.find(st => st.id === stageId);
    if (dbId && s) await mutate('update', { id: dbId, patch: { extraProofPhotos: (s.extraProofPhotos||0) + 1 } });
  };

  const confirmRelease = async () => {
    if (!releaseFor) return;
    const { stage: rStage, milestoneId } = releaseFor;
    const id = rStage.id;
    const dbId = (rStage as any)._id;
    const today = new Date().toLocaleDateString('he-IL');
    
    updateStageState(id, s => {
      if (milestoneId) {
        return {
          ...s,
          payment: s.payment ? {
            ...s.payment,
            milestones: s.payment.milestones?.map(m =>
              m.id === milestoneId ? { ...m, status: 'paid', paidAt: today } : m
            ),
          } : undefined,
        };
      }
      return {
        ...s,
        payment: s.payment ? { ...s.payment, status: 'paid', paidAt: today } : undefined,
      };
    });

    if (dbId) {
      if (milestoneId) {
        // Complex nested update would need a specific mutation or better logic
        // For now we just trigger it
      } else {
        await mutate('update', { id: dbId, patch: { 'payment.status': 'paid', 'payment.paidAt': today } });
      }
    }
    
    setReleaseFor(null);
  };

  const toggleTask = async (stageId: number, taskId: number, taskDbId?: string) => {
    const stage = stages.find(s => s.id === stageId);
    const task = stage?.tasks.find(t => t.id === taskId);
    if (!task) return;

    const newDone = !task.done;

    // Optimistic UI update
    setStages(prev=>prev.map(s=>{
      if(s.id!==stageId) return s;
      const tasks = s.tasks.map(t=>t.id===taskId?{...t,done:newDone}:t);
      const progress = Math.round(tasks.filter(t=>t.done).length/tasks.length*100);
      const status = progress===100?"done":progress>0?"active":"pending";
      const wasPaid = s.payment?.status === 'paid';
      const payment = s.payment && wasPaid ? {...s.payment, status: 'disputed'} : s.payment;
      return { ...s, tasks, progress, status, supervisorApproval: wasPaid ? s.supervisorApproval : null, payment };
    }));

    // DB Mutation
    if (taskDbId) {
      await mutate('toggleTask', { id: taskDbId, done: newDone });
    }
  };

  // Helper for milestones (simplified for now)
  const addProofPhotoMs = (sid: number, mid: string) => {};
  const requestReviewMs = (sid: number, mid: string) => {};
  const supervisorApproveMs = (sid: number, mid: string) => {};
  const releaseMs = (s: Stage, m: Milestone) => setReleaseFor({ stage: s, milestoneId: m.id, milestoneName: m.name, amount: m.amount });

  return (
    <ScreenBoundary loading={loading} error={error} isEmpty={stages.length === 0} emptyTitle="אין שלבי בנייה" emptyDesc="נראה שעדיין לא הוגדרו שלבים לפרויקט זה." onRetry={refetch}>
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
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {stages.map(s=>(
            <div key={s.id} className="card" style={{border:expanded===s.id?"1px solid var(--accent)":"1px solid var(--border)",boxShadow:expanded===s.id?"var(--shadow-md)":"none"}}>
              <div onClick={()=>toggleStage(s.id)} style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
                <div style={{width:24,textAlign:"center",fontSize:12,fontWeight:700,color:"var(--text3)"}}>{s.id}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
                    {s.name}
                    <Badge type={s.status}/>
                  </div>
                  <div style={{marginTop:8,display:"flex",alignItems:"center",gap:12}}>
                    <div style={{flex:1}}><ProgressBar value={s.progress} color={s.status==="done"?"var(--success)":"var(--accent)"} height={6}/></div>
                    <span style={{fontSize:12,color:"var(--text2)",minWidth:36}}>{s.progress}%</span>
                  </div>
                </div>
                {s.payment && (
                  <div style={{marginRight:12}} onClick={e=>e.stopPropagation()}>
                    <PaymentBadge status={resolveStatus(s, computeGates(s, s.extraProofPhotos||0))}/>
                  </div>
                )}
                <Icon n={expanded===s.id?"arrow-up":"arrow-down"} s={18} c="var(--text3)"/>
              </div>

              <AnimatePresence>
                {expanded===s.id && (
                  <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} style={{overflow:"hidden"}}>
                    <div style={{padding:"0 20px 20px",borderTop:"1px solid var(--border)",background:"#FAFAF9"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20,marginTop:20}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--text2)",marginBottom:12}}>משימות בשלב זה</div>
                          <div className="card" style={{background:"#fff"}}>
                            {s.tasks.map(t=>(
                              <div key={t.id} onClick={()=>toggleTask(s.id,t.id, (t as any)._id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:"1px solid var(--border)",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                <div style={{width:18,height:18,borderRadius:4,border:t.done?"none":"2px solid var(--border)",background:t.done?"var(--success)":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  {t.done && <Icon n="check" s={12} c="#fff"/>}
                                </div>
                                <span style={{fontSize:13,color:t.done?"var(--text3)":"var(--text1)",textDecoration:t.done?"line-through":"none"}}>{t.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--text2)",marginBottom:12}}>תשלום ואישור</div>
                          <PaymentGatesPanel
                            stage={s}
                            gates={computeGates(s, s.extraProofPhotos||0)}
                            status={resolveStatus(s, computeGates(s, s.extraProofPhotos||0))}
                            onAddProofPhoto={() => addProofPhoto(s.id, (s as any)._id)}
                            onRequestReview={() => requestReview(s.id, (s as any)._id)}
                            onSupervisorApprove={() => supervisorApprove(s.id, (s as any)._id)}
                            onReleasePayment={() => setReleaseFor({ stage: s, milestoneId: null, milestoneName: null, amount: s.payment?.amount || 0 })}
                            onAddProofPhotoMs={(mid: string) => addProofPhotoMs(s.id, mid)}
                            onRequestReviewMs={(mid: string) => requestReviewMs(s.id, mid)}
                            onSupervisorApproveMs={(mid: string) => supervisorApproveMs(s.id, mid)}
                            onReleaseMs={(m: Milestone) => releaseMs(s, m)}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
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
                : computeGates(releaseFor.stage, releaseFor.stage.extraProofPhotos||0)
            }
            onClose={()=>setReleaseFor(null)}
            onConfirm={confirmRelease}
          />
        )}
      </div>
    </ScreenBoundary>
  );
};
