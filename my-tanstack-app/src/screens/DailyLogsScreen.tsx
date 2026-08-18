import React, { useState } from 'react';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSearch } from '@tanstack/react-router';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { PageBackground, EmptyState, Btn, Icon, ConfirmDialog, FeedbackModal, PremiumLock, Modal } from '../components/Shared';
import { ImageGalleryViewer } from '../components/ImageGalleryViewer';
import { useRequireRole } from '../hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';
import { useSubscription } from '../hooks/useSubscription';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';
import type { Id } from '../../convex/_generated/dataModel';

export const DailyLogsScreen = () => {
  const { role, allowed, loading: roleLoading } = useRequireRole(['owner', 'manager', 'inspector', 'contractor']);
  const { projectId, projects, setCurrentProject } = useCurrentProject();
  const { isProOrPremium } = useSubscription();
  const search = useSearch({ from: '/daily-logs', shouldThrow: false }) as { project?: string; date?: string } | undefined;
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set([new Date().toISOString().slice(0, 7)]));
  const [filterStatus, setFilterStatus] = useState<'all' | 'locked' | 'draft'>('all');
  const [filterIssue, setFilterIssue] = useState<'all' | 'any_issue' | 'financial' | 'delay' | 'quality' | 'safety'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'week' | 'month'>('all');

  const logsForDate = useQuery(api.dailyLogs.getLogsByDate, projectId ? { projectId, date: selectedDate } : 'skip');
  const { results: allLogs, status: pagedStatus, loadMore } = usePaginatedQuery(
    api.dailyLogs.getLogs,
    projectId && activeTab === 'history' ? { projectId } : 'skip',
    { initialNumItems: 15 }
  );

  const filteredLogs = React.useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    return allLogs.filter(l => {
      if (filterStatus === 'locked' && l.status !== 'locked') return false;
      if (filterStatus === 'draft' && l.status === 'locked') return false;
      const logTs = new Date(l.date).getTime();
      if (filterPeriod === 'week' && logTs < weekAgo) return false;
      if (filterPeriod === 'month' && logTs < monthAgo) return false;
      if (filterIssue === 'any_issue' && (!l.issues || l.issues.length === 0)) return false;
      if (filterIssue === 'financial' && !l.issues?.some((iss: any) => iss.financialImpact)) return false;
      if (filterIssue === 'delay' && !l.issues?.some((iss: any) => iss.type === 'delay') && !l.activities?.some((act: any) => act.status === 'delayed')) return false;
      if (filterIssue === 'quality' && !l.issues?.some((iss: any) => iss.type === 'quality')) return false;
      if (filterIssue === 'safety' && !l.issues?.some((iss: any) => iss.type === 'safety')) return false;
      return true;
    });
  }, [allLogs, filterStatus, filterIssue, filterPeriod]);

  const stats = React.useMemo(() => ({
    total: allLogs.length,
    locked: allLogs.filter(l => l.status === 'locked').length,
    withIssues: allLogs.filter(l => l.issues && l.issues.length > 0).length,
    withFinancial: allLogs.filter(l => l.issues?.some((iss: any) => iss.financialImpact)).length,
  }), [allLogs]);

  const hasActiveFilter = filterStatus !== 'all' || filterIssue !== 'all' || filterPeriod !== 'all';

  const log = React.useMemo(() => {
    if (!logsForDate) return undefined;
    if (selectedLogId === 'new') return undefined;
    if (selectedLogId) {
      const found = logsForDate.find(l => l._id === selectedLogId);
      if (found) return found;
    }
    return logsForDate.length > 0 ? logsForDate[0] : undefined;
  }, [logsForDate, selectedLogId]);
  const contractors = useQuery(api.queries.listContractors, projectId ? { projectId } : 'skip') || [];

  const saveLog = useMutation(api.dailyLogs.saveLog);
  const lockLog = useMutation(api.dailyLogs.lockLog);
  const deleteLog = useMutation(api.dailyLogs.deleteLog);
  const deleteFile = useMutation(api.projectFiles.deleteProjectFileByStorageId);
  const uploadProjectFile = useProjectFileUploader();

  const [feedback, setFeedback] = useState<{ title: string, message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImagesCount, setUploadingImagesCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set());
  const [viewGallery, setViewGallery] = useState<{ images: { url: string }[], initialIndex: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const lastLoadedLogId = React.useRef<string | null>(null);

  // Handle push-notification deep links: ?project=<id>&date=<date>
  React.useEffect(() => {
    if (!search?.project) return;
    if (search.project !== projectId && projects.some((p: any) => p._id === search.project)) {
      setCurrentProject(search.project);
    }
    if (search.date) {
      setSelectedDate(search.date);
    }
  }, [search?.project, search?.date, projectId, projects, setCurrentProject]);

  // Local state for the form so we can edit before saving
  const [form, setForm] = useState({
    weather: '',
    temperature: '',
    workforce: [] as any[],
    activities: [] as any[],
    deliveries: [] as any[],
    issues: [] as any[],
    instructions: [] as any[],
    images: [] as { storageId: string, url?: string }[],
  });

  React.useEffect(() => {
    if (logsForDate === undefined) return;
    
    const currentLogId = log ? log._id : 'new';
    
    if (lastLoadedLogId.current !== currentLogId) {
      if (log) {
        setForm({
          weather: log.weather || '',
          temperature: log.temperature || '',
          workforce: log.workforce || [],
          activities: log.activities || [],
          deliveries: log.deliveries || [],
          issues: log.issues || [],
          instructions: log.instructions || [],
          images: log.images || [],
        });
      } else {
        setForm({ weather: '', temperature: '', workforce: [], activities: [], deliveries: [], issues: [], instructions: [], images: [] });
      }
      lastLoadedLogId.current = currentLogId;
    }
  }, [log, logsForDate]);

  if (roleLoading) return <AccessLoading />;
  if (!allowed) return <AccessDenied message="אין לך הרשאה לצפות ביומן עבודה יומי" />;

  const isLocked = log?.status === 'locked';
  const isInspectorOrManager = role === 'inspector' || role === 'manager';
  const isOwner = role === 'owner';
  // Contractors can edit workforce, activities, deliveries, but only if not locked
  const canEditBasic = !isLocked && !isOwner;
  // Only inspector/manager can edit issues, instructions, lock report
  const canEditAdvanced = !isLocked && isInspectorOrManager;

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const savedId = await saveLog({
        logId: log?._id,
        projectId,
        date: selectedDate,
        ...form,
        images: form.images.map(img => ({ storageId: img.storageId as Id<'_storage'>, url: img.url })),
      });
      if (savedId) {
        setSelectedLogId(savedId);
      }
      setFeedback({ title: "נשמר בהצלחה", message: "הדוח היומי נשמר כטיוטה.", type: 'success' });
    } catch (err: any) {
      setFeedback({ title: "שגיאה בשמירה", message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const processImageFiles = async (files: File[]) => {
    if (!projectId || files.length === 0) return;

    const currentCount = form.images.length;
    const availableSlots = 4 - currentCount;

    if (availableSlots <= 0) {
      setFeedback({ title: "הגבלת תמונות", message: "ניתן להעלות עד 4 תמונות ליומן.", type: "error" });
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      setFeedback({ title: "הגבלת תמונות", message: `נבחרו יותר תמונות ממה שאפשר. רק ${availableSlots} תמונות יועלו.`, type: "info" });
    }

    setUploadingImage(true);
    setUploadingImagesCount(filesToUpload.length);
    try {
      const newImages: { storageId: string, url: string }[] = [];
      for (const file of filesToUpload) {
        const uploaded = await uploadProjectFile({
          projectId,
          file,
          usage: 'daily_log',
        });
        newImages.push({ storageId: uploaded.storageId, url: URL.createObjectURL(file) });
      }
      const newImagesList = [...form.images, ...newImages];
      
      setForm(prev => ({
        ...prev,
        images: newImagesList
      }));

      // Auto-save draft to prevent data loss if mobile browser reloads on next camera open
      const savedId = await saveLog({
        logId: log?._id,
        projectId,
        date: selectedDate,
        ...form,
        images: newImagesList.map(img => ({ storageId: img.storageId as Id<'_storage'>, url: img.url })),
      });
      
      if (savedId && savedId !== log?._id) {
        setSelectedLogId(savedId);
      }
    } catch (err: any) {
      setFeedback({ title: "שגיאה", message: "שגיאה בהעלאת התמונות. חלק מהתמונות אולי לא עלו.", type: "error" });
    } finally {
      setUploadingImage(false);
      setUploadingImagesCount(0);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processImageFiles(files);
    }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploadingImage) return;
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      await processImageFiles(files);
    }
  };

  const handleLock = async () => {
    if (!log?._id) return;
    setSaving(true);
    try {
      await lockLog({ logId: log._id });
      setFeedback({ title: "הדוח ננעל 🔒", message: "הדוח היומי ננעל ולא ניתן לשינוי. הוא עכשיו מסמך חתום ומאושר.", type: 'success' });
    } catch (err: any) {
      setFeedback({ title: "שגיאה בנעילה", message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteLog = async () => {
    if (!log?._id) return;

    setConfirmDelete(false);
    setSaving(true);
    try {
      await deleteLog({ logId: log._id });
      setFeedback({ title: "נמחק בהצלחה", message: "יומן העבודה נמחק.", type: 'success' });
      setSelectedLogId(null);
    } catch (err: any) {
      setFeedback({ title: "שגיאה במחיקה", message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = async (targetLogs: any[]) => {
    if (!isProOrPremium) {
      setFeedback({ title: "תכונת Pro", message: "יצוא ל-PDF זמין במסלול Pro ומעלה.", type: "info" });
      return;
    }
    if (exporting || !targetLogs || targetLogs.length === 0) return;
    setExporting(true);

    // Sort logs by creation time so "Log 1" is always the oldest one, matching the UI tabs
    const sortedLogs = [...targetLogs].sort((a, b) => a._creationTime - b._creationTime);

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

      const formattedDate = new Date(sortedLogs[0].date).toLocaleDateString('he-IL');

      let html = `
        <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="margin: 0; font-size: 28px; color: #111;">יומן עבודה יומי</h1>
            <p style="margin: 4px 0 0 0; color: #555; font-size: 14px;">תאריך: ${formattedDate} | סך הכל יומנים: ${sortedLogs.length}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div dir="ltr" style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Build<span style="color: #FF9500;">Sync</span></div>
            <img src="/logo.png" style="height: 48px; width: auto; object-fit: contain;" />
          </div>
        </div>
      `;

      sortedLogs.forEach((targetLog, index) => {
        const logIsLocked = targetLog.status === 'locked';

        if (index > 0) {
          html += `<div style="page-break-before: always; margin-top: 40px;"></div>`;
        }

        if (sortedLogs.length > 1) {
          html += `<h2 style="font-size: 22px; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 8px;">יומן עבודה מס' ${index + 1} ${logIsLocked ? '(נעול)' : ''}</h2>`;
        }

        html += `<div style="margin-bottom: 20px; font-size: 14px;">
          <strong>תנאי שטח:</strong> מזג אוויר: ${targetLog.weather || '-'} | טמפרטורה: ${targetLog.temperature || '-'}
        </div>`;

        if (targetLog.workforce?.length > 0) {
          html += `<h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px;">כוח אדם נוכח באתר</h2>
          <ul style="font-size: 14px; line-height: 1.6;">`;
          for (const w of targetLog.workforce) {
            html += `<li><strong>${w.contractorName || 'כללי'}:</strong> ${w.workersCount} פועלים ${w.notes ? `(${w.notes})` : ''}</li>`;
          }
          html += `</ul>`;
        }

        if (targetLog.activities?.length > 0) {
          html += `<h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">עבודות שבוצעו</h2>
          <ul style="font-size: 14px; line-height: 1.6;">`;
          for (const act of targetLog.activities) {
            const statusText = act.status === 'completed' ? 'הושלם' : act.status === 'delayed' ? 'באיחור' : 'בביצוע';
            html += `<li>${act.description} <strong style="color: #555;">[${statusText}]</strong></li>`;
          }
          html += `</ul>`;
        }

        if (targetLog.issues?.length > 0) {
          html += `<h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px; color: #D32F2F;">חריגות ועיכובים</h2>
          <ul style="font-size: 14px; line-height: 1.6;">`;
          for (const iss of targetLog.issues) {
            html += `<li>${iss.description} ${iss.financialImpact ? '<strong style="color: #D32F2F;">(השפעה כספית)</strong>' : ''}</li>`;
          }
          html += `</ul>`;
        }

        if (targetLog.images?.length > 0) {
          html += `<h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px;">תמונות מהשטח</h2>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">`;
          for (const img of targetLog.images) {
            if (img.url) {
              html += `<img src="${img.url}" style="width: 200px; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc;" />`;
            }
          }
          html += `</div>`;
        }

        if (logIsLocked) {
          html += `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #ccc; text-align: left; font-size: 12px; color: #666;">
              מסמך זה ננעל ואושר במערכת BuildSync. הדוח נחתם ואינו ניתן לעריכה.
            </div>
          `;
        }
      });

      container.innerHTML = html;

      const opt = {
        margin: 10,
        filename: `daily-logs-${sortedLogs[0].date}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(container).save();
    } catch (error) {
      console.error("PDF Export failed:", error);
      setFeedback({ title: "שגיאה", message: "שגיאה בהפקת הדוח. נסה שנית.", type: "error" });
    } finally {
      setExporting(false);
    }
  };

  const renderSectionHeader = (title: string, icon: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: "12px 16px", background: "var(--bg)", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "var(--text1)" }}>
      <Icon n={icon} s={16} c="var(--accent)" />
      {title}
    </div>
  );

  return (
    <ScreenBoundary loading={Boolean(roleLoading || (isProOrPremium && projectId && logsForDate === undefined && activeTab === 'log'))} error={null} onRetry={() => window.location.reload()}>
      <PremiumLock isLocked={!isProOrPremium} title="יומן עבודה יומי" description="יומן עבודה מאפשר מעקב מדויק אחרי העבודה בשטח, כולל מזג אוויר ונוכחות פועלים. שדרג ל-Pro כדי לקבל גישה.">
        <div className="page-content" style={{ paddingBottom: 100, maxWidth: 900, margin: "0 auto" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px 0" }}>יומן עבודה יומי</h1>
              <p style={{ margin: 0, color: "var(--text2)", fontSize: 14 }}>תיעוד, מעקב וניהול שוטף של הפעילות באתר</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: 'flex', background: 'var(--surface)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
                <button
                  onClick={() => setActiveTab('log')}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: activeTab === 'log' ? 'var(--accent)' : 'transparent', color: activeTab === 'log' ? '#fff' : 'var(--text2)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: 13 }}
                >
                  יומן יומי
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: activeTab === 'history' ? 'var(--accent)' : 'transparent', color: activeTab === 'history' ? '#fff' : 'var(--text2)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: 13 }}
                >
                  היסטוריית יומנים
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'log' ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Header Row for Log */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>בחר תאריך:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => {
                      setSelectedDate(e.target.value);
                      setSelectedLogId(null);
                    }}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", fontSize: 14, fontWeight: 600, color: "var(--text1)", outline: "none" }}
                  />
                  {isLocked && <div style={{ background: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><Icon n="lock" s={14} /> דוח נעול</div>}
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {isLocked && (
                    <Btn
                      variant="outline"
                      onClick={() => exportPDF(logsForDate || [])}
                      disabled={exporting || !logsForDate || logsForDate.length === 0}
                    >
                      <Icon n="download" s={16} /> {exporting ? 'מפיק PDF...' : 'הפק PDF'}
                    </Btn>
                  )}

                  {/* Primary action first → appears rightmost in RTL */}
                  {canEditBasic && <Btn variant="primary" onClick={handleSave} disabled={saving}>
                    <Icon n="save" s={16} /> {saving ? "שומר..." : "שמור טיוטה"}
                  </Btn>}

                  {/* Lock — secondary important action */}
                  {canEditAdvanced && log && !isLocked && <Btn onClick={handleLock} disabled={saving} style={{ background: "#FF3B30", color: "#fff" }}>
                    <Icon n="lock" s={16} /> נעל דוח יום
                  </Btn>}

                  {/* Delete — danger, leftmost in RTL */}
                  {log && !isLocked && (canEditAdvanced || canEditBasic) && (
                    <Btn
                      variant="outline"
                      onClick={() => setConfirmDelete(true)}
                      disabled={saving}
                      style={{ color: "#FF3B30", borderColor: "#FF3B30", background: "transparent" }}
                    >
                      <Icon n="trash" s={16} /> מחק
                    </Btn>
                  )}
                </div>
              </div>

              {/* Multiple Logs Tabs */}
              {logsForDate && logsForDate.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {logsForDate.map((l, idx) => {
                    const isActive = log?._id === l._id;
                    return (
                      <button
                        key={l._id}
                        onClick={() => setSelectedLogId(l._id)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: isActive ? 'rgba(255, 149, 0, 0.1)' : 'var(--surface)',
                          color: isActive ? 'var(--accent)' : 'var(--text2)',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 13
                        }}
                      >
                        יומן מס׳ {idx + 1} {l.status === 'locked' && <Icon n="lock" s={12} />}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setSelectedLogId('new')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: selectedLogId === 'new' ? '1px solid var(--accent)' : '1px dashed var(--border)',
                      background: selectedLogId === 'new' ? 'rgba(255, 149, 0, 0.1)' : 'transparent',
                      color: selectedLogId === 'new' ? 'var(--accent)' : 'var(--text2)',
                      fontWeight: selectedLogId === 'new' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13
                    }}
                  >
                    <Icon n="plus" s={12} /> הוסף יומן עבודה
                  </button>
                </div>
              )}

              {/* General */}
              <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                {renderSectionHeader("תנאי שטח", "sun")}
                <style>{`.weather-grid { display: flex; flex-direction: column; gap: 12px; } @media (min-width: 600px) { .weather-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; } }`}</style>
                <div className="weather-grid" style={{ padding: 16 }}>
                  <div>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 4 }}>מזג אוויר</span>
                    {canEditBasic
                      ? <input value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })} placeholder="לדוגמה: שרב / גשום / רגיל" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, background: "var(--bg)", color: "var(--text1)", boxSizing: 'border-box' }} />
                      : <span style={{ display: "block", fontSize: 14, color: "var(--text1)", padding: "4px 0", lineHeight: 1.5 }}>{form.weather || '—'}</span>
                    }
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 4 }}>טמפרטורה</span>
                    {canEditBasic
                      ? <input value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} placeholder="לדוגמה: 28°C" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, background: "var(--bg)", color: "var(--text1)", boxSizing: 'border-box' }} />
                      : <span style={{ display: "block", fontSize: 14, color: "var(--text1)", padding: "4px 0", lineHeight: 1.5 }}>{form.temperature || '—'}</span>
                    }
                  </div>
                </div>
              </div>

              {/* Workforce */}
              <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                {renderSectionHeader("כוח אדם וקבלנים", "users")}
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  {form.workforce.map((w, i) => (
                    canEditBasic ? (
                      <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                        <select value={w.contractorId || ''} onChange={e => {
                          const newArr = [...form.workforce];
                          const selectedC = contractors.find(c => c._id === e.target.value);
                          newArr[i].contractorId = e.target.value || undefined;
                          newArr[i].contractorName = selectedC ? selectedC.name : (e.target.value ? '' : 'כללי');
                          setForm({ ...form, workforce: newArr });
                        }} style={{ width: 140, padding: "8px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, background: "var(--bg)", color: "var(--text1)" }}>
                          <option value="">כללי (לא משויך)</option>
                          {contractors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>פועלים:</span>
                          <select value={w.workersCount} onChange={e => {
                            const newArr = [...form.workforce]; newArr[i].workersCount = parseInt(e.target.value) || 1; setForm({ ...form, workforce: newArr });
                          }} style={{ width: 70, padding: "8px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, background: "var(--bg)", color: "var(--text1)" }}>
                            {Array.from({ length: 20 }, (_, k) => k + 1).map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>

                        <textarea value={w.notes || ''} onChange={e => {
                          const newArr = [...form.workforce]; newArr[i].notes = e.target.value; setForm({ ...form, workforce: newArr });
                        }} placeholder="הערות (אופציונלי)" style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, minWidth: 150, minHeight: 60, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', background: "var(--bg)", color: "var(--text1)" }} />

                        <button onClick={() => {
                          const newArr = [...form.workforce]; newArr.splice(i, 1); setForm({ ...form, workforce: newArr });
                        }} style={{ background: "rgba(255,59,48,0.1)", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#FF3B30", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", marginTop: 2 }} onMouseOver={e => e.currentTarget.style.background = "rgba(255,59,48,0.2)"} onMouseOut={e => e.currentTarget.style.background = "rgba(255,59,48,0.1)"}>
                          <Icon n="trash" s={14} />
                        </button>
                      </div>
                    ) : (
                      <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: w.notes ? 6 : 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>{w.contractorName || 'כללי'}</span>
                          <span style={{ fontSize: 12, color: "var(--text2)" }}>
                            <span style={{ fontWeight: 700 }}>פועלים: </span>{w.workersCount}
                          </span>
                        </div>
                        {w.notes && (
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>הערות: </span>
                            <span style={{ fontSize: 13, color: "var(--text1)", lineHeight: 1.5 }}>{w.notes}</span>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                  {canEditBasic && <Btn size="sm" variant="outline" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={() => setForm({ ...form, workforce: [...form.workforce, { contractorId: undefined, contractorName: 'כללי', workersCount: 1, notes: '' }] })}><Icon n="plus" s={14} /> הוסף רישום פועלים</Btn>}
                  {form.workforce.length === 0 && !canEditBasic && <div style={{ fontSize: 13, color: "var(--text3)" }}>אין רישום כוח אדם ליום זה.</div>}
                </div>
              </div>

              {/* Activities */}
              <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                {renderSectionHeader("מה בוצע היום?", "check-square")}
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  {form.activities.map((act, i) => {
                    const statusLabel = act.status === 'completed' ? 'הושלם' : act.status === 'delayed' ? 'באיחור' : 'בביצוע';
                    const statusColor = act.status === 'completed' ? '#34C759' : act.status === 'delayed' ? '#FF3B30' : 'var(--accent)';
                    return canEditBasic ? (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <textarea value={act.description} onChange={e => {
                          const newArr = [...form.activities]; newArr[i].description = e.target.value; setForm({ ...form, activities: newArr });
                        }} placeholder="תיאור העבודה (למשל יציקת קירות ממ״ד)" style={{ width: '100%', padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, minHeight: 64, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', background: "var(--surface)", color: "var(--text1)", boxSizing: 'border-box' }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                          <select value={act.status} onChange={e => {
                            const newArr = [...form.activities]; newArr[i].status = e.target.value as any; setForm({ ...form, activities: newArr });
                          }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, background: "var(--bg)", color: "var(--text1)" }}>
                            <option value="in_progress">בביצוע</option>
                            <option value="completed">הושלם</option>
                            <option value="delayed">באיחור</option>
                          </select>
                          <button onClick={() => {
                            const newArr = [...form.activities]; newArr.splice(i, 1); setForm({ ...form, activities: newArr });
                          }} style={{ background: "rgba(255,59,48,0.1)", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#FF3B30", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }} onMouseOver={e => e.currentTarget.style.background = "rgba(255,59,48,0.2)"} onMouseOut={e => e.currentTarget.style.background = "rgba(255,59,48,0.1)"}>
                            <Icon n="trash" s={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <span style={{ fontSize: 13, color: "var(--text1)", lineHeight: 1.5, flex: 1 }}>{act.description || '—'}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: 20, background: `${statusColor}18`, border: `1px solid ${statusColor}40` }}>{statusLabel}</span>
                      </div>
                    );
                  })}
                  {canEditBasic && <Btn size="sm" variant="outline" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={() => setForm({ ...form, activities: [...form.activities, { description: '', status: 'in_progress' }] })}><Icon n="plus" s={14} /> הוסף עבודה</Btn>}
                  {form.activities.length === 0 && !canEditBasic && <div style={{ fontSize: 13, color: "var(--text3)" }}>אין רישום עבודות להיום.</div>}
                </div>
              </div>

              {/* Issues - Advanced Only */}
              <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                {renderSectionHeader("עיכובים ובעיות ⚠️", "alert-triangle")}
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  {!isInspectorOrManager && !isOwner && <div style={{ fontSize: 13, color: "var(--text3)" }}>רק מפקח מורשה להזין ולנהל עיכובים וחריגות כספיות.</div>}
                  {form.issues.map((iss, i) => {
                    const issTypeLabel = iss.type === 'delay' ? 'עיכוב' : iss.type === 'quality' ? 'ליקוי איכות' : iss.type === 'safety' ? 'בטיחות' : 'אחר';
                    return canEditAdvanced ? (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "rgba(255,59,48,0.05)", borderRadius: 8, border: "1px solid rgba(255,59,48,0.2)" }}>
                        <textarea value={iss.description} onChange={e => {
                          const newArr = [...form.issues]; newArr[i].description = e.target.value; setForm({ ...form, issues: newArr });
                        }} placeholder="תיאור הבעיה (למשל: משאבת בטון לא הגיעה)" style={{ width: '100%', padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,59,48,0.3)", fontSize: 13, minHeight: 64, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', background: "var(--bg)", color: "var(--text1)", boxSizing: 'border-box' }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, flexWrap: "wrap" }}>
                            <select value={iss.type} onChange={e => {
                              const newArr = [...form.issues]; newArr[i].type = e.target.value as any; setForm({ ...form, issues: newArr });
                            }} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, background: "var(--bg)", color: "var(--text1)" }}>
                              <option value="delay">עיכוב</option>
                              <option value="quality">ליקוי איכות</option>
                              <option value="safety">בטיחות</option>
                              <option value="other">אחר</option>
                            </select>
                            <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "var(--text1)", cursor: "pointer" }}>
                              <input type="checkbox" checked={iss.financialImpact} onChange={e => {
                                const newArr = [...form.issues]; newArr[i].financialImpact = e.target.checked; setForm({ ...form, issues: newArr });
                              }} /> השפעה כספית / חריגה
                            </label>
                          </div>
                          <button onClick={() => {
                            const newArr = [...form.issues]; newArr.splice(i, 1); setForm({ ...form, issues: newArr });
                          }} style={{ background: "rgba(255,59,48,0.1)", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#FF3B30", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }} onMouseOver={e => e.currentTarget.style.background = "rgba(255,59,48,0.2)"} onMouseOut={e => e.currentTarget.style.background = "rgba(255,59,48,0.1)"}>
                            <Icon n="trash" s={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={i} style={{ padding: "10px 12px", background: "rgba(255,59,48,0.05)", borderRadius: 8, border: "1px solid rgba(255,59,48,0.2)", display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 13, color: "var(--text1)", lineHeight: 1.5 }}>{iss.description || '—'}</span>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>סוג: </span>
                          <span style={{ fontSize: 12, color: "#FF3B30", fontWeight: 600 }}>{issTypeLabel}</span>
                          {iss.financialImpact && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#FF3B30", display: "flex", alignItems: "center", gap: 4 }}>
                              <Icon n="alert-triangle" s={12} c="#FF3B30" /> השפעה כספית
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {canEditAdvanced && <Btn size="sm" variant="outline" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={() => setForm({ ...form, issues: [...form.issues, { type: 'delay', description: '', financialImpact: false }] })}><Icon n="plus" s={14} /> דווח חריגה</Btn>}
                </div>
              </div>

              {/* Images */}
              <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                {renderSectionHeader("תמונות מהשטח", "image")}
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {form.images.map((img, i) => {
                      const isDeleting = deletingImages.has(img.storageId);
                      return (
                        <div key={i} style={{ position: "relative", width: 100, height: 100, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                          <img src={img.url} onClick={() => setViewGallery({ images: form.images.filter(img => img.url).map(img => ({ url: img.url! })), initialIndex: i })} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isDeleting ? 0.5 : 1, transition: "opacity 0.2s", cursor: "pointer" }} />

                          {isDeleting && (
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
                              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                              <div style={{ animation: 'spin 1s linear infinite', color: "#fff" }}>
                                <Icon n="loader" s={24} />
                              </div>
                            </div>
                          )}

                          {canEditBasic && !isDeleting && (
                            <button onClick={async () => {
                              setDeletingImages(prev => new Set(prev).add(img.storageId));
                              try {
                                await deleteFile({ storageId: img.storageId as Id<'_storage'> });
                                const newArr = [...form.images]; newArr.splice(i, 1); setForm({ ...form, images: newArr });
                              } catch (e) {
                                console.error("Failed to delete file from storage", e);
                                setFeedback({ title: "שגיאה", message: "שגיאה במחיקת התמונה.", type: "error" });
                              } finally {
                                setDeletingImages(prev => {
                                  const next = new Set(prev);
                                  next.delete(img.storageId);
                                  return next;
                                });
                              }
                            }} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Icon n="x" s={14} />
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {/* Uploading Placeholders */}
                    {Array.from({ length: uploadingImagesCount }).map((_, i) => (
                      <div key={`uploading-${i}`} style={{ width: 100, height: 100, borderRadius: 8, border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--surface)", color: "var(--accent)" }}>
                        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                        <div style={{ animation: 'spin 1s linear infinite' }}>
                          <Icon n="loader" s={24} />
                        </div>
                        <span style={{ fontSize: 11, marginTop: 8, fontWeight: 600 }}>מעלה...</span>
                      </div>
                    ))}

                    {canEditBasic && (form.images.length + uploadingImagesCount) < 4 && (
                      <>
                        {/* Camera tile — only on touch devices; capture forces the camera in the PWA */}
                        <style>{`.dl-camera-tile{display:none} @media (pointer: coarse){.dl-camera-tile{display:flex}}`}</style>
                        <label
                          className="dl-camera-tile"
                          style={{
                            width: 100, height: 100, borderRadius: 8, border: "2px dashed var(--border)",
                            flexDirection: "column", alignItems: "center", justifyContent: "center",
                            cursor: uploadingImage ? "not-allowed" : "pointer", background: "var(--bg)",
                            color: "var(--text2)", transition: "all 0.2s"
                          }}
                        >
                          <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} disabled={uploadingImage} onChange={handleUploadImage} />
                          <Icon n="camera" s={20} />
                          <span style={{ fontSize: 11, marginTop: 4, textAlign: 'center' }}>צלם תמונה</span>
                        </label>
                        <label
                          style={{
                            width: 100, height: 100, borderRadius: 8, border: isDragging ? "2px dashed var(--accent)" : "2px dashed var(--border)",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            cursor: uploadingImage ? "not-allowed" : "pointer", background: isDragging ? "rgba(255, 149, 0, 0.1)" : "var(--bg)",
                            color: isDragging ? "var(--accent)" : "var(--text2)", transition: "all 0.2s"
                          }}
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                          onDrop={handleDrop}
                          onMouseOver={e => !isDragging && (e.currentTarget.style.borderColor = "var(--accent)")}
                          onMouseOut={e => !isDragging && (e.currentTarget.style.borderColor = "var(--border)")}
                        >
                          <input type="file" multiple accept="image/*" style={{ display: "none" }} disabled={uploadingImage} onChange={handleUploadImage} />
                          <Icon n="image" s={20} />
                          <span style={{ fontSize: 11, marginTop: 4, textAlign: 'center' }}>בחר מהגלריה</span>
                        </label>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{form.images.length} מתוך 4 תמונות הועלו. (עד 4 תמונות לדוח).</div>
                </div>
              </div>
            </div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Summary Bar ── */}
              {allLogs.length > 0 && (
                <>
                  <style>{`
                    .dl-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                    @media (min-width: 600px) { .dl-stats-grid { grid-template-columns: repeat(4, 1fr); } }
                    .dl-filter-bar { display: flex; flex-direction: column; gap: 10px; }
                    @media (min-width: 600px) { .dl-filter-bar { flex-direction: row; align-items: center; } }
                    .dl-filter-select { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text1); font-size: 13px; font-family: inherit; cursor: pointer; flex: 1; min-width: 0; }
                    .dl-log-row { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: flex-start; padding: 14px 20px; }
                    .dl-action-btn { min-height: 44px; min-width: 44px; }
                  `}</style>
                  <div className="dl-stats-grid">
                    {[
                      { label: 'סה״כ דוחות', value: stats.total, icon: 'file-text', color: 'var(--accent)' },
                      { label: 'דוחות נעולים', value: stats.locked, icon: 'lock', color: '#34C759' },
                      { label: 'עם חריגות', value: stats.withIssues, icon: 'alert-triangle', color: '#FF9500' },
                      { label: 'השפעה כספית', value: stats.withFinancial, icon: 'dollar-sign', color: '#FF3B30' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon n={s.icon} s={14} c={s.color} />
                          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</span>
                        </div>
                        <span style={{ fontSize: 24, fontWeight: 800, color: s.value > 0 ? s.color : 'var(--text3)' }}>{s.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* ── Filter Bar ── */}
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
                    <div className="dl-filter-bar">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <Icon n="filter" s={14} c="var(--text3)" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap' }}>סינון:</span>
                      </div>
                      <select
                        className="dl-filter-select"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as any)}
                        aria-label="סינון לפי סטטוס"
                      >
                        <option value="all">כל הסטטוסים</option>
                        <option value="locked">נעולים בלבד</option>
                        <option value="draft">טיוטות בלבד</option>
                      </select>
                      <select
                        className="dl-filter-select"
                        value={filterIssue}
                        onChange={e => setFilterIssue(e.target.value as any)}
                        aria-label="סינון לפי חריגות"
                      >
                        <option value="all">כל הדוחות</option>
                        <option value="any_issue">עם חריגות / בעיות</option>
                        <option value="financial">עם השפעה כספית</option>
                        <option value="delay">עם עיכובים</option>
                        <option value="quality">עם ליקויי איכות</option>
                        <option value="safety">עם אירועי בטיחות</option>
                      </select>
                      <select
                        className="dl-filter-select"
                        value={filterPeriod}
                        onChange={e => setFilterPeriod(e.target.value as any)}
                        aria-label="סינון לפי תקופה"
                      >
                        <option value="all">כל התקופות</option>
                        <option value="week">7 ימים אחרונים</option>
                        <option value="month">30 יום אחרונים</option>
                      </select>
                      {hasActiveFilter && (
                        <button
                          onClick={() => { setFilterStatus('all'); setFilterIssue('all'); setFilterPeriod('all'); }}
                          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                        >
                          נקה סינון
                        </button>
                      )}
                    </div>
                    {hasActiveFilter && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                        מציג {filteredLogs.length} מתוך {allLogs.length} דוחות
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Log List ── */}
              {allLogs.length === 0 ? (
                <EmptyState title="אין היסטוריית יומנים" description="עדיין לא נוצרו יומני עבודה בפרויקט זה." icon="file-text" />
              ) : filteredLogs.length === 0 ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '32px 20px', textAlign: 'center' }}>
                  <Icon n="search" s={28} c="var(--text3)" />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginTop: 12 }}>לא נמצאו דוחות</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>נסה לשנות את הסינון</div>
                  <button
                    onClick={() => { setFilterStatus('all'); setFilterIssue('all'); setFilterPeriod('all'); }}
                    style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    נקה סינון
                  </button>
                </div>
              ) : (() => {
                // Group filteredLogs by year-month
                const groups: Record<string, typeof filteredLogs> = {};
                for (const l of filteredLogs) {
                  const d = new Date(l.date);
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(l);
                }
                const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
                const currentMonthKey = new Date().toISOString().slice(0, 7);

                return sortedKeys.map(monthKey => {
                  const monthLogs = groups[monthKey];
                  const [year, month] = monthKey.split('-');
                  const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
                  const isCurrentMonth = monthKey === currentMonthKey;
                  const isOpen = openMonths.has(monthKey);
                  const lockedCount = monthLogs.filter(l => l.status === 'locked').length;

                  return (
                    <div key={monthKey} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      {/* Month Header */}
                      <button
                        onClick={() => setOpenMonths(prev => {
                          const next = new Set(prev);
                          if (next.has(monthKey)) next.delete(monthKey);
                          else next.add(monthKey);
                          return next;
                        })}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                          borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Icon n={isOpen ? 'chevron-down' : 'chevron-left'} s={18} c="var(--text3)" />
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{monthName}</span>
                          {isCurrentMonth && (
                            <span style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>עכשיו</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text2)' }}>
                          <span>{monthLogs.length} דוחות</span>
                          {lockedCount > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Icon n="lock" s={12} c="#FF3B30" /> {lockedCount} נעולים
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Month Logs */}
                      {isOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '65vh', overflowY: 'auto' }}>
                          {monthLogs.map((l, idx) => {
                            const hasFinancial = l.issues?.some((iss: any) => iss.financialImpact);
                            const hasDelay = l.issues?.some((iss: any) => iss.type === 'delay') || l.activities?.some((act: any) => act.status === 'delayed');
                            const hasQuality = l.issues?.some((iss: any) => iss.type === 'quality');
                            const hasSafety = l.issues?.some((iss: any) => iss.type === 'safety');
                            const totalWorkers = l.workforce?.reduce((sum: number, w: any) => sum + (w.workersCount || 0), 0) ?? 0;
                            return (
                              <div
                                key={l._id}
                                className="dl-log-row"
                                style={{ borderBottom: idx < monthLogs.length - 1 ? '1px solid var(--border)' : 'none' }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                                      {new Date(l.date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                                    </span>
                                    {l.status === 'locked' ? (
                                      <span className="badge" style={{ background: 'rgba(52,199,89,0.12)', color: '#34C759', display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <Icon n="lock" s={10} /> נעול
                                      </span>
                                    ) : (
                                      <span className="badge badge-draft">טיוטה</span>
                                    )}
                                  </div>
                                  {/* Stats row */}
                                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)', marginBottom: l.issues?.length > 0 ? 6 : 0 }}>
                                    {l.activities?.length > 0 && <span>✔ {l.activities.length} פעילויות</span>}
                                    {totalWorkers > 0 && <span>👷 {totalWorkers} פועלים</span>}
                                    {l.images && l.images.length > 0 && <span>📷 {l.images.length} תמונות</span>}
                                  </div>
                                  {/* Issue badges */}
                                  {l.issues?.length > 0 && (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                      {hasDelay && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,149,0,0.12)', color: '#FF9500', fontWeight: 600 }}>⏱ עיכוב</span>}
                                      {hasQuality && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,59,48,0.1)', color: '#FF3B30', fontWeight: 600 }}>⚠ ליקוי איכות</span>}
                                      {hasSafety && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,59,48,0.12)', color: '#FF3B30', fontWeight: 700 }}>🦺 בטיחות</span>}
                                      {hasFinancial && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,59,48,0.15)', color: '#FF3B30', fontWeight: 700, border: '1px solid rgba(255,59,48,0.3)' }}>💸 חריגה כספית</span>}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                  <Btn
                                    className="dl-action-btn"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedDate(l.date);
                                      setSelectedLogId(l._id);
                                      setActiveTab('log');
                                    }}
                                  >
                                    <Icon n="eye" s={14} /> צפה
                                  </Btn>
                                  {l.status === 'locked' && (
                                    <Btn
                                      className="dl-action-btn"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => exportPDF(allLogs.filter(x => x.date === l.date))}
                                      disabled={exporting}
                                    >
                                      <Icon n="download" s={14} /> PDF
                                    </Btn>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              {/* ── Infinite Scroll Trigger ── */}
              {allLogs.length > 0 && !hasActiveFilter && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  {pagedStatus === "CanLoadMore" || pagedStatus === "LoadingMore" ? (
                    <button
                      onClick={() => loadMore(15)}
                      disabled={pagedStatus === "LoadingMore"}
                      style={{ 
                        padding: '12px 24px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--surface)', color: 'var(--text1)', fontWeight: 600,
                        cursor: pagedStatus === "LoadingMore" ? 'wait' : 'pointer',
                        fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto'
                      }}
                      ref={node => {
                        // Very simple IntersectionObserver to auto-load more
                        if (!node) return;
                        const observer = new IntersectionObserver(entries => {
                          if (entries[0].isIntersecting && pagedStatus === "CanLoadMore") {
                            loadMore(15);
                          }
                        }, { threshold: 0.1 });
                        observer.observe(node);
                        return () => observer.disconnect();
                      }}
                    >
                      {pagedStatus === "LoadingMore" ? (
                        <>
                          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                          <div style={{ animation: 'spin 1s linear infinite' }}><Icon n="loader" s={16} /></div>
                          טוען עוד...
                        </>
                      ) : (
                        'טען עוד דוחות'
                      )}
                    </button>
                  ) : pagedStatus === "Exhausted" ? (
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>הגעת לסוף. כל הדוחות נטענו.</span>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {feedback && <FeedbackModal {...feedback} onClose={() => setFeedback(null)} />}
        {confirmDelete && (
          <ConfirmDialog
            title="מחיקת יומן עבודה"
            message="האם אתה בטוח שברצונך למחוק את יומן העבודה? כל הנתונים והתמונות יימחקו לצמיתות."
            confirmText="מחק יומן"
            cancelText="ביטול"
            onConfirm={executeDeleteLog}
            onClose={() => setConfirmDelete(false)}
          />
        )}
        {viewGallery && (
          <ImageGalleryViewer
            images={viewGallery.images}
            initialIndex={viewGallery.initialIndex}
            onClose={() => setViewGallery(null)}
          />
        )}
      </PremiumLock>
    </ScreenBoundary>
  );
};
