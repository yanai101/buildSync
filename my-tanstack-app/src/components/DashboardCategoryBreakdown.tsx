import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Icon, ProgressBar, Btn, Modal } from './Shared';
import { fmtMoney } from '../utils/mockData';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ── localStorage helpers ─────────────────────────────────────────────── */
const STORAGE_KEY_PREFIX = 'dashboard_pinned_categories_';
const getStorageKey = (projectId: string) => `${STORAGE_KEY_PREFIX}${projectId}`;

function loadPinned(projectId: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePinned(projectId: string, ids: string[]) {
  try {
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(ids));
  } catch {}
}

/* ── Animation variants ───────────────────────────────────────────────── */
const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const itemV = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

/* ── Types ─────────────────────────────────────────────────────────────── */
type Props = {
  projectId: string;
};

/* ── Component ─────────────────────────────────────────────────────────── */
export function DashboardCategoryBreakdown({ projectId }: Props) {
  const categories = useQuery(api.budget.listCategories, { projectId } as any);
  const [pinnedIds, setPinnedIds] = React.useState<string[]>(() => loadPinned(projectId));
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [draftPinned, setDraftPinned] = React.useState<string[]>([]);

  // Sync pinned IDs when projectId changes
  React.useEffect(() => {
    setPinnedIds(loadPinned(projectId));
  }, [projectId]);

  // Don't render until categories load
  if (categories === undefined) return null;
  // If the project has zero categories, don't show at all
  if (!categories || categories.length === 0) return null;

  /* ── Derived data ────────────────────────────────────────────────────── */
  const pinnedSet = new Set(pinnedIds);
  // Render in saved order: iterate pinnedIds to maintain user-defined sequence
  const catMap = new Map(categories.map((c: any) => [c._id, c]));
  const pinnedCategories = pinnedIds.map((id) => catMap.get(id)).filter(Boolean);

  const openSelector = () => {
    setDraftPinned([...pinnedIds]);
    setSelectorOpen(true);
  };

  const toggleDraft = (id: string) => {
    setDraftPinned((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const confirmSelection = () => {
    setPinnedIds(draftPinned);
    savePinned(projectId, draftPinned);
    setSelectorOpen(false);
  };

  const selectAll = () => {
    setDraftPinned(categories.map((c: any) => c._id));
  };

  const clearAll = () => {
    setDraftPinned([]);
  };

  const handleDraftReorder = (ids: string[]) => {
    setDraftPinned(ids);
  };

  /* ── Empty state ─────────────────────────────────────────────────────── */
  if (pinnedCategories.length === 0) {
    return (
      <motion.div
        variants={itemV}
        className="card"
        style={{ marginTop: 0 }}
      >
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon n="layers" s={16} c="var(--accent)" />
            פירוט קטגוריות תקציב
          </span>
          <button
            onClick={openSelector}
            style={{
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-glow-sm)',
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: "'Heebo', sans-serif",
            }}
          >
            <Icon n="plus" s={13} />
            הצמד קטגוריות
          </button>
        </div>
        <div
          style={{
            padding: '28px 22px',
            textAlign: 'center',
            color: 'var(--text3)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <div style={{ marginBottom: 8 }}>לא נבחרו קטגוריות להצגה בדשבורד.</div>
          <button
            onClick={openSelector}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: 13,
              fontFamily: "'Heebo', sans-serif",
            }}
          >
            בחר קטגוריות מהתקציב →
          </button>
        </div>

        {/* Selector modal */}
        {selectorOpen && (
          <CategorySelectorModal
            categories={categories}
            draftPinned={draftPinned}
            onToggle={toggleDraft}
            onReorder={handleDraftReorder}
            onConfirm={confirmSelection}
            onClose={() => setSelectorOpen(false)}
            onSelectAll={selectAll}
            onClearAll={clearAll}
          />
        )}
      </motion.div>
    );
  }

  /* ── Populated state ─────────────────────────────────────────────────── */
  return (
    <motion.div variants={itemV} className="card" style={{ marginTop: 0 }}>
      <div
        className="card-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon n="layers" s={16} c="var(--accent)" />
          פירוט קטגוריות תקציב
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--text3)',
              fontWeight: 600,
              background: 'var(--surface-2)',
              padding: '2px 8px',
              borderRadius: 12,
            }}
          >
            {pinnedCategories.length}
          </span>
        </span>
        <button
          onClick={openSelector}
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: "'Heebo', sans-serif",
            transition: 'all 0.15s',
          }}
        >
          <Icon n="settings" s={13} />
          ערוך
        </button>
      </div>

      {/* Category cards — responsive grid: 1→full, 2→two cols, 3+→max 3 per row */}
      <div className="card-body" style={{ paddingTop: 14, paddingBottom: 6 }}>
        <motion.div
          variants={containerV}
          initial="hidden"
          animate="show"
          style={{
            display: 'grid',
            gridTemplateColumns:
              pinnedCategories.length === 1
                ? '1fr'
                : pinnedCategories.length === 2
                  ? '1fr 1fr'
                  : 'repeat(auto-fill, minmax(max(180px, calc((100% - 24px) / 3)), 1fr))',
            gap: 12,
          }}
        >
          {pinnedCategories.map((c: any) => {
            const pct = c.budget ? Math.round((c.spent / c.budget) * 100) : 0;
            const over = c.spent > c.budget;
            return (
              <motion.div
                key={c._id}
                variants={itemV}
                whileHover={{ y: -2, boxShadow: 'var(--shadow)' }}
                style={{
                  background: 'var(--surface-2)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  border: '1px solid var(--border)',
                  borderRight: `3px solid ${c.color || 'var(--accent)'}`,
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Header: name + color dot */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${c.color || 'var(--accent)'}18`,
                      color: c.color || 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon n="chart" s={14} />
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--text1)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.name}
                  </span>
                </div>

                {/* Amounts row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: 'var(--text3)', fontWeight: 600 }}>
                    תקציב: {fmtMoney(c.budget)}
                  </span>
                  <span
                    style={{
                      color: over ? 'var(--danger)' : 'var(--text1)',
                      fontWeight: 700,
                    }}
                  >
                    {fmtMoney(c.spent)}
                  </span>
                </div>

                {/* Progress bar */}
                <ProgressBar
                  value={Math.min(pct, 100)}
                  color={over ? 'var(--danger)' : c.color}
                  height={6}
                />

                {/* Footer: percentage + overrun warning */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 6,
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      color: over ? 'var(--danger)' : 'var(--text3)',
                      fontWeight: 600,
                    }}
                  >
                    {pct}%
                  </span>
                  {over && (
                    <span
                      style={{
                        color: 'var(--danger)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Icon n="alert" s={11} />
                      +{fmtMoney(c.spent - c.budget)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Link to full budget page */}
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Link
            to="/budget"
            style={{
              fontSize: 12.5,
              color: 'var(--accent)',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 14px',
              borderRadius: 8,
              background: 'var(--accent-light)',
              border: '1px solid var(--accent-glow-sm)',
              transition: 'all 0.15s',
            }}
          >
            צפה בניהול תקציב
            <Icon n="arrow-left" s={13} />
          </Link>
        </div>
      </div>

      {/* Selector modal */}
      {selectorOpen && (
        <CategorySelectorModal
          categories={categories}
          draftPinned={draftPinned}
          onToggle={toggleDraft}
          onReorder={handleDraftReorder}
          onConfirm={confirmSelection}
          onClose={() => setSelectorOpen(false)}
          onSelectAll={selectAll}
          onClearAll={clearAll}
        />
      )}
    </motion.div>
  );
}

/* ── Sortable Category Row ──────────────────────────────────────────────── */
function SortableCategoryRow({
  cat,
  isChecked,
  onToggle,
}: {
  cat: any;
  isChecked: boolean;
  onToggle: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat._id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.12)' : 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${isChecked ? 'var(--accent-glow-sm)' : 'var(--border)'}`,
    background: isChecked ? 'var(--accent-light)' : 'var(--surface-2)',
    cursor: 'default',
    userSelect: 'none',
  };

  const pct = cat.budget ? Math.round((cat.spent / cat.budget) * 100) : 0;

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text3)',
          padding: 2,
          touchAction: 'none',
          flexShrink: 0,
        }}
        title="גרור לשינוי סדר"
      >
        <Icon n="menu" s={16} />
      </div>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => onToggle(cat._id)}
        style={{
          width: 18,
          height: 18,
          accentColor: 'var(--accent)',
          flexShrink: 0,
          cursor: 'pointer',
        }}
      />

      {/* Color dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: cat.color || 'var(--accent)',
          flexShrink: 0,
        }}
      />

      {/* Category info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13.5,
            color: 'var(--text1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cat.name}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>
          {fmtMoney(cat.spent)} / {fmtMoney(cat.budget)} · {pct}%
        </div>
      </div>
    </div>
  );
}

/* ── Category Selector Modal ───────────────────────────────────────────── */
type SelectorProps = {
  categories: any[];
  draftPinned: string[];
  onToggle: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onConfirm: () => void;
  onClose: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
};

function CategorySelectorModal({
  categories,
  draftPinned,
  onToggle,
  onReorder,
  onConfirm,
  onClose,
  onSelectAll,
  onClearAll,
}: SelectorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Build ordered list: pinned items first (in order), then unchecked items
  const pinnedSet = new Set(draftPinned);
  const unchecked = categories.filter((c: any) => !pinnedSet.has(c._id));
  const catMap = new Map(categories.map((c: any) => [c._id, c]));
  const orderedPinned = draftPinned.map((id) => catMap.get(id)).filter(Boolean);
  const orderedList = [...orderedPinned, ...unchecked];
  const allIds = orderedList.map((c: any) => c._id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = draftPinned.indexOf(String(active.id));
    const overIndex = draftPinned.indexOf(String(over.id));

    // Only reorder within pinned items
    if (oldIndex === -1 || overIndex === -1) return;

    onReorder(arrayMove(draftPinned, oldIndex, overIndex));
  };

  return (
    <Modal title="בחירת קטגוריות לדשבורד" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--text3)',
            marginBottom: 8,
            lineHeight: 1.5,
          }}
        >
          סמן את הקטגוריות שברצונך להציג וגרור לשינוי סדר.
        </div>

        {/* Select all / clear */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 8,
            fontSize: 12,
          }}
        >
          <button
            onClick={onSelectAll}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: 12,
              fontFamily: "'Heebo', sans-serif",
              padding: 0,
            }}
          >
            בחר הכל
          </button>
          <span style={{ color: 'var(--border)' }}>|</span>
          <button
            onClick={onClearAll}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: 12,
              fontFamily: "'Heebo', sans-serif",
              padding: 0,
            }}
          >
            נקה הכל
          </button>
        </div>

        {/* Category list with drag-and-drop */}
        <div
          style={{
            maxHeight: '50vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
              {orderedList.map((c: any) => (
                <SortableCategoryRow
                  key={c._id}
                  cat={c}
                  isChecked={pinnedSet.has(c._id)}
                  onToggle={onToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Actions */}
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border)',
            paddingTop: 14,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {draftPinned.length} נבחרו מתוך {categories.length}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={onClose}>
              ביטול
            </Btn>
            <Btn onClick={onConfirm}>שמור בחירה</Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}
