/**
 * HTML template builders for PDF export.
 *
 * IMPORTANT — dark-mode isolation:
 *   html2pdf renders inside the app's DOM, so the app's dark-mode CSS (e.g.
 *   `color-scheme: dark` on :root) can bleed in.  Every style here uses
 *   hardcoded hex values with `!important` so dark-mode variables cannot
 *   override them.  The actual rendering is also wrapped in a DOM element
 *   that has `color-scheme: light` forced on it (see projectExporter.ts).
 */

const DATE_LOCALE = 'he-IL';

// Embedded favicon (16×16 PNG as base64) so the logo works offline & in PDF
const LOGO_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAvpJREFUOE9lk29oW1UUwH/nJXl9L+8labN2ZXSrcaWwKRPSDcQqmwyG1YnolIJftn3YFmHgKMIEFdwHQRSlqyhdtiCCglBEtg/OzT8blpEPare5wv6069ZZV1lX12ZpEpOX9+6WtJF2Xrjce87h/O6554/wwPr45ky8WJaE42qbFVrMA3zijZtu4ZRhSvL1luXnFrtITUirCXNy2ukrutouBf/pK/aK0HrtB4zo32rD7XdT+NgnnRRqNiZU2rw95z/hKm1jDTg5+ycN1jLMgIUol+jV0+ihv2i5/ikoBgnTVYFUX8qWjx92lbb70tQYs4UM2fJd+tNJXlz7EpvaOok1rEQf+Q0vomGdPwBFpxLWEdnGHilNfR3HJ0Ou8uTtdB/DmTHmZnKIX4gurycarefN2E7aJYRkJiBYwDfyJZKfVtj166V8uf+QEklczk6w/0qKuVwee7yEf3UYVR+gy+zg+RWP02I1gVtGbo2CFQQ9AMaKpLjpD0YUtA/kfuV47gJ5X4lVw4oNTgvXn/RzhzwfBbuX1EoKOXDyEG4aFe/YWyWEwE+FK4Q8nVTsIjv+eJjJ85fofu5lppwsTYFQFbCkNBWFwhH1RU8JCFRkR3kktd9JOB0kv0ux94XXECpF/Z9rLSJHVN8bI6DaaxpPKTQRPh88yLPrXsW+MYe9pg0xHmy5akyjcjT12aELocZEWTRW5zM8c+sGjU6GgdwnNLfGiKgw9tUGmicfpRhfxsnmh7gWjOBXHo9lp5NC6pu45ApDKE+oM3hi1TAJfy+N0RyNNlg6eAoysxbvZ3r4fnQdFP8F0ZSyzPXVz2n73zusXHf3021n2Nr6I8022HXzO7RwVu7/5OHg0Ba+GnoK8fmOeB++s2c+Oz095iPa2RNd8V82hg2wFjvrYBsLIB3u3J+AA99uGvx5tqOL3t75Vq4yBjAzd+mr87HL1pEapBqFAbZehaiIQWpshn3di4dpcX639xMPBEiYfjYHdWILgPGIyamwQfKVTpaM8z0+3Bk7MOuCYAAAAABJRU5ErkJggg==';

