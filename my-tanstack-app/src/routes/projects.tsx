import { createFileRoute, useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import { useCurrentProject } from '~/hooks/useCurrentProject';
import { Btn, Icon, Modal } from '~/components/Shared';
import { useDataMutation } from '~/hooks/useDataMutation';

export const Route = createFileRoute('/projects')({
  component: ProjectsRoute,
});

function ProjectsRoute() {
  const navigate = useNavigate();
  const { projects, projectId, setCurrentProject, isMock } = useCurrentProject();
  const { mutate } = useDataMutation('project');
  
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [newProject, setNewProject] = React.useState({ name: '', address: '' });
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleCreate = async () => {
    if (isMock) {
      alert("פעולת יצירת פרויקט חסומה במצב Mock. אנא עבור למצב DB בתפריט ההגדרות כדי לנהל פרויקטים אמיתיים.");
      return;
    }
    if (!newProject.name || !newProject.address) return;
    setIsSaving(true);
    try {
      await mutate('createProject', { name: newProject.name, address: newProject.address });
      setIsAddModalOpen(false);
      setNewProject({ name: '', address: '' });
      window.location.reload(); // Refresh to get new project
    } catch (err) {
      alert("שגיאה ביצירת פרויקט");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isMock) {
      alert("פעולת מחיקה חסומה במצב Mock.");
      return;
    }
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את הפרויקט? פעולה זו תמחק לצמיתות את כל הנתונים הקשורים לפרויקט (שלבים, תקציב, הערות, תמונות וכו') מכל הטבלאות בבסיס הנתונים!")) return;
    
    setIsDeleting(id);
    try {
      await mutate('deleteProject', { id });
      window.location.reload();
    } catch (err) {
      alert("שגיאה במחיקת פרויקט");
    } finally {
      setIsDeleting(null);
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
        <p style={{ fontSize: 16, color: 'var(--text2)', marginBottom: 40, textAlign: 'center', maxWidth: 460 }}>
          עדיין לא הגדרת אף פרויקט ב-BuildPro. צור את הפרויקט הראשון שלך עכשיו כדי להתחיל לנהל את הבנייה בצורה חכמה.
        </p>
        <Btn size="lg" onClick={() => setIsAddModalOpen(true)} style={{ padding: '16px 40px', fontSize: 18 }}>
          <Icon n="plus" s={20} />
          צור פרויקט ראשון
        </Btn>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text1)' }}>מעבר בין פרויקטים</div>
            {isMock && <span className="badge badge-pending" style={{ padding: '4px 10px', fontSize: 12 }}>מצב MOCK</span>}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 8 }}>
            {isMock 
              ? "שים לב: אתה נמצא במצב Mock. השינויים כאן אינם נשמרים בבסיס הנתונים."
              : "בחר איזה פרויקט לטעון כרגע. אם יש לך יותר מפרויקט אחד, אפשר לעבור ביניהם בכל רגע."
            }
          </div>
        </div>
        <Btn onClick={() => setIsAddModalOpen(true)} disabled={isMock}>
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
                    {isActive ? (
                      <span className="badge badge-active">פעיל</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                    <span>{project.address}</span>
                    <span style={{ margin: '0 8px' }}>·</span>
                    <span>{project.areaSqm} מ"ר</span>
                    <span style={{ margin: '0 8px' }}>·</span>
                    <span>{project.currentStageName || 'טרם הוגדר שלב נוכחי'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    onClick={() => handleDelete(project._id)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--danger)', 
                      cursor: 'pointer', 
                      padding: 8,
                      opacity: deleting ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 13
                    }}
                    disabled={deleting}
                  >
                    <Icon n="trash" s={16} />
                    {deleting ? 'מוחק...' : 'מחק'}
                  </button>

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

      {isAddModalOpen && (
        <Modal title="יצירת פרויקט חדש" onClose={() => setIsAddModalOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>שם הפרויקט</div>
              <input 
                className="bp-input" 
                value={newProject.name} 
                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="לדוג׳: הבית ברחוב הרצל"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>כתובת הפרויקט</div>
              <input 
                className="bp-input" 
                value={newProject.address} 
                onChange={e => setNewProject({ ...newProject, address: e.target.value })}
                placeholder="עיר, רחוב ומספר בית"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setIsAddModalOpen(false)}>ביטול</Btn>
              <Btn onClick={handleCreate} disabled={isSaving}>
                {isSaving ? 'יוצר...' : 'צור פרויקט'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
