import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, Btn, ProgressBar, FeedbackModal, EmptyState, PageBackground } from '../components/Shared';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { Project, Room } from '../types';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import html2pdf from 'html2pdf.js';
import { BOQPrintTemplate } from '../components/BOQPrintTemplate';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';
import { getCatalogForRoom } from '../data/boqCatalog';
import { useRequireRole } from '../hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';
import type { Id } from '../../convex/_generated/dataModel';

// ── CONSTANTS & CATALOG ───────────────────────────────────────────────────────

// Locked-flooring constants — every room gets two auto-generated, undeletable
// rows: one for floor tiling, one for wall-tile cladding. Both can be toggled
// on/off (isEnabled). The waste % is read from project.floorWastePct, default 10.
const DEFAULT_FLOOR_WASTE_PCT = 15;
const FLOOR_CATEGORY = 'ריצוף';
const FLOOR_NAME = 'ריצוף לחדר';
const FLOOR_UNIT = 'מ"ר';
const WALL_TILE_CATEGORY = 'חיפוי קירות';
const WALL_TILE_NAME = 'ריצוף לחיפוי קירות';
const WALL_TILE_UNIT = 'מ"ר';
const wasteFactor = (pct: number | undefined) => 1 + (Number(pct ?? DEFAULT_FLOOR_WASTE_PCT) / 100);
const applyWaste = (base: number, pct: number | undefined) =>
  Math.ceil(Math.max(0, base) * wasteFactor(pct));

// Smart-suggestion auto-population was removed — new rooms start empty
// (only the locked flooring/wall-tile rows appear, see ensureLockedRows).
// The catalog (`AddItemWidget`) is still available for the user to add items
// manually.

const getRoomDbId = (room: any) => room?._id ?? room?.uid;

