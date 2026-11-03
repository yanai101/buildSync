import * as React from 'react';
import { Badge, Btn, Icon } from '../../Shared';
import { demoProject } from '../demoProject';

type DemoOrder = (typeof demoProject.orders)[number];

const STATUS_COLORS: Record<DemoOrder['status'], string> = {
  pending: 'var(--warning)',
  partial: '#007AFF',
  completed: 'var(--success)',
};

const STATUS_LABELS: Record<DemoOrder['status'], string> = {
  pending: 'בהמתנה לאספקה',
  partial: 'סופק חלקית',
  completed: 'סופק במלואו',
};

/**
 * Interactive preview of OrdersTrackingScreen powered by `demoProject`.
 * Users can filter by status, expand order cards, and simulate receiving deliveries locally.
 */
export const OrdersPreview = () => {
  const [orders, setOrders] = React.useState<DemoOrder[]>(() => structuredClone(demoProject.orders));
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'partial' | 'completed'>('all');
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set([demoProject.orders[2]._id]));

  const stats = React.useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      partial: orders.filter((o) => o.status === 'partial').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    }),
    [orders],
  );

  const filteredOrders = orders.filter((o) => filter === 'all' || o.status === filter);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const receiveFullOrder = (id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o._id === id
          ? { ...o, receivedQuantity: o.orderedQuantity, status: 'completed' as const }
          : o,
      ),
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filter KPI cards (matches OrdersTrackingScreen) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {([
          { key: 'all', label: 'סה"כ הזמנות', count: stats.total, color: 'var(--accent)' },
          { key: 'pending', label: 'בהמתנה לאספקה', count: stats.pending, color: 'var(--warning)' },
          { key: 'partial', label: 'סופק חלקית', count: stats.partial, color: '#007AFF' },
          { key: 'completed', label: 'סופק במלואו', count: stats.completed, color: 'var(--success)' },
        ] as const).map((card) => {
          const active = filter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setFilter(card.key)}
              style={{
                background: 'var(--surface)',
                padding: '12px 14px',
                borderRadius: 12,
                border: `2px solid ${active ? card.color : 'var(--border)'}`,
                cursor: 'pointer',
                textAlign: 'right',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
            >
              {card.key !== 'all' && (
                <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: card.color }} />
              )}
              <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{card.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', marginTop: 2 }}>{card.count}</div>
            </button>
          );
        })}
      </div>

      {/* Orders list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredOrders.map((order) => {
          const isExpanded = expandedIds.has(order._id);
          const progress = Math.min(100, Math.round((order.receivedQuantity / order.orderedQuantity) * 100));
          return (
            <div key={order._id} className="card" style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: STATUS_COLORS[order.status] }} />

              <button
                type="button"
                onClick={() => toggleExpand(order._id)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  textAlign: 'right',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, width: '100%' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon n={isExpanded ? 'chevron-down' : 'chevron-left'} s={15} c="var(--text3)" />
                      <span>{order.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, paddingRight: 22 }}>
                      ספק: {order.supplier}
                    </div>
                  </div>
                  <Badge type={order.status === 'completed' ? 'done' : order.status === 'partial' ? 'in_progress' : 'pending'}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                </div>

                <div style={{ paddingRight: 22, width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: 'var(--text2)' }}>
                    <span>התקבל: {order.receivedQuantity} / {order.orderedQuantity} {order.unit}</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: STATUS_COLORS[order.status], transition: 'width 0.25s' }} />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon n="calendar" s={14} c="var(--accent)" />
                      <span>יעד לאספקה: {new Date(order.expectedDeliveryDate).toLocaleDateString('he-IL')}</span>
                    </div>
                    {order.status !== 'completed' && (
                      <Btn size="sm" variant="outline" onClick={() => receiveFullOrder(order._id)}>
                        <Icon n="check" s={13} /> סמן שהתקבל במלואו (דמו)
                      </Btn>
                    )}
                  </div>

                  {order.notes && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg)', padding: '8px 10px', borderRadius: 8 }}>
                      {order.notes}
                    </div>
                  )}

                  {order.deliveryDocuments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {order.deliveryDocuments.map((doc) => (
                        <span
                          key={doc.storageId}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 8, color: 'var(--accent)', fontWeight: 600 }}
                        >
                          <Icon n="file-text" s={13} />
                          {doc.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
