import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Icon, Btn, Modal } from '../components/Shared';

export function SuperAdminScreen() {
  const identity = useQuery(api.users.currentIdentity);
  const isSuperAdmin = identity?.isSuperAdmin;
  const users = useQuery(api.superAdmin.getAllUsers, isSuperAdmin ? {} : 'skip');
  const updateUserStatus = useMutation(api.superAdmin.updateUserStatus);
  const deleteUserCascade = useMutation(api.superAdmin.deleteUserCascade);
  const forceResetPassword = useAction(api.superAdmin.forceResetPassword);
  
  const promoCodes = useQuery(api.superAdmin.getPromoCodes, isSuperAdmin ? {} : 'skip');
  const generatePromoCode = useMutation(api.superAdmin.generatePromoCode);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<Id<'users'> | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [promoTier, setPromoTier] = useState<'pro' | 'premium'>('pro');
  const [promoValidity, setPromoValidity] = useState<number>(1);
  const [promoMaxUses, setPromoMaxUses] = useState<number>(1);
  const [promoDuration, setPromoDuration] = useState<number>(12); // months

  if (users === undefined) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        טוען משתמשים...
      </div>
    );
  }

  const handleDelete = async () => {
    if (!showConfirmDelete) return;
    if (confirm("האם אתה בטוח? פעולה זו תמחק את המשתמש ואת כל הפרויקטים שלו לצמיתות!")) {
      await deleteUserCascade({ userId: showConfirmDelete });
    }
    setShowConfirmDelete(null);
  };

  const handleGeneratePromo = async () => {
    try {
      await generatePromoCode({ 
        tier: promoTier, 
        validityDays: promoValidity,
        maxUses: promoMaxUses,
        subscriptionDurationMonths: promoDuration
      });
      alert('הקוד נוצר בהצלחה!');
    } catch (e: any) {
      alert('שגיאה ביצירת הקוד: ' + e.message);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon n="shield" s={28} c="var(--accent)" />
          ניהול מערכת (Super Admin)
        </h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
          כאן תוכל לראות את כל המשתמשים הרשומים, לנהל מנויים, להשעות משתמשים ולמחוק פרויקטים במידת הצורך.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text3)', fontSize: 13 }}>
                <th style={{ padding: 12, fontWeight: 600 }}>שם משתמש</th>
                <th style={{ padding: 12, fontWeight: 600 }}>אימייל / טלפון</th>
                <th style={{ padding: 12, fontWeight: 600 }}>תפקיד</th>
                <th style={{ padding: 12, fontWeight: 600 }}>פרויקטים</th>
                <th style={{ padding: 12, fontWeight: 600 }}>מנוי</th>
                <th style={{ padding: 12, fontWeight: 600 }}>סטטוס</th>
                <th style={{ padding: 12, fontWeight: 600 }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isCurrentAdmin = u._id === identity?.userId;
                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid var(--border)', opacity: isCurrentAdmin ? 0.6 : 1, background: isCurrentAdmin ? 'var(--surface)' : 'transparent' }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600 }}>{u.name || 'ללא שם'}</div>
                      {u.isSuperAdmin && (
                        <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>Admin</span>
                      )}
                    </td>
                    <td style={{ padding: 12, color: 'var(--text2)', fontSize: 14 }}>
                      {u.email && <div>{u.email}</div>}
                      {u.phone && <div>{u.phone}</div>}
                    </td>
                    <td style={{ padding: 12, fontSize: 14 }}>{u.role || 'owner'}</td>
                    <td style={{ padding: 12, fontSize: 14 }}>{u.projectCount || 0}</td>
                    <td style={{ padding: 12 }}>
                      {u.subscriptionTier === 'premium' ? (
                        <span style={{ color: '#EAB308', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Icon n="star" s={14} /> פרימיום</span>
                      ) : u.subscriptionTier === 'pro' ? (
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Pro</span>
                      ) : (
                        <span style={{ color: 'var(--text3)' }}>ללא מנוי</span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {u.isSuspended ? (
                        <span style={{ color: '#EF4444', fontWeight: 600 }}>מושעה</span>
                      ) : (
                        <span style={{ color: '#22C55E' }}>פעיל</span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {isCurrentAdmin ? (
                        <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>מנהל מערכת (מוגן)</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            onClick={() => setEditingUser(u)}
                            style={{ border: 'none', background: 'var(--surface-hover)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', color: 'var(--text1)' }}
                          >
                            עריכה
                          </button>
                          <button 
                            onClick={() => setResetPasswordUser(u)}
                            style={{ border: 'none', background: 'var(--surface-hover)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', color: '#F59E0B' }}
                          >
                            איפוס סיסמה
                          </button>
                          <button 
                            onClick={() => setShowConfirmDelete(u._id)}
                            style={{ border: 'none', background: '#FEF2F2', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', color: '#EF4444' }}
                          >
                            מחיקה
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
                    אין משתמשים במערכת.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon n="link" s={24} c="var(--accent)" />
          קישורי הרשמה (Promo Codes)
        </h2>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>סוג מנוי</label>
            <select className="input" value={promoTier} onChange={(e) => setPromoTier(e.target.value as any)}>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>מקסימום שימושים</label>
            <input type="number" min="1" className="input" value={promoMaxUses} onChange={(e) => setPromoMaxUses(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>אורך מנוי (חודשים)</label>
            <input type="number" min="1" className="input" value={promoDuration} onChange={(e) => setPromoDuration(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>תוקף הקוד (ימים)</label>
            <input type="number" min="1" max="365" className="input" value={promoValidity} onChange={(e) => setPromoValidity(Number(e.target.value))} />
          </div>
          <Btn variant="primary" onClick={handleGeneratePromo} style={{ height: 42 }}>
            <Icon n="plus" s={18} /> צור קוד חדש
          </Btn>
        </div>

        {promoCodes !== undefined && promoCodes.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text3)', fontSize: 13 }}>
                  <th style={{ padding: 12, fontWeight: 600 }}>קוד</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>קישור הרשמה</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>מנוי</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>אורך מנוי</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>פג תוקף הקוד</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>שימושים</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((p) => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?promo=${p.code}`;
                  const isExpired = Date.now() > p.expiresAt;
                  const isFullyUsed = p.currentUses >= p.maxUses;
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border)', opacity: isFullyUsed ? 0.6 : 1 }}>
                      <td style={{ padding: 12, fontWeight: 'bold' }}>{p.code}</td>
                      <td style={{ padding: 12 }}>
                        <Btn variant="outline" onClick={() => { navigator.clipboard.writeText(link); alert('הקישור הועתק!'); }} style={{ padding: '4px 8px', fontSize: 12 }}>
                          <Icon n="copy" s={14} /> העתק קישור
                        </Btn>
                      </td>
                      <td style={{ padding: 12 }}>{p.tier === 'premium' ? 'Premium' : 'Pro'}</td>
                      <td style={{ padding: 12 }}>{p.subscriptionDurationMonths} חודשים</td>
                      <td style={{ padding: 12, color: isExpired && !isFullyUsed ? '#EF4444' : 'inherit' }}>
                        {new Date(p.expiresAt).toLocaleDateString('he-IL')}
                      </td>
                      <td style={{ padding: 12 }}>{p.currentUses} / {p.maxUses}</td>
                      <td style={{ padding: 12 }}>
                        {isFullyUsed ? (
                          <span style={{ color: 'var(--text3)' }}>נוצל במלואו</span>
                        ) : isExpired ? (
                          <span style={{ color: '#EF4444' }}>פג תוקף</span>
                        ) : (
                          <span style={{ color: '#22C55E' }}>פעיל</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!!editingUser && (
        <Modal onClose={() => setEditingUser(null)} title="עריכת משתמש">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 600 }}>{editingUser.name || 'ללא שם'}</div>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>סוג מנוי</label>
              <select 
                value={editingUser.subscriptionTier || 'none'}
                onChange={(e) => setEditingUser({ ...editingUser, subscriptionTier: e.target.value === 'none' ? undefined : e.target.value })}
                className="input"
                style={{ width: '100%', padding: '10px' }}
              >
                <option value="none">ללא מנוי</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>סטטוס השעיה</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  type="checkbox" 
                  checked={!!editingUser.isSuspended}
                  onChange={(e) => setEditingUser({ ...editingUser, isSuspended: e.target.checked })}
                  id="suspend-checkbox"
                />
                <label htmlFor="suspend-checkbox" style={{ color: '#EF4444', fontWeight: 600 }}>השעה משתמש זה</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <Btn 
                variant="primary" 
                onClick={async () => {
                  await updateUserStatus({
                    userId: editingUser._id,
                    isSuspended: editingUser.isSuspended,
                    subscriptionTier: editingUser.subscriptionTier,
                  });
                  setEditingUser(null);
                }}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                שמור שינויים
              </Btn>
              <Btn variant="outline" onClick={() => setEditingUser(null)} style={{ flex: 1, justifyContent: 'center' }}>
                ביטול
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {!!resetPasswordUser && (
        <Modal onClose={() => { setResetPasswordUser(null); setNewPassword(''); }} title="איפוס סיסמה">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 14 }}>
              אתה עומד לשנות את הסיסמה עבור <strong>{resetPasswordUser.name || resetPasswordUser.email}</strong>.
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)', fontWeight: 600 }}>סיסמה חדשה</label>
              <input
                type="text"
                placeholder="הכנס סיסמה זמנית..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
              />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                * חובה לפחות 8 תווים
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <Btn 
                variant="primary" 
                onClick={async () => {
                  if (newPassword.length < 8) return;
                  try {
                    await forceResetPassword({
                      userId: resetPasswordUser._id,
                      email: resetPasswordUser.email,
                      newPassword: newPassword,
                    });
                    alert('הסיסמה שונתה בהצלחה!');
                    setResetPasswordUser(null);
                    setNewPassword('');
                  } catch (e: any) {
                    alert('שגיאה: ' + e.message);
                  }
                }}
                disabled={newPassword.length < 8}
                style={{ flex: 1, justifyContent: 'center', background: '#F59E0B', borderColor: '#F59E0B' }}
              >
                שנה סיסמה
              </Btn>
              <Btn variant="outline" onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} style={{ flex: 1, justifyContent: 'center' }}>
                ביטול
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {!!showConfirmDelete && (
        <Modal onClose={() => setShowConfirmDelete(null)} title="מחיקת משתמש לצמיתות">
          <div style={{ color: '#EF4444', marginBottom: 16 }}>
            <Icon n="alert-triangle" s={32} style={{ marginBottom: 12, display: 'block' }} />
            אזהרה: הפעולה תמחק את המשתמש, את כל הפרויקטים שלו, את התמונות, הקבצים וכל מידע אחר שקשור אליו באופן בלתי הפיך.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="primary" onClick={handleDelete} style={{ flex: 1, justifyContent: 'center', background: '#EF4444', borderColor: '#EF4444' }}>
              כן, מחק משתמש ופרויקטים
            </Btn>
            <Btn variant="outline" onClick={() => setShowConfirmDelete(null)} style={{ flex: 1, justifyContent: 'center' }}>
              ביטול
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
