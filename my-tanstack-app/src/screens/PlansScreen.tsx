import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Icon, Btn, Modal, ProgressBar } from '../components/Shared';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useAppNotify } from '../hooks/useAppNotify';
import { openUpgradeModal } from '../components/UpgradeModalHost';
import { useRequireRole } from '../hooks/useRequireRole';
import { UploadPlanModal } from '../components/UploadPlanModal';
import { EditPlanModal } from '../components/EditPlanModal';
import { PlanViewer } from '../components/PlanViewer';
import type { Id } from '../../convex/_generated/dataModel';

const CATEGORY_LABELS: Record<string, string> = {
  architectural: 'אדריכלות',
  structural: 'קונסטרוקציה',
  electrical: 'חשמל',
  plumbing: 'אינסטלציה',
  mechanical: 'מיזוג אוויר',
  landscape: 'פיתוח נוף',
  general: 'כללי',
  other: 'אחר',
};

const CATEGORY_ICONS: Record<string, string> = {
  architectural: 'home',
  structural: 'layers',
  electrical: 'zap',
  plumbing: 'droplet',
  mechanical: 'cloud-sun',
  landscape: 'flower',
  general: 'file-text',
  other: 'file-text',
};

function Accordion({ title, count, children }: { title: string, count: number, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '1rem', 
          backgroundColor: 'var(--surface-2)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'right'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{title}</span>
          <span style={{ backgroundColor: 'var(--border)', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.85rem' }}>
            {count}
          </span>
        </div>
        <Icon n={isOpen ? "ChevronUp" : "ChevronDown"} s={20} c="var(--text3)" />
      </button>
      {isOpen && (
        <div style={{ padding: '1rem', backgroundColor: 'var(--surface)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function PlansScreen() {
  const { projectId, project, subscription } = useCurrentProject();
  const MAX_PLANS = subscription?.tier === 'free' ? 5 : 50;
  const MAX_TOTAL_SIZE_MB = subscription?.tier === 'free' ? 5 : 50;
  const plans = useQuery(api.projectPlans.listByProject, projectId ? { projectId } : 'skip');
  const stages = useQuery(api.stages.list, projectId ? { projectId } : 'skip') || [];
  const deletePlan = useMutation(api.projectPlans.deleteProjectPlan);
  const { notify } = useAppNotify();
  const role = project?.myRole;
  const canUpload = role === 'owner' || role === 'manager';

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<Id<'projectPlans'> | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<Id<'projectPlans'> | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Id<'projectPlans'> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!plans) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Icon n="loader" s={24} className="spin" c="var(--text3)" />
      </div>
    );
  }

  // Group plans by category
  const totalSizeMB = (plans.reduce((acc: number, p: any) => acc + (p.originalSize || 0), 0) / 1024 / 1024).toFixed(1);
  const groupedPlans = plans.reduce((acc: any, plan: any) => {
    const cat = plan.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(plan);
    return acc;
  }, {});

  const formatBytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + 'MB';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 0', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flexShrink: 0, width: 48, height: 48, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <Icon n="layers" s={24} c="var(--accent)" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text1)' }}>תוכניות פרויקט</h1>
              <p style={{ margin: 0, color: 'var(--text3)', fontSize: 14, marginTop: 2, marginBottom: 8 }}>ניהול תוכניות, סקיצות ומפרטים</p>
            </div>
          </div>
          
          {canUpload && (
            <Btn 
              variant="primary" 
              onClick={() => {
                if (plans.length >= MAX_PLANS) {
                  if (subscription?.tier === 'free') {
                    openUpgradeModal({ title: 'שדרוג למסלול Pro', reason: 'הגעת למכסת התוכניות (5) במסלול החינמי' });
                  } else {
                    notify({ kind: 'error', title: 'הגעת למכסת התוכניות המרבית' });
                  }
                } else {
                  setIsUploadModalOpen(true);
                }
              }}
              icon={<Icon n="plus" s={16} />}
            >
              העלאת תוכנית
            </Btn>
          )}
        </div>
        
        {/* Quota Widgets */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 24, width: '100%', maxWidth: 500 }}>
          <div style={{ flex: 1, minWidth: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
              <span>תוכניות {subscription?.tier === 'free' ? '(חינם)' : ''}</span>
              <span style={{ color: plans.length >= MAX_PLANS ? 'var(--danger)' : 'var(--text1)' }}>{plans.length} / {MAX_PLANS}</span>
            </div>
            <ProgressBar value={(plans.length / MAX_PLANS) * 100} height={8} color={plans.length >= MAX_PLANS ? 'var(--danger)' : undefined} />
          </div>
          
          <div style={{ flex: 1, minWidth: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
              <span>אחסון מנוצל</span>
              <span style={{ color: Number(totalSizeMB) >= MAX_TOTAL_SIZE_MB ? 'var(--danger)' : 'var(--text1)' }}>{totalSizeMB}MB / {MAX_TOTAL_SIZE_MB}MB</span>
            </div>
            <ProgressBar value={(Number(totalSizeMB) / MAX_TOTAL_SIZE_MB) * 100} height={8} color={Number(totalSizeMB) >= MAX_TOTAL_SIZE_MB ? 'var(--danger)' : '#F59E0B'} />
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%', flex: 1 }}>
        {Object.keys(groupedPlans).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <Icon n="file-search" s={48} c="var(--text4)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text1)', marginBottom: 8 }}>עדיין אין תוכניות</div>
            <div style={{ color: 'var(--text3)', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
              {canUpload 
                ? 'העלה תוכניות אדריכליות, קונסטרוקציה, חשמל ועוד כדי שיהיו זמינות לכל צוות הפרויקט והקבלנים.'
                : 'מנהל הפרויקט טרם העלה תוכניות למערכת.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(groupedPlans).map(([category, categoryPlans]: [string, any]) => (
              <Accordion 
                key={category} 
                title={CATEGORY_LABELS[category] || CATEGORY_LABELS['other']} 
                count={categoryPlans.length}
              >
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                  gap: 12,
                  padding: '16px 0'
                }}>
                  {categoryPlans.map((plan: any) => (
                    <div 
                      key={plan._id}
                      onClick={() => setSelectedPlanId(plan._id)}
                      className="card"
                      style={{
                        cursor: 'pointer',
                        padding: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'none';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
                      }}
                    >
                      <div style={{ display: 'flex', padding: 12, gap: 16, alignItems: 'center', background: 'var(--surface)' }}>
                        <div style={{ 
                          width: 60, 
                          height: 60, 
                          flexShrink: 0,
                          background: 'var(--surface-2)', 
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          overflow: 'hidden',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {(() => {
                            const isPdf = plan.storedMimeType === 'application/pdf';
                            if (!isPdf && plan.thumbnailUrl) {
                              return (
                                <img 
                                  src={plan.thumbnailUrl} 
                                  alt={plan.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                                />
                              );
                            }
                            
                            // For PDFs or missing thumbnails, show a beautiful category icon
                            return (
                              <div style={{ 
                                width: '100%', height: '100%', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'var(--surface-2)',
                                color: 'var(--accent)'
                              }}>
                                <Icon n={CATEGORY_ICONS[plan.category] || 'file-text'} s={28} />
                              </div>
                            );
                          })()}
                          <div style={{
                            position: 'absolute',
                            bottom: 0, left: 0, right: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(2px)',
                            color: '#fff',
                            padding: '2px 0',
                            fontSize: 10,
                            fontWeight: 700,
                            textAlign: 'center'
                          }}>
                            v{plan.version}
                          </div>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {plan.name}
                            </div>
                            {canUpload && (
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPlanId(plan._id);
                                  }}
                                  style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text3)', borderRadius: 4, display: 'flex'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  title="ערוך תוכנית"
                                >
                                  <Icon n="edit-2" s={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPlanToDelete(plan._id);
                                  }}
                                  style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--danger)', borderRadius: 4, display: 'flex', opacity: 0.8
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    e.currentTarget.style.opacity = '1';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.opacity = '0.8';
                                  }}
                                  title="מחק תוכנית"
                                >
                                  <Icon n="trash" s={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text3)', fontSize: 12 }}>
                            <span>{formatBytes(plan.originalSize)}</span>
                            {plan.stageIds.length > 0 && (
                              <span 
                                style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text2)' }}
                                title={plan.stageIds.map((id: string) => stages.find(s => s._id === id)?.name).filter(Boolean).join(', ')}
                              >
                                {plan.stageIds.length === 1 
                                  ? stages.find(s => s._id === plan.stageIds[0])?.name || 'שלב 1'
                                  : `${plan.stageIds.length} שלבים`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Accordion>
            ))}
          </div>
        )}
      </div>

      {isUploadModalOpen && (
        <UploadPlanModal onClose={() => setIsUploadModalOpen(false)} />
      )}
      
      {selectedPlanId && (
        <PlanViewer planId={selectedPlanId} onClose={() => setSelectedPlanId(null)} />
      )}
      
      {editingPlanId && (
        <EditPlanModal planId={editingPlanId} onClose={() => setEditingPlanId(null)} />
      )}

      {planToDelete && (
        <Modal title="מחיקת תוכנית" onClose={!isDeleting ? () => setPlanToDelete(null) : undefined} maxWidth={400}>
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Icon n="trash" s={28} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>
              האם אתה בטוח?
            </div>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.5 }}>
              האם אתה בטוח שברצונך למחוק את התוכנית? לא ניתן יהיה לבטל פעולה זו.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Btn variant="outline" onClick={() => setPlanToDelete(null)} disabled={isDeleting}>ביטול</Btn>
              <Btn 
                variant="primary" 
                disabled={isDeleting} 
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deletePlan({ planId: planToDelete });
                    notify({ kind: 'success', title: 'התוכנית נמחקה' });
                    setPlanToDelete(null);
                  } catch (err: any) {
                    notify({ kind: 'error', title: 'שגיאה במחיקה' });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? 'מוחק...' : 'כן, מחק'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
