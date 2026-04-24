import React from 'react';
import { motion } from 'framer-motion';
import { Icon, Btn, Select, Input, Badge, Modal, FeedbackModal } from '../components/Shared';
import { QUOTES_DATA, QUOTE_TOPICS, fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';

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
  const { projectId } = useCurrentProject();
  
  // DB Queries
  const dbQuotes = useQuery(api.quotes.listQuotes, projectId ? { projectId } : "skip");
  const dbTopics = useQuery(api.quotes.listTopics, projectId ? { projectId } : "skip");

  // Data Sources
  const { data: initialQuotes, loading: quotesLoading, error: quotesError, refetch: quotesRefetch } = useDataSource<any[]>('quotes', { db: dbQuotes as any });
  const { data: initialTopics, loading: topicsLoading } = useDataSource<any[]>('quote_topics', { db: dbTopics as any });
  
  const { mutate } = useDataMutation('quotes');

  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [filter, setFilter] = React.useState("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Quote | null>(null);
  const [compareTopicId, setCompareTopicId] = React.useState<string | null>(null);
  const [topicInputOpen, setTopicInputOpen] = React.useState(false);
  const [newTopicName, setNewTopicName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
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

  const emptyForm = { topicKey: "kitchen", supplier: "", contact: "", phone: "", email: "", total: "", validity: "", notes: "", fileName: "" };
  const [form, setForm] = React.useState<Record<string, string>>(emptyForm);

  const openAdd = () => { 
    setEditing(null); 
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
      fileName: q.fileName || "" 
    }); 
    setAddOpen(true); 
  };

  const closeModal = () => { setAddOpen(false); setEditing(null); };

  const saveQuote = async () => {
    if (!form.topicKey || !form.supplier.trim() || !form.total) return;
    const total = Number(form.total);
    if (Number.isNaN(total) || total <= 0) return;
    
    setSaving(true);
    try {
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
        fileName: form.fileName
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
    if (!confirm("למחוק את הצעת המחיר?")) return;
    try {
      await mutate('deleteQuote', { id });
      quotesRefetch();
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
    if (!file) { setForm((f) => ({ ...f, fileName: "" })); return; }
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
                  <Btn size="sm" disabled={tQuotes.length < 2} onClick={() => setCompareTopicId(topic.key)}>
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

                        <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                          <button onClick={() => approveQuote(q.id)} style={{ flex: 1, background: isApproved ? "var(--success-light)" : "transparent", color: isApproved ? "#065F46" : "var(--text2)", border: `1px solid ${isApproved ? "rgba(16,185,129,.35)" : "var(--border)"}`, borderRadius: 8, padding: "6px 8px", fontSize: 12, fontWeight: 600, fontFamily: "'Heebo',sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <Icon n="check" s={12} /> {isApproved ? "נבחר" : "בחר"}
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
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((q, i) => {
                    const isCheapest = q.total === cmpMin && compareRows.length >= 2;
                    const isApproved = q.status === "approved";
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
