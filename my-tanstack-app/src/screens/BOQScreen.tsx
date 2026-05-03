import React from 'react';
import { Icon, Btn, Badge, EmptyState, PageBackground, PremiumLock } from '../components/Shared';
import { BOQ_DATA, fmtMoney } from '../utils/mockData';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { Project, Room } from '../types';

export interface BOQItem {
  id: number | string;
  name: string;
  cat: string;
  qty: number;
  unit: string;
  unitPrice: number;
  supplier: string;
  spec: string;
  notes?: string;
  status: "pending" | "approved";
  isLocked?: boolean;
}

import { useCurrentProject } from '../hooks/useCurrentProject';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { getAllBoqCatalogCategories, getCatalogForRoom } from '../data/boqCatalog';
import type { Id } from '../../convex/_generated/dataModel';

const ITEM_FORM_FIELDS = [
  ["qty", "כמות"],
  ["unit", "יחידה"],
  ["unitPrice", "מחיר ליח'"],
  ["supplier", "ספק"],
  ["spec", "מפרט טכני"],
  ["notes", "הערות"],
] as const;

const BUILT_IN_BOQ_CATEGORIES = [
  "ריצוף פנים",
  "ריצוף חוץ",
  "חיפויי קירות",
  "קרמיקה וחיפויי חדרים רטובים",
  "אינסטלציה",
  "כלים סניטריים",
  "ברזים ואביזרי מים",
  "מערכת ביוב וניקוז",
  "חשמל",
  "לוחות חשמל",
  "נקודות חשמל",
  "תקשורת ואינטרנט",
  "בית חכם",
  "תאורה",
  "גופי תאורה פנים",
  "גופי תאורה חוץ",
  "תאורת גינה",
  "מיזוג אוויר",
  "חימום תת־רצפתי",
  "אוורור",
  "אלומיניום",
  "חלונות",
  "ויטרינות",
  "תריסים ורשתות",
  "דלתות פנים",
  "דלתות חוץ",
  "דלת כניסה",
  "מסגרות וברזל",
  "מעקות",
  "שערים וגדרות",
  "נגרות",
  "מטבח",
  "אי מטבח",
  "ארונות שירות",
  "ארונות קיר",
  "ארונות חדרים",
  "ארונות אמבטיה",
  "ספריות ומדפים",
  "חדרי רחצה",
  "מקלחונים",
  "אמבטיות",
  "אסלות וניאגרות",
  "כיורים",
  "משטחי שיש וקוורץ",
  "חיפויי מטבח",
  "פרזול",
  "ידיות",
  "צבע פנים",
  "צבע חוץ",
  "גבס",
  "הנמכות תקרה",
  "קירות דקורטיביים",
  "וילונות ופתרונות הצללה",
  "פרקטים",
  "מדרגות",
  "חיפוי מדרגות",
  "ריהוט",
  "ריהוט סלון",
  "ריהוט פינת אוכל",
  "ריהוט חדרי שינה",
  "ריהוט חדרי ילדים",
  "ריהוט משרד / פינת עבודה",
  "ריהוט גן",
  "מטבח חוץ",
  "בריכה",
  "חדר מכונות לבריכה",
  "מערכות סינון לבריכה",
  "חיפוי וריצוף בריכה",
  "דק",
  "פרגולות",
  "הצללות חוץ",
  "גינון",
  "דשא טבעי",
  "דשא סינטטי",
  "עצים וצמחייה",
  "מערכת השקיה",
  "אדניות וכדים",
  "שבילי גישה",
  "חניות",
  "ריצוף חניה",
  "קירות תמך",
  "חומות וגדרות",
  "שער חשמלי",
  "מערכת אינטרקום",
  "מצלמות אבטחה",
  "אזעקה",
  "מערכת שמע",
  "מערכת קולנוע ביתית",
  "מכשירי חשמל",
  "מקרר",
  "תנור",
  "כיריים",
  "מדיח",
  "קולט אדים",
  "מכונת כביסה",
  "מייבש",
  "מערכות סולאריות",
  "דוד שמש",
  "דוד חשמל",
  "משאבות",
  "מחסן",
  "חדר שירות",
  "ממ״ד",
  "אביזרי בטיחות",
  "אגרות והיטלים",
  "בלתי צפוי / רזרבה",
  "שונות",
];

const uniqueCategories = (categories: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  return categories
    .map((category) => (category || "").trim())
    .filter((category) => {
      if (!category || seen.has(category)) return false;
      seen.add(category);
      return true;
    });
};

