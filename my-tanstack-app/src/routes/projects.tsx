import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { useCurrentProject } from '~/hooks/useCurrentProject';
import { Btn, Icon } from '~/components/Shared';

export const Route = createFileRoute('/projects')({
  component: ProjectsRoute,
});

function ProjectsRoute() {
  const navigate = useNavigate();
  const { projects, projectId, setCurrentProject } = useCurrentProject();

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text1)' }}>מעבר בין פרויקטים</div>
        <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 8 }}>
          בחר איזה פרויקט לטעון כרגע. אם יש לך יותר מפרויקט אחד, אפשר לעבור ביניהם בכל רגע.
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {projects.map((project) => {
          const isActive = project._id === projectId;
          return (
            <div key={project._id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
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

                <Btn
                  disabled={isActive}
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
          );
        })}
      </div>
    </div>
  );
}
