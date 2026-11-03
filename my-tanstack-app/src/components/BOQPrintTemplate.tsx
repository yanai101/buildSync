import React from 'react';
import { Project, Room } from '../types';
import { fmtMoney } from '../utils/mockData';
import { BUILDSYNC_LOGO_BASE64 } from './BOQPrintLogo';

export interface BOQPrintTemplateProps {
  project?: Project | null;
  itemsGroupedByCategory?: Record<
    string,
    {
      name: string;
      cat: string;
      unit: string;
      total: number;
      rooms: { name: string; qty: number; notes?: string }[];
      notes?: string[];
    }
  >;
  itemsGroupedByRoom?: Record<string, any[]>;
  rooms?: Room[];
  totalCost?: number;
  title?: string;
  generalNotes?: string;
}

export const BOQPrintTemplate = React.forwardRef<HTMLDivElement, BOQPrintTemplateProps>(
  (
    {
      project,
      itemsGroupedByCategory,
      itemsGroupedByRoom,
      rooms,
      totalCost,
      title = 'רשימת כמויות (BOQ)',
      generalNotes,
    },
    ref,
  ) => {
    const date = new Date().toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Calculate total cost
    let calculatedTotal = totalCost || 0;
    if (!totalCost && itemsGroupedByRoom) {
      calculatedTotal = Object.values(itemsGroupedByRoom)
        .flat()
        .reduce((acc, item) => acc + item.qty * (item.unitPrice || 0), 0);
    }
    let calculatedPaid = 0;
    if (itemsGroupedByRoom) {
      calculatedPaid = Object.values(itemsGroupedByRoom)
        .flat()
        .reduce((acc, item) => acc + (item.paid ? item.qty * (item.unitPrice || 0) : 0), 0);
    }
    const paidPctOfTotal = calculatedTotal > 0 ? Math.round((calculatedPaid / calculatedTotal) * 100) : 0;
    const anyPaid = calculatedPaid > 0;

    const totalItemsCount = itemsGroupedByCategory
      ? Object.values(itemsGroupedByCategory).length
      : itemsGroupedByRoom
      ? Object.values(itemsGroupedByRoom).flat().length
      : 0;

    return (
      <div
        ref={ref}
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '16mm 18mm',
          background: '#ffffff',
          color: '#0F172A',
          direction: 'rtl',
          fontFamily: '"Heebo", system-ui, -apple-system, sans-serif',
          boxSizing: 'border-box',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Top Header Card */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '16px',
            borderBottom: '2px solid #E2E8F0',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  background: '#FFF7ED',
                  color: '#EA580C',
                  border: '1px solid #FFEDD5',
                  padding: '0 12px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  height: '24px',
                  lineHeight: '23px',
                  letterSpacing: '0.3px',
                  boxSizing: 'border-box',
                }}
              >
                BuildSync • מסמך רכש רשמי
              </span>
            </div>
            <h1
              style={{
                margin: '6px 0 2px 0',
                fontSize: '26px',
                color: '#0F172A',
                fontWeight: 900,
                letterSpacing: '-0.4px',
              }}
            >
              {title}
            </h1>
            <div style={{ fontSize: '15px', color: '#475569', fontWeight: 700 }}>
              {project?.name || 'פרויקט כללי'}
              {project?.address && (
                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500, marginRight: '8px' }}>
                  • {project.address}
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '6px',
            }}
          >
            <div dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={BUILDSYNC_LOGO_BASE64}
                alt="BuildSync Logo"
                style={{ width: '56px', height: '56px', objectFit: 'contain', display: 'block' }}
              />
              <div
                style={{
                  fontWeight: 900,
                  color: '#0F172A',
                  fontSize: '30px',
                  letterSpacing: '-0.6px',
                  lineHeight: '56px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Build<span style={{ color: '#EA580C' }}>Sync</span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              תאריך הפקה: <bdi dir="ltr">{date}</bdi>
            </div>
            {project?.manager && (
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                מנהל פרויקט: <strong style={{ color: '#334155' }}>{project.manager}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Executive KPI Stats Cards */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '22px' }}>
          {rooms && (
            <div
              style={{
                flex: 1,
                padding: '12px 14px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, marginBottom: '2px' }}>
                סה"כ חדרים
              </div>
              <div style={{ fontSize: '20px', color: '#0F172A', fontWeight: 900 }}>
                <bdi>{rooms.length}</bdi> <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>חללים</span>
              </div>
            </div>
          )}

          <div
            style={{
              flex: 1,
              padding: '12px 14px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, marginBottom: '2px' }}>
              סה"כ פריטים ברשימה
            </div>
            <div style={{ fontSize: '20px', color: '#0F172A', fontWeight: 900 }}>
              <bdi>{totalItemsCount}</bdi> <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>פריטים</span>
            </div>
          </div>

          {calculatedTotal > 0 && (
            <div
              style={{
                flex: 1.2,
                padding: '12px 14px',
                background: '#FFF7ED',
                border: '1px solid #FFEDD5',
                borderRadius: '12px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#9A3412', fontWeight: 700, marginBottom: '2px' }}>
                סה"כ עלות משוערת
              </div>
              <div style={{ fontSize: '20px', color: '#EA580C', fontWeight: 900 }}>
                <bdi>{fmtMoney(calculatedTotal)}</bdi>
              </div>
            </div>
          )}

          {anyPaid && (
            <div
              style={{
                flex: 1.2,
                padding: '12px 14px',
                background: '#F0FDF4',
                border: '1px solid #DCFCE7',
                borderRadius: '12px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, marginBottom: '2px' }}>
                שולם עד כה ({paidPctOfTotal}%)
              </div>
              <div style={{ fontSize: '20px', color: '#16A34A', fontWeight: 900 }}>
                <bdi>{fmtMoney(calculatedPaid)}</bdi>
              </div>
            </div>
          )}
        </div>

        {/* General Order / Import Notes (if provided) */}
        {generalNotes && generalNotes.trim().length > 0 && (
          <div
            style={{
              padding: '12px 16px',
              background: '#F8FAFC',
              border: '1.5px solid #CBD5E1',
              borderRadius: '12px',
              marginBottom: '22px',
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            }}
          >
            <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 800, marginBottom: '4px' }}>
              📝 הנחיות והערות כלליות להזמנה / יבוא:
            </div>
            <div style={{ fontSize: '11.5px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {generalNotes.trim()}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 1: Aggregated / Import List (Grouped By Category)        */}
        {/* ============================================================== */}
        {itemsGroupedByCategory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Array.from(new Set(Object.values(itemsGroupedByCategory).map((i) => i.cat))).map((cat) => (
              <div
                key={cat}
                style={{
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#FFFFFF',
                }}
              >
                <div
                  style={{
                    padding: '10px 16px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    color: '#0F172A',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{cat}</span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    {Object.values(itemsGroupedByCategory).filter((i) => i.cat === cat).length} סוגי פריטים
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', width: '28%' }}>
                        פריט
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '12%' }}>
                        כמות כוללת
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '10%' }}>
                        יחידה
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', width: '28%' }}>
                        חלוקה לפי חדרים
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', width: '22%' }}>
                        הערות ודגשים
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(itemsGroupedByCategory)
                      .filter((i) => i.cat === cat)
                      .map((item, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                          }}
                        >
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F172A', verticalAlign: 'top' }}>
                            {item.name}
                          </td>
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'center',
                              fontWeight: 900,
                              color: '#EA580C',
                              fontSize: '13px',
                              verticalAlign: 'top',
                            }}
                          >
                            <bdi>{item.total}</bdi>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B', verticalAlign: 'top' }}>
                            {item.unit}
                          </td>
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {item.rooms
                                .filter((r) => r.qty > 0)
                                .map((r, ri) => (
                                  <div
                                    key={ri}
                                    style={{
                                      fontSize: '11px',
                                      color: '#334155',
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    <span style={{ color: '#64748B' }}>•</span>{' '}
                                    <span style={{ fontWeight: 600 }}>{r.name}:</span>{' '}
                                    <bdi style={{ fontWeight: 800, color: '#0F172A' }}>{r.qty}</bdi>
                                  </div>
                                ))}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#475569', fontSize: '10.5px' }}>
                            {item.rooms.some((r) => r.notes) || (item.notes && item.notes.length > 0) ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {item.rooms
                                  .filter((r) => r.notes)
                                  .map((r, ri) => (
                                    <div
                                      key={ri}
                                      style={{
                                        background: '#FFF7ED',
                                        border: '1px solid #FFEDD5',
                                        borderRadius: '6px',
                                        padding: '4px 7px',
                                        color: '#9A3412',
                                        fontSize: '10px',
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      <strong style={{ color: '#C2410C' }}>{r.name}:</strong> {r.notes}
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <span style={{ color: '#CBD5E1' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: Standard BOQ (Grouped By Room)                         */}
        {/* ============================================================== */}
        {itemsGroupedByRoom && rooms && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {rooms
              .filter((r) => itemsGroupedByRoom[r.uid] && itemsGroupedByRoom[r.uid].length > 0)
              .map((room) => {
                const roomItems = itemsGroupedByRoom[room.uid];
                const roomSum = roomItems.reduce((acc: number, item: any) => acc + item.qty * (item.unitPrice || 0), 0);
                const roomPaidSum = roomItems.reduce(
                  (acc: number, item: any) => acc + (item.paid ? item.qty * (item.unitPrice || 0) : 0),
                  0,
                );
                const roomHasPaid = roomPaidSum > 0;

                return (
                  <div
                    key={room.uid}
                    style={{
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: '#FFFFFF',
                    }}
                  >
                    <div
                      style={{
                        background: '#F8FAFC',
                        padding: '10px 16px',
                        fontWeight: 800,
                        fontSize: '14px',
                        color: '#0F172A',
                        borderBottom: '1px solid #E2E8F0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>{room.name}</span>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                        {roomItems.length} פריטים
                      </span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', width: '30%' }}>
                            פריט / מפרט
                          </th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', width: '14%' }}>
                            קטגוריה
                          </th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '10%' }}>
                            כמות
                          </th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '12%' }}>
                            מחיר יח'
                          </th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '12%' }}>
                            סה"כ
                          </th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', width: '12%' }}>
                            ספק
                          </th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '10%' }}>
                            תשלום
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {roomItems.map((item: any, i: number) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: i === roomItems.length - 1 ? 'none' : '1px solid #F1F5F9',
                              background: item.paid ? '#F0FDF4' : i % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                              pageBreakInside: 'avoid',
                              breakInside: 'avoid',
                            }}
                          >
                            <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>{item.name}</div>
                              {item.spec && (
                                <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                                  <strong style={{ color: '#475569' }}>מפרט:</strong> {item.spec}
                                </div>
                              )}
                              {item.notes && (
                                <div
                                  style={{
                                    marginTop: '4px',
                                    padding: '3px 6px',
                                    background: '#FFF7ED',
                                    border: '1px solid #FFEDD5',
                                    borderRadius: '5px',
                                    color: '#9A3412',
                                    fontSize: '9.5px',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  <strong>הערות:</strong> {item.notes}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '9px 12px', verticalAlign: 'top', color: '#64748B' }}>
                              <span
                                dir="rtl"
                                style={{
                                  display: 'inline-block',
                                  verticalAlign: 'middle',
                                  fontSize: '10.5px',
                                  height: '22px',
                                  lineHeight: '20px',
                                  padding: '0 8px',
                                  borderRadius: '5px',
                                  background: '#F1F5F9',
                                  color: '#334155',
                                  border: '1px solid #E2E8F0',
                                  whiteSpace: 'nowrap',
                                  boxSizing: 'border-box',
                                }}
                              >
                                {item.cat}
                              </span>
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'center', verticalAlign: 'top', fontWeight: 700 }}>
                              <bdi>{item.qty}</bdi> <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 400 }}>{item.unit}</span>
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'center', verticalAlign: 'top', color: '#334155' }}>
                              <bdi>{fmtMoney(item.unitPrice)}</bdi>
                            </td>
                            <td
                              style={{
                                padding: '9px 12px',
                                textAlign: 'center',
                                verticalAlign: 'top',
                                fontWeight: 800,
                                color: '#0F172A',
                              }}
                            >
                              <bdi>{fmtMoney(item.qty * item.unitPrice)}</bdi>
                            </td>
                            <td style={{ padding: '9px 12px', verticalAlign: 'top', color: '#64748B' }}>
                              {item.supplier || '—'}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                              {item.paid ? (
                                <span
                                  dir="rtl"
                                  style={{
                                    display: 'inline-block',
                                    verticalAlign: 'middle',
                                    padding: '0 10px',
                                    borderRadius: '999px',
                                    background: '#DCFCE7',
                                    color: '#15803D',
                                    fontWeight: 800,
                                    fontSize: '10.5px',
                                    height: '22px',
                                    lineHeight: '20px',
                                    border: '1px solid #BBF7D0',
                                    whiteSpace: 'nowrap',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  שולם
                                </span>
                              ) : (
                                <span style={{ color: '#CBD5E1', fontSize: '11px' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                          <td colSpan={4} style={{ padding: '9px 12px', fontSize: '11.5px', color: '#475569', fontWeight: 700 }}>
                            סה"כ חדר: <bdi style={{ color: '#0F172A', fontWeight: 800 }}>{fmtMoney(roomSum)}</bdi>
                          </td>
                          <td
                            colSpan={3}
                            style={{
                              padding: '9px 12px',
                              fontSize: '11.5px',
                              textAlign: 'left',
                              fontWeight: 700,
                              color: roomHasPaid ? '#15803D' : '#94A3B8',
                            }}
                          >
                            {roomHasPaid ? (
                              <>
                                שולם בחדר: <bdi style={{ fontWeight: 800 }}>{fmtMoney(roomPaidSum)}</bdi>
                              </>
                            ) : (
                              'אין תשלומים בחדר'
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}
          </div>
        )}

        {/* Footer info */}
        <div
          style={{
            marginTop: '36px',
            paddingTop: '14px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: '#94A3B8',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          <div>מסמך זה הופק אוטומטית באמצעות מערכת BuildSync • לפרטים: support@buildsync.co.il</div>
          <div dir="ltr">www.buildsync.co.il</div>
        </div>
      </div>
    );
  },
);
