import * as React from 'react';
import { Icon, Btn, FeedbackModal } from '../components/Shared';
import { ROOM_TYPE_OPTS } from '../utils/mockData';
import { Room, Project } from '../types';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';

export interface ProjectConfig {
  name: string;
  address: string;
  owner: string;
  manager: string;
  inspector: string;
  floors: number;
  area: number;
  rooms: Room[];
}

export const ProjectSetupScreen = () => {
  const { projectId } = useCurrentProject();
  const dbProject = useQuery(api.projects.getWithDetails, projectId ? { projectId } : "skip");
  const { data: project, loading, error, refetch } = useDataSource<Project>('project', { db: dbProject as any });
  const { mutate } = useDataMutation('projects');

  const [step, setStep] = React.useState(0);
  const [isEditing, setIsEditing] = React.useState(false);
  const [cfg, setCfg] = React.useState<ProjectConfig | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  React.useEffect(() => {
    if (project) {
      setCfg({
        name: project.name || '',
        address: project.address || '',
        owner: (project as any).ownerName || '',
        manager: (project as any).managerName || '',
        inspector: (project as any).inspectorName || '',
        floors: project.floors || 1,
        area: project.areaSqm || 0,
        rooms: (project as any).rooms || [],
      });
    }
  }, [project]);

  const setField = (k: keyof ProjectConfig, v: string | number) => setCfg((c)=> c ? ({...c,[k]:v}) : c);
  const setRoom = (uid: string, k: keyof Room, v: any) => setCfg((c)=> c ? ({...c,rooms:(c.rooms || []).map((r)=>r.uid===uid?{...r,[k]:v}:r)}) : c);
  const addRoom = (floor: number = 1) => {
    const uid = `r${Date.now()}`;
    setCfg((c)=> c ? ({...c,rooms:[...(c.rooms || []),{uid,type:"bedroom",name:"חדר שינה חדש",floor,size:16}]}) : c);
  };
  const removeRoom = (uid: string) => setCfg((c)=> c ? ({...c,rooms:(c.rooms || []).filter((r)=>r.uid!==uid)}) : c);

  const STEPS = ["פרטי הפרויקט","מבנה הבית","חדרים","צוות","סיכום"];
  const totalRoomArea = cfg ? (cfg.rooms || []).reduce((a: number,r)=>a+Number(r.size||0),0) : 0;
  const displayArea = cfg?.area || totalRoomArea;

  const floorRooms = (f: number) => cfg ? (cfg.rooms || []).filter((r)=>Number(r.floor)===f) : [];

  const handleSave = async () => {
    if (!cfg || !project) return;
    setSaving(true);
    try {
      await mutate('saveProjectSetup', {
        projectId: (project as any)._id,
        name: cfg.name,
        address: cfg.address,
        ownerName: cfg.owner,
        managerName: cfg.manager,
        inspectorName: cfg.inspector,
        floors: Number(cfg.floors),
        areaSqm: Number(cfg.area) || totalRoomArea,
        rooms: cfg.rooms,
      });
      setIsEditing(false);
      refetch();
      setFeedback({ title: "הגדרות נשמרו", message: "פרטי הפרויקט ומבנה הבית עודכנו בהצלחה.", type: "success" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו לשמור את ההגדרות. אנא נסו שוב.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if(!cfg) return null;

  // Summary View
  if (!isEditing && project) {
    return (
      <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
        <div className="page-content">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:42,height:42,borderRadius:12,background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon n="settings" s={22}/>
              </div>
              <div>
                <h1 style={{fontSize:22,fontWeight:800,margin:0}}>הגדרות הבית</h1>
                <div style={{fontSize:13,color:"var(--text3)",marginTop:2}}>ניהול פרטי הפרויקט, מבנה הקומות והחדרים</div>
              </div>
            </div>
            <Btn onClick={() => setIsEditing(true)}><Icon n="edit" s={14}/> ערוך הגדרות</Btn>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div className="card">
              <div className="card-header">פרטי פרויקט</div>
              <div className="card-body">
                 {[
                   ["שם", cfg.name],
                   ["כתובת", cfg.address],
                   ["בעל הבית", cfg.owner],
                   ["מנהל פרויקט", cfg.manager],
                   ["מפקח", cfg.inspector]
                 ].map(([k,v]) => (
                   <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid var(--border)",fontSize:14}}>
                     <span style={{color:"var(--text2)"}}>{k}</span>
                     <span style={{fontWeight:600}}>{v}</span>
                   </div>
                 ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">מבנה ושטח</div>
              <div className="card-body">
                 {[
                   ["קומות", cfg.floors],
                   ["חדרים", cfg.rooms.length],
                   ["שטח כולל", `${displayArea} מ"ר`]
                 ].map(([k,v]) => (
                   <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid var(--border)",fontSize:14}}>
                     <span style={{color:"var(--text2)"}}>{k}</span>
                     <span style={{fontWeight:600}}>{v as any}</span>
                   </div>
                 ))}
                 <div style={{marginTop:16,display:"flex",flexWrap:"wrap",gap:6}}>
                   {cfg.rooms.map(r => (
                     <span key={r.uid} style={{fontSize:11,background:"var(--bg)",padding:"4px 10px",borderRadius:20,border:"1px solid var(--border)"}}>{r.name} ({r.size} מ"ר)</span>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:42,height:42,borderRadius:12,background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Icon n="settings" s={22}/>
            </div>
            <div>
              <h1 style={{fontSize:22,fontWeight:800,margin:0}}>הגדרות הבית</h1>
              <div style={{fontSize:13,color:"var(--text3)",marginTop:2}}>ניהול פרטי הפרויקט, מבנה הקומות והחדרים</div>
            </div>
          </div>
        </div>

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
              {(["name", "address", "owner"] as const).map((k)=>(
                <div key={k}>
                  <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:500}}>{k === "name" ? "שם הפרויקט" : k === "address" ? "כתובת" : "בעל הבית"}</div>
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
                <input className="bp-input" type="number" value={cfg.area} onChange={e=>setField("area",Number(e.target.value))} placeholder={`או חישוב אוטומטי: ${totalRoomArea}`} style={{width:100}}/>
                {cfg.area === 0 && <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>מחושב לפי חדרים</div>}
              </div>
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:500}}>שטח מוגדר (חדרים)</div>
                <div style={{fontSize:22,fontWeight:800,color:"var(--accent)"}}>{totalRoomArea} <span style={{fontSize:14,fontWeight:400,color:"var(--text2)"}}>מ"ר</span></div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10}}>
              {[
                {label:"חדר שינה",count:(cfg.rooms || []).filter((r)=>r.type==="bedroom"||r.type==="master").length},
                {label:"חדרי אמבטיה",count:(cfg.rooms || []).filter((r)=>r.type==="bathroom").length},
                {label:"שירותים",count:(cfg.rooms || []).filter((r)=>r.type==="toilet").length},
                {label:"סה\"כ חדרים",count:(cfg.rooms || []).length},
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
            </div>
            {Array.from({length:cfg.floors},(_,fi)=>(
              <div key={fi} style={{padding:"14px 18px 8px",borderBottom:"1px solid var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:".5px"}}>קומה {fi+1}</div>
                  <Btn size="sm" variant="ghost" onClick={() => addRoom(fi+1)}><Icon n="plus" s={13}/> חדר לקומה זו</Btn>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {floorRooms(fi+1).length===0 && <div style={{fontSize:13,color:"var(--text3)",padding:"8px 0"}}>אין חדרים בקומה זו</div>}
                  {floorRooms(fi+1).map((r)=>(
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
              <span>סה"כ חדרים: <strong>{(cfg.rooms || []).length}</strong></span>
              <span>שטח מוגדר: <strong>{totalRoomArea} מ"ר</strong></span>
              <span>ממוצע לחדר: <strong>{(cfg.rooms || []).length?Math.round(totalRoomArea/(cfg.rooms || []).length):0} מ"ר</strong></span>
            </div>
          </div>
        )}

        {/* Step 3: Team */}
        {step===3 && (
          <div className="card-body">
            <div style={{fontWeight:700,fontSize:16,marginBottom:20}}>צוות הפרויקט</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {(["manager", "inspector", "owner"] as const).map((k)=>(
                <div key={k}>
                  <div style={{fontSize:12,color:"var(--text2)",marginBottom:4,fontWeight:500}}>{k === "manager" ? "בעל בנייה / מנהל פרויקט" : k === "inspector" ? "מפקח" : "בעל הבית (יזם)"}</div>
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
                {[["קומות",cfg.floors],["חדרים",(cfg.rooms || []).length],["שטח כולל",`${displayArea} מ"ר`]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                    <span style={{color:"var(--text2)"}}>{k}</span><span style={{fontWeight:600}}>{v as any}</span>
                  </div>
                ))}
                <div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:6}}>
                  {(cfg.rooms || []).map((r)=>(
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
          : <Btn onClick={handleSave} disabled={saving}>
              <Icon n={saving ? "refresh" : "check"} s={14}/> {saving ? "שומר..." : "שמור הגדרות"}
            </Btn>
        }
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
    </ScreenBoundary>
  );
};
