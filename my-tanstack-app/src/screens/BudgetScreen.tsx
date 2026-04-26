import React from 'react';
import { motion } from 'framer-motion';
import { Icon, StatCard, ProgressBar, Btn, Badge, Modal, FeedbackModal } from '../components/Shared';
import { fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';

export const BudgetScreen = () => {
  const { projectId } = useCurrentProject();
  const dbProject = useQuery(api.queries.getProject, projectId ? { projectId } : "skip");
  const dbCats = useQuery(api.budget.listCategories, projectId ? { projectId } : "skip");
  const dbExps = useQuery(api.budget.listExpenses, projectId ? { projectId } : "skip");

  const { data: project } = useDataSource<any>('project', { db: dbProject });
  const { data: categories, loading: catsLoading, error: catsError, refetch: catsRefetch } = useDataSource<any[]>('budget_cats', { db: dbCats as any });
  const { data: expenses, loading: expLoading, error: expError, refetch: expRefetch } = useDataSource<any[]>('expenses', { db: dbExps as any });
  const { mutate } = useDataMutation('expenses');
  
  const [addOpen, setAddOpen] = React.useState(false);
  const [addCatOpen, setAddCatOpen] = React.useState(false);
  const [newExp, setNewExp] = React.useState({ desc: '', amount: '', cat: '', date: new Date().toISOString().split('T')[0] });
  const [newCat, setNewCat] = React.useState({ name: '', budget: '', color: '#F97316' });
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loading = catsLoading || expLoading || !project;
  const error = catsError || expError;
  const refetch = () => { catsRefetch(); expRefetch(); };

  if (loading) return <ScreenBoundary loading={true} onRetry={refetch}><div/></ScreenBoundary>;
  if (error) return <ScreenBoundary error={error} onRetry={refetch}><div/></ScreenBoundary>;

  const categoryBudgetSum = categories?.reduce((a,c)=>a+c.budget,0) || 0;
  const projectBudget = project?.budgetTotal || 0;
  const totalBudget = projectBudget > 0 ? projectBudget : categoryBudgetSum;
  const totalSpent = categories?.reduce((a,c)=>a+c.spent,0) || 0;
  const committed = project?.committed || 0;

  const handleAddExpense = async () => {
    if (!newExp.desc || !newExp.amount || !newExp.cat) return;
    setSaving(true);
    try {
      await mutate('addExpense', {
        projectId: projectId!,
        description: newExp.desc,
        amount: Number(newExp.amount),
        category: newExp.cat,
        date: newExp.date,
        status: 'שולם',
      });
      setAddOpen(false);
      setNewExp({ desc: '', amount: '', cat: '', date: new Date().toISOString().split('T')[0] });
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

        {/* Summary cards */}
        <motion.div
          className="grid-4"
          style={{marginBottom:24}}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          initial="hidden"
          animate="show"
        >
          {[
            { label:"תקציב כולל",    value:fmtMoney(totalBudget),                                                      icon:"chart" },
            { label:"הוצא עד כה",   value:fmtMoney(totalSpent),   accent:"var(--accent)",  sub:`${totalBudget ? Math.round(totalSpent/totalBudget*100) : 0}% מהתקציב`, icon:"arrow-right" },
            { label:"מחויב (חוזים)",value:fmtMoney(committed), accent:"var(--warning)", icon:"clipboard" },
            { label:"יתרה פנויה",   value:fmtMoney(totalBudget-totalSpent-committed), accent:"var(--success)", icon:"check-circle" },
          ].map((card,i) => (
            <motion.div key={i} variants={{ hidden:{opacity:0,y:20}, show:{opacity:1,y:0,transition:{type:"spring",stiffness:280,damping:24}} }}>
              <StatCard {...card} />
            </motion.div>
          ))}
        </motion.div>

        {/* Budget bar */}
        <div className="card" style={{marginBottom:20,padding:20}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>ניצול תקציב</div>
          <div style={{height:18,background:"var(--bg)",borderRadius:99,overflow:"hidden",display:"flex",marginBottom:12,border:"1px solid var(--border)"}}>
            <div style={{width:`${totalBudget ? (totalSpent/totalBudget*100) : 0}%`,background:"linear-gradient(90deg, var(--accent) 0%, #c96b30 100%)",transition:"width .6s cubic-bezier(.4,0,.2,1)",borderRadius:"99px 0 0 99px"}}/>
            <div style={{width:`${totalBudget ? (committed/totalBudget*100) : 0}%`,background:"#FDE68A"}}/>
          </div>
          <div style={{display:"flex",gap:24,fontSize:12.5}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"var(--accent)",display:"inline-block"}}/> הוצא: <strong>{fmtMoney(totalSpent)}</strong> ({totalBudget ? Math.round(totalSpent/totalBudget*100) : 0}%)</span>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"#F59E0B",display:"inline-block"}}/> מחויב: <strong>{fmtMoney(committed)}</strong> ({totalBudget ? Math.round(committed/totalBudget*100) : 0}%)</span>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"#D1D5DB",display:"inline-block"}}/> נותר: <strong>{fmtMoney(totalBudget-totalSpent-committed)}</strong> ({totalBudget ? Math.round((totalBudget-totalSpent-committed)/totalBudget*100) : 0}%)</span>
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
        ) : (
          <div className="card" style={{padding:40, textAlign: 'center', marginBottom: 32}}>
            <div style={{fontSize: 16, color: 'var(--text3)', marginBottom: 20}}>עדיין לא הוגדרו קטגוריות תקציב מפורטות.</div>
            <Btn onClick={() => setAddCatOpen(true)}>הגדר קטגוריה ראשונה</Btn>
          </div>
        )}

        {/* Expenses */}
        <div className="card">
          <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>הוצאות אחרונות</span>
            <Btn size="sm" onClick={()=>setAddOpen(true)} disabled={!categories || categories.length === 0}>
              <Icon n="plus" s={12}/> הוצאה חדשה
            </Btn>
          </div>
          <div style={{overflowX:"auto"}}>
            {expenses && expenses.length === 0 ? (
              <div style={{padding:40,textAlign:"center",color:"var(--text3)",fontSize:13}}>לא נמצאו הוצאות.</div>
            ) : (
              <table className="bp-table" style={{width:"100%"}}>
                <thead><tr><th>תאריך</th><th>תיאור</th><th>קטגוריה</th><th>סכום</th><th>סטטוס</th></tr></thead>
                <tbody>
                  {expenses?.map((e,i)=>(
                    <tr key={i}>
                      <td style={{fontSize:13,color:"var(--text3)"}}>{new Date(e.date).toLocaleDateString('he-IL')}</td>
                      <td style={{fontSize:13,fontWeight:500}}>{e.desc}</td>
                      <td style={{fontSize:12,color:"var(--text2)"}}>{e.cat}</td>
                      <td style={{fontSize:13,fontWeight:600}}>{fmtMoney(e.amount)}</td>
                      <td><Badge type={e.status==="שולם"?"done":"active"}>{e.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {addOpen && (
          <Modal title="הוצאה חדשה" onClose={()=>setAddOpen(false)}>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>תיאור</div>
                <input className="bp-input" value={newExp.desc} onChange={e=>setNewExp({...newExp, desc: e.target.value})} placeholder="לדוג׳: רכישת חומרי אינסטלציה" style={{width:"100%"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div>
                  <div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>סכום</div>
                  <input className="bp-input" type="number" value={newExp.amount} onChange={e=>setNewExp({...newExp, amount: e.target.value})} placeholder="0" style={{width:"100%"}}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>קטגוריה</div>
                  <select className="bp-input" value={newExp.cat} onChange={e=>setNewExp({...newExp, cat: e.target.value})} style={{width:"100%"}}>
                    <option value="">בחר קטגוריה</option>
                    {categories?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginTop:8,display:"flex",justifyContent:"flex-end",gap:12}}>
                <Btn variant="ghost" onClick={()=>setAddOpen(false)}>ביטול</Btn>
                <Btn onClick={handleAddExpense} disabled={saving}>{saving ? "שומר..." : "הוסף הוצאה"}</Btn>
              </div>
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
