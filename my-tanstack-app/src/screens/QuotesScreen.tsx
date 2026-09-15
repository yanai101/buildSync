import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, Btn, Select, Input, NumberInput, Badge, Modal, FeedbackModal, ConfirmDialog } from '../components/Shared';
import { QUOTES_DATA, QUOTE_TOPICS, fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';
import { useRequireRole } from '../hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';
import type { Id } from '../../convex/_generated/dataModel';
import { useSubscription } from '../hooks/useSubscription';
import { useAuthToken } from '@convex-dev/auth/react';
import { openUpgradeModal } from '../components/UpgradeModalHost';

export interface Quote {
  id: any;
  topicKey: string;
  supplier: string;
  contact?: string;
  phone?: string;
  email?: string;
  total: number;
  validity?: string;
  notes?: string;
  fileName?: string;
  fileUrl?: string | null;
  projectFileId?: string;
  status: string;
  createdAt: string;
}

export interface QuoteTopic {
  key: string;
  name: string;
  icon: string;
  isBuiltin: boolean;
}

export const QuotesScreen = () => {
  const { isProOrPremium } = useSubscription();
  const { allowed, loading: roleLoading } = useRequireRole(['owner']);
  const { projectId } = useCurrentProject();
  const convexToken = useAuthToken();

  // DB Queries
  const aiQuota = useQuery(api.aiQuotes.myAiQuota, isProOrPremium ? {} : "skip");
  const dbQuotes = useQuery(api.quotes.listQuotes, projectId && allowed ? { projectId } : "skip");
  const dbTopics = useQuery(api.quotes.listTopics, projectId && allowed ? { projectId } : "skip");

  // Data Sources
  const { data: initialQuotes, loading: quotesLoading, error: quotesError, refetch: quotesRefetch } = useDataSource<any[]>('quotes', { db: dbQuotes as any });
  const { data: initialTopics, loading: topicsLoading, refetch: topicsRefetch } = useDataSource<any[]>('quote_topics', { db: dbTopics as any });

  const { mutate } = useDataMutation('quotes');
  const uploadProjectFile = useProjectFileUploader();

  // Convex AI mutations
  const saveExtractionMutation = useMutation(api.aiQuotes.saveQuoteExtraction);
  const saveCacheMutation = useMutation(api.aiQuotes.saveComparisonCache);
  const logUsageMutation = useMutation(api.aiQuotes.logAiUsage);

  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [filter, setFilter] = React.useState("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Quote | null>(null);
  const [compareTopicId, setCompareTopicId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<any>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [removeFile, setRemoveFile] = React.useState(false);
  const [previewQuote, setPreviewQuote] = React.useState<Quote | null>(null);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // AI comparison state
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiStep, setAiStep] = React.useState<string>('');
  const [aiResult, setAiResult] = React.useState<any>(null);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiFromCache, setAiFromCache] = React.useState(false);
  const [aiRemaining, setAiRemaining] = React.useState<number | null>(null);
  const [aiLimitPerMonth, setAiLimitPerMonth] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (initialQuotes) {
      setQuotes(initialQuotes.map(q => ({
        ...q,
        id: q._id || q.id,
        topicKey: q.topicKey || q.topicId
      })));
    }
  }, [initialQuotes]);

  const loading = quotesLoading || topicsLoading || !projectId;
  const error = quotesError;
  const refetch = () => { quotesRefetch(); };

  if (roleLoading) return <AccessLoading />;
  if (!allowed) return <AccessDenied message="הצעות מחיר זמינות ליזם הפרויקט בלבד." />;

  const topics = React.useMemo(() => {
    const dbTopics = initialTopics || [];
    const all = [...QUOTE_TOPICS, ...dbTopics];
    const unique = Array.from(new Map(all.map((t: any) => [t.key || t.id, t])).values());

    return unique.map((t: any) => ({
      key: t.key || t.id,
      name: t.name,
      icon: t.icon,
      isBuiltin: t.isBuiltin ?? true
    }));
  }, [initialTopics]);

  const topicById = (key: string) => topics.find(t => t.key === key) || { key, name: key, icon: "clipboard" };

  const topicsWithQuotes = topics.filter(t => quotes.some(q => q.topicKey === t.key));
  const visibleTopics = filter === "all" ? topicsWithQuotes : topicsWithQuotes.filter(t => t.key === filter);

  const totalQuotes = quotes.length;
  const activeTopicsCount = topicsWithQuotes.length;
  const biggestDiff = topicsWithQuotes.reduce((max, t) => {
    const arr = quotes.filter(q => q.topicKey === t.key);
    if (arr.length < 2) return max;
    const vals = arr.map(q => q.total);
    return Math.max(max, Math.max(...vals) - Math.min(...vals));
  }, 0);

  const emptyForm = { topicName: "", supplier: "", contact: "", phone: "", email: "", total: "", validity: "", notes: "", fileName: "", projectFileId: "" };
  const [form, setForm] = React.useState<Record<string, string>>(emptyForm);

  const openAdd = () => {
    setEditing(null);
    setSelectedFile(null);
    setRemoveFile(false);
    const initialTopic = filter !== "all" ? topicById(filter).name : (topics[0]?.name || "מטבח");
    setForm({ ...emptyForm, topicName: initialTopic });
    setAddOpen(true);
  };

  const openEdit = (q: Quote) => {
    setEditing(q);
    setForm({
      topicName: topicById(q.topicKey).name,
      supplier: q.supplier,
      contact: q.contact || "",
      phone: q.phone || "",
      email: q.email || "",
      total: String(q.total),
      validity: q.validity || "",
      notes: q.notes || "",
      fileName: q.fileName || "",
      projectFileId: q.projectFileId || "",
    });
    setSelectedFile(null);
    setRemoveFile(false);
    setAddOpen(true);
  };

  const closeModal = () => { setAddOpen(false); setEditing(null); setSelectedFile(null); setRemoveFile(false); };

  const quoteFileKind = (file: File): 'image' | 'pdf' | 'document' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    if (
      file.type.includes('word') ||
      file.type.includes('officedocument') ||
      /\.(doc|docx|xls|xlsx)$/i.test(file.name)
    ) return 'document';
    return 'other';
  };

  const canPreviewInline = (quote: Quote | null) => {
    const name = quote?.fileName || "";
    const url = quote?.fileUrl || "";
    return /\.(pdf|png|jpe?g|webp|gif|avif)$/i.test(name) || url.includes('image/') || url.includes('pdf');
  };

  const saveQuote = async () => {
    const tName = form.topicName.trim();
    if (!tName || !form.supplier.trim() || !form.total || !projectId) return;
    const total = Number(form.total);
    if (Number.isNaN(total) || total <= 0) return;

    setSaving(true);
    try {
      let projectFileId = form.projectFileId || undefined;
      let fileName = form.fileName || undefined;
      if (selectedFile) {
        const uploaded = await uploadProjectFile({
          projectId: projectId as Id<'projects'>,
          file: selectedFile,
          usage: 'quote',
          kind: quoteFileKind(selectedFile),
        });
        projectFileId = uploaded.fileId;
        fileName = selectedFile.name;
        setRemoveFile(false);
      }

      let topicKey = topics.find(t => t.name === tName)?.key;
      if (!topicKey) {
        topicKey = await mutate('addQuoteTopic', {
          projectId,
          name: tName,
          icon: "clipboard"
        });
        topicsRefetch();
      }

      const payload = {
        projectId,
        id: editing?.id,
        topicKey,
        supplier: form.supplier,
        contact: form.contact,
        phone: form.phone,
        email: form.email,
        total,
        validity: form.validity,
        notes: form.notes,
        status: editing ? editing.status : "pending",
        fileName,
        projectFileId,
        removeFile,
      };
      await mutate('saveQuote', payload);
      quotesRefetch();
      closeModal();
      setFeedback({ title: "נשמר בהצלחה", message: "הצעת המחיר נשמרה במערכת.", type: "success" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו לשמור את הצעת המחיר. אנא נסו שוב.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const deleteQuote = async (id: any) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteQuote = async () => {
    if (!deleteTargetId) return;
    try {
      await mutate('deleteQuote', { id: deleteTargetId });
      quotesRefetch();
      setDeleteTargetId(null);
      setFeedback({ title: "נמחק", message: "הצעת המחיר הוסרה בהצלחה.", type: "info" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו למחוק את הצעת המחיר.", type: "error" });
    }
  };

  const approveQuote = async (id: any) => {
    const target = quotes.find(q => q.id === id);
    if (!target) return;

    const newStatus = target.status === "approved" ? "pending" : "approved";

    try {
      await mutate('saveQuote', {
        id,
        projectId,
        topicKey: target.topicKey,
        supplier: target.supplier,
        contact: target.contact,
        phone: target.phone,
        email: target.email,
        total: target.total,
        validity: target.validity,
        notes: target.notes,
        fileName: target.fileName,
        projectFileId: target.projectFileId,
        status: newStatus
      });
      quotesRefetch();
      if (newStatus === "approved") {
        setFeedback({ title: "בחירה בוצעה", message: "הספק נבחר בהצלחה לפרויקט.", type: "success" });
      }
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו לעדכן את סטטוס ההצעה.", type: "error" });
    }
  };

  const rejectQuote = async (id: any) => {
    const target = quotes.find(q => q.id === id);
    if (!target) return;

    const newStatus = target.status === "rejected" ? "pending" : "rejected";

    try {
      await mutate('saveQuote', {
        id,
        projectId,
        topicKey: target.topicKey,
        supplier: target.supplier,
        contact: target.contact,
        phone: target.phone,
        email: target.email,
        total: target.total,
        validity: target.validity,
        notes: target.notes,
        fileName: target.fileName,
        projectFileId: target.projectFileId,
        status: newStatus
      });
      quotesRefetch();
      if (newStatus === "rejected") {
        setFeedback({ title: "הצעה נדחתה", message: "ההצעה סומנה כנדחית.", type: "info" });
      }
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו לעדכן את סטטוס ההצעה.", type: "error" });
    }
  };



  const onFilePick = (file: File | null) => {
    setSelectedFile(file);
    if (!file) {
      setRemoveFile(Boolean(editing?.projectFileId || editing?.fileName));
      setForm((f) => ({ ...f, fileName: "", projectFileId: "" }));
      return;
    }
    setRemoveFile(false);
    setForm((f) => ({ ...f, fileName: file.name }));
  };

  const statusBadgeType = (s: string) => s === "approved" ? "done" : s === "rejected" ? "problem" : "pending";

  const compareTopic = compareTopicId ? topicById(compareTopicId) : null;
  const compareRows = compareTopic ? [...quotes.filter(q => q.topicKey === compareTopic.key)].sort((a, b) => a.total - b.total) : [];
  const cmpMin = compareRows.length ? Math.min(...compareRows.map(q => q.total)) : 0;
  const cmpMax = compareRows.length ? Math.max(...compareRows.map(q => q.total)) : 0;
  const cmpAvg = compareRows.length ? compareRows.reduce((a, q) => a + q.total, 0) / compareRows.length : 0;

  // Build a stable cache key from the sorted quote IDs.
  // The version prefix invalidates cached results when the analysis format changes.
  const buildCacheKey = (rows: Quote[]) =>
    'v2:' + rows.map(q => q.id).sort().join(',');

  // Reset AI state when the comparison topic changes
  React.useEffect(() => {
    setAiResult(null);
    setAiError(null);
    setAiFromCache(false);
    setAiStep('');
  }, [compareTopicId]);

  const runAiComparison = async () => {
    if (!projectId || !compareTopic || compareRows.length < 2) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    let compareTimeoutId: any;

    try {
      // --- Step 1: Extract files for quotes that have PDFs/Word docs ---
      const quotesWithFiles = compareRows.filter(
        q => q.fileUrl && q.fileName && !/\.(jpe?g|png|webp|gif|avif)$/i.test(q.fileName)
      );

      const extractions: Record<string, any> = {};

      for (let i = 0; i < quotesWithFiles.length; i++) {
        const q = quotesWithFiles[i];
        setAiStep(`מחלץ נתונים מ-${q.fileName}... (${i + 1}/${quotesWithFiles.length})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        try {
          const res = await fetch('/api/ai-extract', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quoteId: q.id,
              fileUrl: q.fileUrl,
              fileName: q.fileName,
              projectId,
              convexToken,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            extractions[q.id] = data.extraction;
          }
        } catch {
          // Non-fatal — compare without this file
        } finally {
          clearTimeout(timeoutId);
        }
      }

      // --- Step 2: Compare ---
      setAiStep('מנתח ומשווה הצעות...');

      const cacheKey = buildCacheKey(compareRows);
      const quotesPayload = compareRows.map(q => ({
        id: q.id,
        supplier: q.supplier,
        total: q.total,
        validity: q.validity,
        notes: q.notes,
        status: q.status,
        hasFile: !!(q.fileUrl && q.fileName),
        fileName: q.fileName,
        extraction: extractions[q.id] ?? null,
      }));

      const controller = new AbortController();
      compareTimeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for OpenAI

      const res = await fetch('/api/ai-compare', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotes: quotesPayload,
          topicName: compareTopic.name,
          projectId,
          topicKey: compareTopic.key,
          cacheKey,
          convexToken,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setAiError(
          data.tier === 'free'
            ? 'FREE_PLAN'
            : `הגעת למגבלת ${data.limitPerMonth} קריאות AI החודש. המגבלה תתאפס בתחילת החודש הבא.`
        );
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? 'שגיאה לא ידועה');
      }

      setAiResult(data);
      setAiFromCache(data.fromCache ?? false);
      if (data.remaining !== undefined) setAiRemaining(data.remaining);
      if (data.limitPerMonth !== undefined) setAiLimitPerMonth(data.limitPerMonth);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAiError('הבקשה ארכה זמן רב מדי ובוטלה (Timeout)');
      } else {
        setAiError(err?.message ?? 'שגיאה בניתוח AI');
      }
    } finally {
      if (compareTimeoutId) clearTimeout(compareTimeoutId);
      setAiLoading(false);
      setAiStep('');
    }
  };

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content">
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <Select value={filter} onChange={setFilter} style={{ width: "auto", minWidth: 180 }}>
            <option value="all">כל הנושאים</option>
            {topics.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
          </Select>

          <div style={{ display: "flex", gap: 14, fontSize: 13, color: "var(--text2)", alignItems: "center", flexWrap: "wrap" }}>
            <span>נושאים פעילים: <strong style={{ color: "var(--text1)" }}>{activeTopicsCount}</strong></span>
            <span style={{ color: "var(--text3)" }}>·</span>
            <span>סה"כ הצעות: <strong style={{ color: "var(--text1)" }}>{totalQuotes}</strong></span>
            {biggestDiff > 0 && <>
              <span style={{ color: "var(--text3)" }}>·</span>
              <span>הפרש מקסימלי: <strong style={{ color: "var(--accent)" }}>{fmtMoney(biggestDiff)}</strong></span>
            </>}
            {aiQuota && aiQuota.tier !== 'superAdmin' && aiQuota.limitPerMonth > 0 && <>
              <span style={{ color: "var(--text3)" }}>·</span>
              <span title="מתאפס בתחילת כל חודש">
                🤖 השוואות AI: <strong style={{ color: aiQuota.remaining > 0 ? "var(--success)" : "var(--danger)" }}>{aiQuota.remaining}/{aiQuota.limitPerMonth}</strong> נותרו
              </span>
            </>}
          </div>

          <div style={{ marginRight: "auto", display: "flex", gap: 8 }}>
            <Btn size="sm" onClick={openAdd}>
              <Icon n="plus" s={13} /> הצעה חדשה
            </Btn>
          </div>
        </div>



        {visibleTopics.length === 0 ? (
          <div className="card card-body" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ width: 56, height: 56, margin: "0 auto 14px", background: "var(--accent-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
              <Icon n="clipboard" s={28} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>אין עדיין הצעות מחיר</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>הוסיפו הצעות לפי נושא (מטבח, ריצוף, טיח וכו׳) כדי להתחיל להשוות בין ספקים.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Btn onClick={openAdd}><Icon n="plus" s={13} /> הוסף הצעה ראשונה</Btn>
            </div>
          </div>
        ) : visibleTopics.map(topic => {
          const tQuotes = quotes.filter(q => q.topicKey === topic.key);
          const minTotal = Math.min(...tQuotes.map(q => q.total));
          const maxTotal = Math.max(...tQuotes.map(q => q.total));
          const diff = maxTotal - minTotal;
          const approved = tQuotes.find(q => q.status === "approved");
          return (
            <motion.div key={topic.key} className="card" style={{ marginBottom: 18 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <div className="card-header" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon n={topic.icon} s={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{topic.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                      {tQuotes.length} {tQuotes.length === 1 ? "הצעה" : "הצעות"}
                      {tQuotes.length >= 2 && <> · הפרש <strong style={{ color: diff > 0 ? "var(--accent)" : "var(--text3)" }}>{fmtMoney(diff)}</strong></>}
                      {approved && <> · <span style={{ color: "var(--success)", fontWeight: 700 }}>נבחר: {approved.supplier}</span></>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn size="sm" variant="ghost" onClick={() => { setForm({ ...emptyForm, topicName: topic.name }); setEditing(null); setAddOpen(true); }}>
                    <Icon n="plus" s={12} /> הצעה לנושא
                  </Btn>
                  <Btn size="sm" disabled={tQuotes.length < 2} onClick={() => {
                    if (!isProOrPremium) {
                      openUpgradeModal({
                        title: '✨ השוואת הצעות חכמה עם AI',
                        reason: 'במסלול Pro תוכלו להשוות הצעות קבלנים ולזהות פערים — וגם לקבל ניתוח AI 🤖 שקורא את קובצי ההצעות, משווה מחירים ותנאי תשלום, מזהה דגלים אדומים וממליץ עם מי לסגור.',
                      });
                      return;
                    }
                    setCompareTopicId(topic.key);
                  }}>
                    <Icon n="chart" s={12} /> השווה ({tQuotes.length})
                  </Btn>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                  {tQuotes.map(q => {
                    const isCheapest = tQuotes.length >= 2 && q.total === minTotal;
                    const isApproved = q.status === "approved";
                    const isRejected = q.status === "rejected";
                    const accentColor = isApproved ? "var(--success)" : isCheapest ? "var(--success)" : isRejected ? "var(--border)" : "var(--border)";
                    return (
                      <motion.div key={q.id}
                        whileHover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
                        transition={{ duration: 0.2 }}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRight: `4px solid ${accentColor}`,
                          borderRadius: 14,
                          padding: 16,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          opacity: isRejected ? 0.6 : 1,
                          position: "relative",
                        }}>
                        {isCheapest && !isApproved && (
                          <div style={{ position: "absolute", top: 50, left: 10, background: "rgba(16,185,129,0.15)", color: "var(--success)", border: "1.5px solid rgba(16,185,129,0.6)", borderRadius: 999, fontSize: 12, fontWeight: 800, padding: "4px 12px", letterSpacing: 0.3, boxShadow: "0 0 8px rgba(16,185,129,0.25)" }}>הזולה ביותר</div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis" }}>{q.supplier}</div>
                            {q.contact && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{q.contact}</div>}
                          </div>
                          <Badge type={statusBadgeType(q.status)}>{q.status === "approved" ? "נבחר" : q.status === "rejected" ? "נדחה" : "ממתין"}</Badge>
                        </div>

                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text1)", letterSpacing: "-0.5px" }}>{fmtMoney(q.total)}</div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text2)" }}>
                          {q.phone && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Icon n="phone" s={11} c="var(--text3)" />
                              <span style={{ direction: "ltr" }}>{q.phone}</span>
                              <div style={{ display: "flex", gap: 8, marginRight: "auto", alignItems: "center" }}>
                                <a href={`tel:${q.phone.replace(/[^0-9+]/g, '')}`} style={{ color: "var(--accent)", display: "flex" }} title="חייג">
                                  <Icon n="phone" s={13} />
                                </a>
                                <a href={`https://wa.me/${q.phone.replace(/[^0-9+]/g, '').replace(/^0/, '972')}`} target="_blank" rel="noreferrer" style={{ color: "#25D366", display: "flex" }} title="וואטסאפ">
                                  <Icon n="message-circle" s={13} />
                                </a>
                              </div>
                            </div>
                          )}
                          {q.email && <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Icon n="mail" s={11} c="var(--text3)" /> <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{q.email}</span></div>}
                          {q.validity && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon n="calendar" s={11} c="var(--text3)" /> תוקף: {q.validity}</div>}
                        </div>

                        {q.notes && <div style={{ fontSize: 11.5, color: "var(--text3)", lineHeight: 1.45, borderTop: "1px dashed var(--border)", paddingTop: 8 }}>{q.notes}</div>}

                        {q.fileName && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderTop: "1px dashed var(--border)", paddingTop: 8, fontSize: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, color: "var(--text2)" }}>
                              <Icon n="file-text" s={12} c="var(--text3)" />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.fileName}</span>
                            </div>
                            {q.fileUrl && (
                              <button onClick={() => setPreviewQuote(q)} style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Heebo',sans-serif", whiteSpace: "nowrap" }}>
                                צפייה
                              </button>
                            )}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                          <button onClick={() => approveQuote(q.id)} style={{ flex: 1, background: isApproved ? "var(--success-light)" : "transparent", color: isApproved ? "#065F46" : "var(--text2)", border: `1px solid ${isApproved ? "rgba(16,185,129,.35)" : "var(--border)"}`, borderRadius: 8, padding: "6px 8px", fontSize: 12, fontWeight: 600, fontFamily: "'Heebo',sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <Icon n="check" s={12} /> {isApproved ? "נבחר" : "בחר"}
                          </button>
                          <button onClick={() => rejectQuote(q.id)} style={{ flex: 1, background: isRejected ? "rgba(239,68,68,.08)" : "transparent", color: isRejected ? "var(--danger)" : "var(--text2)", border: `1px solid ${isRejected ? "rgba(239,68,68,.35)" : "var(--border)"}`, borderRadius: 8, padding: "6px 8px", fontSize: 12, fontWeight: 600, fontFamily: "'Heebo',sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <Icon n="x" s={12} /> {isRejected ? "נדחתה" : "דחה"}
                          </button>
                          <button onClick={() => openEdit(q)} title="ערוך" style={{ background: "transparent", color: "var(--text2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon n="edit" s={12} />
                          </button>
                          <button onClick={() => deleteQuote(q.id)} title="מחק" style={{ background: "transparent", color: "var(--danger)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon n="trash" s={12} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}

        {addOpen && (
          <Modal onClose={closeModal} title={editing ? "עריכת הצעת מחיר" : "הצעת מחיר חדשה"} width={600}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, fontWeight: 600 }}>נושא *</div>
                <Input
                  list="topic-options"
                  value={form.topicName}
                  onChange={(v: string) => setForm((f) => ({ ...f, topicName: v }))}
                  placeholder='למשל: מטבח, ריצוף או הקלד נושא חדש...'
                />
                <datalist id="topic-options">
                  {topics.map(t => <option key={t?.key} value={t?.name} />)}
                </datalist>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, fontWeight: 600 }}>שם ספק / קבלן *</div>
                <Input value={form.supplier} onChange={(v: string) => setForm((f) => ({ ...f, supplier: v }))} placeholder="למשל: מטבחי גולן" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, fontWeight: 600 }}>איש קשר</div>
                <Input value={form.contact} onChange={(v: string) => setForm((f) => ({ ...f, contact: v }))} placeholder="שם איש הקשר" />
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, fontWeight: 600 }}>טלפון</div>
                <Input value={form.phone} onChange={(v: string) => setForm((f) => ({ ...f, phone: v }))} placeholder="050-0000000" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, fontWeight: 600 }}>דוא"ל</div>
                <Input value={form.email} onChange={(v: string) => setForm((f) => ({ ...f, email: v }))} placeholder="name@example.com" />
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, fontWeight: 600 }}>סה"כ הצעה (₪) *</div>
                <NumberInput className="bp-input" value={Number(form.total) || undefined} onChange={(v: number | undefined) => setForm((f) => ({ ...f, total: v?.toString() || '' }))} placeholder="0" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, fontWeight: 600 }}>תוקף ההצעה</div>
                <Input type="date" value={form.validity} onChange={(v: string) => setForm((f) => ({ ...f, validity: v }))} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, fontWeight: 600 }}>הערות</div>
                <textarea value={form.notes} onChange={e => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="פירוט, הכללות, תנאי תשלום…" rows={3}
                  style={{ width: "100%", border: "1.5px solid var(--border)", borderRadius: 10, padding: "11px 14px", fontSize: 14, fontFamily: "'Heebo',sans-serif", resize: "vertical", outline: "none", direction: "rtl", background: "var(--surface)", color: "var(--text1)" }} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, fontWeight: 600 }}>קובץ הצעה</div>
                <div style={{ border: "1.5px dashed var(--border)", borderRadius: 10, padding: 14, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                      <Icon n="file-text" s={17} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {form.fileName || "לא נבחר קובץ"}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 2 }}>
                        PDF, תמונה, Word או Excel
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {editing?.fileUrl && form.fileName && !selectedFile && (
                      <Btn size="sm" variant="ghost" onClick={() => setPreviewQuote({ ...editing, fileName: form.fileName })}>
                        <Icon n="eye" s={12} /> צפייה
                      </Btn>
                    )}
                    {form.fileName && (
                      <Btn size="sm" variant="ghost" onClick={() => onFilePick(null)}>
                        הסר
                      </Btn>
                    )}
                    <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, border: "1px solid var(--border)", padding: "7px 10px", background: "var(--surface)", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                      <Icon n="upload-cloud" s={12} />
                      בחר קובץ
                      <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={(e) => onFilePick(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="ghost" onClick={closeModal}>ביטול</Btn>
              <Btn onClick={saveQuote} disabled={!form.supplier.trim() || !form.total || !form.topicName.trim() || saving}>
                <Icon n="check" s={13} /> {saving ? "שומר..." : editing ? "שמור שינויים" : "שמור הצעה"}
              </Btn>
            </div>
          </Modal>
        )}

        {compareTopic && (
          <Modal onClose={() => setCompareTopicId(null)} title={`השוואת הצעות — ${compareTopic.name}`} width={900}>
            <div style={{ overflowX: "auto" }}>
              <table className="bp-table" style={{ width: "100%", minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>ספק</th>
                    <th>איש קשר</th>
                    <th>טלפון</th>
                    <th>תוקף</th>
                    <th>סה"כ</th>
                    <th>סטטוס</th>
                    <th style={{ textAlign: "center" }}>בחירה</th>
                    <th style={{ textAlign: "center" }}>דחייה</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((q) => {
                    const isCheapest = q.total === cmpMin && compareRows.length >= 2;
                    const isApproved = q.status === "approved";
                    const isRejected = q.status === "rejected";
                    return (
                      <tr key={q.id} style={{ background: isApproved ? "rgba(16,185,129,.08)" : isCheapest ? "rgba(16,185,129,.04)" : "transparent" }}>
                        <td style={{ fontWeight: 600 }}>
                          {q.supplier}
                          {isCheapest && <span style={{ marginRight: 8, fontSize: 11, fontWeight: 800, color: "var(--success)", background: "rgba(16,185,129,0.15)", border: "1.5px solid rgba(16,185,129,0.55)", borderRadius: 999, padding: "2px 8px" }}>הזולה</span>}
                          {q.fileName && !/\.(jpe?g|png|webp|gif|avif)$/i.test(q.fileName) && (
                            <span title={q.fileName} style={{ marginRight: 6, color: "var(--text3)" }}><Icon n="file-text" s={11} /></span>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: "var(--text2)" }}>{q.contact || "—"}</td>
                        <td style={{ fontSize: 13, color: "var(--text2)" }}>{q.phone || "—"}</td>
                        <td style={{ fontSize: 13, color: "var(--text2)" }}>{q.validity || "—"}</td>
                        <td style={{ fontWeight: 800, fontSize: 15, color: isCheapest ? "var(--success)" : "var(--text1)" }}>{fmtMoney(q.total)}</td>
                        <td><Badge type={statusBadgeType(q.status)}>{q.status === "approved" ? "נבחר" : q.status === "rejected" ? "נדחה" : "ממתין"}</Badge></td>
                        <td style={{ textAlign: "center" }}>
                          <Btn size="sm" variant={isApproved ? "primary" : "ghost"} onClick={() => approveQuote(q.id)}>
                            <Icon n="check" s={12} /> {isApproved ? "נבחר" : "בחר הצעה"}
                          </Btn>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Btn size="sm" variant="ghost" onClick={() => rejectQuote(q.id)} style={isRejected ? { color: "var(--danger)", borderColor: "rgba(239,68,68,.35)", background: "rgba(239,68,68,.08)" } : undefined}>
                            <Icon n="x" s={12} /> {isRejected ? "נדחתה" : "דחה"}
                          </Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Stats row */}
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>הצעה זולה</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--success)", marginTop: 2 }}>{fmtMoney(cmpMin)}</div>
              </div>
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>הצעה יקרה</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)", marginTop: 2 }}>{fmtMoney(cmpMax)}</div>
              </div>
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>הפרש</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)", marginTop: 2 }}>{fmtMoney(cmpMax - cmpMin)}</div>
              </div>
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>ממוצע</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)", marginTop: 2 }}>{fmtMoney(cmpAvg)}</div>
              </div>
            </div>

            {/* ── AI Compare Section ── */}
            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              {!isProOrPremium ? (
                /* Free-plan upgrade card */
                <div style={{ background: "linear-gradient(135deg, rgba(224,122,56,.08) 0%, rgba(224,122,56,.03) 100%)", border: "1.5px solid rgba(224,122,56,.25)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(224,122,56,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🤖</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>השוואת AI — זמין ב-Pro</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>שדרג לPro לקבלת ניתוח AI חכם הכולל קריאת קבצי ההצעות</div>
                  </div>
                  <Btn size="sm" onClick={() => window.location.href = '/account'}>שדרג ל-Pro →</Btn>
                </div>
              ) : (
                <div>
                  {/* AI action button */}
                  {!aiResult && !aiLoading && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        onClick={runAiComparison}
                        disabled={aiLoading}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 8,
                          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                          color: "#fff", border: "none", borderRadius: 10,
                          padding: "10px 18px", fontSize: 13, fontWeight: 700,
                          fontFamily: "'Heebo',sans-serif", cursor: "pointer",
                          boxShadow: "0 2px 12px rgba(99,102,241,.35)",
                          transition: "opacity .15s",
                        }}
                      >
                        🤖 השווה עם AI
                        {compareRows.some(q => q.fileName && !/\.(jpe?g|png|webp|gif|avif)$/i.test(q.fileName)) && (
                          <span style={{ background: "rgba(255,255,255,.2)", borderRadius: 999, padding: "2px 8px", fontSize: 11 }}>
                            כולל {compareRows.filter(q => q.fileName && !/\.(jpe?g|png|webp|gif|avif)$/i.test(q.fileName)).length} קבצים
                          </span>
                        )}
                      </button>
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>ניתוח חכם + קריאת מסמכים</span>
                    </div>
                    <span style={{ fontSize: 10.5, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
                      ⚠️ ה-AI עלול לטעות — הניתוח הוא כלי עזר בלבד ואינו תחליף לבדיקה של ההצעות ולייעוץ מקצועי.
                    </span>
                    </div>
                  )}

                  {/* Loading state */}
                  <AnimatePresence>
                    {aiLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0" }}
                      >
                        <div style={{ width: 24, height: 24, border: "3px solid rgba(99,102,241,.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin-main 1s linear infinite", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>{aiStep || 'מעבד...'}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>אנא המתן</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error state */}
                  {aiError && aiError !== 'FREE_PLAN' && !aiError.includes('הגעת למגבלת') && (
                    <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--danger)", marginTop: 8 }}>
                      ⚠️ {aiError}
                      <button onClick={runAiComparison} style={{ marginRight: 10, background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>נסה שוב</button>
                    </div>
                  )}

                  {/* Result panel */}
                  <AnimatePresence>
                    {aiResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{
                          marginTop: 14,
                          background: "linear-gradient(135deg, rgba(99,102,241,.05) 0%, rgba(139,92,246,.03) 100%)",
                          border: "1.5px solid rgba(99,102,241,.2)",
                          borderRadius: 14, overflow: "hidden",
                        }}
                      >
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(99,102,241,.12)", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 18 }}>🤖</span>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>ניתוח AI</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            {aiFromCache && (
                              <span style={{ fontSize: 11, background: "rgba(16,185,129,.1)", color: "var(--success)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 999, padding: "2px 9px", fontWeight: 600 }}>✓ מ-cache</span>
                            )}
                            {aiRemaining !== null && aiLimitPerMonth !== null && (
                              <span style={{ fontSize: 11, color: "var(--text3)" }}>{aiRemaining} מתוך {aiLimitPerMonth} קריאות נותרו</span>
                            )}
                            <button onClick={runAiComparison} title="רענן ניתוח" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 4 }}>
                              <Icon n="refresh-cw" s={13} />
                            </button>
                          </div>
                        </div>

                        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                          {/* Summary */}
                          {aiResult.summary && (
                            <div style={{ fontSize: 13, color: "var(--text2)", fontStyle: "italic", lineHeight: 1.5 }}>💡 {aiResult.summary}</div>
                          )}

                          {/* Price analysis */}
                          {aiResult.priceAnalysis && (
                            <div style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.18)", borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, marginBottom: 4 }}>💰 ניתוח מחירים</div>
                              <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{aiResult.priceAnalysis}</div>
                            </div>
                          )}

                          {/* Recommendation */}
                          {aiResult.recommendation && (
                            <div style={{ background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ fontSize: 11, color: "var(--success)", fontWeight: 700, marginBottom: 4 }}>✅ המלצה</div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{aiResult.recommendation.supplier}</div>
                              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4, lineHeight: 1.5 }}>{aiResult.recommendation.reason}</div>
                            </div>
                          )}

                          {/* Per-supplier breakdown */}
                          {aiResult.suppliers?.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {aiResult.suppliers.map((s: any, i: number) => (
                                <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
                                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    {s.supplier}
                                    {s.paymentRisk === 'high' && <span style={{ fontSize: 10, background: "rgba(239,68,68,.1)", color: "var(--danger)", borderRadius: 999, padding: "2px 7px", fontWeight: 700 }}>סיכון תשלום גבוה</span>}
                                    {s.paymentRisk === 'medium' && <span style={{ fontSize: 10, background: "rgba(245,158,11,.1)", color: "#d97706", borderRadius: 999, padding: "2px 7px", fontWeight: 700 }}>סיכון בינוני</span>}
                                    {s.completeness === 'detailed' && <span style={{ fontSize: 10, background: "rgba(16,185,129,.1)", color: "var(--success)", borderRadius: 999, padding: "2px 7px", fontWeight: 700 }}>הצעה מפורטת</span>}
                                    {s.completeness === 'partial' && <span style={{ fontSize: 10, background: "rgba(245,158,11,.1)", color: "#d97706", borderRadius: 999, padding: "2px 7px", fontWeight: 700 }}>פירוט חלקי</span>}
                                    {s.completeness === 'minimal' && <span style={{ fontSize: 10, background: "rgba(239,68,68,.08)", color: "var(--danger)", borderRadius: 999, padding: "2px 7px", fontWeight: 700 }}>ללא פירוט</span>}
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                    {s.pros?.map((p: string, j: number) => (
                                      <div key={j} style={{ fontSize: 12, color: "var(--success)", display: "flex", gap: 6 }}><span>✅</span><span>{p}</span></div>
                                    ))}
                                    {s.cons?.map((c: string, j: number) => (
                                      <div key={j} style={{ fontSize: 12, color: "var(--danger)", display: "flex", gap: 6 }}><span>❌</span><span>{c}</span></div>
                                    ))}
                                    {(s.priceAssessment || s.paymentTermsSummary || s.warrantySummary) && (
                                      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--border)" }}>
                                        {s.priceAssessment && (
                                          <div style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 6 }}><span>💰</span><span>{s.priceAssessment}</span></div>
                                        )}
                                        {s.paymentTermsSummary && (
                                          <div style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 6 }}><span>💳</span><span>{s.paymentTermsSummary}</span></div>
                                        )}
                                        {s.warrantySummary && (
                                          <div style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 6 }}><span>🛡️</span><span>{s.warrantySummary}</span></div>
                                        )}
                                      </div>
                                    )}
                                    {s.fileInsights && (
                                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, paddingTop: 4, borderTop: "1px dashed var(--border)", display: "flex", gap: 6 }}>
                                        <span>📄</span><span>{s.fileInsights}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Red flags */}
                          {aiResult.redFlags?.length > 0 && (
                            <div style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", marginBottom: 6 }}>🚩 דגלים אדומים</div>
                              {aiResult.redFlags.map((f: string, i: number) => (
                                <div key={i} style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 6, marginBottom: 3 }}><span>⚠️</span><span>{f}</span></div>
                              ))}
                            </div>
                          )}

                          {/* Questions to ask */}
                          {aiResult.questionsToAsk?.length > 0 && (
                            <div style={{ background: "rgba(59,130,246,.05)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", marginBottom: 6 }}>❓ שאלות שכדאי לשאול לפני החלטה</div>
                              {aiResult.questionsToAsk.map((q: string, i: number) => (
                                <div key={i} style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 6, marginBottom: 3, lineHeight: 1.5 }}><span>•</span><span>{q}</span></div>
                              ))}
                            </div>
                          )}

                          {/* Negotiation tips */}
                          {aiResult.negotiationTips?.length > 0 && (
                            <div style={{ background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.18)", borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", marginBottom: 6 }}>🤝 טיפים למשא ומתן</div>
                              {aiResult.negotiationTips.map((t: string, i: number) => (
                                <div key={i} style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 6, marginBottom: 3, lineHeight: 1.5 }}><span>•</span><span>{t}</span></div>
                              ))}
                            </div>
                          )}

                          {/* Files info */}
                          {(aiResult.filesRead?.length > 0 || aiResult.filesSkipped?.length > 0) && (
                            <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", flexWrap: "wrap", gap: 10 }}>
                              {aiResult.filesRead?.length > 0 && (
                                <span>📄 נקראו: {aiResult.filesRead.join(', ')}</span>
                              )}
                              {aiResult.filesSkipped?.length > 0 && (
                                <span>⏭️ דולגו: {aiResult.filesSkipped.join(', ')}</span>
                              )}
                            </div>
                          )}

                          {/* AI disclaimer */}
                          <div style={{ fontSize: 10.5, color: "var(--text3)", borderTop: "1px dashed var(--border)", paddingTop: 8, lineHeight: 1.5 }}>
                            ⚠️ הניתוח נוצר על ידי בינה מלאכותית ועלול לכלול טעויות או אי-דיוקים. השתמשו בו ככלי עזר בלבד — בדקו את ההצעות בעצמכם לפני קבלת החלטה.
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Shown after result — refresh button */}
                  {aiResult && !aiLoading && (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={runAiComparison}
                        style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "var(--text2)", cursor: "pointer", fontFamily: "'Heebo',sans-serif", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Icon n="refresh-cw" s={11} /> עדכן ניתוח
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Modal>
        )}

        {previewQuote?.fileUrl && (
          <Modal onClose={() => setPreviewQuote(null)} title={`צפייה בקובץ — ${previewQuote.fileName || "הצעת מחיר"}`} width={900}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {canPreviewInline(previewQuote) ? (
                /\.(png|jpe?g|webp|gif|avif)$/i.test(previewQuote.fileName || "") ? (
                  <img src={previewQuote.fileUrl} alt={previewQuote.fileName || "quote file"} style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)" }} />
                ) : (
                  <iframe src={previewQuote.fileUrl} title={previewQuote.fileName || "quote file"} style={{ width: "100%", height: "70vh", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)" }} />
                )
              ) : (
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 24, textAlign: "center", color: "var(--text2)", background: "var(--bg)" }}>
                  <Icon n="file-text" s={32} c="var(--text3)" />
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>{previewQuote.fileName}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>לא ניתן להציג את סוג הקובץ הזה בתוך הדפדפן.</div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <a href={previewQuote.fileUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontFamily: "'Heebo',sans-serif", fontWeight: 700, background: "linear-gradient(135deg, var(--accent) 0%, #c96b30 100%)", color: "#fff", boxShadow: "0 2px 8px rgba(224,122,56,0.3)" }}>
                  <Icon n="download" s={13} /> פתח בקובץ מלא
                </a>
              </div>
            </div>
          </Modal>
        )}

        {deleteTargetId && (
          <ConfirmDialog
            title="מחיקת הצעת מחיר"
            message="למחוק את הצעת המחיר?"
            confirmText="מחק"
            cancelText="ביטול"
            onConfirm={confirmDeleteQuote}
            onClose={() => setDeleteTargetId(null)}
          />
        )}

        {feedback && (
          <FeedbackModal
            title={feedback.title}
            message={feedback.message}
            type={feedback.type}
            onClose={() => setFeedback(null)}
          />
        )}

        {/* AI Limit Modal */}
        {aiError && (aiError === 'FREE_PLAN' || aiError.includes('הגעת למגבלת')) && (
          <Modal title="מגבלת השוואות חכמות (AI)" onClose={() => setAiError(null)} width={420}>
            <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
              <div style={{ fontSize: 54, marginBottom: 16 }}>🤖</div>
              <h3 style={{ margin: '0 0 12px 0', color: 'var(--text1)', fontSize: 20 }}>
                {aiError === 'FREE_PLAN' ? 'שדרוג נדרש' : 'מגבלת שימושים'}
              </h3>
              <p style={{ color: 'var(--text2)', lineHeight: 1.6, marginBottom: 24, fontSize: 15, padding: '0 10px' }}>
                {aiError === 'FREE_PLAN'
                  ? 'השוואת הצעות מחיר באמצעות AI זמינה למנויי Pro ו-Premium בלבד (כולל 10 בקשות בחודש). שדרג את החשבון שלך כדי ליהנות מיכולות ניתוח חכמות וחיסכון אדיר בזמן.'
                  : aiError}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Btn variant="primary" onClick={() => window.location.href = '/account'}>ניהול מנוי / שדרוג</Btn>
                <Btn variant="outline" onClick={() => setAiError(null)}>סגור</Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ScreenBoundary>
  );
};
