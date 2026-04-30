import React from 'react';
import { motion } from 'framer-motion';
import { Icon, Btn, Select, Input, Badge, Modal, FeedbackModal, ConfirmDialog } from '../components/Shared';
import { QUOTES_DATA, QUOTE_TOPICS, fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';
import { useRequireRole } from '../hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';
import type { Id } from '../../convex/_generated/dataModel';
import { useSubscription } from '../hooks/useSubscription';

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
  
  // DB Queries
  const dbQuotes = useQuery(api.quotes.listQuotes, projectId && allowed ? { projectId } : "skip");
  const dbTopics = useQuery(api.quotes.listTopics, projectId && allowed ? { projectId } : "skip");

  // Data Sources
  const { data: initialQuotes, loading: quotesLoading, error: quotesError, refetch: quotesRefetch } = useDataSource<any[]>('quotes', { db: dbQuotes as any });
  const { data: initialTopics, loading: topicsLoading } = useDataSource<any[]>('quote_topics', { db: dbTopics as any });
  
  const { mutate } = useDataMutation('quotes');
  const uploadProjectFile = useProjectFileUploader();

  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [filter, setFilter] = React.useState("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Quote | null>(null);
  const [compareTopicId, setCompareTopicId] = React.useState<string | null>(null);
  const [topicInputOpen, setTopicInputOpen] = React.useState(false);
  const [newTopicName, setNewTopicName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<any>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [removeFile, setRemoveFile] = React.useState(false);
  const [previewQuote, setPreviewQuote] = React.useState<Quote | null>(null);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

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
    const raw = initialTopics || QUOTE_TOPICS;
    return raw.map((t: any) => ({
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

  const emptyForm = { topicKey: "kitchen", supplier: "", contact: "", phone: "", email: "", total: "", validity: "", notes: "", fileName: "", projectFileId: "" };
  const [form, setForm] = React.useState<Record<string, string>>(emptyForm);

  const openAdd = () => { 
    setEditing(null); 
    setSelectedFile(null);
    setRemoveFile(false);
    setForm({ ...emptyForm, topicKey: filter !== "all" ? filter : (topics[0]?.key || "kitchen") }); 
    setAddOpen(true); 
  };
  
  const openEdit = (q: Quote) => { 
    setEditing(q); 
    setForm({ 
      topicKey: q.topicKey, 
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
    if (!form.topicKey || !form.supplier.trim() || !form.total || !projectId) return;
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

      const payload = {
        projectId,
        id: editing?.id,
        topicKey: form.topicKey,
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

  const addCustomTopic = async () => {
    const name = newTopicName.trim();
    if (!name) return;
    
    setSaving(true);
    try {
      await mutate('addQuoteTopic', {
        projectId,
        name,
        icon: "clipboard"
      });
      setNewTopicName("");
      setTopicInputOpen(false);
      setFeedback({ title: "נושא נוסף", message: `הנושא "${name}" נוסף בהצלחה.`, type: "success" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו להוסיף את הנושא.", type: "error" });
    } finally {
      setSaving(false);
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
          </div>

          <div style={{ marginRight: "auto", display: "flex", gap: 8 }}>
            <Btn size="sm" variant="ghost" onClick={() => { setTopicInputOpen(true); setAddOpen(false); }}>
              <Icon n="plus" s={13} /> נושא חדש
            </Btn>
            <Btn size="sm" onClick={openAdd}>
              <Icon n="plus" s={13} /> הצעה חדשה
            </Btn>
          </div>
        </div>

        {topicInputOpen && !addOpen && (
          <div className="card" style={{ padding: 16, marginBottom: 16, border: "2px solid var(--accent)" }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>הוספת נושא חדש</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Input value={newTopicName} onChange={setNewTopicName} placeholder='למשל: "מערכות אזעקה" או "ריהוט גן"' style={{ flex: 1 }} />
              <Btn onClick={addCustomTopic} disabled={!newTopicName.trim() || saving}>{saving ? "שומר..." : "שמור נושא"}</Btn>
              <Btn variant="ghost" onClick={() => { setTopicInputOpen(false); setNewTopicName(""); }}>ביטול</Btn>
            </div>
          </div>
        )}

        {visibleTopics.length === 0 ? (
          <div className="card card-body" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ width: 56, height: 56, margin: "0 auto 14px", background: "var(--accent-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
              <Icon n="clipboard" s={28} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>אין עדיין הצעות מחיר</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>הוסיפו הצעות לפי נושא (מטבח, ריצוף, טיח וכו׳) כדי להתחיל להשוות בין ספקים.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Btn onClick={openAdd}><Icon n="plus" s={13} /> הוסף הצעה ראשונה</Btn>
              <Btn variant="ghost" onClick={() => setTopicInputOpen(true)}><Icon n="plus" s={13} /> נושא חדש</Btn>
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
                  <Btn size="sm" variant="ghost" onClick={() => { setForm({ ...emptyForm, topicKey: topic.key }); setEditing(null); setAddOpen(true); }}>
                    <Icon n="plus" s={12} /> הצעה לנושא
                  </Btn>
                  <Btn size="sm" disabled={tQuotes.length < 2} onClick={() => {
                    if (!isProOrPremium) {
                      setFeedback({ title: "תכונת Pro", message: "השוואת הצעות קבלנים וזיהוי פערים זמינים במסלול Pro ומעלה.", type: "info" });
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
                          <div style={{ position: "absolute", top: 50, left: 10, background: "var(--success-light)", color: "#065F46", border: "1px solid rgba(16,185,129,.25)", borderRadius: 999, fontSize: 10.5, fontWeight: 700, padding: "3px 9px", letterSpacing: 0.2 }}>הזולה ביותר</div>
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
                          {q.phone && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon n="phone" s={11} c="var(--text3)" /> {q.phone}</div>}
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
                <Select value={form.topicKey} onChange={(v: string) => { if (v === "__add__") { setTopicInputOpen(true); } else { setForm((f) => ({ ...f, topicKey: v })); } }}>
                  {topics.map(t => <option key={t?.key} value={t?.key}>{t?.name}</option>)}
                  <option value="__add__">➕ הוסף נושא חדש…</option>
                </Select>
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
                <Input type="number" value={form.total} onChange={(v: string) => setForm((f) => ({ ...f, total: v }))} placeholder="0" />
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
              <Btn onClick={saveQuote} disabled={!form.supplier.trim() || !form.total || !form.topicKey || saving}>
                <Icon n="check" s={13} /> {saving ? "שומר..." : editing ? "שמור שינויים" : "שמור הצעה"}
              </Btn>
            </div>
          </Modal>
        )}

        {compareTopic && (
          <Modal onClose={() => setCompareTopicId(null)} title={`השוואת הצעות — ${compareTopic.name}`} width={900}>
            {/* ... existing compare modal content ... */}
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
                  {compareRows.map((q, i) => {
                    const isCheapest = q.total === cmpMin && compareRows.length >= 2;
                    const isApproved = q.status === "approved";
                    const isRejected = q.status === "rejected";
                    return (
                      <tr key={q.id} style={{ background: isApproved ? "rgba(16,185,129,.08)" : isCheapest ? "rgba(16,185,129,.04)" : "transparent" }}>
                        <td style={{ fontWeight: 600 }}>
                          {q.supplier}
                          {isCheapest && <span className="badge badge-done" style={{ marginRight: 8, fontSize: 10 }}>הזולה</span>}
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
      </div>
    </ScreenBoundary>
  );
};