const EXAMPLE_BOQ_CATEGORIES = uniqueCategories(
  Object.values(BOQ_DATA).flatMap((roomItems) =>
    (roomItems as Array<{cat?: string}>).map((item) => item.cat)
  )
);

const CategoryAutocomplete = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) => {
  const [open, setOpen] = React.useState(false);
  const trimmedValue = value.trim();
  const matchingOptions = options
    .filter((option) => option.includes(trimmedValue))
    .slice(0, 8);
  const visibleOptions = trimmedValue ? matchingOptions : options.slice(0, 8);
  const exactMatch = options.some((option) => option === trimmedValue);

  const chooseCategory = (category: string) => {
    onChange(category);
    setOpen(false);
  };

  return (
    <div style={{position:"relative"}}>
      <input
        className="bp-input"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={e => {
          if (e.key === "Enter" && trimmedValue) {
            e.preventDefault();
            chooseCategory(trimmedValue);
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="בחר או הקלד קטגוריה"
        style={{width:"100%"}}
      />
      {open && (
        <div
          role="listbox"
          style={{
            position:"absolute",
            top:"calc(100% + 4px)",
            right:0,
            left:0,
            zIndex:20,
            background:"#fff",
            border:"1px solid var(--border)",
            borderRadius:8,
            boxShadow:"var(--shadow-lg)",
            overflow:"hidden",
            maxHeight:260,
            overflowY:"auto",
          }}
        >
          {visibleOptions.map(option => (
            <button
              key={option}
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                chooseCategory(option);
              }}
              style={{
                width:"100%",
                display:"block",
                textAlign:"right",
                padding:"9px 12px",
                background:option === value ? "var(--accent-light)" : "#fff",
                border:"none",
                borderBottom:"1px solid var(--border)",
                cursor:"pointer",
                fontFamily:"inherit",
                fontSize:13,
                color:"var(--text1)",
              }}
            >
              {option}
            </button>
          ))}
          {trimmedValue && !exactMatch && (
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                chooseCategory(trimmedValue);
              }}
              style={{
                width:"100%",
                display:"block",
                textAlign:"right",
                padding:"10px 12px",
                background:"#FFFBF8",
                border:"none",
                cursor:"pointer",
                fontFamily:"inherit",
                fontSize:13,
                fontWeight:700,
                color:"var(--accent)",
              }}
            >
              הוסף קטגוריה חדשה: {trimmedValue}
            </button>
          )}
          {visibleOptions.length === 0 && !trimmedValue && (
            <div style={{padding:"10px 12px",fontSize:13,color:"var(--text3)"}}>
              אין קטגוריות להצגה
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import html2pdf from 'html2pdf.js';
import { BOQPrintTemplate } from '../components/BOQPrintTemplate';
import { useRequireRole } from '../hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';
import { useSubscription } from '../hooks/useSubscription';
import { useAppNotify } from '../hooks/useAppNotify';

export const BOQScreen = () => {
  const { allowed, loading: roleLoading } = useRequireRole(['owner', 'manager', 'inspector']);
  const { projectId } = useCurrentProject();
  const { notify } = useAppNotify();
  const { isProOrPremium } = useSubscription();
  const dbBoq = useQuery(api.queries.listBoq, projectId && allowed ? { projectId } : "skip");
  const dbProject = useQuery(api.projects.getWithDetails, projectId && allowed ? { projectId } : "skip");
  const addBoqItem = useMutation(api.mutations.addBoqItem);
  const updateBoqItem = useMutation(api.mutations.updateBoqItem);
  const updateBoqItemStatus = useMutation(api.mutations.updateBoqItemStatus);

  const initialBoq = dbBoq ?? null;
  const project = (dbProject ?? null) as Project | null;
  const loading = !!projectId && (dbBoq === undefined || dbProject === undefined);
  
  const [items, setItems] = React.useState<Record<string, BOQItem[]>>({});
  const [room, setRoom] = React.useState<string>("");
  const [adding, setAdding] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<BOQItem | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [statusSavingIds, setStatusSavingIds] = React.useState<Set<string | number>>(() => new Set());
  const [form, setForm] = React.useState<Partial<BOQItem>>({name:"",cat:"",qty:1,unit:"יח'",unitPrice:0,supplier:"",spec:"",notes:"",status:"pending"});

  const printRef = React.useRef<HTMLDivElement>(null);
  const rooms = (project as any)?.rooms || [];

  const handleExportPDF = async () => {
    if (!isProOrPremium) {
      notify({ title: 'תכונת Pro', body: 'ייצוא כתב כמויות ל-PDF זמין במסלול Pro ומעלה.', kind: 'info' });
      return;
    }
    if (!printRef.current) return;
    setExporting(true);
    try {
      const element = printRef.current;
      const opt = {
        margin: 0,
        filename: `BOQ_${project?.name || 'project'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setExporting(false);
    }
  };

  React.useEffect(() => {
    if (initialBoq) {
      if (Array.isArray(initialBoq)) {
        // Group by room for DB data
        const grouped: Record<string, BOQItem[]> = {};
        initialBoq.forEach((item: any) => {
          const roomId = item.roomId || "unassigned";
          if (!grouped[roomId]) grouped[roomId] = [];
          grouped[roomId].push({
            id: item._id,
            name: item.name,
            cat: item.category,
            qty: item.qty,
            unit: item.unit,
            unitPrice: item.unitPrice,
            supplier: item.supplier,
            spec: item.spec,
            notes: item.notes,
            status: item.status,
            isLocked: item.isLocked,
          });
        });
        setItems(grouped);
      } else {
        setItems(initialBoq);
      }
    }
  }, [initialBoq]);

  React.useEffect(() => {
    if (rooms.length > 0 && !room) {
      setRoom(rooms[0].uid);
    }
  }, [rooms, room]);

  const roomItems = items[room] || [];
  const currentRoom = rooms.find((r: Room) => r.uid === room);
  const total = roomItems.reduce((a: number, i: BOQItem)=>a+i.qty*i.unitPrice,0);
  const allTotal = Object.values(items).flat().reduce((a: number, i: BOQItem)=>a+i.qty*i.unitPrice,0);
  const categoryOptions = React.useMemo(
    () => uniqueCategories([
      ...getCatalogForRoom((currentRoom as any)?.type, false).map((item) => item.cat),
      ...BUILT_IN_BOQ_CATEGORIES,
      ...getAllBoqCatalogCategories(),
      ...EXAMPLE_BOQ_CATEGORIES,
      ...Object.values(items).flat().map((item) => item.cat),
    ]),
    [currentRoom, items]
  );

  const resetForm = () => {
    setForm({name:"",cat:"",qty:1,unit:"יח'",unitPrice:0,supplier:"",spec:"",notes:"",status:"pending"});
    setEditingItem(null);
    setFormError(null);
  };

  const startAdding = () => {
    resetForm();
    setAdding(true);
  };

  const startEditing = (item: BOQItem) => {
    setForm({
      name: item.name,
      cat: item.cat,
      qty: item.qty,
      unit: item.unit,
      unitPrice: item.unitPrice,
      supplier: item.supplier || "",
      spec: item.spec || "",
      notes: item.notes || "",
      status: item.status,
      isLocked: item.isLocked,
    });
    setEditingItem(item);
    setFormError(null);
    setAdding(true);
  };

  const patchLocalItem = (itemId: BOQItem["id"], patch: Partial<BOQItem>) => {
    setItems(prev => {
      const next = { ...prev };
      for (const [roomId, roomBoqItems] of Object.entries(next)) {
        const itemIndex = roomBoqItems.findIndex(item => item.id === itemId);
        if (itemIndex === -1) continue;
        next[roomId] = roomBoqItems.map(item => item.id === itemId ? { ...item, ...patch } : item);
        break;
      }
      return next;
    });
  };

  const saveItem = async () => {
    if (!projectId || !room) return;
    const isEditing = !!editingItem;
    const isLockedEdit = !!editingItem?.isLocked;
    const category = (form.cat || "").trim();
    const name = (form.name || "").trim();
    const unit = (form.unit || "").trim();
    if(!isLockedEdit && (!name || !category || !unit)) {
      setFormError("שם פריט, קטגוריה ויחידה הם שדות חובה");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload: {
        projectId: typeof projectId;
        roomId: Id<'projectRooms'>;
        category: string;
        name: string;
        qty: number;
        unit: string;
        unitPrice: number;
        supplier?: string;
        spec?: string;
        notes?: string;
      } = {
        projectId,
        roomId: room as Id<'projectRooms'>,
        category,
        name,
        qty: Number(form.qty) || 0,
        unit,
        unitPrice: Number(form.unitPrice) || 0,
      };
      const supplier = (form.supplier || "").trim();
      const spec = (form.spec || "").trim();
      const notes = (form.notes || "").trim();
      if (supplier) payload.supplier = supplier;
      if (spec) payload.spec = spec;
      if (notes) payload.notes = notes;

      if (isEditing && editingItem) {
        const updatePayload: {
          itemId: Id<'boqItems'>;
          category?: string;
          name?: string;
          qty?: number;
          unit?: string;
          unitPrice?: number;
          supplier?: string;
          spec?: string;
          notes?: string;
        } = {
          itemId: editingItem.id as Id<'boqItems'>,
          unitPrice: Number(form.unitPrice) || 0,
          supplier,
          spec,
          notes,
        };
        if (!isLockedEdit) {
          updatePayload.category = category;
          updatePayload.name = name;
          updatePayload.qty = Number(form.qty) || 0;
          updatePayload.unit = unit;
        }

        await updateBoqItem(updatePayload);
        patchLocalItem(editingItem.id, {
          ...(isLockedEdit ? {} : { cat: category, name, qty: Number(form.qty) || 0, unit }),
          unitPrice: Number(form.unitPrice) || 0,
          supplier,
          spec,
          notes,
        });
      } else {
        const itemId = await addBoqItem(payload);
        setItems(prev => ({
          ...prev,
          [room]: [
            ...(prev[room] || []),
            {
              id: itemId,
              name,
              cat: category,
              qty: Number(form.qty) || 0,
              unit,
              unitPrice: Number(form.unitPrice) || 0,
              supplier,
              spec,
              notes,
              status: "pending",
            },
          ],
        }));
      }
      setAdding(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save BOQ item', err);
      setFormError("שמירת הפריט נכשלה. נסה שוב.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: BOQItem) => {
    const nextStatus = item.status === 'approved' ? 'pending' : 'approved';
    setStatusSavingIds(prev => new Set(prev).add(item.id));
    try {
      await updateBoqItemStatus({ itemId: item.id as any, status: nextStatus });
      patchLocalItem(item.id, { status: nextStatus });
    } catch (err) {
      console.error('Failed to update BOQ item status', err);
    } finally {
      setStatusSavingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const cats = [...new Set(roomItems.map((i)=>i.cat))];

  if (roleLoading) return <AccessLoading />;
  if (!allowed) return <AccessDenied message="כתב כמויות וניהול BoQ מורשים לצוות הניהול והפיקוח בלבד." />;

  return (
    <ScreenBoundary loading={loading} error={null} onRetry={() => window.location.reload()}>
      <PremiumLock
        isLocked={!isProOrPremium}
        title="ניהול חכם של כתב כמויות"
        description="קבל גישה מלאה לניהול כתב הכמויות, ייצוא ל-PDF ומעקב מדויק אחר הזמנות מספקים."
      >
        <div className="page-content">
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
          <select className="bp-input" value={room} onChange={e=>setRoom(e.target.value)} style={{width:"auto",minWidth:180}}>
            {rooms.map((r: Room)=><option key={r.uid} value={r.uid}>{r.name}</option>)}
          </select>
          <span style={{fontSize:13,color:"var(--text2)"}}>סה"כ חדר: <strong>{fmtMoney(total)}</strong></span>
          <span style={{fontSize:13,color:"var(--text3)"}}>| כלל הבית: <strong>{fmtMoney(allTotal)}</strong></span>
          <div style={{marginRight:"auto",display:"flex",gap:8}}>
            <Btn size="sm" variant="ghost" onClick={() => (window as any).location.href='/boqwizard'}><Icon n="settings" s={13}/> אשף כמויות</Btn>
            <Btn size="sm" variant="ghost" onClick={handleExportPDF} disabled={exporting}>
              <Icon n={exporting ? "loader" : "download"} s={13}/> {exporting ? "מייצא..." : "ייצוא PDF"}
            </Btn>
            <Btn size="sm" onClick={startAdding} disabled={!projectId || !room}><Icon n="plus" s={13}/> פריט חדש</Btn>
          </div>
        </div>

        {adding && (
          <div className="card" style={{padding:16,marginBottom:16,border:"2px solid var(--accent)"}}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>
              {editingItem ? "עריכת פריט" : "הוספת פריט חדש"} — {currentRoom?.name}
              {editingItem?.isLocked && (
                <span style={{fontWeight:400,fontSize:12,color:"var(--text3)",marginRight:8}}>
                  פריט מהאשף: ניתן לערוך מחיר, ספק, מפרט והערות
                </span>
              )}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
              <div>
                <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>שם פריט</div>
                <input
                  className="bp-input"
                  value={form.name || ""}
                  onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                  disabled={!!editingItem?.isLocked}
                  style={{width:"100%"}}
                />
              </div>
              <div>
                <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>קטגוריה</div>
                {editingItem?.isLocked ? (
                  <input className="bp-input" value={form.cat || ""} disabled style={{width:"100%"}}/>
                ) : (
                  <CategoryAutocomplete
                    value={form.cat || ""}
                    onChange={cat => setForm(f => ({...f, cat}))}
                    options={categoryOptions}
                  />
                )}
              </div>
              {ITEM_FORM_FIELDS.map(([k,label])=>(
                <div key={k}>
                  <div style={{fontSize:11,color:"var(--text2)",marginBottom:3}}>{label}</div>
                  <input
                    className="bp-input"
                    value={(form as any)[k]}
                    onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                    disabled={!!editingItem?.isLocked && (k === "qty" || k === "unit")}
                    style={{width:"100%"}}
                  />
                </div>
              ))}
            </div>
            {formError && <div style={{marginTop:10,fontSize:12,color:"var(--danger)",fontWeight:600}}>{formError}</div>}
            <div style={{marginTop:12,display:"flex",gap:8}}>
              <Btn onClick={saveItem} disabled={saving}>{saving ? "שומר..." : "שמור"}</Btn>
              <Btn variant="ghost" onClick={()=>{setAdding(false);resetForm()}} disabled={saving}>ביטול</Btn>
            </div>
          </div>
        )}

        {roomItems.length === 0
          ? (
            <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
              <PageBackground image="/empty_states/boq.png" />
              <EmptyState 
                icon="clipboard" 
                title="אין פריטים בחדר זה" 
              description="הוסיפו פריטים ידנית או השתמשו באשף הכמויות ליצירה אוטומטית של רשימת קניות על בסיס סוג החדר."
              action={
                <div style={{display: 'flex', gap: 12}}>
                  <Btn size="lg" onClick={startAdding} disabled={!projectId || !room}>
                    <Icon n="plus" s={18} /> פריט חדש
                  </Btn>
                  <Btn size="lg" variant="ghost" onClick={() => (window as any).location.href='/boqwizard'}>
                    <Icon n="zoom-in" s={18} /> אשף כמויות
                  </Btn>
                </div>
              }
            />
            </div>
          )
          : cats.map((cat)=>(
            <div key={cat} className="card" style={{marginBottom:16}}>
              <div className="card-header" style={{fontSize:13,display:"flex",justifyContent:"space-between"}}>
                <span>{cat}</span>
                <span style={{fontWeight:400,color:"var(--text3)"}}>{fmtMoney(roomItems.filter((i)=>i.cat===cat).reduce((a,i)=>a+i.qty*i.unitPrice,0))}</span>
              </div>
              <div style={{overflowX:"auto"}}>
                <table className="bp-table" style={{width:"100%"}}>
                  <thead><tr><th>פריט / מפרט</th><th>כמות</th><th>מחיר יח'</th><th>סה"כ</th><th>ספק</th><th>סטטוס</th><th></th></tr></thead>
                  <tbody>
                    {roomItems.filter(i=>i.cat===cat).map(i=>(
                      <tr key={i.id}>
                        <td>
                          <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                            {i.isLocked && <Icon n="lock" s={12} c="var(--text3)"/>}
                            <span>{i.name}</span>
                          </div>
                          <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{i.spec}</div>
                          {i.notes && <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>הערות: {i.notes}</div>}
                        </td>
                        <td style={{fontSize:13}}>{i.qty} {i.unit}</td>
                        <td style={{fontSize:13}}>{fmtMoney(i.unitPrice)}</td>
                        <td style={{fontSize:13,fontWeight:700}}>{fmtMoney(i.qty*i.unitPrice)}</td>
                        <td style={{fontSize:12,color:"var(--text2)"}}>{i.supplier}</td>
                        <td>
                          <button
                            type="button"
                            onClick={()=>!statusSavingIds.has(i.id) && toggleStatus(i)}
                            disabled={statusSavingIds.has(i.id)}
                            style={{background:"transparent",border:"none",padding:0,cursor:statusSavingIds.has(i.id) ? "wait" : "pointer", opacity:statusSavingIds.has(i.id) ? .65 : 1}}
                          >
                            <Badge type={i.status === 'approved' ? 'done' : 'pending'}>{i.status === 'approved' ? 'מאושר' : 'ממתין'}</Badge>
                          </button>
                        </td>
                        <td style={{textAlign:"left"}}>
                          <Btn size="sm" variant="ghost" onClick={() => startEditing(i)}>
                            <Icon n="edit" s={13}/> עריכה
                          </Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <BOQPrintTemplate
            ref={printRef}
            project={project}
            itemsGroupedByRoom={items}
            rooms={rooms}
          />
        </div>
      </div>
      </PremiumLock>
    </ScreenBoundary>
  );
};
