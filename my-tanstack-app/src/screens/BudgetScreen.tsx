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

  const [editingCatId, setEditingCatId] = React.useState<string | null>(null);
  const [editCatState, setEditCatState] = React.useState({ name: '', budget: '', color: '#F97316' });
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const [deleteExpenseConfirmId, setDeleteExpenseConfirmId] = React.useState<string | null>(null);
  const [editExpenseData, setEditExpenseData] = React.useState<any | null>(null);
  const [selectedEditReceiptFile, setSelectedEditReceiptFile] = React.useState<File | null>(null);
  const [openExpMonths, setOpenExpMonths] = React.useState<Set<string>>(() => new Set([new Date().toISOString().slice(0, 7)]));

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


  const handleUpdateCategory = async (id: string) => {
    if (!editCatState.name || !editCatState.budget) return;
    setSaving(true);
    try {
      await mutate('updateBudgetCategory', {
        categoryId: id as any,
        name: editCatState.name,
        budget: Number(editCatState.budget),
        color: editCatState.color,
      });
      setEditingCatId(null);
      catsRefetch();
      setFeedback({ title: "עודכן", message: "הקטגוריה עודכנה בהצלחה.", type: "success" });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו לעדכן את הקטגוריה.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setSaving(true);
    try {
      await mutate('deleteBudgetCategory', { categoryId: id as any });
      catsRefetch();
      setFeedback({ title: "נמחק", message: "הקטגוריה נמחקה בהצלחה.", type: "success" });
      setDeleteConfirmId(null);
    } catch (err: any) {
      const errorMessage = err.data || err.message || "לא ניתן למחוק קטגוריה עם הוצאות מקושרות.";
      setFeedback({ title: "שגיאה במחיקה", message: typeof errorMessage === 'string' ? errorMessage : "אירעה שגיאה.", type: "error" });
      setDeleteConfirmId(null);
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteExpense = async (id: string) => {
    setSaving(true);
    try {
      await mutate('deleteExpense', { expenseId: id });
      expRefetch();
      catsRefetch();
      setFeedback({ title: "נמחק", message: "ההוצאה נמחקה בהצלחה.", type: "success" });
      setDeleteExpenseConfirmId(null);
    } catch (err: any) {
      setFeedback({ title: "שגיאה", message: err.message || "אירעה שגיאה במחיקת ההוצאה.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExpense = async () => {
    if (!editExpenseData || !editExpenseData.desc || !editExpenseData.amount) return;
    setSaving(true);
    try {
      let fileIds: any[] = [];
      if (selectedEditReceiptFile && projectId) {
        const uploadResult = await uploadProjectFile({
          projectId,
          file: selectedEditReceiptFile,
          usage: 'receipt'
        });
        if (uploadResult?.fileId) {
          fileIds = [uploadResult.fileId];
        }
      }

      await mutate('updateExpense', {
        expenseId: editExpenseData.id,
        description: editExpenseData.desc,
        amount: Number(editExpenseData.amount),
        category: editExpenseData.cat || undefined,
        date: editExpenseData.date,
        status: editExpenseData.status,
        fileIds: fileIds.length > 0 ? fileIds : undefined
      });
      setEditExpenseData(null);
      setSelectedEditReceiptFile(null);
      expRefetch();
      catsRefetch();
      setFeedback({ title: "עודכן", message: "ההוצאה עודכנה בהצלחה.", type: "success" });
    } catch (err: any) {
      setFeedback({ title: "שגיאה", message: err.message || "לא הצלחנו לעדכן את ההוצאה.", type: "error" });
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
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, gap:16, flexWrap:'wrap'}}>
          <div style={{display:'flex', alignItems:'center', gap:14}}>
            <div style={{
              width:48, height:48, borderRadius:14,
              background:'linear-gradient(135deg, var(--accent-light) 0%, var(--accent-glow-sm) 100%)',
              color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center',
              border:'1.5px solid var(--accent-glow-sm)', boxShadow:'0 4px 16px var(--accent-glow-sm)', flexShrink:0
            }}>
              <Icon n="chart" s={22}/>
            </div>
            <div>
              <h1 style={{fontSize:22, fontWeight:800, margin:0, letterSpacing:'-0.4px'}}>ניהול תקציב</h1>
              <div style={{fontSize:12.5, color:'var(--text3)', marginTop:3}}>מעקב הוצאות וקטגוריות תקציב</div>
            </div>
          </div>
          <Btn onClick={() => setAddCatOpen(true)} variant="secondary" icon="plus">
            הוסף קטגוריה
          </Btn>
        </div>

        <div className="card" style={{padding:'20px 24px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap', borderRight:'3px solid var(--accent)', position:'relative', overflow:'hidden'}}>
          <div style={{position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, var(--accent), transparent)', borderRadius:'var(--radius) var(--radius) 0 0'}} />
          <div>
            <div style={{fontSize:14, fontWeight:800, color:'var(--text1)', marginBottom:4, display:'flex', alignItems:'center', gap:8}}>
              <Icon n="clipboard" s={16} c="var(--accent)"/>
              תקציב פרויקט כולל
            </div>
            <div style={{fontSize:12, color:'var(--text3)'}}>
              {summary.isProjectBudgetDefined
                ? "זהו מקור התקציב הראשי שמסנכרן את עמוד התקציב ולוח הבקרה."
                : "לא הוגדר תקציב בפרויקט. הגדירו כאן תקציב כולל כדי לסנכרן את כל הסיכומים."}
            </div>
          </div>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <input
              className="bp-input"
              type="number"
              min={0}
              value={budgetDraft}
              onChange={e=>setBudgetDraft(e.target.value)}
              placeholder="0"
              style={{width:180, fontWeight:700, fontSize:16}}
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

        {/* Budget utilization bar */}
        <div className="card" style={{marginBottom:24, padding:'18px 22px'}}>
          <div style={{fontWeight:700, fontSize:14, marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <span style={{display:'flex', alignItems:'center', gap:8}}>
              <Icon n="chart" s={15} c="var(--accent)"/>
              ניצול תקציב
            </span>
            <span style={{fontSize:12.5, color:'var(--text2)', fontWeight:600, background:'var(--surface-2)', padding:'4px 10px', borderRadius:20}}>
              נותר: {fmtMoney(remainingBudget)} ({remainingPct}%)
            </span>
          </div>
          <div style={{height:14, background:'var(--bg-2,var(--border))', borderRadius:99, overflow:'hidden', display:'flex', marginBottom:14, border:'1px solid var(--border)', position:'relative'}}>
            <div style={{width:`${spentPct}%`, background:'linear-gradient(90deg, var(--accent) 0%, var(--accent-dark) 100%)', transition:'width .6s cubic-bezier(.4,0,.2,1)', position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', inset:0, background:'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)', animation:'shimmer 2.5s ease-in-out infinite'}}/>
            </div>
            <div style={{width:`${committedPct}%`, background:'linear-gradient(90deg, #F59E0B, #FDE68A)'}}/>
          </div>
          <div style={{display:'flex', flexWrap:'wrap', gap:16, fontSize:12.5}}>
            <span style={{display:'flex', alignItems:'center', gap:6}}>
              <span style={{width:12, height:12, borderRadius:3, background:'var(--accent)', display:'inline-block'}}/>
              הוצא: <strong>{fmtMoney(totalSpent)}</strong> ({totalBudget ? Math.round(totalSpent/totalBudget*100) : 0}%)
            </span>
            <span style={{display:'flex', alignItems:'center', gap:6}}>
              <span style={{width:12, height:12, borderRadius:3, background:'#F59E0B', display:'inline-block'}}/>
              מחויב: <strong>{fmtMoney(committed)}</strong> ({totalBudget ? Math.round(committed/totalBudget*100) : 0}%)
            </span>
            <span style={{display:'flex', alignItems:'center', gap:6}}>
              <span style={{width:12, height:12, borderRadius:3, background:'var(--border)', display:'inline-block', border:'1px solid var(--border-strong)'}}/>
              נותר: <strong>{fmtMoney(remainingBudget)}</strong> ({remainingPct}%)
            </span>
          </div>
        </div>

        {/* Categories */}
        {categories && categories.length > 0 ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:20,marginBottom:32}}>
            {categories.map((c,i)=>{
              const pct=c.budget?Math.round(c.spent/c.budget*100):0;
              const over=c.spent>c.budget;
              return (
                <div key={i} className="card card-hover" style={{padding:0, overflow:'hidden', borderRight:`3px solid ${c.color||'var(--accent)'}`, transition:'all 0.2s'}}>
                  {editingCatId === c._id ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 12, padding:'18px 20px'}}>
                      <input className="bp-input" value={editCatState.name} onChange={e=>setEditCatState({...editCatState, name: e.target.value})} placeholder="שם קטגוריה" style={{width: '100%'}}/>
                      <input className="bp-input" type="number" value={editCatState.budget} onChange={e=>setEditCatState({...editCatState, budget: e.target.value})} placeholder="תקציב" style={{width: '100%'}}/>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {COLORS.map(color => (
                          <div 
                            key={color} 
                            onClick={() => setEditCatState({...editCatState, color})}
                            style={{
                              width: 22, height: 22, borderRadius: 6, background: color, cursor: 'pointer',
                              border: editCatState.color === color ? '2.5px solid var(--text1)' : '2px solid transparent',
                              boxShadow: editCatState.color === color ? '0 0 0 2px var(--bg)' : 'none'
                            }}
                          />
                        ))}
                      </div>
                      <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4}}>
                        <Btn onClick={() => setEditingCatId(null)} variant="secondary" size="sm">ביטול</Btn>
                        <Btn onClick={() => handleUpdateCategory(c._id)} disabled={saving} size="sm">שמור</Btn>
                      </div>
                    </div>
                  ) : (
                    <div style={{padding:'18px 20px'}}>
                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
                        <div style={{display:'flex', alignItems:'center', gap:10}}>
                          <div style={{
                            width:36, height:36, borderRadius:10,
                            background:`${c.color||'var(--accent)'}18`,
                            color:c.color||'var(--accent)',
                            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                          }}>
                            <Icon n="chart" s={18}/>
                          </div>
                          <span style={{fontWeight:800, fontSize:14, color:'var(--text1)'}}>{c.name}</span>
                        </div>
                        <div style={{display: 'flex', gap: 4}}>
                          <button onClick={() => {
                            setEditingCatId(c._id);
                            setEditCatState({ name: c.name, budget: String(c.budget), color: c.color });
                          }} className="icon-btn icon-btn-accent" title="ערוך">
                            <Icon n="edit" s={14}/>
                          </button>
                          <button onClick={() => setDeleteConfirmId(c._id)} className="icon-btn icon-btn-danger" title="מחק">
                            <Icon n="trash" s={14}/>
                          </button>
                        </div>
                      </div>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:13}}>
                        <span style={{color:'var(--text3)', fontWeight:600}}>תקציב: {fmtMoney(c.budget)}</span>
                        <span style={{color:over?'var(--danger)':'var(--text1)', fontWeight:700}}>
                          {fmtMoney(c.spent)} <span style={{fontSize:11, color:over?'var(--danger)':'var(--text3)', fontWeight:400}}>({pct}%)</span>
                        </span>
                      </div>
                      <ProgressBar value={Math.min(pct,100)} color={over?'var(--danger)':c.color} height={7}/>
                      {over && (
                        <div style={{marginTop:8, fontSize:11.5, color:'var(--danger)', fontWeight:700, display:'flex', alignItems:'center', gap:4}}>
                          <Icon n="alert" s={12}/>
                          חריגה: +{fmtMoney(c.spent - c.budget)}
                        </div>
                      )}
                    </div>
                  )}
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ cursor: 'pointer', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--text2)', background: 'var(--surface)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
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
                      קובץ
                    </label>
                    <label className="mobile-only" style={{ cursor: 'pointer', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--text2)', background: 'var(--surface)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) setSelectedReceiptFile(file);
                        }}
                      />
                      <Icon n="camera" s={16} />
                      צלם
                    </label>
                  </div>
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


        {/* Expenses — grouped by month */}
        <div className="card">
          <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>הוצאות</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {!expenses || expenses.length === 0 ? (
              <div style={{padding:40,textAlign:"center",color:"var(--text3)",fontSize:13}}>לא נמצאו הוצאות.</div>
            ) : (() => {
              // Group by year-month
              const sorted = expenses.slice().sort((a:any,b:any) => (b._creationTime || 0) - (a._creationTime || 0));
              const groups: Record<string, typeof sorted> = {};
              for (const e of sorted) {
                const d = new Date(e.date);
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(e);
              }
              const keys = Object.keys(groups).sort((a,b) => b.localeCompare(a));
              const currentKey = new Date().toISOString().slice(0,7);

              return keys.map(monthKey => {
                const monthExps = groups[monthKey];
                const [yr, mo] = monthKey.split('-');
                const monthName = new Date(Number(yr), Number(mo)-1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
                const isCurrentMonth = monthKey === currentKey;
                const isOpen = openExpMonths.has(monthKey);
                const monthTotal = monthExps.reduce((s:number, e:any) => s + e.amount, 0);
                const paidTotal = monthExps.filter((e:any) => e.status === 'שולם').reduce((s:number, e:any) => s + e.amount, 0);

                return (
                  <div key={monthKey} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Month header */}
                    <button
                      onClick={() => setOpenExpMonths(prev => {
                        const next = new Set(prev);
                        if (next.has(monthKey)) next.delete(monthKey); else next.add(monthKey);
                        return next;
                      })}
                      style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'none', border:'none', cursor:'pointer' }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <Icon n={isOpen ? 'chevron-down' : 'chevron-left'} s={16} c="var(--text3)" />
                        <span style={{ fontWeight:700, fontSize:15 }}>{monthName}</span>
                        {isCurrentMonth && <span style={{ fontSize:11, background:'var(--accent)', color:'#fff', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>עכשיו</span>}
                      </div>
                      <div style={{ display:'flex', gap:16, fontSize:13, color:'var(--text2)', alignItems:'center' }}>
                        <span>{monthExps.length} הוצאות</span>
                        <span style={{ fontWeight:600, color:'var(--text1)' }}>{fmtMoney(monthTotal)}</span>
                      </div>
                    </button>

                    {/* Expense cards */}
                    {isOpen && (
                      <div style={{ display:'flex', flexDirection:'column', gap:0, maxHeight:'65vh', overflowY:'auto', padding:'0 16px 12px' }}>
                        {monthExps.map((e:any, idx:number) => (
                          <div
                            key={e.id || idx}
                            style={{
                              display:'flex', alignItems:'center', gap:12, padding:'12px 4px',
                              borderBottom: idx < monthExps.length - 1 ? '1px solid var(--border)' : 'none',
                            }}
                          >
                            {/* Status bar */}
                            <div style={{ width:3, height:40, borderRadius:4, background: e.status==='שולם' ? 'var(--success)' : 'var(--accent)', flexShrink:0 }} />

                            {/* Receipt icon */}
                            {e.files && e.files.length > 0 ? (
                              <div
                                onClick={() => setViewFile(e.files[0])}
                                style={{ width:36, height:36, borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--accent)', flexShrink:0 }}
                                title="צפה בקבלה"
                              >
                                <Icon n="file-text" s={16} />
                              </div>
                            ) : (
                              <div style={{ width:36, height:36, borderRadius:8, background:'var(--bg)', border:'1px dashed var(--border)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', flexShrink:0 }}>
                                <Icon n={e.contractorId ? 'user' : 'shopping-cart'} s={15} />
                              </div>
                            )}

                            {/* Main info */}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:600, fontSize:14, wordBreak:'break-word' }}>{e.desc}</div>
                              <div style={{ fontSize:12, color:'var(--text2)', display:'flex', gap:8, marginTop:2, flexWrap:'wrap' }}>
                                {e.cat && <span>קטג': {e.cat}</span>}
                                <span>{new Date(e.date).toLocaleDateString('he-IL')}</span>
                                {e.contractorId && <span style={{ color:'var(--text3)' }}>הוצאת קבלן</span>}
                              </div>
                            </div>

                            {/* Amount + status */}
                            <div style={{ textAlign:'left', flexShrink:0 }}>
                              <div style={{ fontWeight:700, fontSize:15 }}>{fmtMoney(e.amount)}</div>
                              <div style={{ fontSize:11, marginTop:2, color: e.status==='שולם' ? 'var(--success)' : 'var(--accent)', fontWeight:600 }}>{e.status}</div>
                            </div>

                            {/* Actions */}
                            {!e.contractorId && (
                              <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                                <button onClick={() => setEditExpenseData({ id:e.id, desc:e.desc, amount:String(e.amount), cat:e.cat||'', date:e.date, status:e.status })} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:4, borderRadius:6 }} title="ערוך">
                                  <Icon n="edit" s={14}/>
                                </button>
                                <button onClick={() => setDeleteExpenseConfirmId(e.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', padding:4, borderRadius:6 }} title="מחק">
                                  <Icon n="trash" s={14}/>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
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

        {deleteConfirmId && (
          <Modal title="מחיקת קטגוריה" onClose={() => setDeleteConfirmId(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.5 }}>
                האם אתה בטוח שברצונך למחוק קטגוריה זו? <br/>
                הפעולה תמחק את התקציב המשויך אליה, ולא ניתנת לביטול.
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <Btn variant="ghost" onClick={() => setDeleteConfirmId(null)}>ביטול</Btn>
                <Btn onClick={() => handleDeleteCategory(deleteConfirmId)} disabled={saving} style={{ background: 'var(--danger)' }}>
                  {saving ? "מוחק..." : "כן, מחק"}
                </Btn>
              </div>
            </div>
          </Modal>
        )}

        {deleteExpenseConfirmId && (
          <Modal title="מחיקת הוצאה" onClose={() => setDeleteExpenseConfirmId(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.5 }}>
                האם אתה בטוח שברצונך למחוק הוצאה זו?
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <Btn variant="ghost" onClick={() => setDeleteExpenseConfirmId(null)}>ביטול</Btn>
                <Btn onClick={() => handleDeleteExpense(deleteExpenseConfirmId)} disabled={saving} style={{ background: 'var(--danger)' }}>
                  {saving ? "מוחק..." : "כן, מחק"}
                </Btn>
              </div>
            </div>
          </Modal>
        )}

        {editExpenseData && (
          <Modal title="עריכת הוצאה מזדמנת" onClose={() => setEditExpenseData(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>תיאור ההוצאה</div>
                <input className="bp-input" value={editExpenseData.desc} onChange={e => setEditExpenseData({...editExpenseData, desc: e.target.value})} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>סכום (₪)</div>
                <input className="bp-input" type="number" value={editExpenseData.amount} onChange={e => setEditExpenseData({...editExpenseData, amount: e.target.value})} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>קטגוריה (אופציונלי)</div>
                <select className="bp-input" value={editExpenseData.cat} onChange={e => setEditExpenseData({...editExpenseData, cat: e.target.value})} style={{ width: '100%' }}>
                  <option value="">ללא קטגוריה</option>
                  {categories?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>סטטוס תשלום</div>
                <select className="bp-input" value={editExpenseData.status} onChange={e => setEditExpenseData({...editExpenseData, status: e.target.value})} style={{ width: '100%' }}>
                  <option value="שולם">שולם</option>
                  <option value="ממתין">ממתין</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>הוסף/עדכן קבלה</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ cursor: 'pointer', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--text2)', background: 'var(--surface)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedEditReceiptFile(file);
                      }}
                    />
                    <Icon n={selectedEditReceiptFile ? "check" : "paperclip"} s={16} c={selectedEditReceiptFile ? "var(--success)" : "currentColor"} />
                    {selectedEditReceiptFile ? "קובץ נבחר" : "בחר קובץ"}
                  </label>
                  <label className="mobile-only" style={{ cursor: 'pointer', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--text2)', background: 'var(--surface)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedEditReceiptFile(file);
                      }}
                    />
                    <Icon n="camera" s={16} /> צלם
                  </label>
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <Btn variant="ghost" onClick={() => setEditExpenseData(null)}>ביטול</Btn>
                <Btn onClick={handleUpdateExpense} disabled={saving || !editExpenseData.desc || !editExpenseData.amount}>
                  {saving ? "שומר..." : "שמור שינויים"}
                </Btn>
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
