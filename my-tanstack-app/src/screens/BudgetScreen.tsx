import React from 'react';
import { Icon, ProgressBar, Btn, Badge, Modal, FeedbackModal } from '../components/Shared';
import { fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { BudgetSummaryCards } from '../components/BudgetSummaryCards';
import { useProjectBudgetSummary } from '../hooks/useProjectBudgetSummary';
import { useRequireRole } from '../hooks/useRequireRole';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';
import { useProjectFileUploader } from '../hooks/useProjectFileUploader';

export const BudgetScreen = () => {
  const { project, projectId } = useCurrentProject();
  const currentIdentity = useQuery(api.users.currentIdentity, {});
  const accessInfo = useQuery(api.projects.getProjectAccessInfo, projectId ? { projectId } : "skip");
  const canView = accessInfo?.canViewBudget ?? false;
  const accessLoading = accessInfo === undefined || currentIdentity === undefined;

  const dbCats = useQuery(api.budget.listCategories, projectId && canView ? { projectId } : "skip");
  const dbExps = useQuery(api.budget.listExpenses, projectId && canView ? { projectId } : "skip");
  const updateBudgetTotal = useMutation(api.projects.updateBudgetTotal);
  const { summary, isPending: summaryPending } = useProjectBudgetSummary();

  const isOwner = project ? (project as any).ownerUserId === currentIdentity?.userId || currentIdentity?.isSuperAdmin : false;

  const { data: categories, loading: catsLoading, error: catsError, refetch: catsRefetch } = useDataSource<any[]>('budget_cats', { db: dbCats as any });
  const { data: expenses, loading: expLoading, error: expError, refetch: expRefetch } = useDataSource<any[]>('expenses', { db: dbExps as any });
  const { mutate } = useDataMutation('expenses');
  
  const [addCatOpen, setAddCatOpen] = React.useState(false);
  const [newExp, setNewExp] = React.useState({ desc: '', amount: '', cat: '', date: new Date().toISOString().split('T')[0] });
  const [newCat, setNewCat] = React.useState({ name: '', budget: '', color: '#F97316' });
  const [budgetDraft, setBudgetDraft] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [savingBudget, setSavingBudget] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [selectedReceiptFile, setSelectedReceiptFile] = React.useState<File | null>(null);
  const [viewFile, setViewFile] = React.useState<{ url: string; name: string } | null>(null);
  const uploadProjectFile = useProjectFileUploader();

  React.useEffect(() => {
    if (!summary) return;
    setBudgetDraft(summary.projectBudget > 0 ? String(summary.projectBudget) : '');
  }, [summary?.projectBudget]);

  const loading = catsLoading || expLoading || summaryPending || !summary;
  const error = catsError || expError;
  const refetch = () => { catsRefetch(); expRefetch(); };

  if (accessLoading) return <AccessLoading />;
  if (!canView) return <AccessDenied message="אין לך הרשאה לצפות בנתוני התקציב של פרויקט זה." />;

  if (loading) return <ScreenBoundary loading={true} onRetry={refetch}><div/></ScreenBoundary>;
  if (error) return <ScreenBoundary error={error} onRetry={refetch}><div/></ScreenBoundary>;

  const totalBudget = summary.totalBudget;
  const totalSpent = summary.totalSpent;
  const committed = summary.committed;
  const remainingBudget = summary.remainingBudget;
  const spentPct = totalBudget ? Math.min(100, Math.max(0, totalSpent / totalBudget * 100)) : 0;
  const committedPct = totalBudget ? Math.min(100, Math.max(0, committed / totalBudget * 100)) : 0;
  const remainingPct = totalBudget ? Math.round((remainingBudget / totalBudget) * 100) : 0;

  const handleSaveProjectBudget = async () => {
    if (!projectId) return;
    const nextBudget = Number(budgetDraft);
    if (!Number.isFinite(nextBudget) || nextBudget < 0) return;
    setSavingBudget(true);
    try {
      await updateBudgetTotal({ projectId, budgetTotal: nextBudget });
      setFeedback({ title: "תקציב עודכן", message: `תקציב הפרויקט עודכן ל-${fmtMoney(nextBudget)}.`, type: "success" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו לעדכן את תקציב הפרויקט.", type: "error" });
    } finally {
      setSavingBudget(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExp.desc || !newExp.amount) return;
    setSaving(true);
    try {
      let fileIds: Id<'projectFiles'>[] = [];
      if (selectedReceiptFile && projectId) {
        const uploadResult = await uploadProjectFile({
          projectId,
          file: selectedReceiptFile,
          usage: 'receipt'
        });
        if (uploadResult?.fileId) {
          fileIds = [uploadResult.fileId];
        }
      }

      await mutate('addExpense', {
        projectId: projectId!,
        description: newExp.desc,
        amount: Number(newExp.amount),
        category: newExp.cat || undefined,
        date: newExp.date,
        status: 'שולם',
        fileIds: fileIds.length > 0 ? fileIds : undefined,
      });
      setNewExp({ desc: '', amount: '', cat: '', date: new Date().toISOString().split('T')[0] });
      setSelectedReceiptFile(null);
      expRefetch();
      catsRefetch();
      setFeedback({ title: "הוצאה נוספה", message: `ההוצאה "${newExp.desc}" בסך ${fmtMoney(Number(newExp.amount))} נוספה בהצלחה.`, type: "success" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו להוסיף את ההוצאה. אנא נסו שוב.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCat.name || !newCat.budget) return;
    setSaving(true);
    try {
      await mutate('addBudgetCategory', {
        projectId: projectId!,
        name: newCat.name,
        budget: Number(newCat.budget),
        color: newCat.color,
      });
      setAddCatOpen(false);
      setNewCat({ name: '', budget: '', color: '#F97316' });
      catsRefetch();
      setFeedback({ title: "קטגוריה נוספה", message: `הקטגוריה "${newCat.name}" נוספה בהצלחה לתקציב הפרויקט.`, type: "success" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו להוסיף את הקטגוריה.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F59E0B'];

  return (
    <ScreenBoundary 
      loading={loading} 
      error={error} 
      onRetry={refetch}
    >
      <div className="page-content">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
          <h1 style={{fontSize: 24, fontWeight: 800, margin: 0}}>ניהול תקציב</h1>
          <Btn onClick={() => setAddCatOpen(true)} variant="secondary">
            <Icon n="plus" s={16} />
            הוסף קטגוריה
          </Btn>
        </div>

        <div className="card" style={{padding:20,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:"var(--text1)",marginBottom:4}}>תקציב פרויקט כולל</div>
            <div style={{fontSize:12,color:"var(--text3)"}}>
              {summary.isProjectBudgetDefined
                ? "זהו מקור התקציב הראשי שמסנכרן את עמוד התקציב ולוח הבקרה."
                : "לא הוגדר תקציב בפרויקט. הגדירו כאן תקציב כולל כדי לסנכרן את כל הסיכומים."}
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <input
              className="bp-input"
              type="number"
              min={0}
              value={budgetDraft}
              onChange={e=>setBudgetDraft(e.target.value)}
              placeholder="0"
              style={{width:180,fontWeight:700}}
              disabled={!isOwner}
            />
            {isOwner && (
              <Btn onClick={handleSaveProjectBudget} disabled={savingBudget || !projectId}>
                {savingBudget ? "שומר..." : "שמור תקציב"}
              </Btn>
            )}
          </div>
        </div>

        <BudgetSummaryCards summary={summary} style={{marginBottom:24}} />

        {/* Budget bar */}
        <div className="card" style={{marginBottom:20,padding:20}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>ניצול תקציב</div>
          <div style={{height:18,background:"var(--bg)",borderRadius:99,overflow:"hidden",display:"flex",marginBottom:12,border:"1px solid var(--border)"}}>
            <div style={{width:`${spentPct}%`,background:"linear-gradient(90deg, var(--accent) 0%, #c96b30 100%)",transition:"width .6s cubic-bezier(.4,0,.2,1)",borderRadius:"99px 0 0 99px"}}/>
            <div style={{width:`${committedPct}%`,background:"#FDE68A"}}/>
          </div>
          <div style={{display:"flex", flexWrap:"wrap", gap:16, fontSize:12.5}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"var(--accent)",display:"inline-block"}}/> הוצא: <strong>{fmtMoney(totalSpent)}</strong> ({totalBudget ? Math.round(totalSpent/totalBudget*100) : 0}%)</span>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"#F59E0B",display:"inline-block"}}/> מחויב: <strong>{fmtMoney(committed)}</strong> ({totalBudget ? Math.round(committed/totalBudget*100) : 0}%)</span>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"#D1D5DB",display:"inline-block"}}/> נותר: <strong>{fmtMoney(remainingBudget)}</strong> ({remainingPct}%)</span>
          </div>
        </div>

        {/* Categories */}
        {categories && categories.length > 0 ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:20,marginBottom:32}}>
            {categories.map((c,i)=>{
              const pct=c.budget?Math.round(c.spent/c.budget*100):0;
              const over=c.spent>c.budget;
              return (
                <div key={i} className="card" style={{padding:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,marginBottom:8}}>
                    <span style={{width:8,height:8,borderRadius:2,background:c.color,display:"inline-block",flexShrink:0}}/>
                    {c.name}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:13}}>{fmtMoney(c.budget)}</span>
                      <span style={{fontSize:13,color:over?"var(--danger)":"inherit",fontWeight:over?700:400}}>{fmtMoney(c.spent)}</span>
                  </div>
                  <ProgressBar value={Math.min(pct,100)} color={over?"var(--danger)":c.color} height={5}/>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Side by side grid for Add Category and Add Expense */}
        <div style={{ display: 'grid', gridTemplateColumns: (!categories || categories.length === 0) ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: 24, marginBottom: 24 }}>
          {/* Add Category Static Form (Only if no categories) */}
          {(!categories || categories.length === 0) && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon n="folder-plus" s={20} c="var(--accent)" />
                הוספת קטגוריית תקציב ראשונה
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>שם הקטגוריה</div>
                    <input className="bp-input" value={newCat.name} onChange={e=>setNewCat({...newCat, name: e.target.value})} placeholder="לדוג׳: אינסטלציה..." style={{width:"100%"}}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>תקציב (₪)</div>
                    <input className="bp-input" type="number" value={newCat.budget} onChange={e=>setNewCat({...newCat, budget: e.target.value})} placeholder="0" style={{width:"100%"}}/>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>צבע מזהה</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <div 
                        key={c} 
                        onClick={() => setNewCat({...newCat, color: c})}
                        style={{
                          width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer',
                          border: newCat.color === c ? '3px solid #000' : 'none',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <Btn onClick={handleAddCategory} disabled={saving || !newCat.name || !newCat.budget}>{saving ? "שומר..." : "הוסף קטגוריה"}</Btn>
                </div>
              </div>
            </div>
          )}

          {/* Occasional Expenses Static Form */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n="plus-circle" s={20} c="var(--accent)" />
              הוספת הוצאה מזדמנת
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>תיאור ההוצאה</div>
                  <input 
                    className="bp-input" 
                    value={newExp.desc} 
                    onChange={e => setNewExp({...newExp, desc: e.target.value})} 
                    placeholder="לדוג׳: חומרים..." 
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>סכום (₪)</div>
                  <input 
                    className="bp-input" 
                    type="number" 
                    value={newExp.amount} 
                    onChange={e => setNewExp({...newExp, amount: e.target.value})} 
                    placeholder="0" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>קטגוריה (אופציונלי)</div>
                  <select 
                    className="bp-input" 
                    value={newExp.cat} 
                    onChange={e => setNewExp({...newExp, cat: e.target.value})} 
                    style={{ width: '100%' }}
                  >
                    <option value="">ללא קטגוריה</option>
                    {categories?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16 }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)', background: 'var(--surface)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedReceiptFile(file);
                      }}
                    />
                    <Icon n={selectedReceiptFile ? "check" : "paperclip"} s={16} c={selectedReceiptFile ? "var(--success)" : "currentColor"} />
                    {selectedReceiptFile ? "קובץ נבחר" : "הוסף קבלה"}
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                {selectedReceiptFile ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    נבחר קובץ: <span style={{ maxWidth: 100, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>{selectedReceiptFile.name}</span>
                    <button 
                      onClick={() => setSelectedReceiptFile(null)} 
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', marginRight: 8, textDecoration: 'underline' }}
                    >
                      הסר
                    </button>
                  </div>
                ) : <div/>}
                
                <Btn 
                  onClick={handleAddExpense} 
                  disabled={saving || !newExp.desc || !newExp.amount}
                >
                  {saving ? "שומר..." : "הוסף הוצאה"}
                </Btn>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="card">
          <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>הוצאות אחרונות</span>
          </div>
          <div style={{overflowX:"auto"}}>
            {expenses && expenses.length === 0 ? (
              <div style={{padding:40,textAlign:"center",color:"var(--text3)",fontSize:13}}>לא נמצאו הוצאות.</div>
            ) : (
              <table className="bp-table" style={{width:"100%"}}>
                <thead><tr><th>תאריך</th><th>תיאור</th><th>קטגוריה</th><th>סכום</th><th>סטטוס</th><th>קבלה</th></tr></thead>
                <tbody>
                  {expenses?.map((e,i)=>(
                    <tr key={i}>
                      <td style={{fontSize:13,color:"var(--text3)"}}>{new Date(e.date).toLocaleDateString('he-IL')}</td>
                      <td style={{fontSize:13,fontWeight:500}}>{e.desc}</td>
                      <td style={{fontSize:12,color:"var(--text2)"}}>{e.cat}</td>
                      <td style={{fontSize:13,fontWeight:600}}>{fmtMoney(e.amount)}</td>
                      <td><Badge type={e.status==="שולם"?"done":"active"}>{e.status}</Badge></td>
                      <td>
                        {e.files && e.files.length > 0 && (
                          <div 
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', color: 'var(--accent)' }}
                            onClick={() => setViewFile(e.files[0])}
                            title="צפה בקבלה"
                          >
                            <Icon n="file-text" s={16} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {viewFile && (
          <Modal title={viewFile.name} onClose={() => setViewFile(null)}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
              {viewFile.name?.toLowerCase().endsWith('.pdf') ? (
                <iframe src={viewFile.url} style={{ width: '100%', height: 500, border: 'none' }} title={viewFile.name} />
              ) : (
                <img src={viewFile.url} alt={viewFile.name} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }} />
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Btn variant="outline" onClick={() => setViewFile(null)}>סגור</Btn>
              <Btn style={{ marginRight: 8 }} onClick={() => window.open(viewFile.url, '_blank')}>
                <Icon n="external-link" s={16} /> פתח בחלון חדש
              </Btn>
            </div>
          </Modal>
        )}

        {addCatOpen && (
          <Modal title="קטגוריית תקציב חדשה" onClose={()=>setAddCatOpen(false)}>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>שם הקטגוריה</div>
                <input className="bp-input" value={newCat.name} onChange={e=>setNewCat({...newCat, name: e.target.value})} placeholder="לדוג׳: אינסטלציה, ריצוף, חשמל..." style={{width:"100%"}}/>
              </div>
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>תקציב מוקצה (₪)</div>
                <input className="bp-input" type="number" value={newCat.budget} onChange={e=>setNewCat({...newCat, budget: e.target.value})} placeholder="0" style={{width:"100%"}}/>
              </div>
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:8}}>צבע מזהה</div>
                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                  {COLORS.map(c => (
                    <div 
                      key={c} 
                      onClick={() => setNewCat({...newCat, color: c})}
                      style={{
                        width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer',
                        border: newCat.color === c ? '3px solid #000' : 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{marginTop:8,display:"flex",justifyContent:"flex-end",gap:12, borderTop: '1px solid var(--border)', paddingTop: 16}}>
                <Btn variant="ghost" onClick={()=>setAddCatOpen(false)}>ביטול</Btn>
                <Btn onClick={handleAddCategory} disabled={saving}>{saving ? "שומר..." : "הוסף קטגוריה"}</Btn>
              </div>
            </div>
          </Modal>
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
