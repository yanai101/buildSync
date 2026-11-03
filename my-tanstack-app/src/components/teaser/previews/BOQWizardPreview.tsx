import * as React from 'react';
import { Btn, Icon } from '../../Shared';
import { getFloorLabel } from '../../../screens/ProjectSetupScreen';
import {
  aggregateWizardItems,
  applyWaste,
  FLOOR_CATEGORY,
  WALL_TILE_CATEGORY,
} from '../../../utils/boqCalculations';
import { demoProject, DEMO_WASTE_PCT } from '../demoProject';

const WIZARD_ROOM_IDS = ['r_master_bath', 'r_kitchen', 'r_living'] as const;

/**
 * Interactive preview of BOQWizardScreen powered by `demoProject` and shared
 * calculation helpers (`applyWaste`, `aggregateWizardItems`).
 */
export const BOQWizardPreview = () => {
  const wizardRooms = React.useMemo(
    () => demoProject.rooms.filter((r) => WIZARD_ROOM_IDS.includes(r.uid as any)),
    [],
  );
  const [view, setView] = React.useState<'wizard' | 'summary'>('wizard');
  const [step, setStep] = React.useState(0);
  const [allItems, setAllItems] = React.useState<Record<string, any[]>>(
    () => structuredClone(demoProject.wizardItemsByRoom) as Record<string, any[]>,
  );

  const currentRoom = wizardRooms[step] ?? wizardRooms[0];
  const roomItems = allItems[currentRoom.uid] || [];
  const cats = Array.from(new Set(roomItems.map((i) => i.cat)));

  const changeQty = (itemId: string, delta: number) => {
    setAllItems((prev) => ({
      ...prev,
      [currentRoom.uid]: (prev[currentRoom.uid] || []).map((item) => {
        if (item.id !== itemId) return item;
        if (item.isLocked && item.cat === WALL_TILE_CATEGORY) {
          const nextBase = Math.max(1, Number(item.userQty ?? 26) + delta);
          return { ...item, userQty: nextBase, qty: applyWaste(nextBase, DEMO_WASTE_PCT) };
        }
        const next = Math.max(0, Number(item.userQty ?? item.qty ?? 0) + delta);
        return { ...item, userQty: next, qty: next };
      }),
    }));
  };

  if (view === 'summary') {
    const aggregated = aggregateWizardItems(wizardRooms, allItems, demoProject.housingUnits);
    const summaryCats = Array.from(new Set(Object.values(aggregated).map((i) => i.cat)));
    const totalFlooring = Object.values(aggregated)
      .filter((i) => i.cat === FLOOR_CATEGORY || i.cat === WALL_TILE_CATEGORY)
      .reduce((a, c) => a + c.total, 0);
    const totalLights = Object.values(aggregated)
      .filter((i) => i.cat === 'תאורה')
      .reduce((a, c) => a + c.total, 0);
    const totalSockets = Object.values(aggregated)
      .filter((i) => i.cat === 'חשמל')
      .reduce((a, c) => a + c.total, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h4 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>רשימת יבוא מרוכזת</h4>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>כל הכמויות המאוחדות לפי קטגוריה — מוכן לרכישה</div>
          </div>
          <Btn size="sm" variant="ghost" onClick={() => setView('wizard')}>
            <Icon n="arrow-right" s={14} /> חזרה לאשף החדרים
          </Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          {[
            { label: 'סה"כ ריצוף וחיפוי', val: `${totalFlooring} מ"ר`, color: 'var(--accent)' },
            { label: 'נקודות תאורה', val: `${totalLights} יח׳`, color: 'var(--accent)' },
            { label: 'נקודות חשמל', val: `${totalSockets} יח׳`, color: 'var(--success)' },
            { label: 'חדרים באשף', val: `${wizardRooms.length} חדרים`, color: 'var(--text1)' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {summaryCats.map((cat) => (
          <div key={cat} className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header" style={{ fontSize: 13.5, padding: '14px 18px' }}>{cat}</div>
            <div tabIndex={0} role="region" aria-label={`סיכום ${cat}`} className="teaser-table-wrap">
              <table className="teaser-table">
                <thead>
                  <tr>
                    <th>פריט</th>
                    <th>סה"כ להזמנה</th>
                    <th>פירוט לפי חדר</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(aggregated)
                    .filter((i) => i.cat === cat)
                    .map((item) => (
                      <tr key={`${item.name}-${item.cat}`}>
                        <th scope="row" style={{ whiteSpace: 'normal' }}>{item.name}</th>
                        <td data-label="סה״כ להזמנה" style={{ fontWeight: 800, color: 'var(--accent)' }}>
                          {item.total} {item.unit}
                        </td>
                        <td data-label="פירוט לפי חדר" style={{ whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {item.rooms.map((r, ri) => (
                              <span key={ri} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text2)', fontWeight: 600 }}>
                                {r.name}: {r.qty}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Room pills + Summary toggle */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div role="tablist" aria-label="חדרים באשף" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {wizardRooms.map((r, idx) => {
            const active = step === idx;
            return (
              <button
                key={r.uid}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStep(idx)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-light)' : 'var(--surface)',
                  color: active ? 'var(--text1)' : 'var(--text2)',
                  fontWeight: active ? 700 : 500,
                  fontSize: 13.5,
                }}
              >
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: active ? 'var(--accent)' : 'var(--border)', color: active ? '#fff' : 'var(--text3)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>
                  {idx + 1}
                </span>
                <span>{r.name} ({r.size} מ"ר)</span>
              </button>
            );
          })}
        </div>

        <Btn size="sm" onClick={() => setView('summary')} style={{ background: 'var(--success)', borderColor: 'var(--success)' }}>
          <Icon n="download" s={14} /> צפה ברשימת יבוא מרוכזת
        </Btn>
      </div>

      {/* Room header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: 'var(--surface)', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text1)' }}>{currentRoom.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 3, lineHeight: 1.45 }}>
            {getFloorLabel(currentRoom.floor, demoProject.housingUnits)} · שטח חדר: {currentRoom.size} מ"ר · פחת ריצוף מוגדר: {DEMO_WASTE_PCT}%
          </div>
        </div>
        <Btn
          size="sm"
          variant="ghost"
          onClick={() => {
            if (step < wizardRooms.length - 1) setStep((s) => s + 1);
            else setView('summary');
          }}
        >
          {step === wizardRooms.length - 1 ? 'לרשימת היבוא המרוכזת' : 'לחדר הבא'}
          <Icon n="chevron-left" s={14} />
        </Btn>
      </div>

      {/* Category items */}
      {cats.map((cat) => (
        <div key={cat} className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header" style={{ fontSize: 13.5, display: 'flex', justifyContent: 'space-between', padding: '14px 18px' }}>
            <span>{cat}</span>
            <span style={{ fontWeight: 500, color: 'var(--text3)' }}>
              {roomItems.filter((i) => i.cat === cat).length} פריטים
            </span>
          </div>
          <div>
            {roomItems
              .filter((i) => i.cat === cat)
              .map((item) => {
                const locked = item.isLocked === true;
                const isWallTile = item.cat === WALL_TILE_CATEGORY;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: 'var(--text1)', lineHeight: 1.4 }}>
                        <span>{item.name}</span>
                        {locked && <Icon n="lock" s={12} c="var(--text3)" />}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 4, lineHeight: 1.45 }}>
                        {locked
                          ? isWallTile
                            ? `שטח חיפוי ${item.userQty} מ"ר × ${DEMO_WASTE_PCT}% פחת = ${item.qty} מ"ר להזמנה`
                            : `מחושב אוטומטית: ${currentRoom.size} מ"ר × ${DEMO_WASTE_PCT}% פחת = ${item.qty} מ"ר להזמנה`
                          : item.notes}
                      </div>
                      {item.spec && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, lineHeight: 1.4 }}>מפרט: {item.spec}</div>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {locked && !isWallTile ? (
                        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent)', padding: '6px 12px', borderRadius: 8, background: 'var(--accent-light)', whiteSpace: 'nowrap' }}>
                          {item.qty} {item.unit}
                        </span>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '5px 10px' }}>
                          <button
                            type="button"
                            aria-label={`הפחת ${item.name}`}
                            onClick={() => changeQty(item.id, -1)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text1)', cursor: 'pointer', fontWeight: 800 }}
                          >
                            -
                          </button>
                          <span style={{ minWidth: 58, textAlign: 'center', fontWeight: 800, fontSize: 14, color: 'var(--text1)', whiteSpace: 'nowrap' }}>
                            {item.qty} {item.unit}
                          </span>
                          <button
                            type="button"
                            aria-label={`הוסף ${item.name}`}
                            onClick={() => changeQty(item.id, 1)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text1)', cursor: 'pointer', fontWeight: 800 }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};
