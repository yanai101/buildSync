import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Icon, Btn } from './Shared';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';

const formatRelative = (createdAt: number): string => {
  const seconds = Math.max(0, Math.round((Date.now() - createdAt) / 1000));
  if (seconds < 60) return 'לפני רגע';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.round(hours / 24);
  if (days < 7) return `לפני ${days} ימים`;
  const date = new Date(createdAt);
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const kindFromFile = (file: File): 'image' | 'pdf' | 'document' | 'other' => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('application/') || file.type.startsWith('text/')) return 'document';
  return 'other';
};

const fileIconName = (kind: string) => {
  if (kind === 'image') return 'camera';
  return 'file-text';
};

type Props = {
  projectId: Id<'projects'>;
  contractorId: Id<'contractors'>;
  contractorName: string;
};

export const ContractorNotesAndDocs = ({ projectId, contractorId, contractorName }: Props) => {
  const notes = useQuery(api.contractorNotes.listByContractor, { contractorId }) ?? [];
  const files = useQuery(api.projectFiles.listByContractor, { contractorId }) ?? [];
  const addNote = useMutation(api.contractorNotes.addNote);
  const removeNote = useMutation(api.contractorNotes.removeNote);
  const deleteProjectFile = useMutation(api.projectFiles.deleteProjectFile);
  const uploadFile = useProjectFileUploader();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [text, setText] = React.useState('');
  const [savingNote, setSavingNote] = React.useState(false);
  const [pendingNoteId, setPendingNoteId] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [pendingFileId, setPendingFileId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const submitNote = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSavingNote(true);
    setError(null);
    try {
      await addNote({ contractorId, text: trimmed });
      setText('');
    } catch (e) {
      setError('שמירת ההערה נכשלה');
    } finally {
      setSavingNote(false);
    }
  };

  const handleRemoveNote = async (noteId: Id<'contractorNotes'>) => {
    setPendingNoteId(String(noteId));
    setError(null);
    try {
      await removeNote({ noteId });
    } catch (e) {
      setError('מחיקת ההערה נכשלה');
    } finally {
      setPendingNoteId(null);
    }
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadFile({
        projectId,
        contractorId,
        file,
        usage: 'document',
        kind: kindFromFile(file),
      });
    } catch (err) {
      setError('העלאת הקובץ נכשלה');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (fileId: Id<'projectFiles'>) => {
    setPendingFileId(String(fileId));
    setError(null);
    try {
      await deleteProjectFile({ fileId });
    } catch (err) {
      setError('מחיקת הקובץ נכשלה');
    } finally {
      setPendingFileId(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>הערות ותיעוד</span>
        <span style={{fontSize:12,color:"var(--text3)",fontWeight:500}}>
          {notes.length} הערות · {files.length} קבצים
        </span>
      </div>
      <div className="card-body" style={{display:"flex",flexDirection:"column",gap:18}}>
        {error && (
          <div style={{border:"1px solid #FCA5A5",background:"#FEF2F2",color:"#991B1B",borderRadius:8,padding:"8px 10px",fontSize:12,fontWeight:600}}>
            {error}
          </div>
        )}

        <section>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>הערות</div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <textarea
              className="bp-input"
              value={text}
              placeholder={`כתוב הערה על ${contractorName}...`}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submitNote();
              }}
              rows={2}
              style={{flex:1,resize:"vertical",fontFamily:"'Heebo',sans-serif",fontSize:13,padding:"8px 10px"}}
            />
            <Btn onClick={submitNote} disabled={savingNote || !text.trim()}>
              <Icon n="plus" s={13}/> {savingNote ? "שומר..." : "הוסף"}
            </Btn>
          </div>

          {notes.length === 0 ? (
            <div style={{fontSize:12,color:"var(--text3)",border:"1px dashed var(--border)",borderRadius:8,padding:12,textAlign:"center"}}>
              אין הערות עדיין.
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {notes.map((note) => (
                <div key={String(note.id)} style={{border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",background:"#fff"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
                      <span style={{fontWeight:700,color:"var(--text1)"}}>{note.authorName}</span>
                      <span style={{color:"var(--text3)"}}>·</span>
                      <span style={{color:"var(--text3)"}}>{formatRelative(note._creationTime)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveNote(note.id)}
                      disabled={pendingNoteId === String(note.id)}
                      title="מחק הערה"
                      style={{background:"none",border:"none",padding:4,cursor:"pointer",color:"var(--text3)",display:"flex",alignItems:"center"}}
                    >
                      <Icon n="trash" s={13}/>
                    </button>
                  </div>
                  <div style={{fontSize:13,color:"var(--text1)",whiteSpace:"pre-wrap",lineHeight:1.5}}>
                    {note.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:13,fontWeight:700}}>תיעוד וקבצים</div>
            <Btn size="sm" onClick={handlePickFile} disabled={uploading}>
              <Icon n="plus" s={12}/> {uploading ? "מעלה..." : "העלה קובץ"}
            </Btn>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
            style={{display:"none"}}
            onChange={handleFileChange}
          />

          {files.length === 0 ? (
            <div style={{fontSize:12,color:"var(--text3)",border:"1px dashed var(--border)",borderRadius:8,padding:12,textAlign:"center"}}>
              אין קבצים מצורפים. אפשר להעלות חוזה, אישורים, תכניות וכו׳.
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {files.map((file) => (
                <div key={String(file.id)} style={{display:"flex",alignItems:"center",gap:10,border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",background:"#fff"}}>
                  <Icon n={fileIconName(file.kind)} s={16} c="var(--text2)"/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {file.originalName}
                    </div>
                    <div style={{fontSize:11,color:"var(--text3)"}}>
                      {formatBytes(file.originalSize)} · {formatRelative(file._creationTime)}
                    </div>
                  </div>
                  {file.url && (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      title="פתח"
                      style={{padding:6,color:"var(--text2)",display:"flex",alignItems:"center"}}
                    >
                      <Icon n="download" s={14}/>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRemoveFile(file.id)}
                    disabled={pendingFileId === String(file.id)}
                    title="מחק קובץ"
                    style={{background:"none",border:"none",padding:6,cursor:"pointer",color:"var(--danger)",display:"flex",alignItems:"center"}}
                  >
                    <Icon n="trash" s={14}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