const AddItemWidget = ({
  roomUid, roomType, existingItems, onAdd, projectId, uploadProjectFile
}: {
  roomUid: string;
  roomType: string;
  existingItems: any[];
  onAdd: (item: any) => Promise<void>;
  projectId: Id<'projects'> | null;
  uploadProjectFile: any;
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [pendingItem, setPendingItem] = React.useState<any>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [savingItem, setSavingItem] = React.useState(false);
  const [imageUploadError, setImageUploadError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const imgInputRef = React.useRef<HTMLInputElement>(null);

  const catalog = getCatalogForRoom(roomType);
  const existingNames = existingItems.map(i=>i.name.trim().toLowerCase());
  const allSuggestions = query.trim().length >= 1
    ? catalog.filter(c => c.name.includes(query.trim()) && !existingNames.includes(c.name.toLowerCase())).slice(0, 8)
    : catalog.filter(c => !existingNames.includes(c.name.toLowerCase())).slice(0, 8);

  const close = () => { setOpen(false); setQuery(""); setPendingItem(null); setImagePreview(null); setImageUploadError(null); };

  const selectItem = (item: any) => {
    setPendingItem({id:`cat_${Date.now()}`, cat:item.cat, name:item.name, qty:item.qty, unit:item.unit, userQty:item.qty, imageUrl: null, notes: ''});
  };

  const handleImagePick = async (file: File | null) => {
    if (!file) return;
    setImageUploadError(null);
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    if (!projectId || !uploadProjectFile) {
      setPendingItem((prev: any) => prev ? {...prev, imageUrl: null, projectFileId: undefined} : prev);
      setImageUploadError("אי אפשר לשמור תמונה בלי פרויקט פעיל.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadProjectFile({ projectId, file, usage: 'document', kind: 'image' });
      // We don't have a URL back from uploader directly; store fileId and use local preview for now
      setPendingItem((prev: any) => prev ? {...prev, imageUrl: localUrl, projectFileId: uploaded.fileId} : prev);
    } catch {
      setPendingItem((prev: any) => prev ? {...prev, imageUrl: null, projectFileId: undefined} : prev);
      setImageUploadError("העלאת התמונה נכשלה. נסה שוב או הסר את התמונה לפני ההוספה.");
    } finally {
      setUploading(false);
    }
  };

  const confirmAdd = async () => {
    if (!pendingItem) return;
    setSavingItem(true);
    try {
      await onAdd(pendingItem);
      close();
    } finally {
      setSavingItem(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          display:"flex", alignItems:"center", gap:8,
          padding:"8px 18px", borderRadius:10,
          border:"1.5px solid var(--accent)",
          background:"var(--accent-light)", color:"var(--accent)",
          fontWeight:700, fontSize:14, cursor:"pointer",
        }}
      >
        <Icon n="plus" s={15}/> הוסף פריט
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) close(); }}
          style={{
            position:"fixed", inset:0, zIndex:200,
            background:"rgba(0,0,0,0.4)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}
        >
          <div style={{
            background:"#fff", borderRadius:20, width:480, maxWidth:"94vw",
            boxShadow:"0 24px 64px rgba(0,0,0,0.2)",
            padding:28, display:"flex", flexDirection:"column", gap:16,
          }}>
            {/* Header */}
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span style={{fontWeight:800, fontSize:17}}>
                {pendingItem ? pendingItem.name : "הוספת פריט לחדר"}
              </span>
              <button onClick={close} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)"}}>
                <Icon n="x" s={18}/>
              </button>
            </div>

            {!pendingItem ? (
              <>
                {/* Search */}
                <input
                  ref={inputRef}
                  className="bp-input"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="חפש בקטלוג או הקלד שם פריט..."
                  style={{fontSize:15}}
                />
                <div style={{maxHeight:260, overflowY:"auto", border:"1px solid var(--border)", borderRadius:10}}>
                  {allSuggestions.length > 0 ? allSuggestions.map((s,i) => (
                    <div
                      key={i}
                      onClick={() => selectItem(s)}
                      style={{padding:"11px 16px",cursor:"pointer",fontSize:14,borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}
                      onMouseEnter={e => (e.currentTarget.style.background="var(--accent-light)")}
                      onMouseLeave={e => (e.currentTarget.style.background="transparent")}
                    >
                      <span style={{fontWeight:600}}>{s.name}</span>
                      <span style={{fontSize:12,color:"var(--text3)",background:"var(--border)",borderRadius:6,padding:"2px 8px"}}>{s.cat}</span>
                    </div>
                  )) : (
                    <div style={{padding:"14px 16px",fontSize:13,color:"var(--text3)"}}>הקלד שם פריט לחיפוש</div>
                  )}
                </div>
                {query.trim() && !allSuggestions.some(s => s.name === query.trim()) && (
                  <button
                    onClick={() => selectItem({cat:"כללי",name:query.trim(),qty:1,unit:"יח'",userQty:1})}
                    style={{padding:"10px",borderRadius:10,border:"2px dashed var(--accent)",background:"var(--accent-light)",color:"var(--accent)",fontWeight:700,fontSize:14,cursor:"pointer"}}
                  >
                    <Icon n="plus" s={14}/> הוסף "{query.trim()}" כפריט חופשי
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Image upload area */}
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/*"
                  style={{display:"none"}}
                  onChange={e => { handleImagePick(e.target.files?.[0] ?? null); e.currentTarget.value=""; }}
                />
                {imagePreview ? (
                  <div style={{position:"relative",borderRadius:12,overflow:"hidden",height:160}}>
                    <img src={imagePreview} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    {uploading && (
                      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Icon n="loader" s={28} c="#fff"/>
                      </div>
                    )}
                    <button
                      onClick={() => { setImagePreview(null); setImageUploadError(null); setPendingItem((p:any)=>({...p, imageUrl:null, projectFileId:undefined})); }}
                      style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.55)",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff"}}
                    >
                      <Icon n="x" s={13} c="#fff"/>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => imgInputRef.current?.click()}
                    style={{width:"100%",height:120,border:"2px dashed var(--border)",borderRadius:12,background:"var(--surface)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,color:"var(--text3)",fontSize:14}}
                  >
                    <Icon n="camera" s={24} c="var(--text3)"/>
                    <span>הוסף תמונה לפריט <span style={{fontSize:12}}>(אופציונלי)</span></span>
                    <span style={{fontSize:11,color:"var(--text3)"}}>נשמר כ-AVIF לחיסכון בנפח</span>
                  </button>
                )}
                {imageUploadError && (
                  <div style={{fontSize:12,color:"var(--danger)",lineHeight:1.5}}>
                    {imageUploadError}
                  </div>
                )}
                <textarea
                  value={pendingItem.notes ?? ''}
                  placeholder="הערות לפריט (אופציונלי)"
                  onChange={e => setPendingItem((prev: any) => prev ? { ...prev, notes: e.target.value } : prev)}
                  rows={3}
                  style={{width:"100%",resize:"vertical",fontFamily:"'Heebo',sans-serif",fontSize:13,padding:"8px 10px",border:"1px solid var(--border)",borderRadius:10,background:"#fff"}}
                />
                <div style={{display:"flex",gap:10}}>
                  <button
                    onClick={() => setPendingItem(null)}
                    style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",fontSize:14,fontWeight:600,color:"var(--text2)"}}
                  >
                    חזרה
                  </button>
                  <button
                    onClick={confirmAdd}
                    disabled={uploading || savingItem || !!imageUploadError}
                    style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:"var(--accent)",color:"#fff",cursor:(uploading || savingItem || imageUploadError)?"wait":"pointer",fontSize:14,fontWeight:700,opacity:(uploading || savingItem || imageUploadError)?0.7:1}}
                  >
                    {uploading ? "מעלה תמונה..." : savingItem ? "שומר פריט..." : "הוסף פריט"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ── BOQ WIZARD SCREEN ───────────────────────────────────────────────────────

export const BOQWizardScreen = () => {
  const { allowed, loading: roleLoading } = useRequireRole(['owner', 'manager']);
  const { projectId } = useCurrentProject();
  const dbProject = useQuery(api.projects.getWithDetails, projectId && allowed ? { projectId } : "skip");
  const { data: project, loading, error, refetch } = useDataSource<Project>('project', { db: dbProject as any });
  const { mutate } = useDataMutation('boq');
  const uploadProjectFile = useProjectFileUploader();
  const addBoqItemMutation = useMutation(api.mutations.addBoqItem);
  const saveBoqMutation = useMutation(api.mutations.saveBoq);
  const deleteBoqItemMutation = useMutation(api.mutations.deleteBoqItem);
  const updateBoqItemMutation = useMutation(api.mutations.updateBoqItem);
  const dbBoqItems = useQuery(api.queries.listBoq, projectId ? { projectId } : 'skip');
  
  const [step, setStep] = React.useState(0);
  const [allItems, setAllItems] = React.useState<any>({});
  const [view, setView] = React.useState<'wizard' | 'summary'>('wizard');
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error'; redirect?: string } | null>(null);
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);

  // Track which rooms have been initialised so we don't overwrite local state on re-render
  const [initialised, setInitialised] = React.useState(false);

  React.useEffect(() => {
    if (!project || !(project as any).rooms) return;
    if (initialised) return;
    // Wait until dbBoqItems has resolved (not undefined = still loading)
    if (dbBoqItems === undefined) return;

    const rooms: Room[] = (project as any).rooms;
    const init: any = {};

    // Build a lookup: roomId -> DB items already saved
    const dbByRoom: Record<string, any[]> = {};
    if (dbBoqItems && dbBoqItems.length > 0) {
      for (const dbItem of dbBoqItems) {
        const key = dbItem.roomId ?? 'global';
        if (!dbByRoom[key]) dbByRoom[key] = [];
        dbByRoom[key].push({
          id: dbItem._id,
          cat: dbItem.category,
          name: dbItem.name,
          qty: dbItem.qty,
          userQty: dbItem.userQty ?? dbItem.qty,
          unit: dbItem.unit,
          hint: dbItem.hint,
          imageUrl: dbItem.imageUrl,
          spec: dbItem.spec,
          notes: dbItem.notes,
          projectFileId: (dbItem as any).projectFileId,
          isLocked: (dbItem as any).isLocked === true,
          // Preserve isEnabled from DB so toggle state survives reloads.
          isEnabled: (dbItem as any).isEnabled,
          _persisted: true, // mark so we don't re-save in onFinish
        });
      }
    }

    rooms.forEach((r: Room) => {
      const roomId = getRoomDbId(r);
      const roomDbItems = dbByRoom[roomId] ?? [];
      // New rooms start empty — only the locked flooring/wall-tile rows
      // (created by ensureLockedRows) appear automatically.
      init[r.uid] = roomDbItems;
    });

    setAllItems(init);
    setInitialised(true);
  }, [project, dbBoqItems, initialised]);

  // Ensure every room has its two locked rows (floor + wall-tile). The floor
  // row's qty tracks sizeSqm × waste; the wall-tile row's qty tracks the
  // user's chosen wall area × waste. Runs whenever project waste, rooms, or
  // dbBoqItems change.
  const ensuredRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!projectId || !project || dbBoqItems === undefined) return;
    const wastePct = (project as any).floorWastePct;
    const rooms: Room[] = (project as any).rooms ?? [];

    const pushIntoLocal = (roomUid: string, row: any) => {
      setAllItems((prev: any) => {
        const list = prev[roomUid] ?? [];
        if (list.some((i: any) => String(i.id) === String(row.id))) return prev;
        return { ...prev, [roomUid]: [...list, row] };
      });
    };

    rooms.forEach((room: any) => {
      // `getWithDetails` projects rooms as `{ uid: r._id, ... }` and does NOT
      // include `_id`; use `getRoomDbId` so this works for both shapes.
      const roomId = getRoomDbId(room);
      if (!roomId) return;
      const sizeSqm = Number(room.size ?? room.sizeSqm ?? 0);

      // FLOOR row — qty derived from room size
      const floorTargetQty = applyWaste(sizeSqm, wastePct);
      const floorExisting = (dbBoqItems ?? []).find(
        (it: any) => it.roomId === roomId && it.isLocked === true && it.category === FLOOR_CATEGORY,
      );
      if (!floorExisting) {
        const key = `floor:${roomId}`;
        if (!ensuredRef.current.has(key)) {
          ensuredRef.current.add(key);
          addBoqItemMutation({
            projectId: projectId as any,
            roomId: roomId as any,
            category: FLOOR_CATEGORY,
            name: FLOOR_NAME,
            qty: floorTargetQty,
            unit: FLOOR_UNIT,
            unitPrice: 0,
            isLocked: true,
            isEnabled: true,
            source: 'wizard_smart',
          }).then((newId) => {
            pushIntoLocal(room.uid, {
              id: newId,
              cat: FLOOR_CATEGORY,
              name: FLOOR_NAME,
              qty: floorTargetQty,
              userQty: floorTargetQty,
              unit: FLOOR_UNIT,
              isLocked: true,
              isEnabled: true,
              notes: '',
              _persisted: true,
            });
          }).catch(() => {
            ensuredRef.current.delete(key);
          });
        }
      } else if (floorExisting.isEnabled !== false && floorExisting.qty !== floorTargetQty) {
        const key = `floor-qty:${roomId}:${floorTargetQty}`;
        if (!ensuredRef.current.has(key)) {
          ensuredRef.current.add(key);
          updateBoqItemMutation({ itemId: floorExisting._id, qty: floorTargetQty }).catch(() => {
            ensuredRef.current.delete(key);
          });
        }
      }

      // WALL-TILE row — only created for wet rooms (toilets and bathrooms).
      // Regular rooms typically don't get wall tiling. If the user later
      // changes a room's type away from wet, an existing wall-tile row stays
      // (but can be toggled off).
      const isWetRoom = room.type === 'bathroom' || room.type === 'toilet';
      const wallExisting = (dbBoqItems ?? []).find(
        (it: any) => it.roomId === roomId && it.isLocked === true && it.category === WALL_TILE_CATEGORY,
      );
      if (!wallExisting && isWetRoom) {
        const key = `wall:${roomId}`;
        if (!ensuredRef.current.has(key)) {
          ensuredRef.current.add(key);
          addBoqItemMutation({
            projectId: projectId as any,
            roomId: roomId as any,
            category: WALL_TILE_CATEGORY,
            name: WALL_TILE_NAME,
            qty: 0,
            userQty: 0,
            unit: WALL_TILE_UNIT,
            unitPrice: 0,
            isLocked: true,
            isEnabled: false,
            source: 'wizard_smart',
          }).then((newId) => {
            pushIntoLocal(room.uid, {
              id: newId,
              cat: WALL_TILE_CATEGORY,
              name: WALL_TILE_NAME,
              qty: 0,
              userQty: 0,
              unit: WALL_TILE_UNIT,
              isLocked: true,
              isEnabled: false,
              notes: '',
              _persisted: true,
            });
          }).catch(() => {
            ensuredRef.current.delete(key);
          });
        }
      } else if (wallExisting && wallExisting.isEnabled === true) {
        // Re-derive qty when waste % changes
        const base = Number(wallExisting.userQty ?? 0);
        const target = applyWaste(base, wastePct);
        if (wallExisting.qty !== target) {
          const key = `wall-qty:${roomId}:${target}`;
          if (!ensuredRef.current.has(key)) {
            ensuredRef.current.add(key);
            updateBoqItemMutation({ itemId: wallExisting._id, qty: target }).catch(() => {
              ensuredRef.current.delete(key);
            });
          }
        }
      }
    });
  }, [project, dbBoqItems, projectId, addBoqItemMutation, updateBoqItemMutation]);

  const rooms = (project as any)?.rooms || [];
  const currentRoom = rooms[step];

  // Locked-row helpers: image upload + spec auto-save (debounced).
  const handleLockedImagePick = async (itemId: string, file: File | null) => {
    if (!file || !projectId) return;
    const localUrl = URL.createObjectURL(file);
    setAllItems((prev: any) => {
      const next: any = { ...prev };
      for (const ruid of Object.keys(next)) {
        next[ruid] = next[ruid].map((i: any) =>
          i.id === itemId ? { ...i, imageUrl: localUrl, _imageUploading: true } : i,
        );
      }
      return next;
    });
    try {
      const result = await uploadProjectFile({
        projectId: projectId as any,
        file,
        usage: 'document',
        kind: 'image',
      });
      await updateBoqItemMutation({
        itemId: itemId as any,
        projectFileId: result.fileId as any,
      });
      // dbBoqItems will refresh; reflect locally so the UI updates immediately
      setAllItems((prev: any) => {
        const next: any = { ...prev };
        for (const ruid of Object.keys(next)) {
          next[ruid] = next[ruid].map((i: any) =>
            i.id === itemId ? { ...i, imageUrl: localUrl, projectFileId: result.fileId, _imageUploading: false } : i,
          );
        }
        return next;
      });
    } catch (err) {
      console.error('Locked image upload failed', err);
      URL.revokeObjectURL(localUrl);
      setAllItems((prev: any) => {
        const next: any = { ...prev };
        for (const ruid of Object.keys(next)) {
          next[ruid] = next[ruid].map((i: any) =>
            i.id === itemId ? { ...i, imageUrl: undefined, _imageUploading: false } : i,
          );
        }
        return next;
      });
      setFeedback({ title: 'שגיאה', message: 'העלאת התמונה נכשלה', type: 'error' });
    }
  };

  // Toggle a locked row on/off. When turning off, qty drops to 0 (or userQty
  // for wall row). When turning on, recompute qty from current waste %.
  const handleLockedToggle = async (item: any) => {
    const wastePct = (project as any)?.floorWastePct;
    const newEnabled = !(item.isEnabled !== false);
    let nextQty = item.qty;
    if (item.cat === FLOOR_CATEGORY) {
      // floor qty derived from current room size
      const room = rooms.find((r: any) => (r.uid && allItems[r.uid]?.some((i: any) => i.id === item.id)));
      const sizeSqm = Number(room?.size ?? room?.sizeSqm ?? 0);
      nextQty = newEnabled ? applyWaste(sizeSqm, wastePct) : 0;
    } else if (item.cat === WALL_TILE_CATEGORY) {
      const base = Number(item.userQty ?? 0);
      nextQty = newEnabled ? applyWaste(base, wastePct) : 0;
    }
    setAllItems((prev: any) => {
      const next: any = { ...prev };
      for (const ruid of Object.keys(next)) {
        next[ruid] = next[ruid].map((i: any) =>
          i.id === item.id ? { ...i, isEnabled: newEnabled, qty: nextQty } : i,
        );
      }
      return next;
    });
    try {
      await updateBoqItemMutation({
        itemId: item.id as any,
        isEnabled: newEnabled,
        qty: nextQty,
      });
    } catch (err) {
      console.error('Toggle failed', err);
      setFeedback({ title: 'שגיאה', message: 'לא הצלחנו לעדכן', type: 'error' });
    }
  };

  // Wall-tile user-base m² input. Updates userQty + recomputes qty using waste.
  const wallQtyTimers = React.useRef<Record<string, number>>({});
  const handleWallUserQty = (item: any, raw: string) => {
    const wastePct = (project as any)?.floorWastePct;
    const userQty = Math.max(0, Number(raw) || 0);
    const qty = applyWaste(userQty, wastePct);
    setAllItems((prev: any) => {
      const next: any = { ...prev };
      for (const ruid of Object.keys(next)) {
        next[ruid] = next[ruid].map((i: any) =>
          i.id === item.id ? { ...i, userQty, qty } : i,
        );
      }
      return next;
    });
    const existing = wallQtyTimers.current[String(item.id)];
    if (existing) window.clearTimeout(existing);
    wallQtyTimers.current[String(item.id)] = window.setTimeout(() => {
      updateBoqItemMutation({ itemId: item.id as any, userQty, qty }).catch(console.error);
    }, 400);
  };

  const specTimers = React.useRef<Record<string, number>>({});
  const handleLockedSpecChange = (itemId: string, value: string) => {
    setAllItems((prev: any) => {
      const next: any = { ...prev };
      for (const ruid of Object.keys(next)) {
        next[ruid] = next[ruid].map((i: any) =>
          i.id === itemId ? { ...i, spec: value, _specSaving: true } : i,
        );
      }
      return next;
    });
    const existing = specTimers.current[itemId];
    if (existing) window.clearTimeout(existing);
    specTimers.current[itemId] = window.setTimeout(async () => {
      try {
        await updateBoqItemMutation({ itemId: itemId as any, spec: value });
      } catch (err) {
        console.error('Spec save failed', err);
      } finally {
        setAllItems((prev: any) => {
          const next: any = { ...prev };
          for (const ruid of Object.keys(next)) {
            next[ruid] = next[ruid].map((i: any) =>
              i.id === itemId ? { ...i, _specSaving: false } : i,
            );
          }
          return next;
        });
      }
    }, 600);
  };

  const notesTimers = React.useRef<Record<string, number>>({});
  const handleItemNotesChange = (itemId: string, value: string) => {
    setAllItems((prev: any) => {
      const next: any = { ...prev };
      for (const ruid of Object.keys(next)) {
        next[ruid] = next[ruid].map((i: any) =>
          i.id === itemId ? { ...i, notes: value, _notesSaving: i._persisted ? true : false } : i,
        );
      }
      return next;
    });
    const item = Object.values(allItems).flat().find((i: any) => i.id === itemId) as any;
    if (!item?._persisted) return;

    const existing = notesTimers.current[itemId];
    if (existing) window.clearTimeout(existing);
    notesTimers.current[itemId] = window.setTimeout(async () => {
      try {
        await updateBoqItemMutation({ itemId: itemId as any, notes: value });
      } catch (err) {
        console.error('Notes save failed', err);
        setFeedback({ title: 'שגיאה', message: 'לא הצלחנו לשמור את ההערות לפריט', type: 'error' });
      } finally {
        setAllItems((prev: any) => {
          const next: any = { ...prev };
          for (const ruid of Object.keys(next)) {
            next[ruid] = next[ruid].map((i: any) =>
              i.id === itemId ? { ...i, _notesSaving: false } : i,
            );
          }
          return next;
        });
      }
    }, 600);
  };

  const setQty = (roomUid: string, itemId: string, qty: any) => {
    setAllItems((prev: any)=>({...prev,[roomUid]:(prev[roomUid]||[]).map((i: any)=>i.id===itemId?{...i,userQty:Math.max(0,Number(qty))}:i)}));
  };
  const addItem = async (roomUid: string, item: any) => {
    setAllItems((prev: any)=>({...prev,[roomUid]:[...(prev[roomUid]||[]),item]}));

    // Persist immediately to DB so refresh doesn't lose the item
    if (projectId && !item._persisted) {
      const room = ((project as any)?.rooms || []).find((r: any) => r.uid === roomUid);
      const roomId = getRoomDbId(room);
      const isBlobUrl = (url: string) => url?.startsWith('blob:');
      try {
        const newId = await addBoqItemMutation({
          projectId: projectId as any,
          ...(roomId ? { roomId: roomId as any } : {}),
          category: item.cat || 'כללי',
          name: item.name,
          qty: Number(item.qty) || 1,
          unit: item.unit || "יח'",
          unitPrice: 0,
          // Never store blob URLs - they're session-only; only store projectFileId
          ...(item.projectFileId ? { projectFileId: item.projectFileId as any } : {}),
          // Only store imageUrl if it's a real persistent URL (not blob:)
          ...(item.imageUrl && !isBlobUrl(item.imageUrl) ? { imageUrl: item.imageUrl } : {}),
          ...(item.notes?.trim() ? { notes: item.notes.trim() } : {}),
        });
        // Mark the item as persisted in local state using its new DB id
        setAllItems((prev: any) => ({
          ...prev,
          [roomUid]: (prev[roomUid] || []).map((i: any) =>
            i.id === item.id ? { ...i, id: newId, _persisted: true } : i
          ),
        }));
      } catch (err) {
        setAllItems((prev: any) => ({
          ...prev,
          [roomUid]: (prev[roomUid] || []).filter((i: any) => i.id !== item.id),
        }));
        console.error('Failed to save BOQ item', err);
        setFeedback({ title: 'שגיאה בשמירה', message: 'לא הצלחנו לשמור את הפריט. בדוק חיבור לפרויקט.', type: 'error' });
        throw err;
      }
    }
  };
  const removeItem = (roomUid: string, itemId: string) => {
    // Find the item first so we can delete from DB if it was persisted
    const item = (allItems[roomUid] || []).find((i: any) => i.id === itemId);
    setAllItems((prev: any)=>({...prev,[roomUid]:(prev[roomUid]||[]).filter((i: any)=>i.id!==itemId)}));

    // If item has a DB id, delete it from DB (mutation also cleans up linked file)
    if (item?._persisted && projectId) {
      deleteBoqItemMutation({ itemId: itemId as any }).catch(console.error);
    }
  };

  const onFinish = async () => {
    if (!project) return;
    setSaving(true);
    try {
      // Only save items that are NOT already persisted (to avoid duplicates)
      const itemsToSave: any[] = [];
      Object.keys(allItems).forEach(ruid => {
        const room = rooms.find((r:any) => r.uid === ruid);
        allItems[ruid].forEach((item: any) => {
          if (item._persisted) return; // already in DB
          itemsToSave.push({
            roomId: getRoomDbId(room),
            category: item.cat,
            name: item.name,
            qty: item.qty,
            userQty: item.userQty,
            unit: item.unit,
            hint: item.hint,
            notes: item.notes,
          });
        });
      });

      if (itemsToSave.length > 0) {
        await saveBoqMutation({ projectId: (project as any)._id, items: itemsToSave });
      }
      setFeedback({ title: "נשמר בהצלחה", message: "הכמויות נשמרו בהצלחה!", type: "success", redirect: "/boq" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "שגיאה בשמירת הנתונים", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const closeFeedback = () => {
    const redirect = feedback?.redirect;
    setFeedback(null);
    if (redirect) window.location.href = redirect;
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const element = printRef.current;
      const opt = {
        margin: 0,
        filename: `BOQ_Summary_${project?.name || 'project'}.pdf`,
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

  if (roleLoading) return <AccessLoading />;
  if (!allowed) return <AccessDenied message="אשף הכמויות וניהול ה-BoQ מורשים ליזם ומנהל הפרויקט בלבד." />;

  if (!project) return <ScreenBoundary loading={loading} error={error} onRetry={refetch}><div/></ScreenBoundary>;

  if (view === 'summary') {
    const aggregated: Record<string, {name: string, cat: string, unit: string, total: number, rooms: {name: string, qty: number, notes?: string}[], notes: string[]}> = {};
    Object.keys(allItems).forEach(ruid => {
      const rName = rooms.find((r:any)=>r.uid===ruid)?.name || "חדר";
      allItems[ruid].forEach((item: any) => {
        // Skip locked rows that the user toggled off — they don't contribute
        // to the orderable totals.
        if (item.isLocked && item.isEnabled === false) return;
        // For locked rows the truth is `qty` (system-derived from sizeSqm /
        // userQty × waste). For user-added rows the editable value is `userQty`.
        const effectiveQty = item.isLocked ? Number(item.qty ?? 0) : Number(item.userQty ?? item.qty ?? 0);
        if (effectiveQty <= 0) return;
        const key = `${item.name}|${item.cat}|${item.unit}`;
        if (!aggregated[key]) {
          aggregated[key] = { name: item.name, cat: item.cat, unit: item.unit, total: 0, rooms: [], notes: [] };
        }
        aggregated[key].total += effectiveQty;
        const notes = String(item.notes ?? '').trim();
        aggregated[key].rooms.push({ name: rName, qty: effectiveQty, ...(notes ? { notes } : {}) });
        if (notes && !aggregated[key].notes.includes(notes)) {
          aggregated[key].notes.push(notes);
        }
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
              <Btn variant="ghost" onClick={handleExportPDF} disabled={exporting} style={{borderRadius:12,padding:"10px 20px",fontWeight:700,border:"1px solid var(--border)"}}>
                <Icon n={exporting ? "loader" : "download"} s={16} style={{marginLeft:8}}/> {exporting ? "מייצא..." : "ייצוא PDF"}
              </Btn>
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
                            {item.notes.length > 0 && (
                              <div style={{fontSize:11,color:"var(--text3)",marginTop:8,lineHeight:1.5}}>
                                הערות: {item.notes.join(' · ')}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          {feedback && (
            <FeedbackModal
              title={feedback.title}
              message={feedback.message}
              type={feedback.type}
              onClose={closeFeedback}
            />
          )}
          <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
            <BOQPrintTemplate
              ref={printRef}
              project={project as any}
              itemsGroupedByCategory={aggregated}
              rooms={rooms}
              title="ריכוז כמויות כולל (סיכום אשף)"
            />
          </div>
        </div>
      </ScreenBoundary>
    );
  }

  // Wizard View
  if (!currentRoom) {
    return (
      <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
        <div style={{ position: 'relative', zIndex: 1, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          <PageBackground image="/empty_states/boq.png" />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState 
              icon="alert-circle" 
              title="לא נמצאו חדרים בפרויקט" 
          description="אשף הכמויות מבוסס על החדרים שהוגדרו בפרויקט. כדי להתחיל, יש להגדיר קודם את מבנה הבית."
          action={
            <Btn onClick={() => window.location.href = '/setup'} style={{margin: "0 auto", padding: "12px 24px"}}>
              <Icon n="settings" s={18} /> מעבר להגדרות הבית
            </Btn>
          }
        />
          </div>
        </div>
      </ScreenBoundary>
    );
  }
  // Hide leftover locked wall-tile rows on non-wet rooms (legacy test data
   // from before the wet-only restriction). The row stays in DB but is not
   // shown so it doesn't look like a duplicate flooring entry.
  const isWetRoomCurrent = currentRoom?.type === 'bathroom' || currentRoom?.type === 'toilet';
  const items = (allItems[currentRoom?.uid] || []).filter((i: any) => {
    if (i.isLocked && i.cat === WALL_TILE_CATEGORY && !isWetRoomCurrent) return false;
    return true;
  });
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

            {/* Add Item button — always at top of items area */}
            <div style={{display:"flex",justifyContent:"flex-start"}}>
              <AddItemWidget
                roomUid={currentRoom.uid}
                roomType={currentRoom.type}
                existingItems={items}
                onAdd={item=>addItem(currentRoom.uid, item)}
                projectId={projectId as any}
                uploadProjectFile={uploadProjectFile}
              />
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {(cats as string[]).map(cat => (
                <div key={cat} className="card" style={{borderRadius:16,overflow:"hidden"}}>
                  <div style={{padding:"14px 20px",background:"var(--surface)",borderBottom:"1px solid var(--border)",fontSize:13,fontWeight:700,display:"flex",justifyContent:"space-between"}}>
                    <span>{cat}</span>
                    <span style={{fontWeight:400,color:"var(--text3)"}}>{items.filter((i:any)=>i.cat===cat).length} פריטים</span>
                  </div>
                  <div>
                    {items.filter((i: any)=>i.cat===cat).map((item: any)=>{
                      const locked = item.isLocked === true;
                      const enabled = item.isEnabled !== false;
                      const isWallTile = item.cat === WALL_TILE_CATEGORY;
                      const wastePct = (project as any)?.floorWastePct ?? DEFAULT_FLOOR_WASTE_PCT;
                      const roomSize = Number(currentRoom.size ?? currentRoom.sizeSqm ?? 0);
                      const dimmedStyle = locked && !enabled ? { opacity: 0.55 } : {};
                      return (
                      <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:16,padding:"16px 20px",borderBottom:"1px solid var(--border)", ...dimmedStyle}}>
                        {/* Thumbnail with edit affordance for locked rows */}
                        {locked ? (
                          <div style={{position:"relative",flexShrink:0}}>
                            {item.imageUrl ? (
                              <div
                                onClick={() => enabled && setLightboxUrl(item.imageUrl)}
                                style={{width:44,height:44,borderRadius:8,overflow:"hidden",border:"1px solid var(--border)",cursor:enabled?"zoom-in":"default",position:"relative"}}
                              >
                                <img src={item.imageUrl} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                                {item._imageUploading && (
                                  <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.42)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                    <Icon n="loader" s={16} c="#fff"/>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{width:44,height:44,borderRadius:8,background:"var(--surface)",display:"flex",alignItems:"center",justifyContent:"center",border:"1px dashed var(--border)"}}>
                                <Icon n="image" s={18} c="var(--text3)"/>
                              </div>
                            )}
                            {enabled && (
                              <label
                                title="העלה תמונה לפריט"
                                style={{position:"absolute",bottom:-4,insetInlineEnd:-4,width:20,height:20,borderRadius:"50%",background:"var(--accent)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 4px rgba(0,0,0,0.2)"}}
                              >
                                <Icon n="plus" s={11} c="#fff"/>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{display:"none"}}
                                  onChange={e => { void handleLockedImagePick(item.id, e.target.files?.[0] ?? null); e.target.value=""; }}
                                />
                              </label>
                            )}
                          </div>
                        ) : (
                          item.imageUrl ? (
                            <div
                              onClick={() => setLightboxUrl(item.imageUrl)}
                              style={{width:44,height:44,borderRadius:8,overflow:"hidden",flexShrink:0,border:"1px solid var(--border)",cursor:"zoom-in",transition:"opacity .15s"}}
                              onMouseEnter={e => (e.currentTarget.style.opacity="0.8")}
                              onMouseLeave={e => (e.currentTarget.style.opacity="1")}
                            >
                              <img src={item.imageUrl} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            </div>
                          ) : (
                            <div style={{width:44,height:44,borderRadius:8,background:"var(--surface)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid var(--border)"}}>
                              <Icon n="image" s={18} c="var(--text3)"/>
                            </div>
                          )
                        )}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{fontSize:15,fontWeight:600}}>{item.name}</div>
                            {locked && <Icon n="lock" s={12} c="var(--text3)"/>}
                          </div>
                          {locked ? (
                            <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>
                              {!enabled
                                ? (isWallTile ? 'לא נבחר חיפוי קירות בריצוף' : 'לא מרצפים את החדר')
                                : isWallTile
                                  ? `כמות נדרשת = השטח שבחרת × ${wastePct}% פחת`
                                  : `מחושב אוטומטית: ${roomSize} מ"ר × ${wastePct}% פחת`}
                            </div>
                          ) : item.hint && (
                            <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>{item.hint}</div>
                          )}
                          {locked && enabled && (
                            <div style={{marginTop:8}}>
                              <textarea
                                value={item.spec ?? ''}
                                placeholder="הוסף תיאור (יצרן, דגם, גוון…)"
                                onChange={e => handleLockedSpecChange(item.id, e.target.value)}
                                rows={2}
                                style={{width:"100%",resize:"vertical",fontFamily:"'Heebo',sans-serif",fontSize:13,padding:"6px 8px",border:"1px solid var(--border)",borderRadius:8,background:"#fff"}}
                              />
                              <div style={{fontSize:11,color:"var(--text3)",minHeight:13,marginTop:2}}>
                                {item._specSaving ? 'שומר…' : ''}
                              </div>
                            </div>
                          )}
                          {enabled && (
                            <div style={{marginTop:8}}>
                              <textarea
                                value={item.notes ?? ''}
                                placeholder="הערות לפריט (יישמרו להמשך)"
                                onChange={e => handleItemNotesChange(item.id, e.target.value)}
                                rows={2}
                                style={{width:"100%",resize:"vertical",fontFamily:"'Heebo',sans-serif",fontSize:13,padding:"6px 8px",border:"1px solid var(--border)",borderRadius:8,background:"#fff"}}
                              />
                              <div style={{fontSize:11,color:"var(--text3)",minHeight:13,marginTop:2}}>
                                {item._notesSaving ? 'שומר הערות…' : ''}
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          {locked ? (
                            <>
                              {/* Toggle on/off */}
                              <button
                                type="button"
                                onClick={() => void handleLockedToggle(item)}
                                title={enabled ? 'בטל בחירה' : 'הוסף לכמויות'}
                                style={{
                                  display:"flex",alignItems:"center",gap:6,
                                  background: enabled ? 'var(--accent-light)' : 'var(--surface)',
                                  color: enabled ? 'var(--accent)' : 'var(--text2)',
                                  border:`1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
                                  padding:"6px 10px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:700,
                                }}
                              >
                                {enabled ? '✓ מרצפים' : 'לא מרצפים'}
                              </button>
                              {/* Wall: user enters base m²; floor: just shows derived qty */}
                              {enabled && isWallTile && (
                                <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg)",borderRadius:10,padding:"4px 8px",border:"1px solid var(--border)"}}>
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.userQty ?? 0}
                                    onChange={e => handleWallUserQty(item, e.target.value)}
                                    style={{width:60,textAlign:"center",background:"transparent",border:"none",fontWeight:700,fontSize:15}}
                                  />
                                  <span style={{fontSize:12,color:"var(--text3)"}}>מ&quot;ר נטו</span>
                                </div>
                              )}
                              {enabled && (
                                <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg)",borderRadius:10,padding:"6px 12px",border:"1px solid var(--border)"}} title="כמות להזמנה (כולל פחת)">
                                  <span style={{fontWeight:700,fontSize:16}}>{item.qty}</span>
                                  <span style={{fontSize:13,color:"var(--text3)"}}>{item.unit}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div style={{display:"flex",alignItems:"center",background:"var(--bg)",borderRadius:10,padding:4,border:"1px solid var(--border)"}}>
                                <button onClick={()=>setQty(currentRoom.uid,item.id,item.userQty-1)} style={{width:32,height:32,borderRadius:8,border:"none",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 2px rgba(0,0,0,0.05)"}}><Icon n="minus" s={14}/></button>
                                <input type="number" value={item.userQty} onChange={e=>setQty(currentRoom.uid,item.id,e.target.value)} style={{width:50,textAlign:"center",background:"transparent",border:"none",fontWeight:700,fontSize:16}}/>
                                <button onClick={()=>setQty(currentRoom.uid,item.id,item.userQty+1)} style={{width:32,height:32,borderRadius:8,border:"none",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 2px rgba(0,0,0,0.05)"}}><Icon n="plus" s={14}/></button>
                              </div>
                              <span style={{fontSize:14,color:"var(--text3)",width:30}}>{item.unit}</span>
                              <button onClick={()=>removeItem(currentRoom.uid,item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#DDD",transition:"color .2s"}} onMouseEnter={e=>e.currentTarget.style.color="var(--danger)"} onMouseLeave={e=>e.currentTarget.style.color="#DDD"}><Icon n="x" s={18}/></button>
                            </>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
        {feedback && (
          <FeedbackModal
            title={feedback.title}
            message={feedback.message}
            type={feedback.type}
            onClose={closeFeedback}
          />
        )}

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            onClick={() => setLightboxUrl(null)}
            style={{
              position:"fixed", inset:0, zIndex:300,
              background:"rgba(0,0,0,0.88)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"zoom-out",
            }}
          >
            <button
              onClick={() => setLightboxUrl(null)}
              style={{
                position:"absolute", top:20, left:20,
                background:"rgba(255,255,255,0.12)", border:"none",
                borderRadius:"50%", width:40, height:40,
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", color:"#fff",
              }}
            >
              <Icon n="x" s={20} c="#fff"/>
            </button>
            <img
              src={lightboxUrl}
              alt=""
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth:"90vw", maxHeight:"88vh",
                borderRadius:16,
                boxShadow:"0 32px 80px rgba(0,0,0,0.5)",
                objectFit:"contain",
                cursor:"default",
              }}
            />
          </div>
        )}
      </div>
    </ScreenBoundary>
  );
};
