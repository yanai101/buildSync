import * as React from 'react';
import { Modal, Btn, Icon } from '../Shared';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_PHOTOS_PER_ROOM_STAGE,
  ROOM_PHOTO_CATEGORIES,
  ROOM_PHOTO_CATEGORY_COLORS,
  ROOM_PHOTO_CATEGORY_LABELS,
  type RoomPhotoCategory,
} from '../../../convex/_lib/roomArchiveShared';
import type { RoomPhoto, RoomStage } from './roomArchiveUtils';
import { NO_STAGE_KEY } from './roomArchiveUtils';

const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'block' };

// ── Stage + category pickers ────────────────────────────────────────────────

export const StageSelect = ({
  stages, value, onChange, counts,
}: {
  stages: RoomStage[];
  value: Id<'stages'> | undefined;
  onChange: (v: Id<'stages'> | undefined) => void;
  counts?: Record<string, number>;
}) => (
  <select
    className="bp-input"
    value={value ?? NO_STAGE_KEY}
    onChange={(e) => onChange(e.target.value === NO_STAGE_KEY ? undefined : (e.target.value as Id<'stages'>))}
  >
    {stages.map((s) => {
      const used = counts?.[s.id] ?? 0;
      return (
        <option key={s.id} value={s.id}>
          {s.name}{s.status === 'active' ? ' (בביצוע)' : ''}{counts ? ` · ${used}/${MAX_PHOTOS_PER_ROOM_STAGE}` : ''}
        </option>
      );
    })}
    <option value={NO_STAGE_KEY}>
      ללא שלב{counts ? ` · ${counts[NO_STAGE_KEY] ?? 0}/${MAX_PHOTOS_PER_ROOM_STAGE}` : ''}
    </option>
  </select>
);

export const CategorySelect = ({ value, onChange }: { value: RoomPhotoCategory; onChange: (v: RoomPhotoCategory) => void }) => (
  <select className="bp-input" value={value} onChange={(e) => onChange(e.target.value as RoomPhotoCategory)}>
    {ROOM_PHOTO_CATEGORIES.map((c) => (
      <option key={c} value={c}>{ROOM_PHOTO_CATEGORY_LABELS[c]}</option>
    ))}
  </select>
);

