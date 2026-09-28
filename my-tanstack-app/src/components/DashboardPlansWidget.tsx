import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Icon } from './Shared';
import { Link } from '@tanstack/react-router';

export function DashboardPlansWidget({ projectId }: { projectId: Id<'projects'> }) {
  const plansData = useQuery(api.projectPlans.getPlansCountForDashboard, { projectId });

  if (plansData === undefined) {
    return <div style={{ height: 100, background: 'var(--surface)', borderRadius: 16 }} />;
  }

  if (plansData === null || plansData.total === 0) {
    return null;
  }

  return (
    <Link to="/plans" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div 
        className="card"
        style={{
          background: 'var(--surface)',
          padding: 20,
          borderRadius: 16,
          border: '1px solid var(--border)',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: 10, borderRadius: 10 }}>
              <Icon n="layers" s={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>תוכניות פרויקט</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ 
                  background: plansData.total >= plansData.limit ? 'var(--danger)' : 'var(--surface-2)', 
                  color: plansData.total >= plansData.limit ? '#fff' : 'var(--text2)', 
                  padding: '2px 6px', 
                  borderRadius: 4,
                  fontWeight: 600
                }}>
                  {plansData.total} / {plansData.limit}
                </span>
                <span>•</span>
                <span>{(plansData.totalSize / 1024 / 1024).toFixed(1)}MB</span>
              </div>
            </div>
          </div>
          <Icon n="chevron-left" s={20} c="var(--text4)" />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(plansData.byCategory).map(([cat, count]) => (
            <div key={cat} style={{ background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
              {plansData.categoryLabels[cat] || cat}: {count as number}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
