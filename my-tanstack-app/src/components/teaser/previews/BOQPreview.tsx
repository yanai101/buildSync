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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Room selector + totals bar (matches BOQScreen) */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: 'var(--surface)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
          <span>חדר:</span>
          <select
            aria-label="בחירת חדר"
            className="bp-input"
            value={roomUid}
            onChange={(e) => setRoomUid(e.target.value)}
            style={{ width: 'auto', minWidth: 190 }}
          >
            {demoProject.rooms.map((r) => (
              <option key={r.uid} value={r.uid}>
                {r.name} ({getFloorLabel(r.floor, demoProject.housingUnits)} · {r.size} מ"ר)
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', rowGap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>
            סה"כ חדר: <strong>{fmtMoney(roomTotal)}</strong>
          </span>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>
            כלל הבית: <strong>{fmtMoney(allTotal)}</strong>
          </span>
          <span style={{ fontSize: 13, color: 'var(--success)' }}>
            שולם בחדר: <strong>{fmtMoney(roomPaid)}</strong>
          </span>
          <span style={{ fontSize: 13, color: 'var(--success)' }}>
            שולם בכלל הבית: <strong>{fmtMoney(allPaid)}</strong>
          </span>
        </div>
      </div>

      {/* Category tables */}
      {cats.map((cat) => {
        const catItems = roomItems.filter((i) => i.cat === cat);
        const catSum = catItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
        return (
          <div key={cat} className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header" style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{cat}</span>
              <span style={{ fontWeight: 600, color: 'var(--text2)' }}>{fmtMoney(catSum)}</span>
            </div>
            <div tabIndex={0} role="region" aria-label={`פריטי ${cat}`} className="teaser-table-wrap">
              <table className="teaser-table">
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
                      <th scope="row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                          {'isLocked' in i && i.isLocked && <Icon n="lock" s={12} c="var(--text3)" />}
                          <span>{i.name}</span>
                        </div>
                        {i.spec && <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400, marginTop: 2 }}>{i.spec}</div>}
                        {i.notes && <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400, marginTop: 2 }}>הערות: {i.notes}</div>}
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
                          <Btn size="sm" variant="ghost" onClick={() => togglePaid(i.id)} style={{ color: 'var(--success)' }}>
                            <Icon n="check" s={13} /> שולם{i.paidAt ? ` · ${i.paidAt}` : ''}
                          </Btn>
                        ) : (
                          <Btn size="sm" variant="ghost" onClick={() => togglePaid(i.id)}>
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
