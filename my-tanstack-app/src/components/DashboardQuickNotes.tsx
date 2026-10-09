import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Icon, Modal, Btn } from './Shared';
import { openUpgradeModal } from './UpgradeModalHost';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useCurrentProject } from '../hooks/useCurrentProject';

const COLORS = [
  { name: 'צהוב', value: '#FEF08A' },
  { name: 'ירוק', value: '#BBF7D0' },
  { name: 'כחול', value: '#BFDBFE' },
  { name: 'ורוד', value: '#FBCFE8' },
  { name: 'סגול', value: '#E9D5FF' },
];

export const DashboardQuickNotes = () => {
  const search = useSearch({ strict: false }) as any;
  const navigate = useNavigate();
  const { project } = useCurrentProject();
  const projectId = project?._id;
  const identity = useQuery(api.users.currentIdentity);

  const notes = useQuery(api.quickNotes.list, projectId ? { projectId } : 'skip') ?? [];
  const team = useQuery(api.quickNotes.listTeamForSharing, projectId ? { projectId } : 'skip') ?? [];
  const createNote = useMutation(api.quickNotes.create);
  const removeNote = useMutation(api.quickNotes.remove);
  const shareNote = useMutation(api.quickNotes.share);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newText, setNewText] = React.useState('');
  const [newColor, setNewColor] = React.useState(COLORS[0].value);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [selectedNote, setSelectedNote] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (search?.addNote) {
      setIsAddOpen(true);
      navigate({ to: '/dashboard', replace: true });
    }
  }, [search, navigate]);

  const handleAddClick = () => setIsAddOpen(true);

  const handleSave = async () => {
    if (!newText.trim() || !projectId) return;
    try {
      await createNote({ text: newText.trim(), color: newColor, projectId });
      setIsAddOpen(false);
      setNewText('');
      setNewColor(COLORS[0].value);
    } catch (err: any) {
      if (err.message?.includes('FREE_NOTE_LIMIT')) {
        openUpgradeModal({
          title: 'שדרוג לפרו',
          reason: 'הגעת למגבלת הפתקים בחשבון החינמי של יזם הפרויקט.',
        });
      } else {
        console.error(err);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeNote({ noteId: deleteId as any });
      if (selectedNote?._id === deleteId) {
        setSelectedNote(null);
      }
    } catch (e) {
      console.error(e);
    }
    setDeleteId(null);
  };

  if (!projectId) return null;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon n="sticky-note" s={16} c="var(--accent)" />
          הפתקים שלי ({notes.length})
        </span>
        <Btn size="sm" variant="secondary" onClick={handleAddClick} style={{ padding: '4px 10px', fontSize: 12 }}>
          <Icon n="plus" s={14} /> פתק חדש
        </Btn>
      </div>

      <div className="card-body" style={{ paddingTop: 16 }}>
        <AnimatePresence mode="popLayout">
          {notes.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              אין לך פתקים עדיין. לחץ על "פתק חדש" כדי להתחיל.
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto', paddingRight: 4, paddingBottom: 4 }}>
              {notes.map((note: any) => {
                // Determine if this note was shared WITH me or BY me
                const isMyNote = identity?.userId === note.userId;
                const isSharedWithMe = !isMyNote;

                return (
                  <motion.div
                    key={note._id}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{
                      backgroundColor: note.color || '#FEF08A',
                      color: '#27272A',
                      borderRadius: 12,
                      padding: 14,
                      position: 'relative',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    {isSharedWithMe && (
                      <div style={{ position: 'absolute', top: -8, right: -8, background: '#fff', borderRadius: '50%', padding: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} title="שותף איתי">
                        <Icon n="users" s={14} c="var(--accent)" />
                      </div>
                    )}
                    {(note.sharedWith && note.sharedWith.length > 0 && isMyNote) && (
                      <div style={{ position: 'absolute', top: -8, left: -8, background: '#fff', borderRadius: '50%', padding: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} title="שותף עם הצוות">
                        <Icon n="share-2" s={14} c="var(--accent)" />
                      </div>
                    )}
                    <div
                      onClick={() => setSelectedNote(note)}
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        cursor: 'pointer',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical' as any,
                        overflow: 'hidden'
                      }}
                    >
                      {note.text}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 8 }}>
                      <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>
                        {new Date(note.createdAt).toLocaleDateString('he-IL')}
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setSelectedNote(note)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#27272A', opacity: 0.6, padding: 4 }}
                          title="קרא פתק"
                        >
                          <Icon n="maximize-2" s={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(note._id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', opacity: 0.8, padding: 4 }}
                          title={isMyNote ? "מחק פתק" : "הסר מהלוח שלי"}
                        >
                          <Icon n={isMyNote ? "trash-2" : "x"} s={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* View Note Modal */}
      <Modal title="צפייה בפתק" open={!!selectedNote} onClose={() => setSelectedNote(null)} width={400}>
        {selectedNote && (() => {
          const isMyNote = identity?.userId === selectedNote.userId;
          const alreadySharedIds = selectedNote.sharedWith || [];
          // Filter team to those who haven't been shared with yet
          const availableToShare = team.filter((m: any) => !alreadySharedIds.includes(m._id));

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div style={{
                  backgroundColor: selectedNote.color || '#FEF08A',
                  padding: 16,
                  borderRadius: 12,
                  color: '#27272A',
                  fontSize: 15,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '40vh',
                  overflowY: 'auto'
               }}>
                  {selectedNote.text}
               </div>

               {isMyNote && (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg2)', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon n="share-2" s={14} c="var(--text2)" /> שיתוף עם צוות
                    </div>
                    {alreadySharedIds.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <span style={{ opacity: 0.8 }}>שותף עם:</span>
                        {alreadySharedIds.map((id: string) => {
                           const member = team.find((m: any) => m._id === id);
                           return <span key={id} style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)', padding: '2px 6px', borderRadius: 12, fontSize: 11 }}>{member?.name || 'משתמש'}</span>
                        })}
                      </div>
                    )}
                    {availableToShare.length > 0 ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          id="share-select"
                          style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 13 }}
                        >
                          <option value="">בחר איש צוות...</option>
                          {availableToShare.map((m: any) => (
                            <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                          ))}
                        </select>
                        <Btn size="sm" onClick={async () => {
                          const select = document.getElementById('share-select') as HTMLSelectElement;
                          if (select && select.value) {
                            await shareNote({ noteId: selectedNote._id, userId: select.value as any });
                            setSelectedNote({ ...selectedNote, sharedWith: [...alreadySharedIds, select.value] });
                            select.value = '';
                          }
                        }}>שתף</Btn>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>אין עוד אנשי צוות לשתף איתם.</div>
                    )}
                 </div>
               )}

               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {isMyNote ? 'נוצר: ' : 'שותף איתך: '}
                    {new Date(selectedNote.createdAt).toLocaleDateString('he-IL')} בשעה {new Date(selectedNote.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Btn size="sm" variant="secondary" onClick={() => { setDeleteId(selectedNote._id); setSelectedNote(null); }} style={{ color: '#EF4444', borderColor: 'transparent', background: 'rgba(239, 68, 68, 0.1)' }}>
                    <Icon n={isMyNote ? "trash-2" : "x"} s={14} /> {isMyNote ? 'מחק פתק' : 'הסר'}
                  </Btn>
               </div>
            </div>
          );
        })()}
      </Modal>

      {/* Add Note Modal */}
      <Modal title="פתק חדש" open={isAddOpen} onClose={() => setIsAddOpen(false)} width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <textarea
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="הקלד כאן..."
            rows={4}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text1)',
              fontSize: 14,
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon n="palette" s={16} c="var(--text3)" />
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewColor(c.value)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c.value,
                    border: newColor === c.value ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setIsAddOpen(false)}>ביטול</Btn>
            <Btn onClick={handleSave} disabled={!newText.trim()}>שמור פתק</Btn>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal title="מחיקת פתק" open={!!deleteId} onClose={() => setDeleteId(null)} width={320}>
        <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: '#EF4444' }}>
            <Icon n="trash-2" s={32} />
          </div>
          <p style={{ fontSize: 15, color: 'var(--text1)', marginBottom: 24 }}>
            האם אתה בטוח שברצונך למחוק את הפתק?
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Btn variant="secondary" onClick={() => setDeleteId(null)}>ביטול</Btn>
            <Btn onClick={handleDelete} style={{ background: '#EF4444', color: '#fff', border: 'none' }}>מחק פתק</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};