function fmt(n: number) {
  return (n ?? 0).toLocaleString('he-IL');
}
function fmtDate(s: string | number | undefined | null): string {
  if (!s) return '—';
  const d = typeof s === 'number' ? new Date(s) : new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString(DATE_LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Base CSS — ALL critical colours use !important to beat dark-mode leakage ──
const BASE_CSS = `
  *, *::before, *::after {
    box-sizing: border-box !important;
    color-scheme: light !important;
  }
  body, html {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #1A1A1A !important;
    font-family: Arial, Helvetica, sans-serif !important;
    direction: rtl !important;
    text-align: right !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .pdf-page {
    width: 210mm !important;
    min-height: 100mm !important;
    padding: 12mm 18mm !important;
    background: #ffffff !important;
    color: #1A1A1A !important;
  }
  .pdf-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: flex-start !important;
    margin-bottom: 16px !important;
    padding-bottom: 12px !important;
    border-bottom: 3px solid #E07A38 !important;
    background: #ffffff !important;
  }
  .pdf-header-title {
    font-size: 20px !important;
    font-weight: 800 !important;
    color: #1A1A1A !important;
    margin: 0 !important;
  }
  .pdf-header-sub {
    font-size: 12px !important;
    color: #555555 !important;
    margin-top: 3px !important;
  }
  .pdf-logo {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
  }
  .pdf-logo-img {
    width: 28px !important;
    height: 28px !important;
    border-radius: 6px !important;
  }
  .pdf-logo-text {
    font-size: 14px !important;
    font-weight: 800 !important;
    color: #E07A38 !important;
    letter-spacing: -0.3px !important;
  }
  table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin-top: 10px !important;
    font-size: 11px !important;
    color: #1A1A1A !important;
    background: #ffffff !important;
  }
  th {
    background: #FFF3E8 !important;
    color: #7C3A00 !important;
    padding: 7px 9px !important;
    font-weight: 700 !important;
    border: 1px solid #FED7AA !important;
    text-align: right !important;
    font-size: 11px !important;
  }
  td {
    padding: 6px 9px !important;
    border: 1px solid #E5E7EB !important;
    vertical-align: top !important;
    color: #1A1A1A !important;
    background: #ffffff !important;
    font-size: 11px !important;
  }
  tr:nth-child(even) td { background: #FAFAFA !important; }
  .pdf-section-title {
    font-size: 13px !important;
    font-weight: 800 !important;
    color: #E07A38 !important;
    margin: 14px 0 5px !important;
    padding-bottom: 4px !important;
    border-bottom: 1px solid #FED7AA !important;
  }
  .badge-green  { background: #D1FAE5 !important; color: #065F46 !important; padding: 2px 7px !important; border-radius: 10px !important; font-size: 10px !important; font-weight: 700 !important; }
  .badge-yellow { background: #FEF3C7 !important; color: #92400E !important; padding: 2px 7px !important; border-radius: 10px !important; font-size: 10px !important; font-weight: 700 !important; }
  .badge-red    { background: #FEE2E2 !important; color: #991B1B !important; padding: 2px 7px !important; border-radius: 10px !important; font-size: 10px !important; font-weight: 700 !important; }
  .badge-blue   { background: #DBEAFE !important; color: #1E40AF !important; padding: 2px 7px !important; border-radius: 10px !important; font-size: 10px !important; font-weight: 700 !important; }
  .pdf-footer {
    margin-top: 20px !important;
    padding-top: 7px !important;
    border-top: 1px solid #E5E7EB !important;
    font-size: 10px !important;
    color: #9CA3AF !important;
    display: flex !important;
    justify-content: space-between !important;
    background: #ffffff !important;
  }
  .info-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 7px !important;
    margin-top: 10px !important;
  }
  .info-item {
    background: #F9FAFB !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 6px !important;
    padding: 7px 10px !important;
  }
  .info-label {
    font-size: 9px !important;
    color: #6B7280 !important;
    font-weight: 700 !important;
    margin-bottom: 2px !important;
    text-transform: uppercase !important;
  }
  .info-value {
    font-size: 12px !important;
    font-weight: 700 !important;
    color: #1A1A1A !important;
  }
  .log-card {
    margin-bottom: 14px !important;
    padding: 9px 11px !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 7px !important;
    border-right: 4px solid #E07A38 !important;
    background: #ffffff !important;
    color: #1A1A1A !important;
  }
  .check-box {
    display: inline-flex !important;
    width: 14px !important; height: 14px !important;
    min-width: 14px !important;
    border: 2px solid #D1D5DB !important;
    border-radius: 3px !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 9px !important;
  }
  .check-box.done {
    background: #10B981 !important;
    border-color: #10B981 !important;
    color: #ffffff !important;
  }
  p, span, div, li, td, th, h1, h2, h3 {
    color: inherit !important;
  }
`;

// ── Header / footer helpers ────────────────────────────────────────────────

function header(title: string, subtitle: string): string {
  const now = new Date().toLocaleDateString(DATE_LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `
    <div class="pdf-header">
      <div>
        <div class="pdf-header-title">${title}</div>
        <div class="pdf-header-sub">${subtitle}</div>
      </div>
      <div class="pdf-logo">
        <img class="pdf-logo-img" src="${LOGO_IMG}" alt="לוגו" />
        <span class="pdf-logo-text">BuildSync</span>
      </div>
    </div>`;
}

function footer(): string {
  const now = new Date().toLocaleDateString(DATE_LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `
    <div class="pdf-footer">
      <span>BuildSync — ניהול בנייה חכם</span>
      <span>הופק: ${now}</span>
    </div>`;
}

/**
 * Wrap section HTML in a full page with header, footer and shared CSS.
 * The outer div has explicit background+color so dark-mode can't override it.
 */
export function pageWrap(title: string, subtitle: string, body: string): string {
  return `
    <div style="background:#ffffff!important;color:#1A1A1A!important;color-scheme:light!important;">
      <style>${BASE_CSS}</style>
      <div class="pdf-page">
        ${header(title, subtitle)}
        ${body}
        ${footer()}
      </div>
    </div>`;
}

// ── 00: Cover / Project summary ────────────────────────────────────────────

export function buildSummaryHtml(project: any, rooms: any[]): string {
  const p = project ?? {};
  const infoRows: [string, string][] = [
    ['שם הפרויקט', p.name ?? '—'],
    ['כתובת', p.address ?? '—'],
    ['בעל הפרויקט', p.ownerName ?? '—'],
    ['מנהל עבודה', p.managerName ?? '—'],
    ['מפקח', p.inspectorName ?? '—'],
    ['שטח כולל', p.areaSqm ? `${p.areaSqm} מ"ר` : '—'],
    ['קומות', p.floors ?? '—'],
    ['תאריך התחלה', fmtDate(p.startDate)],
    ['תאריך סיום מתוכנן', fmtDate(p.expectedEnd)],
    ['תקציב כולל', p.budgetTotal ? `₪${fmt(p.budgetTotal)}` : '—'],
    ['התקדמות', p.progressPct != null ? `${p.progressPct}%` : '—'],
    ['שלב נוכחי', p.currentStageName ?? '—'],
  ];

  const infoHtml = infoRows.map(([label, val]) => `
    <div class="info-item">
      <div class="info-label">${label}</div>
      <div class="info-value">${val}</div>
    </div>`).join('');

  const roomsHtml = rooms?.length ? `
    <div class="pdf-section-title">חדרים ושטחים</div>
    <table>
      <tr><th>חדר</th><th>קומה</th><th>שטח (מ"ר)</th><th>רטוב</th><th>מיזוג</th></tr>
      ${rooms.map((r: any) => `
        <tr>
          <td style="font-weight:700;color:#1A1A1A!important">${r.name ?? '—'}</td>
          <td>${r.floor ?? '—'}</td>
          <td>${r.sizeSqm ?? r.size ?? '—'}</td>
          <td>${r.isWet ? '✓' : ''}</td>
          <td>${r.needsAc ? '✓' : ''}</td>
        </tr>`).join('')}
    </table>` : '';

  return pageWrap(
    p.name ?? 'פרויקט',
    `דף שער | ${fmtDate(p.startDate)} — ${fmtDate(p.expectedEnd)}`,
    `<div class="pdf-section-title">פרטי הפרויקט</div>
     <div class="info-grid">${infoHtml}</div>
     ${roomsHtml}`,
  );
}

// ── 01: Stages ─────────────────────────────────────────────────────────────

export function buildStagesHtml(stages: any[], project: any): string {
  if (!stages?.length) return pageWrap('שלבי בנייה', project?.name ?? '', '<p style="color:#6B7280!important">אין שלבים.</p>');

  const rows = stages.map((s: any) => {
    const pct = s.progressPct ?? s.progress ?? 0;
    const barColor = pct >= 100 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#E07A38';
    const progressBar = `
      <div style="background:#E5E7EB!important;border-radius:4px;height:7px;width:100%!important">
        <div style="background:${barColor}!important;border-radius:4px;height:7px;width:${pct}%!important"></div>
      </div>
      <span style="font-size:9px!important;color:#6B7280!important">${pct}%</span>`;

    const tasks = (s.tasks ?? []).map((t: any) =>
      `<div style="display:flex;align-items:flex-start;gap:5px;margin:3px 0!important">
         <span class="check-box ${t.done ? 'done' : ''}">${t.done ? '✓' : ''}</span>
         <span style="font-size:10px!important;color:#1A1A1A!important">${t.name ?? t.title ?? ''}</span>
       </div>`).join('') || '<span style="font-size:9px!important;color:#9CA3AF!important">אין</span>';

    return `
      <tr>
        <td style="font-weight:700!important;color:#1A1A1A!important">${s.name ?? '—'}</td>
        <td>${s.contractorRole ?? '—'}</td>
        <td>${fmtDate(s.startDate)}</td>
        <td>${fmtDate(s.endDate)}</td>
        <td>${s.amount ? `₪${fmt(s.amount)}` : '—'}</td>
        <td>${progressBar}</td>
        <td>${tasks}</td>
      </tr>`;
  }).join('');

  return pageWrap('שלבי בנייה ומשימות', project?.name ?? '', `
    <table>
      <tr><th>שם שלב</th><th>קבלן</th><th>התחלה</th><th>סיום</th><th>סכום</th><th>התקדמות</th><th>משימות</th></tr>
      ${rows}
    </table>`);
}

// ── 02: Contractors ────────────────────────────────────────────────────────

export function buildContractorsHtml(contractors: any[], project: any): string {
  if (!contractors?.length) return pageWrap('קבלנים ותשלומים', project?.name ?? '', '<p style="color:#6B7280!important">אין קבלנים.</p>');

  const sections = contractors.map((c: any) => {
    const milestones = c.paymentMilestones ?? [];
    const total = milestones.reduce((a: number, m: any) => a + (m.amount ?? 0), 0);
    const paid = milestones.filter((m: any) => m.isPaid).reduce((a: number, m: any) => a + (m.amount ?? 0), 0);

    const rows = milestones.map((m: any) => `
      <tr>
        <td style="color:#1A1A1A!important">${m.name ?? m.description ?? '—'}</td>
        <td style="color:#1A1A1A!important">₪${fmt(m.amount ?? 0)}</td>
        <td>${m.isPaid
          ? `<span class="badge-green">שולם${m.paidAt ? ' ' + fmtDate(m.paidAt) : ''}</span>`
          : '<span class="badge-yellow">ממתין</span>'}</td>
      </tr>`).join('');

    return `
      <div class="pdf-section-title">👷 ${c.name ?? '—'}${c.role ? ` — ${c.role}` : ''}</div>
      <div style="font-size:11px!important;color:#374151!important;margin-bottom:7px!important">
        ${c.phone ? `📞 ${c.phone} &nbsp;` : ''}
        ${c.email ? `✉ ${c.email} &nbsp;` : ''}
        סה"כ: <strong style="color:#1A1A1A!important">₪${fmt(total)}</strong> &nbsp;|&nbsp;
        שולם: <strong style="color:#10B981!important">₪${fmt(paid)}</strong> &nbsp;|&nbsp;
        יתרה: <strong style="color:#E07A38!important">₪${fmt(total - paid)}</strong>
      </div>
      ${milestones.length ? `
        <table>
          <tr><th>אבן דרך / תשלום</th><th>סכום</th><th>סטטוס</th></tr>
          ${rows}
        </table>` : '<p style="font-size:10px!important;color:#9CA3AF!important">אין לוח תשלומים.</p>'}`;
  }).join('');

  return pageWrap('קבלנים ותשלומים', project?.name ?? '', sections);
}

// ── 03: Daily logs ─────────────────────────────────────────────────────────

export function buildDailyLogsHtml(logs: any[], project: any): string {
  if (!logs?.length) return pageWrap('יומני עבודה', project?.name ?? '', '<p style="color:#6B7280!important">אין יומנים.</p>');

  const cards = logs.map((log: any) => {
    const workforce = log.workforce?.length
      ? log.workforce.map((w: any) => `${w.contractorName ?? 'קבלן'}: ${w.workersCount}`).join(' | ')
      : '—';

    const activities = log.activities?.length
      ? `<ul style="margin:0!important;padding-right:14px!important;font-size:10px!important;color:#1A1A1A!important">
          ${log.activities.map((a: any) => {
            const badge = a.status === 'completed' ? 'badge-green' : a.status === 'delayed' ? 'badge-red' : 'badge-blue';
            const label = a.status === 'completed' ? 'הושלם' : a.status === 'delayed' ? 'עיכוב' : 'בביצוע';
            return `<li style="color:#1A1A1A!important">${a.description} <span class="${badge}">${label}</span></li>`;
          }).join('')}
         </ul>`
      : '<span style="font-size:10px!important;color:#9CA3AF!important">אין</span>';

    const issues = log.issues?.length
      ? `<ul style="margin:0!important;padding-right:14px!important;font-size:10px!important;color:#1A1A1A!important">
          ${log.issues.map((i: any) => `<li style="color:#1A1A1A!important"><span class="badge-red">${i.type ?? 'בעיה'}</span> ${i.description ?? ''}</li>`).join('')}
         </ul>`
      : '';

    return `
      <div class="log-card">
        <div style="display:flex!important;justify-content:space-between!important;margin-bottom:7px!important">
          <strong style="font-size:13px!important;color:#1A1A1A!important">${log.date ?? '—'}</strong>
          <span style="font-size:10px!important;color:#6B7280!important">
            ${log.weather ? `🌤 ${log.weather}` : ''}
            ${log.temperature ? ` ${log.temperature}°` : ''}
          </span>
        </div>
        <div style="display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;font-size:11px!important">
          <div>
            <div style="font-weight:700!important;color:#374151!important;margin-bottom:3px!important">כוח אדם</div>
            <span style="color:#1A1A1A!important">${workforce}</span>
          </div>
          <div>
            <div style="font-weight:700!important;color:#374151!important;margin-bottom:3px!important">פעילויות</div>
            ${activities}
          </div>
          ${issues ? `<div style="grid-column:1/-1!important">
            <div style="font-weight:700!important;color:#DC2626!important;margin-bottom:3px!important">בעיות</div>
            ${issues}
          </div>` : ''}
        </div>
        ${log.status === 'locked' ? '<div style="margin-top:6px!important;font-size:9px!important;color:#6B7280!important">🔒 יומן מאושר ונעול</div>' : ''}
      </div>`;
  }).join('');

  return pageWrap('יומני עבודה', `${project?.name ?? ''} | ${logs.length} יומנים`, cards);
}

// ── 04: Permits ────────────────────────────────────────────────────────────

export function buildPermitsHtml(permits: any[], project: any): string {
  if (!permits?.length) return pageWrap('היתרים ורישוי', project?.name ?? '', '<p style="color:#6B7280!important">אין היתרים.</p>');

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { approved: 'badge-green', active: 'badge-green', pending: 'badge-yellow', expired: 'badge-red', rejected: 'badge-red' };
    const label: Record<string, string> = { approved: 'מאושר', active: 'פעיל', pending: 'ממתין', expired: 'פג תוקף', rejected: 'נדחה' };
    return `<span class="${map[status] ?? 'badge-blue'}">${label[status] ?? status}</span>`;
  };

  const rows = permits.map((p: any) => `
    <tr>
      <td style="font-weight:700!important;color:#1A1A1A!important">${p.title ?? '—'}</td>
      <td style="color:#1A1A1A!important">${p.authority ?? '—'}</td>
      <td>${statusBadge(p.status ?? '')}</td>
      <td style="color:#1A1A1A!important">${fmtDate(p.expirationDate)}</td>
      <td style="color:#1A1A1A!important">${p.notes ?? '—'}</td>
      <td style="color:#10B981!important">${p.url ? '✓ מצורף' : ''}</td>
    </tr>`).join('');

  return pageWrap('היתרים ורישוי', project?.name ?? '', `
    <table>
      <tr><th>שם המסמך</th><th>רשות</th><th>סטטוס</th><th>תוקף</th><th>הערות</th><th>קובץ</th></tr>
      ${rows}
    </table>`);
}

// ── 05: Checklists ─────────────────────────────────────────────────────────

export function buildChecklistsHtml(checklists: any[], project: any): string {
  if (!checklists?.length) return pageWrap("צ'קליסטים", project?.name ?? '', '<p style="color:#6B7280!important">אין רשימות.</p>');

  const sections = checklists.map((cl: any) => {
    const total = cl.items?.length ?? 0;
    const done = cl.items?.filter((i: any) => i.isDone || i.checked).length ?? 0;
    const items = (cl.items ?? []).map((item: any) => {
      const checked = item.isDone || item.checked;
      return `
        <div style="display:flex!important;align-items:flex-start!important;gap:6px!important;margin:4px 0!important">
          <span class="check-box ${checked ? 'done' : ''}">${checked ? '✓' : ''}</span>
          <span style="font-size:11px!important;color:${checked ? '#9CA3AF' : '#1A1A1A'}!important;${checked ? 'text-decoration:line-through!important' : ''}">${item.title ?? item.text ?? '—'}</span>
          ${item.notes ? `<span style="font-size:9px!important;color:#9CA3AF!important"> — ${item.notes}</span>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="pdf-section-title">${cl.title ?? cl.name ?? 'רשימה'} (${done}/${total})</div>
      ${items || '<span style="font-size:10px!important;color:#9CA3AF!important">אין פריטים.</span>'}`;
  }).join('');

  return pageWrap("צ'קליסטים", project?.name ?? '', sections);
}

// ── 06: Activity feed ──────────────────────────────────────────────────────

export function buildActivityHtml(feed: any[], project: any): string {
  if (!feed?.length) return pageWrap('יומן פעילות', project?.name ?? '', '<p style="color:#6B7280!important">אין פעילות.</p>');

  const rows = feed.slice(0, 500).map((item: any) => `
    <tr>
      <td style="color:#6B7280!important;font-size:10px!important;white-space:nowrap!important">${fmtDate(item._creationTime ?? item.createdAt)}</td>
      <td style="color:#1A1A1A!important">${item.text ?? item.message ?? '—'}</td>
      <td style="color:#6B7280!important;font-size:10px!important">${item.authorName ?? ''}</td>
    </tr>`).join('');

  return pageWrap('יומן פעילות', `${project?.name ?? ''} | ${feed.length} רשומות`, `
    <table>
      <tr><th>תאריך</th><th>פעולה</th><th>ביצע</th></tr>
      ${rows}
    </table>`);
}
