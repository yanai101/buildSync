import React from 'react';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { PageBackground, EmptyState, Btn, Icon } from '../components/Shared';

export const PermitsScreen = () => {
  const { projectId } = useCurrentProject();
  const permits = useQuery(api.permits.list, projectId ? { projectId } : 'skip');

  return (
    <ScreenBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60, minHeight: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--text1)' }}>בירוקרטיה והיתרים</h1>
            <p style={{ color: 'var(--text2)', margin: '8px 0 0 0', fontSize: 16 }}>
              מעקב אחר סטטוס היתרי בנייה ואישורים מול הרשויות
            </p>
          </div>
          {permits && permits.length > 0 && (
            <Btn onClick={() => {}}><Icon n="plus" s={16} /> הוסף מסמך</Btn>
          )}
        </div>

        {permits?.length === 0 ? (
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <PageBackground image="/empty_states/permits.png" opacity={0.03} />
            <div style={{ width: '100%' }}>
              <EmptyState
                icon="file-text"
                title="אין מסמכים מול רשויות"
                description="זה המקום לרכז היתרי בנייה, אישורי תאגיד מים, חיבור חשמל ועוד - למעקב מסודר ונוח."
                action={
                  <Btn size="lg" onClick={() => {}} style={{ padding: "12px 28px", fontSize: 16 }}>
                    <Icon n="plus" s={16}/> הוסף מסמך ראשון
                  </Btn>
                }
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {/* The list of permits will be implemented in the next step */}
            <p>היתרים בטעינה / יש מסמכים</p>
          </div>
        )}
      </div>
    </ScreenBoundary>
  );
};
