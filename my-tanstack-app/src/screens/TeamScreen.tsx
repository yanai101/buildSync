import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Btn, Icon, Input, Modal, Select } from '../components/Shared';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useRequireRole } from '../hooks/useRequireRole';
import { useAppNotify } from '../hooks/useAppNotify';
import { useSubscription } from '../hooks/useSubscription';

type InviteRole = 'manager' | 'inspector' | 'contractor';

const ROLE_LABEL: Record<InviteRole, string> = {
  manager: 'מנהל עבודה',
  inspector: 'מפקח',
  contractor: 'קבלן',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'פעילה',
  consumed: 'נוצלה',
  revoked: 'בוטלה',
  expired: 'פגה',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--success)',
  consumed: 'var(--text3)',
  revoked: 'var(--danger)',
  expired: 'var(--text3)',
};

const formatExpiresIn = (ms: number): string => {
  const diff = ms - Date.now();
  if (diff <= 0) return 'פג';
  const days = Math.floor(diff / 86_400_000);
  if (days > 0) return `${days} ימים`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours > 0) return `${hours} שעות`;
  const mins = Math.max(1, Math.floor(diff / 60_000));
  return `${mins} דק׳`;
};

export const TeamScreen = () => {
  const { allowed, loading: roleLoading } = useRequireRole(['owner']);
  const { project } = useCurrentProject();
  const projectId = project?._id as Id<'projects'> | undefined;
  const { notify } = useAppNotify();
  const { isProOrPremium } = useSubscription();
  const currentIdentity = useQuery(api.users.currentIdentity, {});
  
  const isProjectOwner = project ? (project as any).ownerUserId === currentIdentity?.userId || currentIdentity?.isSuperAdmin : true;

  const members = useQuery(
    api.invitations.listProjectMembers,
    projectId && allowed && isProjectOwner ? { projectId } : 'skip',
  );
  const invitations = useQuery(
    api.invitations.listInvitations,
    projectId && allowed && isProjectOwner ? { projectId } : 'skip',
  );
  const projectContractors = useQuery(
    api.queries.listContractors,
    projectId && allowed && isProjectOwner ? { projectId } : 'skip',
  );

  const createInvitation = useMutation(api.invitations.createInvitation);
  const revokeInvitation = useMutation(api.invitations.revokeInvitation);
  const removeMember = useMutation(api.invitations.removeMember);
  const unlinkContractor = useMutation(api.invitations.unlinkContractorLogin);
  const updateBudgetPermission = useMutation(api.invitations.updateMemberBudgetPermission);

  const handleToggleBudgetPermission = async (
    role: 'manager' | 'inspector' | 'contractor',
    canView: boolean,
    contractorId?: Id<'contractors'>
  ) => {
    if (!projectId) return;
    try {
      await updateBudgetPermission({
        projectId,
        role,
        contractorId,
        canViewBudget: canView,
      });
      await notify({
        title: 'הרשאה עודכנה בהצלחה',
        body: `הרשאת צפייה בתקציב עודכנה`,
        kind: 'success',
      });
    } catch (err) {
      await notify({
        title: 'עדכון הרשאה נכשל',
        body: err instanceof Error ? err.message : 'אירעה שגיאה',
        kind: 'error',
      });
    }
  };

  const [showInvite, setShowInvite] = React.useState(false);
  const [inviteForm, setInviteForm] = React.useState<{
    role: InviteRole;
    name: string;
    email: string;
    contractorId: string;
    allowBudgetView: boolean;
  }>({ role: 'manager', name: '', email: '', contractorId: '', allowBudgetView: true });
  const [createdCode, setCreatedCode] = React.useState<{ code: string; expiresAt: number } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  if (roleLoading) {
    return <div style={{ padding: 24, color: 'var(--text2)' }}>טוען...</div>;
  }

  if (!allowed || !isProjectOwner) {
    return (
      <div className="page-content">
        <div className="card">
          <div className="card-body" style={{ padding: 32, textAlign: 'center' }}>
            <Icon n="alert" s={28} c="var(--danger)" />
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>אין לך גישה</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
              ניהול הצוות זמין רק לבעל הפרויקט.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="page-content">
        <div className="card">
          <div className="card-body" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>בחר פרויקט כדי לנהל את הצוות.</div>
          </div>
        </div>
      </div>
    );
  }

  const openInvite = () => {
    const currentTeamSize = (members?.owner ? 1 : 0) + (members?.manager ? 1 : 0) + (members?.inspector ? 1 : 0) + (members?.contractors?.length || 0);
    if (!isProOrPremium && currentTeamSize >= 5) {
      notify({
        title: 'הגבלת חשבון חינמי',
        body: 'במסלול החינמי ניתן להוסיף עד 5 חברי צוות. שדרג ל-Pro כדי להוסיף חברים נוספים.',
        kind: 'error',
      });
      return;
    }
    setInviteForm({ role: 'manager', name: '', email: '', contractorId: '', allowBudgetView: true });
    setCreatedCode(null);
    setShowInvite(true);
  };

  const closeInvite = () => {
    if (submitting) return;
    setShowInvite(false);
  };

  const submitInvite = async () => {
    setSubmitting(true);
    try {
      const result = await createInvitation({
        projectId,
        role: inviteForm.role,
        allowBudgetView: inviteForm.allowBudgetView,
        ...(inviteForm.name ? { invitedName: inviteForm.name } : {}),
        ...(inviteForm.email ? { invitedEmail: inviteForm.email } : {}),
        ...(inviteForm.role === 'contractor' && inviteForm.contractorId
          ? { contractorId: inviteForm.contractorId as Id<'contractors'> }
          : {}),
      });
      setCreatedCode({ code: result.code, expiresAt: result.expiresAt });
      await notify({
        title: 'נוצר קוד הזמנה',
        body: result.code,
        kind: 'success',
      });
    } catch (err) {
      await notify({
        title: 'יצירת הזמנה נכשלה',
        body: err instanceof Error ? err.message : 'אירעה שגיאה',
        kind: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      await notify({ title: 'הועתק ללוח', body: label, kind: 'info' });
    } catch {
      await notify({
        title: 'ההעתקה נכשלה',
        body: 'העתק ידנית את הטקסט',
        kind: 'error',
      });
    }
  };

  const inviteUrl = (code: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/join/${code}` : `/join/${code}`;

  const handleRevoke = async (invitationId: Id<'projectInvitations'>) => {
    if (!window.confirm('לבטל את ההזמנה?')) return;
    try {
      await revokeInvitation({ invitationId });
      await notify({ title: 'ההזמנה בוטלה', kind: 'info' });
    } catch (err) {
      await notify({
        title: 'ביטול נכשל',
        body: err instanceof Error ? err.message : 'אירעה שגיאה',
        kind: 'error',
      });
    }
  };

  const handleRemoveMember = async (role: 'manager' | 'inspector', name: string) => {
    if (!window.confirm(`להסיר את ${name} מהפרויקט?`)) return;
    try {
      await removeMember({ projectId, role });
      await notify({ title: 'חבר הצוות הוסר', kind: 'info' });
    } catch (err) {
      await notify({
        title: 'הסרה נכשלה',
        body: err instanceof Error ? err.message : 'אירעה שגיאה',
        kind: 'error',
      });
    }
  };

  const handleUnlinkContractor = async (contractorId: Id<'contractors'>, name: string) => {
    if (!window.confirm(`לנתק את הכניסה של ${name}?`)) return;
    try {
      await unlinkContractor({ contractorId });
      await notify({ title: 'הכניסה נותקה', kind: 'info' });
    } catch (err) {
      await notify({
        title: 'הניתוק נכשל',
        body: err instanceof Error ? err.message : 'אירעה שגיאה',
        kind: 'error',
      });
    }
  };

  const activeInvitations = (invitations ?? []).filter((inv) => inv.status === 'active');
  const historyInvitations = (invitations ?? []).filter((inv) => inv.status !== 'active');

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div
          className="card-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>חברי צוות</span>
          <Btn onClick={openInvite}>
            <Icon n="plus" s={14} /> הזמנה חדשה
          </Btn>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MemberRow
            roleLabel="בעל הפרויקט"
            name={members?.owner?.name ?? '—'}
            email={members?.owner?.email}
          />
          <MemberRow
            roleLabel="מנהל עבודה"
            name={members?.manager?.name ?? null}
            email={members?.manager?.email}
            canViewBudget={members?.manager?.canViewBudget}
            onToggleBudget={
              members?.manager
                ? (val) => void handleToggleBudgetPermission('manager', val)
                : undefined
            }
            onRemove={
              members?.manager
                ? () => void handleRemoveMember('manager', members.manager!.name)
                : undefined
            }
          />
          <MemberRow
            roleLabel="מפקח"
            name={members?.inspector?.name ?? null}
            email={members?.inspector?.email}
            canViewBudget={members?.inspector?.canViewBudget}
            onToggleBudget={
              members?.inspector
                ? (val) => void handleToggleBudgetPermission('inspector', val)
                : undefined
            }
            onRemove={
              members?.inspector
                ? () => void handleRemoveMember('inspector', members.inspector!.name)
                : undefined
            }
          />
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text3)',
              marginTop: 8,
              textTransform: 'uppercase',
            }}
          >
            קבלנים ({members?.contractors.length ?? 0})
          </div>
          {(members?.contractors ?? []).length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: 'var(--text3)',
                border: '1px dashed var(--border)',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
              }}
            >
              עדיין לא נוספו קבלנים.
            </div>
          ) : (
            members!.contractors.map((c) => (
              <div
                key={String(c.contractorId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  background: '#fff',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.role}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none', color: 'var(--text2)' }}>
                    <input
                      type="checkbox"
                      checked={c.canViewBudget}
                      onChange={(e) => void handleToggleBudgetPermission('contractor', e.target.checked, c.contractorId)}
                      style={{ width: 14, height: 14, cursor: 'pointer' }}
                    />
                    צפייה בתקציב
                  </label>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: c.hasLogin ? 'rgba(16,185,129,0.12)' : 'var(--bg)',
                      color: c.hasLogin ? 'var(--success)' : 'var(--text3)',
                      fontWeight: 600,
                    }}
                  >
                    {c.hasLogin ? 'יש כניסה' : 'אין כניסה'}
                  </span>
                  {c.hasLogin && (
                    <button
                      type="button"
                      onClick={() => void handleUnlinkContractor(c.contractorId, c.name)}
                      title="נתק כניסה"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 4,
                        cursor: 'pointer',
                        color: 'var(--danger)',
                      }}
                    >
                      <Icon n="x" s={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div
          className="card-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>הזמנות פעילות</span>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
            {activeInvitations.length} פעילות
          </span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeInvitations.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: 'var(--text3)',
                border: '1px dashed var(--border)',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
              }}
            >
              אין הזמנות פעילות. לחץ "הזמנה חדשה" כדי ליצור קוד הצטרפות.
            </div>
          ) : (
            activeInvitations.map((inv) => (
              <div
                key={String(inv.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {ROLE_LABEL[inv.role]}{inv.invitedName ? ` · ${inv.invitedName}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {inv.invitedEmail || 'ללא אימייל'} · פג בעוד {formatExpiresIn(inv.expiresAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(inv.id)}
                    title="בטל הזמנה"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 6,
                      cursor: 'pointer',
                      color: 'var(--danger)',
                    }}
                  >
                    <Icon n="trash" s={14} />
                  </button>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--bg)',
                    borderRadius: 8,
                    padding: '8px 10px',
                  }}
                >
                  <code style={{ flex: 1, fontSize: 13, letterSpacing: 1, fontFamily: 'monospace' }}>
                    {inv.code}
                  </code>
                  <Btn size="sm" variant="ghost" onClick={() => void copyToClipboard(inv.code, 'הקוד')}>
                    העתק קוד
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() => void copyToClipboard(inviteUrl(inv.code), 'הקישור')}
                  >
                    העתק קישור
                  </Btn>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {historyInvitations.length > 0 && (
        <div className="card">
          <div className="card-header">היסטוריה</div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {historyInvitations.map((inv) => (
              <div
                key={String(inv.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 4px',
                  fontSize: 12,
                  color: 'var(--text2)',
                }}
              >
                <span>
                  {ROLE_LABEL[inv.role]}{inv.invitedName ? ` · ${inv.invitedName}` : ''}{inv.consumedByName ? ` → ${inv.consumedByName}` : ''}
                </span>
                <span style={{ color: STATUS_COLOR[inv.status] ?? 'var(--text3)', fontWeight: 600 }}>
                  {STATUS_LABEL[inv.status] ?? inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInvite && (
        <Modal
          title={createdCode ? 'קוד ההזמנה מוכן' : 'הזמנה חדשה'}
          onClose={closeInvite}
          width={520}
        >
          {createdCode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                שלח את הקוד או את הקישור לאדם שאת/ה מזמינ/ה. הקוד תקף ל-14 ימים.
              </div>
              <div
                style={{
                  background: 'var(--bg)',
                  borderRadius: 10,
                  padding: 14,
                  fontFamily: 'monospace',
                  fontSize: 18,
                  letterSpacing: 1,
                  textAlign: 'center',
                }}
              >
                {createdCode.code}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn
                  variant="ghost"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => void copyToClipboard(createdCode.code, 'הקוד')}
                >
                  העתק קוד
                </Btn>
                <Btn
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => void copyToClipboard(inviteUrl(createdCode.code), 'הקישור')}
                >
                  העתק קישור הצטרפות
                </Btn>
              </div>
              <Btn variant="ghost" onClick={closeInvite} style={{ alignSelf: 'flex-end' }}>
                סיים
              </Btn>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  תפקיד
                </label>
                <Select
                  value={inviteForm.role}
                  onChange={(v: string) =>
                    setInviteForm({ 
                      ...inviteForm, 
                      role: v as InviteRole, 
                      contractorId: '', 
                      allowBudgetView: v !== 'contractor' 
                    })
                  }
                  style={{ width: '100%' }}
                >
                  <option value="manager">מנהל עבודה</option>
                  <option value="inspector">מפקח</option>
                  <option value="contractor">קבלן</option>
                </Select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  שם (אופציונלי)
                </label>
                <Input
                  value={inviteForm.name}
                  onChange={(v: string) => setInviteForm({ ...inviteForm, name: v })}
                  placeholder="ישראל ישראלי"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  אימייל (אופציונלי, להצגה בלבד)
                </label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(v: string) => setInviteForm({ ...inviteForm, email: v })}
                  placeholder="name@company.com"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, padding: '4px 0' }}>
                <input
                  type="checkbox"
                  id="allowBudgetView"
                  checked={inviteForm.allowBudgetView}
                  onChange={(e) => setInviteForm({ ...inviteForm, allowBudgetView: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="allowBudgetView" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', userSelect: 'none', color: 'var(--text1)' }}>
                  אפשר צפייה בתקציב והוצאות פרויקט
                </label>
              </div>
              {inviteForm.role === 'contractor' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    קישור לקבלן קיים (אופציונלי)
                  </label>
                  <Select
                    value={inviteForm.contractorId}
                    onChange={(v: string) => setInviteForm({ ...inviteForm, contractorId: v })}
                    style={{ width: '100%' }}
                  >
                    <option value="">צור רשומת קבלן חדשה בעת הצטרפות</option>
                    {(projectContractors ?? [])
                      .filter((c: any) => !c.userId)
                      .map((c: any) => (
                        <option key={String(c._id)} value={String(c._id)}>
                          {c.name} · {c.role}
                        </option>
                      ))}
                  </Select>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Btn variant="ghost" onClick={closeInvite} disabled={submitting}>
                  בטל
                </Btn>
                <Btn onClick={() => void submitInvite()} disabled={submitting}>
                  {submitting ? 'יוצר...' : 'צור קוד הזמנה'}
                </Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

const MemberRow = ({
  roleLabel,
  name,
  email,
  canViewBudget,
  onToggleBudget,
  onRemove,
}: {
  roleLabel: string;
  name: string | null;
  email?: string | null;
  canViewBudget?: boolean;
  onToggleBudget?: (val: boolean) => void;
  onRemove?: () => void;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 12px',
      background: '#fff',
    }}
  >
    <div>
      <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{roleLabel}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{name ?? 'טרם שובץ'}</div>
      {email && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{email}</div>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {name && onToggleBudget !== undefined && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none', color: 'var(--text2)' }}>
          <input
            type="checkbox"
            checked={canViewBudget}
            onChange={(e) => onToggleBudget(e.target.checked)}
            style={{ width: 14, height: 14, cursor: 'pointer' }}
          />
          צפייה בתקציב
        </label>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="הסר"
          style={{
            background: 'none',
            border: 'none',
            padding: 6,
            cursor: 'pointer',
            color: 'var(--danger)',
          }}
        >
          <Icon n="x" s={14} />
        </button>
      )}
    </div>
  </div>
);
