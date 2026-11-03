import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from '@tanstack/react-router';
import { Icon, Btn, ProgressBar, FeedbackModal, EmptyState, PageBackground } from '../components/Shared';
import { FeatureTeaser } from '../components/FeatureTeaser';
import { BOQWizardPreview } from '../components/teaser/previews/BOQWizardPreview';
import {
  DEFAULT_FLOOR_WASTE_PCT,
  FLOOR_CATEGORY,
  FLOOR_NAME,
  FLOOR_UNIT,
  WALL_TILE_CATEGORY,
  WALL_TILE_NAME,
  WALL_TILE_UNIT,
  applyWaste,
  aggregateWizardItems,
} from '../utils/boqCalculations';
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
import { getCatalogForRoom, getAllCatalogItems, adaptCategoryForRoom, getCategoriesForRoomType, getAllBoqCatalogCategories } from '../data/boqCatalog';
import { useRequireRole } from '../hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';
import type { Id } from '../../convex/_generated/dataModel';
import { useSubscription } from '../hooks/useSubscription';
import { getFloorLabel } from './ProjectSetupScreen';

// ── CONSTANTS & CATALOG ───────────────────────────────────────────────────────

// Locked-flooring constants & waste helpers are imported from ../utils/boqCalculations.

// Smart-suggestion auto-population was removed — new rooms start empty
// (only the locked flooring/wall-tile rows appear, see ensureLockedRows).
// The catalog (`ItemDialog`) is still available for the user to add items
// manually.

const getRoomDbId = (room: any) => room?._id ?? room?.uid;

// Module-level guard so concurrent component instances (e.g. during route
// transition animations) never run duplicate cleanup/update mutations.
const globalEnsuredLockedKeys = new Set<string>();

type SmartRowTemplate = {
  key: string;
  label: string;
  name: string;
  category: string;
  unit: string;
  baseQty: number;
  usesWaste: boolean;
};

const getQuickAddButtonsForRoom = (room: any, project: any): SmartRowTemplate[] => {
  if (!room) return [];
  const sizeSqm = Number(room.size ?? room.sizeSqm ?? 0);

  if (room.type === 'yard') {
    const paved = Number(project?.yardPavedArea || sizeSqm || 0);
    const garden = Number(project?.yardGardenArea || sizeSqm || 0);
    return [
      {
        key: 'yard_floor',
        label: 'הוסף ריצוף חוץ',
        name: 'ריצוף חוץ',
        category: 'ריצוף וחיפוי',
        unit: 'מ"ר',
        baseQty: paved,
        usesWaste: true,
      },
      {
        key: 'yard_garden',
        label: 'הוסף גינון ופיתוח',
        name: 'גינון ופיתוח (דשא/שתילה)',
        category: 'גינון ופיתוח שטח',
        unit: 'מ"ר',
        baseQty: garden,
        usesWaste: false,
      },
    ];
  }

  if (room.type === 'pool') {
    const poolType = project?.poolType || 'built';
    if (poolType === 'built') {
      return [
        {
          key: 'pool_mosaic',
          label: 'הוסף חיפוי פסיפס',
          name: 'חיפוי פסיפס / קרמיקה לבריכה',
          category: "בריכות וג'קוזי",
          unit: 'מ"ר',
          baseQty: sizeSqm,
          usesWaste: true,
        },
      ];
    }
    return [
      {
        key: 'pool_prefab',
        label: 'הוסף בריכה מתועשת',
        name: 'בריכה מתועשת קומפלט',
        category: "בריכות וג'קוזי",
        unit: "יח'",
        baseQty: 1,
        usesWaste: false,
      },
    ];
  }

  if (room.type === 'bathroom' || room.type === 'toilet') {
    return [
      {
        key: 'room_floor',
        label: 'הוסף ריצוף',
        name: FLOOR_NAME,
        category: FLOOR_CATEGORY,
        unit: FLOOR_UNIT,
        baseQty: sizeSqm,
        usesWaste: true,
      },
      {
        key: 'wet_wall_tile',
        label: 'הוסף חיפוי קירות',
        name: WALL_TILE_NAME,
        category: WALL_TILE_CATEGORY,
        unit: WALL_TILE_UNIT,
        baseQty: Math.round(sizeSqm * 2),
        usesWaste: true,
      },
    ];
  }

  return [
    {
      key: 'room_floor',
      label: 'הוסף ריצוף',
      name: FLOOR_NAME,
      category: FLOOR_CATEGORY,
      unit: FLOOR_UNIT,
      baseQty: sizeSqm,
      usesWaste: true,
    },
  ];
};

const isLegacyAutoDuplicate = (item: any, firstItem: any) => {
  if (!item || !firstItem) return false;
  if (item.source === 'manual' || item.userQty !== undefined) return false;
  if (item.paid || item.spec || item.notes || item.imageUrl || item.projectFileId) return false;
  const t1 = Number(firstItem._creationTime ?? 0);
  const t2 = Number(item._creationTime ?? 0);
  if (t1 > 0 && t2 > 0 && Math.abs(t2 - t1) > 5000) return false;
  return true;
};

type ItemDialogState = { mode: 'add' } | { mode: 'edit'; roomUid: string; item: any } | null;

const UNIT_OPTIONS = ["יח'", "מ'", 'מ"ר', "קומפ'", "ק\"ג", "סט"];

