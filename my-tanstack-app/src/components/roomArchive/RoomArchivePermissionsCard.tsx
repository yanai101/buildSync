import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Icon } from '../Shared';

type Role = 'manager' | 'inspector';
type Notify = (opts: { title: string; body?: string; kind?: 'success' | 'error' | 'info' }) => unknown;

const ROLE_LABEL: Record<Role, string> = { manager: 'מנהל עבודה', inspector: 'מפקח' };

const Toggle = ({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: disabled ? 'var(--text3)' : 'var(--text1)', cursor: disabled ? 'default' : 'pointer' }}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
    {label}
  </label>
);

/**
 * Owner-only card in Team management for the Premium room photo archive.
 * Independent from the existing archive permissions.
 */
export const RoomArchivePermissionsCard = ({ projectId, notify }: { projectId: Id<'projects'>; notify: Notify }) => {
  const perms = useQuery(api.roomArchive.getPermissions, { projectId });
  const setPermission = useMutation(api.roomArchive.setPermission);
  const [busy, setBusy] = React.useState<Role | null>(null);

  if (!perms) return null; // not the owner, or still loading
  const members = (['manager', 'inspector'] as const).filter((r) => perms[r]);

  const update = async (role: Role, canView: boolean, canUpload: boolean) => {
    setBusy(role);
    try {
      await setPermission({ projectId, role, canView, canUpload });
      notify({ title: 'הרשאות תמונות חדרים עודכנו', kind: 'success' });
    } catch (err) {
      notify({ title: 'עדכון ההרשאה נכשל', body: err instanceof Error ? err.message : 'אירעה שגיאה', kind: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon n="home" s={16} />
        <span>הרשאות תמונות חדרים</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', borderRadius: 999, padding: '1px 7px' }}>Pro</span>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!perms.isPremium && (
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            המנוי אינו Pro: תמונות שכבר תועדו זמינות לצפייה בלבד (לפי הרשאת הצפייה). העלאה ועריכה יחזרו לפעול לאחר שדרוג.
          </div>
        )}
        {members.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>אין עדיין מנהל עבודה או מפקח בפרויקט.</div>
        ) : members.map((role) => {
          const m = perms[role]!;
          return (
            <div key={role} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{ROLE_LABEL[role]}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Toggle label="צפייה" checked={m.canView} disabled={busy === role}
                  onChange={(v) => update(role, v, v ? m.canUpload : false)} />
                <Toggle label="העלאה, עריכה ומחיקה" checked={m.canUpload} disabled={busy === role}
                  onChange={(v) => update(role, v ? true : m.canView, v)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
