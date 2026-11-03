import * as React from 'react';
import { Badge, Btn, Icon } from '../../Shared';
import { fmtMoney } from '../../../utils/mockData';
import { getFloorLabel } from '../../../screens/ProjectSetupScreen';
import { demoProject, type DemoBOQItem } from '../demoProject';

/**
 * Interactive preview of BOQScreen powered by `demoProject`.
 * Users can switch rooms, toggle item approval status, and mark items paid/unpaid in local state.
 */
export const BOQPreview = () => {
  const [roomUid, setRoomUid] = React.useState<string>(demoProject.rooms[0].uid);
  const [itemsByRoom, setItemsByRoom] = React.useState<Record<string, DemoBOQItem[]>>(
    () => structuredClone(demoProject.boqItemsByRoom) as Record<string, DemoBOQItem[]>,
  );

  const roomItems = itemsByRoom[roomUid] || [];
  const allItems = Object.values(itemsByRoom).flat();

  const roomTotal = roomItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const roomPaid = roomItems.filter((i) => i.paid).reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const allTotal = allItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const allPaid = allItems.filter((i) => i.paid).reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

  const cats = Array.from(new Set(roomItems.map((i) => i.cat)));

  const toggleStatus = (itemId: string) => {
    setItemsByRoom((prev) => ({
      ...prev,
      [roomUid]: (prev[roomUid] || []).map((i) =>
        i.id === itemId
          ? { ...i, status: i.status === 'approved' ? ('pending' as const) : ('approved' as const) }
          : i,
      ),
    }));
  };

  const togglePaid = (itemId: string) => {
    setItemsByRoom((prev) => ({
      ...prev,
      [roomUid]: (prev[roomUid] || []).map((i) =>
        i.id === itemId
          ? { ...i, paid: !i.paid, paidAt: !i.paid ? '03/11/2026' : undefined }
          : i,
      ),
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Room selector + totals bar (matches BOQScreen) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'var(--surface)',
          padding: '14px 18px',
          borderRadius: 12,
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 700, color: 'var(--text1)' }}>
            <span>בחר חדר:</span>
            <select
              aria-label="בחירת חדר"
              className="bp-input"
              value={roomUid}
              onChange={(e) => setRoomUid(e.target.value)}
              style={{ width: 'auto', minWidth: 230, paddingBlock: 8 }}
            >
              {demoProject.rooms.map((r) => (
                <option key={r.uid} value={r.uid}>
                  {r.name} ({getFloorLabel(r.floor, demoProject.housingUnits)} · {r.size} מ"ר)
                </option>
              ))}
            </select>
          </label>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
            לחץ על סטטוס או כפתור תשלום בטבלה כדי להתנסות בעדכון חי
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>סה"כ חדר:</span>
            <strong style={{ color: 'var(--text1)', fontSize: 14 }}>{fmtMoney(roomTotal)}</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>כלל הבית:</span>
            <strong style={{ color: 'var(--text1)', fontSize: 14 }}>{fmtMoney(allTotal)}</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--success)', background: 'var(--success-light)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>שולם בחדר:</span>
            <strong style={{ fontSize: 14 }}>{fmtMoney(roomPaid)}</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--success)', background: 'var(--success-light)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>שולם בכלל הבית:</span>
            <strong style={{ fontSize: 14 }}>{fmtMoney(allPaid)}</strong>
          </div>
        </div>
      </div>

      {/* Category tables */}
      {cats.map((cat) => {
        const catItems = roomItems.filter((i) => i.cat === cat);
        const catSum = catItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
        return (
          <div key={cat} className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header" style={{ fontSize: 13.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px' }}>
              <span>{cat}</span>
              <span style={{ fontWeight: 700, color: 'var(--text2)' }}>{fmtMoney(catSum)}</span>
            </div>
            <div tabIndex={0} role="region" aria-label={`פריטי ${cat}`} className="teaser-table-wrap">
              <table className="teaser-table">
                <colgroup>
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '13%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>פריט / מפרט</th>
                    <th>כמות</th>
                    <th>מחיר יח׳</th>
                    <th>סה"כ</th>
                    <th>ספק</th>
                    <th>סטטוס</th>
                    <th>תשלום</th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((i) => (
                    <tr key={i.id}>
                      <th scope="row" style={{ whiteSpace: 'normal', maxWidth: 420 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5, lineHeight: 1.4 }}>
                          {'isLocked' in i && i.isLocked && <Icon n="lock" s={12} c="var(--text3)" />}
                          <span>{i.name}</span>
                        </div>
                        {i.spec && <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 400, marginTop: 4, lineHeight: 1.45 }}>{i.spec}</div>}
                        {i.notes && <div style={{ fontSize: 11.5, color: 'var(--text3)', fontWeight: 400, marginTop: 3, lineHeight: 1.4 }}>הערות: {i.notes}</div>}
                      </th>
                      <td data-label="כמות">{i.qty} {i.unit}</td>
                      <td data-label="מחיר יח׳">{fmtMoney(i.unitPrice)}</td>
                      <td data-label="סה״כ" style={{ fontWeight: 700 }}>{fmtMoney(i.qty * i.unitPrice)}</td>
                      <td data-label="ספק" style={{ color: 'var(--text2)' }}>{i.supplier}</td>
                      <td data-label="סטטוס">
                        <button
                          type="button"
                          onClick={() => toggleStatus(i.id)}
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                          title="לחץ להחלפת סטטוס בדמו"
                        >
                          <Badge type={i.status === 'approved' ? 'done' : 'pending'}>
                            {i.status === 'approved' ? 'מאושר' : 'ממתין'}
                          </Badge>
                        </button>
                      </td>
                      <td data-label="תשלום">
                        {i.paid ? (
                          <Btn size="sm" variant="ghost" onClick={() => togglePaid(i.id)} style={{ color: 'var(--success)', whiteSpace: 'nowrap' }}>
                            <Icon n="check" s={13} /> שולם{i.paidAt ? ` · ${i.paidAt}` : ''}
                          </Btn>
                        ) : (
                          <Btn size="sm" variant="ghost" onClick={() => togglePaid(i.id)} style={{ whiteSpace: 'nowrap' }}>
                            <Icon n="check" s={13} /> סמן כשולם
                          </Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};
