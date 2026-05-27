import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Btn, Icon, Modal } from './Shared';

interface CreateProjectWizardProps {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

export function CreateProjectWizard({ onClose, onSave, saving }: CreateProjectWizardProps) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    name: '',
    address: '',
    startDate: new Date().toISOString().split('T')[0],
    expectedEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    floors: 1,
    areaSqm: 0,
    ownerName: '',
    managerName: '',
    inspectorName: '',
    budgetTotal: 0,
    floorWastePct: 15,
  });

  const STEPS = [
    { title: "בסיס", icon: "home" },
    { title: "מבנה", icon: "layers" },
    { title: "צוות", icon: "users" },
    { title: "תקציב", icon: "chart" }
  ];

  const update = (fields: Partial<typeof data>) => setData(prev => ({ ...prev, ...fields }));

  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
  };

  const isValid = () => {
    if (step === 0) return data.name.length > 2 && data.address.length > 2;
    return true;
  };

  return (
    <Modal title="יצירת פרויקט חדש" onClose={onClose} width={500}>
      <div style={{ padding: '10px 0' }}>
        {/* Stepper */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 18, left: 20, right: 20, height: 2, background: 'var(--border)', zIndex: 0 }} />
          <div 
            style={{ 
              position: 'absolute', 
              top: 18, 
              left: 20, 
              width: `${(step / (STEPS.length - 1)) * 400}px`, 
              height: 2, 
              background: 'var(--accent)', 
              zIndex: 0,
              transition: 'width 0.3s ease'
            }} 
          />
          
          {STEPS.map((s, i) => (
            <div key={i} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div 
                style={{ 
                  width: 38, 
                  height: 38, 
                  borderRadius: '50%', 
                  background: step === i ? 'var(--accent)' : i < step ? 'var(--success)' : 'var(--surface)', 
                  border: `2px solid ${step === i ? 'var(--accent)' : i < step ? 'var(--success)' : 'var(--border)'}`,
                  color: step === i || i < step ? '#fff' : 'var(--text3)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  cursor: i < step ? 'pointer' : 'default'
                }}
                onClick={() => i < step && setStep(i)}
              >
                {i < step ? <Icon n="check" s={18} /> : <Icon n={s.icon} s={18} />}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: step === i ? 'var(--text1)' : 'var(--text3)' }}>{s.title}</span>
            </div>
          ))}
        </div>

        <div style={{ minHeight: 320 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>בוא נתחיל מהבסיס</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ flex: '1 1 100%' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>שם הפרויקט</div>
                      <input 
                        className="bp-input" 
                        value={data.name} 
                        onChange={e => update({ name: e.target.value })}
                        placeholder="לדוג׳: הבית ברחוב הרצל"
                        style={{ width: '100%' }}
                        autoFocus
                      />
                    </div>
                    <div style={{ flex: '1 1 100%' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>כתובת</div>
                      <input 
                        className="bp-input" 
                        value={data.address} 
                        onChange={e => update({ address: e.target.value })}
                        placeholder="עיר, רחוב ומספר בית"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>תאריך תחילת עבודה</div>
                      <input 
                        className="bp-input" 
                        type="date"
                        value={data.startDate} 
                        onChange={e => update({ startDate: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>צפי סיום</div>
                      <input 
                        className="bp-input" 
                        type="date"
                        value={data.expectedEnd} 
                        onChange={e => update({ expectedEnd: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>מבנה ושטח</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ flex: '1 1 140px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>מספר קומות</div>
                      <select
                        className="bp-input"
                        value={data.floors}
                        onChange={e => update({ floors: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      >
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'קומה' : 'קומות'}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: '1 1 140px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>שטח בנוי משוער (מ"ר)</div>
                      <input
                        className="bp-input"
                        type="number"
                        value={data.areaSqm || ''}
                        onChange={e => update({ areaSqm: Number(e.target.value) })}
                        placeholder="לדוג׳: 180"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 140px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>אחוז פחת לריצוף (%)</div>
                      <input
                        className="bp-input"
                        type="number"
                        min={0}
                        max={50}
                        value={data.floorWastePct}
                        onChange={e => update({ floorWastePct: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>מומלץ 15%</div>
                    </div>
                  </div>
                  <div style={{ background: '#FEF3C7', padding: 16, borderRadius: 12, border: '1px solid #FCD34D' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Icon n="alert" s={18} c="#B45309" />
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: '#78350F' }}>
                        <strong>שים לב:</strong> אחוז הפחת ייקבע פעם אחת ולא ניתן יהיה לשנותו לאחר יצירת הפרויקט. ערך זה משפיע על כל כמויות הריצוף בכל החדרים.
                      </div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--accent-light)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Icon n="info" s={18} c="var(--accent)" />
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                        <strong>טיפ:</strong> אל תדאג לגבי הדיוק המוחלט כרגע. תוכל להוסיף חדרים מדויקים בהגדרות הבית מאוחר יותר.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>מי המעורבים?</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>בעל הבית</div>
                      <input 
                        className="bp-input" 
                        value={data.ownerName} 
                        onChange={e => update({ ownerName: e.target.value })}
                        placeholder="שם בעל הבית"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>מנהל פרויקט</div>
                      <input 
                        className="bp-input" 
                        value={data.managerName} 
                        onChange={e => update({ managerName: e.target.value })}
                        placeholder="שם מנהל הפרויקט"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>מפקח בנייה</div>
                    <input 
                      className="bp-input" 
                      value={data.inspectorName} 
                      onChange={e => update({ inspectorName: e.target.value })}
                      placeholder="שם המפקח"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>מסגרת תקציב</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>תקציב כולל משוער (₪)</div>
                    <input 
                      className="bp-input" 
                      type="number"
                      value={data.budgetTotal || ''} 
                      onChange={e => update({ budgetTotal: Number(e.target.value) })}
                      placeholder="לדוג׳: 1500000"
                      style={{ width: '100%', fontSize: 24, fontWeight: 800 }}
                    />
                    {data.budgetTotal > 0 && (
                      <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '8px 12px', borderRadius: 8, textAlign: 'center' }}>
                        {formatCurrency(data.budgetTotal)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Icon n="check" s={32} />
                    </div>
                    <div style={{ fontWeight: 700 }}>אנחנו מוכנים לצאת לדרך!</div>
                    <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>כל הפרטים שהזנת יעזרו לנו לבנות לך דשבורד מותאם אישית.</div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <Btn variant="ghost" onClick={step === 0 ? onClose : prev}>
            {step === 0 ? 'ביטול' : 'חזור'}
          </Btn>
          
          <Btn 
            onClick={step === STEPS.length - 1 ? () => onSave(data) : next} 
            disabled={!isValid() || saving}
          >
            {saving ? 'יוצר...' : step === STEPS.length - 1 ? 'צור פרויקט' : 'המשך'}
            {!saving && step < STEPS.length - 1 && (
              <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
                <Icon n="chevron-right" s={14} />
              </span>
            )}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
