import { createFileRoute, useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import { useCurrentProject } from '~/hooks/useCurrentProject';
import { Btn, Icon, FeedbackModal, ConfirmDialog } from '~/components/Shared';
import { useDataMutation } from '~/hooks/useDataMutation';
import { CreateProjectWizard } from '~/components/CreateProjectWizard';
import { useSubscription } from '~/hooks/useSubscription';

export const Route = createFileRoute('/projects')({
  component: ProjectsRoute,
});

function ProjectsRoute() {
  const navigate = useNavigate();
  const { user, projects, projectId, setCurrentProject, isMock } = useCurrentProject();
  const { mutate } = useDataMutation('project');
  const { isProOrPremium } = useSubscription();
  
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleOpenWizard = () => {
    if (!isProOrPremium && projects.length >= 1) {
      setFeedback({
        title: "הגבלת חשבון חינמי",
        message: "במסלול החינמי ניתן לנהל פרויקט אחד בלבד. שדרג למסלול Pro כדי להוסיף ולנהל פרויקטים נוספים.",
        type: "info"
      });
      return;
    }
    setIsWizardOpen(true);
  };

  const handleCreate = async (data: any) => {
    if (isMock) {
      setFeedback({ title: "פעולה חסומה", message: "יצירת פרויקטים אינה זמינה במצב דמו (Mock).", type: "info" });
      return;
    }
    if (!isProOrPremium && projects.length >= 1) {
      setFeedback({ title: "הגבלת חשבון חינמי", message: "לא ניתן ליצור פרויקט נוסף במסלול החינמי.", type: "error" });
      return;
    }
    setIsSaving(true);
    try {
      const newId = await mutate('createProject', data);
      setIsWizardOpen(false);
      
      // Auto-switch to new project
      if (typeof newId === 'string') {
        setCurrentProject(newId);
      }
      navigate({ to: '/' });
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו ליצור את הפרויקט. אנא נסו שוב.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isMock) {
      setFeedback({ title: "פעולה חסומה", message: "מחיקת פרויקטים אינה זמינה במצב דמו (Mock).", type: "info" });
      return;
    }
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    
    setIsDeleting(deleteTargetId);
    try {
      await mutate('deleteProject', { id: deleteTargetId });
      window.location.reload();
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "לא הצלחנו למחוק את הפרויקט.", type: "error" });
    } finally {
      setIsDeleting(null);
      setDeleteTargetId(null);
    }
  };

  if (projects.length === 0 && !isMock) {
    return (
      <div style={{ 
        minHeight: '80vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 40,
        background: 'radial-gradient(circle at top right, var(--accent-light) 0%, transparent 40%), radial-gradient(circle at bottom left, #fff7ed 0%, transparent 40%)',
        borderRadius: 24,
        margin: 24,
        border: '1px solid var(--border)'
      }}>
        <div style={{ 
          width: 100, 
          height: 100, 
          borderRadius: 30, 
          background: 'linear-gradient(135deg, var(--accent) 0%, #c96b30 100%)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 20px 40px rgba(224, 122, 56, 0.3)',
          marginBottom: 32
        }}>
          <Icon n="plus" s={48} c="#fff" />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12, textAlign: 'center' }}>בוא נתחיל פרויקט חדש</h1>
        <Btn id="tour-create-project" size="lg" onClick={handleOpenWizard} style={{ padding: '16px 40px', fontSize: 18 }}>
          <Icon n="plus" s={20} />
          צור פרויקט ראשון
        </Btn>

        {isWizardOpen && (
          <CreateProjectWizard 
            onClose={() => setIsWizardOpen(false)} 
            onSave={handleCreate} 
            saving={isSaving} 
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text1)' }}>מעבר בין פרויקטים</div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 8 }}>
            בחר איזה פרויקט לטעון כרגע. אם יש לך יותר מפרויקט אחד, אפשר לעבור ביניהם בכל רגע.
          </div>
        </div>
        <Btn onClick={handleOpenWizard} disabled={isMock}>
          <Icon n="plus" s={16} />
          הוסף פרויקט
        </Btn>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {projects.map((project) => {
          const isActive = project._id === projectId;
          const deleting = isDeleting === project._id;
          return (
            <div key={project._id} className="card" style={{ padding: 20, border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{project.name}</div>
                    {isActive ? <span className="badge badge-active">פעיל</span> : null}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                    <span>{project.address}</span>
                    <span style={{ margin: '0 8px' }}>·</span>
                    <span>{project.areaSqm || 0} מ"ר</span>
                    <span style={{ margin: '0 8px' }}>·</span>
                    <span>{project.currentStageName || 'חדש'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  {user?._id === project.ownerUserId && (
                    <button 
                      onClick={() => handleDelete(project._id)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 8, opacity: deleting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
                      disabled={deleting}
                    >
                      <Icon n="trash" s={16} />
                      {deleting ? 'מוחק...' : 'מחק'}
                    </button>
                  )}

                  <Btn
                    disabled={isActive}
                    variant={isActive ? 'ghost' : 'primary'}
                    onClick={() => {
                      setCurrentProject(project._id);
                      navigate({ to: '/' });
                    }}
                  >
                    <Icon n="arrow-right" s={16} />
                    {isActive ? 'זה הפרויקט הנוכחי' : 'טען פרויקט'}
                  </Btn>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isWizardOpen && (
        <CreateProjectWizard 
          onClose={() => setIsWizardOpen(false)} 
          onSave={handleCreate} 
          saving={isSaving} 
        />
      )}

      {deleteTargetId && (
        <ConfirmDialog
          title="מחיקת פרויקט"
          message="האם אתה בטוח שברצונך למחוק את הפרויקט? פעולה זו תמחק לצמיתות את כל הנתונים הקשורים לפרויקט!"
          confirmText="מחק פרויקט"
          cancelText="ביטול"
          loading={isDeleting === deleteTargetId}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTargetId(null)}
        />
      )}

      {feedback && (
        <FeedbackModal 
          title={feedback.title} 
          message={feedback.message} 
          type={feedback.type} 
          onClose={() => setFeedback(null)} 
        />
      )}
    </div>
  );
}
