import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, Avatar, Select, Btn, FeedbackModal } from '../components/Shared';
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

export const NotesScreen = () => {
  const { projectId } = useCurrentProject();
  const dbNotes = useQuery(api.queries.listNotes, projectId ? { projectId } : "skip");
  const { data: initialNotes, loading, error, refetch } = useDataSource<Note[]>('notes', { db: dbNotes as any });
  const { mutate } = useDataMutation('notes');

  const [notes, setNotes] = React.useState<Note[]>([]);
  const [thread, setThread] = React.useState<string>("all");
  const [text, setText] = React.useState("");
  const [myRole, setMyRole] = React.useState<string>("manager");
  const [targetThread, setTargetThread] = React.useState<string>("internal");
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'error' | 'info' | 'success' } | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (initialNotes) setNotes(initialNotes);
  }, [initialNotes]);

  const threads = [{id:"all",label:"הכל"},{id:"internal",label:"פנימי"},{id:"contractor",label:"לקבלן"}];
  const filtered = thread==="all"?notes:notes.filter(n=>n.thread===thread);

  const send = async () => {
    if(!text.trim()) return;
    const name = ["בעל הבית","אבי כהן","רון לוי","יעקב פרץ"][["owner","manager","inspector","contractor"].indexOf(myRole)];
    
    // Optimistic
    const newNote = {
      id: Date.now() as any,
      fromName: name,
      role: myRole,
      text: text.trim(),
      date: "היום",
      time: new Date().toTimeString().slice(0,5),
      thread: targetThread,
      resolved: false
    };
    setNotes(prev=>[...prev, newNote]);
    setText("");
    setTimeout(()=>endRef.current?.scrollIntoView({behavior: "smooth", block:"nearest"}),50);

    try {
      await mutate('saveNote', {
        projectId: projectId || 'dummy',
        fromName: name,
        role: myRole,
        text: text.trim(),
        thread: targetThread
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
    <ScreenBoundary loading={loading} error={error} isEmpty={notes.length === 0} emptyTitle="אין הערות" emptyDesc="נראה שעדיין לא נוספו הערות או עדכונים לפרויקט." onRetry={refetch}>
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
                    <div style={{marginTop:6,display:"flex",gap:6,justifyContent:isMe?"flex-end":"flex-start"}}>
                      {n.thread==="contractor" && <span style={{fontSize:10,color:"var(--text3)",background:"var(--bg)",padding:"1px 6px",borderRadius:10,border:"1px solid var(--border)"}}>לקבלן</span>}
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
