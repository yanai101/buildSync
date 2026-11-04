import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  floorLabel,
  MAX_PHOTOS_PER_ROOM_STAGE,
  ROOM_PHOTO_CATEGORIES,
  ROOM_PHOTO_CATEGORY_COLORS,
  type RoomPhotoCategory,
} from '../../../convex/_lib/roomArchiveShared';
import { Btn, Icon, Spinner } from '../Shared';
import { ImageGalleryViewer } from '../ImageGalleryViewer';
import {
  categoryLabel,
  defaultStageId,
  formatDate,
  getPhotoCategories,
  groupPhotosByStage,
  hasCategory,
  NO_STAGE_KEY,
  photoBucketKey,
  roomTypeLabel,
  stageStatusLabel,
  type RoomPhoto,
  type StageBucket,
} from './roomArchiveUtils';
import {
  DeleteRoomPhotosDialog,
  EditRoomPhotoModal,
  UploadRoomPhotosModal,
  type StagedItem,
} from './RoomPhotoModals';
import { useRoomPhotoUploader } from './useRoomPhotoUploader';
import { generateRoomPdfReport } from './roomPdfReport';

type Notify = (opts: { title: string; body?: string; kind?: 'success' | 'error' | 'info' }) => unknown;
type ViewMode = 'stages' | 'grid' | 'compare';

