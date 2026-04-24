import React from 'react';
import { motion } from 'framer-motion';
import { Icon, StatCard, ProgressBar, Btn, Badge } from '../components/Shared';
import { PROJECT, fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { ScreenBoundary } from '../components/ScreenBoundary';

export const BudgetScreen = () => {
  const { data: categories, loading, error, refetch } = useDataSource<any[]>('budget_cats');
  
  const [expenses] = React.useState([
    {date:"15/09/25",desc:"תשלום לקבלן שלד — מקדמה",cat:"שלד ויסודות",amount:135000,status:"שולם"},
    {date:"01/10/25",desc:"תשלום לחשמלאי — ביניים",cat:"חשמל",amount:45000,status:"שולם"},
    {date:"10/10/25",desc:"חומרי טיח — פרץ טיח",cat:"טיח",amount:28000,status:"שולם"},
    {date:"20/10/25",desc:"תשלום לאינסטלטור",cat:"אינסטלציה",amount:40000,status:"שולם"},
    {date:"25/10/25",desc:"תשלום לקבלן טיח — ביניים",cat:"טיח",amount:44000,status:"שולם"},
    {date:"01/11/25",desc:"תשלום לחשמלאי — סיום גולמי",cat:"חשמל",amount:20000,status:"ממתין"},
  ]);

  if (!categories) return null;

  const totalBudget = categories.reduce((a,c)=>a+c.budget,0);
  const totalSpent = categories.reduce((a,c)=>a+c.spent,0);

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
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
            <Btn size="sm"><Icon n="plus" s={12}/> הוצאה חדשה</Btn>
          </div>
          <div style={{overflowX:"auto"}}>
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
          </div>
        </div>
      </div>
    </ScreenBoundary>
  );
};
