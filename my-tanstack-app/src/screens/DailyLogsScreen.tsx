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
  
  const log = useQuery(api.dailyLogs.getLogByDate, projectId ? { projectId, date: selectedDate } : 'skip');
  const contractors = useQuery(api.queries.listContractors, projectId ? { projectId } : 'skip') || [];
  
  const saveLog = useMutation(api.dailyLogs.saveLog);
  const lockLog = useMutation(api.dailyLogs.lockLog);

  const [feedback, setFeedback] = useState<{title: string, message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [saving, setSaving] = useState(false);

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
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
              style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14, fontWeight: 600, color: "var(--text1)", outline: "none" }}
            />
            {isLocked && <div style={{ background: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><Icon n="lock" s={14}/> דוח נעול</div>}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
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

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
             <Btn variant="outline" onClick={() => setFeedback({ title: "הדפסת דוח", message: "פיצ'ר ה-PDF ליומן עבודה יומי יתווסף בהמשך. הדוח יכלול את הנתונים, התמונות וחתימות הדיגיטליות.", type: 'info' })}>
               <Icon n="download" s={16}/> הפק PDF משפטי
             </Btn>

             <div style={{ display: "flex", gap: 12 }}>
                {canEditBasic && <Btn variant="primary" onClick={handleSave} disabled={saving}>
                  <Icon n="save" s={16}/> {saving ? "שומר..." : "שמור טיוטה"}
                </Btn>}
                {canEditAdvanced && log && !isLocked && <Btn onClick={handleLock} disabled={saving} style={{ background: "#FF3B30", color: "#fff" }}>
                  <Icon n="lock" s={16}/> נעל דוח יום
                </Btn>}
             </div>
          </div>

        </div>
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
