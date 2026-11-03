import * as React from 'react';
import { Icon } from '../Shared';
import { sampleArt, type SampleArtKind } from '../teaser/sampleArt';

// Faithful previews of the archive's Photos and Documents tabs with sample
// data — same layout/styles as PersonalFilesScreen's renderSection/renderDocCard.

const box: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--surface)',
  display: 'flex', flexDirection: 'column', gap: 12,
};

const fakeInput: React.CSSProperties = {
  flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, padding: '7px 10px', color: 'var(--text1)',
  border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)',
};

const iconBtn: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32,
  color: 'var(--text1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

type SampleImage = { art: SampleArtKind; name: string; note?: string };

const Group = ({ name, images }: { name: string; images: SampleImage[] }) => (
  <div style={box}>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
      <span style={iconBtn}><span style={{ transform: 'rotate(180deg)', display: 'flex' }}><Icon n="chevron-down" s={16} /></span></span>
      <input type="checkbox" readOnly tabIndex={-1} style={{ width: 18, height: 18, flexShrink: 0 }} />
      <div style={fakeInput}>{name}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <Icon n="camera" s={13} /><span>{images.length}</span>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: 14, paddingInlineStart: 26 }}>
      {images.map((img) => (
        <div key={img.name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <img src={sampleArt(img.art)} alt="" loading="lazy" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: 'var(--text1)' }}>{img.name}</div>
            <input type="checkbox" readOnly tabIndex={-1} style={{ width: 15, height: 15, flexShrink: 0 }} />
          </div>
          {img.note && (
            <div style={{ fontSize: 12, color: 'var(--text1)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <Icon n="file-text" s={13} c="var(--accent)" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.note}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

export const ArchiveImagesPreview = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ fontSize: 13, color: 'var(--text2)' }}>סמן תמונות להפקת דוח מרוכז</div>
    <Group
      name="תשתיות לפני סגירת קירות"
      images={[
        { art: 'pipes', name: 'צנרת_מטבח.jpg', note: 'מים חמים/קרים — קיר מזרחי' },
        { art: 'wires', name: 'חשמל_סלון.jpg', note: 'שרוולים לנקודות טלוויזיה' },
      ]}
    />
    <Group
      name="שלד ויציקות"
      images={[
        { art: 'frame', name: 'תקרה_קומה_א.jpg', note: 'לפני יציקה — אושר ע"י מפקח' },
      ]}
    />
  </div>
);

const SAMPLE_DOCS = [
  { name: 'היתר_בנייה_חתום.pdf', meta: '4.2MB → 3.1MB · נחסכו 26% · הועלה 12.1.2026', note: 'כולל נספח תנועה ותכנית פיתוח' },
  { name: 'חוזה_קבלן_ראשי.pdf', meta: '1.8MB → 1.2MB · נחסכו 33% · הועלה 3.2.2026', note: 'סעיף 14 — לוח תשלומים לפי אבני דרך' },
  { name: 'תכנית_חשמל_מאושרת.pdf', meta: '2.6MB → 2.0MB · נחסכו 23% · הועלה 20.4.2026', note: '' },
];

export const ArchiveDocsPreview = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {SAMPLE_DOCS.map((d) => (
      <div key={d.name} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon n="file-text" s={18} c="var(--text2)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{d.meta}</div>
          </div>
          <span style={{ padding: 6, color: 'var(--text2)', display: 'flex' }}><Icon n="eye" s={16} /></span>
          <span style={{ padding: 6, color: 'var(--text2)', display: 'flex' }}><Icon n="download" s={16} /></span>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, minHeight: 44, color: d.note ? 'var(--text1)' : 'var(--text3)', background: 'var(--surface)' }}>
          {d.note || 'הוסף הערה לקובץ...'}
        </div>
      </div>
    ))}
  </div>
);
