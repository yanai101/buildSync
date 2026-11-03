import { ROOM_PHOTO_CATEGORIES } from '../../../convex/_lib/roomArchiveShared';
import { floorLabel } from '../../../convex/_lib/roomArchiveShared';
import {
  categoryLabel,
  formatDate,
  groupPhotosByStage,
  roomTypeLabel,
  type RoomPhoto,
  type RoomStage,
} from './roomArchiveUtils';

type ReportRoom = { name: string; type: string; floor: number; sizeSqm?: number };

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration> = {},
  text?: string,
) => {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text; // textContent: never inject HTML
  return node;
};

/** Fetches an image into a same-origin object URL so html2canvas can draw it. */
const toObjectUrl = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('טעינת תמונה לדוח נכשלה');
  return URL.createObjectURL(await res.blob());
};

/**
 * Builds and downloads a printable A4 PDF for one room: photos grouped by
 * construction stage, then by category, each with description and notes.
 */
export async function generateRoomPdfReport(opts: {
  projectName: string;
  room: ReportRoom;
  photos: RoomPhoto[];
  stages: RoomStage[];
}) {
  const { projectName, room, photos, stages } = opts;
  const objectUrls: string[] = [];

  try {
    const container = el('div', { padding: '20px', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif', color: '#222' });

    const header = el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' });
    const brand = el('div', { fontSize: '26px', fontWeight: '800', color: '#F59E0B' }, 'BuildSync');
    const logo = el('img', { width: '48px', height: '48px', objectFit: 'contain' });
    logo.src = '/logo.png';
    await new Promise((resolve) => { logo.onload = resolve; logo.onerror = resolve; });
    header.append(brand, logo);
    container.append(header, el('hr', { border: 'none', borderTop: '2px solid #eee', margin: '0 0 16px 0' }));

    container.append(el('h2', { textAlign: 'center', margin: '0 0 6px 0', fontSize: '22px' }, `דוח תיעוד חדר: ${room.name}`));
    const meta = [
      `פרויקט: ${projectName}`,
      floorLabel(room.floor),
      roomTypeLabel(room.type),
      room.sizeSqm ? `${room.sizeSqm} מ"ר` : '',
      `הופק: ${new Date().toLocaleDateString('he-IL')}`,
      `${photos.length} תמונות`,
    ].filter(Boolean).join(' · ');
    container.append(el('div', { textAlign: 'center', fontSize: '13px', color: '#666', marginBottom: '24px' }, meta));

    const buckets = groupPhotosByStage(photos, stages);
    for (const bucket of buckets) {
      const stageBlock = el('div', { marginBottom: '24px' });
      const dates = bucket.stage ? ` (${formatDate(bucket.stage.startDate)} – ${formatDate(bucket.stage.endDate)})` : '';
      stageBlock.append(el('h3', {
        fontSize: '18px', margin: '0 0 12px 0', padding: '6px 10px', background: '#FEF3C7',
        borderRight: '4px solid #F59E0B', borderRadius: '4px',
      }, `שלב: ${bucket.label}${dates}`));

      for (const category of ROOM_PHOTO_CATEGORIES) {
        const items = bucket.photos.filter((p) => p.category === category);
        if (items.length === 0) continue;
        stageBlock.append(el('div', { fontSize: '14px', fontWeight: '700', color: '#444', margin: '8px 0' }, categoryLabel(category)));

        const grid = el('div', { display: 'flex', flexWrap: 'wrap', gap: '12px' });
        for (const p of items) {
          if (!p.url) continue;
          const objectUrl = await toObjectUrl(p.url);
          objectUrls.push(objectUrl);
          const box = el('div', { width: 'calc(50% - 6px)', display: 'flex', flexDirection: 'column', gap: '4px', pageBreakInside: 'avoid' });
          const img = el('img', { width: '100%', height: '230px', objectFit: 'contain', background: '#f9fafb', borderRadius: '6px' });
          img.src = objectUrl;
          await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
          box.append(img);
          if (p.description) box.append(el('div', { fontSize: '13px', fontWeight: '700' }, p.description));
          if (p.note) box.append(el('div', { fontSize: '12px', color: '#444', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'pre-wrap' }, p.note));
          box.append(el('div', { fontSize: '11px', color: '#888' }, [formatDate(p.takenOn ?? p.uploadedAt), p.uploaderName].filter(Boolean).join(' · ')));
          grid.append(box);
        }
        stageBlock.append(grid);
      }
      container.append(stageBlock);
    }

    const html2pdf = (await import('html2pdf.js')).default;
    const safeName = room.name.replace(/[\\/:*?"<>|]/g, '_');
    await html2pdf().from(container).set({
      margin: 12,
      filename: `דוח_חדר_${safeName}.pdf`,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    } as any).save();
  } finally {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
  }
}
