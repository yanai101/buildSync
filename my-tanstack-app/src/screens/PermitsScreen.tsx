import React, { useRef, useState } from 'react';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { PageBackground, EmptyState, Btn, Icon } from '../components/Shared';
import type { Id } from '../../convex/_generated/dataModel';

export const PermitsScreen = () => {
  const { projectId } = useCurrentProject();
  const permits = useQuery(api.permits.list, projectId ? { projectId } : 'skip');
  const generateUploadUrl = useMutation(api.permits.generateUploadUrl);
  const addPermit = useMutation(api.permits.addPermit);
  const deletePermit = useMutation(api.permits.deletePermit);
  const updatePermit = useMutation(api.permits.updatePermit);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !projectId) return;

    setUploading(true);
    try {
      // Generate upload url
      const uploadUrl = await generateUploadUrl({ projectId });
      
      // Upload the file
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed');
      }

      const { storageId } = await uploadResponse.json() as { storageId: Id<'_storage'> };
      
      // Create permit
      await addPermit({
        projectId,
        title: file.name.replace(/\.[^/.]+$/, ""), // remove extension for title
        status: 'not_started',
        fileId: storageId,
      });

    } catch (err) {
      console.error('Failed to upload permit file:', err);
      alert('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (permitId: Id<'permits'>, title: string) => {
    if (!window.confirm(`למחוק את "${title}"?`)) return;
    try {
      await deletePermit({ permitId });
    } catch (e) {
      console.error(e);
      alert('שגיאה במחיקת הקובץ');
    }
  };

  const isLoading = permits === undefined;

  return (
    <ScreenBoundary loading={isLoading}>
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60, minHeight: 'calc(100vh - 130px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>בירוקרטיה והיתרים</h1>
          {permits && permits.length > 0 && (
            <Btn onClick={handlePick} disabled={uploading}>
              <Icon n="plus" s={16} /> {uploading ? 'מעלה...' : 'הוסף מסמך'}
            </Btn>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {permits?.length === 0 ? (
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <PageBackground image="/empty_states/permits.png" opacity={0.03} />
            <div style={{ width: '100%' }}>
              <EmptyState
                icon="file-text"
                title="אין מסמכים מול רשויות"
                description="זה המקום לרכז היתרי בנייה, אישורי תאגיד מים, חיבור חשמל ועוד - למעקב מסודר ונוח."
                action={
                  <Btn size="lg" onClick={handlePick} disabled={uploading} style={{ padding: "12px 28px", fontSize: 16 }}>
                    <Icon n="plus" s={16}/> {uploading ? 'מעלה...' : 'הוסף מסמך ראשון'}
                  </Btn>
                }
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {permits?.map((permit) => (
              <div key={permit._id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ background: 'var(--bg)', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                    <Icon n="file-text" s={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {permit.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                      {permit.authority || 'ללא רשות מוגדרת'}
                    </div>
                  </div>
                </div>

                {permit.url && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <a
                      href={permit.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ flex: 1, textDecoration: 'none' }}
                    >
                      <Btn variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                        <Icon n="eye" s={16} /> צפה במסמך
                      </Btn>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(permit._id, permit.title)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '0 12px',
                        cursor: 'pointer',
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="מחק מסמך"
                    >
                      <Icon n="trash" s={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ScreenBoundary>
  );
};