export const CategoryMultiSelect = ({
  value,
  onChange,
}: {
  value: RoomPhotoCategory[];
  onChange: (v: RoomPhotoCategory[]) => void;
}) => {
  const toggle = (cat: RoomPhotoCategory) => {
    if (value.includes(cat)) {
      if (value.length === 1) return; // Keep at least one category selected
      onChange(value.filter((c) => c !== cat));
    } else {
      onChange([...value, cat]);
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {ROOM_PHOTO_CATEGORIES.map((c) => {
        const active = value.includes(c);
        const col = ROOM_PHOTO_CATEGORY_COLORS[c];
        return (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            style={{
              all: 'unset',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              border: `1.5px solid ${active ? col : 'var(--border)'}`,
              background: active ? `${col}22` : 'var(--surface-2)',
              color: active ? col : 'var(--text2)',
              boxShadow: active ? `0 0 0 1px ${col}44` : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0 }} />
            {ROOM_PHOTO_CATEGORY_LABELS[c]}
            {active && <Icon n="check" s={11} />}
          </button>
        );
      })}
    </div>
  );
};

// ── Upload modal ────────────────────────────────────────────────────────────

type StagedItem = {
  id: string;
  file: File;
  category: RoomPhotoCategory;
  categories: RoomPhotoCategory[];
  isCover?: boolean;
  description: string;
  note: string;
};

export const UploadRoomPhotosModal = ({
  files, roomName, stages, initialStageId, bucketCounts, onClose, onUpload,
}: {
  files: File[];
  roomName: string;
  stages: RoomStage[];
  initialStageId: Id<'stages'> | undefined;
  bucketCounts: Record<string, number>;
  onClose: () => void;
  onUpload: (stageId: Id<'stages'> | undefined, items: StagedItem[], onProgress: (done: number) => void) => Promise<void>;
}) => {
  const [stageId, setStageId] = React.useState<Id<'stages'> | undefined>(initialStageId);
  const [items, setItems] = React.useState<StagedItem[]>(() =>
    files.map((file, i) => ({
      id: `${i}-${file.name}`,
      file,
      category: 'general',
      categories: ['general'],
      isCover: false,
      description: '',
      note: '',
    })),
  );
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(0);

  // Preview URLs are created inside the effect (not in state initialisers) so
  // React StrictMode's mount → unmount → mount cycle can't leave the <img>
  // pointing at an already-revoked blob URL.
  const [previews, setPreviews] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    const map: Record<string, string> = {};
    files.forEach((file, i) => { map[`${i}-${file.name}`] = URL.createObjectURL(file); });
    setPreviews(map);
    return () => Object.values(map).forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const remaining = MAX_PHOTOS_PER_ROOM_STAGE - (bucketCounts[stageId ?? NO_STAGE_KEY] ?? 0);
  const overLimit = items.length > remaining;

  const update = (id: string, patch: Partial<StagedItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const setAllCategories = (cats: RoomPhotoCategory[]) =>
    setItems((prev) => prev.map((it) => ({ ...it, categories: cats, category: cats[0] ?? 'general' })));

  const submit = async () => {
    if (busy || overLimit || items.length === 0) return;
    setBusy(true);
    try {
      await onUpload(stageId, items, setDone);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={busy ? () => {} : onClose} title={`העלאת תמונות · ${roomName}`} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 10, padding: 10 }}>
            <span style={{ ...label, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon n="layers" s={14} /> לאיזה שלב בנייה שייכות התמונות?</span>
            <StageSelect stages={stages} value={stageId} onChange={setStageId} counts={bucketCounts} />
          </div>
          {items.length > 1 && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
              <span style={label}>קטגוריות לכל התמונות (ניתן לבחור יותר מאחת)</span>
              <CategoryMultiSelect value={items[0].categories} onChange={setAllCategories} />
            </div>
          )}
        </div>

        {overLimit && (
          <div role="alert" style={{ background: 'var(--danger-light, #fee2e2)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
            בשלב זה נותרו {Math.max(remaining, 0)} מקומות פנויים (מקסימום {MAX_PHOTOS_PER_ROOM_STAGE} תמונות לחדר בכל שלב). הסר תמונות או בחר שלב אחר.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '50vh', overflowY: 'auto' }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: 12, border: '1px solid var(--border)', borderRadius: 12, padding: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 96, height: 96, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--text3)' }}>
                {previews[it.id]
                  ? <img src={previews[it.id]} alt={it.file.name} width={96} height={96} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <Icon n="image" s={24} />}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>
                    קטגוריות (ניתן לבחור כמה ביחד):
                  </span>
                  <CategoryMultiSelect
                    value={it.categories}
                    onChange={(cats) => update(it.id, { categories: cats, category: cats[0] ?? 'general' })}
                  />
                </div>
                <input
                  className="bp-input"
                  placeholder="תיאור קצר (למשל: צנרת מים וחשמל בקיר המזרחי)"
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  value={it.description}
                  onChange={(e) => update(it.id, { description: e.target.value })}
                />
                <textarea
                  className="bp-input"
                  placeholder="הערות"
                  rows={2}
                  maxLength={MAX_NOTE_LENGTH}
                  value={it.note}
                  onChange={(e) => update(it.id, { note: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: it.isCover ? '#d97706' : 'var(--text3)', marginTop: 2 }}>
                  <input
                    type="checkbox"
                    checked={!!it.isCover}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setItems((prev) => prev.map((x) => ({ ...x, isCover: x.id === it.id ? checked : false })));
                    }}
                    style={{ accentColor: '#f59e0b' }}
                  />
                  <Icon n="star" s={13} fill={it.isCover ? '#f59e0b' : 'none'} c={it.isCover ? '#f59e0b' : 'currentColor'} />
                  <span>קבע כתמונת חדר ראשית (בכרטיס החדר)</span>
                </label>
              </div>
              {!busy && (
                <button type="button" aria-label="הסר תמונה" onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
                  <Icon n="x" s={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
          {busy && <span style={{ fontSize: 13, color: 'var(--text2)' }}>מעלה {done}/{items.length}…</span>}
          <Btn variant="ghost" onClick={onClose} disabled={busy}>ביטול</Btn>
          <Btn onClick={submit} disabled={busy || overLimit || items.length === 0}>
            <Icon n="upload-cloud" s={14} /> העלה {items.length} תמונות
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

export type { StagedItem };

// ── Edit modal ──────────────────────────────────────────────────────────────

export const EditRoomPhotoModal = ({
  photo, stages, onClose, onSave,
}: {
  photo: RoomPhoto;
  stages: RoomStage[];
  onClose: () => void;
  onSave: (patch: { description: string; note: string; category: RoomPhotoCategory; categories: RoomPhotoCategory[]; isCover: boolean; stageId: Id<'stages'> | null }) => Promise<void>;
}) => {
  const [description, setDescription] = React.useState(photo.description);
  const [note, setNote] = React.useState(photo.note);
  const [categories, setCategories] = React.useState<RoomPhotoCategory[]>(
    photo.categories && photo.categories.length > 0 ? photo.categories : [photo.category],
  );
  const [isCover, setIsCover] = React.useState<boolean>(!!photo.isCover);
  const [stageId, setStageId] = React.useState<Id<'stages'> | undefined>(photo.stageId ?? undefined);
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onSave({
        description,
        note,
        category: categories[0] ?? 'general',
        categories,
        isCover,
        stageId: stageId ?? null,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} title="עריכת פרטי תמונה" width={540}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {photo.url && (
          <img src={photo.url} alt={photo.description || 'תמונת חדר'} style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 10, background: 'var(--surface-2)' }} />
        )}
        <div>
          <span style={label}>קטגוריות (ניתן לבחור יותר מאחת, למשל: חשמל ואינסטלציה יחד)</span>
          <CategoryMultiSelect value={categories} onChange={setCategories} />
        </div>
        <div>
          <span style={label}>שלב בנייה</span>
          <StageSelect stages={stages} value={stageId} onChange={setStageId} />
          {photo.stageDeleted && stageId === undefined && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>השלב המקורי ("{photo.stageName}") נמחק</div>
          )}
        </div>
        <div>
          <span style={label}>תיאור קצר</span>
          <input className="bp-input" maxLength={MAX_DESCRIPTION_LENGTH} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <span style={label}>הערות</span>
          <textarea className="bp-input" rows={4} maxLength={MAX_NOTE_LENGTH} value={note} onChange={(e) => setNote(e.target.value)} style={{ resize: 'vertical' }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '8px 12px', background: isCover ? 'var(--accent-light)' : 'var(--surface-2)', borderRadius: 8, border: `1px solid ${isCover ? 'var(--accent)' : 'var(--border)'}`, color: 'var(--text1)' }}>
          <input
            type="checkbox"
            checked={isCover}
            onChange={(e) => setIsCover(e.target.checked)}
            style={{ accentColor: '#f59e0b' }}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <Icon n="star" s={15} fill={isCover ? '#f59e0b' : 'none'} c={isCover ? '#f59e0b' : 'currentColor'} />
            הגדר כתמונת חדר ראשית (תוצג בכרטיס החדר בארכיון)
          </span>
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>ביטול</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'שומר…' : 'שמור'}</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ── Delete confirmation ─────────────────────────────────────────────────────

export const DeleteRoomPhotosDialog = ({
  count, roomName, scopeLabel, onClose, onConfirm,
}: {
  count: number;
  roomName: string;
  scopeLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) => {
  const [ack, setAck] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const needsAck = count > 1;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={busy ? () => {} : onClose} title="מחיקת תמונות לצמיתות" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--danger)', flexShrink: 0 }}><Icon n="alert" s={28} /></div>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text1)' }}>
            פעולה זו תמחק לצמיתות <b>{count === 1 ? 'תמונה אחת' : `${count} תמונות`}</b> מ"{roomName}"{scopeLabel ? ` (${scopeLabel})` : ''}.
            <br />
            לא ניתן יהיה לשחזר אותן, וכל תיעוד של מה שהיה בחדר בשלב זה (למשל צנרת או חשמל לפני סגירת קירות) יאבד.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-light)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text2)' }}>
          <Icon n="info" s={15} c="var(--accent)" /> מומלץ להפיק דוח PDF של החדר או לייצא את הפרויקט לפני המחיקה.
        </div>
        {needsAck && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            אני מבין שהמחיקה סופית
          </label>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>ביטול</Btn>
          <Btn
            onClick={confirm}
            disabled={busy || (needsAck && !ack)}
            style={{ background: 'var(--danger)', color: '#fff' }}
          >
            <Icon n="trash" s={14} /> {busy ? 'מוחק…' : 'מחק לצמיתות'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};
