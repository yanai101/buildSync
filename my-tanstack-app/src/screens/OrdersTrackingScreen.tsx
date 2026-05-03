import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { ScreenBoundary } from '../components/ScreenBoundary';
import { Icon, Btn, Modal, FeedbackModal, EmptyState, PageBackground, ConfirmDialog, Badge } from '../components/Shared';

type Order = {
  _id: Id<'orders'>;
  title: string;
  supplier?: string;
  status: 'pending' | 'partial' | 'completed';
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  deliveryDocuments?: { storageId: Id<'_storage'>; name: string; url?: string | null }[];
};

const OrderCard = ({
  order,
  statusColors,
  statusLabels,
  onUpdateReceive,
  onDelete,
  onPickFile,
  uploadingOrderId,
  onPreviewDocument,
  onDeleteDocument,
}: {
  order: Order;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  onUpdateReceive: (order: Order) => void;
  onDelete: (id: Id<'orders'>) => void;
  onPickFile: (id: Id<'orders'>) => void;
  uploadingOrderId: Id<'orders'> | null;
  onPreviewDocument: (url: string) => void;
  onDeleteDocument: (orderId: Id<'orders'>, storageId: Id<'_storage'>) => void;
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const progress = Math.min(100, Math.round((order.receivedQuantity / order.orderedQuantity) * 100));

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: statusColors[order.status] }} />
      
      {/* Clickable Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, userSelect: 'none' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n={isExpanded ? 'chevron-down' : 'chevron-left'} s={16} c="var(--text3)" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.title}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2, paddingRight: 24 }}>{order.supplier || 'ללא ספק'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge type={order.status === 'completed' ? 'done' : order.status === 'partial' ? 'in_progress' : 'pending'}>
              {statusLabels[order.status]}
            </Badge>
          </div>
        </div>

        {/* Progress Overview (Always visible) */}
        <div style={{ paddingRight: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6, color: 'var(--text2)' }}>
            <span>התקבל: {order.receivedQuantity} / {order.orderedQuantity} {order.unit}</span>
            <span>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: statusColors[order.status], transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              <Icon n="calendar" s={14} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
              {order.expectedDeliveryDate ? `יעד לאספקה: ${new Date(order.expectedDeliveryDate).toLocaleDateString('he-IL')}` : 'לא הוגדר תאריך אספקה'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {order.status !== 'completed' && (
                <Btn size="sm" variant="outline" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onUpdateReceive(order); }} style={{ fontSize: 12, padding: '4px 12px' }}>
                  עדכן קבלה
                </Btn>
              )}
              <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(order._id); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, borderRadius: 6 }}>
                <Icon n="trash" s={14} /> מחיקה
              </button>
            </div>
          </div>

          {/* Documents section */}
          {order.deliveryDocuments && order.deliveryDocuments.length > 0 && (
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>תעודות משלוח וקבצים ({order.deliveryDocuments.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {order.deliveryDocuments.map((doc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8 }}>
                    <div 
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); doc.url && onPreviewDocument(doc.url); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: doc.url ? 'pointer' : 'default', color: doc.url ? 'var(--accent)' : 'var(--text1)', flex: 1, minWidth: 0 }}
                    >
                      <Icon n="file-text" s={16} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                    </div>
                    <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteDocument(order._id, doc.storageId); }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
                      <Icon n="x" s={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 4 }}>
            <Btn size="sm" variant="ghost" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onPickFile(order._id); }} disabled={uploadingOrderId === order._id} style={{ fontSize: 13, width: '100%', justifyContent: 'center', padding: '8px 0' }}>
              <Icon n="paperclip" s={16} /> 
              {uploadingOrderId === order._id ? 'מעלה...' : 'צרף תעודת משלוח'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};

