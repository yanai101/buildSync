import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, Btn, ProgressBar } from '../components/Shared';
import { ROOM_TYPE_OPTS } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { Project, Room } from '../types';

// ── CONSTANTS & CATALOG ───────────────────────────────────────────────────────

const CATALOG: Record<string, any[]> = {
  kitchen:[
    {name:"מקרר", cat:"מכשירים", unit:"יח'", qty:1},
    {name:"תנור בנוי", cat:"מכשירים", unit:"יח'", qty:1},
    {name:"מיקרוגל בנוי", cat:"מכשירים", unit:"יח'", qty:1},
    {name:"מדיח כלים", cat:"מכשירים", unit:"יח'", qty:1},
    {name:"מנדף / קולט אדים", cat:"מכשירים", unit:"יח'", qty:1},
    {name:"פח אשפה מובנה", cat:"נגרות", unit:"יח'", qty:1},
    {name:"ארון פינתי", cat:"נגרות", unit:"יח'", qty:1},
    {name:"מגירות תחתית", cat:"נגרות", unit:"יח'", qty:2},
    {name:"משטח עבודה גרניט", cat:"אינסטלציה", unit:'מ"ר', qty:2},
  ],
  living:[
    {name:"יחידת טלוויזיה", cat:"ריהוט", unit:"יח'", qty:1},
    {name:"ספה פינתית", cat:"ריהוט", unit:"יח'", qty:1},
    {name:"שולחן קפה", cat:"ריהוט", unit:"יח'", qty:1},
    {name:"וילונות", cat:"טקסטיל", unit:"מ'", qty:4},
    {name:"רמקולים שקועים", cat:"חשמל", unit:"יח'", qty:4},
  ],
};

const CATALOG_UNIVERSAL = [
  {name:"גלאי עשן", cat:"בטיחות", unit:"יח'", qty:1},
  {name:"נקודת אינטרנט", cat:"חשמל", unit:"יח'", qty:1},
  {name:"וילונות", cat:"טקסטיל", unit:"מ'", qty:3},
  {name:"שטיח", cat:"ריהוט", unit:'מ"ר', qty:4},
];

const calcSmartItems = (room: any) => {
  const {size, type} = room;
  const rt = (ROOM_TYPE_OPTS.find(r=>r.id===type)||{}) as any;
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
  if(type!=="toilet" && type!=="bathroom") items.push({id:`${room.uid}_main`, cat:"תאורה", name:"גוף תאורה מרכזי", qty:1, unit:"יח'"});

  // Electrical
  const sockets = type==="kitchen" ? Math.ceil(size/5) : Math.ceil(size/8);
  items.push({id:`${room.uid}_sock`, cat:"חשמל", name:"שקע כפול", qty:sockets, unit:"יח'", hint:'1 ל-8מ"ר'});
  items.push({id:`${room.uid}_sw`, cat:"חשמל", name:"מפסק", qty: Math.ceil(size/20)+1, unit:"יח'"});

  // Carpentry
  if(type==="bedroom"||type==="master") items.push({id:`${room.uid}_ward`, cat:"נגרות", name:"ארון הזזה", qty:1, unit:"יח'"});
  items.push({id:`${room.uid}_door`, cat:"נגרות", name:"דלת פנים", qty:1, unit:"יח'"});

  return items.map(i=>({...i, userQty: i.qty}));
};

const getCatalogForRoom = (type: string) => {
  const specific = CATALOG[type] || [];
  return [...specific, ...CATALOG_UNIVERSAL];
};

const AddItemWidget = ({roomUid, roomType, existingItems, onAdd}: {roomUid: string, roomType: string, existingItems: any[], onAdd: (item: any) => void}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const catalog = getCatalogForRoom(roomType);
  const existingNames = existingItems.map(i=>i.name.trim().toLowerCase());
  const suggestions = query.length>=1 ? catalog.filter(c=>c.name.includes(query) && !existingNames.includes(c.name.toLowerCase())).slice(0,5) : [];

  if(!open) return (
    <button onClick={()=>{setOpen(true);setTimeout(()=>inputRef.current?.focus(),50)}} style={{width:"100%",padding:"14px",border:"2px dashed var(--border)",borderRadius:12,background:"transparent",cursor:"pointer",fontSize:14,color:"var(--text2)",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:12}}>
      <Icon n="plus" s={16}/> הוסף פריט מותאם אישית
    </button>
  );

  return (
    <div style={{border:"1px solid var(--accent)",borderRadius:12,padding:16,marginTop:12,background:"#FFFBF8"}}>
       <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
         <span style={{fontWeight:700,fontSize:14}}>הוספת פריט</span>
         <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon n="x" s={16}/></button>
       </div>
       <input ref={inputRef} className="bp-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="חפש בקטלוג או הקלד שם..." />
       {suggestions.length > 0 && (
         <div style={{marginTop:8,border:"1px solid var(--border)",borderRadius:8,background:"#fff",overflow:"hidden"}}>
            {suggestions.map((s,i)=>(
              <div key={i} onClick={()=>{onAdd({id:`cat_${Date.now()}`,cat:s.cat,name:s.name,qty:s.qty,unit:s.unit,userQty:s.qty});setQuery("");setOpen(false);}} style={{padding:"10px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid var(--border)"}} onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {s.name} ({s.cat})
              </div>
            ))}
         </div>
       )}
    </div>
  );
};

