import React from 'react';
import { motion } from 'framer-motion';
import { Icon, Btn, Modal, TagBadge, Select, FeedbackModal, EmptyState, PageBackground, ConfirmDialog } from '../components/Shared';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { ScreenBoundary } from '../components/ScreenBoundary';

type Point = { x: number; y: number };
type PhotoDrawing = {
  type: 'pen' | 'rect';
  x: number;
  y: number;
  w?: number;
  h?: number;
  points?: Point[];
  color: string;
};

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;

const ApprovedBadge = ({ compact = false }: { compact?: boolean }) => (
  <div
    style={{
      position: "absolute",
      top: compact ? 8 : 12,
      left: compact ? 8 : 12,
      zIndex: 3,
      padding: compact ? "3px 8px" : "6px 12px",
      borderRadius: 999,
      background: "rgba(19, 121, 70, .94)",
      color: "#fff",
      fontSize: compact ? 11 : 13,
      fontWeight: 800,
      boxShadow: "0 6px 18px rgba(0,0,0,.18)",
      border: "1px solid rgba(255,255,255,.5)",
    }}
  >
    מאושר
  </div>
);

const DefectsTable = ({ photos, onSelect, contractors, setFeedback }: { photos: any[], onSelect: (p: any) => void, contractors: any[], setFeedback: (f: any) => void }) => {
  const getContractorName = (id?: string) => contractors.find(c => c._id === id)?.name || "לא שויך";
  const getPriorityColor = (p?: string) => p === 'קריטית' ? 'var(--danger)' : p === 'נמוכה' ? 'var(--text3)' : 'var(--warning)';
  const getStatusColor = (s?: string) => s === 'תוקן' ? '#34C759' : s === 'אושר' ? '#137946' : s === 'בטיפול' ? '#007AFF' : '#FF9500';
  const [exporting, setExporting] = React.useState(false);

  const performExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      
      const container = document.createElement('div');
      container.style.padding = '40px';
      container.style.fontFamily = "'Heebo', sans-serif";
      container.style.direction = "rtl";
      container.style.textAlign = "right";
      container.style.color = "#000";
      container.style.background = "#fff";

      let html = `
        <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="margin: 0; font-size: 28px; color: #111;">דוח ליקויים (Snagging)</h1>
            <p style="margin: 4px 0 0 0; color: #555; font-size: 14px;">הופק בתאריך: ${new Date().toLocaleDateString('he-IL')}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Build<span style="color: #FF9500;">Sync</span></div>
            <img src="/logo.png" style="height: 48px; width: auto; object-fit: contain;" />
          </div>
        </div>
      `;

      for (const p of photos) {
        html += `
          <div style="display: flex; gap: 20px; border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin-bottom: 20px; page-break-inside: avoid;">
            <div style="flex: 0 0 160px; height: 120px; background: #eee; border-radius: 8px; overflow: hidden;">
              ${p.fileUrl ? `<img src="${p.fileUrl}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous"/>` : ''}
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 8px 0; font-size: 18px;">${p.label || 'ללא תיאור'}</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #666; width: 100px;">מיקום:</td>
                  <td style="padding: 4px 0; font-weight: 600;">${p.location || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #666;">קבלן מבצע:</td>
                  <td style="padding: 4px 0; font-weight: 600;">${getContractorName(p.assigneeId)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #666;">עדיפות:</td>
                  <td style="padding: 4px 0; font-weight: 600; color: ${getPriorityColor(p.priority)};">${p.priority || 'רגילה'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #666;">סטטוס:</td>
                  <td style="padding: 4px 0; font-weight: 600; color: ${getStatusColor(p.defectStatus)};">${p.defectStatus || 'פתוח'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #666;">יעד לתיקון:</td>
                  <td style="padding: 4px 0; font-weight: 600;">${p.dueDate ? new Date(p.dueDate).toLocaleDateString('he-IL') : 'לא הוגדר'}</td>
                </tr>
              </table>
            </div>
          </div>
        `;
      }

      container.innerHTML = html;

      const opt = {
        margin: 10,
        filename: `defect-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(container).save();
      setFeedback({ title: "הדוח הופק בהצלחה", message: "דוח הליקויים נשמר במכשירך.", type: "success" });
    } catch (error) {
      console.error("PDF Export failed:", error);
      setFeedback({ title: "שגיאה", message: "שגיאה בהפקת הדוח. נסה שנית.", type: "error" });
    } finally {
      setExporting(false);
    }
  };

  if (photos.length === 0) return <EmptyState icon="check-circle" title="אין ליקויים פתוחים" description="לא נמצאו תמונות שתוייגו כ'בעיה' או 'בדיקה'." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>ניהול ליקויים ({photos.length})</h3>
        <Btn size="sm" onClick={performExport} variant="outline" disabled={exporting}>
          <Icon n={exporting ? "loader" : "download"} s={14}/> {exporting ? "מכין דוח..." : "ייצוא דוח PDF"}
        </Btn>
      </div>
      <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", minWidth: 700 }}>
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--text2)" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>תמונה</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>תיאור ליקוי</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>מיקום</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>קבלן מבצע</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>עדיפות</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>סטטוס</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>תאריך יעד</th>
            </tr>
          </thead>
          <tbody>
            {photos.map(p => (
              <tr key={p._id} onClick={() => onSelect(p)} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "var(--bg)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: "var(--border)", overflow: "hidden" }}>
                    {p.fileUrl && <img src={p.fileUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500 }}>{p.label}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text2)" }}>{p.location}</td>
                <td style={{ padding: "12px 16px", fontSize: 12 }}>{getContractorName(p.assigneeId)}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: getPriorityColor(p.priority), fontWeight: 600 }}>{p.priority || "רגילה"}</td>
                <td style={{ padding: "12px 16px" }}><span style={{ padding: "4px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${getStatusColor(p.defectStatus || "פתוח")}22`, color: getStatusColor(p.defectStatus || "פתוח") }}>{p.defectStatus || "פתוח"}</span></td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text2)" }}>{p.dueDate ? new Date(p.dueDate).toLocaleDateString('he-IL') : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PhotosScreen = () => {
  const { projectId } = useCurrentProject();

  // Paginated photos — 50 per page
  const {
    results: paginatedPhotos,
    status: photosStatus,
    loadMore,
  } = usePaginatedQuery(
    api.queries.listPhotos,
    projectId ? { projectId } : 'skip',
    { initialNumItems: 50 },
  );
  const totalCount = useQuery(api.queries.getPhotosCount, projectId ? { projectId } : 'skip');

  const currentIdentity = useQuery(api.users.currentIdentity, {});
  const { data: initialPhotos, loading, error, refetch, mode } = useDataSource<any[]>('photos', { db: paginatedPhotos as any });
  const { mutate } = useDataMutation('photos');
  const { mutate: notesMutate } = useDataMutation('notes');
  const [viewMode, setViewMode] = React.useState<"gallery" | "snagging">("gallery");
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any>(null);
  const [filter, setFilter] = React.useState("הכל");
  const uploadProjectFile = useProjectFileUploader();
  const createPhotoFromProjectFile = useMutation(api.photos.createFromProjectFile);
  const createAnnotatedVersion = useMutation(api.photos.createAnnotatedVersion);
  const deleteProjectFile = useMutation(api.projectFiles.deleteProjectFile);
  const updatePhotoDefect = useMutation(api.mutations.updatePhotoDefect);
  
  const contractorsData = useQuery(api.queries.listContractors, projectId ? { projectId } : "skip");
  const contractors = React.useMemo(() => contractorsData || [], [contractorsData]);
  const selectedPhotoId = typeof (selected?._id || selected?.id) === 'string'
    ? (selected._id || selected.id) as Id<'photos'>
    : null;
  const selectedDetails = useQuery(
    api.photos.getDetails,
    selectedPhotoId ? { photoId: selectedPhotoId } : "skip",
  );
  
  React.useEffect(() => {
    if (!paginatedPhotos) return;
    setPhotos(prev => {
      // Build a map of current local blob previews so we don't overwrite them
      // with potentially-stale Convex URLs before Convex catches up
      const blobUrlById = new Map<string, string>();
      for (const p of prev) {
        const id = String(p._id ?? p.id);
        if (p.fileUrl?.startsWith('blob:')) {
          blobUrlById.set(id, p.fileUrl);
        }
      }
      return paginatedPhotos.map((p: any) => {
        const id = String(p._id ?? p.id);
        const blobUrl = blobUrlById.get(id);
        // Keep the local blob URL until Convex provides a fresh signed URL
        // A fresh URL means Convex has processed the new version
        if (blobUrl && p.fileUrl && !p.fileUrl.startsWith('blob:')) {
          // Convex returned a new URL — check if it's different from the old one
          // by comparing versionNumber (incremented after save)
          const prevPhoto = prev.find(x => String(x._id ?? x.id) === id);
          if (prevPhoto && p.versionNumber > (prevPhoto.versionNumber ?? 0)) {
            // New version landed — use Convex URL and revoke the blob
            URL.revokeObjectURL(blobUrl);
            return p;
          }
          // Still waiting for Convex — keep the blob preview
          return { ...p, fileUrl: blobUrl };
        }
        return p;
      });
    });
  }, [paginatedPhotos]);



  const [drawMode, setDrawMode] = React.useState("pen");
  const [drawColor, setDrawColor] = React.useState("#FF3B30");
  const [noteText, setNoteText] = React.useState("");
  const [noteAssignee, setNoteAssignee] = React.useState("contractor");
  const [deletingPhoto, setDeletingPhoto] = React.useState(false);
  const [savingTag, setSavingTag] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [savingVersion, setSavingVersion] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [pendingTagChange, setPendingTagChange] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'error' | 'info' | 'success' } | null>(null);
  const [drawings, setDrawings] = React.useState<PhotoDrawing[]>([]);
  const [previewDrawing, setPreviewDrawing] = React.useState<PhotoDrawing | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const drawing = React.useRef(false);
  const currentPath = React.useRef<Point[]>([]);
  const dragStart = React.useRef<Point | null>(null);

  const tags = ["הכל","התקדמות","בעיה","בדיקה","אישור"];
  const photoTags = ["התקדמות","בעיה","בדיקה","אישור"];
  const filtered = filter==="הכל"?photos:photos.filter(p=>p.tag===filter);
  const canManagePhotos = mode === 'mock' || currentIdentity?.role === 'owner' || currentIdentity?.role === 'manager';
  const canAnnotatePhotos = mode === 'mock' || currentIdentity?.role === 'owner' || currentIdentity?.role === 'manager' || currentIdentity?.role === 'inspector';
  const selectedIsApproved = selected?.tag === 'אישור';
  const canEditSelectedPhoto = canAnnotatePhotos && !selectedIsApproved;
  const selectedNotes = selectedDetails?.notes ?? [];

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    if (!canvasRef.current) return null;
    const r = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CANVAS_WIDTH,
      y: ((e.clientY - r.top) / r.height) * CANVAS_HEIGHT,
    };
  };

  const drawShape = React.useCallback((ctx: CanvasRenderingContext2D, shape: PhotoDrawing) => {
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (shape.type === 'rect') {
      ctx.strokeRect(shape.x, shape.y, shape.w ?? 0, shape.h ?? 0);
      return;
    }

    const points = shape.points ?? [];
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }, []);

  const redrawCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const shape of drawings) drawShape(ctx, shape);
    if (previewDrawing) drawShape(ctx, previewDrawing);
  }, [drawShape, drawings, previewDrawing]);

  React.useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  React.useEffect(() => {
    setDrawings([]);
    setPreviewDrawing(null);
    setNoteText("");
    currentPath.current = [];
    dragStart.current = null;
    drawing.current = false;
  }, [selected?._id, selected?.id]);

  const startDraw = (e: React.MouseEvent) => {
    if (!canEditSelectedPhoto) return;
    const point = getCanvasPoint(e as React.MouseEvent<HTMLCanvasElement>);
    if (!point) return;
    drawing.current = true;
    dragStart.current = point;
    currentPath.current = [point];
  };
  const doDraw = (e: React.MouseEvent) => {
    if (!drawing.current) return;
    const point = getCanvasPoint(e as React.MouseEvent<HTMLCanvasElement>);
    if (!point || !dragStart.current) return;

    if (drawMode === 'square') {
      setPreviewDrawing({
        type: 'rect',
        x: dragStart.current.x,
        y: dragStart.current.y,
        w: point.x - dragStart.current.x,
        h: point.y - dragStart.current.y,
        color: drawColor,
      });
      return;
    }

    currentPath.current = [...currentPath.current, point];
    setPreviewDrawing({
      type: 'pen',
      x: currentPath.current[0].x,
      y: currentPath.current[0].y,
      points: currentPath.current,
      color: drawColor,
    });
  };
  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (previewDrawing) {
      const hasSize = previewDrawing.type === 'pen'
        ? (previewDrawing.points?.length ?? 0) > 1
        : Math.abs(previewDrawing.w ?? 0) > 2 && Math.abs(previewDrawing.h ?? 0) > 2;
      if (hasSize) {
        setDrawings(prev => [...prev, previewDrawing]);
      }
    }
    setPreviewDrawing(null);
    currentPath.current = [];
    dragStart.current = null;
  };
  const clearCanvas = () => {
    setDrawings([]);
    setPreviewDrawing(null);
  };
  const openUpload = () => {
    if (uploadingPhoto) return;
    fileInputRef.current?.click();
  };
  const uploadPhoto = async (file: File | null) => {
    if (!file) return;
    if (!projectId || mode !== 'db') {
      setFeedback({ title: "אין חיבור", message: "העלאת תמונות זמינה רק בחיבור אמיתי לפרויקט.", type: "error" });
      return;
    }

    let createdFileId: Id<'projectFiles'> | null = null;
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadProjectFile({
        projectId,
        file,
        usage: 'photo',
        kind: 'image',
      });
      createdFileId = uploaded.fileId as Id<'projectFiles'>;
      await createPhotoFromProjectFile({
        projectId,
        projectFileId: createdFileId,
        label: file.name,
        location: "לא הוגדר",
        stageLabel: "תיעוד חדש",
        tag: "התקדמות",
      });
      refetch();
      setFeedback({
        title: "התמונה הועלתה",
        message: uploaded.storedSize < uploaded.originalSize
          ? `התמונה נשמרה לאחר כיווץ (${Math.round((1 - uploaded.storedSize / uploaded.originalSize) * 100)}% פחות).`
          : "התמונה נשמרה בפרויקט.",
        type: "success",
      });
    } catch (err) {
      if (createdFileId) {
        try {
          await deleteProjectFile({ fileId: createdFileId });
        } catch {
          // Best-effort cleanup only.
        }
      }
      setFeedback({ title: "שגיאה", message: "שגיאה בהעלאת התמונה", type: "error" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const loadCanvasImage = async (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  const canvasToBlob = async (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not create image blob'));
    }, 'image/jpeg', 0.9);
  });

  const drawImageCover = (ctx: CanvasRenderingContext2D, image: HTMLImageElement) => {
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const scale = Math.max(CANVAS_WIDTH / imageWidth, CANVAS_HEIGHT / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    ctx.drawImage(
      image,
      (CANVAS_WIDTH - width) / 2,
      (CANVAS_HEIGHT - height) / 2,
      width,
      height,
    );
  };

  const drawNoteOnImage = (ctx: CanvasRenderingContext2D, text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.62)';
    ctx.fillRect(0, CANVAS_HEIGHT - 54, CANVAS_WIDTH, 54);
    ctx.fillStyle = '#fff';
    ctx.font = "600 15px 'Heebo', sans-serif";
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    const words = cleanText.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > CANVAS_WIDTH - 28 && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, 2).forEach((value, index) => {
      ctx.fillText(value, CANVAS_WIDTH - 14, CANVAS_HEIGHT - 32 + index * 20);
    });
    ctx.restore();
  };

  const saveAnnotatedVersion = async () => {
    if (!selected || !selectedPhotoId || savingVersion) return;
    if (selectedIsApproved) {
      setFeedback({ title: "קובץ מאושר", message: "קובץ במצב אישור הוא סופי. כדי להוסיף סימונים יש להחזיר אותו לסטטוס אחר.", type: "info" });
      return;
    }
    if (!projectId || mode !== 'db') {
      setFeedback({ title: "אין חיבור", message: "שמירת סימונים זמינה רק בחיבור אמיתי לפרויקט.", type: "error" });
      return;
    }
    if (!selected.fileUrl) {
      setFeedback({ title: "שגיאה", message: "לא נמצאה תמונה לשמירה", type: "error" });
      return;
    }
    if (!noteText.trim() && drawings.length === 0) {
      setFeedback({ title: "אין שינויים", message: "הוסף הערה או סימון לפני שמירה.", type: "info" });
      return;
    }

    let createdFileId: Id<'projectFiles'> | null = null;
    setSavingVersion(true);
    try {
      const output = document.createElement('canvas');
      output.width = CANVAS_WIDTH;
      output.height = CANVAS_HEIGHT;
      const ctx = output.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      ctx.fillStyle = selected.color || '#7B8FA1';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const image = await loadCanvasImage(selected.fileUrl);
      drawImageCover(ctx, image);
      for (const shape of drawings) {
        drawShape(ctx, shape);
      }
      drawNoteOnImage(ctx, noteText);

      const blob = await canvasToBlob(output);
      const baseName = (selected.label || 'photo').replace(/\.[^.]+$/, '');
      const nextVersion = (selected.versionNumber ?? selectedDetails?.versions?.[0]?.versionNumber ?? 0) + 1;
      const file = new File([blob], `${baseName}-version-${nextVersion}.jpg`, { type: blob.type || 'image/jpeg' });
      const uploaded = await uploadProjectFile({
        projectId,
        file,
        usage: 'photo',
        kind: 'image',
      });
      createdFileId = uploaded.fileId as Id<'projectFiles'>;

      await createAnnotatedVersion({
        photoId: selectedPhotoId,
        annotatedProjectFileId: createdFileId,
        noteText: noteText.trim() || undefined,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        annotations: drawings.map((shape) => ({
          type: shape.type === 'rect' ? 'rect' : 'pen',
          x: shape.x,
          y: shape.y,
          ...(shape.w !== undefined ? { w: shape.w } : {}),
          ...(shape.h !== undefined ? { h: shape.h } : {}),
          ...(shape.points ? { points: shape.points } : {}),
          color: shape.color,
        })),
      });

      // Create a preview URL for the new version so the UI updates immediately
      // (before Convex returns the signed storage URL)
      const previewUrl = URL.createObjectURL(blob);

      setPhotos(prev => prev.map(p =>
        p.id === selected.id || p._id === selected._id
          ? {
              ...p,
              fileUrl: previewUrl,
              versionNumber: nextVersion,
              latestVersionId: createdFileId,
              notesCount: (p.notesCount || 0) + (noteText.trim() ? 1 : 0),
            }
          : p,
      ));
      setSelected((prev: any) => prev ? {
        ...prev,
        fileUrl: previewUrl,
        versionNumber: nextVersion,
        latestVersionId: createdFileId,
        notesCount: (prev.notesCount || 0) + (noteText.trim() ? 1 : 0),
      } : prev);
      setNoteText('');
      setDrawings([]);
      setPreviewDrawing(null);
      setFeedback({ title: 'נשמר', message: 'ההערה והסימונים נשמרו כגרסה חדשה.', type: 'success' });

    } catch (err) {
      if (createdFileId) {
        try {
          await deleteProjectFile({ fileId: createdFileId });
        } catch {
          // Best-effort cleanup only.
        }
      }
      setFeedback({ title: "שגיאה", message: "שגיאה בשמירת הגרסה", type: "error" });
    } finally {
      setSavingVersion(false);
    }
  };

  const addNote = async () => {
    const currentNoteText = noteText.trim();
    const currentAssignee = noteAssignee;
    
    await saveAnnotatedVersion();

    if (currentNoteText && currentAssignee) {
      try {
        let roleName = '';
        if (currentAssignee === 'manager') roleName = 'מנהל הפרויקט';
        else if (currentAssignee === 'inspector') roleName = 'המפקח';
        else if (currentAssignee === 'contractor') roleName = 'הקבלן המבצע';
        else {
           const c = contractors.find((c: any) => c._id === currentAssignee);
           roleName = c ? c.name : 'הקבלן';
        }

        const msg = `הערה חדשה בתמונה "${selected?.label || ''}" עבור ${roleName}: "${currentNoteText}" — נדרשת התייחסות.`;
        
        await notesMutate('saveNote', {
          projectId: projectId || 'dummy',
          text: msg,
          thread: currentAssignee === 'manager' || currentAssignee === 'inspector' ? 'internal' : 'contractor'
        });
      } catch (err) {
        console.error("Failed to add chat note", err);
      }
    }
  };

  const deleteSelectedPhoto = async () => {
    if (!selected || deletingPhoto) return;
    const photoId = selected._id || selected.id;
    const isPersisted = typeof photoId === 'string';
    const previousPhotos = photos;

    setDeletingPhoto(true);
    setPhotos(prev => prev.filter(p => p.id !== selected.id && p._id !== selected._id));
    setSelected(null);

    try {
      if (isPersisted) {
        await mutate('deletePhoto', { photoId });
        refetch();
      }
      if (selected.fileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selected.fileUrl);
      }
    } catch (err) {
      setPhotos(previousPhotos);
      setSelected(selected);
      setFeedback({ title: "שגיאה", message: "שגיאה במחיקת התמונה", type: "error" });
    } finally {
      setDeletingPhoto(false);
      setDeleteConfirmOpen(false);
    }
  };

  const requestTagChange = (tag: string) => {
    if (!selected || tag === selected.tag) return;
    setPendingTagChange(tag);
  };

  const confirmTagChange = async () => {
    if (!selected || !pendingTagChange || savingTag) return;
    const photoId = selected._id || selected.id;
    const isPersisted = typeof photoId === 'string';
    const previousPhotos = photos;
    const previousSelected = selected;
    const nextTag = pendingTagChange;

    setSavingTag(true);
    setPhotos(prev => prev.map(p => (
      p.id === selected.id || p._id === selected._id
        ? {
          ...p,
          tag: nextTag,
          ...(nextTag === 'אישור' ? {
            fileUrl: p.originalFileUrl ?? p.fileUrl,
            versionNumber: 0,
            latestVersionId: null,
            notesCount: 0,
          } : {}),
        }
        : p
    )));
    setSelected((prev: any) => prev ? {
      ...prev,
      tag: nextTag,
      ...(nextTag === 'אישור' ? {
        fileUrl: prev.originalFileUrl ?? prev.fileUrl,
        versionNumber: 0,
        latestVersionId: null,
        notesCount: 0,
      } : {}),
    } : prev);

    try {
      if (isPersisted) {
        await mutate('updatePhotoTag', {
          photoId,
          tag: nextTag,
        });
        refetch();
      }
      if (nextTag === 'אישור') {
        setDrawings([]);
        setPreviewDrawing(null);
        setNoteText("");
      }
      setPendingTagChange(null);
    } catch (err) {
      setPhotos(previousPhotos);
      setSelected(previousSelected);
      setFeedback({ title: "שגיאה", message: "שגיאה בשינוי סטטוס התמונה", type: "error" });
    } finally {
      setSavingTag(false);
    }
  };

  const uploadInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      style={{display: "none"}}
      onChange={e => {
        uploadPhoto(e.target.files?.[0] ?? null);
        e.currentTarget.value = "";
      }}
    />
  );

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      {photos.length === 0 ? (
        <div className="page-content" style={{position:"relative",zIndex:1,minHeight:400}}>
          <PageBackground image="/empty_states/photos.png" />
          <EmptyState
            icon="camera"
            title="אין תמונות"
            description="נראה שעדיין לא הועלו תמונות תיעוד לפרויקט."
            action={
              <Btn size="lg" onClick={openUpload} disabled={uploadingPhoto} style={{padding: "12px 28px", fontSize: 16}}>
                <Icon n="plus" s={16}/> {uploadingPhoto ? "מעלה..." : "העלה תמונה"}
              </Btn>
            }
          />
          {uploadInput}
        </div>
      ) : (
      <div className="page-content">
      {/* View Mode Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface)", padding: 4, borderRadius: 12, border: "1px solid var(--border)", width: "fit-content", marginBottom: 24 }}>
        <button onClick={()=>setViewMode("gallery")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: viewMode === "gallery" ? "var(--bg)" : "transparent", color: viewMode === "gallery" ? "var(--text1)" : "var(--text2)", border: viewMode === "gallery" ? "1px solid var(--border)" : "1px solid transparent", cursor: "pointer", transition: "all 0.2s", boxShadow: viewMode === "gallery" ? "0 2px 8px rgba(0,0,0,0.04)" : "none" }}>🖼️ גלריה</button>
        <button onClick={()=>setViewMode("snagging")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: viewMode === "snagging" ? "var(--bg)" : "transparent", color: viewMode === "snagging" ? "var(--text1)" : "var(--text2)", border: viewMode === "snagging" ? "1px solid var(--border)" : "1px solid transparent", cursor: "pointer", transition: "all 0.2s", boxShadow: viewMode === "snagging" ? "0 2px 8px rgba(0,0,0,0.04)" : "none" }}>📋 ניהול ליקויים (Snagging)</button>
      </div>

      {viewMode === "gallery" ? (
        <>
        {uploadInput}
        {/* Filter + upload */}
        <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        {tags.map(t=>(
          <button key={t} onClick={()=>setFilter(t)} style={{padding:"5px 12px",border:"1px solid",borderColor:filter===t?"var(--accent)":"var(--border)",borderRadius:20,fontSize:12,background:filter===t?"var(--accent-light)":"var(--surface)",color:filter===t?"var(--accent)":"var(--text2)",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:filter===t?600:400}}>
            {t}
          </button>
        ))}
        <Btn size="sm" style={{marginRight:"auto"}} onClick={openUpload} disabled={uploadingPhoto}>
          <Icon n="camera" s={13}/> {uploadingPhoto ? "מעלה..." : "העלה תמונה"}
        </Btn>
      </div>

      <motion.div
        className="photo-grid"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        initial="hidden"
        animate="show"
      >
        {filtered.map(p=>(
          <motion.div
            key={p.id}
            className="photo-card"
            variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
            whileHover={{ y: -5, boxShadow: "var(--shadow-xl)" }}
            whileTap={{ scale: 0.97 }}
            onClick={()=>setSelected(p)}
          >
            <div className="photo-thumb" style={{background:p.color,position:"relative"}}>
              {p.fileUrl ? (
                <img src={p.fileUrl} alt={p.label} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              ) : (
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                  <Icon n="camera" s={28} c="rgba(255,255,255,.5)"/>
                  <span style={{fontSize:11,color:"rgba(255,255,255,.7)",textAlign:"center",padding:"0 8px"}}>{p.label}</span>
                </div>
              )}
              {p.notesCount>0 && <div style={{position:"absolute",top:6,left:6,background:"var(--accent)",color:"#fff",borderRadius:10,fontSize:10,fontWeight:700,padding:"1px 5px"}}>{p.notesCount}</div>}
              {p.tag === "אישור" && <ApprovedBadge compact />}
              <div style={{position:"absolute",top:6,right:6}}><TagBadge tag={p.tag}/></div>
            </div>
            <div className="photo-info">
              <div style={{fontWeight:600,fontSize:13,marginBottom:3}}>{p.location}</div>
              <div style={{color:"var(--text3)",fontSize:11,display:"flex",justifyContent:"space-between"}}>
                <span>{p.stage}</span><span>{p.date}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Pagination footer */}
      {(photosStatus !== 'Exhausted' || (totalCount !== undefined && totalCount > photos.length)) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 24 }}>
          {totalCount !== undefined && (
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>
              מוצגות {photos.length} תמונות מתוך {totalCount}
            </span>
          )}
          {photosStatus !== 'Exhausted' && (
            <Btn
              size="sm"
              variant="outline"
              onClick={() => loadMore(50)}
              disabled={photosStatus === 'LoadingMore'}
            >
              <Icon n={photosStatus === 'LoadingMore' ? 'loader' : 'chevron-down'} s={14} />
              {photosStatus === 'LoadingMore' ? 'טוען...' : 'טעינת עוד תמונות'}
            </Btn>
          )}
        </div>
      )}
      </>

      ) : (
        <DefectsTable 
          photos={photos.filter(p => p.tag === 'בעיה' || p.tag === 'בדיקה')} 
          onSelect={setSelected} 
          contractors={contractors} 
          setFeedback={setFeedback}
        />
      )}

      {selected && (
        <Modal onClose={()=>setSelected(null)} title={`${selected.label} — ${selected.date}`} width={760}>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {/* Photo + canvas */}
            <div style={{flex:"1 1 min(100%, 400px)"}}>
              <div style={{position:"relative",borderRadius:8,overflow:"hidden",userSelect:"none"}}>
                {selected.fileUrl ? (
                  <img src={selected.fileUrl} alt={selected.label} style={{width:"100%",height:300,objectFit:"cover",display:"block",background:selected.color}}/>
                ) : (
                  <div style={{height:300,background:selected.color,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{color:"rgba(255,255,255,.5)",fontSize:13}}>{selected.label}</span>
                  </div>
                )}
                {selectedIsApproved && <ApprovedBadge />}
                <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                  style={{position:"absolute",inset:0,width:"100%",height:"100%",cursor:canEditSelectedPhoto ? "crosshair" : "default",pointerEvents:canEditSelectedPhoto ? "auto" : "none"}}
                  onMouseDown={startDraw} onMouseMove={doDraw} onMouseUp={endDraw} onMouseLeave={endDraw}/>
              </div>
              {/* Drawing tools */}
              {selectedIsApproved ? (
                <div style={{marginTop:10,fontSize:12,color:"var(--text2)",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px"}}>
                  הקובץ מאושר וסופי. לא ניתן להוסיף הערות או סימונים במצב אישור.
                </div>
              ) : (
                <div style={{marginTop:10,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:12,color:"var(--text2)",marginLeft:4}}>כלי עריכה:</span>
                  {["pen","square"].map(t=>(
                    <button key={t} onClick={()=>setDrawMode(t)} disabled={!canEditSelectedPhoto} style={{padding:"4px 8px",borderRadius:6,border:"1px solid",borderColor:drawMode===t?"var(--accent)":"var(--border)",background:drawMode===t?"var(--accent-light)":"var(--surface)",cursor:canEditSelectedPhoto?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:4,fontSize:11,fontFamily:"'Heebo',sans-serif",color:drawMode===t?"var(--accent)":"var(--text2)",opacity:canEditSelectedPhoto?1:.55}}>
                      <Icon n={t==="pen"?"pen":"square"} s={12}/>{t==="pen"?"עט":"מלבן"}
                    </button>
                  ))}
                  {["#FF3B30","#FF9500","#34C759","#007AFF"].map(c=>(
                    <button
                      key={c}
                      type="button"
                      aria-label={`בחר צבע ${c}`}
                      onClick={()=>setDrawColor(c)}
                      disabled={!canEditSelectedPhoto}
                      style={{width:18,height:18,borderRadius:"50%",background:c,cursor:canEditSelectedPhoto?"pointer":"not-allowed",border:`2px solid ${drawColor===c?"var(--text1)":"transparent"}`,transition:"border .1s",padding:0,opacity:canEditSelectedPhoto?1:.55}}
                    />
                  ))}
                  <button onClick={clearCanvas} disabled={!canEditSelectedPhoto} style={{marginRight:"auto",fontSize:11,color:"var(--text3)",background:"none",border:"none",cursor:canEditSelectedPhoto?"pointer":"not-allowed",fontFamily:"'Heebo',sans-serif",opacity:canEditSelectedPhoto?1:.55}}>נקה</button>
                </div>
              )}
            </div>
            {/* Notes panel */}
            <div style={{flex:"0 0 200px",display:"flex",flexDirection:"column",gap:8}}>
              {canManagePhotos && (
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{fontWeight:600,fontSize:13}}>סטטוס קובץ</div>
                  <Select
                    value={selected.tag || "התקדמות"}
                    onChange={requestTagChange}
                    style={{fontSize:12}}
                  >
                    {photoTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </Select>
                </div>
              )}
              { (selected.tag === 'בעיה' || selected.tag === 'בדיקה') && canManagePhotos && (
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:8,background:"var(--surface)",padding:8,borderRadius:8,border:"1px solid var(--border)"}}>
                  <div style={{fontWeight:600,fontSize:12}}>פרטי ליקוי (Snagging)</div>
                  <Select value={selected.defectStatus || "פתוח"} onChange={(v: string)=>updatePhotoDefect({photoId:selectedPhotoId!, defectStatus: v as any}).then(refetch)} style={{fontSize:11}}>
                    <option value="פתוח">סטטוס: פתוח</option>
                    <option value="בטיפול">סטטוס: בטיפול</option>
                    <option value="תוקן">סטטוס: תוקן</option>
                    <option value="אושר">סטטוס: אושר</option>
                  </Select>
                  <Select value={selected.priority || "רגילה"} onChange={(v: string)=>updatePhotoDefect({photoId:selectedPhotoId!, priority: v as any}).then(refetch)} style={{fontSize:11}}>
                    <option value="נמוכה">עדיפות: נמוכה</option>
                    <option value="רגילה">עדיפות: רגילה</option>
                    <option value="קריטית">עדיפות: קריטית</option>
                  </Select>
                  <Select value={selected.assigneeId || ""} onChange={(v: string)=>updatePhotoDefect({photoId:selectedPhotoId!, assigneeId: v ? (v as any) : undefined}).then(refetch)} style={{fontSize:11}}>
                    <option value="">ללא שיוך לקבלן</option>
                    {contractors.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </Select>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <span style={{fontSize:11,color:"var(--text2)"}}>תאריך יעד לתיקון:</span>
                    <input type="date" value={selected.dueDate || ""} onChange={e=>updatePhotoDefect({photoId:selectedPhotoId!, dueDate: e.target.value || undefined}).then(refetch)} style={{fontSize:11,padding:"6px",borderRadius:6,border:"1px solid var(--border)"}}/>
                  </div>
                </div>
              )}
              <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>הערות ({selectedNotes.length || selected.notesCount || 0})</div>
              <div style={{flex:1,maxHeight:240,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
                {selectedNotes.length>0
                  ? selectedNotes.map((note: any, i: number)=>(
                    <div key={note.id || note._id || i} style={{background:"#FAFAF8",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",fontSize:12}}>
                      <span style={{fontWeight:600,color:"var(--accent)"}}>{note.authorName || "משתמש"}</span>
                      <p style={{marginTop:4,color:"var(--text2)"}}>{note.text}</p>
                    </div>
                  ))
                  : <div style={{color:"var(--text3)",fontSize:12}}>אין הערות עדיין</div>
                }
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder={selectedIsApproved ? "קובץ מאושר - אין הערות חדשות" : "הוסף הערה..."} rows={3}
                  disabled={!canEditSelectedPhoto}
                  style={{width:"100%",border:"1px solid var(--border)",borderRadius:8,padding:"8px",fontSize:12,fontFamily:"'Heebo',sans-serif",resize:"none",outline:"none",opacity:canEditSelectedPhoto?1:.55}}/>
                <div style={{display:"flex",gap:6}}>
                  <Select value={noteAssignee} onChange={setNoteAssignee} disabled={!canEditSelectedPhoto} style={{flex:1,fontSize:11}}>
                    <option value="manager">בעל בנייה</option>
                    <option value="inspector">מפקח</option>
                    <option value="contractor">לקבלן כללי</option>
                    {contractors.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </Select>
                  <Btn size="sm" onClick={addNote} disabled={savingVersion || !canEditSelectedPhoto}>
                    <Icon n="send" s={12}/>
                  </Btn>
                </div>
              </div>
            </div>
          </div>
          <div style={{marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:8}}>
              <TagBadge tag={selected.tag}/>
              <span style={{fontSize:12,color:"var(--text3)"}}>{selected.stage} · {selected.location}</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              {canManagePhotos && (
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deletingPhoto}
                  style={{color:"var(--danger)",borderColor:"var(--danger)"}}
                >
                  <Icon n="trash" s={13}/> {deletingPhoto ? "מוחק..." : "מחק תמונה"}
                </Btn>
              )}
              <Btn size="sm" variant="ghost" onClick={saveAnnotatedVersion} disabled={savingVersion || !canEditSelectedPhoto}>
                <Icon n="save" s={13}/> {savingVersion ? "שומר..." : "שמור גרסה"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
      {feedback && (
        <FeedbackModal
          title={feedback.title}
          message={feedback.message}
          type={feedback.type}
          onClose={() => setFeedback(null)}
        />
      )}
      {pendingTagChange && (
        <ConfirmDialog
          title="שינוי סטטוס תמונה"
          message={pendingTagChange === "אישור"
            ? 'להעביר את הקובץ לאישור סופי? פעולה זו תציג את התמונה המקורית עם תג מאושר ותמחק גרסאות סימון קודמות.'
            : `לשנות את סטטוס התמונה ל"${pendingTagChange}"?`}
          confirmText={savingTag ? "שומר..." : "שנה סטטוס"}
          cancelText="ביטול"
          loading={savingTag}
          onClose={() => !savingTag && setPendingTagChange(null)}
          onConfirm={confirmTagChange}
        />
      )}
      {deleteConfirmOpen && (
        <ConfirmDialog
          title="מחיקת תמונה"
          message="למחוק את התמונה? הפעולה תמחק גם את כתובת התמונה, ההערות והסימונים שלה מהמערכת."
          confirmText={deletingPhoto ? "מוחק..." : "מחק תמונה"}
          cancelText="ביטול"
          loading={deletingPhoto}
          onClose={() => !deletingPhoto && setDeleteConfirmOpen(false)}
          onConfirm={deleteSelectedPhoto}
        />
      )}
    </div>
      )}
    </ScreenBoundary>
  );
};