export const OrdersTrackingScreen = () => {
  const { projectId } = useCurrentProject();
  const orders = useQuery(api.orders.list, projectId ? { projectId } : 'skip');
  const createOrder = useMutation(api.orders.create);
  const updateReceived = useMutation(api.orders.updateReceived);
  const deleteOrder = useMutation(api.orders.remove);
  const generateUploadUrl = useMutation(api.orders.generateUploadUrl);
  const addDocument = useMutation(api.orders.addDocument);
  const removeDocument = useMutation(api.orders.removeDocument);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingOrderId, setUploadingOrderId] = React.useState<Id<'orders'> | null>(null);
  const [previewDocumentUrl, setPreviewDocumentUrl] = React.useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [receiveAmount, setReceiveAmount] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'partial' | 'completed'>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState<Id<'orders'> | null>(null);
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

  const [form, setForm] = React.useState({
    title: '',
    supplier: '',
    orderedQuantity: '',
    unit: 'יחידות',
    expectedDeliveryDate: '',
    notes: '',
  });

  const loading = orders === undefined;
  
  const statusColors = {
    pending: 'var(--warning)',
    partial: '#007AFF',
    completed: 'var(--success)'
  };

  const statusLabels = {
    pending: 'בהמתנה',
    partial: 'סופק חלקית',
    completed: 'הושלם'
  };

  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    if (filter === 'all') return orders as Order[];
    return (orders as Order[]).filter(o => o.status === filter);
  }, [orders, filter]);

  const stats = React.useMemo(() => {
    if (!orders) return { total: 0, pending: 0, partial: 0, completed: 0 };
    const typedOrders = orders as Order[];
    return {
      total: typedOrders.length,
      pending: typedOrders.filter(o => o.status === 'pending').length,
      partial: typedOrders.filter(o => o.status === 'partial').length,
      completed: typedOrders.filter(o => o.status === 'completed').length,
    };
  }, [orders]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    
    try {
      await createOrder({
        projectId,
        title: form.title,
        supplier: form.supplier || undefined,
        orderedQuantity: Number(form.orderedQuantity),
        unit: form.unit,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        notes: form.notes || undefined,
        orderDate: new Date().toISOString().split('T')[0],
      });
      setIsAddModalOpen(false);
      setForm({ title: '', supplier: '', orderedQuantity: '', unit: 'יחידות', expectedDeliveryDate: '', notes: '' });
      setFeedback({ title: 'הזמנה נוספה', message: 'ההזמנה נוספה בהצלחה למעקב.', type: 'success' });
    } catch (err) {
      setFeedback({ title: 'שגיאה', message: 'לא הצלחנו להוסיף את ההזמנה.', type: 'error' });
    }
  };

  const handleUpdateReceive = async () => {
    if (!selectedOrder) return;
    const amountToAdd = Number(receiveAmount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) return;

    try {
      const newTotal = selectedOrder.receivedQuantity + amountToAdd;
      await updateReceived({
        orderId: selectedOrder._id,
        receivedQuantity: newTotal > selectedOrder.orderedQuantity ? selectedOrder.orderedQuantity : newTotal,
      });
      setSelectedOrder(null);
      setReceiveAmount('');
      setFeedback({ title: 'עודכן בהצלחה', message: 'הכמות שהתקבלה עודכנה.', type: 'success' });
    } catch (err) {
      setFeedback({ title: 'שגיאה', message: 'שגיאה בעדכון הכמות.', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmOpen) return;
    try {
      await deleteOrder({ orderId: deleteConfirmOpen });
      setFeedback({ title: 'נמחק', message: 'ההזמנה נמחקה.', type: 'success' });
    } catch (err) {
      setFeedback({ title: 'שגיאה', message: 'לא ניתן למחוק את ההזמנה.', type: 'error' });
    } finally {
      setDeleteConfirmOpen(null);
    }
  };

  const handlePickFile = (orderId: Id<'orders'>) => {
    setUploadingOrderId(orderId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !projectId || !uploadingOrderId) return;

    try {
      const uploadUrl = await generateUploadUrl({ projectId });
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error('File upload failed');

      const { storageId } = await uploadResponse.json() as { storageId: Id<'_storage'> };
      await addDocument({
        orderId: uploadingOrderId,
        storageId,
        name: file.name,
      });
      setFeedback({ title: 'הועלה בהצלחה', message: 'תעודת המשלוח נוספה.', type: 'success' });
    } catch (err) {
      setFeedback({ title: 'שגיאה', message: 'שגיאה בהעלאת הקובץ.', type: 'error' });
    } finally {
      setUploadingOrderId(null);
    }
  };

  const handleDeleteDocument = async (orderId: Id<'orders'>, storageId: Id<'_storage'>) => {
    try {
      await removeDocument({ orderId, storageId });
    } catch (err) {
      setFeedback({ title: 'שגיאה', message: 'לא ניתן למחוק מסמך.', type: 'error' });
    }
  };

  return (
    <ScreenBoundary loading={loading} error={null} onRetry={() => {}}>
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 100px)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon n="search" s={20} />
              </div>
              מעקב הזמנות
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
              ניהול אספקות חומרים וציוד לאתר הבנייה
            </div>
          </div>
          <Btn onClick={() => setIsAddModalOpen(true)}>
            <Icon n="plus" s={14} /> הוסף הזמנה
          </Btn>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept="image/*,.pdf"
        />

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>סה"כ הזמנות</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.total}</div>
          </div>
          <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--warning)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: 'var(--warning)' }} />
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>בהמתנה לאספקה</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.pending}</div>
          </div>
          <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid #007AFF', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: '#007AFF' }} />
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>סופקו חלקית</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.partial}</div>
          </div>
          <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--success)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: 'var(--success)' }} />
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>הושלמו</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.completed}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { id: 'all', label: 'הכל' },
            { id: 'pending', label: 'בהמתנה' },
            { id: 'partial', label: 'סופק חלקית' },
            { id: 'completed', label: 'הושלם' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: filter === f.id ? 'var(--accent)' : 'var(--border)',
                background: filter === f.id ? 'var(--accent-light)' : 'var(--surface)',
                color: filter === f.id ? 'var(--accent)' : 'var(--text2)',
                fontSize: 12,
                fontWeight: filter === f.id ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {orders?.length === 0 ? (
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PageBackground image="/empty_states/checklists.png" />
            <EmptyState icon="search" title="אין הזמנות למעקב" description="לא נמצאו הזמנות בפרויקט זה. תוכל להוסיף הזמנה חדשה כדי לעקוב אחרי קבלת סחורות." action={<Btn onClick={() => setIsAddModalOpen(true)}>הוסף הזמנה ראשונה</Btn>} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
            לא נמצאו הזמנות בסטטוס הנבחר.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredOrders.map((order: Order) => (
              <OrderCard
                key={order._id}
                order={order}
                statusColors={statusColors}
                statusLabels={statusLabels}
                onUpdateReceive={(o) => { setSelectedOrder(o); setReceiveAmount(''); }}
                onDelete={setDeleteConfirmOpen}
                onPickFile={handlePickFile}
                uploadingOrderId={uploadingOrderId}
                onPreviewDocument={setPreviewDocumentUrl}
                onDeleteDocument={handleDeleteDocument}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <Modal title="הוספת הזמנה למעקב" onClose={() => setIsAddModalOpen(false)} width={500}>
          <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>שם הפריט / הזמנה *</div>
              <input required className="bp-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="לדוגמה: ברזל יסודות" />
            </label>
            <label>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>שם הספק (אופציונלי)</div>
              <input className="bp-input" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} placeholder="לדוגמה: פזלן" />
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>כמות מוזמנת *</div>
                <input required type="number" min="0.1" step="any" className="bp-input" value={form.orderedQuantity} onChange={e => setForm({...form, orderedQuantity: e.target.value})} placeholder="0" />
              </label>
              <label style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>יחידת מידה *</div>
                <select className="bp-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                  <option value="יחידות">יחידות</option>
                  <option value="מ״ר">מ״ר</option>
                  <option value="קוב">קוב</option>
                  <option value="טון">טון</option>
                  <option value="ק״ג">ק״ג</option>
                  <option value="מטר רץ">מטר רץ</option>
                </select>
              </label>
            </div>
            <label>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>תאריך אספקה משוער</div>
              <input type="date" className="bp-input" value={form.expectedDeliveryDate} onChange={e => setForm({...form, expectedDeliveryDate: e.target.value})} />
            </label>
            <label>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>הערות</div>
              <textarea className="bp-input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <Btn type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>ביטול</Btn>
              <Btn type="submit">שמור הזמנה</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Update Receive Modal */}
      {selectedOrder && (
        <Modal title={`עדכון קבלת סחורה: ${selectedOrder.title}`} onClose={() => setSelectedOrder(null)} width={400}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              כמות שהוזמנה: <strong>{selectedOrder.orderedQuantity} {selectedOrder.unit}</strong><br/>
              כבר התקבל: <strong>{selectedOrder.receivedQuantity} {selectedOrder.unit}</strong><br/>
              נותר לספק: <strong>{selectedOrder.orderedQuantity - selectedOrder.receivedQuantity} {selectedOrder.unit}</strong>
            </div>
            <label>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>כמה {selectedOrder.unit} הגיעו עכשיו?</div>
              <input 
                type="number" 
                min="0.1" 
                step="any"
                max={selectedOrder.orderedQuantity - selectedOrder.receivedQuantity}
                className="bp-input" 
                value={receiveAmount} 
                onChange={e => setReceiveAmount(e.target.value)} 
                placeholder="הזן כמות..."
                autoFocus
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setSelectedOrder(null)}>ביטול</Btn>
              <Btn onClick={handleUpdateReceive} disabled={!receiveAmount}>עדכן</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {deleteConfirmOpen && (
        <ConfirmDialog
          title="מחיקת הזמנה"
          message="האם אתה בטוח שברצונך למחוק הזמנה זו מהמעקב? לא ניתן לבטל פעולה זו."
          confirmText="מחק"
          cancelText="ביטול"
          onConfirm={handleDelete}
          onClose={() => setDeleteConfirmOpen(null)}
        />
      )}

      {/* Preview Document */}
      {previewDocumentUrl && (
        <Modal title="תעודת משלוח" onClose={() => setPreviewDocumentUrl(null)} width={800}>
          <div style={{ height: '70vh', background: '#f5f5f5', borderRadius: 8, overflow: 'hidden' }}>
            <iframe src={previewDocumentUrl} width="100%" height="100%" style={{ border: 'none' }} title="Preview" />
          </div>
        </Modal>
      )}

      {/* Feedback */}
      {feedback && <FeedbackModal {...feedback} onClose={() => setFeedback(null)} />}
    </ScreenBoundary>
  );
};