// ── BOQ WIZARD SCREEN ───────────────────────────────────────────────────────

export const BOQWizardScreen = () => {
  const { data: project, loading, error, refetch } = useDataSource<Project>('project');
  const { mutate } = useDataMutation('boq');
  
  const [step, setStep] = React.useState(0);
  const [allItems, setAllItems] = React.useState<any>({});
  const [view, setView] = React.useState<'wizard' | 'summary'>('wizard');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (project && (project as any).rooms) {
      const init: any = {};
      ((project as any).rooms as Room[]).forEach((r: Room) => {
        init[r.uid] = calcSmartItems(r);
      });
      setAllItems(init);
    }
  }, [project]);

  const rooms = (project as any)?.rooms || [];
  const currentRoom = rooms[step];

  const setQty = (roomUid: string, itemId: string, qty: any) => {
    setAllItems((prev: any)=>({...prev,[roomUid]:(prev[roomUid]||[]).map((i: any)=>i.id===itemId?{...i,userQty:Math.max(0,Number(qty))}:i)}));
  };
  const addItem = (roomUid: string, item: any) => {
    setAllItems((prev: any)=>({...prev,[roomUid]:[...(prev[roomUid]||[]),item]}));
  };
  const removeItem = (roomUid: string, itemId: string) => {
    setAllItems((prev: any)=>({...prev,[roomUid]:(prev[roomUid]||[]).filter((i: any)=>i.id!==itemId)}));
  };

  const onFinish = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const itemsToSave: any[] = [];
      Object.keys(allItems).forEach(ruid => {
        const room = rooms.find((r:any) => r.uid === ruid);
        allItems[ruid].forEach((item: any) => {
          itemsToSave.push({
            roomId: (room as any)?._id,
            category: item.cat,
            name: item.name,
            qty: item.qty,
            userQty: item.userQty,
            unit: item.unit,
            hint: item.hint,
          });
        });
      });

      await mutate('saveBoq', { projectId: (project as any)._id, items: itemsToSave });
      alert("הכמויות נשמרו בהצלחה!");
      window.location.href = '/boq';
    } catch (err) {
      alert("שגיאה בשמירת הנתונים");
    } finally {
      setSaving(false);
    }
  };

  if (!project) return <ScreenBoundary loading={loading} error={error} onRetry={refetch}><div/></ScreenBoundary>;

  if (view === 'summary') {
    const aggregated: Record<string, {name: string, cat: string, unit: string, total: number, rooms: {name: string, qty: number}[]}> = {};
    Object.keys(allItems).forEach(ruid => {
      const rName = rooms.find((r:any)=>r.uid===ruid)?.name || "חדר";
      allItems[ruid].forEach((item: any) => {
        const key = `${item.name}|${item.cat}|${item.unit}`;
        if (!aggregated[key]) {
          aggregated[key] = { name: item.name, cat: item.cat, unit: item.unit, total: 0, rooms: [] };
        }
        aggregated[key].total += item.userQty;
        aggregated[key].rooms.push({ name: rName, qty: item.userQty });
      });
    });

    const summaryCats = [...new Set(Object.values(aggregated).map(i => i.cat))];

    return (
      <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
        <div className="page-content" style={{maxWidth:1200,margin:"0 auto",padding:"20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32}}>
            <div>
              <h1 style={{fontSize:28,fontWeight:900,margin:0,color:"#1A1A1A"}}>אשף כתב כמויות</h1>
              <div style={{color:"var(--text3)",fontSize:15,marginTop:4}}>עבור חדר-חדר ובנה רשימת כמויות לרכישה / ייבוא</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:16,fontSize:14,color:"var(--text3)"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>א</div>
                <span>עודכן: היום, 09:45</span>
              </div>
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <div>
              <h2 style={{fontSize:24,fontWeight:800,margin:0}}>רשימת יבוא מרוכזת</h2>
              <div style={{color:"var(--text3)",fontSize:14,marginTop:4}}>כל הכמויות המאוחדות לפי קטגוריה — מוכן לרכישה</div>
            </div>
            <div style={{display:"flex",gap:12}}>
              <Btn variant="ghost" onClick={() => setView('wizard')} style={{borderRadius:12,padding:"10px 20px",fontWeight:700}}>
                <Icon n="arrow-right" s={16} style={{marginLeft:8}}/> חזרה לאשף
              </Btn>
              <Btn onClick={onFinish} disabled={saving} style={{borderRadius:12,padding:"10px 20px",fontWeight:700,background:"var(--success)",borderColor:"var(--success)"}}>
                <Icon n={saving ? "refresh" : "check"} s={16} style={{marginLeft:8}}/> {saving ? "שומר..." : "סיום ושמירה"}
              </Btn>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:20,marginBottom:32}}>
            {[
              {label:"סה\"כ ריצוף", val:`${Object.values(aggregated).filter(i=>i.cat==='ריצוף').reduce((a,c)=>a+c.total,0)} מ"ר`, color:"#F97316"},
              {label:"נקודות תאורה", val:`${Object.values(aggregated).filter(i=>i.cat==='תאורה').reduce((a,c)=>a+c.total,0)} יח'`, color:"#F97316"},
              {label:"שקעים", val:`${Object.values(aggregated).filter(i=>i.cat==='חשמל' && i.name.includes('שקע')).reduce((a,c)=>a+c.total,0)} יח'`, color:"#10B981"},
              {label:"חדרים שהוגדרו", val:`${rooms.length} חדרים`, color:"#1A1A1A"}
            ].map((s,i)=>(
              <div key={i} className="card" style={{padding:24,borderRadius:16,textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.val}</div>
                <div style={{fontSize:14,color:"var(--text3)",marginTop:8}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {(summaryCats as string[]).map(cat => (
              <div key={cat} className="card" style={{borderRadius:20,overflow:"hidden"}}>
                <div style={{padding:"16px 24px",background:"var(--surface)",borderBottom:"1px solid var(--border)",fontSize:14,fontWeight:800}}>
                  {cat}
                </div>
                <div style={{padding:"0 24px"}}>
                  <table className="bp-table" style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead>
                      <tr style={{borderBottom:"1px solid var(--border)"}}>
                        <th style={{textAlign:"right",padding:"16px 0",fontSize:13,color:"var(--text3)",fontWeight:500}}>פריט</th>
                        <th style={{textAlign:"center",padding:"16px 0",fontSize:13,color:"var(--text3)",fontWeight:500}}>סה"כ</th>
                        <th style={{textAlign:"center",padding:"16px 0",fontSize:13,color:"var(--text3)",fontWeight:500}}>יחידה</th>
                        <th style={{textAlign:"right",padding:"16px 0",fontSize:13,color:"var(--text3)",fontWeight:500}}>פירוט לפי חדר</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(aggregated).filter(i=>i.cat===cat).map((item, idx)=>(
                        <tr key={idx} style={{borderBottom:"1px solid var(--border)"}}>
                          <td style={{padding:"20px 0",fontSize:15,fontWeight:700}}>{item.name}</td>
                          <td style={{padding:"20px 0",textAlign:"center",fontSize:18,fontWeight:900,color:"#F97316"}}>{item.total}</td>
                          <td style={{padding:"20px 0",textAlign:"center",fontSize:14,color:"var(--text3)"}}>{item.unit}</td>
                          <td style={{padding:"20px 0"}}>
                            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                              {item.rooms.filter(r=>r.qty>0).map((r, ri)=>(
                                <span key={ri} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#F3F4F6",color:"#4B5563",fontWeight:500}}>
                                  {r.name}: {r.qty}
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
        </div>
      </ScreenBoundary>
    );
  }

  // Wizard View
  if (!currentRoom) return null;
  const items = allItems[currentRoom.uid] || [];
  const cats = [...new Set(items.map((i: any)=>i.cat))];

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content" style={{maxWidth:1200,margin:"0 auto",padding:"20px"}}>
        
        {/* Header Section */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32}}>
          <div>
            <h1 style={{fontSize:28,fontWeight:900,margin:0,color:"#1A1A1A"}}>אשף כתב כמויות</h1>
            <div style={{color:"var(--text3)",fontSize:15,marginTop:4}}>עבור חדר-חדר ובנה רשימת כמויות לרכישה / ייבוא</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16,fontSize:14,color:"var(--text3)"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>א</div>
              <span>עודכן: היום, 09:45</span>
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:32}}>
          
          {/* Sidebar */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text3)",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px",textAlign:"right"}}>חדרים</div>
            {rooms.map((r: Room, i: number)=>(
              <div key={r.uid} onClick={()=>setStep(i)} style={{padding:"12px 16px",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:12,border:"1px solid",borderColor:step===i?"var(--accent)":"var(--border)",background:step===i?"#FFF6F1":"#fff",boxShadow:step===i?"0 4px 12px rgba(234,88,12,0.1)":"none",transition:"all .2s"}}>
                <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,background:step===i?"var(--accent)":"var(--border)",color:step===i?"#fff":"var(--text3)"}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:step===i?700:500,color:step===i?"var(--text1)":"var(--text2)"}}>{r.name}</div>
                  <div style={{fontSize:12,color:"var(--text3)"}}>{r.size} מ"ר</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:12}}>
              <button onClick={() => setView('summary')} style={{width:"100%",padding:"14px",borderRadius:12,border:"1px solid #D1FAE5",background:"#ECFDF5",color:"#059669",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer"}}>
                <Icon n="download" s={16}/> צפה ברשימת יבוא
              </button>
            </div>
          </div>

          {/* Main Area */}
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <h2 style={{fontSize:24,fontWeight:800,margin:0}}>{currentRoom.name}</h2>
                <div style={{fontSize:14,color:"var(--text3)",marginTop:4}}>
                  {currentRoom.name} · קומה {currentRoom.floor} · {currentRoom.size} מ"ר
                </div>
              </div>
              <Btn onClick={()=>{
                 if(step < rooms.length - 1) setStep(s=>s+1);
                 else setView('summary');
              }} style={{padding:"12px 24px",borderRadius:12,fontSize:15,fontWeight:700}}>
                {step === rooms.length - 1 ? "סיים וסיכום" : "אישור ולחדר הבא"}
                <Icon n="chevron-left" s={18} style={{marginRight:8}}/>
              </Btn>
            </div>

            <div style={{marginTop:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text3)",marginBottom:8}}>
                <span>{step + 1} / {rooms.length} חדרים</span>
              </div>
              <div style={{height:8,background:"var(--border)",borderRadius:4,overflow:"hidden",position:"relative"}}>
                <motion.div initial={{width:0}} animate={{width:`${((step+1)/rooms.length)*100}%`}} style={{height:"100%",background:"var(--accent)",borderRadius:4}} />
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:16,marginTop:12}}>
              {(cats as string[]).map(cat => (
                <div key={cat} className="card" style={{borderRadius:16,overflow:"hidden"}}>
                  <div style={{padding:"14px 20px",background:"var(--surface)",borderBottom:"1px solid var(--border)",fontSize:13,fontWeight:700,display:"flex",justifyContent:"space-between"}}>
                    <span>{cat}</span>
                    <span style={{fontWeight:400,color:"var(--text3)"}}>{items.filter((i:any)=>i.cat===cat).length} פריטים</span>
                  </div>
                  <div>
                    {items.filter((i: any)=>i.cat===cat).map((item: any)=>(
                      <div key={item.id} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",borderBottom:"1px solid var(--border)"}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:15,fontWeight:600}}>{item.name}</div>
                          {item.hint && <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>{item.hint}</div>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                           <div style={{display:"flex",alignItems:"center",background:"var(--bg)",borderRadius:10,padding:4,border:"1px solid var(--border)"}}>
                             <button onClick={()=>setQty(currentRoom.uid,item.id,item.userQty-1)} style={{width:32,height:32,borderRadius:8,border:"none",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 2px rgba(0,0,0,0.05)"}}><Icon n="minus" s={14}/></button>
                             <input type="number" value={item.userQty} onChange={e=>setQty(currentRoom.uid,item.id,e.target.value)} style={{width:50,textAlign:"center",background:"transparent",border:"none",fontWeight:700,fontSize:16}}/>
                             <button onClick={()=>setQty(currentRoom.uid,item.id,item.userQty+1)} style={{width:32,height:32,borderRadius:8,border:"none",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 2px rgba(0,0,0,0.05)"}}><Icon n="plus" s={14}/></button>
                           </div>
                           <span style={{fontSize:14,color:"var(--text3)",width:30}}>{item.unit}</span>
                           <button onClick={()=>removeItem(currentRoom.uid,item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#DDD",transition:"color .2s"}} onMouseEnter={e=>e.currentTarget.style.color="var(--danger)"} onMouseLeave={e=>e.currentTarget.style.color="#DDD"}><Icon n="x" s={18}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <AddItemWidget roomUid={currentRoom.uid} roomType={currentRoom.type} existingItems={items} onAdd={item=>addItem(currentRoom.uid, item)} />
          </div>

        </div>
      </div>
    </ScreenBoundary>
  );
};
