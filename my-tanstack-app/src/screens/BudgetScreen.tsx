import React from 'react';
import { motion } from 'framer-motion';
import { Icon, StatCard, ProgressBar, Btn, Badge, Modal } from '../components/Shared';
import { PROJECT, fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';

export const BudgetScreen = () => {
  const { projectId } = useCurrentProject();
  const dbCats = useQuery(api.queries.listBudgetCategories, projectId ? { projectId } : "skip");
  const dbExps = useQuery(api.queries.listExpenses, projectId ? { projectId } : "skip");

  const { data: categories, loading: catsLoading, error: catsError, refetch: catsRefetch } = useDataSource<any[]>('budget_cats', { db: dbCats as any });
  const { data: expenses, loading: expLoading, error: expError, refetch: expRefetch } = useDataSource<any[]>('expenses', { db: dbExps as any });
  const { mutate } = useDataMutation('expenses');
  
  const [addOpen, setAddOpen] = React.useState(false);
  const [newExp, setNewExp] = React.useState({ desc: '', amount: '', cat: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = React.useState(false);

  const loading = catsLoading || expLoading;
  const error = catsError || expError;
  const refetch = () => { catsRefetch(); expRefetch(); };

  if (!categories || !expenses) return <ScreenBoundary loading={loading} error={error} onRetry={refetch}><div/></ScreenBoundary>;

  const totalBudget = categories.reduce((a,c)=>a+c.budget,0);
  const totalSpent = categories.reduce((a,c)=>a+c.spent,0);

  const handleAddExpense = async () => {
    if (!newExp.desc || !newExp.amount || !newExp.cat) return;
    setSaving(true);
    try {
      await mutate('addExpense', {
        projectId: projectId || 'dummy',
        description: newExp.desc,
        amount: Number(newExp.amount),
        category: newExp.cat,
        date: newExp.date,
        status: 'שולם',
      });
      setAddOpen(false);
      setNewExp({ desc: '', amount: '', cat: '', date: new Date().toISOString().split('T')[0] });
      expRefetch();
    } catch (err) {
      alert("שגיאה בהוספת הוצאה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBoundary 
      loading={loading} 
      error={error} 
      isEmpty={categories.length === 0} 
      emptyTitle="אין הגדרות תקציב" 
      emptyDesc="נראה שעדיין לא הוגדרו קטגוריות תקציב לפרויקט זה."
      onRetry={refetch}
    >
      <div className="page-content">
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
            { label:"מחויב (חוזים)",value:fmtMoney(PROJECT.committed), accent:"var(--warning)", icon:"clipboard" },
            { label:"יתרה פנויה",   value:fmtMoney(totalBudget-totalSpent-PROJECT.committed), accent:"var(--success)", icon:"check-circle" },
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
            <div style={{width:`${totalBudget ? (PROJECT.committed/totalBudget*100) : 0}%`,background:"#FDE68A"}}/>
          </div>
          <div style={{display:"flex",gap:24,fontSize:12.5}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"var(--accent)",display:"inline-block"}}/> הוצא: <strong>{fmtMoney(totalSpent)}</strong> ({totalBudget ? Math.round(totalSpent/totalBudget*100) : 0}%)</span>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"#F59E0B",display:"inline-block"}}/> מחויב: <strong>{fmtMoney(PROJECT.committed)}</strong> ({totalBudget ? Math.round(PROJECT.committed/totalBudget*100) : 0}%)</span>
            <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,borderRadius:3,background:"#D1D5DB",display:"inline-block"}}/> נותר: <strong>{fmtMoney(totalBudget-totalSpent-PROJECT.committed)}</strong> ({totalBudget ? Math.round((totalBudget-totalSpent-PROJECT.committed)/totalBudget*100) : 0}%)</span>
          </div>
        </div>

        {/* Categories */}
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

        {/* Expenses */}
        <div className="card">
          <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>הוצאות אחרונות</span>
            <Btn size="sm" onClick={()=>setAddOpen(true)}><Icon n="plus" s={12}/> הוצאה חדשה</Btn>
          </div>
          <div style={{overflowX:"auto"}}>
            {expenses.length === 0 ? (
              <div style={{padding:40,textAlign:"center",color:"var(--text3)",fontSize:13}}>לא נמצאו הוצאות.</div>
            ) : (
              <table className="bp-table" style={{width:"100%"}}>
                <thead><tr><th>תאריך</th><th>תיאור</th><th>קטגוריה</th><th>סכום</th><th>סטטוס</th></tr></thead>
                <tbody>
                  {expenses.map((e,i)=>(
                    <tr key={i}>
                      <td style={{fontSize:13,color:"var(--text3)"}}>{e.date}</td>
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
                    {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
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
      </div>
    </ScreenBoundary>
  );
};
