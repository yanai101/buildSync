import React from 'react';
import { Icon, Btn, Badge } from '../components/Shared';
import { fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { Project, Room } from '../types';

export interface BOQItem {
  id: number;
  name: string;
  cat: string;
  qty: number;
  unit: string;
  unitPrice: number;
  supplier: string;
  spec: string;
  status: "pending" | "approved" | "rejected";
}

export const BOQScreen = () => {
  const { data: initialBoq, loading: boqLoading, error: boqError, refetch: refetchBoq } = useDataSource<Record<string, BOQItem[]>>('boq');
  const { data: project, loading: projectLoading, error: projectError, refetch: refetchProject } = useDataSource<Project>('project');
  
  const [items, setItems] = React.useState<Record<string, BOQItem[]>>({});
  const [room, setRoom] = React.useState<string>("");
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState<Partial<BOQItem>>({name:"",cat:"ריצוף",qty:1,unit:"יח'",unitPrice:0,supplier:"",spec:"",status:"pending"});

  const rooms = (project as any)?.rooms || [];

  React.useEffect(() => {
    if (initialBoq) setItems(initialBoq);
  }, [initialBoq]);

  React.useEffect(() => {
    if (rooms.length > 0 && !room) {
      setRoom(rooms[0].uid);
    }
  }, [rooms, room]);

  const roomItems = items[room] || [];
  const total = roomItems.reduce((a: number, i: BOQItem)=>a+i.qty*i.unitPrice,0);
  const allTotal = Object.values(items).flat().reduce((a: number, i: BOQItem)=>a+i.qty*i.unitPrice,0);

  const addItem = () => {
    if(!form.name) return;
    const newItem = {...form, id: Date.now()} as BOQItem;
    setItems(prev=>({
      ...prev,
      [room]: [...(prev[room]||[]), newItem]
    }));
    setAdding(false);
    setForm({name:"",cat:"ריצוף",qty:1,unit:"יח'",unitPrice:0,supplier:"",spec:"",status:"pending"});
  };

  const toggleStatus = (id: number) => {
    setItems(prev => {
      const next = {...prev};
      next[room] = (next[room] || []).map(i => i.id === id ? {...i, status: i.status === 'approved' ? 'pending' : 'approved'} : i);
      return next;
    });
  };

  const cats = [...new Set(roomItems.map((i)=>i.cat))];

  return (
    <ScreenBoundary loading={boqLoading || projectLoading} error={boqError || projectError} onRetry={() => { refetchBoq(); refetchProject(); }}>
      <div className="page-content">
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
          <select className="bp-input" value={room} onChange={e=>setRoom(e.target.value)} style={{width:"auto",minWidth:180}}>
            {rooms.map((r: Room)=><option key={r.uid} value={r.uid}>{r.name}</option>)}
          </select>
          <span style={{fontSize:13,color:"var(--text2)"}}>סה"כ חדר: <strong>{fmtMoney(total)}</strong></span>
          <span style={{fontSize:13,color:"var(--text3)"}}>| כלל הבית: <strong>{fmtMoney(allTotal)}</strong></span>
          <div style={{marginRight:"auto",display:"flex",gap:8}}>
            <Btn size="sm" variant="ghost" onClick={() => (window as any).location.href='/boqwizard'}><Icon n="settings" s={13}/> אשף כמויות</Btn>
            <Btn size="sm" variant="ghost"><Icon n="download" s={13}/> ייצוא PDF</Btn>
            <Btn size="sm" onClick={()=>setAdding(true)}><Icon n="plus" s={13}/> פריט חדש</Btn>
          </div>
        </div>

        {adding && (
          <div className="card" style={{padding:16,marginBottom:16,border:"2px solid var(--accent)"}}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>הוספת פריט חדש — {rooms.find((r: Room)=>r.uid===room)?.name}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
              {[["name","שם פריט"],["cat","קטגוריה"],["qty","כמות"],["unit","יחידה"],["unitPrice","מחיר ליח'"],["supplier","ספק"],["spec","מפרט טכני"]].map(([k,label])=>(
                <div key={k}>
                  <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>{label}</div>
                  <input className="bp-input" value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{width:"100%"}}/>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,display:"flex",gap:8}}>
              <Btn onClick={addItem}>שמור</Btn>
              <Btn variant="ghost" onClick={()=>setAdding(false)}>ביטול</Btn>
            </div>
          </div>
        )}

        {roomItems.length === 0
          ? <div className="card card-body" style={{textAlign:"center",color:"var(--text3)",padding:40}}>אין פריטים עדיין. לחץ "פריט חדש" להוסיף או עבר לאשף הכמויות.</div>
          : cats.map((cat)=>(
            <div key={cat} className="card" style={{marginBottom:16}}>
              <div className="card-header" style={{fontSize:13,display:"flex",justifyContent:"space-between"}}>
                <span>{cat}</span>
                <span style={{fontWeight:400,color:"var(--text3)"}}>{fmtMoney(roomItems.filter((i)=>i.cat===cat).reduce((a,i)=>a+i.qty*i.unitPrice,0))}</span>
              </div>
              <div style={{overflowX:"auto"}}>
                <table className="bp-table" style={{width:"100%"}}>
                  <thead><tr><th>פריט / מפרט</th><th>כמות</th><th>מחיר יח'</th><th>סה"כ</th><th>ספק</th><th>סטטוס</th></tr></thead>
                  <tbody>
                    {roomItems.filter(i=>i.cat===cat).map(i=>(
                      <tr key={i.id}>
                        <td>
                          <div style={{fontWeight:600,fontSize:13}}>{i.name}</div>
                          <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{i.spec}</div>
                        </td>
                        <td style={{fontSize:13}}>{i.qty} {i.unit}</td>
                        <td style={{fontSize:13}}>{fmtMoney(i.unitPrice)}</td>
                        <td style={{fontSize:13,fontWeight:700}}>{fmtMoney(i.qty*i.unitPrice)}</td>
                        <td style={{fontSize:12,color:"var(--text2)"}}>{i.supplier}</td>
                        <td>
                          <div onClick={()=>toggleStatus(i.id)} style={{cursor:"pointer"}}>
                            <Badge type={i.status === 'approved' ? 'done' : 'pending'}>{i.status === 'approved' ? 'מאושר' : 'ממתין'}</Badge>
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
    </ScreenBoundary>
  );
};
