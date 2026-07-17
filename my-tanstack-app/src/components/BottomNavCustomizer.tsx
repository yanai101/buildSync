import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from './Shared'
import { NAV } from './Layout'
import { useBottomNavShortcuts } from '~/hooks/useBottomNavShortcuts'

// Nav items that are always fixed — cannot be chosen as shortcuts
const FIXED_IDS = new Set(['/dashboard', '/boqwizard', '/daily-logs', '/projects'])

// Items that are premium-only routes
const PREMIUM_IDS = new Set([
  '/analytics', '/orders', '/boq', '/boqwizard', '/permits', '/daily-logs', '/personal-files'
])

interface Props {
  onClose: () => void
  isProOrPremium: boolean
  /** nav ids accessible by the user's role */
  allowedIds: string[]
}

export function BottomNavCustomizer({ onClose, isProOrPremium, allowedIds }: Props) {
  const [shortcuts, setShortcuts] = useBottomNavShortcuts()
  const [selected, setSelected] = React.useState<string[]>(shortcuts)

  const candidates = NAV.filter(n => !FIXED_IDS.has(n.id))

  function toggleItem(id: string) {
    const isPremiumLocked = PREMIUM_IDS.has(id) && !isProOrPremium
    if (isPremiumLocked) return
    if (!allowedIds.includes(id)) return

    setSelected(prev => {
      if (prev.includes(id)) {
        // deselect
        return prev.filter(x => x !== id)
      }
      if (prev.length < 2) {
        return [...prev, id]
      }
      // replace oldest (FIFO)
      return [prev[1], id]
    })
  }

  function handleSave() {
    // ensure exactly 2 (pad with defaults if needed)
    let final = [...selected]
    if (final.length === 0) final = ['/photos', '/notes']
    if (final.length === 1) final = [final[0], final[0] === '/photos' ? '/notes' : '/photos']
    setShortcuts(final)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        padding: 0
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--surface)',
          borderRadius: '24px 24px 0 0',
          overflow: 'hidden',
          direction: 'rtl',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)' }}>קיצורי דרך מהירים</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3 }}>
                בחרו עד 2 קיצורים שיופיעו בסרגל התחתון
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text3)' }}
            >
              <Icon n="x" s={20} />
            </button>
          </div>

          {/* Selected preview */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {[0, 1].map(i => {
              const id = selected[i]
              const item = id ? NAV.find(n => n.id === id) : null
              return (
                <div
                  key={i}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 12,
                    background: item ? 'rgba(224,122,56,0.08)' : 'var(--bg)',
                    border: `1.5px ${item ? 'solid rgba(224,122,56,0.35)' : 'dashed var(--border)'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  {item ? (
                    <>
                      <Icon n={item.icon} s={16} c="var(--accent)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{item.label}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>קיצור {i + 1}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Items list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          {/* Group by section */}
          {Array.from(new Set(candidates.map(n => n.section))).map(section => (
            <div key={section} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, padding: '0 8px', letterSpacing: 0.5 }}>
                {section}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {candidates.filter(n => n.section === section).map(item => {
                  const isSelected = selected.includes(item.id)
                  const isRoleLocked = !allowedIds.includes(item.id)
                  const isPremiumLocked = PREMIUM_IDS.has(item.id) && !isProOrPremium
                  const isLocked = isRoleLocked || isPremiumLocked
                  const isDisabled = isLocked

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      disabled={isDisabled && !isSelected}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 14px', borderRadius: 12,
                        border: isSelected
                          ? '1.5px solid var(--accent)'
                          : '1.5px solid transparent',
                        background: isSelected
                          ? 'rgba(224,122,56,0.08)'
                          : isDisabled ? 'transparent' : 'var(--bg)',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.45 : 1,
                        transition: 'all 0.15s',
                        textAlign: 'right',
                        fontFamily: 'inherit',
                        width: '100%'
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: isSelected ? 'rgba(224,122,56,0.15)' : 'var(--surface)',
                        border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon n={item.icon} s={17} c={isSelected ? 'var(--accent)' : 'var(--text2)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: isDisabled ? 'var(--text3)' : 'var(--text1)' }}>
                          {item.label}
                        </div>
                        {isPremiumLocked && (
                          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 1 }}>
                            🔒 דורש מנוי Pro
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--accent)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Icon n="check" s={12} c="#fff" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <button
            onClick={handleSave}
            style={{
              width: '100%', padding: '13px 20px', borderRadius: 14,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'opacity 0.2s'
            }}
          >
            שמור קיצורים
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
