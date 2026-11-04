import * as React from 'react';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  floorLabel,
  MAX_PHOTOS_PER_ROOM_STAGE,
  ROOM_PHOTO_CATEGORIES,
  ROOM_PHOTO_CATEGORY_COLORS,
  type RoomPhotoCategory,
} from '../../../convex/_lib/roomArchiveShared';
import { Icon } from '../Shared';
import { ImageGalleryViewer } from '../ImageGalleryViewer';
import { sampleArt, type SampleArtKind } from '../teaser/sampleArt';
import { RoomCardView, roomGridStyle } from './RoomCardView';
import { PhotoCard, StageBucketHeader, grid } from './RoomDetail';
import { categoryLabel, groupPhotosByStage, photoBucketKey, type RoomPhoto, type RoomStage } from './roomArchiveUtils';

// ── Sample data (illustrative only, never saved) ─────────────────────────────

const STAGES: RoomStage[] = [
  { id: 'st-frame' as Id<'stages'>, name: 'שלד', sortOrder: 1, status: 'done', startDate: '2026-02-01', endDate: '2026-03-30' },
  { id: 'st-raw' as Id<'stages'>, name: 'מערכות גולמיות', sortOrder: 2, status: 'active', startDate: '2026-05-01', endDate: '2026-06-15' },
  { id: 'st-plaster' as Id<'stages'>, name: 'טיח', sortOrder: 3, status: 'pending', startDate: '2026-06-16', endDate: '2026-07-20' },
];

let seq = 0;
const photo = (
  stage: number,
  art: SampleArtKind,
  category: RoomPhotoCategory,
  description: string,
  note: string,
  takenOn: string,
): RoomPhoto => ({
  id: `demo-${++seq}` as Id<'roomPhotos'>,
  url: sampleArt(art),
  originalName: `${art}.jpg`,
  category,
  categories: [category],
  isCover: false,
  description,
  note,
  stageId: STAGES[stage].id,
  stageDeleted: false,
  stageName: STAGES[stage].name,
  takenOn,
  uploadedAt: 0,
  updatedAt: null,
  uploaderName: 'נתוני דוגמה',
});

const ROOMS = [
  {
    key: 'kitchen', name: 'מטבח', typeLabel: 'מטבח', size: 18, cover: 'pipes' as SampleArtKind,
    photos: [
      photo(0, 'frame', 'general', 'עמודים וקורות לפני יציקת תקרה', 'ברזל הזיון נבדק ע"י המפקח', '2026-03-02'),
      photo(1, 'pipes', 'plumbing', 'צנרת מים בקיר הכיור', 'קר מימין, חם משמאל. 40 ס"מ מהרצפה', '2026-05-14'),
      photo(1, 'wires', 'electrical', 'שרוולים ושקעים מעל המשטח', '3 נקודות כוח + נקודת תאורה', '2026-05-16'),
    ],
  },
  {
    key: 'living', name: 'סלון', typeLabel: 'סלון', size: 35, cover: 'frame' as SampleArtKind,
    photos: [
      photo(0, 'frame', 'general', 'חלל הסלון בשלב השלד', 'פתח ליציאה למרפסת — 2.4 מ\'', '2026-03-05'),
      photo(1, 'wires', 'electrical', 'נקודות חשמל לקיר הטלוויזיה', 'שרוול ריק נוסף לכבל HDMI', '2026-05-20'),
    ],
  },
  {
    key: 'bath', name: 'חדר רחצה', typeLabel: 'חדר אמבטיה', size: 9, cover: 'wires' as SampleArtKind,
    photos: [
      photo(1, 'pipes', 'plumbing', 'הכנה למקלחון ולכיור', 'ניקוז רצפה במרכז החדר', '2026-05-22'),
      photo(1, 'wires', 'electrical', 'חשמל לדוד ולתאורה', 'מפסק דוד מחוץ לחדר', '2026-05-23'),
    ],
  },
];

const noop = () => {};

const chip = (active: boolean, color?: string): React.CSSProperties => ({
  border: `1px solid ${active ? (color ?? 'var(--accent)') : 'var(--border)'}`,
  background: active ? (color ? `${color}1a` : 'var(--accent-light)') : 'var(--surface)',
  color: active ? (color ?? 'var(--accent)') : 'var(--text2)',
  borderRadius: 999, padding: '5px 12px', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
});

type View = 'stages' | 'grid' | 'compare';

/**
 * Interactive demo of the rooms tab with sample data. Built from the same
 * components as the real feature (room cards, photo cards, stage headers,
 * gallery) — but read-only: nothing is uploaded, edited or saved.
 */
