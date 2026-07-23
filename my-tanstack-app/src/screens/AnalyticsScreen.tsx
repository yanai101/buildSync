import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useProjectBudgetSummary } from '../hooks/useProjectBudgetSummary';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { BudgetSummaryCards } from '../components/BudgetSummaryCards';
import { AccessDenied, AccessLoading } from '../components/AccessDenied';
import { useRequireRole } from '../hooks/useRequireRole';
import { useSubscription } from '../hooks/useSubscription';
import { Modal, Icon, PremiumLock } from '../components/Shared';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';

const COLORS = ['#E07A38', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#6366F1', '#14B8A6'];

export const AnalyticsScreen = () => {
  const { allowed, loading: roleLoading } = useRequireRole(['owner', 'manager', 'inspector', 'contractor']);
  const { projectId } = useCurrentProject();
  const { isProOrPremium } = useSubscription();
  const [expandedChart, setExpandedChart] = React.useState<string | null>(null);
  
  const accessInfo = useQuery(api.projects.getProjectAccessInfo, projectId ? { projectId } : "skip");
  const canViewBudget = accessInfo?.canViewBudget ?? false;

  const { summary, isPending: summaryPending } = useProjectBudgetSummary();
  const categories = useQuery(api.budget.listCategories, projectId && canViewBudget ? { projectId } : "skip");
  const expenses = useQuery(api.budget.listExpenses, projectId && canViewBudget ? { projectId } : "skip");
  const stages = useQuery(api.stages.list, projectId ? { projectId } : "skip");

  const loading = roleLoading || accessInfo === undefined || stages === undefined || (canViewBudget && (summaryPending || categories === undefined || expenses === undefined));

  // Process data for charts
  const categoryData = useMemo(() => {
    if (!categories) return [];
    return categories
      .filter(c => c.spent > 0)
      .map(c => ({ name: c.name, value: c.spent, color: c.color || COLORS[0] }))
      .sort((a, b) => b.value - a.value);
  }, [categories]);

  const expensesOverTime = useMemo(() => {
    if (!expenses) return [];
    const grouped = expenses.reduce((acc, exp) => {
      const month = new Date(exp.date).toLocaleString('he-IL', { month: 'short', year: '2-digit' });
      acc[month] = (acc[month] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => {
        // Simple sort logic assuming MM/YY strings (might need proper date parsing for real app)
        return a.name.localeCompare(b.name);
      });
  }, [expenses]);

  const taskStats = useMemo(() => {
    if (!stages) return [];
    let done = 0, active = 0, problem = 0, internal = 0;
    stages.forEach(s => {
      s.tasks?.forEach((t: any) => {
        if (t.status === 'done') done++;
        else if (t.status === 'problem') problem++;
        else if (t.status === 'internal') internal++;
        else active++;
      });
    });
    return [
      { name: 'הושלם', value: done, fill: '#10B981' },
      { name: 'פעיל/ממתין', value: active, fill: '#E07A38' },
      { name: 'בעיה', value: problem, fill: '#EF4444' },
      { name: 'פנימי', value: internal, fill: '#6B7280' },
    ].filter(s => s.value > 0);
  }, [stages]);

  const stageProgressData = useMemo(() => {
    if (!stages) return [];
    return stages.map(s => ({
      name: s.name.length > 18 ? s.name.substring(0, 18) + '...' : s.name,
      fullName: s.name,
      'התקדמות (%)': s.progress || 0
    }));
  }, [stages]);

  if (roleLoading) return <AccessLoading />;
  if (!allowed) return <AccessDenied message="צפייה בדוחות וסטטיסטיקות מורשית למנהלי הפרויקט בלבד." />;
  if (loading) return <ScreenBoundary loading={true} onRetry={() => {}}><div/></ScreenBoundary>;

  return (
    <PremiumLock
      isLocked={!isProOrPremium}
      title="דוחות וסטטיסטיקות מתקדמות"
      description="ניתוח נתונים, גרפים, והתפלגות הוצאות ומשימות. שדרג ל-Pro כדי לקבל גישה."
    >
      <ScreenBoundary>
        <div className="page-header">
        <h1 className="page-title">דוחות וסטטיסטיקות</h1>
      </div>
      
      <div className="page-content">
        <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:28}}>
          <div style={{
            width:48, height:48, borderRadius:14,
            background:'linear-gradient(135deg, var(--accent-light) 0%, var(--accent-glow-sm) 100%)',
            color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center',
            border:'1.5px solid var(--accent-glow-sm)', boxShadow:'0 4px 16px var(--accent-glow-sm)', flexShrink:0
          }}>
            <Icon n="chart" s={22}/>
          </div>
          <div>
            <h1 style={{fontSize:22, fontWeight:800, margin:0, letterSpacing:'-0.4px'}}>דוחות וסטטיסטיקות</h1>
            <div style={{fontSize:12.5, color:'var(--text3)', marginTop:3}}>אנליזת נתוני תקציב, התקדמות וסטטוס פרויקט</div>
          </div>
        </div>
        {canViewBudget && summary && <BudgetSummaryCards summary={summary} style={{ marginBottom: 28 }} />}

        <div className="grid-2">
          {/* Budget Distribution */}
          {canViewBudget && (
            <div className="card" style={{ minHeight: 380, overflow:'hidden' }}>
              <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Icon n="chart" s={15} c="var(--accent)"/>
                  התפלגות הוצאות לפי קטגוריה
                </span>
                <button onClick={() => setExpandedChart('budgetDistribution')} className="icon-btn" title="הגדל">
                  <Icon n="maximize-2" s={14}/>
                </button>
              </div>
              <div style={{ padding:'16px 8px 16px' }}>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₪${Number(value).toLocaleString()}`} contentStyle={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, fontSize:13 }}/>
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize:13 }}>אין מספיק נתונים להצגה</div>
              )}
              </div>
            </div>
          )}

          {/* Expenses over time */}
          {canViewBudget && (
            <div className="card" style={{ minHeight: 380, overflow:'hidden' }}>
              <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Icon n="chart" s={15} c="var(--accent)"/>
                  מגמת הוצאות (חודשי)
                </span>
                <button onClick={() => setExpandedChart('expensesOverTime')} className="icon-btn" title="הגדל">
                  <Icon n="maximize-2" s={14}/>
                </button>
              </div>
              <div style={{ padding:'16px 8px 16px' }}>
              {expensesOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={expensesOverTime}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text2)' }} />
                    <YAxis orientation="right" tickFormatter={(val) => `₪${(val/1000)}k`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text2)' }} width={60} />
                    <Tooltip formatter={(value: any) => `₪${Number(value).toLocaleString()}`} contentStyle={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, fontSize:13 }}/>
                    <Area type="monotone" dataKey="total" name="סה״כ הוצאות" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize:13 }}>אין מספיק נתונים להצגה</div>
              )}
              </div>
            </div>
          )}

          {/* Task Status */}
          <div className="card" style={{ padding: 24, minHeight: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>סטטוס משימות כולל</h2>
              <button onClick={() => setExpandedChart('taskStatus')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <Icon n="maximize-2" s={16} />
              </button>
            </div>
            {taskStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {taskStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
                אין מספיק נתונים להצגה
              </div>
            )}
          </div>

          {/* Stages Progress */}
          <div className="card" style={{ padding: 24, minHeight: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>התקדמות שלבי עבודה</h2>
              <button onClick={() => setExpandedChart('stageProgress')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <Icon n="maximize-2" s={16} />
              </button>
            </div>
            {stageProgressData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: 300 }}>
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 }}>
                  <ResponsiveContainer width="100%" height={Math.max(260, stageProgressData.length * 35)}>
                    <BarChart data={stageProgressData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis orientation="left" dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text1)' }} width={120} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="התקדמות (%)" fill="var(--success)" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ height: 30, paddingRight: 4 }}>
                  <div style={{ position: 'relative', margin: '4px 20px 0 140px', height: 20, fontSize: 12, color: 'var(--text2)', direction: 'ltr', pointerEvents: 'none' }}>
                    <span style={{ position: 'absolute', left: '0%', transform: 'translateX(-50%)' }}>0%</span>
                    <span style={{ position: 'absolute', left: '25%', transform: 'translateX(-50%)' }}>25%</span>
                    <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>50%</span>
                    <span style={{ position: 'absolute', left: '75%', transform: 'translateX(-50%)' }}>75%</span>
                    <span style={{ position: 'absolute', left: '100%', transform: 'translateX(-50%)' }}>100%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
                אין מספיק נתונים להצגה
              </div>
            )}
          </div>

        </div>
      </div>

      {/* EXPANDED CHART MODAL */}
      {expandedChart && (
        <Modal 
          title={
            expandedChart === 'budgetDistribution' ? 'התפלגות הוצאות לפי קטגוריה' :
            expandedChart === 'expensesOverTime' ? 'מגמת הוצאות (חודשי)' :
            expandedChart === 'taskStatus' ? 'סטטוס משימות כולל' :
            'התקדמות שלבי עבודה'
          } 
          onClose={() => setExpandedChart(null)}
          maxWidth={800}
        >
          <div style={{ width: '100%', height: '60vh', minHeight: 400 }}>
            {expandedChart === 'budgetDistribution' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={160}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₪${Number(value).toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {expandedChart === 'expensesOverTime' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={expensesOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorTotalLarge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 14, fill: 'var(--text2)' }} />
                  <YAxis orientation="right" tickFormatter={(val) => `₪${(val/1000)}k`} axisLine={false} tickLine={false} tick={{ fontSize: 14, fill: 'var(--text2)' }} width={80} />
                  <Tooltip formatter={(value: any) => `₪${Number(value).toLocaleString()}`} />
                  <Area type="monotone" dataKey="total" name="סה״כ הוצאות" stroke="var(--accent)" strokeWidth={4} fillOpacity={1} fill="url(#colorTotalLarge)" />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {expandedChart === 'taskStatus' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={160}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {taskStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {expandedChart === 'stageProgress' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: 8 }}>
                  <ResponsiveContainer width="100%" height={Math.max(400, stageProgressData.length * 40)}>
                    <BarChart data={stageProgressData} layout="vertical" margin={{ left: 20, right: 20, top: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis orientation="left" dataKey="fullName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--text1)' }} width={160} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="התקדמות (%)" fill="var(--success)" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ height: 40, paddingRight: 8 }}>
                  <div style={{ position: 'relative', margin: '4px 20px 0 180px', height: 20, fontSize: 14, color: 'var(--text2)', direction: 'ltr', pointerEvents: 'none' }}>
                    <span style={{ position: 'absolute', left: '0%', transform: 'translateX(-50%)' }}>0%</span>
                    <span style={{ position: 'absolute', left: '25%', transform: 'translateX(-50%)' }}>25%</span>
                    <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>50%</span>
                    <span style={{ position: 'absolute', left: '75%', transform: 'translateX(-50%)' }}>75%</span>
                    <span style={{ position: 'absolute', left: '100%', transform: 'translateX(-50%)' }}>100%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </ScreenBoundary>
    </PremiumLock>
  );
};
