import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Modal, Btn, Icon } from './Shared';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { EditPlanModal } from './EditPlanModal';
import { useState } from 'react';

export function PlanViewer({ planId, onClose }: { planId: Id<'projectPlans'>; onClose: () => void }) {
  const plan = useQuery(api.projectPlans.getPlanWithUrl, { planId });
  const versions = useQuery(api.projectPlans.getVersionHistory, { planId });
  const { projectId } = useCurrentProject();
  const stages = useQuery(api.stages.list, projectId ? { projectId } : 'skip') || [];
  const { project } = useCurrentProject();
  const canEdit = project?.myRole === 'owner' || project?.myRole === 'manager';
  const [isEditing, setIsEditing] = useState(false);



  if (plan === undefined) {
    return (
      <Modal onClose={onClose} title="טוען תוכנית..." maxWidth="800px">
        <div style={{ padding: 40, textAlign: 'center' }}>טוען...</div>
      </Modal>
    );
  }

  if (plan === null) {
    return (
      <Modal onClose={onClose} title="שגיאה" maxWidth="800px">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
          התוכנית לא נמצאה או שאין לך הרשאה לצפות בה.
        </div>
      </Modal>
    );
  }

  const isPdf = plan.storedMimeType === 'application/pdf';

  return (
    <>
      <Modal onClose={onClose} title={plan.name} maxWidth="90vw" maxHeight="90vh">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
        
        {/* Header Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ background: 'var(--surface-2)', padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                {plan.categoryLabel}
              </span>
              <span style={{ color: 'var(--text3)', fontSize: 13 }}>
                גרסה {plan.version} {plan.isLatest ? '(עדכנית)' : ''}
              </span>
              <span style={{ color: 'var(--text3)', fontSize: 13 }}>
                {(plan.originalSize / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {canEdit && (
              <Btn
                variant="outline"
                onClick={() => setIsEditing(true)}
                icon={<Icon n="edit-2" s={16} />}
              >
                ערוך תוכנית
              </Btn>
            )}
            <Btn
              variant="primary"
              onClick={() => {
              if (plan.url) {
                const a = document.createElement('a');
                a.href = plan.url;
                a.download = plan.originalName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            }}
            icon={<Icon n="download" s={16} />}
          >
            הורד קובץ
          </Btn>
            </div>
          </div>

          {plan.stageIds.length > 0 && (
            <div style={{ 
              color: 'var(--text2)', 
              fontSize: 13, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              flexWrap: 'wrap', 
              background: 'var(--surface-2)', 
              padding: '6px 12px', 
              borderRadius: 6, 
              width: 'fit-content' 
            }}>
              <Icon n="link-2" s={14} c="var(--accent)" />
              <span style={{ fontWeight: 600 }}>שלבים מקושרים:</span>
              {plan.stageIds.map((id: string) => stages.find((s: any) => s._id === id)?.name).filter(Boolean).join(', ')}
            </div>
          )}
        </div>


        {/* Viewer Area */}
        <div style={{ flex: 1, minHeight: '70vh', background: 'var(--surface-2)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
          {isPdf ? (
            <object
              data={plan.url!}
              type="application/pdf"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              
              
            >
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
                הדפדפן שלך לא תומך בהצגת PDF מובנית.
                <br /><br />
                <a href={plan.url!} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                  לחץ כאן לפתיחת הקובץ
                </a>
              </div>
            </object>
          ) : (
            <img
              src={plan.url!}
              alt={plan.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
        </div>

        {/* Version History (if any) */}
        {versions && versions.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>היסטוריית גרסאות</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {versions.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>v{v.version}</span>
                    <span style={{ color: 'var(--text2)', fontSize: 13 }}>
                      {new Date(v.uploadedAt).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {v.id !== planId && (
                      <Btn variant="ghost" size="sm" onClick={() => {
                         // Could navigate to this version if we update the state
                      }}>
                        צפה
                      </Btn>
                    )}
                    <Btn variant="ghost" size="sm" onClick={() => {
                      if (v.url) {
                        const a = document.createElement('a');
                        a.href = v.url;
                        a.download = v.originalName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                    }}>
                      <Icon n="download" s={14} />
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
      {isEditing && (
        <EditPlanModal planId={planId} onClose={() => { setIsEditing(false); }} />
      )}
    </>
  );
}
