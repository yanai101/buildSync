import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, Btn, EmptyState, PageBackground, FeedbackModal, ConfirmDialog } from '../components/Shared';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useDataMutation } from '../hooks/useDataMutation';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { useSubscription } from '../hooks/useSubscription';
import { useAppNotify } from '../hooks/useAppNotify';

const PREDEFINED_CHECKLISTS = [
  {
    title: 'הכנות ליציקת בטון',
    category: 'שלד',
    items: [
      'וידוא תוכניות קונסטרוקציה עדכניות באתר',
      'בדיקת ברזל וקשירות (אישור קונסטרוקטור)',
      'הזמנת משאבת בטון ואישור שעת הגעה',
      'בדיקת ספייסרים מתחת לרשתות הברזל',
      'ניקיון יסודי של הטפסנות (שאיבת לכלוך ונסורת)',
      'הרטבת הטפסנות לפני היציקה',
      'וידוא הגעת צינורות שרוולים לאינסטלציה/חשמל',
    ],
  },
  {
    title: 'בדיקות לפני ריצוף',
    category: 'גמרים',
    items: [
      'ביצוע בדיקת הצפה לחדרים רטובים (48 שעות)',
      'בדיקת לחץ מים בצנרת (אינסטלטור)',
      'ניקיון הרצפה משאריות טיח ובטון',
      'וידוא מידות ריצוף לפי פריסת אדריכל',
      'סימון גובה אפס (שטיכמוס) בכל החדרים',
      'וידוא איטום קירות בחדרים רטובים',
    ],
  },
  {
    title: 'הכנות לטופס 4 (אכלוס)',
    category: 'מסירה',
    items: [
      'אישור תאגיד מים וביוב',
      'אישור חברת חשמל (טופס 4 לחשמל)',
      'אישור כיבוי אש (אם נדרש)',
      'אישור פיקוד העורף לממ"ד (אטימות וטיח)',
      'בדיקת מכון התקנים למעקות, זכוכיות וגז',
      'פינוי פסולת לאתר מורשה וקבלת קבלה',
      'מודד מוסמך - אישור מפת עדות (As-Made)',
    ],
  },
];

const ALL_PREDEFINED_ITEMS = new Set(PREDEFINED_CHECKLISTS.flatMap(c => c.items));