const ItemDialog = ({
  dialog, onClose, roomType, existingItems, projectItems, projectCategories, onAdd, onEdit, projectId, uploadProjectFile, globalCategories
}: {
  dialog: ItemDialogState;
  onClose: () => void;
  roomType: string;
  existingItems: any[];
  projectItems: any[];
  projectCategories: string[];
  onAdd: (item: any) => Promise<void>;
  onEdit: (roomUid: string, itemId: string, patch: any) => Promise<void>;
  projectId: Id<'projects'> | null;
  uploadProjectFile: any;
  globalCategories: string[];
}) => {
  const [picked, setPicked] = React.useState(false);
  const [pendingItem, setPendingItem] = React.useState<any>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [savingItem, setSavingItem] = React.useState(false);
  const [imageUploadError, setImageUploadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [catDropdownOpen, setCatDropdownOpen] = React.useState(false);

  const standardCategoriesSet = React.useMemo(() => {
    return new Set(getAllBoqCatalogCategories());
  }, []);

  // Compute recommended category if the typed/chosen item name matches a catalog item
  const recommendedCategory = React.useMemo(() => {
    const itemRaw = (pendingItem?.name || '').trim();
    if (!itemRaw) return null;
    const itemNorm = normHebrew(itemRaw);
    const roomCatalog = getCatalogForRoom(roomType);
    const allItemsList = getAllCatalogItems();
    const match = roomCatalog.find(c => norm(c.name) === norm(itemRaw) || normHebrew(c.name) === itemNorm)
      || allItemsList.find(c => norm(c.name) === norm(itemRaw) || normHebrew(c.name) === itemNorm);
    if (!match) return null;
    return adaptCategoryForRoom({ name: match.name, cat: match.cat }, roomType);
  }, [pendingItem?.name, roomType]);

  const allUniqueCategories = React.useMemo(() => {
    return Array.from(new Set([...projectCategories, ...getCategoriesForRoomType(roomType), ...globalCategories]));
  }, [projectCategories, roomType, globalCategories]);

  const filteredCategoryOptions = React.useMemo(() => {
    const q = (pendingItem?.cat || '').trim().toLowerCase();
    if (!q) return allUniqueCategories;
    return allUniqueCategories.filter(c => c.toLowerCase().includes(q));
  }, [allUniqueCategories, pendingItem?.cat]);

  const filteredCategoryChips = React.useMemo(() => {
    const q = (pendingItem?.cat || '').trim().toLowerCase();
    if (!q) return allUniqueCategories.slice(0, 16);
    return allUniqueCategories.filter(c => c.toLowerCase().includes(q)).slice(0, 16);
  }, [allUniqueCategories, pendingItem?.cat]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const imgInputRef = React.useRef<HTMLInputElement>(null);

  const isEdit = dialog?.mode === 'edit';

  // Reset / hydrate every time the dialog opens or switches target.
  React.useEffect(() => {
    setPicked(false);
    setImageUploadError(null);
    setFormError(null);
    setSavingItem(false);
    if (dialog?.mode === 'edit') {
      const it = dialog.item;
      setPendingItem({
        id: it.id, cat: it.cat ?? '', name: it.name ?? '', qty: it.userQty ?? it.qty ?? 1,
        unit: it.unit || "יח'", notes: it.notes ?? '', imageUrl: it.imageUrl ?? null,
        projectFileId: it.projectFileId,
      });
      setImagePreview(it.imageUrl ?? null);
    } else {
      setImagePreview(null);
      if (dialog) {
        setPendingItem({ id: `cat_${Date.now()}`, cat: '', name: '', qty: 1, unit: "יח'", notes: '', imageUrl: null });
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setPendingItem(null);
      }
    }
  }, [dialog]);

  // Normalize Hebrew spelling variants (e.g. טלויזיה <-> טלוויזיה, כסא <-> כיסא)
  const normHebrew = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/וו/g, 'ו')
      .replace(/יי/g, 'י')
      .replace(/כיסא/g, 'כסא')
      .replace(/כיסאות/g, 'כסאות');

  const norm = (s: string) => s.trim().toLowerCase();
  const existingNames = existingItems.map(i => norm(i.name));
  const suggestions = React.useMemo(() => {
    const qRaw = String(pendingItem?.name ?? '').trim();
    if (isEdit || picked || !qRaw) return [] as any[];
    const qNorm = normHebrew(qRaw);
    const roomCatalog = getCatalogForRoom(roomType);
    const seen = new Set<string>();
    const out: any[] = [];
    // Room-specific first, then every other catalog item, then free items typed elsewhere in the project.
    for (const c of [...roomCatalog, ...getAllCatalogItems(), ...projectItems]) {
      const key = norm(c.name);
      const cNorm = normHebrew(c.name);
      const isMatch = c.name.toLowerCase().includes(qRaw.toLowerCase()) || cNorm.includes(qNorm);
      if (seen.has(key) || !isMatch) continue;
      seen.add(key);
      out.push(c);
      if (out.length >= 10) break;
    }
    return out;
  }, [pendingItem?.name, picked, isEdit, roomType, projectItems]);

  const selectItem = (item: any) => {
    setPicked(true);
    setPendingItem((p: any) => ({
      ...p,
      name: item.name,
      cat: adaptCategoryForRoom({ name: item.name, cat: item.cat || '' }, roomType),
      qty: item.qty ?? 1,
      unit: item.unit || "יח'",
    }));
  };

  const handleImagePick = async (file: File | null) => {
    if (!file) return;
    setImageUploadError(null);
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
      setPendingItem((prev: any) => prev ? {...prev, imageUrl: localUrl, projectFileId: uploaded.fileId} : prev);
    } catch {
      setPendingItem((prev: any) => prev ? {...prev, imageUrl: null, projectFileId: undefined} : prev);
      setImageUploadError("העלאת התמונה נכשלה. נסה שוב או הסר את התמונה לפני השמירה.");
    } finally {
      setUploading(false);
    }
  };

  const confirm = async () => {
    if (!pendingItem || !dialog) return;
    const name = String(pendingItem.name || '').trim();
    if (!name) { setFormError('יש להזין שם פריט'); return; }
    const qty = Math.max(0, Number(pendingItem.qty) || 0);
    const payload = {
      ...pendingItem, name, qty, userQty: qty,
      cat: pendingItem.cat?.trim() || 'כללי',
      unit: pendingItem.unit?.trim() || "יח'",
    };
    setSavingItem(true);
    try {
      if (dialog.mode === 'edit') await onEdit(dialog.roomUid, dialog.item.id, payload);
      else await onAdd(payload);
      onClose();
    } catch {
      /* the screen already surfaces an error modal */
    } finally {
      setSavingItem(false);
    }
  };

  if (!dialog) return null;
  const busy = uploading || savingItem;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center" }}
    >
      <div style={{
        background:"var(--surface)", borderRadius:20, width:480, maxWidth:"94vw", maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 24px 64px rgba(0,0,0,0.2)", padding:28, display:"flex", flexDirection:"column", gap:16,
      }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span style={{fontWeight:800, fontSize:17}}>
            {isEdit ? "עריכת פריט" : "הוספת פריט לחדר"}
          </span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)"}}>
            <Icon n="x" s={18}/>
          </button>
        </div>

        {pendingItem && (
          <>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:13,fontWeight:600,color:"var(--text2)"}}>שם פריט *</label>
              <input
                ref={inputRef}
                className="bp-input"
                value={pendingItem.name}
                onChange={e => { setPicked(false); setPendingItem((p:any) => ({...p, name: e.target.value})); }}
                placeholder={isEdit ? "" : "הקלד שם פריט או חפש בקטלוג..."}
                style={{fontSize:14}}
              />
              {suggestions.length > 0 && (
                <div style={{maxHeight:200, overflowY:"auto", border:"1px solid var(--border)", borderRadius:10}}>
                  {suggestions.map((sg, i) => {
                    const alreadyInRoom = existingNames.includes(norm(sg.name));
                    return (
                      <div
                        key={i}
                        onClick={() => selectItem(sg)}
                        style={{padding:"9px 14px",cursor:"pointer",fontSize:14,borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}
                        onMouseEnter={e => (e.currentTarget.style.background="var(--accent-light)")}
                        onMouseLeave={e => (e.currentTarget.style.background="transparent")}
                      >
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontWeight:600}}>{sg.name}</span>
                          {alreadyInRoom && (
                            <span style={{fontSize:11,color:"var(--accent)",background:"var(--accent-light)",borderRadius:6,padding:"1px 6px",fontWeight:700}}>כבר בחדר</span>
                          )}
                        </div>
                        <span style={{fontSize:12,color:"var(--text3)",background:"var(--border)",borderRadius:6,padding:"2px 8px"}}>{adaptCategoryForRoom({ name: sg.name, cat: sg.cat }, roomType)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,position:"relative"}}>
              <label style={{fontSize:13,fontWeight:600,color:"var(--text2)"}}>קטגוריה</label>
              <div style={{position:"relative"}}>
                <input
                  className="bp-input"
                  value={pendingItem.cat}
                  onChange={e => {
                    setCatDropdownOpen(true);
                    setPendingItem((p:any) => ({...p, cat: e.target.value}));
                  }}
                  onFocus={() => setCatDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setCatDropdownOpen(false), 200)}
                  placeholder="בחר או הקלד קטגוריה..."
                  style={{fontSize:14,width:"100%"}}
                />
                {catDropdownOpen && (
                  <div
                    style={{
                      position:"absolute",
                      top:"calc(100% + 4px)",
                      right:0,
                      left:0,
                      zIndex:50,
                      background:"var(--surface)",
                      border:"1px solid var(--border)",
                      borderRadius:10,
                      boxShadow:"var(--shadow-lg)",
                      maxHeight:220,
                      overflowY:"auto",
                    }}
                  >
                    {filteredCategoryOptions.map(option => (
                      <div
                        key={option}
                        onMouseDown={e => {
                          e.preventDefault();
                          setPendingItem((p:any) => ({...p, cat: option}));
                          setCatDropdownOpen(false);
                        }}
                        style={{
                          padding:"9px 12px",
                          fontSize:13,
                          cursor:"pointer",
                          borderBottom:"1px solid var(--border)",
                          background: pendingItem.cat === option ? "var(--accent-light)" : "transparent",
                          color: pendingItem.cat === option ? "var(--accent)" : "var(--text1)",
                          fontWeight: pendingItem.cat === option ? 700 : 500,
                          display:"flex",
                          justifyContent:"space-between",
                          alignItems:"center",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-light)")}
                        onMouseLeave={e => (e.currentTarget.style.background = pendingItem.cat === option ? "var(--accent-light)" : "transparent")}
                      >
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span>{option}</span>
                          {!standardCategoriesSet.has(option) && (
                            <span style={{fontSize:10,fontWeight:700,background:"var(--accent-light)",color:"var(--accent)",padding:"1px 6px",borderRadius:4}}>מותאמת אישית</span>
                          )}
                        </div>
                        {recommendedCategory === option ? (
                          <span style={{fontSize:11,fontWeight:700,color:"var(--success)",display:"flex",alignItems:"center",gap:3}}>💡 מומלץ לפריט</span>
                        ) : projectCategories.includes(option) ? (
                          <span style={{fontSize:11,color:"var(--text3)"}}>בשימוש בפרויקט</span>
                        ) : null}
                      </div>
                    ))}
                    {pendingItem.cat.trim() && !allUniqueCategories.some(c => c.toLowerCase() === pendingItem.cat.trim().toLowerCase()) && (
                      <div
                        onMouseDown={e => {
                          e.preventDefault();
                          setCatDropdownOpen(false);
                        }}
                        style={{
                          padding:"10px 12px",
                          fontSize:13,
                          fontWeight:700,
                          color:"var(--accent)",
                          cursor:"pointer",
                          background:"var(--accent-light)",
                        }}
                      >
                        + שימוש בקטגוריה חדשה: "{pendingItem.cat.trim()}"
                      </div>
                    )}
                    {filteredCategoryOptions.length === 0 && !pendingItem.cat.trim() && (
                      <div style={{padding:"10px 12px",fontSize:13,color:"var(--text3)"}}>אין קטגוריות להצגה</div>
                    )}
                  </div>
                )}
              </div>
              {/* Recommended category chip if available for this item */}
              {recommendedCategory && (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,background:"var(--surface-2)",border:"1px dashed var(--border)",marginTop:2}}>
                  <span style={{fontSize:12,color:"var(--text2)",fontWeight:600}}>💡 המלצה לפריט זה:</span>
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      setPendingItem((p:any) => ({...p, cat: recommendedCategory}));
                    }}
                    style={{
                      fontSize:12,
                      padding:"2px 10px",
                      borderRadius:999,
                      cursor:"pointer",
                      fontWeight:700,
                      border:`1.5px solid ${pendingItem.cat === recommendedCategory ? "var(--accent)" : "var(--accent)"}`,
                      background: pendingItem.cat === recommendedCategory ? "var(--accent)" : "var(--accent-light)",
                      color: pendingItem.cat === recommendedCategory ? "#fff" : "var(--accent)",
                      transition:"all .15s",
                    }}
                  >
                    {recommendedCategory} {pendingItem.cat === recommendedCategory ? '✓' : '+ בחר'}
                  </button>
                </div>
              )}

              {filteredCategoryChips.length > 0 && (
                <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:80,overflowY:"auto",marginTop:4}}>
                  {filteredCategoryChips.map(c => {
                    const isCustom = !standardCategoriesSet.has(c);
                    const isSelected = pendingItem.cat === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          setPendingItem((p:any) => ({...p, cat: c}));
                        }}
                        style={{
                          fontSize:12,
                          padding:"3px 10px",
                          borderRadius:999,
                          cursor:"pointer",
                          fontWeight:600,
                          border:`1px solid ${isSelected ? "var(--accent)" : isCustom ? "color-mix(in srgb, var(--accent) 40%, var(--border))" : "var(--border)"}`,
                          background: isSelected ? "var(--accent-light)" : isCustom ? "rgba(234,88,12,0.04)" : "var(--surface)",
                          color: isSelected ? "var(--accent)" : isCustom ? "var(--accent-text, var(--text1))" : "var(--text2)",
                          transition:"all .15s",
                          display:"inline-flex",
                          alignItems:"center",
                          gap:4,
                        }}
                      >
                        {isCustom && <span style={{fontSize:9,opacity:0.8}}>★</span>}
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:10}}>
              <div style={{display:"flex",flexDirection:"column",gap:6,flex:1}}>
                <label style={{fontSize:13,fontWeight:600,color:"var(--text2)"}}>כמות</label>
                <input
                  className="bp-input"
                  type="number"
                  min={0}
                  value={pendingItem.qty}
                  onChange={e => setPendingItem((p:any) => ({...p, qty: e.target.value}))}
                  style={{fontSize:14}}
                />
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,flex:1}}>
                <label style={{fontSize:13,fontWeight:600,color:"var(--text2)"}}>יחידה</label>
                <input
                  className="bp-input"
                  value={pendingItem.unit}
                  onChange={e => setPendingItem((p:any) => ({...p, unit: e.target.value}))}
                  list="boq-units"
                  style={{fontSize:14}}
                />
                <datalist id="boq-units">
                  {UNIT_OPTIONS.map(u => <option key={u} value={u} />)}
                </datalist>
              </div>
            </div>
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
              <div style={{fontSize:12,color:"var(--danger)",lineHeight:1.5}}>{imageUploadError}</div>
            )}
            <textarea
              value={pendingItem.notes ?? ''}
              placeholder="הערות לפריט (אופציונלי)"
              onChange={e => setPendingItem((prev: any) => prev ? { ...prev, notes: e.target.value } : prev)}
              rows={3}
              style={{width:"100%",resize:"vertical",fontFamily:"'Heebo',sans-serif",fontSize:13,padding:"8px 10px",border:"1px solid var(--border)",borderRadius:10,background:"var(--surface)",color:"var(--text1)"}}
            />
            {formError && <div style={{fontSize:12,color:"var(--danger)",fontWeight:600}}>{formError}</div>}
            <div style={{display:"flex",gap:10}}>
              <button
                onClick={onClose}
                style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",fontSize:14,fontWeight:600,color:"var(--text2)"}}
              >
                ביטול
              </button>
              <button
                onClick={confirm}
                disabled={busy || !!imageUploadError}
                style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:"var(--accent)",color:"#fff",cursor:(busy || imageUploadError)?"wait":"pointer",fontSize:14,fontWeight:700,opacity:(busy || imageUploadError)?0.7:1}}
              >
                {uploading ? "מעלה תמונה..." : savingItem ? "שומר..." : isEdit ? "שמור שינויים" : "הוסף פריט"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const CopyFromRoomDialog = ({
  open, onClose, rooms, currentRoom, allItems, onCopy
}: {
  open: boolean;
  onClose: () => void;
  rooms: any[];
  currentRoom: any;
  allItems: Record<string, any[]>;
  onCopy: (items: any[]) => Promise<void>;
}) => {
  const norm = (s: string) => s.trim().toLowerCase();
  const copyable = (uid: string) => (allItems[uid] || []).filter((i: any) => i.isLocked !== true);
  const sourceRooms = rooms.filter(r => r.uid !== currentRoom?.uid && copyable(r.uid).length > 0);

  const [sourceUid, setSourceUid] = React.useState("");
  const [sel, setSel] = React.useState<Record<string, { checked: boolean; qty: number | string }>>({});
  const [saving, setSaving] = React.useState(false);

  const targetNames = React.useMemo(
    () => new Set((allItems[currentRoom?.uid] || []).map((i: any) => norm(i.name))),
    [allItems, currentRoom?.uid]
  );

  // Pick a default source when opened: same room type first.
  React.useEffect(() => {
    if (!open) return;
    const same = sourceRooms.find(r => r.type === currentRoom?.type);
    setSourceUid((same ?? sourceRooms[0])?.uid ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentRoom?.uid]);

  React.useEffect(() => {
    if (!open || !sourceUid) { setSel({}); return; }
    const next: Record<string, { checked: boolean; qty: number | string }> = {};
    copyable(sourceUid).forEach((i: any) => {
      next[i.id] = { checked: !targetNames.has(norm(i.name)), qty: i.userQty ?? i.qty ?? 1 };
    });
    setSel(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceUid]);

  if (!open) return null;
  const sourceItems = sourceUid ? copyable(sourceUid) : [];
  const selectedCount = sourceItems.filter(i => sel[i.id]?.checked).length;
  const setAll = (checked: boolean) =>
    setSel(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, checked }])));

  const doCopy = async () => {
    const chosen = sourceItems.filter(i => sel[i.id]?.checked).map(i => ({
      cat: i.cat, name: i.name, unit: i.unit, notes: i.notes ?? '',
      qty: Math.max(0, Number(sel[i.id].qty) || 0),
    }));
    if (!chosen.length) return;
    setSaving(true);
    try { await onCopy(chosen); onClose(); } finally { setSaving(false); }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center" }}
    >
      <div style={{ background:"var(--surface)", borderRadius:20, width:560, maxWidth:"94vw", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.2)", padding:28, gap:14 }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span style={{fontWeight:800, fontSize:17}}>העתקה מחדר אחר ← {currentRoom?.name}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)"}}><Icon n="x" s={18}/></button>
        </div>
        {sourceRooms.length === 0 ? (
          <div style={{padding:"24px 0",textAlign:"center",color:"var(--text3)",fontSize:14}}>
            אין עדיין חדרים אחרים עם פריטים להעתקה.
          </div>
        ) : (
          <>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:600,color:"var(--text2)"}}>העתק מ:</span>
              <select className="bp-input" value={sourceUid} onChange={e => setSourceUid(e.target.value)} style={{width:"auto",minWidth:200}}>
                {sourceRooms.map(r => <option key={r.uid} value={r.uid}>{r.name}</option>)}
              </select>
              <button onClick={() => setAll(true)} style={{background:"none",border:"none",color:"var(--accent)",cursor:"pointer",fontSize:13,fontWeight:700}}>בחר הכל</button>
              <button onClick={() => setAll(false)} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:13,fontWeight:700}}>נקה</button>
            </div>
            <div style={{overflowY:"auto",border:"1px solid var(--border)",borderRadius:10,flex:1,minHeight:120}}>
              {sourceItems.map(i => {
                const s = sel[i.id];
                const exists = targetNames.has(norm(i.name));
                return (
                  <div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderBottom:"1px solid var(--border)",opacity:s?.checked ? 1 : 0.6}}>
                    <input
                      type="checkbox"
                      checked={!!s?.checked}
                      onChange={e => setSel(prev => ({...prev, [i.id]: {...prev[i.id], checked: e.target.checked}}))}
                    />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600}}>
                        {i.name}
                        {exists && <span style={{marginInlineStart:8,fontSize:11,color:"var(--accent)",background:"var(--accent-light)",borderRadius:6,padding:"1px 6px",fontWeight:700}}>כבר בחדר</span>}
                      </div>
                      <div style={{fontSize:11,color:"var(--text3)"}}>{i.cat}</div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      className="bp-input"
                      value={s?.qty ?? 1}
                      onChange={e => setSel(prev => ({...prev, [i.id]: {...prev[i.id], qty: e.target.value}}))}
                      style={{width:70,textAlign:"center"}}
                    />
                    <span style={{fontSize:12,color:"var(--text3)",width:36}}>{i.unit}</span>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",fontSize:14,fontWeight:600,color:"var(--text2)"}}>ביטול</button>
              <button
                onClick={doCopy}
                disabled={saving || selectedCount === 0}
                style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:"var(--accent)",color:"#fff",cursor:saving?"wait":"pointer",fontSize:14,fontWeight:700,opacity:(saving || selectedCount === 0)?0.6:1}}
              >
                {saving ? "מעתיק..." : `העתק ${selectedCount} פריטים`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── BOQ WIZARD SCREEN ───────────────────────────────────────────────────────
function MagicActionsWidget({
  step,
  onAutoFillCurrent,
  onResetCurrent,
  onAutoFillAll,
  onResetAll
}: {
  step: number;
  onAutoFillCurrent: () => void;
  onResetCurrent: () => void;
  onAutoFillAll: () => void;
  onResetAll: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 18px", borderRadius: 10,
          border: "1.5px solid var(--accent)",
          background: open ? "var(--accent-light)" : "transparent", color: "var(--accent)",
          fontWeight: 700, fontSize: 14, cursor: "pointer",
          transition: "all 0.2s"
        }}
      >
        <Icon n="wand" s={15} /> 
        {!isMobile && <span>פעולות תבנית</span>}
      </button>
      
      <AnimatePresence>
        {open && (
          <>
            <div style={{position: 'fixed', inset: 0, zIndex: 90}} onClick={() => setOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                background: 'var(--surface)', borderRadius: 12,
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid var(--border)',
                zIndex: 100, minWidth: 220, overflow: 'hidden',
                display: 'flex', flexDirection: 'column'
              }}
            >
              <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                חדר נוכחי
              </div>
              <button 
                onClick={() => { setOpen(false); onAutoFillCurrent(); }} 
                style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, 
                  border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'right', 
                  fontSize: 14, fontWeight: 600, color: 'var(--text1)'
                }}
              >
                <div style={{width: 24, height: 24, borderRadius: 6, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon n="wand" s={14} /> 
                </div>
                מלא חדר זה מתבנית
              </button>
              <button 
                onClick={() => { setOpen(false); onResetCurrent(); }} 
                style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, 
                  border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'right', 
                  fontSize: 14, fontWeight: 600, color: 'var(--text1)'
                }}
              >
                <div style={{width: 24, height: 24, borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon n="trash" s={14} /> 
                </div>
                אפס חדר זה
              </button>
              
              {step === 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    כל הפרויקט
                  </div>
                  <button 
                    onClick={() => { setOpen(false); onAutoFillAll(); }} 
                    style={{
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, 
                      border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'right', 
                      fontSize: 14, fontWeight: 600, color: 'var(--text1)'
                    }}
                  >
                    <div style={{width: 24, height: 24, borderRadius: 6, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <Icon n="star" s={14} /> 
                    </div>
                    מלא הכל מתבניות
                  </button>
                  <button 
                    onClick={() => { setOpen(false); onResetAll(); }} 
                    style={{
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, 
                      border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'right', 
                      fontSize: 14, fontWeight: 600, color: 'var(--text1)'
                    }}
                  >
                    <div style={{width: 24, height: 24, borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <Icon n="alert" s={14} /> 
                    </div>
                    אפס את כל הפרויקט
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


export const BOQWizardScreen = () => {
  const navigate = useNavigate();
  const { isProOrPremium, isLoaded: subscriptionLoaded } = useSubscription();
  const { allowed, loading: roleLoading } = useRequireRole(['owner', 'manager']);
  const { projectId } = useCurrentProject();
  const dbProject = useQuery(api.projects.getWithDetails, projectId && allowed ? { projectId } : "skip");
  const { data: project, loading, error, refetch } = useDataSource<Project>('project', { db: dbProject as any });
  const { mutate } = useDataMutation('boq');
  const uploadProjectFile = useProjectFileUploader();
  const addBoqItemMutation = useMutation(api.mutations.addBoqItem);
  const addBoqItemsBatchMutation = useMutation(api.mutations.addBoqItemsBatch);
  const saveBoqMutation = useMutation(api.mutations.saveBoq);
  const deleteBoqItemMutation = useMutation(api.mutations.deleteBoqItem);
  const deleteBoqItemsBatchMutation = useMutation(api.mutations.deleteBoqItemsBatch);
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
  const [autoFillModal, setAutoFillModal] = React.useState<{ open: boolean; scope: 'all' | 'current' }>({ open: false, scope: 'all' });
  const [resetModal, setResetModal] = React.useState<{ open: boolean; scope: 'all' | 'current' }>({ open: false, scope: 'all' });
  const [isAutoFilling, setIsAutoFilling] = React.useState(false);
  const [itemDialog, setItemDialog] = React.useState<ItemDialogState>(null);
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [importNotes, setImportNotes] = React.useState('');

  // Track which rooms have been initialised so we don't overwrite local state on re-render
  const [initialised, setInitialised] = React.useState(false);

  const globalCategories = React.useMemo(() => {
    const cats = new Set<string>();
    const defaults = ["ריצוף וחיפוי", "חשמל", "אינסטלציה וסניטריה", "צבע ושפכטל", "נגרות ומטבחים", "אלומיניום וחלונות", "מיזוג אוויר", "דלתות", "כללי"];
    defaults.forEach(c => cats.add(c));
    Object.values(allItems).flat().forEach((i: any) => {
      if (i.cat) cats.add(i.cat);
    });
    return Array.from(cats);
  }, [allItems]);

  // Categories already used in this project (incl. custom ones), shown first as chips.
  const projectCategories = React.useMemo(() => {
    const set = new Set<string>();
    Object.values(allItems).flat().forEach((i: any) => { if (i.cat && i.isLocked !== true) set.add(i.cat); });
    return Array.from(set);
  }, [allItems]);

  // Free-text items already used anywhere in the project, offered as autocomplete suggestions.
  const projectItems = React.useMemo(() => {
    const seen = new Set<string>();
    const out: any[] = [];
    Object.values(allItems).flat().forEach((i: any) => {
      if (i.isLocked === true || !i.name) return;
      const key = String(i.name).trim().toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ name: i.name, cat: i.cat, unit: i.unit, qty: i.userQty ?? i.qty ?? 1 });
    });
    return out;
  }, [allItems]);

  React.useEffect(() => {
    if (!project || !(project as any).rooms) return;
    if (initialised) return;
    // Wait until dbBoqItems has resolved (not undefined = still loading)
    if (dbBoqItems === undefined) return;

    const rooms: Room[] = (project as any).rooms;
    const init: any = {};

    // Build a lookup: roomId -> DB items already saved
    // Filter out only legacy auto-created duplicate locked rows (not user-added rows)
    const dbByRoom: Record<string, any[]> = {};
    const seenLockedItems = new Map<string, any>();
    if (dbBoqItems && dbBoqItems.length > 0) {
      for (const dbItem of dbBoqItems) {
        const key = dbItem.roomId ?? 'global';
        const isLockedItem = (dbItem as any).isLocked === true;
        if (isLockedItem) {
          const lockedKey = `${key}:${dbItem.category}:${dbItem.name}`;
          const firstSeen = seenLockedItems.get(lockedKey);
          if (firstSeen && isLegacyAutoDuplicate(dbItem, firstSeen)) {
            continue;
          }
          if (!firstSeen) {
            seenLockedItems.set(lockedKey, dbItem);
          }
        }
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
          isLocked: isLockedItem,
          // Preserve isEnabled from DB so toggle state survives reloads.
          isEnabled: (dbItem as any).isEnabled,
          source: (dbItem as any).source,
          _persisted: true, // mark so we don't re-save in onFinish
        });
      }
    }

    rooms.forEach((r: Room) => {
      const roomId = getRoomDbId(r);
      const roomDbItems = dbByRoom[roomId] ?? [];
      init[r.uid] = roomDbItems;
    });

    setAllItems(init);
    setInitialised(true);
  }, [project, dbBoqItems, initialised]);

  // Clean up legacy auto-created duplicate locked rows and keep existing
  // smart rows' quantities synced when project waste % changes.
  const ensuredRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!projectId || !project || dbBoqItems === undefined) return;
    const wastePct = (project as any).floorWastePct;
    const rooms: Room[] = (project as any).rooms ?? [];

    // Clean up any legacy auto-created duplicate locked rows in DB
    const seenLockedInDb = new Map<string, any>();
    const duplicateLockedIds: any[] = [];
    for (const it of dbBoqItems ?? []) {
      if ((it as any).isLocked !== true || !it.roomId) continue;
      const dupKey = `${it.roomId}:${it.category}:${it.name}`;
      const firstSeen = seenLockedInDb.get(dupKey);
      if (!firstSeen) {
        seenLockedInDb.set(dupKey, it);
      } else if (isLegacyAutoDuplicate(it, firstSeen)) {
        const cleanupKey = `cleanup-dup:${it._id}`;
        if (!ensuredRef.current.has(cleanupKey) && !globalEnsuredLockedKeys.has(cleanupKey)) {
          ensuredRef.current.add(cleanupKey);
          globalEnsuredLockedKeys.add(cleanupKey);
          duplicateLockedIds.push(it._id);
        }
      }
    }
    if (duplicateLockedIds.length > 0) {
      deleteBoqItemsBatchMutation({ itemIds: duplicateLockedIds }).catch(() => {
        duplicateLockedIds.forEach((id) => {
          const cleanupKey = `cleanup-dup:${id}`;
          ensuredRef.current.delete(cleanupKey);
          globalEnsuredLockedKeys.delete(cleanupKey);
        });
      });
    }

    // Re-derive qty when waste % changes for existing enabled smart SQM rows
    rooms.forEach((room: any) => {
      const roomId = getRoomDbId(room);
      if (!roomId) return;
      const sizeSqm = Number(room.size ?? room.sizeSqm ?? 0);
      const roomLockedItems = (dbBoqItems ?? []).filter(
        (it: any) => it.roomId === roomId && it.isLocked === true && it.isEnabled !== false && !duplicateLockedIds.includes(it._id)
      );

      roomLockedItems.forEach((existing: any) => {
        if (existing.unit !== 'מ"ר' || existing.name === 'גינון ופיתוח (דשא/שתילה)') return;
        let defaultBase = sizeSqm;
        if (existing.name === 'ריצוף חוץ') {
          defaultBase = Number((project as any).yardPavedArea || sizeSqm || 0);
        } else if (existing.name === WALL_TILE_NAME) {
          defaultBase = 0;
        }
        const baseArea = existing.userQty !== undefined ? Number(existing.userQty) : defaultBase;
        const target = applyWaste(baseArea, wastePct);
        if (existing.qty !== target) {
          const key = `locked-qty:${existing._id}:${target}`;
          if (!ensuredRef.current.has(key) && !globalEnsuredLockedKeys.has(key)) {
            ensuredRef.current.add(key);
            globalEnsuredLockedKeys.add(key);
            updateBoqItemMutation({ itemId: existing._id, qty: target }).catch(() => {
              ensuredRef.current.delete(key);
              globalEnsuredLockedKeys.delete(key);
            });
          }
        }
      });
    });
  }, [project, dbBoqItems, projectId, updateBoqItemMutation, deleteBoqItemsBatchMutation]);

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

  // Toggle a locked row on/off. When turning off, qty drops to 0.
  // When turning on, recompute qty from current waste % and userQty/room size.
  const handleLockedToggle = async (item: any) => {
    const wastePct = (project as any)?.floorWastePct;
    const newEnabled = !(item.isEnabled !== false);
    const room = rooms.find((r: any) => (r.uid && allItems[r.uid]?.some((i: any) => i.id === item.id)));
    const sizeSqm = Number(room?.size ?? room?.sizeSqm ?? 0);
    const usesWaste = item.unit === 'מ"ר' && item.name !== 'גינון ופיתוח (דשא/שתילה)';
    const base = Number(item.userQty ?? (item.cat === WALL_TILE_CATEGORY ? 0 : sizeSqm));
    const nextQty = newEnabled
      ? (usesWaste ? applyWaste(base, wastePct) : Math.max(1, base))
      : 0;
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

  // Quick-add a room-type-specific smart row (flooring, wall cladding, mosaic, etc.).
  // The user can click more than once if they want multiple tile/cladding rows in the same room.
  const handleQuickAddSmartRow = async (template: SmartRowTemplate) => {
    if (!currentRoom) return;
    const roomUid = currentRoom.uid;
    const roomId = getRoomDbId(currentRoom);
    const wastePct = (project as any)?.floorWastePct;
    const baseQty = Math.max(0, Number(template.baseQty) || 0);
    const initialQty = template.usesWaste ? applyWaste(baseQty, wastePct) : Math.max(1, baseQty);
    const localId = `smart_${roomUid}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const optimisticRow = {
      id: localId,
      cat: template.category,
      name: template.name,
      qty: initialQty,
      userQty: baseQty,
      unit: template.unit,
      isLocked: true,
      isEnabled: true,
      source: 'manual',
      spec: '',
      notes: '',
      _persisted: false,
    };

    setAllItems((prev: any) => ({
      ...prev,
      [roomUid]: [...(prev[roomUid] || []), optimisticRow],
    }));

    if (projectId && roomId) {
      try {
        const newId = await addBoqItemMutation({
          projectId: projectId as any,
          roomId: roomId as any,
          category: template.category,
          name: template.name,
          qty: initialQty,
          userQty: baseQty,
          unit: template.unit,
          unitPrice: 0,
          isLocked: true,
          isEnabled: true,
          source: 'manual',
        });
        setAllItems((prev: any) => ({
          ...prev,
          [roomUid]: (prev[roomUid] || []).map((i: any) =>
            i.id === localId ? { ...i, id: newId, _persisted: true } : i
          ),
        }));
      } catch (err) {
        setAllItems((prev: any) => ({
          ...prev,
          [roomUid]: (prev[roomUid] || []).filter((i: any) => i.id !== localId),
        }));
        console.error('Quick add smart row failed', err);
        setFeedback({ title: 'שגיאה בשמירה', message: 'לא הצלחנו להוסיף את הפריט. נסה שוב.', type: 'error' });
      }
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

  const qtyTimers = React.useRef<Record<string, number>>({});
  const setQty = (roomUid: string, itemId: string, qty: any) => {
    const nextQty = Math.max(0, Number(qty) || 0);
    const targetItem = (allItems[roomUid] || []).find((i: any) => i.id === itemId);
    setAllItems((prev: any)=>({...prev,[roomUid]:(prev[roomUid]||[]).map((i: any)=>i.id===itemId?{...i,userQty:nextQty,qty:nextQty}:i)}));
    if (targetItem?._persisted && projectId) {
      const existing = qtyTimers.current[String(itemId)];
      if (existing) window.clearTimeout(existing);
      qtyTimers.current[String(itemId)] = window.setTimeout(() => {
        updateBoqItemMutation({ itemId: itemId as any, qty: nextQty, userQty: nextQty }).catch(console.error);
      }, 400);
    }
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

  const editItem = async (roomUid: string, itemId: string, patch: any) => {
    const target = (allItems[roomUid] || []).find((i: any) => i.id === itemId);
    if (!target || target.isLocked) return;
    const isBlobUrl = (url: string) => url?.startsWith('blob:');
    setAllItems((prev: any) => ({
      ...prev,
      [roomUid]: (prev[roomUid] || []).map((i: any) => i.id === itemId ? {
        ...i,
        cat: patch.cat, name: patch.name, qty: patch.qty, userQty: patch.qty, unit: patch.unit,
        notes: patch.notes, imageUrl: patch.imageUrl, projectFileId: patch.projectFileId,
      } : i),
    }));
    if (target._persisted && projectId) {
      try {
        await updateBoqItemMutation({
          itemId: itemId as any,
          category: patch.cat,
          name: patch.name,
          qty: patch.qty,
          userQty: patch.qty,
          unit: patch.unit,
          notes: patch.notes ?? '',
          ...(patch.projectFileId ? { projectFileId: patch.projectFileId as any } : {}),
          imageUrl: patch.imageUrl && !isBlobUrl(patch.imageUrl) ? patch.imageUrl : (patch.imageUrl ? target.imageUrl ?? '' : ''),
        });
      } catch (err) {
        console.error('Failed to update BOQ item', err);
        setAllItems((prev: any) => ({
          ...prev,
          [roomUid]: (prev[roomUid] || []).map((i: any) => i.id === itemId ? target : i),
        }));
        setFeedback({ title: 'שגיאה בשמירה', message: 'לא הצלחנו לעדכן את הפריט. נסה שוב.', type: 'error' });
        throw err;
      }
    }
  };

  const handleCopyItems = async (copied: any[]) => {
    if (!projectId || !currentRoom || copied.length === 0) return;
    const roomUid = currentRoom.uid;
    const roomId = getRoomDbId(currentRoom);
    const prepared = copied.map((c, idx) => ({
      ...c,
      cat: adaptCategoryForRoom({ name: c.name, cat: c.cat }, currentRoom.type),
      localId: `copy_${roomUid}_${Date.now()}_${idx}`,
    }));
    try {
      const results = await addBoqItemsBatchMutation({
        projectId: projectId as any,
        items: prepared.map(c => ({
          roomId: roomId as any,
          category: c.cat || 'כללי',
          name: c.name,
          qty: c.qty,
          unit: c.unit || "יח'",
          unitPrice: 0,
          userQty: c.qty,
          source: 'manual' as const,
          localId: c.localId,
          ...(c.notes?.trim() ? { notes: c.notes.trim() } : {}),
        })),
      });
      setAllItems((prev: any) => {
        const added = prepared.flatMap(c => {
          const res = results.find((r: any) => r.localId === c.localId);
          return res ? [{
            id: res.dbId, cat: c.cat || 'כללי', name: c.name, qty: c.qty, userQty: c.qty, unit: c.unit || "יח'",
            notes: c.notes ?? '', isLocked: false, isEnabled: true, source: 'manual', _persisted: true,
          }] : [];
        });
        return { ...prev, [roomUid]: [...(prev[roomUid] || []), ...added] };
      });
      setFeedback({ title: 'ההעתקה הושלמה', message: `הועתקו ${copied.length} פריטים. אפשר לערוך כל פריט.`, type: 'success' });
    } catch (err) {
      console.error('Copy items failed', err);
      setFeedback({ title: 'שגיאה בהעתקה', message: 'לא הצלחנו להעתיק את הפריטים. נסה שוב.', type: 'error' });
      throw err;
    }
  };

  const handleAutoFillFromTemplates = async () => {
    if (!projectId || !project || !rooms.length) return;
    const scope = autoFillModal.scope;
    setIsAutoFilling(true);
    
    try {
      const targetRooms = scope === 'all' ? rooms : [currentRoom];
      const itemsToInsert: any[] = [];
      
      targetRooms.forEach((room: any) => {
        const roomId = getRoomDbId(room);
        const catalog = getCatalogForRoom(room.type || 'general');
        const existingNames = (allItems[room.uid] || []).map((i: any) => i.name.trim().toLowerCase());
        
        catalog.forEach((catItem) => {
          if (catItem.optional) return; // optional items are autocomplete-only
          if (!existingNames.includes(catItem.name.toLowerCase())) {
            const localId = `cat_${room.uid}_${Date.now()}_${Math.random()}`;
            itemsToInsert.push({
              roomId: roomId as any,
              roomUid: room.uid, // Needed to update local state
              category: catItem.cat || 'כללי',
              name: catItem.name,
              qty: catItem.qty || 1,
              unit: catItem.unit || "יח'",
              unitPrice: 0,
              userQty: catItem.qty || 1,
              source: 'wizard_smart',
              localId,
            });
          }
        });
      });
      
      if (itemsToInsert.length === 0) {
        setFeedback({ title: 'אין מה להוסיף', message: 'כל הפריטים מהתבניות כבר קיימים בחדרים אלו, או שאין תבנית מתאימה.', type: 'success' });
        setAutoFillModal({ open: false, scope: 'all' });
        return;
      }
      
      // Batch insert items
      const results = await addBoqItemsBatchMutation({
        projectId: projectId as any,
        items: itemsToInsert.map(i => ({
          roomId: i.roomId,
          category: i.category,
          name: i.name,
          qty: i.qty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          userQty: i.userQty,
          source: i.source,
          localId: i.localId,
        }))
      });
      
      // Update local state
      setAllItems((prev: any) => {
        const next: any = { ...prev };
        itemsToInsert.forEach((itemToInsert) => {
          const res = results.find((r: any) => r.localId === itemToInsert.localId);
          if (res) {
            const newItem = {
              id: res.dbId,
              cat: itemToInsert.category,
              name: itemToInsert.name,
              qty: itemToInsert.qty,
              userQty: itemToInsert.userQty,
              unit: itemToInsert.unit,
              isLocked: false,
              isEnabled: true,
              source: 'wizard_smart',
              notes: '',
              _persisted: true,
            };
            next[itemToInsert.roomUid] = [...(next[itemToInsert.roomUid] || []), newItem];
          }
        });
        return next;
      });
      
      setFeedback({ title: 'המילוי הושלם', message: `נוספו בהצלחה ${itemsToInsert.length} פריטים מתוך התבניות.`, type: 'success' });
    } catch (err) {
      console.error('Auto fill failed', err);
      setFeedback({ title: 'שגיאה במילוי', message: 'לא הצלחנו למלא את הפריטים. אנא נסה שוב.', type: 'error' });
    } finally {
      setIsAutoFilling(false);
      setAutoFillModal({ open: false, scope: 'all' });
    }
  };

  const handleResetRooms = async () => {
    if (!projectId || !project || !rooms.length) return;
    const scope = resetModal.scope;
    setIsAutoFilling(true);
    
    try {
      const targetRooms = scope === 'all' ? rooms : [currentRoom];
      const itemsToDelete: any[] = [];
      
      targetRooms.forEach((room: any) => {
        const roomItems = allItems[room.uid] || [];
        roomItems.forEach((item: any) => {
          if (!item.paid) {
            itemsToDelete.push({ roomUid: room.uid, id: item.id, _persisted: item._persisted });
          }
        });
      });
      
      if (itemsToDelete.length === 0) {
        setFeedback({ title: 'אין מה לאפס', message: 'אין פריטים להסרה בחדר זה.', type: 'success' });
        setResetModal({ open: false, scope: 'all' });
        return;
      }
      
      const persistedIds = itemsToDelete.filter(i => i._persisted).map(i => i.id);
      
      // Delete from DB if persisted
      if (persistedIds.length > 0) {
        await deleteBoqItemsBatchMutation({ itemIds: persistedIds as any[] });
      }
      
      // Update local state
      setAllItems((prev: any) => {
        const next: any = { ...prev };
        targetRooms.forEach((room: any) => {
          const roomItems = next[room.uid] || [];
          next[room.uid] = roomItems.filter((i: any) => Boolean(i.paid));
        });
        return next;
      });
      
      setFeedback({ title: 'איפוס הושלם', message: `הוסרו ${itemsToDelete.length} פריטים.`, type: 'success' });
    } catch (err) {
      console.error('Reset failed', err);
      setFeedback({ title: 'שגיאה באיפוס', message: 'לא הצלחנו לאפס את הפריטים. אנא נסה שוב.', type: 'error' });
    } finally {
      setIsAutoFilling(false);
      setResetModal({ open: false, scope: 'all' });
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
      setFeedback({ title: "העברה הושלמה", message: "הכמויות הועברו בהצלחה לניהול רכש!", type: "success", redirect: "/boq" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "שגיאה בשמירת הנתונים", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const closeFeedback = () => {
    const redirect = feedback?.redirect;
    setFeedback(null);
    if (redirect) navigate({ to: redirect });
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

  if (roleLoading || !subscriptionLoaded) return <AccessLoading />;
  if (!allowed) return <AccessDenied message="אשף הכמויות וניהול ה-BoQ מורשים ליזם ומנהל הפרויקט בלבד." />;
  if (!isProOrPremium) {
    return (
      <div className="page-content">
        <FeatureTeaser feature="boqwizard" requiredPlan="pro" preview={<BOQWizardPreview />} />
      </div>
    );
  }

  if (!project) return <ScreenBoundary loading={loading} error={error} onRetry={refetch}><div/></ScreenBoundary>;

  if (view === 'summary') {
    const aggregated = aggregateWizardItems(rooms, allItems, (project as any)?.housingUnits);
    const summaryCats = [...new Set(Object.values(aggregated).map(i => i.cat))];

    return (
      <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
          <div className="page-content" style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"flex-end",gap:16,marginBottom:32}}>
            <div>
              <h1 style={{fontSize:28,fontWeight:900,margin:0,color:"var(--text1)"}}>אשף כמויות</h1>
              <div style={{color:"var(--text3)",fontSize:15,marginTop:4}}>עבור חדר-חדר ובנה רשימת כמויות לרכישה / ייבוא</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:16,fontSize:14,color:"var(--text3)"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>א</div>
                <span>עודכן: היום, 09:45</span>
              </div>
            </div>
          </div>

          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:24}}>
            <div>
              <h2 style={{fontSize:24,fontWeight:800,margin:0}}>רשימת יבוא מרוכזת</h2>
              <div style={{color:"var(--text3)",fontSize:14,marginTop:4}}>כל הכמויות המאוחדות לפי קטגוריה — מוכן לרכישה</div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
              <Btn variant="ghost" onClick={handleExportPDF} disabled={exporting} style={{borderRadius:12,padding:"10px 20px",fontWeight:700,border:"1px solid var(--border)"}}>
                <Icon n={exporting ? "loader" : "download"} s={16} style={{marginLeft:8}}/> {exporting ? "מייצא..." : "ייצוא PDF"}
              </Btn>
              <Btn variant="ghost" onClick={() => setView('wizard')} style={{borderRadius:12,padding:"10px 20px",fontWeight:700}}>
                <Icon n="arrow-right" s={16} style={{marginLeft:8}}/> חזרה לאשף
              </Btn>
              <Btn onClick={onFinish} disabled={saving} style={{borderRadius:12,padding:"10px 20px",fontWeight:700,background:"var(--success)",borderColor:"var(--success)"}}>
                <Icon n={saving ? "refresh" : "check"} s={16} style={{marginLeft:8}}/> {saving ? "מעביר..." : "העבר לניהול עלויות רכש"}
              </Btn>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="boq-stats-grid">
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

          {/* Import Notes Card */}
          <div className="card" style={{padding:20,borderRadius:16,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontWeight:700,fontSize:15,color:"var(--text1)"}}>
              <Icon n="edit" s={16} c="var(--accent)"/>
              <span>הנחיות והערות כלליות ליבוא / רכש</span>
              <span style={{fontSize:12,color:"var(--text3)",fontWeight:400}}>(יופיעו בהבלטה בראש דוח ה-PDF)</span>
            </div>
            <textarea
              className="bp-input"
              value={importNotes}
              onChange={e => setImportNotes(e.target.value)}
              placeholder="לדוגמה: תאריך אספקה מבוקש למכולה עד 15.12, פריקה ברחוב הכרם 14. דגש על בדיקת תקינות לפני אריזה..."
              rows={3}
              style={{width:"100%",resize:"vertical",fontSize:13,lineHeight:1.6,fontFamily:"inherit"}}
            />
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
                          <td style={{padding:"18px 0"}}>
                            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                              {item.rooms.filter(r=>r.qty>0).map((r, ri)=>(
                                <span key={ri} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,lineHeight:"15px",padding:"3px 8px",borderRadius:6,background:"var(--surface-2)",color:"var(--text2)",fontWeight:600,border:"1px solid var(--border)"}}>
                                  <span>{r.name}:</span> <strong style={{color:"var(--text1)"}}>{r.qty}</strong>
                                </span>
                              ))}
                            </div>
                            {item.rooms.some(r => r.notes) ? (
                              <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>
                                {item.rooms.filter(r => r.notes).map((r, ri) => (
                                  <div key={ri} style={{fontSize:11,background:"var(--accent-light)",color:"var(--accent)",padding:"3px 8px",borderRadius:6,border:"1px solid var(--border)"}}>
                                    <strong>{r.name}:</strong> {r.notes}
                                  </div>
                                ))}
                              </div>
                            ) : item.notes.length > 0 ? (
                              <div style={{fontSize:11,color:"var(--text3)",marginTop:8,lineHeight:1.5}}>
                                הערות: {item.notes.join(' · ')}
                              </div>
                            ) : null}
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
              title="רשימת יבוא מרוכזת (סיכום אשף)"
              generalNotes={importNotes}
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
                  <Btn onClick={() => navigate({ to: '/setup' })} style={{margin: "0 auto", padding: "12px 24px"}}>
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
        <div className="page-content" style={{maxWidth:1200,margin:"0 auto"}}>
          
          {/* Header Section */}
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"flex-end",gap:16,marginBottom:32}}>
          <div>
            <h1 style={{fontSize:28,fontWeight:900,margin:0,color:"var(--text1)"}}>אשף כמויות</h1>
            <div style={{color:"var(--text3)",fontSize:15,marginTop:4}}>עבור חדר-חדר ובנה רשימת כמויות לרכישה / ייבוא</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16,fontSize:14,color:"var(--text3)"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>א</div>
              <span>עודכן: היום, 09:45</span>
            </div>
          </div>
        </div>

        <div className="boq-wizard-layout">
          
          {/* Sidebar */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text3)",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px",textAlign:"right"}}>חדרים</div>
            {rooms.map((r: Room, i: number)=>(
              <div key={r.uid} onClick={()=>setStep(i)} style={{padding:"12px 16px",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:12,border:"1px solid",borderColor:step===i?"var(--accent)":"var(--border)",background:step===i?"var(--accent-light)":"var(--surface)",boxShadow:step===i?"0 4px 12px rgba(234,88,12,0.1)":"none",transition:"all .2s"}}>
                <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,background:step===i?"var(--accent)":"var(--border)",color:step===i?"#fff":"var(--text3)"}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:step===i?700:500,color:step===i?"var(--text1)":"var(--text2)"}}>{r.name}</div>
                  <div style={{fontSize:12,color:"var(--text3)"}}>{getFloorLabel(r.floor, (project as any)?.housingUnits)} · {r.size} מ"ר</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:12}}>
              <button onClick={() => setView('summary')} style={{width:"100%",padding:"14px",borderRadius:12,border:"1px solid var(--success)",background:"rgba(16,185,129,0.1)",color:"var(--success)",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer"}}>
                <Icon n="download" s={16}/> צפה ברשימת יבוא
              </button>
            </div>
          </div>

          {/* Main Area */}
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            
            <div style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
              <div>
                <h2 style={{fontSize:24,fontWeight:800,margin:0}}>{currentRoom.name}</h2>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
                  {currentRoom.name} · {getFloorLabel(currentRoom.floor, (project as any)?.housingUnits)} · {currentRoom.size} מ"ר
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

            {/* Add Item button, Quick-Add smart buttons per room type, and Auto-fill buttons */}
            <div style={{display:"flex",flexWrap:"wrap",justifyContent:"flex-start",alignItems:"center",gap:10}}>
              <button
                onClick={() => setItemDialog({ mode: 'add' })}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 18px",borderRadius:10,border:"1.5px solid var(--accent)",background:"var(--accent-light)",color:"var(--accent)",fontWeight:700,fontSize:14,cursor:"pointer"}}
              >
                <Icon n="plus" s={15}/> הוסף פריט
              </button>
              <button
                onClick={() => setCopyOpen(true)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--surface)",color:"var(--text1)",fontWeight:700,fontSize:13,cursor:"pointer"}}
              >
                <Icon n="layers" s={14}/> העתק מחדר אחר
              </button>

              {getQuickAddButtonsForRoom(currentRoom, project).map((tpl) => {
                const existingCount = items.filter(
                  (i: any) => i.cat === tpl.category && i.name === tpl.name
                ).length;
                return (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => void handleQuickAddSmartRow(tpl)}
                    title={existingCount > 0 ? `כבר קיים בחדר (${existingCount}) — לחץ להוספת שורה נוספת` : `${tpl.label} לחדר זה`}
                    style={{
                      display:"flex", alignItems:"center", gap:7,
                      padding:"8px 14px", borderRadius:10,
                      border:"1.5px solid var(--border)",
                      background:"var(--surface)", color:"var(--text1)",
                      fontWeight:700, fontSize:13, cursor:"pointer",
                      transition:"border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.color = "var(--accent)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text1)";
                    }}
                  >
                    <Icon n="plus" s={14} c="var(--accent)" />
                    <span>{tpl.label}</span>
                    {existingCount > 0 && (
                      <span style={{
                        fontSize:11, fontWeight:800, padding:"1px 6px",
                        borderRadius:999, background:"var(--accent-light)", color:"var(--accent)"
                      }}>
                        {existingCount}
                      </span>
                    )}
                  </button>
                );
              })}
              
              <MagicActionsWidget 
                step={step}
                onAutoFillCurrent={() => setAutoFillModal({ open: true, scope: 'current' })}
                onResetCurrent={() => setResetModal({ open: true, scope: 'current' })}
                onAutoFillAll={() => setAutoFillModal({ open: true, scope: 'all' })}
                onResetAll={() => setResetModal({ open: true, scope: 'all' })}
              />
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {cats.length === 0 && (
                <div className="card" style={{borderRadius:16,padding:"32px 24px",textAlign:"center",color:"var(--text3)",fontSize:14}}>
                  עדיין לא נוספו פריטים לחדר זה. לחץ על <strong>הוסף ריצוף / חיפוי</strong>, <strong>הוסף פריט</strong>, או <strong>פעולות תבנית</strong> כדי להתחיל.
                </div>
              )}
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
                      const usesWasteSqm = locked && item.unit === 'מ"ר' && item.name !== 'גינון ופיתוח (דשא/שתילה)';
                      const wastePct = (project as any)?.floorWastePct ?? DEFAULT_FLOOR_WASTE_PCT;
                      const roomSize = Number(currentRoom.size ?? currentRoom.sizeSqm ?? 0);
                      const netSqm = item.userQty !== undefined ? Number(item.userQty) : (isWallTile ? 0 : roomSize);
                      const dimmedStyle = locked && !enabled ? { opacity: 0.55 } : {};
                      return (
                      <div key={item.id} style={{display:"flex",flexWrap:"wrap",alignItems:"flex-start",gap:16,padding:"16px 20px",borderBottom:"1px solid var(--border)", ...dimmedStyle}}>
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
                        <div style={{flex:"1 1 180px", minWidth:"180px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{fontSize:15,fontWeight:600}}>{item.name}</div>
                          </div>
                          {locked ? (
                            <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>
                              {!enabled
                                ? (isWallTile ? 'לא נבחר חיפוי קירות בריצוף' : 'לא מרצפים את החדר')
                                : usesWasteSqm
                                  ? `מחושב עם פחת: ${netSqm} מ"ר נטו × ${wastePct}% פחת = ${item.qty} מ"ר`
                                  : `כמות: ${item.qty} ${item.unit}`}
                            </div>
                          ) : item.hint && item.hint !== 'manual_smart' && (
                            <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>{item.hint}</div>
                          )}
                          {locked && enabled && (
                            <div style={{marginTop:8}}>
                              <textarea
                                value={item.spec ?? ''}
                                placeholder="הוסף תיאור (יצרן, דגם, גוון…)"
                                onChange={e => handleLockedSpecChange(item.id, e.target.value)}
                                rows={2}
                                style={{width:"100%",resize:"vertical",fontFamily:"'Heebo',sans-serif",fontSize:13,padding:"6px 8px",border:"1px solid var(--border)",borderRadius:8,background:"var(--surface)",color:"var(--text1)"}}
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
                                style={{width:"100%",resize:"vertical",fontFamily:"'Heebo',sans-serif",fontSize:13,padding:"6px 8px",border:"1px solid var(--border)",borderRadius:8,background:"var(--surface)",color:"var(--text1)"}}
                              />
                              <div style={{fontSize:11,color:"var(--text3)",minHeight:13,marginTop:2}}>
                                {item._notesSaving ? 'שומר הערות…' : ''}
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:12}}>
                          {locked ? (
                            <>
                              {/* Toggle on/off */}
                              <button
                                type="button"
                                onClick={() => void handleLockedToggle(item)}
                                title={enabled ? 'בטל בחירה' : 'הוסף לכמויות'}
                                style={{
                                  display:"flex",alignItems:"center",gap:6,
                                  background: enabled ? 'var(--accent-light)' : 'var(--bg)',
                                  color: enabled ? 'var(--accent)' : 'var(--text2)',
                                  border:`1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
                                  padding:"6px 10px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:700,
                                }}
                              >
                                {enabled ? '✓ מרצפים' : 'לא מרצפים'}
                              </button>
                              {/* User can adjust base net m² on any waste-calculated SQM smart row */}
                              {enabled && usesWasteSqm && (
                                <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg)",borderRadius:10,padding:"4px 8px",border:"1px solid var(--border)"}}>
                                  <input
                                    type="number"
                                    min={0}
                                    value={netSqm}
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
                              <button onClick={()=>removeItem(currentRoom.uid,item.id)} title="מחק פריט" style={{background:"none",border:"none",cursor:"pointer",color:"#DDD",transition:"color .2s"}} onMouseEnter={e=>e.currentTarget.style.color="var(--danger)"} onMouseLeave={e=>e.currentTarget.style.color="#DDD"}><Icon n="x" s={18}/></button>
                            </>
                          ) : (
                            <>
                              <div style={{display:"flex",alignItems:"center",background:"var(--bg)",borderRadius:10,padding:4,border:"1px solid var(--border)"}}>
                                <button onClick={()=>setQty(currentRoom.uid,item.id,item.userQty-1)} style={{width:32,height:32,borderRadius:8,border:"none",background:"var(--surface-2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"var(--shadow-xs)"}}><Icon n="minus" s={14}/></button>
                                <input type="number" value={item.userQty} onChange={e=>setQty(currentRoom.uid,item.id,e.target.value)} style={{width:50,textAlign:"center",background:"transparent",border:"none",fontWeight:700,fontSize:16}}/>
                                <button onClick={()=>setQty(currentRoom.uid,item.id,item.userQty+1)} style={{width:32,height:32,borderRadius:8,border:"none",background:"var(--surface-2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"var(--shadow-xs)"}}><Icon n="plus" s={14}/></button>
                              </div>
                              <span style={{fontSize:14,color:"var(--text3)",width:30}}>{item.unit}</span>
                              <button onClick={()=>setItemDialog({ mode: 'edit', roomUid: currentRoom.uid, item })} title="ערוך פריט" style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"5px 9px",cursor:"pointer",color:"var(--text2)",fontSize:12,fontWeight:600}}><Icon n="edit" s={13}/> עריכה</button>
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
              <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                <button
                  onClick={() => setItemDialog({ mode: 'add' })}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:10,border:"1.5px solid var(--accent)",background:"var(--accent-light)",color:"var(--accent)",fontWeight:700,fontSize:14,cursor:"pointer"}}
                >
                  <Icon n="plus" s={15}/> הוסף פריט
                </button>
                <button
                  onClick={() => setCopyOpen(true)}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--surface)",color:"var(--text1)",fontWeight:700,fontSize:13,cursor:"pointer"}}
                >
                  <Icon n="layers" s={14}/> העתק מחדר אחר
                </button>
              </div>
            </div>
          </div>

        </div>
        <ItemDialog
          dialog={itemDialog}
          onClose={() => setItemDialog(null)}
          roomType={currentRoom?.type || 'general'}
          existingItems={items}
          projectItems={projectItems}
          projectCategories={projectCategories}
          onAdd={item => addItem(currentRoom.uid, item)}
          onEdit={editItem}
          projectId={projectId as any}
          uploadProjectFile={uploadProjectFile}
          globalCategories={globalCategories}
        />
        <CopyFromRoomDialog
          open={copyOpen}
          onClose={() => setCopyOpen(false)}
          rooms={rooms}
          currentRoom={currentRoom}
          allItems={allItems}
          onCopy={handleCopyItems}
        />
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

        {/* Auto Fill Confirmation Modal */}
        {autoFillModal.open && (
          <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:"var(--surface)",borderRadius:20,width:420,maxWidth:"90vw",padding:32,boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,color:"var(--accent)"}}>
                <Icon n="wand" s={24}/>
                <h3 style={{margin:0,fontSize:20,fontWeight:800,color:"var(--text1)"}}>
                  {autoFillModal.scope === 'all' ? 'מילוי אוטומטי לכל החדרים' : 'מילוי אוטומטי לחדר זה'}
                </h3>
              </div>
              <div style={{fontSize:15,color:"var(--text2)",lineHeight:1.6,marginBottom:24}}>
                {autoFillModal.scope === 'all'
                  ? 'פעולה זו תעבור על כל החדרים בפרויקט ותוסיף להם פריטים אוטומטית לפי סוג החדר (מטבח, סלון, חדר שינה וכו\').'
                  : 'פעולה זו תוסיף אוטומטית פריטים מומלצים לחדר זה לפי סוגו.'}
                <br/><br/>
                <strong>שים לב:</strong> המערכת לא תוסיף פריטים שכבר קיימים (לפי שם הפריט) כדי למנוע כפילויות. תוכל לערוך או למחוק כל פריט לאחר ההוספה.
              </div>
              <div style={{display:"flex",gap:12}}>
                <button
                  onClick={() => setAutoFillModal({ open: false, scope: 'all' })}
                  disabled={isAutoFilling}
                  style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",fontSize:14,fontWeight:600}}
                >
                  ביטול
                </button>
                <button
                  onClick={handleAutoFillFromTemplates}
                  disabled={isAutoFilling}
                  style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:"var(--accent)",color:"#fff",cursor:isAutoFilling?"wait":"pointer",fontSize:14,fontWeight:700,opacity:isAutoFilling?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
                >
                  {isAutoFilling && <Icon n="loader" s={14}/>}
                  {isAutoFilling ? "ממלא..." : "הוסף פריטים מתבנית"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {resetModal.open && (
          <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:"var(--surface)",borderRadius:20,width:420,maxWidth:"90vw",padding:32,boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,color:"var(--danger)"}}>
                <Icon n="trash" s={24}/>
                <h3 style={{margin:0,fontSize:20,fontWeight:800,color:"var(--text1)"}}>
                  {resetModal.scope === 'all' ? 'איפוס כל החדרים' : 'איפוס חדר זה'}
                </h3>
              </div>
              <div style={{fontSize:15,color:"var(--text2)",lineHeight:1.6,marginBottom:24}}>
                {resetModal.scope === 'all'
                  ? 'פעולה זו תמחק את כל הפריטים בכל החדרים בפרויקט (למעט פריטים שכבר שולמו).'
                  : 'פעולה זו תמחק את כל הפריטים בחדר זה (למעט פריטים שכבר שולמו).'}
                <br/><br/>
                <strong>שים לב:</strong> פעולה זו היא בלתי הפיכה.
              </div>
              <div style={{display:"flex",gap:12}}>
                <button
                  onClick={() => setResetModal({ open: false, scope: 'all' })}
                  disabled={isAutoFilling}
                  style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",cursor:"pointer",fontSize:14,fontWeight:600}}
                >
                  ביטול
                </button>
                <button
                  onClick={handleResetRooms}
                  disabled={isAutoFilling}
                  style={{flex:2,padding:"12px",borderRadius:10,border:"none",background:"var(--danger)",color:"#fff",cursor:isAutoFilling?"wait":"pointer",fontSize:14,fontWeight:700,opacity:isAutoFilling?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
                >
                  {isAutoFilling && <Icon n="loader" s={14}/>}
                  {isAutoFilling ? "מאפס..." : "מחק פריטים"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScreenBoundary>
  );
};
