import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { gunzip } from 'fflate';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Btn, Icon } from '../components/Shared';
import { usePersonalFileUploader } from '../hooks/usePersonalFileUploader';
import { useAppNotify } from '../hooks/useAppNotify';

const MAX_FILES = 20;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const decompress = (bytes: Uint8Array): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    gunzip(bytes, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

export const PersonalFilesScreen = () => {
  const identity = useQuery(api.users.currentIdentity, {});
  const isOwner = identity?.role === 'owner';

  const files = useQuery(
    api.personalFiles.listMyPersonalFiles,
    isOwner ? {} : 'skip',
  );
  const updateNote = useMutation(api.personalFiles.updatePersonalFileNote);
  const deleteFile = useMutation(api.personalFiles.deletePersonalFile);
  const uploadFile = usePersonalFileUploader();
  const { notify, permission, requestPermission, messages, dismiss } = useAppNotify();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [pendingDownload, setPendingDownload] = React.useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = React.useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = React.useState<string | null>(null);
  const noteTimers = React.useRef<Record<string, number>>({});

  const fileList = files ?? [];
  const atCap = fileList.length >= MAX_FILES;

  const handlePick = () => {
    if (atCap || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      const saved = Math.max(0, file.size - result.storedSize);
      const pct = file.size > 0 ? Math.round((saved / file.size) * 100) : 0;
      await notify({
        title: 'הקובץ נשמר',
        body: `${file.name} · נחסכו ${formatBytes(saved)} (${pct}%)`,
        kind: 'success',
      });
    } catch (err) {
      await notify({
        title: 'העלאה נכשלה',
        body: err instanceof Error ? err.message : 'אירעה שגיאה',
        kind: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleNoteChange = (fileId: Id<'personalFiles'>, value: string) => {
    const key = String(fileId);
    setNoteDrafts((prev) => ({ ...prev, [key]: value }));
    const existing = noteTimers.current[key];
    if (existing) window.clearTimeout(existing);
    noteTimers.current[key] = window.setTimeout(async () => {
      setSavingNote(key);
      try {
        await updateNote({ fileId, note: value });
      } catch (err) {
        await notify({
          title: 'שמירת ההערה נכשלה',
          body: err instanceof Error ? err.message : 'אירעה שגיאה',
          kind: 'error',
        });
      } finally {
        setSavingNote((cur) => (cur === key ? null : cur));
      }
    }, 600);
  };

  const handleDownload = async (file: NonNullable<typeof files>[number]) => {
    if (!file.url) return;
    setPendingDownload(String(file.id));
    try {
      const res = await fetch(file.url);
      if (!res.ok) throw new Error('הורדת הקובץ נכשלה');
      const compressed = new Uint8Array(await res.arrayBuffer());
      const original = await decompress(compressed);
      const downloadBlob = new Blob([original.buffer as ArrayBuffer], {
        type: file.originalMimeType || 'application/octet-stream',
      });
      const objectUrl = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      await notify({
        title: 'הורדה נכשלה',
        body: err instanceof Error ? err.message : 'אירעה שגיאה',
        kind: 'error',
      });
    } finally {
      setPendingDownload(null);
    }
  };

  const handleDelete = async (fileId: Id<'personalFiles'>, name: string) => {
    if (!window.confirm(`למחוק את ${name}?`)) return;
    setPendingDelete(String(fileId));
    try {
      await deleteFile({ fileId });
      await notify({ title: 'הקובץ נמחק', body: name, kind: 'info' });
    } catch (err) {
      await notify({
        title: 'מחיקה נכשלה',
        body: err instanceof Error ? err.message : 'אירעה שגיאה',
        kind: 'error',
      });
    } finally {
      setPendingDelete(null);
    }
  };

  if (identity === undefined) {
    return <div style={{ padding: 24, color: 'var(--text2)' }}>טוען...</div>;
  }

  if (!isOwner) {
    return (
      <div className="page-content">
        <div className="card">
          <div className="card-body" style={{ padding: 32, textAlign: 'center' }}>
            <Icon n="alert" s={28} c="var(--danger)" />
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>אין לך גישה</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
              הדף הזה זמין רק לבעלי הפרויקט.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {permission === 'default' && (
        <div
          className="card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: 'var(--surface)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            הפעל התראות מערכת כדי לקבל עדכון גם כשהדף לא פתוח.
          </div>
          <Btn size="sm" variant="ghost" onClick={() => void requestPermission()}>
            הפעל התראות
          </Btn>
        </div>
      )}

      <div className="card">
        <div
          className="card-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>קבצים אישיים</span>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
            {fileList.length} / {MAX_FILES} קבצים בשימוש
          </span>
        </div>
        <div
          className="card-body"
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              קבצים נדחסים אוטומטית לפני השמירה. תמונות צריכות להיות מועלות בדף התמונות.
            </div>
            <Btn onClick={handlePick} disabled={uploading || atCap}>
              <Icon n="upload-cloud" s={14} />{' '}
              {uploading ? 'מעלה...' : atCap ? 'הגעת למגבלה' : 'העלה קובץ'}
            </Btn>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {fileList.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: 'var(--text3)',
                border: '1px dashed var(--border)',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
              }}
            >
              עדיין לא הועלו קבצים אישיים.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fileList.map((file) => {
                const key = String(file.id);
                const noteValue = noteDrafts[key] ?? file.note ?? '';
                const saved = Math.max(0, file.originalSize - file.storedSize);
                const pct = file.originalSize > 0
                  ? Math.round((saved / file.originalSize) * 100)
                  : 0;
                return (
                  <div
                    key={key}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      background: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon n="file-text" s={18} c="var(--text2)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {file.originalName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {formatBytes(file.originalSize)} → {formatBytes(file.storedSize)}
                          {pct > 0 ? ` · נחסכו ${pct}%` : ''} · הועלה {formatDate(file.uploadedAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDownload(file)}
                        disabled={pendingDownload === key || !file.url}
                        title="הורד"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 6,
                          cursor: 'pointer',
                          color: 'var(--text2)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Icon n="download" s={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(file.id, file.originalName)}
                        disabled={pendingDelete === key}
                        title="מחק"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 6,
                          cursor: 'pointer',
                          color: 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Icon n="trash" s={16} />
                      </button>
                    </div>
                    <textarea
                      className="bp-input"
                      value={noteValue}
                      placeholder="הוסף הערה לקובץ..."
                      onChange={(e) => handleNoteChange(file.id, e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        fontFamily: "'Heebo',sans-serif",
                        fontSize: 13,
                        padding: '8px 10px',
                      }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text3)',
                        textAlign: 'left',
                        minHeight: 14,
                      }}
                    >
                      {savingNote === key ? 'שומר הערה...' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 16,
          insetInlineEnd: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 50,
          maxWidth: 320,
        }}
      >
        {messages.map((m) => {
          const tone =
            m.kind === 'error'
              ? { border: '#FCA5A5', bg: '#FEF2F2', text: '#991B1B' }
              : m.kind === 'success'
                ? { border: '#86EFAC', bg: '#F0FDF4', text: '#166534' }
                : { border: 'var(--border)', bg: 'var(--surface)', text: 'var(--text1)' };
          return (
            <div
              key={m.id}
              role="status"
              onClick={() => dismiss(m.id)}
              style={{
                border: `1px solid ${tone.border}`,
                background: tone.bg,
                color: tone.text,
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{m.title}</div>
              {m.body && <div style={{ fontSize: 12 }}>{m.body}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