export const ChecklistsScreen = () => {
  const { projectId } = useCurrentProject();
  const checklists = useQuery(api.checklists.list, projectId ? { projectId } : 'skip');
  const { mutate } = useDataMutation('checklists');
  const { isProOrPremium } = useSubscription();

  const [feedback, setFeedback] = useState<{ title: string; message: string; type: 'error' | 'success' } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [newItemText, setNewItemText] = useState<{ [key: string]: string }>({});
  
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');

  const [checklistToDelete, setChecklistToDelete] = useState<{ id: string; title: string } | null>(null);

  const handleAddTemplate = async (template: typeof PREDEFINED_CHECKLISTS[0]) => {
    if (!projectId) return;
    try {
      await mutate('addChecklist', {
        projectId,
        title: template.title,
        category: template.category,
        items: template.items,
      });
      setFeedback({ title: 'נוסף בהצלחה', message: `הצ'קליסט "${template.title}" נוסף לפרויקט.`, type: 'success' });
      setIsAdding(false);
    } catch (e) {
      setFeedback({ title: 'שגיאה', message: 'לא הצלחנו להוסיף את הצ\'קליסט.', type: 'error' });
    }
  };

  const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
    try {
      await mutate('toggleChecklistItem', { itemId, isCompleted: !currentStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (checklistId: string, title: string) => {
    setChecklistToDelete({ id: checklistId, title });
  };

  const confirmDeleteChecklist = async () => {
    if (!checklistToDelete) return;
    try {
      await mutate('deleteChecklist', { checklistId: checklistToDelete.id });
      setChecklistToDelete(null);
    } catch (e) {
      console.error(e);
      setFeedback({ title: 'שגיאה', message: 'לא הצלחנו למחוק את הצ\'קליסט.', type: 'error' });
    }
  };

  const handleAddNewItem = async (checklistId: string) => {
    if (!isProOrPremium) {
      setFeedback({ title: 'שדרוג נדרש', message: 'הוספת משימות מותאמות אישית זמינה במסלול Pro.', type: 'error' });
      return;
    }
    const text = newItemText[checklistId];
    if (!text?.trim()) return;
    try {
      await mutate('addChecklistItem', { checklistId, text: text.trim() });
      setNewItemText(prev => ({ ...prev, [checklistId]: '' }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await mutate('deleteChecklistItem', { itemId });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    if (!editingItemText.trim()) return;
    try {
      await mutate('updateChecklistItem', { itemId, text: editingItemText.trim() });
      setEditingItemId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTitle = async (checklistId: string) => {
    if (!editingTitleText.trim()) return;
    try {
      await mutate('updateChecklistTitle', { checklistId, title: editingTitleText.trim() });
      setEditingTitleId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCustom = async () => {
    if (!isProOrPremium) {
      setFeedback({ title: 'שדרוג נדרש', message: 'יצירת צ\'קליסט מותאם אישית זמינה במסלול Pro.', type: 'error' });
      return;
    }
    if (!projectId || !customTitle.trim()) return;
    try {
      await mutate('addChecklist', {
        projectId,
        title: customTitle.trim(),
        category: 'מותאם אישית',
        items: [],
      });
      setFeedback({ title: 'נוסף בהצלחה', message: `הצ'קליסט "${customTitle}" נוסף לפרויקט.`, type: 'success' });
      setCustomTitle('');
      setAddingCustom(false);
      setIsAdding(false);
    } catch (e) {
      setFeedback({ title: 'שגיאה', message: 'לא הצלחנו להוסיף את הצ\'קליסט.', type: 'error' });
    }
  };

  const isLoading = checklists === undefined;

  return (
    <ScreenBoundary loading={isLoading} error={null} onRetry={() => {}}>
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 130px)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>צ'קליסטים מקצועיים</h1>
          <Btn onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'}>
            <Icon n={isAdding ? 'x' : 'plus'} s={16} /> {isAdding ? 'ביטול' : 'הוסף צ\'קליסט'}
          </Btn>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', marginBottom: 24 }}
            >
              <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{addingCustom ? 'צור צ\'קליסט מותאם אישית' : 'בחר תבנית מוכנה:'}</h3>
                  <Btn onClick={() => {
                    if (!isProOrPremium && !addingCustom) {
                      setFeedback({ title: 'שדרוג נדרש', message: 'יצירת צ\'קליסט מותאם אישית זמינה במסלול Pro.', type: 'error' });
                      return;
                    }
                    setAddingCustom(!addingCustom);
                  }} variant="secondary">
                    {addingCustom ? 'חזור לתבניות' : 'צור צ\'קליסט ריק'}
                  </Btn>
                </div>
                
                {addingCustom ? (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="שם הצ'קליסט (למשל: נגרות, מטבח, אלומיניום)..."
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <Btn onClick={handleAddCustom} variant="primary">הוסף</Btn>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {PREDEFINED_CHECKLISTS.map((template, idx) => (
                      <div key={idx} style={{ flex: '1 1 280px', padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>{template.category}</div>
                        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12, color: 'var(--text1)' }}>{template.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, flex: 1 }}>
                          {template.items.length} משימות לבדיקה
                        </div>
                        <Btn onClick={() => handleAddTemplate(template)} variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                          הוסף לפרויקט
                        </Btn>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {checklists?.length === 0 && !isAdding ? (
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <PageBackground image="/empty_states/checklists.png" />
            <div style={{ width: '100%' }}>
              <EmptyState
                icon="file-text"
                title="אין צ'קליסטים עדיין"
                description="הוסף צ'קליסטים מקצועיים כדי לוודא ששום דבר לא מתפספס במהלך הבנייה."
                action={
                  <Btn size="lg" onClick={() => setIsAdding(true)} style={{ padding: "12px 28px", fontSize: 16 }}>
                    <Icon n="plus" s={16}/> הוסף צ'קליסט
                  </Btn>
                }
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {checklists?.map((list) => {
              const isExpanded = expandedId === list.id;
              const completedCount = list.items.filter((i: any) => i.isCompleted).length;
              const totalCount = list.items.length;
              const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

              return (
                <div key={list.id} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  
                  {/* Header */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : list.id as string)}
                    style={{ padding: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, background: isExpanded ? 'var(--bg)' : 'transparent' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, background: 'var(--border)', padding: '2px 8px', borderRadius: 12, color: 'var(--text2)' }}>
                          {list.category || 'כללי'}
                        </span>
                        {editingTitleId === list.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }} onClick={e => e.stopPropagation()}>
                            <input 
                              type="text" 
                              className="input" 
                              value={editingTitleText}
                              onChange={e => setEditingTitleText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleUpdateTitle(list.id as string);
                                if (e.key === 'Escape') setEditingTitleId(null);
                              }}
                              style={{ fontSize: 14, padding: '4px 8px', flex: 1 }}
                              autoFocus
                            />
                            <Btn size="sm" onClick={() => handleUpdateTitle(list.id as string)}><Icon n="check" s={14} /></Btn>
                            <Btn size="sm" variant="secondary" onClick={() => setEditingTitleId(null)}><Icon n="x" s={14} /></Btn>
                          </div>
                        ) : (
                          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text1)' }}>{list.title}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? 'var(--success)' : 'var(--accent)', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {completedCount} / {totalCount}
                        </span>
                      </div>
                    </div>
                    
                    {list.category === 'מותאם אישית' && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingTitleText(list.title);
                          setEditingTitleId(list.id as string);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 8 }}
                      >
                        <Icon n="edit" s={16} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(list.id as string, list.title); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 8 }}
                    >
                      <Icon n="trash" s={16} />
                    </button>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                      <Icon n="chevron-down" s={20} c="var(--text3)" />
                    </motion.div>
                  </div>

                  {/* Items list */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 8 }}>
                            {list.items.map((item: any) => {
                              const isCustomItem = list.category === 'מותאם אישית' || !ALL_PREDEFINED_ITEMS.has(item.text);
                              return (
                                <div 
                                  key={item.id} 
                                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}
                                >
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={item.isCompleted} 
                                      onChange={() => handleToggleItem(item.id, item.isCompleted)}
                                      style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
                                    />
                                    {editingItemId === item.id ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                        <input 
                                          type="text" 
                                          className="input" 
                                          value={editingItemText}
                                          onChange={e => setEditingItemText(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleUpdateItem(item.id);
                                            if (e.key === 'Escape') setEditingItemId(null);
                                          }}
                                          style={{ fontSize: 14, padding: '4px 8px', flex: 1 }}
                                          autoFocus
                                        />
                                        <Btn size="sm" onClick={(e: any) => { e.preventDefault(); handleUpdateItem(item.id); }}><Icon n="check" s={14} /></Btn>
                                        <Btn size="sm" variant="secondary" onClick={(e: any) => { e.preventDefault(); setEditingItemId(null); }}><Icon n="x" s={14} /></Btn>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 14, color: item.isCompleted ? 'var(--text3)' : 'var(--text1)', textDecoration: item.isCompleted ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                                        {item.text}
                                      </span>
                                    )}
                                  </label>
                                  {isCustomItem && editingItemId !== item.id && (
                                    <>
                                      <button 
                                        onClick={() => {
                                          setEditingItemText(item.text);
                                          setEditingItemId(item.id);
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
                                      >
                                        <Icon n="edit" s={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteItem(item.id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
                                      >
                                        <Icon n="trash" s={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                            <input
                              type="text"
                              className="input"
                              placeholder="משימה חדשה..."
                              value={newItemText[list.id as string] || ''}
                              onChange={e => setNewItemText({ ...newItemText, [list.id as string]: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddNewItem(list.id as string);
                              }}
                              style={{ flex: 1, fontSize: 14, padding: '8px 12px' }}
                            />
                            <Btn onClick={() => handleAddNewItem(list.id as string)} variant="secondary" style={{ padding: '8px 16px' }}>
                              הוסף
                            </Btn>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {feedback && (
          <FeedbackModal
            title={feedback.title}
            message={feedback.message}
            type={feedback.type}
            onClose={() => setFeedback(null)}
          />
        )}

        {checklistToDelete && (
          <ConfirmDialog
            title="מחיקת צ'קליסט"
            message={`האם אתה בטוח שברצונך למחוק את הצ'קליסט "${checklistToDelete.title}"?`}
            confirmText="מחק"
            cancelText="ביטול"
            onConfirm={confirmDeleteChecklist}
            onClose={() => setChecklistToDelete(null)}
          />
        )}

      </div>
    </ScreenBoundary>
  );
};
