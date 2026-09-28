import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Icon } from './Shared';
import { PlanViewer } from './PlanViewer';

export function StagePlans({ stageId }: { stageId: Id<'stages'> }) {
  const plans = useQuery(api.projectPlans.listByStage, { stageId });
  const [selectedPlanId, setSelectedPlanId] = useState<Id<'projectPlans'> | null>(null);

  if (plans === undefined) {
    return <div style={{ fontSize: 13, color: 'var(--text3)' }}>טוען תוכניות...</div>;
  }

  if (plans.length === 0) {
    return null; // Don't show anything if no plans linked
  }

  return (
    <>
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>
          תוכניות מקושרות לשלב זה
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
            >
              <div style={{ background: 'var(--surface-2)', padding: 8, borderRadius: 6 }}>
                <Icon n={plan.storedMimeType === 'application/pdf' ? 'file-text' : 'image'} s={18} c="var(--text3)" />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  v{plan.version} • {(plan.originalSize / 1024 / 1024).toFixed(1)}MB
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPlanId && (
        <PlanViewer planId={selectedPlanId} onClose={() => setSelectedPlanId(null)} />
      )}
    </>
  );
}
