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
  const updateSchedulePermission = useMutation(api.invitations.updateMemberSchedulePermission);
  const updateArchivePermission = useMutation(api.invitations.updateMemberArchivePermission);

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

  const handleToggleSchedulePermission = async (
    role: 'manager' | 'inspector' | 'contractor',
    canView: boolean,
    contractorId?: Id<'contractors'>
  ) => {
    if (!projectId) return;
    try {
      await updateSchedulePermission({
        projectId,
        role,
        contractorId,
        canViewSchedule: canView,
      });
      await notify({
        title: 'הרשאה עודכנה בהצלחה',
        body: `הרשאת צפייה בלוח זמנים עודכנה`,
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

  const handleToggleArchivePhotosPermission = async (
    role: 'manager' | 'inspector',
    canView: boolean
  ) => {
    if (!projectId) return;
    try {
      await updateArchivePermission({
        projectId,
        role,
        canViewArchivePhotos: canView,
      });
      await notify({
        title: 'הרשאה עודכנה בהצלחה',
        body: 'הרשאת צפייה בתמונות ארכיון עודכנה',
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

  const handleToggleArchiveDocsPermission = async (
    role: 'manager' | 'inspector',
    canView: boolean
  ) => {
    if (!projectId) return;
    try {
      await updateArchivePermission({
        projectId,
        role,
        canViewArchiveDocs: canView,
      });
      await notify({
        title: 'הרשאה עודכנה בהצלחה',
        body: 'הרשאת צפייה במסמכי ארכיון עודכנה',
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
    phone: string;
    contractorId: string;
    allowBudgetView: boolean;
    allowScheduleView: boolean;
    allowArchivePhotos: boolean;
    allowArchiveDocs: boolean;
  }>({
    role: 'manager',
    name: '',
    email: '',
    phone: '',
    contractorId: '',
    allowBudgetView: true,
    allowScheduleView: true,
    allowArchivePhotos: false,
    allowArchiveDocs: false,
  });

  const isValidIsraeliPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^(\+9725\d{8}|05\d{8})$/.test(cleaned);
  };

  const normalizePhoneForWhatsApp = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('0')) return '972' + cleaned.slice(1);
    if (cleaned.startsWith('+')) return cleaned.slice(1);
    return cleaned;
  };
  const [createdCode, setCreatedCode] = React.useState<{ code: string; expiresAt: number } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Styled confirmation dialog — replaces all window.confirm calls
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const openConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  };

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
    setInviteForm({
      role: 'manager',
      name: '',
      email: '',
      phone: '',
      contractorId: '',
      allowBudgetView: true,
      allowScheduleView: true,
      allowArchivePhotos: false,
      allowArchiveDocs: false,
    });
    setCreatedCode(null);
    setShowInvite(true);
  };

  const closeInvite = () => {
    if (submitting) return;
    setShowInvite(false);
  };

  const handleSendWhatsApp = () => {
    if (!createdCode || !isValidIsraeliPhone(inviteForm.phone)) return;
    const phone = normalizePhoneForWhatsApp(inviteForm.phone);
    const url = inviteUrl(createdCode.code);
    const roleName = ROLE_LABEL[inviteForm.role];
    const nameStr = inviteForm.name ? ` ${inviteForm.name}` : '';
    const text = [
      `שלום${nameStr}! 👋`,
      `הוזמנת להצטרף לפרויקט "${project?.name ?? ''}" בתפקיד ${roleName} דרך BuildSync.`,
      ``,
      `לחץ על הקישור להצטרפות:`,
      url,
      ``,
      `קוד הצטרפות: ${createdCode.code}`,
      `(תקף ל-14 ימים)`,
    ].join('\n');
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const submitInvite = async () => {
    setSubmitting(true);
    try {
      const result = await createInvitation({
        projectId,
        role: inviteForm.role,
        allowBudgetView: inviteForm.allowBudgetView,
        allowScheduleView: inviteForm.allowScheduleView,
        allowArchivePhotos: inviteForm.allowArchivePhotos,
        allowArchiveDocs: inviteForm.allowArchiveDocs,
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
    openConfirmDialog(
      'ביטול הזמנה',
      'האם לבטל את ההזמנה? הקישור הקיים יפסיק לעבוד.',
      async () => {
        closeConfirmDialog();
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
      }
    );
  };

  const handleRemoveMember = (role: 'manager' | 'inspector', name: string) => {
    openConfirmDialog(
      'הסרת חבר צוות',
      `להסיר את ${name} מהפרויקט? הם יאבדו גישה מידית.`,
      async () => {
        closeConfirmDialog();
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
      }
    );
  };

  const handleUnlinkContractor = (contractorId: Id<'contractors'>, name: string) => {
    openConfirmDialog(
      'ניתוק כניסה',
      `לנתק את הכניסה של ${name}? הם לא יוכלו להיכנס למערכת עד לקבלת הזמנה חדשה.`,
      async () => {
        closeConfirmDialog();
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
      }
    );
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
            canViewSchedule={members?.manager?.canViewSchedule}
            onToggleSchedule={
              members?.manager
                ? (val) => void handleToggleSchedulePermission('manager', val)
                : undefined
            }
            canViewArchivePhotos={members?.manager?.canViewArchivePhotos}
            onToggleArchivePhotos={
              members?.manager
                ? (val) => void handleToggleArchivePhotosPermission('manager', val)
                : undefined
            }
            canViewArchiveDocs={members?.manager?.canViewArchiveDocs}
            onToggleArchiveDocs={
              members?.manager
                ? (val) => void handleToggleArchiveDocsPermission('manager', val)
                : undefined
            }
            onRemove={
              members?.manager
                ? () => handleRemoveMember('manager', members.manager!.name)
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
            canViewSchedule={members?.inspector?.canViewSchedule}
            onToggleSchedule={
              members?.inspector
                ? (val) => void handleToggleSchedulePermission('inspector', val)
                : undefined
            }
            canViewArchivePhotos={members?.inspector?.canViewArchivePhotos}
            onToggleArchivePhotos={
              members?.inspector
                ? (val) => void handleToggleArchivePhotosPermission('inspector', val)
                : undefined
            }
            canViewArchiveDocs={members?.inspector?.canViewArchiveDocs}
            onToggleArchiveDocs={
              members?.inspector
                ? (val) => void handleToggleArchiveDocsPermission('inspector', val)
                : undefined
            }
            onRemove={
              members?.inspector
                ? () => handleRemoveMember('inspector', members.inspector!.name)
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
                  background: 'var(--surface)',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.role}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none', color: 'var(--text2)' }}>
                    <input
                      type="checkbox"
                      checked={c.canViewBudget}
                      onChange={(e) => void handleToggleBudgetPermission('contractor', e.target.checked, c.contractorId)}
                      style={{ width: 14, height: 14, cursor: 'pointer' }}
                    />
                    צפייה בתקציב
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none', color: 'var(--text2)' }}>
                    <input
                      type="checkbox"
                      checked={c.canViewSchedule}
                      onChange={(e) => void handleToggleSchedulePermission('contractor', e.target.checked, c.contractorId)}
                      style={{ width: 14, height: 14, cursor: 'pointer' }}
                    />
                    צפייה בלוח זמנים
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
                  background: 'var(--surface)',
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
              {/* WhatsApp send button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  disabled={!isValidIsraeliPhone(inviteForm.phone)}
                  onClick={handleSendWhatsApp}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: isValidIsraeliPhone(inviteForm.phone) ? 'none' : '1px dashed var(--border)',
                    background: isValidIsraeliPhone(inviteForm.phone) ? '#25D366' : 'var(--surface)',
                    color: isValidIsraeliPhone(inviteForm.phone) ? '#fff' : 'var(--text3)',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: isValidIsraeliPhone(inviteForm.phone) ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s, color 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.215a.75.75 0 00.919.919l5.357-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.92 0-3.72-.51-5.27-1.396l-.378-.218-3.924 1.081 1.081-3.924-.218-.378A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  שלח הזמנה בוואטסאפ
                </button>
                {!isValidIsraeliPhone(inviteForm.phone) && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
                    {inviteForm.phone
                      ? 'מספר לא תקין — בדוק שוב'
                      : 'הזן מספר טלפון ישראלי בטופס כדי לשלוח בוואטסאפ'}
                  </div>
                )}
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
                       allowBudgetView: v !== 'contractor',
                       allowScheduleView: true
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
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.215a.75.75 0 00.919.919l5.357-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.92 0-3.72-.51-5.27-1.396l-.378-.218-3.924 1.081 1.081-3.924-.218-.378A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  טלפון{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 12 }}>
                    (מלא כדי לשלוח את ההזמנה ישירות לנייד שלו)
                  </span>
                </label>
                <Input
                  type="tel"
                  value={inviteForm.phone}
                  onChange={(v: string) => setInviteForm({ ...inviteForm, phone: v })}
                  placeholder="050-000-0000"
                  dir="ltr"
                  style={{ width: '100%' }}
                />
                {inviteForm.phone && !isValidIsraeliPhone(inviteForm.phone) && (
                  <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
                    מספר לא תקין — הזן מספר ישראלי כגון 050-000-0000
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                {inviteForm.role !== 'contractor' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        id="allowArchivePhotos"
                        checked={inviteForm.allowArchivePhotos}
                        onChange={(e) => setInviteForm({ ...inviteForm, allowArchivePhotos: e.target.checked })}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <label htmlFor="allowArchivePhotos" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', userSelect: 'none', color: 'var(--text1)' }}>
                        אפשר צפייה והעלאת תמונות בארכיון
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        id="allowArchiveDocs"
                        checked={inviteForm.allowArchiveDocs}
                        onChange={(e) => setInviteForm({ ...inviteForm, allowArchiveDocs: e.target.checked })}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <label htmlFor="allowArchiveDocs" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', userSelect: 'none', color: 'var(--text1)' }}>
                        אפשר צפייה והעלאת מסמכים בארכיון
                      </label>
                    </div>
                  </>
                )}
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

      {/* Styled confirmation dialog — replaces native window.confirm */}
      {confirmDialog.open && (
        <Modal
          title={confirmDialog.title}
          onClose={closeConfirmDialog}
          width={420}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: 14, color: 'var(--text1)', lineHeight: 1.6, margin: 0 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={closeConfirmDialog}>
                ביטול
              </Btn>
              <Btn
                variant="danger"
                onClick={() => void confirmDialog.onConfirm()}
                style={{ background: 'var(--danger)', color: '#fff' }}
              >
                אישור
              </Btn>
            </div>
          </div>
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
  canViewSchedule,
  onToggleSchedule,
  canViewArchivePhotos,
  onToggleArchivePhotos,
  canViewArchiveDocs,
  onToggleArchiveDocs,
  onRemove,
}: {
  roleLabel: string;
  name: string | null;
  email?: string | null;
  canViewBudget?: boolean;
  onToggleBudget?: (val: boolean) => void;
  canViewSchedule?: boolean;
  onToggleSchedule?: (val: boolean) => void;
  canViewArchivePhotos?: boolean;
  onToggleArchivePhotos?: (val: boolean) => void;
  canViewArchiveDocs?: boolean;
  onToggleArchiveDocs?: (val: boolean) => void;
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
      background: 'var(--surface)',
      flexWrap: 'wrap',
      gap: 8,
    }}
  >
    <div>
      <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{roleLabel}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{name ?? 'טרם שובץ'}</div>
      {email && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{email}</div>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      {name && onToggleBudget !== undefined && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none', color: 'var(--text2)' }}>
          <input
            type="checkbox"
            checked={canViewBudget}
            onChange={(e) => onToggleBudget(e.target.checked)}
            style={{ width: 14, height: 14, cursor: 'pointer' }}
          />
          תקציב
        </label>
      )}
      {name && onToggleSchedule !== undefined && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none', color: 'var(--text2)' }}>
          <input
            type="checkbox"
            checked={canViewSchedule}
            onChange={(e) => onToggleSchedule(e.target.checked)}
            style={{ width: 14, height: 14, cursor: 'pointer' }}
          />
          לו״ז
        </label>
      )}
      {name && onToggleArchivePhotos !== undefined && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none', color: 'var(--text2)' }}>
          <input
            type="checkbox"
            checked={canViewArchivePhotos}
            onChange={(e) => onToggleArchivePhotos(e.target.checked)}
            style={{ width: 14, height: 14, cursor: 'pointer' }}
          />
          תמונות ארכיון
        </label>
      )}
      {name && onToggleArchiveDocs !== undefined && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none', color: 'var(--text2)' }}>
          <input
            type="checkbox"
            checked={canViewArchiveDocs}
            onChange={(e) => onToggleArchiveDocs(e.target.checked)}
            style={{ width: 14, height: 14, cursor: 'pointer' }}
          />
          מסמכי ארכיון
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