export const RoomsArchivePreview = () => {
  const [roomKey, setRoomKey] = React.useState(ROOMS[0].key);
  const [view, setView] = React.useState<View>('compare');
  const [category, setCategory] = React.useState<RoomPhotoCategory | 'all'>('all');
  const [left, setLeft] = React.useState<string>(STAGES[0].id);
  const [right, setRight] = React.useState<string>(STAGES[1].id);
  const [gallery, setGallery] = React.useState<{ photos: RoomPhoto[]; index: number } | null>(null);

  const room = ROOMS.find((r) => r.key === roomKey)!;
  const filtered = room.photos.filter((p) => category === 'all' || p.category === category);
  const buckets = groupPhotosByStage(filtered, STAGES, category === 'all');
  const allBuckets = groupPhotosByStage(room.photos, STAGES, true);

  const card = (p: RoomPhoto, list: RoomPhoto[], compact = false) => (
    <PhotoCard
      key={p.id}
      photo={p}
      compact={compact}
      canUpload={false}
      selected={false}
      selecting={false}
      onToggleSelect={noop}
      onOpen={() => setGallery({ photos: list, index: list.findIndex((x) => x.id === p.id) })}
      onEdit={noop}
      onDelete={noop}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Room list */}
      <section>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text3)', margin: '0 0 10px 0' }}>{floorLabel(0)} · בחר חדר</h3>
        <div style={{ ...roomGridStyle, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {ROOMS.map((r) => (
            <div
              key={r.key}
              style={{ borderRadius: 16, outline: r.key === roomKey ? '2px solid var(--accent)' : 'none', outlineOffset: 2 }}
            >
              <RoomCardView
                name={r.name}
                typeLabel={r.typeLabel}
                photoCount={r.photos.length}
                coverUrl={sampleArt(r.cover)}
                onClick={() => { setRoomKey(r.key); setCategory('all'); }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Selected room */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--surface)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text1)' }}>{room.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{floorLabel(0)} · {room.typeLabel} · {room.size} מ"ר · {room.photos.length} תמונות</div>
        </div>

        <div role="tablist" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {([['stages', 'לפי שלבים', 'layers'], ['grid', 'כל התמונות', 'image'], ['compare', 'לפני / אחרי', 'eye']] as const).map(([k, l, ic]) => (
            <button key={k} role="tab" type="button" aria-selected={view === k} onClick={() => setView(k)}
              style={{ background: 'none', border: 'none', borderBottom: `2px solid ${view === k ? 'var(--accent)' : 'transparent'}`, padding: '8px 12px', color: view === k ? 'var(--text1)' : 'var(--text2)', fontWeight: view === k ? 700 : 500, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap', fontSize: 14 }}>
              <Icon n={ic} s={15} /> {l}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          <button type="button" style={chip(category === 'all')} onClick={() => setCategory('all')}>כל הקטגוריות ({room.photos.length})</button>
          {ROOM_PHOTO_CATEGORIES.filter((c) => room.photos.some((p) => p.category === c)).map((c) => (
            <button key={c} type="button" style={chip(category === c, ROOM_PHOTO_CATEGORY_COLORS[c])} onClick={() => setCategory(c)}>
              {categoryLabel(c)} ({room.photos.filter((p) => p.category === c).length})
            </button>
          ))}
        </div>

        {view === 'stages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, borderInlineStart: '2px solid var(--border)', paddingInlineStart: 14 }}>
            {buckets.map((b) => (
              <section key={b.key}>
                <StageBucketHeader label={b.label} status={b.stage?.status ?? null} startDate={b.stage?.startDate} endDate={b.stage?.endDate} count={b.photos.length} />
                {b.photos.length > 0
                  ? <div style={grid(150)}>{b.photos.map((p) => card(p, b.photos))}</div>
                  : <div style={{ fontSize: 13, color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: 10, padding: '10px 12px' }}>אין עדיין תמונות בשלב זה.</div>}
              </section>
            ))}
          </div>
        )}

        {view === 'grid' && <div style={grid(150)}>{filtered.map((p) => card(p, filtered))}</div>}

        {view === 'compare' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[{ value: left, set: setLeft, title: 'לפני' }, { value: right, set: setRight, title: 'אחרי' }].map((col) => {
              const bucket = allBuckets.find((b) => b.key === col.value);
              const list = (bucket?.photos ?? []).filter((p) => category === 'all' || p.category === category);
              return (
                <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)' }}>{col.title}</div>
                  <select className="bp-input" value={col.value} onChange={(e) => col.set(e.target.value)} aria-label={`שלב ${col.title}`}>
                    {allBuckets.map((o) => <option key={o.key} value={o.key}>{o.label} ({o.photos.length})</option>)}
                  </select>
                  {list.length === 0
                    ? <div style={{ fontSize: 13, color: 'var(--text3)', padding: 12, border: '1px dashed var(--border)', borderRadius: 10, textAlign: 'center' }}>אין תמונות בשלב זה.</div>
                    : <div style={grid(140)}>{list.map((p) => card(p, list, true))}</div>}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          עד {MAX_PHOTOS_PER_ROOM_STAGE} תמונות לחדר בכל שלב · {room.photos.filter((p) => photoBucketKey(p) === STAGES[1].id).length} תמונות בשלב הנוכחי
        </div>
      </div>

      {gallery && (
        <ImageGalleryViewer
          images={gallery.photos.map((p) => ({
            id: p.id,
            url: p.url!,
            title: p.description,
            description: p.note,
            groupName: `${p.stageName} · ${categoryLabel(p.category)} · נתוני דוגמה`,
          }))}
          initialIndex={Math.max(0, gallery.index)}
          onClose={() => setGallery(null)}
        />
      )}
    </div>
  );
};
