import React from 'react';
import { Project, Room } from '../types';
import { fmtMoney } from '../utils/mockData';

export interface BOQPrintTemplateProps {
  project?: Project | null;
  itemsGroupedByCategory?: Record<string, {name: string, cat: string, unit: string, total: number, rooms: {name: string, qty: number, notes?: string}[], notes?: string[]}>;
  itemsGroupedByRoom?: Record<string, any[]>;
  rooms?: Room[];
  totalCost?: number;
  title?: string;
}

export const BOQPrintTemplate = React.forwardRef<HTMLDivElement, BOQPrintTemplateProps>(
  ({ project, itemsGroupedByCategory, itemsGroupedByRoom, rooms, totalCost, title = "רשימת כמויות (BOQ)" }, ref) => {
    const date = new Date().toLocaleDateString('he-IL');
    const notesBoxStyle: React.CSSProperties = {
      marginTop: '6px',
      padding: '7px 9px',
      background: '#FFF7ED',
      border: '1px solid #FED7AA',
      borderRadius: '7px',
      color: '#7C2D12',
      fontSize: '10.5px',
      lineHeight: 1.55,
      fontWeight: 400,
      whiteSpace: 'pre-wrap',
    };
    const notesLabelStyle: React.CSSProperties = {
      display: 'inline-block',
      marginInlineEnd: '5px',
      color: '#9A3412',
      fontWeight: 800,
    };
    
    // Calculate total cost if not provided but we have room items
    let calculatedTotal = totalCost || 0;
    if (!totalCost && itemsGroupedByRoom) {
      calculatedTotal = Object.values(itemsGroupedByRoom).flat().reduce((acc, item) => acc + (item.qty * (item.unitPrice || 0)), 0);
    }
    let calculatedPaid = 0;
    if (itemsGroupedByRoom) {
      calculatedPaid = Object.values(itemsGroupedByRoom).flat().reduce(
        (acc, item) => acc + (item.paid ? item.qty * (item.unitPrice || 0) : 0),
        0,
      );
    }
    const paidPctOfTotal = calculatedTotal > 0 ? Math.round((calculatedPaid / calculatedTotal) * 100) : 0;
    const anyPaid = calculatedPaid > 0;

    return (
      <div 
        ref={ref} 
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm 20mm',
          background: '#ffffff',
          color: '#1A1A1A',
          direction: 'rtl',
          fontFamily: '"Heebo", system-ui, -apple-system, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #EA580C', paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '32px', color: '#EA580C', fontWeight: 900 }}>{title}</h1>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '20px', color: '#1F2937', fontWeight: 700 }}>{project?.name || 'פרויקט כללי'}</h2>
            {project?.address && <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{project.address}</div>}
          </div>
          <div style={{ textAlign: 'left', color: '#4B5563', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <img src="/logo.png" alt="BuildSync Icon" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              <div dir="ltr" style={{ fontWeight: 800, color: '#111827', fontSize: '24px' }}>Build<span style={{color: '#EA580C'}}>Sync</span></div>
            </div>
            <div>תאריך הפקה: {date}</div>
            <div>מנהל פרויקט: {project?.manager || '—'}</div>
          </div>
        </div>

        {/* Summary Boxes */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
          {calculatedTotal > 0 && (
            <div style={{ flex: 1, padding: '16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: '#9A3412', fontWeight: 700, marginBottom: '4px' }}>סה"כ עלות משוערת</div>
              <div style={{ fontSize: '24px', color: '#C2410C', fontWeight: 900 }}>{fmtMoney(calculatedTotal)}</div>
            </div>
          )}
          {anyPaid && (
            <div style={{ flex: 1, padding: '16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, marginBottom: '4px' }}>שולם עד כה</div>
              <div style={{ fontSize: '24px', color: '#15803D', fontWeight: 900 }}>{fmtMoney(calculatedPaid)}</div>
              {calculatedTotal > 0 && (
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>{paidPctOfTotal}% מהעלות</div>
              )}
            </div>
          )}
          {itemsGroupedByCategory && (
             <div style={{ flex: 1, padding: '16px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: '#4B5563', fontWeight: 700, marginBottom: '4px' }}>סה"כ קטגוריות</div>
              <div style={{ fontSize: '24px', color: '#1F2937', fontWeight: 900 }}>{Object.keys(itemsGroupedByCategory).length}</div>
            </div>
          )}
          {rooms && (
             <div style={{ flex: 1, padding: '16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, marginBottom: '4px' }}>סה"כ חדרים</div>
              <div style={{ fontSize: '24px', color: '#15803D', fontWeight: 900 }}>{rooms.length}</div>
            </div>
          )}
        </div>

        {/* Content: Grouped By Category (Wizard View) */}
        {itemsGroupedByCategory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(itemsGroupedByCategory).map(([key, item], idx) => {
              // Grouping them by category name
              return null; // Handled below
            })}
            
            {Array.from(new Set(Object.values(itemsGroupedByCategory).map(i => i.cat))).map(cat => (
              <div key={cat} style={{ breakInside: 'avoid' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#111827', borderBottom: '2px solid #E5E7EB', paddingBottom: '8px' }}>{cat}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #D1D5DB' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#374151', width: '30%' }}>פריט</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#374151', width: '13%' }}>סה"כ</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#374151', width: '12%' }}>יחידה</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#374151', width: '45%' }}>פירוט לפי חדר והערות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(itemsGroupedByCategory).filter(i => i.cat === cat).map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #E5E7EB', background: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: '#111827', verticalAlign: 'top' }}>{item.name}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 800, color: '#EA580C' }}>{item.total}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', color: '#6B7280' }}>{item.unit}</td>
                        <td style={{ padding: '12px 8px', color: '#4B5563', fontSize: '11px', verticalAlign: 'top' }}>
                          <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                            {item.rooms.filter(r => r.qty > 0).map((r, roomIndex) => (
                              <div key={roomIndex} style={{breakInside: 'avoid'}}>
                                <span style={{fontWeight: 700, color: '#374151'}}>{r.name}</span>
                                <span> ({r.qty})</span>
                                {r.notes && (
                                  <div style={notesBoxStyle}>
                                    <span style={notesLabelStyle}>הערות:</span>
                                    {r.notes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Content: Grouped By Room (Standard BOQ View) */}
        {itemsGroupedByRoom && rooms && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
             {rooms.filter(r => itemsGroupedByRoom[r.uid] && itemsGroupedByRoom[r.uid].length > 0).map(room => {
               const roomItems = itemsGroupedByRoom[room.uid];
               const roomSum = roomItems.reduce((acc: number, item: any) => acc + item.qty * (item.unitPrice || 0), 0);
               const roomPaidSum = roomItems.reduce((acc: number, item: any) => acc + (item.paid ? item.qty * (item.unitPrice || 0) : 0), 0);
               const roomHasPaid = roomPaidSum > 0;
               return (
                 <div key={room.uid} style={{ breakInside: 'avoid', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: '#F3F4F6', padding: '12px 16px', fontWeight: 800, fontSize: '16px', color: '#1F2937', borderBottom: '1px solid #E5E7EB' }}>
                      {room.name}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #D1D5DB' }}>
                          <th style={{ padding: '8px 16px', textAlign: 'right', color: '#4B5563' }}>פריט</th>
                          <th style={{ padding: '8px 16px', textAlign: 'right', color: '#4B5563' }}>כמות</th>
                          <th style={{ padding: '8px 16px', textAlign: 'right', color: '#4B5563' }}>מחיר יח'</th>
                          <th style={{ padding: '8px 16px', textAlign: 'right', color: '#4B5563' }}>סה"כ</th>
                          <th style={{ padding: '8px 16px', textAlign: 'right', color: '#4B5563' }}>ספק</th>
                          <th style={{ padding: '8px 16px', textAlign: 'right', color: '#4B5563' }}>תשלום</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roomItems.map((item: any, i: number) => (
                          <tr key={i} style={{ borderBottom: i === roomItems.length - 1 ? 'none' : '1px solid #F3F4F6', background: item.paid ? '#F0FDF4' : 'transparent' }}>
                            <td style={{ padding: '10px 16px', fontWeight: 600, verticalAlign: 'top' }}>
                              {item.name}
                              {item.spec && (
                                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '3px', fontWeight: 400, lineHeight: 1.45 }}>
                                  <span style={{fontWeight: 700, color: '#4B5563'}}>מפרט:</span> {item.spec}
                                </div>
                              )}
                              {item.notes && (
                                <div style={notesBoxStyle}>
                                  <span style={notesLabelStyle}>הערות:</span>
                                  {item.notes}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px' }}>{item.qty} {item.unit}</td>
                            <td style={{ padding: '10px 16px' }}>{fmtMoney(item.unitPrice)}</td>
                            <td style={{ padding: '10px 16px', fontWeight: 700 }}>{fmtMoney(item.qty * item.unitPrice)}</td>
                            <td style={{ padding: '10px 16px', color: '#6B7280' }}>{item.supplier || '-'}</td>
                            <td style={{ padding: '10px 16px' }}>
                              {item.paid ? (
                                <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '999px', background: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap' }}>
                                  שולם{item.paidAt ? ` · ${item.paidAt}` : ''}
                                </span>
                              ) : (
                                <span style={{ color: '#9CA3AF' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                          <td colSpan={3} style={{ padding: '10px 16px', fontSize: '11px', color: '#4B5563', fontWeight: 700 }}>
                            סה"כ חדר: <span style={{ color: '#111827', fontWeight: 800 }}>{fmtMoney(roomSum)}</span>
                          </td>
                          <td colSpan={3} style={{ padding: '10px 16px', fontSize: '11px', textAlign: 'left', fontWeight: 700, color: roomHasPaid ? '#15803D' : '#9CA3AF' }}>
                            {roomHasPaid ? <>שולם בחדר: <span style={{ fontWeight: 800 }}>{fmtMoney(roomPaidSum)}</span></> : 'אין תשלומים בחדר'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                 </div>
               );
             })}
           </div>
        )}

        {anyPaid && (
          <div style={{ marginTop: '32px', padding: '14px 18px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', breakInside: 'avoid' }}>
            <span style={{ fontSize: '13px', color: '#166534', fontWeight: 700 }}>סה"כ שולם עד כה</span>
            <span style={{ fontSize: '20px', color: '#15803D', fontWeight: 900 }}>{fmtMoney(calculatedPaid)}</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #E5E7EB', textAlign: 'center', fontSize: '10px', color: '#9CA3AF' }}>
          מסמך זה הופק אוטומטית באמצעות מערכת BuildSync. לפרטים נוספים: support@buildsync.co.il
        </div>
      </div>
    );
  }
);
