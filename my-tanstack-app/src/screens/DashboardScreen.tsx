import React from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Icon, ProgressBar, Badge, Avatar, Btn, Modal } from '../components/Shared';
import { ROLE_COLORS, fmtMoney } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { useDashboardOverview } from '../hooks/useDashboardOverview';
import { BudgetSummaryCards } from '../components/BudgetSummaryCards';
import { useRequireRole } from '../hooks/useRequireRole';

import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const DashboardScreen = () => {
  const { role } = useRequireRole(['owner', 'manager', 'inspector', 'contractor']);
  const [showAllStages, setShowAllStages] = React.useState(false);
  const [showAllAlerts, setShowAllAlerts] = React.useState(false);
  const { overview } = useDashboardOverview();
  const { data: dashboard, loading, error, refetch } = useDataSource<any>('dashboard', { db: overview });
  const seedAlert = useMutation(api.dashboard.seedAlert);
  const deleteAlert = useMutation(api.dashboard.deleteAlert);
  const deleteAllAlerts = useMutation(api.dashboard.deleteAllAlerts);

  const projectId = dashboard?.project?._id;
  const accessInfo = useQuery(api.projects.getProjectAccessInfo, projectId ? { projectId } : "skip");
  const canViewBudget = accessInfo?.canViewBudget ?? false;

  const contractorDashboard = useQuery(
    api.dashboard.getContractorDashboard,
    role === 'contractor' && projectId ? { projectId } : 'skip'
  );
  
  const [viewFile, setViewFile] = React.useState<{ url: string; name: string } | null>(null);

  if (!dashboard || accessInfo === undefined) {
    return <ScreenBoundary loading={loading || accessInfo === undefined} error={error} onRetry={refetch}><div/></ScreenBoundary>;
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

  if (role === 'contractor') {
    if (contractorDashboard === undefined) {
      return (
        <ScreenBoundary loading={true} onRetry={refetch}>
          <div />
        </ScreenBoundary>
      );
    }

    if (!contractorDashboard) {
      return (
        <ScreenBoundary error={new Error("לא נמצאה רשומת קבלן עבור המשתמש הנוכחי בפרויקט זה.")} onRetry={refetch}>
          <div />
        </ScreenBoundary>
      );
    }

    const { contractor, milestones, stages: contractorStages } = contractorDashboard;
    const paidPct = contractor.budget ? Math.min(100, Math.max(0, (contractor.paid / contractor.budget) * 100)) : 0;
    const remaining = Math.max(0, contractor.budget - contractor.paid);

    return (
      <ScreenBoundary loading={false} onRetry={refetch}>
        <div className="page-content">
          {/* Greetings Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon n="users" s={22} />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>שלום, {contractor.name} 👋</h1>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
                  {contractor.role} · פורטל קבלן מורשה ב-<strong>{project.name}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon n="clipboard" s={24} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>סך הכל הסכם פרויקט</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', marginTop: 4 }}>{fmtMoney(contractor.budget)}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon n="check-circle" s={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>שולם בפועל</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{fmtMoney(contractor.paid)}</div>
                  <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>({paidPct.toFixed(1)}%)</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FFFBEB', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon n="chart" s={24} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>יתרת זכות לתשלום</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>{fmtMoney(remaining)}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Payment Milestones */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>לוח תשלומים ואבני דרך אישי</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400 }}>שולם: {paidPct.toFixed(0)}% · {fmtMoney(contractor.paid)}</span>
                </div>
                
                <div style={{ padding: '16px 18px 0' }}>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    {milestones.map((m) => (
                      <div key={m.id} style={{ width: `${m.pct}%`, background: m.paid ? 'var(--success)' : 'transparent', borderLeft: '1px solid var(--bg)' }} title={`${m.name}: ${m.pct}%`} />
                    ))}
                  </div>
                </div>

                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                  <table className="bp-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>אבן דרך לתשלום</th>
                        <th>תנאי לשחרור</th>
                        <th>%</th>
                        <th>סכום</th>
                        <th>סטטוס</th>
                        <th>מסמכים</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((m, idx) => (
                        <tr key={m.id} style={{ background: m.paid ? '#F0FDF4' : 'transparent' }}>
                          <td style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</td>
                          <td style={{ fontSize: 12, color: 'var(--text2)' }}>{m.triggerText || '—'}</td>
                          <td style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{m.pct.toFixed(1)}%</td>
                          <td style={{ fontSize: 13, fontWeight: 700, color: m.paid ? 'var(--success)' : 'var(--text1)' }}>{fmtMoney(m.amount)}</td>
                          <td>
                            <span className={`badge ${m.paid ? 'badge-done' : 'badge-pending'}`}>{m.paid ? 'שולם' : 'ממתין'}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {m.files && m.files.length > 0 ? (
                                m.files.map((file: any) => (
                                  <button
                                    key={file.id}
                                    onClick={() => setViewFile({ url: file.url, name: file.name })}
                                    title={`צפה ב-${file.name}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 24,
                                      height: 24,
                                      background: '#EEF2FF',
                                      color: '#4F46E5',
                                      borderRadius: 4,
                                      border: 'none',
                                      cursor: 'pointer',
                                      transition: 'all 0.1s'
                                    }}
                                  >
                                    <Icon n="file-text" s={12} />
                                  </button>
                                ))
                              ) : (
                                <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {milestones.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>
                            טרם הוגדר לוח תשלומים עבורך בפרויקט זה.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stages in Responsibility */}
              <div className="card">
                <div className="card-header">שלבי בנייה באחריותך המקצועית ({contractorStages.length})</div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
                  {contractorStages.map((s) => (
                    <div key={s.id} style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--surface)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon n="layers" s={16} />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</span>
                        </div>
                        <Badge type={s.status} />
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                        <span>התקדמות השלב:</span>
                        <span style={{ fontWeight: 700 }}>{s.progressPct}%</span>
                      </div>
                      <ProgressBar value={s.progressPct} color={s.status === 'done' ? 'var(--success)' : s.status === 'active' ? 'var(--accent)' : 'var(--border)'} height={6} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <span>תאריך התחלה: <strong>{fmtDate(s.startDate)}</strong></span>
                        <span>סיום צפוי: <strong>{fmtDate(s.endDate)}</strong></span>
                      </div>
                    </div>
                  ))}
                  {contractorStages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 8 }}>
                      לא נמצאו שלבי בנייה המשויכים אליך כרגע.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* File preview Modal */}
          {viewFile && (
            <Modal title={viewFile.name} onClose={() => setViewFile(null)}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                {viewFile.url.endsWith('.pdf') || viewFile.name.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={viewFile.url} style={{ width: '100%', height: '500px', border: 'none' }} title="PDF Preview" />
                ) : (
                  <img src={viewFile.url} alt={viewFile.name} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, objectFit: 'contain' }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <Btn onClick={() => setViewFile(null)}>סגור</Btn>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </ScreenBoundary>
    );
  }

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
          {import.meta.env.DEV && (
            <div style={{display: 'flex', gap: 8}}>
              <button onClick={() => seedAlert({ projectId: project._id })} style={{background: 'var(--accent)', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>
                + הוסף התראת טסט
              </button>
              <button onClick={() => deleteAllAlerts({ projectId: project._id })} style={{background: 'var(--danger)', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>
                מחק הכל
              </button>
            </div>
          )}
        </div>

        {alerts && alerts.length > 0 && (() => {
          const getAlertStyle = (type: string) => {
            switch(type) {
              case 'danger': return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#EF4444' };
              case 'info': return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', text: '#3B82F6' };
              case 'warning':
              default: return { bg: 'var(--warning-light)', border: 'var(--warning-border, rgba(245, 158, 11, 0.3))', text: 'var(--warning-dark, #B45309)' };
            }
          };
          const mainStyle = getAlertStyle(alerts[0].type);

          return (
          <div style={{
            background: mainStyle.bg,
            border: `1px solid ${mainStyle.border}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {!showAllAlerts ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, color: mainStyle.text }}>
                  <Icon n="alert" s={20} />
                  <span>{alerts[0].text}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--text2)' }}>
                  {alerts[0].isDynamic && alerts[0].link && (
                    <Link to={alerts[0].link} style={{ color: mainStyle.text, fontWeight: 600, textDecoration: 'none', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                      {alerts[0].actionText || 'לטפל'}
                    </Link>
                  )}
                  {!alerts[0].isDynamic && <span>{alerts[0].dateLabel}</span>}
                  {!alerts[0].isDynamic && (
                    <button onClick={() => deleteAlert({ alertId: alerts[0].id })} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }} title="מחק התראה">
                      <Icon n="x" s={16} />
                    </button>
                  )}
                  {alerts.length > 1 && (
                    <button onClick={() => setShowAllAlerts(true)} style={{ background: 'none', border: 'none', color: mainStyle.text, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                      ראה הכל ({alerts.length})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, color: mainStyle.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon n="alert" s={20} />
                    <span>כל ההתראות ({alerts.length})</span>
                  </div>
                  <button onClick={() => setShowAllAlerts(false)} style={{ background: 'none', border: 'none', color: mainStyle.text, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
                    הסתר
                  </button>
                </div>
                {alerts.map((alert: any, idx: number) => {
                  const ast = getAlertStyle(alert.type);
                  return (
                  <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: idx > 0 ? `1px solid ${mainStyle.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 500, color: ast.text }}>
                      <span style={{width: 8, height: 8, borderRadius: '50%', background: ast.text}}></span>
                      <span>{alert.text}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--text2)' }}>
                      {alert.isDynamic && alert.link && (
                        <Link to={alert.link} style={{ color: ast.text, fontWeight: 600, textDecoration: 'none', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                          {alert.actionText || 'לטפל'}
                        </Link>
                      )}
                      {!alert.isDynamic && <span>{alert.dateLabel}</span>}
                      {!alert.isDynamic && (
                        <button onClick={() => deleteAlert({ alertId: alert.id })} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }} title="מחק התראה">
                          <Icon n="x" s={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )})}
              </>
            )}
          </div>
        )})()}

        {canViewBudget && <BudgetSummaryCards summary={stats} style={{marginBottom:24}} />}

        <div style={{display: "flex", flexWrap: "wrap", gap: 20}}>
          {/* Left col */}
          <div style={{flex: "1 1 500px", display:"flex",flexDirection:"column",gap:20}}>
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
            {canViewBudget && (
              <div className="card">
              <div className="card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <span>תקציב ותשלומים</span>
                <span style={{fontSize:12,color:"var(--text3)",fontWeight:400}}>יתרה: {fmtMoney(stats.remainingBudget)}</span>
              </div>
              <div className="card-body" style={{paddingTop:12}}>
                <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
                  {[{label:"תקציב",v:stats.totalBudget,c:"var(--text1)"},{label:"הוצא",v:stats.totalSpent,c:"var(--accent)"},{label:"מחויב",v:stats.committed,c:"var(--warning)"}].map(x=>(
                    <div key={x.label} style={{flex:"1 1 100px"}}>
                      <div style={{fontSize:20,fontWeight:800,color:x.c}}>{fmtMoney(x.v)}</div>
                      <div style={{fontSize:12,color:"var(--text2)"}}>{x.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{height:12,background:"var(--border)",borderRadius:6,overflow:"hidden",display:"flex"}}>
                  <div style={{width:`${stats.totalBudget ? (stats.totalSpent/stats.totalBudget*100) : 0}%`,background:"var(--accent)",transition:"width .4s"}}/>
                  <div style={{width:`${stats.totalBudget ? (stats.committed/stats.totalBudget*100) : 0}%`,background:"#FDE68A"}}/>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:16,marginTop:8,fontSize:11,color:"var(--text3)"}}>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:"var(--accent)",display:"inline-block"}}/> הוצא {stats.totalBudget ? (stats.totalSpent/stats.totalBudget*100).toFixed(1) : '0.0'}%</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:"#FDE68A",display:"inline-block"}}/> מחויב {stats.totalBudget ? (stats.committed/stats.totalBudget*100).toFixed(1) : '0.0'}%</span>
                </div>
              </div>
            </div>
            )}

            {canViewBudget && (
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
          <div style={{flex: "1 1 340px", display:"flex",flexDirection:"column",gap:20}}>
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
