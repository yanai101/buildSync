import React from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Modal, Btn, NumberInput } from './Shared';
import { PLANNED_COST_PHASES } from '../utils/plannedCostsCatalog';

type Props = {
  projectId: Id<'projects'>;
  existingDescriptions: Set<string>;
  onClose: () => void;
  onDone: (added: number) => void;
};

export const PlannedCostsModal = ({ projectId, existingDescriptions, onClose, onDone }: Props) => {
  const addPlannedCosts = useMutation(api.budget.addPlannedCosts);
  // item name → estimate (undefined = selected with no estimate yet)
  const [selected, setSelected] = React.useState<Map<string, number | undefined>>(() => new Map());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(name)) next.delete(name);
      else next.set(name, undefined);
      return next;
    });
  };

  const setAmount = (name: string, amount: number | undefined) => {
    setSelected((prev) => new Map(prev).set(name, amount));
  };

  const handleSave = async () => {
    const items = PLANNED_COST_PHASES.flatMap((phase) =>
      phase.items
        .filter((item) => selected.has(item.name))
        .map((item) => ({
          category: phase.category,
          color: phase.color,
          description: item.name,
          amount: selected.get(item.name) ?? 0,
        })),
    );
    if (items.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const { added } = await addPlannedCosts({ projectId, items });
      onDone(added);
    } catch (e) {
      console.error('Failed to add planned costs', e);
      setError('לא הצלחנו להוסיף את העלויות. נסו שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="עלויות שנוטים לשכוח" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          סמנו עלויות שרלוונטיות לכם והזינו הערכה. הן יתווספו כהוצאות בסטטוס "ממתין", וכשתשלמו תעדכנו את הסכום בפועל.
        </div>

        <div style={{ maxHeight: '55vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {PLANNED_COST_PHASES.map((phase) => (
            <div key={phase.category}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: phase.color }} />
                {phase.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {phase.items.map((item) => {
                  const exists = existingDescriptions.has(item.name);
                  const isSelected = selected.has(item.name);
                  return (
                    <div
                      key={item.name}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                        background: isSelected ? 'var(--accent-light)' : 'var(--surface-2)',
                        opacity: exists ? 0.55 : 1,
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: exists ? 'default' : 'pointer', minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={exists || isSelected}
                          disabled={exists}
                          onChange={() => toggle(item.name)}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, color: 'var(--text1)' }}>{item.name}</div>
                          {item.tip && <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{item.tip}</div>}
                          {exists && <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>כבר בתקציב</div>}
                        </div>
                      </label>
                      {isSelected && (
                        <NumberInput
                          className="bp-input"
                          value={selected.get(item.name)}
                          onChange={(v: number | undefined) => setAmount(item.name, v)}
                          placeholder="הערכה ₪"
                          style={{ width: 120, flexShrink: 0 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <Btn variant="ghost" onClick={onClose}>ביטול</Btn>
          <Btn onClick={handleSave} disabled={saving || selected.size === 0}>
            {saving ? 'שומר...' : `הוסף ${selected.size || ''} לתקציב`}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};
