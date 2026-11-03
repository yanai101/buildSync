import * as React from 'react';
import { Badge, Icon } from '../../Shared';
import { ImageGalleryViewer } from '../../ImageGalleryViewer';
import { demoProject } from '../demoProject';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Interactive preview of DailyLogsScreen powered by `demoProject`.
 * Users can switch between the daily log view (3 dates) and the history view
 * with status/issue filters, and open site photos in the gallery viewer.
 */
export const DailyLogsPreview = () => {
  const [activeTab, setActiveTab] = React.useState<'log' | 'history'>('log');
  const [selectedId, setSelectedId] = React.useState<string>(demoProject.dailyLogs[0]._id);
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'locked' | 'draft'>('all');
  const [galleryIndex, setGalleryIndex] = React.useState<number | null>(null);

  const currentLog = demoProject.dailyLogs.find((l) => l._id === selectedId) ?? demoProject.dailyLogs[0];
  const totalWorkers = currentLog.workforce.reduce((sum, w) => sum + w.count, 0);

  const filteredHistory = demoProject.dailyLogs.filter((l) => {
    if (filterStatus === 'locked' && l.status !== 'locked') return false;
    if (filterStatus === 'draft' && l.status === 'locked') return false;
    return true;
  });

  const sectionHeader = (title: string, icon: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text1)' }}>
      <Icon n={icon} s={15} c="var(--accent)" />
      {title}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top tab toggle + date selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div role="tablist" aria-label="תצוגת יומן עבודה" style={{ display: 'flex', background: 'var(--surface)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'log'}
            onClick={() => setActiveTab('log')}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: activeTab === 'log' ? 'var(--accent)' : 'transparent', color: activeTab === 'log' ? '#fff' : 'var(--text2)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            יומן יומי
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: activeTab === 'history' ? 'var(--accent)' : 'transparent', color: activeTab === 'history' ? '#fff' : 'var(--text2)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            היסטוריית יומנים ({demoProject.dailyLogs.length})
          </button>
        </div>

        {activeTab === 'log' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>בחר תאריך לדוגמה:</span>
            {demoProject.dailyLogs.map((l) => {
              const active = l._id === currentLog._id;
              return (
                <button
                  key={l._id}
                  type="button"
                  onClick={() => setSelectedId(l._id)}
                  style={{
                    padding: '6px 11px',
                    borderRadius: 8,
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-light)' : 'var(--surface)',
                    color: active ? 'var(--text1)' : 'var(--text2)',
                    fontWeight: active ? 700 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {fmtDate(l.date)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeTab === 'history' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {[
              { label: 'סה"כ יומנים', val: demoProject.dailyLogs.length, color: 'var(--text1)' },
              { label: 'דוחות נעולים', val: demoProject.dailyLogs.filter((l) => l.status === 'locked').length, color: 'var(--success)' },
              { label: 'יומנים עם חריגות', val: demoProject.dailyLogs.filter((l) => l.issues.length > 0).length, color: 'var(--warning)' },
            ].map((s) => (
              <div key={s.label} className="card" style={{ padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              ['all', 'כל היומנים'],
              ['locked', 'דוחות נעולים'],
              ['draft', 'טיוטות'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterStatus(key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${filterStatus === key ? 'var(--accent)' : 'var(--border)'}`,
                  background: filterStatus === key ? 'var(--accent-light)' : 'var(--surface)',
                  color: filterStatus === key ? 'var(--text1)' : 'var(--text2)',
                  fontSize: 12,
                  fontWeight: filterStatus === key ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredHistory.map((l) => (
            <button
              key={l._id}
              type="button"
              onClick={() => {
                setSelectedId(l._id);
                setActiveTab('log');
              }}
              className="card"
              style={{
                padding: 14,
                textAlign: 'right',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                width: '100%',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>
                  יומן עבודה — {fmtDate(l.date)} · {l.weather} ({l.temperature}°C)
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                  {l.activities[0]?.description}
                </div>
              </div>
              <Badge type={l.status === 'locked' ? 'done' : 'pending'}>
                {l.status === 'locked' ? 'דוח נעול' : 'טיוטה'}
              </Badge>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status & Weather bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'var(--surface)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: 'var(--text1)' }}>
                <Icon n="calendar" s={14} c="var(--accent)" /> תאריך: {fmtDate(currentLog.date)}
              </span>
              <span style={{ color: 'var(--text2)' }}>מזג אוויר: <strong>{currentLog.weather} · {currentLog.temperature}°C</strong></span>
              <span style={{ color: 'var(--text2)' }}>סה"כ עובדים באתר: <strong>{totalWorkers}</strong></span>
            </div>
            {currentLog.status === 'locked' ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon n="lock" s={13} /> דוח נעול וחתום
              </div>
            ) : (
              <Badge type="pending">טיוטה בעריכה</Badge>
            )}
          </div>

          {/* Workforce */}
          <div className="card" style={{ overflow: 'hidden' }}>
            {sectionHeader(`כוח אדם באתר (${totalWorkers} עובדים)`, 'users')}
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {currentLog.workforce.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text1)' }}>{w.role}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{w.contractor}</div>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>{w.count} עובדים</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div className="card" style={{ overflow: 'hidden' }}>
            {sectionHeader('פעילויות ועבודות שבוצעו', 'check-circle')}
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentLog.activities.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text1)', fontWeight: 500 }}>{a.description}</span>
                  <Badge type={a.status === 'completed' ? 'done' : 'in_progress'}>
                    {a.status === 'completed' ? 'הושלם' : 'בביצוע'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Deliveries & Instructions */}
          {(currentLog.deliveries.length > 0 || currentLog.instructions.length > 0 || currentLog.issues.length > 0) && (
            <div className="grid-2">
              {currentLog.deliveries.length > 0 && (
                <div className="card" style={{ overflow: 'hidden' }}>
                  {sectionHeader('אספקות חומרים לאתר', 'clipboard')}
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    {currentLog.deliveries.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text1)' }}>
                        <span><strong>{d.item}</strong> ({d.supplier})</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{d.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(currentLog.instructions.length > 0 || currentLog.issues.length > 0) && (
                <div className="card" style={{ overflow: 'hidden' }}>
                  {sectionHeader('הנחיות מפקח וחריגות', 'alert-circle')}
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    {currentLog.issues.map((iss, i) => (
                      <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--warning-light)', color: 'var(--text1)' }}>
                        <strong>חריגת איכות:</strong> {iss.description}
                      </div>
                    ))}
                    {currentLog.instructions.map((ins, i) => (
                      <div key={i} style={{ color: 'var(--text1)' }}>
                        <div>"{ins.text}"</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>— {ins.givenBy}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Site images */}
          {currentLog.images.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {sectionHeader(`תמונות מהשטח (${currentLog.images.length})`, 'camera')}
              <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {currentLog.images.map((img, idx) => (
                  <button
                    key={img.storageId}
                    type="button"
                    onClick={() => setGalleryIndex(idx)}
                    style={{
                      padding: 0,
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: 'var(--bg)',
                      cursor: 'pointer',
                      textAlign: 'right',
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.caption}
                      loading="lazy"
                      style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>{img.caption}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {galleryIndex !== null && (
        <ImageGalleryViewer
          images={currentLog.images.map((img) => ({ url: img.url, caption: `[נתוני דוגמה] ${img.caption}` }))}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}
    </div>
  );
};
