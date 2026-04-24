import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, Avatar, Badge, Stars, Btn, Modal } from '../components/Shared';
import { Contractor, Milestone } from '../types';
import { useDataSource } from '../hooks/useDataSource';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { fmtMoney } from '../utils/mockData';

import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const ContractorsScreen = () => {
  const { projectId } = useCurrentProject();
  const dbContractors = useQuery(api.queries.listContractors, projectId ? { projectId } : "skip");
  const { data: initialContractors, loading, error, refetch } = useDataSource<Contractor[]>('contractors', { db: dbContractors as any });
  const [contractors, setContractors] = React.useState<Contractor[]>([]);
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  React.useEffect(() => {
    if (initialContractors) setContractors(initialContractors);
  }, [initialContractors]);

  // Mock schedule data
  const [schedules] = React.useState<Record<number, Milestone[]>>({
    1: [
      { id: 'm1', name: 'מקדמה', pct: 20, amount: 50000, status: 'paid', taskIds: [] },
      { id: 'm2', name: 'סיום יציקת רצפה', pct: 30, amount: 75000, status: 'pending', taskIds: [] },
      { id: 'm3', name: 'סיום שלד קומה א', pct: 30, amount: 75000, status: 'pending', taskIds: [] },
      { id: 'm4', name: 'מסירת שלד', pct: 20, amount: 50000, status: 'pending', taskIds: [] },
    ]
  });

  const toggleContractor = (id: number) => setExpanded(expanded === id ? null : id);

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:42,height:42,borderRadius:12,background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Icon n="users" s={22}/>
            </div>
            <div>
              <h1 style={{fontSize:22,fontWeight:800,margin:0}}>קבלנים וספקים</h1>
              <div style={{fontSize:13,color:"var(--text3)",marginTop:2}}>ניהול אנשי המקצוע, חוזים ותשלומים</div>
            </div>
          </div>
          <Btn onClick={()=>setAddOpen(true)}><Icon n="plus" s={14}/> הוסף קבלן</Btn>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {contractors.map(c=>(
            <div key={c.id} className="card" style={{border:expanded===c.id?"1px solid var(--accent)":"1px solid var(--border)",boxShadow:expanded===c.id?"var(--shadow-md)":"none"}}>
              <div onClick={()=>toggleContractor(c.id)} style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
                <Avatar letter={c.name[0]} color={c.color} size={44}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:15,fontWeight:700}}>{c.name}</span>
                    <span style={{fontSize:12,color:"var(--text3)"}}>· {c.company}</span>
                    <Badge type={c.status}/>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:16,fontSize:13,color:"var(--text2)"}}>
                    <span style={{display:"flex",alignItems:"center",gap:4}}><Icon n="layers" s={14}/> {c.role}</span>
                    <Stars rating={c.rating}/>
                  </div>
                </div>
                <div style={{textAlign:"left",minWidth:120}}>
                  <div style={{fontSize:14,fontWeight:800,color:"var(--text1)"}}>{fmtMoney(c.budget)}</div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>שולם {Math.round(c.paid/c.budget*100)}%</div>
                </div>
                <Icon n={expanded===c.id?"arrow-up":"arrow-down"} s={18} c="var(--text3)"/>
              </div>

              <AnimatePresence>
                {expanded===c.id && (
                  <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} style={{overflow:"hidden"}}>
                    <div style={{padding:"0 20px 20px",borderTop:"1px solid var(--border)",background:"#FAFAF9"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20,marginTop:20}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--text2)",marginBottom:12}}>לוח תשלומים (גאנט פיננסי)</div>
                          <div className="card" style={{background:"#fff",overflow:"hidden"}}>
                            <table className="bp-table" style={{width:"100%"}}>
                              <thead><tr><th>אבן דרך</th><th>%</th><th>סכום</th><th>סטטוס</th></tr></thead>
                              <tbody>
                                {(schedules[c.id] || []).map(m=>(
                                  <tr key={m.id}>
                                    <td style={{fontSize:13,fontWeight:500}}>{m.name}</td>
                                    <td style={{fontSize:12,color:"var(--text2)"}}>{m.pct}%</td>
                                    <td style={{fontSize:13,fontWeight:700}}>{fmtMoney(m.amount)}</td>
                                    <td><Badge type={m.status}/></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--text2)",marginBottom:12}}>פרטי התקשרות</div>
                          <div className="card" style={{background:"#fff",padding:16}}>
                            <div style={{display:"flex",flexDirection:"column",gap:12}}>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <div style={{width:32,height:32,borderRadius:8,background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)"}}><Icon n="phone" s={16}/></div>
                                <div>
                                  <div style={{fontSize:11,color:"var(--text3)"}}>טלפון</div>
                                  <div style={{fontSize:13,fontWeight:600}}>{c.phone}</div>
                                </div>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <div style={{width:32,height:32,borderRadius:8,background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)"}}><Icon n="mail" s={16}/></div>
                                <div>
                                  <div style={{fontSize:11,color:"var(--text3)"}}>אימייל</div>
                                  <div style={{fontSize:13,fontWeight:600}}>{c.email}</div>
                                </div>
                              </div>
                            </div>
                            <div style={{marginTop:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                              <Btn variant="ghost" size="sm" style={{width:"100%"}}><Icon n="message" s={14}/> הודעה</Btn>
                              <Btn variant="ghost" size="sm" style={{width:"100%"}}><Icon n="edit" s={14}/> ערוך</Btn>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {addOpen && (
          <Modal title="הוספת קבלן חדש" onClose={()=>setAddOpen(false)}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"var(--text2)",marginBottom:6}}>שם מלא</div>
                <input className="bp-input" style={{width:"100%"}} placeholder="לדוג׳: ישראל ישראלי"/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"var(--text2)",marginBottom:6}}>חברה / עוסק</div>
                <input className="bp-input" style={{width:"100%"}} placeholder="לדוג׳: ישראלי ובניו בע״מ"/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"var(--text2)",marginBottom:6}}>תפקיד</div>
                <input className="bp-input" style={{width:"100%"}} placeholder="לדוג׳: חשמלאי"/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"var(--text2)",marginBottom:6}}>תקציב כולל</div>
                <input className="bp-input" style={{width:"100%"}} placeholder="₪0.00"/>
              </div>
            </div>
            <div style={{marginTop:24,display:"flex",justifyContent:"flex-end",gap:12}}>
              <Btn variant="ghost" onClick={()=>setAddOpen(false)}>ביטול</Btn>
              <Btn onClick={()=>setAddOpen(false)}>שמור קבלן</Btn>
            </div>
          </Modal>
        )}
      </div>
    </ScreenBoundary>
  );
};
