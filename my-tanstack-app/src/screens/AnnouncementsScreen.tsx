import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Icon } from '../components/Shared';
import { Link } from '@tanstack/react-router';

export function AnnouncementsScreen() {
  const activeAnnouncements = useQuery(api.announcements.getActiveAnnouncements);
  
  const [readAnnouncementsMap, setReadAnnouncementsMap] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('buildsync:announcements_read');
      if (stored) {
        setReadAnnouncementsMap(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  if (activeAnnouncements === undefined) {
    return <div style={{ padding: 40, textAlign: 'center' }}>טוען הודעות...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 24, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon n="bell" s={28} c="var(--accent)" />
          כל ההודעות
        </h2>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text2)', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, transition: 'all 0.2s' }}>
          <Icon n="arrow-right" s={16} /> חזרה
        </Link>
      </div>
      <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
        היסטוריית ההודעות, העדכונים והחדשות של המערכת.
      </p>

      {activeAnnouncements.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text3)' }}>
          אין הודעות מערכת זמינות כרגע.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activeAnnouncements.map((ann) => {
            const isRead = !!readAnnouncementsMap[ann._id];
            const badgeConfig = {
              feature: { label: "פיצ'ר חדש", bg: "rgba(52, 199, 89, 0.12)", color: "#34C759", icon: "⭐" },
              info: { label: "עדכון", bg: "rgba(0, 122, 255, 0.12)", color: "#007AFF", icon: "ℹ️" },
              warning: { label: "תחזוקה", bg: "rgba(255, 149, 0, 0.12)", color: "#FF9500", icon: "🔧" },
              error: { label: "חשוב", bg: "rgba(255, 59, 48, 0.12)", color: "#FF3B30", icon: "🚨" },
              success: { label: "הודעה", bg: "rgba(52, 199, 89, 0.12)", color: "#34C759", icon: "✅" },
            }[ann.type] || { label: "הודעה", bg: "rgba(0, 122, 255, 0.12)", color: "#007AFF", icon: "ℹ️" };

            return (
              <div
                key={ann._id}
                style={{
                  padding: "16px",
                  borderRadius: 12,
                  background: isRead ? "var(--surface)" : "var(--accent-light, rgba(217,119,6,0.08))",
                  border: isRead ? "1px solid var(--border)" : "1px solid var(--accent-glow-sm)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{badgeConfig.icon}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text1)" }}>{ann.title}</span>
                  </div>
                  {!isRead && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", background: "rgba(217,119,6,0.15)", padding: "2px 8px", borderRadius: 6 }}>
                      חדש
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 14,
                  color: "var(--text2)",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap"
                }}>
                  {ann.body}
                  {ann.imageUrl && (
                    <div style={{ marginTop: 12 }}>
                      <img src={ann.imageUrl} alt={ann.title} style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
                  פורסם בתאריך: {new Date(ann.publishAt).toLocaleDateString('he-IL')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
