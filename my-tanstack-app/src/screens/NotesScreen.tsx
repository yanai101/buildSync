import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, Avatar, Select, Btn, FeedbackModal, EmptyState, PageBackground } from '../components/Shared';
import { ROLE_COLORS, ROLE_LABELS, PROJECT } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';

export interface Note {
  id: number;
  fromName: string;
  role: string;
  text: string;
  date: string;
  time: string;
  thread: string;
  resolved: boolean;
}

const getContractorIdStr = (val: any): string => {
  if (!val) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return String(val._id ?? val.id ?? "");
  }
  return String(val);
};

export const NotesScreen = () => {
  const { projectId } = useCurrentProject();
  const dbNotes = useQuery(api.queries.listNotes, projectId ? { projectId } : "skip");
  const dbContractors = useQuery(api.queries.listContractors, projectId ? { projectId } : "skip");
  const currentIdentity = useQuery(api.users.currentIdentity, {});
  const { data: initialNotes, loading, error, refetch, mode } = useDataSource<Note[]>('notes', { db: dbNotes as any });
  const { mutate } = useDataMutation('notes');

  const [notes, setNotes] = React.useState<Note[]>([]);
  const [thread, setThread] = React.useState<string>("all");
  const [text, setText] = React.useState("");
  const [myRole, setMyRole] = React.useState<string>("manager");
  const [targetThread, setTargetThread] = React.useState<string>("internal");
  const [recipientContractorId, setRecipientContractorId] = React.useState<string>("all");
  const [filterContractorId, setFilterContractorId] = React.useState<string>("all");
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'error' | 'info' | 'success' } | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const composeRef = React.useRef<HTMLTextAreaElement>(null);

  const contractors = dbContractors ?? [];

  React.useEffect(() => {
    if (initialNotes) setNotes(initialNotes);
  }, [initialNotes]);

  const activeRole = mode === 'db'
    ? currentIdentity?.role ?? 'manager'
    : myRole;
  const canSeeAllChats = activeRole !== 'contractor';
  const allowedThreads = React.useMemo(() => {
    if (canSeeAllChats) {
      return [{id:"all",label:"הכל"},{id:"internal",label:"פנימי"},{id:"contractor",label:"לקבלן"}];
    }
    return [{id:"contractor",label:"לקבלן"}];
  }, [canSeeAllChats]);
  const targetThreadOptions = allowedThreads.filter(t => t.id !== 'all');
  const threads = allowedThreads;

  React.useEffect(() => {
    if (!threads.some(t => t.id === thread)) {
      setThread(threads[0]?.id ?? 'internal');
    }
    if (!targetThreadOptions.some(t => t.id === targetThread)) {
      setTargetThread(targetThreadOptions[0]?.id ?? 'internal');
    }
  }, [targetThread, targetThreadOptions, thread, threads]);

  // When viewing a specific thread tab, messages must go to that same thread —
  // each thread is independent. Only the "all" view lets the user pick a target.
  React.useEffect(() => {
    if (thread !== 'all' && targetThread !== thread) {
      setTargetThread(thread);
    }
  }, [thread, targetThread]);

  // Sync the composer recipient with the filter selection when filtering contractor chat
  React.useEffect(() => {
    if (thread === 'contractor') {
      setRecipientContractorId(filterContractorId);
    }
  }, [filterContractorId, thread]);

  const filtered = React.useMemo(() => {
    let list = thread === "all" ? notes : notes.filter(n => n.thread === thread);
    if (thread === "contractor" && filterContractorId !== "all") {
      const filterStr = getContractorIdStr(filterContractorId);
      list = list.filter(n => {
        const rcId = (n as any).recipientContractorId;
        return rcId && getContractorIdStr(rcId) === filterStr;
      });
    }
    return list;
  }, [notes, thread, filterContractorId]);

  const send = async () => {
    if(!text.trim()) return;
    const roleForMessage = activeRole || myRole;
    const name = mode === 'db'
      ? currentIdentity?.name || currentIdentity?.email || (ROLE_LABELS as any)[roleForMessage] || 'משתמש'
      : ["בעל הבית","אבי כהן","רון לוי","יעקב פרץ"][["owner","manager","inspector","contractor"].indexOf(myRole)];
    
    // Optimistic
    const newNote = {
      id: Date.now() as any,
      fromName: name,
      role: roleForMessage,
      text: text.trim(),
      date: "היום",
      time: new Date().toTimeString().slice(0,5),
      thread: targetThread,
      resolved: false,
      recipientContractorId: targetThread === 'contractor' && recipientContractorId !== 'all' ? recipientContractorId : undefined,
      recipientName: targetThread === 'contractor' && recipientContractorId !== 'all' ? contractors.find((c: any) => getContractorIdStr(c._id ?? c.id) === getContractorIdStr(recipientContractorId))?.name : undefined,
    };
    setNotes(prev=>[...prev, newNote as any]);
    setText("");
    setTimeout(()=>endRef.current?.scrollIntoView({behavior: "smooth", block:"nearest"}),50);

    try {
      await mutate('saveNote', {
        projectId: projectId || 'dummy',
        text: text.trim(),
        thread: targetThread,
        ...(targetThread === 'contractor' && recipientContractorId !== 'all' ? { recipientContractorId: recipientContractorId as any } : {})
      });
      refetch();
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "שגיאה בשליחת הערה", type: "error" });
    }
  };

  const toggleResolved = async (id: number, dbId?: string) => {
    setNotes(prev=>prev.map(n=>n.id===id?{...n,resolved:!n.resolved}:n));
    if (dbId) {
      const note = notes.find(n => n.id === id);
      await mutate('update', { id: dbId, patch: { resolved: !note?.resolved } });
    }
  };

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content" style={{display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"}}>
        {/* Thread tabs & Contractor Filter */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          {notes.length > 0 && (
            <div style={{display:"flex",gap:0,background:"var(--surface)",borderRadius:8,border:"1px solid var(--border)",padding:3}}>
              {threads.map(t=>(
                <button key={t.id} onClick={()=>setThread(t.id)} style={{padding:"6px 14px",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:13,fontWeight:thread===t.id?600:400,background:thread===t.id?"var(--accent)":"transparent",color:thread===t.id?"#fff":"var(--text2)",transition:"background .15s, color .15s"}}>
                  {t.label}
                  <span style={{marginRight:5,fontSize:11,opacity:.7}}>{t.id==="all"?notes.length:notes.filter(n=>n.thread===t.id).length}</span>
                </button>
              ))}
            </div>
          )}

          {thread === 'contractor' && canSeeAllChats && contractors.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>סינון לפי קבלן:</span>
              <Select
                value={filterContractorId}
                onChange={setFilterContractorId}
                style={{ fontSize: 12, width: 'auto', padding: '6px 12px', background: 'var(--surface)' }}
              >
                <option value="all">כל השיחות (כל הקבלנים)</option>
                {contractors.map((c: any) => (
                  <option key={getContractorIdStr(c._id ?? c.id)} value={getContractorIdStr(c._id ?? c.id)}>
                    {c.name} ({c.role})
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:0,paddingBottom:16,position:"relative"}}>
          {notes.length === 0 ? (
            <div style={{position:"relative",zIndex:1,flex:1,minHeight:360,display:"flex",alignItems:"center"}}>
              <PageBackground image="/empty_states/notes.png" />
              <div style={{width:"100%"}}>
                <EmptyState
                  icon="message"
                  title="אין הערות"
                  description="נראה שעדיין לא נוספו הערות או עדכונים לפרויקט."
                  action={
                    <Btn size="lg" onClick={() => composeRef.current?.focus()} style={{padding: "12px 28px", fontSize: 16}}>
                      <Icon n="plus" s={16}/> הערה חדשה
                    </Btn>
                  }
                />
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
            {filtered.map((n,i)=>{
              const isMe = n.role===activeRole;
              const color = (ROLE_COLORS as any)[n.role]||"#888";
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
                      <div style={{fontSize:11,color:"var(--text3)",marginBottom:5,textAlign:isMe?"left":"right"}}>{n.fromName} · {(ROLE_LABELS as any)[n.role]} · {n.date} {n.time}</div>
                      <div style={{padding:"13px 17px",borderRadius:16,fontSize:14,lineHeight:1.65,background:isMe?"linear-gradient(135deg, var(--accent) 0%, #c96b30 100%)":"var(--surface)",color:isMe?"#fff":"var(--text1)",border:isMe?"none":"1px solid var(--border)",boxShadow:isMe?"0 3px 12px rgba(224,122,56,0.28)":"var(--shadow-sm)",borderTopLeftRadius:isMe?16:4,borderTopRightRadius:isMe?4:16}}>
                        {n.text}
                      </div>
                      <div style={{marginTop:6,display:"flex",gap:6,justifyContent:isMe?"flex-end":"flex-start",flexWrap:"wrap",alignItems:"center"}}>
                        {n.thread === "contractor" && (
                          <span
                            style={{
                              fontSize: 10,
                              color: (n as any).recipientContractorId ? "#1E40AF" : "var(--text3)",
                              background: (n as any).recipientContractorId ? "#EFF6FF" : "var(--bg)",
                              padding: "2px 8px",
                              borderRadius: 10,
                              border: (n as any).recipientContractorId ? "1px solid #BFDBFE" : "1px solid var(--border)",
                              fontWeight: (n as any).recipientContractorId ? 700 : 400
                            }}
                          >
                            {(n as any).recipientContractorId
                              ? (canSeeAllChats ? `💬 שיחה אישית עם ${(n as any).recipientName || 'קבלן'}` : "🔒 אישי")
                              : "📣 ציבורי לקבלנים"}
                          </span>
                        )}
                        <motion.button whileTap={{scale:0.9}} onClick={()=>toggleResolved(n.id, (n as any)._id)} style={{fontSize:11,color:n.resolved?"var(--success)":"var(--text3)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:n.resolved?700:400}}>
                          {n.resolved?"✓ טופל":"סמן כטופל"}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          )}
          <div ref={endRef}/>
        </div>

        {/* Compose */}
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:12}}>
          <textarea ref={composeRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())} placeholder="כתוב הערה... (Enter לשליחה)" rows={2}
            style={{width:"100%",border:"none",outline:"none",fontSize:13,fontFamily:"'Heebo',sans-serif",resize:"none",color:"var(--text1)",background:"transparent"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {mode === 'mock' ? (
                <Select value={myRole} onChange={setMyRole} style={{fontSize:12,width:"auto"}}>
                  <option value="owner">בעל הבית</option>
                  <option value="manager">בעל בנייה</option>
                  <option value="inspector">מפקח</option>
                  <option value="contractor">קבלן</option>
                </Select>
              ) : (
                <div style={{fontSize:12,color:"var(--text2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 10px",background:"var(--bg)"}}>
                  {(ROLE_LABELS as any)[activeRole] || "משתמש"}
                </div>
              )}
              {thread === 'all' && targetThreadOptions.length > 1 && (
                <Select value={targetThread} onChange={setTargetThread} style={{fontSize:12,width:"auto"}}>
                  {targetThreadOptions.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </Select>
              )}
              {targetThread === 'contractor' && canSeeAllChats && contractors.length > 0 && (
                <Select
                  value={recipientContractorId}
                  onChange={setRecipientContractorId}
                  style={{ fontSize: 12, width: 'auto', background: 'var(--bg)' }}
                >
                  <option value="all">📣 לכל הקבלנים (ציבורי)</option>
                  {contractors.map((c: any) => (
                    <option key={getContractorIdStr(c._id ?? c.id)} value={getContractorIdStr(c._id ?? c.id)}>
                      👤 שיחה אישית: {c.name} ({c.role})
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <Btn onClick={send}><Icon n="send" s={14}/> שלח</Btn>
          </div>
        </div>
        {feedback && (
          <FeedbackModal
            title={feedback.title}
            message={feedback.message}
            type={feedback.type}
            onClose={() => setFeedback(null)}
          />
        )}
      </div>
    </ScreenBoundary>
  );
};
