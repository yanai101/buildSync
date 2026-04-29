import React, { useState } from 'react';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { PageBackground, EmptyState, Btn, Icon, ConfirmDialog, FeedbackModal } from '../components/Shared';
import { useRequireRole } from '../hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';


export const DailyLogsScreen = () => {
  const { role, allowed, loading: roleLoading } = useRequireRole(['owner', 'manager', 'inspector', 'contractor']);
  const { projectId } = useCurrentProject();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');
  
  const log = useQuery(api.dailyLogs.getLogByDate, projectId ? { projectId, date: selectedDate } : 'skip');
  const allLogs = useQuery(api.dailyLogs.getLogs, projectId && activeTab === 'history' ? { projectId } : 'skip') || [];
  const contractors = useQuery(api.queries.listContractors, projectId ? { projectId } : 'skip') || [];
  
  const saveLog = useMutation(api.dailyLogs.saveLog);
  const lockLog = useMutation(api.dailyLogs.lockLog);

  const [feedback, setFeedback] = useState<{title: string, message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Local state for the form so we can edit before saving
  const [form, setForm] = useState({
    weather: '',
    temperature: '',
    workforce: [] as any[],
    activities: [] as any[],
    deliveries: [] as any[],
    issues: [] as any[],
    instructions: [] as any[],
  });

  // Sync db log to local form when log changes or date changes
  React.useEffect(() => {
    if (log) {
      setForm({
        weather: log.weather || '',
        temperature: log.temperature || '',
        workforce: log.workforce || [],
        activities: log.activities || [],
        deliveries: log.deliveries || [],
        issues: log.issues || [],
        instructions: log.instructions || [],
      });
    } else {
      setForm({ weather: '', temperature: '', workforce: [], activities: [], deliveries: [], issues: [], instructions: [] });
    }
  }, [log, selectedDate]);

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
      await saveLog({
        logId: log?._id,
        projectId,
        date: selectedDate,
        ...form,
      });
      setFeedback({ title: "נשמר בהצלחה", message: "הדוח היומי נשמר כטיוטה.", type: 'success' });
    } catch (err: any) {
      setFeedback({ title: "שגיאה בשמירה", message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLock = async () => {
    if (!log?._id) return;
    setSaving(true);
    try {
      await lockLog({ logId: log._id });
      setFeedback({ title: "הדוח ננעל 🔒", message: "הדוח היומי ננעל ולא ניתן לשינוי. הוא עכשיו מהווה מסמך משפטי מחייב.", type: 'success' });
    } catch (err: any) {
      setFeedback({ title: "שגיאה בנעילה", message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = async (targetLog: any) => {
    if (exporting || !targetLog) return;
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

      const formattedDate = new Date(targetLog.date).toLocaleDateString('he-IL');
      const logIsLocked = targetLog.status === 'locked';

      let html = `
        <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="margin: 0; font-size: 28px; color: #111;">יומן עבודה יומי</h1>
            <p style="margin: 4px 0 0 0; color: #555; font-size: 14px;">תאריך: ${formattedDate} | סטטוס: ${logIsLocked ? 'נעול (מסמך משפטי)' : 'טיוטה'}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Build<span style="color: #FF9500;">Sync</span></div>
            <img src="/logo.png" style="height: 48px; width: auto; object-fit: contain;" />
          </div>
        </div>
      `;

      html += `<div style="margin-bottom: 20px; font-size: 14px;">
        <strong>תנאי שטח:</strong> מזג אוויר: ${targetLog.weather || '-'} | טמפרטורה: ${targetLog.temperature || '-'}
      </div>`;

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

      if (logIsLocked) {
        html += `
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #ccc; text-align: left; font-size: 12px; color: #666;">
            מסמך זה ננעל ואושר במערכת BuildSync ומהווה מסמך משפטי מחייב ליום העבודה.
          </div>
        `;
      }

      container.innerHTML = html;

      const opt = {
        margin: 10,
        filename: \`daily-log-\${targetLog.date}.pdf\`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
    <ScreenBoundary onRetry={() => {}}>
      <div className="page-content" style={{ maxWidth: 900, margin: "0 auto" }}>
        
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>בחר תאריך:</span>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", fontSize: 14, fontWeight: 600, color: "var(--text1)", outline: "none" }}
              />
              {isLocked && <div style={{ background: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><Icon n="lock" s={14}/> דוח נעול</div>}
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <Btn 
                variant="outline" 
                onClick={() => exportPDF(log)}
                disabled={exporting || !log || log.activities.length === 0}
              >
                <Icon n="download" s={16}/> {exporting ? 'מפיק PDF...' : 'הפק PDF משפטי'}
              </Btn>

              {canEditBasic && <Btn variant="primary" onClick={handleSave} disabled={saving}>
                <Icon n="save" s={16}/> {saving ? "שומר..." : "שמור טיוטה"}
              </Btn>}
              {canEditAdvanced && log && !isLocked && <Btn onClick={handleLock} disabled={saving} style={{ background: "#FF3B30", color: "#fff" }}>
                <Icon n="lock" s={16}/> נעל דוח יום
              </Btn>}
            </div>
          </div>
          
          {/* General */}
          <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            {renderSectionHeader("תנאי שטח", "sun")}
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>מזג אוויר</label>
                <input disabled={!canEditBasic} value={form.weather} onChange={e=>setForm({...form, weather: e.target.value})} placeholder="לדוגמה: שרב / גשום / רגיל" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, opacity: canEditBasic ? 1 : 0.6 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>טמפרטורה</label>
                <input disabled={!canEditBasic} value={form.temperature} onChange={e=>setForm({...form, temperature: e.target.value})} placeholder="לדוגמה: 28°C" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, opacity: canEditBasic ? 1 : 0.6 }} />
              </div>
            </div>
          </div>

          {/* Activities */}
          <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            {renderSectionHeader("מה בוצע היום?", "check-square")}
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {form.activities.map((act, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input disabled={!canEditBasic} value={act.description} onChange={e=>{
                    const newArr = [...form.activities]; newArr[i].description = e.target.value; setForm({...form, activities: newArr});
                  }} placeholder="תיאור העבודה (למשל יציקת קירות ממ״ד)" style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }} />
                  <select disabled={!canEditBasic} value={act.status} onChange={e=>{
                    const newArr = [...form.activities]; newArr[i].status = e.target.value as any; setForm({...form, activities: newArr});
                  }} style={{ width: 140, padding: "8px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}>
                    <option value="in_progress">בביצוע</option>
                    <option value="completed">הושלם</option>
                    <option value="delayed">באיחור</option>
                  </select>
                  {canEditBasic && (
                    <button onClick={()=>{
                      const newArr = [...form.activities]; newArr.splice(i, 1); setForm({...form, activities: newArr});
                    }} style={{ background: "rgba(255,59,48,0.1)", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#FF3B30", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="rgba(255,59,48,0.2)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,59,48,0.1)"}>
                      <Icon n="trash" s={14}/>
                    </button>
                  )}
                </div>
              ))}
              {canEditBasic && <Btn size="sm" variant="outline" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={()=>setForm({...form, activities: [...form.activities, { description: '', status: 'in_progress' }]})}><Icon n="plus" s={14}/> הוסף עבודה</Btn>}
              {form.activities.length === 0 && !canEditBasic && <div style={{ fontSize: 13, color: "var(--text3)" }}>אין רישום עבודות להיום.</div>}
            </div>
          </div>

          {/* Issues - Advanced Only */}
          <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            {renderSectionHeader("עיכובים ובעיות ⚠️", "alert-triangle")}
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {!isInspectorOrManager && !isOwner && <div style={{ fontSize: 13, color: "var(--text3)" }}>רק מפקח מורשה להזין ולנהל עיכובים משפטיים וכספיים.</div>}
              {form.issues.map((iss, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: 12, background: "rgba(255,59,48,0.05)", borderRadius: 8, border: "1px solid rgba(255,59,48,0.2)" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <input disabled={!canEditAdvanced} value={iss.description} onChange={e=>{
                      const newArr = [...form.issues]; newArr[i].description = e.target.value; setForm({...form, issues: newArr});
                    }} placeholder="תיאור הבעיה (למשל: משאבת בטון לא הגיעה)" style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }} />
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <select disabled={!canEditAdvanced} value={iss.type} onChange={e=>{
                        const newArr = [...form.issues]; newArr[i].type = e.target.value as any; setForm({...form, issues: newArr});
                      }} style={{ padding: "6px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}>
                        <option value="delay">עיכוב</option>
                        <option value="quality">ליקוי איכות</option>
                        <option value="safety">בטיחות</option>
                        <option value="other">אחר</option>
                      </select>
                      <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="checkbox" disabled={!canEditAdvanced} checked={iss.financialImpact} onChange={e=>{
                          const newArr = [...form.issues]; newArr[i].financialImpact = e.target.checked; setForm({...form, issues: newArr});
                        }} /> השפעה כספית / חריגה
                      </label>
                    </div>
                  </div>
                  {canEditAdvanced && (
                    <button onClick={()=>{
                      const newArr = [...form.issues]; newArr.splice(i, 1); setForm({...form, issues: newArr});
                    }} style={{ background: "rgba(255,59,48,0.1)", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#FF3B30", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="rgba(255,59,48,0.2)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,59,48,0.1)"}>
                      <Icon n="trash" s={14}/>
                    </button>
                  )}
                </div>
              ))}
              {canEditAdvanced && <Btn size="sm" variant="outline" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={()=>setForm({...form, issues: [...form.issues, { type: 'delay', description: '', financialImpact: false }]})}><Icon n="plus" s={14}/> דווח חריגה</Btn>}
            </div>
          </div>
        </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {allLogs.length === 0 ? (
              <EmptyState title="אין היסטוריית יומנים" description="עדיין לא נוצרו יומני עבודה בפרויקט זה." icon="file-text" />
            ) : (
              allLogs.map(l => (
                <div key={l._id} style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{new Date(l.date).toLocaleDateString('he-IL')}</span>
                      {l.status === 'locked' ? (
                        <span className="badge" style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}><Icon n="lock" s={12}/> נעול (מסמך משפטי)</span>
                      ) : (
                        <span className="badge badge-draft">טיוטה</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      <span>פעילויות: {l.activities.length}</span>
                      <span style={{ margin: '0 8px' }}>·</span>
                      <span>חריגות: {l.issues.length}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Btn variant="outline" size="sm" onClick={() => {
                      setSelectedDate(l.date);
                      setActiveTab('log');
                    }}>
                      <Icon n="eye" s={14} /> צפה ביומן
                    </Btn>
                    <Btn variant="outline" size="sm" onClick={() => exportPDF(l)} disabled={exporting}>
                      <Icon n="download" s={14}/> {exporting ? 'מפיק...' : 'PDF'}
                    </Btn>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {feedback && (
        <FeedbackModal
          title={feedback.title}
          message={feedback.message}
          type={feedback.type}
          onClose={() => setFeedback(null)}
        />
      )}
    </ScreenBoundary>
  );
};
