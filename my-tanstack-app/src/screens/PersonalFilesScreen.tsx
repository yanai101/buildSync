import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { gunzip } from 'fflate';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Btn, Icon } from '../components/Shared';
import { usePersonalFileUploader } from '../hooks/usePersonalFileUploader';
import { useAppNotify } from '../hooks/useAppNotify';
import { useRequireRole } from '../hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';
import { useSubscription } from '../hooks/useSubscription';
import { PremiumLock, Modal, ConfirmDialog } from '../components/Shared';
import { ImageGalleryViewer } from '../components/ImageGalleryViewer';

const MAX_FILES = 30;

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
  const { allowed, loading: roleLoading } = useRequireRole(['owner']);
  const identity = useQuery(api.users.currentIdentity, {});
  const { isProOrPremium } = useSubscription();

  const files = useQuery(
    api.personalFiles.listMyPersonalFiles,
    allowed ? {} : 'skip',
  );
  const updateNote = useMutation(api.personalFiles.updatePersonalFileNote);
  const updateFilesNote = useMutation(api.personalFiles.updatePersonalFilesNote);
  const deleteFile = useMutation(api.personalFiles.deletePersonalFile);
  const uploadFile = usePersonalFileUploader();
  const { notify, permission, requestPermission, messages, dismiss } = useAppNotify();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const targetSectionRef = React.useRef<string | null>(null);
  
  const [uploading, setUploading] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [pendingDownload, setPendingDownload] = React.useState<string | null>(null);
  const [pendingPreview, setPendingPreview] = React.useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  
  const [noteDrafts, setNoteDrafts] = React.useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = React.useState<string | null>(null);
  const noteTimers = React.useRef<Record<string, number>>({});
  
  const [emptySections, setEmptySections] = React.useState<{id: string, note: string}[]>([]);
  
  const [previewFile, setPreviewFile] = React.useState<{url: string, name: string, isImage: boolean} | null>(null);
  const [selectedImages, setSelectedImages] = React.useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = React.useState<'images' | 'docs'>('images');
  const [fileToDelete, setFileToDelete] = React.useState<{id: Id<'personalFiles'>, name: string} | null>(null);
  const [viewGallery, setViewGallery] = React.useState<{ images: {url: string, title?: string, description?: string}[], initialIndex: number } | null>(null);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());

  const fileList = files ?? [];
  const imageFiles = fileList.filter(f => f.originalMimeType?.startsWith('image/'));
  const docFiles = fileList.filter(f => !f.originalMimeType?.startsWith('image/'));
  
  const atCap = fileList.length >= MAX_FILES;

  const handlePick = (sectionId?: string) => {
    if (atCap || uploading) return;
    targetSectionRef.current = sectionId || null;
    fileInputRef.current?.click();
  };

  const handleCamera = (sectionId?: string) => {
    if (atCap || uploading) return;
    targetSectionRef.current = sectionId || null;
    cameraInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    
    const targetSection = targetSectionRef.current;
    const isImage = file.type.startsWith('image/');
    
    try {
      const draftedNote = targetSection ? (noteDrafts[targetSection] ?? emptySections.find(s => s.id === targetSection)?.note) : '';
      
      const result = await uploadFile(file, isImage && targetSection ? targetSection : undefined, isImage && draftedNote ? draftedNote : undefined);
      
      if (targetSection && emptySections.some(s => s.id === targetSection)) {
        setEmptySections(prev => prev.filter(s => s.id !== targetSection));
      }

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
      targetSectionRef.current = null;
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

  const handleSectionNoteChange = (sectionId: string, value: string, sectionFiles: typeof imageFiles) => {
    setNoteDrafts((prev) => ({ ...prev, [sectionId]: value }));
    
    if (sectionFiles.length === 0) {
      setEmptySections(prev => prev.map(s => s.id === sectionId ? { ...s, note: value } : s));
      return;
    }

    const existing = noteTimers.current[sectionId];
    if (existing) window.clearTimeout(existing);
    noteTimers.current[sectionId] = window.setTimeout(async () => {
      setSavingNote(sectionId);
      try {
        const fileIds = sectionFiles.map(f => f.id);
        await updateFilesNote({ fileIds, note: value });
      } catch (err) {
        await notify({ title: 'שמירת ההערה נכשלה', body: err instanceof Error ? err.message : 'אירעה שגיאה', kind: 'error' });
      } finally {
        setSavingNote((cur) => (cur === sectionId ? null : cur));
      }
    }, 600);
  };

  const fetchAndDecompress = async (file: NonNullable<typeof files>[number]): Promise<string> => {
    if (!file.url) throw new Error("קובץ חסר כתובת");
    const res = await fetch(file.url);
    if (!res.ok) throw new Error('הורדת הקובץ נכשלה');
    const compressed = new Uint8Array(await res.arrayBuffer());
    const original = await decompress(compressed);
    const blob = new Blob([original.buffer as ArrayBuffer], {
      type: file.originalMimeType || 'application/octet-stream',
    });
    return URL.createObjectURL(blob);
  };

  const handleDownload = async (file: NonNullable<typeof files>[number]) => {
    if (!file.url) return;
    setPendingDownload(String(file.id));
    try {
      const objectUrl = await fetchAndDecompress(file);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      await notify({ title: 'הורדה נכשלה', body: err instanceof Error ? err.message : 'אירעה שגיאה', kind: 'error' });
    } finally {
      setPendingDownload(null);
    }
  };

  const handleViewGallery = async (startIndex: number) => {
    const targetFile = imageFiles[startIndex];
    if (!targetFile) return;
    setPendingPreview(String(targetFile.id));
    
    try {
      const items = await Promise.all(imageFiles.map(async (f) => {
         const objectUrl = await fetchAndDecompress(f);
         const sectionId = f.sectionId || `legacy-${f.id}`;
         const note = noteDrafts[sectionId] ?? f.note ?? '';
         return { url: objectUrl, title: f.originalName, description: note };
      }));
      setViewGallery({ images: items, initialIndex: startIndex });
    } catch (err) {
      await notify({ title: 'פתיחת הגלריה נכשלה', body: err instanceof Error ? err.message : 'אירעה שגיאה', kind: 'error' });
    } finally {
      setPendingPreview(null);
    }
  };

  const handlePreview = async (file: NonNullable<typeof files>[number]) => {
    if (!file.url) return;
    const isImage = !!file.originalMimeType?.startsWith('image/');
    
    if (isImage) {
      const index = imageFiles.findIndex(f => f.id === file.id);
      if (index !== -1) {
        await handleViewGallery(index);
      }
      return;
    }

    setPendingPreview(String(file.id));
    try {
      const objectUrl = await fetchAndDecompress(file);
      setPreviewFile({ url: objectUrl, name: file.originalName, isImage: false });
    } catch (err) {
      await notify({ title: 'תצוגה מקדימה נכשלה', body: err instanceof Error ? err.message : 'אירעה שגיאה', kind: 'error' });
    } finally {
      setPendingPreview(null);
    }
  };

  const handleGeneratePDF = async () => {
    if (selectedImages.size === 0) return;
    setIsGeneratingPdf(true);
    try {
      const filesToExport = imageFiles.filter(f => selectedImages.has(f.id));
      
      // Group by section for the PDF
      const pdfSections = new Map<string, { note: string, items: { url: string, name: string }[] }>();
      
      for (const f of filesToExport) {
         const url = await fetchAndDecompress(f);
         const sectionId = f.sectionId || `legacy-${f.id}`;
         const note = noteDrafts[sectionId] ?? f.note ?? '';
         
         if (!pdfSections.has(sectionId)) {
           pdfSections.set(sectionId, { note, items: [] });
         }
         pdfSections.get(sectionId)!.items.push({ url, name: f.originalName });
      }

      const container = document.createElement('div');
      container.style.padding = '20px';
      container.style.direction = 'rtl';
      container.style.fontFamily = 'Heebo, sans-serif';

      const headerContainer = document.createElement('div');
      headerContainer.style.display = 'flex';
      headerContainer.style.alignItems = 'center';
      headerContainer.style.justifyContent = 'center';
      headerContainer.style.marginBottom = '12px';
      headerContainer.style.gap = '12px';

      const logoImg = document.createElement('img');
      logoImg.src = '/logo.png';
      logoImg.style.width = '64px';
      logoImg.style.height = '64px';
      logoImg.style.objectFit = 'contain';

      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });

      const appName = document.createElement('div');
      appName.innerText = 'BuildSync';
      appName.style.fontSize = '32px';
      appName.style.fontWeight = '800';
      appName.style.color = '#F59E0B';
      appName.style.letterSpacing = '-0.5px';

      headerContainer.appendChild(appName);
      headerContainer.appendChild(logoImg);
      container.appendChild(headerContainer);

      const headerLine = document.createElement('hr');
      headerLine.style.border = 'none';
      headerLine.style.borderTop = '2px solid #eee';
      headerLine.style.margin = '0 0 24px 0';
      container.appendChild(headerLine);

      const title = document.createElement('h2');
      title.innerText = 'דוח תמונות והערות פרויקט';
      title.style.textAlign = 'center';
      title.style.margin = '0 0 30px 0';
      title.style.fontSize = '22px';
      title.style.color = '#333';
      container.appendChild(title);

      const sectionEntries = Array.from(pdfSections.values());
      
      sectionEntries.forEach((section, idx) => {
         const sectionDiv = document.createElement('div');
         sectionDiv.style.marginBottom = '30px';
         sectionDiv.style.pageBreakInside = 'avoid';
         
         if (section.note) {
           const noteEl = document.createElement('h3');
           noteEl.innerText = section.note;
           noteEl.style.fontSize = '18px';
           noteEl.style.color = '#333';
           noteEl.style.marginBottom = '16px';
           noteEl.style.borderBottom = '2px solid var(--accent)';
           noteEl.style.display = 'inline-block';
           sectionDiv.appendChild(noteEl);
         }
         
         const grid = document.createElement('div');
         grid.style.display = 'flex';
         grid.style.flexWrap = 'wrap';
         grid.style.gap = '12px';
         grid.style.justifyContent = 'flex-start'; // Align from the right (RTL)
         
         section.items.forEach(item => {
           const img = document.createElement('img');
           img.src = item.url;
           img.style.width = 'calc(50% - 6px)'; // Always exactly half width minus half gap
           img.style.height = '280px'; // Fixed height to ensure consistent layout
           img.style.objectFit = 'contain';
           img.style.borderRadius = '8px';
           grid.appendChild(img);
         });
         
         sectionDiv.appendChild(grid);
         container.appendChild(sectionDiv);

         if (idx < sectionEntries.length - 1) {
             const hr = document.createElement('hr');
             hr.style.border = 'none';
             hr.style.borderTop = '2px solid #ddd';
             hr.style.margin = '30px 0';
             container.appendChild(hr);
         }
      });

      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().from(container).set({
         margin: 15,
         filename: 'דוח_תמונות.pdf',
         image: { type: 'jpeg', quality: 0.95 },
         html2canvas: { scale: 2, useCORS: true },
         jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save();

      for (const section of sectionEntries) {
        section.items.forEach(item => URL.revokeObjectURL(item.url));
      }
      
      await notify({ title: 'הדוח הופק בהצלחה', kind: 'success' });
    } catch (err) {
      await notify({ title: 'יצירת PDF נכשלה', body: err instanceof Error ? err.message : 'אירעה שגיאה', kind: 'error' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDelete = async (fileId: Id<'personalFiles'>, name: string) => {
    setPendingDelete(String(fileId));
    try {
      const fileToDeleteRef = imageFiles.find(f => f.id === fileId);
      if (fileToDeleteRef) {
        const sectionId = fileToDeleteRef.sectionId || `legacy-${fileId}`;
        const imagesInSection = imageFiles.filter(f => (f.sectionId || `legacy-${f.id}`) === sectionId);
        
        if (imagesInSection.length === 1) {
          const note = noteDrafts[sectionId] ?? fileToDeleteRef.note ?? '';
          setEmptySections(prev => {
             if (prev.some(s => s.id === sectionId)) return prev;
             return [{ id: sectionId, note }, ...prev];
          });
        }
      }

      await deleteFile({ fileId });
      setSelectedImages(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      await notify({ title: 'הקובץ נמחק', body: name, kind: 'info' });
      setFileToDelete(null);
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

  if (identity === undefined || roleLoading) return <AccessLoading />;
  if (!allowed) return <AccessDenied message="המסמכים האישיים זמינים ליזם הפרויקט בלבד." />;

  const renderDocCard = (file: NonNullable<typeof files>[number]) => {
    const key = String(file.id);
    const noteValue = noteDrafts[key] ?? file.note ?? '';
    const saved = Math.max(0, file.originalSize - file.storedSize);
    const pct = file.originalSize > 0 ? Math.round((saved / file.originalSize) * 100) : 0;
    
    return (
      <div
        key={key}
        style={{
          border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px',
          background: '#fff', display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon n="file-text" s={18} c="var(--text2)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.originalName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {formatBytes(file.originalSize)} → {formatBytes(file.storedSize)}
              {pct > 0 ? ` · נחסכו ${pct}%` : ''} · הועלה {formatDate(file.uploadedAt)}
            </div>
          </div>
          <button onClick={() => void handlePreview(file)} disabled={pendingPreview === key || !file.url} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center' }}>
            {pendingPreview === key ? <Icon n="loader" s={16} className="spin" /> : <Icon n="eye" s={16} />}
          </button>
          <button onClick={() => void handleDownload(file)} disabled={pendingDownload === key || !file.url} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center' }}>
            <Icon n="download" s={16} />
          </button>
          <button onClick={() => setFileToDelete({ id: file.id, name: file.originalName })} disabled={pendingDelete === key} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
            <Icon n="trash" s={16} />
          </button>
        </div>
        <textarea
          className="bp-input"
          value={noteValue}
          placeholder="הוסף הערה לקובץ..."
          onChange={(e) => handleNoteChange(file.id, e.target.value)}
          rows={2}
          style={{ width: '100%', resize: 'vertical', fontFamily: "'Heebo',sans-serif", fontSize: 13, padding: '8px 10px' }}
        />
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'left', minHeight: 14 }}>
          {savingNote === key ? 'שומר הערה...' : ''}
        </div>
      </div>
    );
  };


  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const imageSectionsMap = new Map<string, typeof imageFiles>();
  imageFiles.forEach(f => {
    const sectionId = f.sectionId || `legacy-${f.id}`;
    if (!imageSectionsMap.has(sectionId)) {
      imageSectionsMap.set(sectionId, []);
    }
    imageSectionsMap.get(sectionId)!.push(f);
  });

  const allSections = [
    ...emptySections.map(s => ({ id: s.id, note: s.note, files: [] as typeof imageFiles })),
    ...Array.from(imageSectionsMap.entries()).map(([id, files]) => ({
      id,
      files,
      note: files[0]?.note || '',
    }))
  ];

  const renderSection = (section: { id: string, note: string, files: typeof imageFiles }) => {
    const key = section.id;
    const noteValue = noteDrafts[key] ?? section.note ?? '';
    const isFull = section.files.length >= 3;
    const isExpanded = !expandedSections.has(key); // Default to expanded, toggle to collapse

    return (
      <div
        key={key}
        style={{
          border: '1px solid var(--border)', borderRadius: 10, padding: '16px', background: '#fff',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
          <input 
            type="checkbox" 
            checked={section.files.length > 0 && section.files.every(f => selectedImages.has(f.id))}
            ref={input => {
              if (input) {
                const some = section.files.some(f => selectedImages.has(f.id));
                const all = section.files.length > 0 && section.files.every(f => selectedImages.has(f.id));
                input.indeterminate = some && !all;
              }
            }}
            onChange={(e) => {
              const next = new Set(selectedImages);
              if (e.target.checked) section.files.forEach(f => next.add(f.id));
              else section.files.forEach(f => next.delete(f.id));
              setSelectedImages(next);
            }}
            disabled={section.files.length === 0}
            style={{ width: 18, height: 18, cursor: section.files.length > 0 ? 'pointer' : 'default', flexShrink: 0 }}
          />
          <input
            className="bp-input"
            value={noteValue}
            placeholder="תיאור הקבוצה (לדוגמה: סלון - צנרת חשמל)..."
            onChange={(e) => handleSectionNoteChange(key, e.target.value, section.files)}
            style={{ flex: 1, minWidth: 0, fontFamily: "'Heebo',sans-serif", fontSize: 14, fontWeight: 600, padding: '8px 10px' }}
          />

          {!isExpanded && section.files.length > 0 && (
            <div className="desktop-only" style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--border)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon n="camera" s={12} />
              {section.files.length === 1 ? 'תמונה אחת' : `${section.files.length} תמונות`}
            </div>
          )}
          
          {section.files.length === 0 && (
            <button
              onClick={() => setEmptySections(prev => prev.filter(s => s.id !== key))}
              className="desktop-only"
              style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 6, padding: '6px 10px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            >
              <Icon n="trash" s={14} /> מחק קבוצה
            </button>
          )}

          <button
            onClick={() => toggleSection(key)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex' }}>
              <Icon n="chevron-down" s={18} />
            </div>
          </button>
        </div>
        
        <div style={{ fontSize: 11, color: 'var(--text3)', minHeight: 14, marginTop: -8, paddingInlineStart: 26 }}>
          {savingNote === key ? 'שומר הערה...' : ''}
        </div>

        {!isExpanded && section.files.length > 0 && (
          <div className="mobile-only" style={{ paddingInlineStart: 26, marginTop: -14, marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon n="camera" s={12} />
              {section.files.length === 1 ? 'תמונה אחת' : `${section.files.length} תמונות`}
            </div>
          </div>
        )}

        {isExpanded && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, paddingInlineStart: 30, marginTop: 4 }}>
            {section.files.map(file => {
               const saved = Math.max(0, file.originalSize - file.storedSize);
               return (
                 <div key={file.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={file.originalName}>
                        {file.originalName}
                      </div>
                      <input type="checkbox" checked={selectedImages.has(file.id)} onChange={(e) => {
                        const next = new Set(selectedImages);
                        if (e.target.checked) next.add(file.id);
                        else next.delete(file.id);
                        setSelectedImages(next);
                      }} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {formatBytes(file.originalSize)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
                       <button onClick={() => void handlePreview(file)} disabled={pendingPreview === file.id || !file.url} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
                         {pendingPreview === file.id ? <Icon n="loader" s={14} className="spin" /> : <Icon n="eye" s={14} />}
                       </button>
                       <button onClick={() => void handleDownload(file)} disabled={pendingDownload === file.id || !file.url} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
                         <Icon n="download" s={14} />
                       </button>
                       <button onClick={() => setFileToDelete({ id: file.id, name: file.originalName })} disabled={pendingDelete === file.id} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                         <Icon n="trash" s={14} />
                       </button>
                    </div>
                 </div>
               );
            })}

            {!isFull && (
              <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center',
                  gap: 8, color: 'var(--text2)', minHeight: 90
              }}>
                 <Btn variant="outline" size="sm" style={{ display: 'flex', justifyContent: 'center', gap: 6 }} onClick={() => handlePick(key)} disabled={uploading || atCap}>
                   <Icon n="upload-cloud" s={14} /> העלה תמונה
                 </Btn>
                 <Btn variant="outline" size="sm" className="mobile-only" style={{ display: 'flex', justifyContent: 'center', gap: 6 }} onClick={() => handleCamera(key)} disabled={uploading || atCap}>
                   <Icon n="camera" s={14} /> צלם תמונה
                 </Btn>
                 {section.files.length === 0 && (
                   <Btn variant="ghost" size="sm" className="mobile-only" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4 }} onClick={() => setEmptySections(prev => prev.filter(s => s.id !== key))}>
                     <Icon n="trash" s={14} /> מחק קבוצה
                   </Btn>
                 )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <PremiumLock
      isLocked={!isProOrPremium}
      title="ניהול מסמכים ותמונות"
      description="גיבוי, שמירה וניהול של כל הקבצים, התמונות והמסמכים החשובים של הפרויקט. שדרג ל-Pro כדי לקבל גישה."
    >
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {permission === 'default' && (
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>הפעל התראות מערכת כדי לקבל עדכון גם כשהדף לא פתוח.</div>
            <Btn size="sm" variant="ghost" onClick={() => void requestPermission()}>הפעל התראות</Btn>
          </div>
        )}

        <div style={{ padding: '0 4px', marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text2)', lineHeight: 1.6 }}>
            זהו האזור האישי שלך לשמירת תיעוד קריטי לאורך תהליך הבנייה. מומלץ לשמור כאן צילומים של תשתיות (כמו צנרת וחשמל לפני טיח או ריצוף), מסמכים אישיים חשובים, וכל מידע שתרצה לגשת אליו בקלות בשלבים מתקדמים יותר של הפרויקט.
          </p>
        </div>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span>המסמכים והתמונות שלך ({fileList.length} / {MAX_FILES})</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {activeTab === 'docs' && (
                <Btn onClick={() => handlePick()} disabled={uploading || atCap} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon n="file-text" s={14} /> העלה מסמך
                </Btn>
              )}
            </div>
          </div>
          
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {uploading && <div style={{ textAlign: 'center', padding: 12, color: 'var(--text2)' }}>מעלה קובץ, אנא המתן...</div>}
            
            {fileList.length === 0 && !uploading && emptySections.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: 8, padding: 24, textAlign: 'center' }}>
                עדיין לא הועלו קבצים. תוכל להעלות מסמכים או לצלם תמונות לתיעוד (כגון תשתיות לפני חיפוי).
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  <button 
                    onClick={() => setActiveTab('images')}
                    style={{ 
                      background: 'transparent', border: 'none',
                      borderBottom: activeTab === 'images' ? '2px solid var(--accent)' : '2px solid transparent',
                      padding: '12px 16px', fontSize: 15, fontWeight: activeTab === 'images' ? 600 : 500,
                      color: activeTab === 'images' ? 'var(--text1)' : 'var(--text2)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    <Icon n="image" s={18} /> תמונות ({imageFiles.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('docs')}
                    style={{ 
                      background: 'transparent', border: 'none',
                      borderBottom: activeTab === 'docs' ? '2px solid var(--accent)' : '2px solid transparent',
                      padding: '12px 16px', fontSize: 15, fontWeight: activeTab === 'docs' ? 600 : 500,
                      color: activeTab === 'docs' ? 'var(--text1)' : 'var(--text2)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    <Icon n="file-text" s={18} /> מסמכים ({docFiles.length})
                  </button>
                </div>

                {activeTab === 'images' && (
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
                      <div style={{ fontSize: 14, color: 'var(--text2)' }}>סמן תמונות כדי להפיק דוח מרוכז</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn size="sm" variant="outline" onClick={() => setEmptySections(prev => [{ id: crypto.randomUUID(), note: '' }, ...prev])}>
                          <Icon n="plus" s={14} /> הוסף קבוצה חדשה
                        </Btn>
                        <Btn size="sm" variant="primary" disabled={selectedImages.size === 0 || isGeneratingPdf} onClick={handleGeneratePDF}>
                          {isGeneratingPdf ? 'מייצר PDF...' : `הפק דוח תמונות PDF (${selectedImages.size})`}
                        </Btn>
                      </div>
                    </div>
                    {allSections.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {allSections.map(renderSection)}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>אין תמונות או סקשנים.</div>
                    )}
                  </div>
                )}
                
                {activeTab === 'docs' && (
                  docFiles.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {docFiles.map(renderDocCard)}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>אין מסמכים בכספת.</div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Notifications */}
        <div style={{ position: 'fixed', bottom: 16, insetInlineEnd: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 50, maxWidth: 320 }}>
          {messages.map((m) => {
            const tone = m.kind === 'error' ? { border: '#FCA5A5', bg: '#FEF2F2', text: '#991B1B' } : m.kind === 'success' ? { border: '#86EFAC', bg: '#F0FDF4', text: '#166534' } : { border: 'var(--border)', bg: 'var(--surface)', text: 'var(--text1)' };
            return (
              <div key={m.id} role="status" onClick={() => dismiss(m.id)} style={{ border: `1px solid ${tone.border}`, background: tone.bg, color: tone.text, borderRadius: 10, padding: '10px 12px', fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{m.title}</div>
                {m.body && <div style={{ fontSize: 12 }}>{m.body}</div>}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Preview Modal for Files */}
      {previewFile && (
        <Modal title={previewFile.name} onClose={() => {
           URL.revokeObjectURL(previewFile.url);
           setPreviewFile(null);
        }}>
           <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8, overflow: 'hidden', height: previewFile.isImage ? 'auto' : '75vh' }}>
             {previewFile.isImage ? (
               <img src={previewFile.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
             ) : (
               <iframe src={previewFile.url} title={previewFile.name} style={{ width: '100%', height: '100%', border: 'none' }} />
             )}
           </div>
        </Modal>
      )}

      {/* Image Gallery */}
      {viewGallery && (
        <ImageGalleryViewer 
          images={viewGallery.images} 
          initialIndex={viewGallery.initialIndex} 
          onClose={() => {
            viewGallery.images.forEach(img => URL.revokeObjectURL(img.url));
            setViewGallery(null);
          }} 
        />
      )}

      {/* Delete Confirmation Dialog */}
      {fileToDelete && (
        <ConfirmDialog
          title="מחיקת קובץ"
          message={`האם למחוק את "${fileToDelete.name}" לצמיתות? לא ניתן יהיה לשחזר את הקובץ לאחר מכן.`}
          confirmText="מחק קובץ"
          type="error"
          loading={pendingDelete === fileToDelete.id}
          onClose={() => {
            if (!pendingDelete) setFileToDelete(null);
          }}
          onConfirm={() => void handleDelete(fileToDelete.id, fileToDelete.name)}
        />
      )}
    </PremiumLock>
  );
};
