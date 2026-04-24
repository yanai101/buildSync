import React from 'react';
import { motion } from 'framer-motion';
import { Icon, Btn, Select, Input, Badge, Modal } from '../components/Shared';
import { QUOTES_DATA, QUOTE_TOPICS, fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { ScreenBoundary } from '../components/ScreenBoundary';

export interface Quote {
  id: number;
  topicId: string;
  supplier: string;
  contact: string;
  phone: string;
  email: string;
  total: number;
  validity: string;
  notes: string;
  fileName: string;
  status: string;
  createdAt: string;
}

export interface QuoteTopic {
  id: string;
  name: string;
  icon: string;
}

export const QuotesScreen = () => {
  const { data: initialQuotes, loading, error, refetch } = useDataSource<any[]>('quotes');
  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [customTopics, setCustomTopics] = React.useState<QuoteTopic[]>([]);
  const [filter, setFilter] = React.useState("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Quote | null>(null); // quote being edited
  const [compareTopicId, setCompareTopicId] = React.useState<string | null>(null);
  const [topicInputOpen, setTopicInputOpen] = React.useState(false);
  const [newTopicName, setNewTopicName] = React.useState("");

  React.useEffect(() => {
    if (initialQuotes) setQuotes(initialQuotes);
    else setQuotes(QUOTES_DATA as any);
  }, [initialQuotes]);

  const otherTopic = QUOTE_TOPICS.find(t=>t.id==="other") || {id:"other", name:"אחר", icon:"clipboard"};
  const topics = [...QUOTE_TOPICS.filter(t=>t.id!=="other"), ...customTopics, otherTopic];
  const topicById = (id: string) => topics.find(t=>t.id===id) || {id, name:id, icon:"clipboard"};

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
  const [form, setForm] = React.useState<Record<string, string>>(emptyForm);

  const openAdd = () => { setEditing(null); setForm({...emptyForm, topicId: filter!=="all" ? filter : "kitchen"}); setAddOpen(true); };
  const openEdit = (q: Quote) => { setEditing(q); setForm({ topicId:q.topicId, supplier:q.supplier, contact:q.contact||"", phone:q.phone||"", email:q.email||"", total:String(q.total), validity:q.validity||"", notes:q.notes||"", fileName:q.fileName||"" }); setAddOpen(true); };
  const closeModal = () => { setAddOpen(false); setEditing(null); };

  const saveQuote = () => {
    if(!form.topicId || !form.supplier.trim() || !form.total) return;
    const total = Number(form.total);
    if(Number.isNaN(total) || total <= 0) return;
    if(editing){
      setQuotes(prev => prev.map(q => q.id===editing.id ? { ...q, ...form, total, id: q.id, status: q.status, createdAt: q.createdAt } as Quote : q));
    } else {
      const q: Quote = { id: Date.now(), ...form, total, status:"pending", createdAt: new Date().toISOString().slice(0,10) } as Quote;
      setQuotes(prev => [...prev, q]);
    }
    closeModal();
  };

  const deleteQuote = (id: number) => {
    if(!confirm("למחוק את הצעת המחיר?")) return;
    setQuotes(prev => prev.filter(q=>q.id!==id));
  };

  const approveQuote = (id: number) => {
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
      setForm((f) => ({...f, topicId: existing.id}));
    } else {
      const id = `custom_${Date.now()}`;
      setCustomTopics(prev => [...prev, {id, name, icon:"clipboard"}]);
      setForm((f) => ({...f, topicId: id}));
    }
    setNewTopicName("");
    setTopicInputOpen(false);
  };

  const onFilePick = (file: File | null) => {
    if(!file){ setForm((f)=>({...f, fileName:""})); return; }
    setForm((f) => ({...f, fileName: file.name}));
  };

  // --- render helpers ---
  const statusBadgeType = (s: string) => s==="approved" ? "done" : s==="rejected" ? "problem" : "pending";

  const compareTopic = compareTopicId ? topicById(compareTopicId) : null;
  const compareRows = compareTopic ? [...quotes.filter(q=>q.topicId===compareTopic.id)].sort((a,b)=>a.total-b.total) : [];
  const cmpMin = compareRows.length ? Math.min(...compareRows.map(q=>q.total)) : 0;
  const cmpMax = compareRows.length ? Math.max(...compareRows.map(q=>q.total)) : 0;
  const cmpAvg = compareRows.length ? compareRows.reduce((a,q)=>a+q.total,0) / compareRows.length : 0;

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
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
              <Select value={form.topicId} onChange={(v: string)=>{ if(v==="__add__"){ setTopicInputOpen(true); } else { setForm((f)=>({...f,topicId:v})); } }}>
                {topics.map(t=> <option key={t?.id} value={t?.id}>{t?.name}</option>)}
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
              <Input value={form.supplier} onChange={(v: string)=>setForm((f)=>({...f,supplier:v}))} placeholder="למשל: מטבחי גולן"/>
            </div>
            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>איש קשר</div>
              <Input value={form.contact} onChange={(v: string)=>setForm((f)=>({...f,contact:v}))} placeholder="שם איש הקשר"/>
            </div>

            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>טלפון</div>
              <Input value={form.phone} onChange={(v: string)=>setForm((f)=>({...f,phone:v}))} placeholder="050-0000000"/>
            </div>
            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>דוא"ל</div>
              <Input value={form.email} onChange={(v: string)=>setForm((f)=>({...f,email:v}))} placeholder="name@example.com"/>
            </div>

            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>סה"כ הצעה (₪) *</div>
              <Input type="number" value={form.total} onChange={(v: string)=>setForm((f)=>({...f,total:v}))} placeholder="0"/>
            </div>
            <div>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>תוקף ההצעה</div>
              <Input type="date" value={form.validity} onChange={(v: string)=>setForm((f)=>({...f,validity:v}))}/>
            </div>

            <div style={{gridColumn:"1 / -1"}}>
              <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:600}}>הערות</div>
              <textarea value={form.notes} onChange={e=>setForm((f)=>({...f,notes:e.target.value}))} placeholder="פירוט, הכללות, תנאי תשלום…" rows={3}
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
                  <button onClick={()=>setForm((f)=>({...f,fileName:""}))} style={{marginRight:"auto",background:"transparent",border:"none",cursor:"pointer",color:"var(--text3)",display:"inline-flex"}}>
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
    </ScreenBoundary>
  );
};
