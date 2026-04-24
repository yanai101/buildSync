import React from 'react';
import { motion } from 'framer-motion';
import { Icon, Btn, Modal, TagBadge, Select, FeedbackModal } from '../components/Shared';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';

export const PhotosScreen = () => {
  const { projectId } = useCurrentProject();
  const dbPhotos = useQuery(api.queries.listPhotos, projectId ? { projectId } : "skip");
  const { data: initialPhotos, loading, error, refetch } = useDataSource<any[]>('photos', { db: dbPhotos as any });
  const { mutate } = useDataMutation('photos');

  const [photos, setPhotos] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any>(null);
  const [filter, setFilter] = React.useState("הכל");
  
  React.useEffect(() => {
    if (initialPhotos) setPhotos(initialPhotos);
  }, [initialPhotos]);

  const [drawMode, setDrawMode] = React.useState("pen");
  const [drawColor, setDrawColor] = React.useState("#FF3B30");
  const [noteText, setNoteText] = React.useState("");
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'error' | 'info' | 'success' } | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const lastPos = React.useRef<any>(null);

  const tags = ["הכל","התקדמות","בעיה","בדיקה","אישור"];
  const filtered = filter==="הכל"?photos:photos.filter(p=>p.tag===filter);

  const startDraw = (e: React.MouseEvent) => {
    drawing.current=true;
    if(!canvasRef.current) return;
    const r=canvasRef.current.getBoundingClientRect();
    lastPos.current={x:e.clientX-r.left,y:e.clientY-r.top};
  };
  const doDraw = (e: React.MouseEvent) => {
    if(!drawing.current||!canvasRef.current) return;
    const r=canvasRef.current.getBoundingClientRect();
    const x=e.clientX-r.left,y=e.clientY-r.top;
    const ctx=canvasRef.current.getContext("2d");
    if(!ctx) return;
    ctx.strokeStyle=drawColor; ctx.lineWidth=3; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(lastPos.current.x,lastPos.current.y); ctx.lineTo(x,y); ctx.stroke();
    lastPos.current={x,y};
  };
  const endDraw = () => { drawing.current=false; };
  const clearCanvas = () => { const c=canvasRef.current; if(c) c.getContext("2d")?.clearRect(0,0,c.width,c.height); };

  const addNote = async () => {
    if(!noteText||!selected) return;
    
    // Optimistic
    setPhotos(prev=>prev.map(p=>p.id===selected.id?{...p,notesCount:(p.notesCount||0)+1}:p));
    
    try {
      await mutate('savePhotoAnnotation', {
        photoId: selected._id || 'dummy',
        noteText: noteText,
        role: 'manager'
      });
      setNoteText("");
      refetch();
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "שגיאה בשמירת הערה", type: "error" });
    }
  };

  return (
    <ScreenBoundary loading={loading} error={error} isEmpty={photos.length === 0} emptyTitle="אין תמונות" emptyDesc="נראה שעדיין לא הועלו תמונות תיעוד לפרויקט." onRetry={refetch}>
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
              <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>הערות ({selected.notesCount || 0})</div>
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