const chip = (active: boolean, color?: string): React.CSSProperties => ({
  border: `1px solid ${active ? (color ?? 'var(--accent)') : 'var(--border)'}`,
  background: active ? (color ? `${color}1a` : 'var(--accent-light)') : 'var(--surface)',
  color: active ? (color ?? 'var(--accent)') : 'var(--text2)',
  borderRadius: 999,
  padding: '5px 12px',
  fontSize: 13,
  fontWeight: active ? 700 : 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const errMsg = (err: unknown) => (err instanceof Error ? err.message.replace(/^.*Uncaught Error:\s*/, '').split('\n')[0] : 'אירעה שגיאה');

// ── Photo card ──────────────────────────────────────────────────────────────

export const PhotoCard = ({
  photo, canUpload, selected, selecting, onToggleSelect, onOpen, onEdit, onDelete, onToggleCover, compact,
}: {
  photo: RoomPhoto;
  canUpload: boolean;
  selected: boolean;
  selecting: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCover?: () => void;
  compact?: boolean;
}) => {
  const categories = getPhotoCategories(photo);
  return (
    <div
      style={{
        border: `${selected ? 2 : 1}px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12, overflow: 'hidden', background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--surface-2)' }}>
        <button
          type="button"
          onClick={selecting ? onToggleSelect : onOpen}
          aria-label={selecting ? 'בחר תמונה' : 'הצג תמונה בגודל מלא'}
          style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}
        >
          {photo.url ? (
            <img src={photo.url} alt={photo.description || categories.map(categoryLabel).join(', ')} loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text3)' }}><Icon n="image" s={28} /></div>
          )}
        </button>
        <div style={{ position: 'absolute', top: 8, insetInlineStart: 8, display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 'calc(100% - 44px)' }}>
          {categories.map((c) => (
            <span
              key={c}
              style={{
                background: ROOM_PHOTO_CATEGORY_COLORS[c],
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 999,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {categoryLabel(c)}
            </span>
          ))}
        </div>
        {photo.isCover && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              insetInlineEnd: selecting ? 36 : 8,
              background: '#f59e0b',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              zIndex: 1,
            }}
          >
            <Icon n="star" s={11} fill="#fff" /> תמונת חדר
          </span>
        )}
        {selecting && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label="בחר תמונה"
            style={{ position: 'absolute', top: 8, insetInlineEnd: 8, width: 20, height: 20, accentColor: 'var(--accent)' }}
          />
        )}
      </div>
      <div style={{ padding: compact ? 8 : 10, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {photo.description && <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>{photo.description}</div>}
        {photo.note && !compact && (
          <div style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {photo.note}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 'auto' }}>
          {formatDate(photo.takenOn ?? photo.uploadedAt)} · {photo.uploaderName}
        </div>
        {canUpload && !selecting && (
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <Btn size="sm" variant="ghost" onClick={onEdit} aria-label="ערוך"><Icon n="edit" s={13} /> {compact ? '' : 'ערוך'}</Btn>
            {onToggleCover && (
              <Btn
                size="sm"
                variant="ghost"
                onClick={onToggleCover}
                aria-label={photo.isCover ? 'בטל תמונת חדר' : 'קבע כתמונת חדר'}
                style={{ color: photo.isCover ? '#d97706' : 'var(--text2)' }}
                title={photo.isCover ? 'תמונת החדר הראשית (לחץ לביטול)' : 'קבע כתמונת החדר הראשית בארכיון'}
              >
                <Icon n="star" s={13} fill={photo.isCover ? '#f59e0b' : 'none'} c={photo.isCover ? '#f59e0b' : 'currentColor'} />
                {!compact && (photo.isCover ? 'תמונת חדר' : 'קבע כראשית')}
              </Btn>
            )}
            <Btn size="sm" variant="ghost" onClick={onDelete} aria-label="מחק" style={{ color: 'var(--danger)', marginInlineStart: 'auto' }}><Icon n="trash" s={13} /></Btn>
          </div>
        )}
      </div>
    </div>
  );
};

export const grid = (min = 220): React.CSSProperties => ({
  display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`, gap: 12,
});

/** Stage section header in the room's "by stages" timeline. */
export const StageBucketHeader = ({
  label, status, startDate, endDate, count, showMax = true, extra,
}: {
  label: string;
  status: string | null;
  startDate?: string;
  endDate?: string;
  count: number;
  showMax?: boolean;
  extra?: React.ReactNode;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: status === 'done' ? 'var(--success)' : status === 'active' ? 'var(--accent)' : 'var(--text3)' }} />
    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text1)' }}>{label}</span>
    {status && (
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>
        {stageStatusLabel(status)} · {formatDate(startDate)} – {formatDate(endDate)}
      </span>
    )}
    <span style={{ fontSize: 12, color: 'var(--text3)' }}>
      {count}{showMax ? `/${MAX_PHOTOS_PER_ROOM_STAGE}` : ''}
    </span>
    {extra}
  </div>
);

// ── Main ────────────────────────────────────────────────────────────────────

export const RoomDetail = ({
  projectId, projectName, roomId, canUpload, onBack, notify,
}: {
  projectId: Id<'projects'>;
  projectName: string;
  roomId: Id<'projectRooms'>;
  canUpload: boolean;
  onBack: () => void;
  notify: Notify;
}) => {
  const data = useQuery(api.roomArchive.listRoomPhotos, { projectId, roomId });
  const updatePhoto = useMutation(api.roomArchive.updateRoomPhoto);
  const setCoverPhoto = useMutation(api.roomArchive.setRoomCoverPhoto);
  const deletePhotos = useMutation(api.roomArchive.deleteRoomPhotos);
  const uploadPhoto = useRoomPhotoUploader(projectId);

  const [view, setView] = React.useState<ViewMode>('stages');
  const [categoryFilter, setCategoryFilter] = React.useState<RoomPhotoCategory | 'all'>('all');
  const [stageFilter, setStageFilter] = React.useState<string>('all');
  const [selecting, setSelecting] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [uploadFiles, setUploadFiles] = React.useState<File[] | null>(null);
  // null = use the default (active) stage; 'none' = explicitly "no stage".
  const [uploadStageHint, setUploadStageHint] = React.useState<Id<'stages'> | 'none' | null>(null);
  const [editing, setEditing] = React.useState<RoomPhoto | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ ids: Id<'roomPhotos'>[]; scope?: string } | null>(null);
  const [gallery, setGallery] = React.useState<{ photos: RoomPhoto[]; index: number } | null>(null);
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const [compareLeft, setCompareLeft] = React.useState<string>('');
  const [compareRight, setCompareRight] = React.useState<string>('');

  const fileRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);

  const photos = (data?.photos ?? []) as RoomPhoto[];
  const stages = data?.stages ?? [];

  const bucketCounts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of photos) {
      const k = photoBucketKey(p);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [photos]);

  const filtered = React.useMemo(
    () => photos.filter((p) =>
      (categoryFilter === 'all' || hasCategory(p, categoryFilter))
      && (stageFilter === 'all' || photoBucketKey(p) === stageFilter)),
    [photos, categoryFilter, stageFilter],
  );

  const allBuckets = React.useMemo(() => groupPhotosByStage(photos, stages), [photos, stages]);
  // Every stage (even without photos) so users can upload to / compare with any stage.
  const everyBucket = React.useMemo(() => groupPhotosByStage(photos, stages, true), [photos, stages]);
  const filteredBuckets = React.useMemo(
    () => groupPhotosByStage(filtered, stages, canUpload && categoryFilter === 'all' && stageFilter === 'all'),
    [filtered, stages, canUpload, categoryFilter, stageFilter],
  );

  // Default compare selection: earliest and latest stage that have photos;
  // if only one stage has photos, pair it with the next stage in order.
  React.useEffect(() => {
    if (everyBucket.length === 0) return;
    const valid = (k: string) => everyBucket.some((b) => b.key === k);
    if (compareLeft && compareRight && valid(compareLeft) && valid(compareRight)) return;
    const withPhotos = everyBucket.filter((b) => b.photos.length > 0);
    const left = withPhotos[0] ?? everyBucket[0];
    let right = withPhotos.length > 1 ? withPhotos[withPhotos.length - 1] : undefined;
    if (!right) {
      const idx = everyBucket.findIndex((b) => b.key === left.key);
      right = everyBucket[idx + 1] ?? everyBucket[idx - 1] ?? left;
    }
    setCompareLeft(left.key);
    setCompareRight(right.key);
  }, [everyBucket, compareLeft, compareRight]);

  if (data === undefined) return <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Spinner /></div>;
  if (data === null) {
    return (
      <div style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>
        החדר לא נמצא (ייתכן שנמחק מהגדרות הבית).
        <div style={{ marginTop: 12 }}><Btn variant="outline" onClick={onBack}>חזרה לרשימת החדרים</Btn></div>
      </div>
    );
  }

  const room = data.room;

  const pickFiles = (stageHint: Id<'stages'> | 'none' | null = null) => {
    setUploadStageHint(stageHint);
    fileRef.current?.click();
  };

  const onFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(f.name));
    e.target.value = '';
    if (list.length === 0) return;
    if (list.length > MAX_PHOTOS_PER_ROOM_STAGE) {
      notify({ title: `ניתן לבחור עד ${MAX_PHOTOS_PER_ROOM_STAGE} תמונות בכל פעם`, kind: 'info' });
    }
    setUploadFiles(list.slice(0, MAX_PHOTOS_PER_ROOM_STAGE));
  };

  const doUpload = async (stageId: Id<'stages'> | undefined, items: StagedItem[], onProgress: (n: number) => void) => {
    let ok = 0;
    const errors: string[] = [];
    for (const it of items) {
      try {
        await uploadPhoto({
          file: it.file,
          roomId,
          stageId,
          category: it.category,
          categories: it.categories,
          isCover: it.isCover,
          description: it.description,
          note: it.note,
        });
        ok++;
      } catch (err) {
        errors.push(errMsg(err));
      }
      onProgress(ok + errors.length);
    }
    setUploadFiles(null);
    if (ok > 0) notify({ title: ok === 1 ? 'התמונה נשמרה' : `${ok} תמונות נשמרו`, kind: 'success' });
    if (errors.length > 0) notify({ title: `${errors.length} תמונות לא הועלו`, body: errors[0], kind: 'error' });
  };

  const handleToggleCover = async (photo: RoomPhoto) => {
    try {
      const isAlreadyCover = photo.isCover || room.coverPhotoId === photo.id;
      await setCoverPhoto({
        projectId,
        roomId,
        photoId: isAlreadyCover ? undefined : photo.id,
      });
      notify({
        title: isAlreadyCover ? 'תמונת החדר הוסרה' : 'התמונה נקבעה כתמונת החדר הראשית',
        kind: 'success',
      });
    } catch (err) {
      notify({ title: 'שגיאה בעדכון תמונת החדר', body: errMsg(err), kind: 'error' });
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const exitSelecting = () => { setSelecting(false); setSelected(new Set()); };

  const runDelete = async (ids: Id<'roomPhotos'>[]) => {
    try {
      const res = await deletePhotos({ projectId, photoIds: ids });
      notify({ title: res.deletedCount === 1 ? 'התמונה נמחקה' : `${res.deletedCount} תמונות נמחקו`, kind: 'success' });
      exitSelecting();
    } catch (err) {
      notify({ title: 'המחיקה נכשלה', body: errMsg(err), kind: 'error' });
      throw err;
    }
  };

  const makePdf = async (subset?: RoomPhoto[]) => {
    const list = subset ?? filtered;
    if (list.length === 0) return;
    setPdfBusy(true);
    try {
      await generateRoomPdfReport({ projectName, room, photos: list, stages });
      notify({ title: 'הדוח הופק בהצלחה', kind: 'success' });
    } catch (err) {
      notify({ title: 'הפקת הדוח נכשלה', body: errMsg(err), kind: 'error' });
    } finally {
      setPdfBusy(false);
    }
  };

  const openGallery = (list: RoomPhoto[], photo: RoomPhoto) =>
    setGallery({ photos: list.filter((p) => p.url), index: Math.max(0, list.filter((p) => p.url).findIndex((p) => p.id === photo.id)) });

  const renderCard = (p: RoomPhoto, list: RoomPhoto[], compact = false) => (
    <PhotoCard
      key={p.id}
      photo={p}
      compact={compact}
      canUpload={canUpload}
      selecting={selecting}
      selected={selected.has(p.id)}
      onToggleSelect={() => toggleSelect(p.id)}
      onOpen={() => openGallery(list, p)}
      onEdit={() => setEditing(p)}
      onDelete={() => setDeleteTarget({ ids: [p.id] })}
      onToggleCover={() => handleToggleCover(p)}
    />
  );

  const renderBucketHeader = (b: StageBucket, extra?: React.ReactNode) => (
    <StageBucketHeader
      label={b.label}
      status={b.stage?.status ?? null}
      startDate={b.stage?.startDate}
      endDate={b.stage?.endDate}
      count={b.photos.length}
      showMax={!b.deleted}
      extra={extra}
    />
  );

  const selectedPhotos = photos.filter((p) => selected.has(p.id));
  const bucketOptions = allBuckets.map((b) => ({ key: b.key, label: b.label }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFilesChosen} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFilesChosen} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Btn size="sm" variant="ghost" onClick={onBack} aria-label="חזרה לחדרים"><Icon n="arrow-right" s={16} /> חדרים</Btn>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text1)' }}>{room.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {floorLabel(room.floor)} · {roomTypeLabel(room.type)}{room.sizeSqm ? ` · ${room.sizeSqm} מ"ר` : ''} · {photos.length} תמונות
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canUpload && (
            <>
              <Btn className="mobile-only" onClick={() => { setUploadStageHint(null); cameraRef.current?.click(); }}><Icon n="camera" s={14} /> צלם</Btn>
              <Btn onClick={() => pickFiles()}><Icon n="upload-cloud" s={14} /> העלה תמונות</Btn>
            </>
          )}
          <Btn variant="outline" onClick={() => makePdf()} disabled={pdfBusy || filtered.length === 0}>
            <Icon n="file-text" s={14} /> {pdfBusy ? 'מפיק…' : 'דוח PDF'}
          </Btn>
        </div>
      </div>

      {/* View switch */}
      <div role="tablist" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {([['stages', 'לפי שלבים', 'layers'], ['grid', 'כל התמונות', 'image'], ['compare', 'לפני / אחרי', 'eye']] as const).map(([k, l, ic]) => (
          <button key={k} role="tab" aria-selected={view === k} type="button" onClick={() => setView(k)}
            style={{ background: 'none', border: 'none', borderBottom: `2px solid ${view === k ? 'var(--accent)' : 'transparent'}`, padding: '8px 12px', color: view === k ? 'var(--text1)' : 'var(--text2)', fontWeight: view === k ? 700 : 500, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
            <Icon n={ic} s={15} /> {l}
          </button>
        ))}
      </div>

      {/* Filters */}
      {photos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            <button type="button" style={chip(categoryFilter === 'all')} onClick={() => setCategoryFilter('all')}>כל הקטגוריות ({photos.length})</button>
            {ROOM_PHOTO_CATEGORIES.filter((c) => photos.some((p) => hasCategory(p, c))).map((c) => (
              <button key={c} type="button" style={chip(categoryFilter === c, ROOM_PHOTO_CATEGORY_COLORS[c])} onClick={() => setCategoryFilter(c)}>
                {categoryLabel(c)} ({photos.filter((p) => hasCategory(p, c)).length})
              </button>
            ))}
          </div>
          {view === 'grid' && bucketOptions.length > 1 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              <button type="button" style={chip(stageFilter === 'all')} onClick={() => setStageFilter('all')}>כל השלבים</button>
              {bucketOptions.map((b) => (
                <button key={b.key} type="button" style={chip(stageFilter === b.key)} onClick={() => setStageFilter(b.key)}>{b.label}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selection toolbar */}
      {canUpload && photos.length > 0 && view !== 'compare' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: selecting ? 'var(--accent-light)' : 'transparent', borderRadius: 10, padding: selecting ? '8px 10px' : 0 }}>
          {!selecting ? (
            <>
              <Btn size="sm" variant="outline" onClick={() => setSelecting(true)}><Icon n="check-square" s={13} /> בחירה מרובה</Btn>
              <Btn size="sm" variant="ghost" style={{ color: 'var(--danger)' }}
                onClick={() => setDeleteTarget({ ids: photos.map((p) => p.id), scope: 'כל תמונות החדר' })}>
                <Icon n="trash" s={13} /> מחק את כל תמונות החדר
              </Btn>
            </>
          ) : (
            <>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{selected.size} נבחרו</span>
              <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set(filtered.map((p) => p.id)))}>בחר הכל ({filtered.length})</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>נקה</Btn>
              <Btn size="sm" variant="outline" disabled={selected.size === 0 || pdfBusy} onClick={() => makePdf(selectedPhotos)}>
                <Icon n="file-text" s={13} /> PDF מהנבחרות
              </Btn>
              <Btn size="sm" disabled={selected.size === 0} style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={() => setDeleteTarget({ ids: selectedPhotos.map((p) => p.id), scope: 'תמונות נבחרות' })}>
                <Icon n="trash" s={13} /> מחק נבחרות
              </Btn>
              <Btn size="sm" variant="ghost" onClick={exitSelecting}>סיום</Btn>
            </>
          )}
        </div>
      )}

      {/* Empty room */}
      {photos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', border: '2px dashed var(--border)', borderRadius: 14, color: 'var(--text2)' }}>
          <Icon n="camera" s={32} />
          <div style={{ fontWeight: 700, marginTop: 8, color: 'var(--text1)' }}>עדיין אין תמונות בחדר הזה</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {canUpload ? `תעד את החדר לפי שלבי הבנייה — עד ${MAX_PHOTOS_PER_ROOM_STAGE} תמונות לכל שלב.` : 'טרם הועלו תמונות לחדר זה.'}
          </div>
          {canUpload && <div style={{ marginTop: 12 }}><Btn onClick={() => pickFiles()}><Icon n="upload-cloud" s={14} /> העלה תמונות</Btn></div>}
        </div>
      )}

      {/* View: by stages (timeline) */}
      {view === 'stages' && photos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, borderInlineStart: '2px solid var(--border)', paddingInlineStart: 16 }}>
          {filteredBuckets.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 13 }}>אין תמונות בקטגוריה זו.</div>}
          {filteredBuckets.map((b) => (
            <section key={b.key}>
              {renderBucketHeader(b, canUpload && !b.deleted && (bucketCounts[b.key] ?? 0) < MAX_PHOTOS_PER_ROOM_STAGE && (
                <Btn size="sm" variant="ghost" onClick={() => pickFiles(b.stage?.id ?? 'none')} aria-label={`הוסף תמונות לשלב ${b.label}`}>
                  <Icon n="plus" s={13} /> הוסף
                </Btn>
              ))}
              {b.photos.length > 0
                ? <div style={grid()}>{b.photos.map((p) => renderCard(p, b.photos))}</div>
                : <div style={{ fontSize: 13, color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                    אין עדיין תמונות בשלב זה.
                  </div>}
            </section>
          ))}
        </div>
      )}

      {/* View: grid */}
      {view === 'grid' && photos.length > 0 && (
        filtered.length === 0
          ? <div style={{ color: 'var(--text3)', fontSize: 13 }}>אין תמונות התואמות לסינון.</div>
          : <div style={grid()}>{filtered.map((p) => renderCard(p, filtered))}</div>
      )}

      {/* View: before / after compare */}
      {view === 'compare' && photos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allBuckets.length < 2 && (
            <div style={{ fontSize: 13, color: 'var(--text2)', background: 'var(--accent-light)', borderRadius: 8, padding: '8px 12px' }}>
              כרגע יש תמונות רק בשלב "{allBuckets[0]?.label}". כדי להשוות, בחר שלב נוסף והעלה אליו תמונות.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[{ value: compareLeft, set: setCompareLeft, title: 'לפני' }, { value: compareRight, set: setCompareRight, title: 'אחרי' }].map((col) => {
              const bucket = everyBucket.find((b) => b.key === col.value);
              const list = (bucket?.photos ?? []).filter((p) => categoryFilter === 'all' || p.category === categoryFilter);
              const canAddHere = canUpload && bucket && !bucket.deleted && (bucketCounts[bucket.key] ?? 0) < MAX_PHOTOS_PER_ROOM_STAGE;
              return (
                <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)' }}>{col.title}</div>
                  <select className="bp-input" value={col.value} onChange={(e) => col.set(e.target.value)} aria-label={`שלב ${col.title}`}>
                    {everyBucket.map((o) => (
                      <option key={o.key} value={o.key}>{o.label} ({o.photos.length})</option>
                    ))}
                  </select>
                  {list.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text3)', padding: 12, border: '1px dashed var(--border)', borderRadius: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                      אין תמונות{categoryFilter !== 'all' ? ' בקטגוריה זו' : ''} בשלב זה.
                      {canAddHere && (
                        <Btn size="sm" onClick={() => pickFiles(bucket!.stage?.id ?? 'none')}>
                          <Icon n="upload-cloud" s={13} /> העלה לשלב זה
                        </Btn>
                      )}
                    </div>
                  ) : (
                    <div style={grid(140)}>{list.map((p) => renderCard(p, list, true))}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {uploadFiles && (
        <UploadRoomPhotosModal
          files={uploadFiles}
          roomName={room.name}
          stages={stages}
          initialStageId={uploadStageHint === null ? defaultStageId(stages) : uploadStageHint === 'none' ? undefined : uploadStageHint}
          bucketCounts={{ ...bucketCounts, [NO_STAGE_KEY]: bucketCounts[NO_STAGE_KEY] ?? 0 }}
          onClose={() => setUploadFiles(null)}
          onUpload={doUpload}
        />
      )}
      {editing && (
        <EditRoomPhotoModal
          photo={editing}
          stages={stages}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            try {
              await updatePhoto({
                photoId: editing.id,
                description: patch.description,
                note: patch.note,
                category: patch.category,
                categories: patch.categories,
                isCover: patch.isCover,
                // Only send a stage change if it actually changed (keeps deleted-stage photos intact).
                ...((patch.stageId ?? null) !== (editing.stageId ?? null) && !(editing.stageDeleted && patch.stageId === null)
                  ? { stageId: patch.stageId }
                  : {}),
              });
              notify({ title: 'הפרטים נשמרו', kind: 'success' });
            } catch (err) {
              notify({ title: 'השמירה נכשלה', body: errMsg(err), kind: 'error' });
              throw err;
            }
          }}
        />
      )}
      {deleteTarget && (
        <DeleteRoomPhotosDialog
          count={deleteTarget.ids.length}
          roomName={room.name}
          scopeLabel={deleteTarget.scope}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => runDelete(deleteTarget.ids)}
        />
      )}
      {gallery && (
        <ImageGalleryViewer
          images={gallery.photos.map((p) => ({
            id: p.id,
            url: p.url!,
            title: p.description || categoryLabel(p.category),
            description: p.note,
            groupName: `${p.stageName ?? 'ללא שלב'} · ${categoryLabel(p.category)}`,
          }))}
          initialIndex={gallery.index}
          onClose={() => setGallery(null)}
          onSaveNote={canUpload ? async (_i, note, id) => {
            if (!id) return;
            await updatePhoto({ photoId: id as Id<'roomPhotos'>, note });
          } : undefined}
        />
      )}
    </div>
  );
};
