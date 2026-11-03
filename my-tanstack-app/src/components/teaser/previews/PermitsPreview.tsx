import * as React from 'react';
import { Btn, Icon, Modal } from '../../Shared';
import { demoProject } from '../demoProject';

type DemoPermit = (typeof demoProject.permits)[number];

/**
 * Interactive preview of PermitsScreen powered by `demoProject`.
 * Mirrors PermitCard: authority input with datalist, editable notes, and document preview modal.
 */
export const PermitsPreview = () => {
  const [permits, setPermits] = React.useState<DemoPermit[]>(() => structuredClone(demoProject.permits));
  const [previewPermit, setPreviewPermit] = React.useState<DemoPermit | null>(null);

  const updateField = (id: string, field: 'authority' | 'notes', value: string) => {
    setPermits((prev) => prev.map((p) => (p._id === id ? { ...p, [field]: value } : p)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <datalist id="demo-authorities-list">
        <option value="עירייה - ועדה מקומית" />
        <option value="חברת חשמל" />
        <option value="תאגיד מים וביוב" />
        <option value="כיבוי אש" />
        <option value="פיקוד העורף" />
        <option value="הג״א" />
      </datalist>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {permits.map((permit) => (
          <div
            key={permit._id}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 14,
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ background: 'var(--accent-light)', width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                <Icon n="file-text" s={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{permit.title}</div>
                <input
                  list="demo-authorities-list"
                  aria-label={`רשות עבור ${permit.title}`}
                  className="bp-input"
                  value={permit.authority}
                  onChange={(e) => updateField(permit._id, 'authority', e.target.value)}
                  style={{ width: '100%', fontSize: 12, padding: '4px 8px', marginTop: 4, height: 28 }}
                />
              </div>
            </div>

            <textarea
              aria-label={`הערות עבור ${permit.title}`}
              className="bp-input"
              value={permit.notes}
              onChange={(e) => updateField(permit._id, 'notes', e.target.value)}
              rows={2}
              style={{ width: '100%', resize: 'vertical', fontSize: 12, padding: '6px 10px', borderRadius: 8, background: 'var(--bg)' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>אושר: {permit.approvedDate}</span>
              <Btn size="sm" variant="secondary" onClick={() => setPreviewPermit(permit)}>
                <Icon n="eye" s={14} /> צפה במסמך
              </Btn>
            </div>
          </div>
        ))}
      </div>

      {previewPermit && (
        <Modal title={`צפייה במסמך (נתוני דוגמה) — ${previewPermit.title}`} onClose={() => setPreviewPermit(null)} maxWidth={560}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 8 }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text1)' }}>{previewPermit.authority}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>פרויקט: {demoProject.name} · {demoProject.address}</div>
                </div>
                <span style={{ background: 'var(--success-light)', color: 'var(--success)', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 999 }}>
                  אושר · {previewPermit.approvedDate}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.6 }}>{previewPermit.notes}</div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon n="file-text" s={14} /> קובץ מצורף: {previewPermit.fileName}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
