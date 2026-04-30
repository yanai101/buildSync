import React from 'react';
import { motion } from 'framer-motion';
import { Icon, ProgressBar, Badge, Avatar, Btn } from '../components/Shared';
import { ROLE_COLORS, fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { useDashboardOverview } from '../hooks/useDashboardOverview';
import { BudgetSummaryCards } from '../components/BudgetSummaryCards';
import { useRequireRole } from '../hooks/useRequireRole';

import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const DashboardScreen = () => {
  const { role } = useRequireRole(['owner', 'manager', 'inspector', 'contractor']);
  const [showAllStages, setShowAllStages] = React.useState(false);
  const { overview } = useDashboardOverview();
  const { data: dashboard, loading, error, refetch } = useDataSource<any>('dashboard', { db: overview });
  const seedAlert = useMutation(api.dashboard.seedAlert);

  if (!dashboard) {
    return <ScreenBoundary loading={loading} error={error} onRetry={refetch}><div/></ScreenBoundary>;
  }

  const { project, stats, stages, recentActivity, topOverruns, alerts } = dashboard;
  const stageRows = stages ?? [];
  const rc = ROLE_COLORS;
  const fmtDate = (dateStr: string) => {
    if (!dateStr) return 'טרם הוגדר';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:42,height:42,borderRadius:12,background:"var(--accent-light)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Icon n="home" s={22}/>
            </div>
            <div>
              <h1 style={{fontSize:22,fontWeight:800,margin:0}}>{project.name}</h1>
              <div style={{fontSize:13,color:"var(--text3)",marginTop:2}}>{project.address}</div>
            </div>
          </div>
          {import.meta.env.DEV && role !== 'contractor' && (
            <button onClick={() => seedAlert({ projectId: project._id })} style={{background: 'var(--accent)', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>
              + הוסף התראת טסט
            </button>
          )}
        </div>

        {alerts && alerts.length > 0 && (
          <div style={{
            background: 'var(--warning-light)',
            border: '1px solid var(--warning-border, rgba(245, 158, 11, 0.3))',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, color: 'var(--warning-dark, #B45309)' }}>
              <Icon n="alert" s={20} />
              <span>{alerts[0].text}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--text2)' }}>
              <span>{alerts[0].dateLabel}</span>
              <button style={{ background: 'none', border: 'none', color: 'var(--warning-dark, #B45309)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                ראה הכל ({alerts.length})
              </button>
            </div>
          </div>
        )}

        {role !== 'contractor' && <BudgetSummaryCards summary={stats} style={{marginBottom:24}} />}

        <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
          {/* Left col */}
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            {/* Progress */}
            <div className="card">
              <div className="card-header">התקדמות פרויקט</div>
              <div className="card-body" style={{paddingTop:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:600}}>סה"כ</span>
                  <span style={{fontSize:18,fontWeight:800,color:"var(--accent)"}}>{project.progressPct}%</span>
                </div>
                <ProgressBar value={project.progressPct} height={10}/>
                <div style={{marginTop:20,display:"flex",flexDirection:"column",gap:8}}>
                  {(showAllStages ? stageRows : stageRows.slice(0,4)).map((s: any)=>(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:120,fontSize:12,color:s.status==="active"?"var(--text1)":"var(--text2)",fontWeight:s.status==="active"?600:400,textAlign:"right",flexShrink:0}}>{s.name}</div>
                      <div style={{flex:1}}><ProgressBar value={s.progressPct} color={s.status==="done"?"var(--success)":s.status==="active"?"var(--accent)":"var(--border)"} height={5}/></div>
                      <Badge type={s.status}/>
                    </div>
                  ))}
                  {stageRows.length > 0 ? (
                    <button onClick={()=>setShowAllStages(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"var(--accent)",fontFamily:"'Heebo',sans-serif",fontWeight:600,padding:"4px 0",textAlign:"center",width:"100%"}}>
                      {showAllStages ? "הסתר שלבים ▲" : `הצג את כל השלבים ▼`}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Budget overview */}
            {role !== 'contractor' && (
              <div className="card">
              <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>תקציב ותשלומים</span>
                <span style={{fontSize:12,color:"var(--text3)",fontWeight:400}}>יתרה: {fmtMoney(stats.remainingBudget)}</span>
              </div>
              <div className="card-body" style={{paddingTop:12}}>
                <div style={{display:"flex",gap:24,marginBottom:16}}>
                  {[{label:"תקציב",v:stats.totalBudget,c:"var(--text1)"},{label:"הוצא",v:stats.totalSpent,c:"var(--accent)"},{label:"מחויב",v:stats.committed,c:"var(--warning)"}].map(x=>(
                    <div key={x.label}>
                      <div style={{fontSize:20,fontWeight:800,color:x.c}}>{fmtMoney(x.v)}</div>
                      <div style={{fontSize:12,color:"var(--text2)"}}>{x.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{height:12,background:"var(--border)",borderRadius:6,overflow:"hidden",display:"flex"}}>
                  <div style={{width:`${stats.totalBudget ? (stats.totalSpent/stats.totalBudget*100) : 0}%`,background:"var(--accent)",transition:"width .4s"}}/>
                  <div style={{width:`${stats.totalBudget ? (stats.committed/stats.totalBudget*100) : 0}%`,background:"#FDE68A"}}/>
                </div>
                <div style={{display:"flex",gap:16,marginTop:8,fontSize:11,color:"var(--text3)"}}>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:"var(--accent)",display:"inline-block"}}/> הוצא {stats.totalBudget ? (stats.totalSpent/stats.totalBudget*100).toFixed(1) : '0.0'}%</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:"#FDE68A",display:"inline-block"}}/> מחויב {stats.totalBudget ? (stats.committed/stats.totalBudget*100).toFixed(1) : '0.0'}%</span>
                </div>
              </div>
            </div>
            )}

            {role !== 'contractor' && (
            <div className="card">
              <div className="card-header">חריגות מובילות</div>
              <div className="card-body" style={{paddingTop:12}}>
                {topOverruns.length > 0 ? topOverruns.map((item: any)=>(
                  <div key={item.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                    <span>{item.name}</span>
                    <span style={{fontWeight:700,color:"var(--danger)"}}>{fmtMoney(item.overrun)}</span>
                  </div>
                )) : (
                  <div style={{fontSize:13,color:"var(--text3)"}}>אין חריגות תקציב כרגע.</div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Right col */}
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            {/* Project info */}
            <div className="card">
              <div className="card-header">פרטי פרויקט</div>
              <div className="card-body" style={{paddingTop:12}}>
                {[
                  ["שם הפרויקט", project.name],
                  ["כתובת", project.address],
                  ["בעל הבית", project.ownerName],
                  ["מנהל פרויקט", project.managerName],
                  ["מפקח", project.inspectorName],
                  ["תחילת עבודה", fmtDate(project.startDate)],
                  ["סיום צפוי", fmtDate(project.expectedEnd)]
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                    <span style={{color:"var(--text2)"}}>{k}</span>
                    <span style={{fontWeight:500}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div className="card">
              <div className="card-header">פעילות אחרונה</div>
              <motion.div
                style={{padding:"0 0 4px"}}
                variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                initial="hidden"
                animate="show"
              >
                {recentActivity.map((a: any,i: number)=>(
                  <motion.div
                    key={a.id}
                    variants={{ hidden:{opacity:0,x:16}, show:{opacity:1,x:0,transition:{type:"spring",stiffness:280,damping:24}} }}
                    style={{display:"flex",gap:12,padding:"12px 20px",borderBottom:i<recentActivity.length-1?"1px solid var(--border)":"none",cursor:"pointer"}}
                    whileHover={{background:"#FAFAF9"}}
                  >
                    <Avatar letter={a.actorName[0]} color={rc[a.role as keyof typeof rc]} size={32}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text1)"}}>{a.actorName}</div>
                      <div style={{fontSize:13,color:"var(--text2)",marginTop:3,lineHeight:1.4}}>{a.text}</div>
                      <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>{new Date(a.createdAt).toLocaleString('he-IL')}</div>
                    </div>
                  </motion.div>
                ))}
                {recentActivity.length === 0 ? (
                  <div style={{padding:"16px 20px",fontSize:13,color:"var(--text3)"}}>אין פעילות אחרונה להצגה.</div>
                ) : null}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </ScreenBoundary>
  );
};
