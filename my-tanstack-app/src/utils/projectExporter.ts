import JSZip from 'jszip';
import {
  buildSummaryHtml,
  buildPermitsHtml,
} from '../components/print-templates/pdfTemplates';

// ── Types ──────────────────────────────────────────────────────────────────

export type ExportSections = {
  dailyLogs: boolean;
  photos: boolean;
  stages: boolean;
  contractors: boolean;
  documents: boolean;
  permits: boolean;
  budget: boolean;
  boq: boolean;
  orders: boolean;
  checklists: boolean;
  timeline: boolean;
  activityFeed: boolean;
  priceQuotes: boolean;
};

export type ExportProgress = {
  phase: 'preparing' | 'downloading' | 'packing' | 'done' | 'error';
  current: number;
  total: number;
  label: string;
};

export type ProgressCallback = (p: ExportProgress) => void;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Download a file from a URL and return its ArrayBuffer. Returns null on failure. */
async function fetchBinary(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/** Sanitize a string so it's safe as a filename / folder name. */
function safe(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 80) || 'untitled';
}

/** Format a date as YYYY-MM-DD for filenames. */
function dateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Preserve an uploaded filename (including its extension) exactly once. */
export function originalArchiveFilename(originalName?: string): string {
  return safe(originalName ?? 'file');
}

/** Build a UTF-8 BOM CSV blob (opens correctly in Excel with Hebrew). */
function toCsv(rows: Record<string, any>[], columns: string[]): Uint8Array {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => {
      const val = row[col] ?? '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(','),
  );
  const csv = '\uFEFF' + [header, ...lines].join('\n'); // BOM for Excel Hebrew
  return new TextEncoder().encode(csv);
}

/**
 * Render an HTML string through html2pdf and return a Blob.
 * Uses dynamic import so the browser-only library never loads in Node/SSR.
 */
async function htmlToPdfBlob(html: string, filename: string): Promise<Blob> {
  // Dynamic import — html2pdf.js uses `self` which only exists in the browser
  const { default: html2pdf } = await import('html2pdf.js');
  return new Promise((resolve, reject) => {
    const opt = {
      margin: 0,
      filename,
      image: { type: 'jpeg' as const, quality: 0.97 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: 'portrait' as const,
      },
    };
    html2pdf()
      .set(opt)
      .from(html)
      .outputPdf('blob')
      .then(resolve)
      .catch(reject);
  });
}

/** Trigger a browser file download from a Blob. */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking in the same task can cancel the browser's navigation before it
  // starts, especially for a large ZIP. Keep the object URL alive briefly.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── Main export function ───────────────────────────────────────────────────

/**
 * Builds a ZIP archive from the export manifest returned by Convex.
 * PDFs are kept for concise document-style content. Operational data is
 * exported as UTF-8 CSV (opens in Excel), avoiding huge browser-generated PDFs.
 * Binary files (photos, documents) are downloaded directly.
 */
export async function buildProjectZip(
  manifest: any,
  onProgress: ProgressCallback,
): Promise<Blob> {
  const zip = new JSZip();
  const project = manifest.project ?? {};
  const projectName = safe(project.name ?? 'project');
  const exportDate = dateStr(Date.now());
  const root = zip.folder(`BuildPro_${projectName}_${exportDate}`)!;

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 1: Generate concise PDFs
  // ─────────────────────────────────────────────────────────────────────────
  const pdfSteps: Array<{ name: string; htmlFn: () => string; file: string }> = [
    {
      name: 'דף שער — פרטי פרויקט',
      file: '00_סיכום_פרויקט.pdf',
      htmlFn: () => buildSummaryHtml(project, project.rooms ?? []),
    },
    ...(manifest.permits?.length ? [{
      name: 'היתרים ורישוי',
      file: '01_היתרים_ורישוי.pdf',
      htmlFn: () => buildPermitsHtml(manifest.permits, project),
    }] : []),
  ];

  for (let i = 0; i < pdfSteps.length; i++) {
    const step = pdfSteps[i];
    onProgress({
      phase: 'preparing',
      current: i,
      total: pdfSteps.length,
      label: `יוצר PDF: ${step.name}`,
    });
    const html = step.htmlFn();
    const blob = await htmlToPdfBlob(html, step.file);
    root.file(step.file, blob);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2: Generate CSVs
  // ─────────────────────────────────────────────────────────────────────────
  onProgress({ phase: 'preparing', current: pdfSteps.length, total: pdfSteps.length + 1, label: 'יוצר קבצי Excel (CSV)...' });

  // Contractors payments CSV
  if (manifest.contractors?.length) {
    const contractorsFolder = root.folder('קבלנים')!;
    const contractorRows = manifest.contractors.map((c: any) => ({
      קבלן: c.name ?? '',
      חברה: c.company ?? '',
      תפקיד: c.role ?? '',
      טלפון: c.phone ?? '',
      אימייל: c.email ?? '',
      סטטוס: c.status === 'completed' ? 'הושלם' : c.status === 'active' ? 'פעיל' : 'ממתין',
      דירוג: c.rating ?? '',
      'תקציב (₪)': c.budget ?? 0,
      'שולם (₪)': c.paid ?? 0,
      'כולל מע״מ': c.includesVat ? 'כן' : 'לא',
    }));
    contractorsFolder.file('00_קבלנים.csv', toCsv(contractorRows,
      ['קבלן', 'חברה', 'תפקיד', 'טלפון', 'אימייל', 'סטטוס', 'דירוג', 'תקציב (₪)', 'שולם (₪)', 'כולל מע״מ']));

    const rows: Record<string, any>[] = [];
    const notesRows: Record<string, any>[] = [];
    for (const c of manifest.contractors) {
      for (const note of c.notes ?? []) {
        notesRows.push({
          קבלן: c.name ?? '',
          הערה: note.text ?? '',
          כותב: note.authorName ?? '',
          תפקיד: note.authorRole ?? '',
          'תאריך יצירה': note.createdAt ? new Date(note.createdAt).toLocaleString('he-IL') : '',
        });
      }
      for (const m of c.paymentMilestones ?? []) {
        const partialPaid = (m.partialPayments ?? []).reduce(
          (sum: number, payment: any) => sum + (Number(payment.amount) || 0),
          0,
        );
        const isPaid = m.paid === true;
        const paidAmount = isPaid
          ? (Number(m.amount) || 0) + (Number(m.vatAmount) || 0)
          : partialPaid;
        rows.push({
          קבלן: c.name ?? '',
          תפקיד: c.role ?? '',
          'אבן דרך / תשלום': m.name ?? '',
          תנאי_תשלום: m.triggerText ?? '',
          'סכום לתשלום (₪)': m.amount ?? 0,
          'מע״מ (₪)': m.vatAmount ?? 0,
          'שולם בפועל (₪)': paidAmount,
          'יתרה (₪)': Math.max(0, (Number(m.amount) || 0) - partialPaid),
          סטטוס: isPaid ? 'שולם' : partialPaid > 0 ? 'שולם חלקית' : 'ממתין',
          'תאריך תשלום': m.paidAt ? new Date(m.paidAt).toLocaleDateString('he-IL') : '',
        });
      }
    }
    if (rows.length) {
      contractorsFolder.file('01_תשלומים.csv',
        toCsv(rows, ['קבלן', 'תפקיד', 'אבן דרך / תשלום', 'תנאי_תשלום', 'סכום לתשלום (₪)', 'מע״מ (₪)', 'שולם בפועל (₪)', 'יתרה (₪)', 'סטטוס', 'תאריך תשלום']));
    }
    if (notesRows.length) {
      contractorsFolder.file('02_הערות.csv', toCsv(notesRows,
        ['קבלן', 'הערה', 'כותב', 'תפקיד', 'תאריך יצירה']));
    }
  }

  // Stages, tasks, and milestones can grow significantly, so keep each table
  // independently usable in Excel rather than generating a long PDF.
  if (manifest.stages?.length) {
    const stagesFolder = root.folder('שלבי_בנייה')!;
    const stageRows: Record<string, any>[] = [];
    const taskRows: Record<string, any>[] = [];
    const milestoneRows: Record<string, any>[] = [];
    for (const stage of manifest.stages) {
      stageRows.push({
        שלב: stage.name ?? '',
        'תפקיד קבלן': stage.contractorRole ?? '',
        'תאריך התחלה': stage.startDate ?? '',
        'תאריך סיום': stage.endDate ?? '',
        התקדמות: `${stage.progressPct ?? 0}%`,
        סטטוס: stage.status === 'done' ? 'הושלם' : stage.status === 'active' ? 'פעיל' : 'ממתין',
        'תשלום שלב (₪)': stage.payment?.amount ?? 0,
        'סטטוס תשלום': stage.payment?.status ?? '',
        'תאריך תשלום': stage.payment?.paidAt ?? '',
      });
      for (const task of stage.tasks ?? []) {
        taskRows.push({
          שלב: stage.name ?? '', משימה: task.name ?? '', אחראי: task.assignee ?? '',
          חובה: task.required ? 'כן' : 'לא',
          סטטוס: task.done ? 'הושלמה' : 'פתוחה', סדר: task.sortOrder ?? '',
        });
      }
      for (const milestone of stage.milestones ?? []) {
        milestoneRows.push({
          שלב: stage.name ?? '', 'אבן דרך': milestone.name ?? '', אחוז: `${milestone.pct ?? 0}%`,
          'סכום (₪)': milestone.amount ?? 0, סטטוס: milestone.status ?? '',
          'תאריך תשלום': milestone.paidAt ?? '', סדר: milestone.sortOrder ?? '',
        });
      }
    }
    stagesFolder.file('00_שלבים.csv', toCsv(stageRows,
      ['שלב', 'תפקיד קבלן', 'תאריך התחלה', 'תאריך סיום', 'התקדמות', 'סטטוס', 'תשלום שלב (₪)', 'סטטוס תשלום', 'תאריך תשלום']));
    if (taskRows.length) stagesFolder.file('01_משימות.csv', toCsv(taskRows, ['שלב', 'משימה', 'אחראי', 'חובה', 'סטטוס', 'סדר']));
    if (milestoneRows.length) stagesFolder.file('02_אבני_דרך.csv', toCsv(milestoneRows, ['שלב', 'אבן דרך', 'אחוז', 'סכום (₪)', 'סטטוס', 'תאריך תשלום', 'סדר']));
  }

  // Daily logs are intentionally a date-organized CSV export: they can have
  // hundreds of entries and multiple attached files per day.
  if (manifest.dailyLogs?.length) {
    const logsFolder = root.folder('יומני_עבודה')!;
    const logsRows: Record<string, any>[] = [];
    const workforceRows: Record<string, any>[] = [];
    const activityRows: Record<string, any>[] = [];
    const deliveryRows: Record<string, any>[] = [];
    const issueRows: Record<string, any>[] = [];
    const instructionRows: Record<string, any>[] = [];
    for (const log of manifest.dailyLogs) {
      logsRows.push({
        תאריך: log.date ?? '', מזג_אוויר: log.weather ?? '', טמפרטורה: log.temperature ?? '',
        סטטוס: log.status === 'locked' ? 'נעול' : 'טיוטה', 'מספר צוותים': (log.workforce ?? []).length,
        פעילויות: (log.activities ?? []).length, אספקות: (log.deliveries ?? []).length,
        בעיות: (log.issues ?? []).length, הנחיות: (log.instructions ?? []).length,
        קבצים: (log.images ?? []).length,
        'עדכון אחרון': log.updatedAt ? new Date(log.updatedAt).toLocaleString('he-IL') : '',
      });
      for (const item of log.workforce ?? []) workforceRows.push({ תאריך: log.date ?? '', קבלן: item.contractorName ?? '', עובדים: item.workersCount ?? 0, הערות: item.notes ?? '' });
      for (const item of log.activities ?? []) activityRows.push({ תאריך: log.date ?? '', פעילות: item.description ?? '', סטטוס: item.status ?? '', קבלן: item.contractorId ?? '' });
      for (const item of log.deliveries ?? []) deliveryRows.push({ תאריך: log.date ?? '', סוג: item.type === 'equipment' ? 'ציוד' : 'חומר', תיאור: item.description ?? '' });
      for (const item of log.issues ?? []) issueRows.push({ תאריך: log.date ?? '', סוג: item.type ?? '', תיאור: item.description ?? '', 'השפעה כספית': item.financialImpact ? 'כן' : 'לא', 'גורם אחראי': item.responsiblePartyId ?? '' });
      for (const item of log.instructions ?? []) instructionRows.push({ תאריך: log.date ?? '', הנחיה: item.text ?? '', 'ניתנה ל־': item.givenToId ?? '' });
    }
    logsFolder.file('00_יומנים.csv', toCsv(logsRows, ['תאריך', 'מזג_אוויר', 'טמפרטורה', 'סטטוס', 'מספר צוותים', 'פעילויות', 'אספקות', 'בעיות', 'הנחיות', 'קבצים', 'עדכון אחרון']));
    if (workforceRows.length) logsFolder.file('01_כוח_אדם.csv', toCsv(workforceRows, ['תאריך', 'קבלן', 'עובדים', 'הערות']));
    if (activityRows.length) logsFolder.file('02_פעילויות.csv', toCsv(activityRows, ['תאריך', 'פעילות', 'סטטוס', 'קבלן']));
    if (deliveryRows.length) logsFolder.file('03_אספקות.csv', toCsv(deliveryRows, ['תאריך', 'סוג', 'תיאור']));
    if (issueRows.length) logsFolder.file('04_בעיות.csv', toCsv(issueRows, ['תאריך', 'סוג', 'תיאור', 'השפעה כספית', 'גורם אחראי']));
    if (instructionRows.length) logsFolder.file('05_הנחיות.csv', toCsv(instructionRows, ['תאריך', 'הנחיה', 'ניתנה ל־']));
  }

  // Budget & expenses CSV
  if (manifest.budget) {
    const { categories, expenses } = manifest.budget;
    const catById = new Map((categories ?? []).map((c: any) => [c._id, c.name]));

    if (expenses?.length) {
      const rows = expenses.map((e: any) => ({
        תיאור: e.description ?? '',
        'סכום (₪)': e.amount ?? 0,
        תאריך: e.expenseDate ?? '',
        קטגוריה: catById.get(e.categoryId) ?? '',
        סטטוס: e.status ?? '',
      }));
      root.file('08_תקציב_הוצאות.csv',
        toCsv(rows, ['תיאור', 'סכום (₪)', 'תאריך', 'קטגוריה', 'סטטוס']));
    }

    if (categories?.length) {
      const catRows = categories.map((c: any) => ({
        קטגוריה: c.name ?? '',
        'תקציב (₪)': c.budget ?? 0,
        'בוצע (₪)': c.spent ?? 0,
        'יתרה (₪)': (c.budget ?? 0) - (c.spent ?? 0),
      }));
      root.file('08_תקציב_קטגוריות.csv',
        toCsv(catRows, ['קטגוריה', 'תקציב (₪)', 'בוצע (₪)', 'יתרה (₪)']));
    }
  }

  // BOQ CSV
  if (manifest.boq?.length) {
    const rows = manifest.boq.map((item: any) => ({
      פריט: item.name ?? '',
      קטגוריה: item.category ?? '',
      יחידה: item.unit ?? '',
      כמות: item.userQty ?? item.qty ?? '',
      'מחיר יחידה (₪)': item.unitPrice ?? '',
      'סה"כ (₪)': (item.userQty ?? item.qty ?? 0) * (item.unitPrice ?? 0),
      ספק: item.supplier ?? '',
      מפרט: item.spec ?? '',
      הערות: item.notes ?? '',
      סטטוס: item.status === 'approved' ? 'מאושר' : 'ממתין',
      'סטטוס תשלום': item.paid ? 'שולם' : 'ממתין',
      'תאריך תשלום': item.paidAt ?? '',
    }));
    root.file('09_BOQ_כמויות.csv',
      toCsv(rows, ['פריט', 'קטגוריה', 'יחידה', 'כמות', 'מחיר יחידה (₪)', 'סה"כ (₪)', 'ספק', 'מפרט', 'הערות', 'סטטוס', 'סטטוס תשלום', 'תאריך תשלום']));
  }

  // Orders CSV
  if (manifest.orders?.length) {
    const rows = manifest.orders.map((o: any) => ({
      הזמנה: o.title ?? '',
      'כמות שהוזמנה': o.orderedQuantity ?? 0,
      'כמות שהתקבלה': o.receivedQuantity ?? 0,
      יחידה: o.unit ?? '',
      ספק: o.supplier ?? '',
      סטטוס: o.status ?? '',
      'תאריך הזמנה': o.orderDate ?? '',
      'תאריך אספקה צפוי': o.expectedDeliveryDate ?? '',
      הערות: o.notes ?? '',
    }));
    root.file('10_הזמנות_חומרים.csv',
      toCsv(rows, ['הזמנה', 'כמות שהוזמנה', 'כמות שהתקבלה', 'יחידה', 'ספק', 'סטטוס', 'תאריך הזמנה', 'תאריך אספקה צפוי', 'הערות']));
  }

  // Timeline CSV
  if (manifest.timeline?.length) {
    const rows = manifest.timeline.map((t: any) => ({
      שם: t.name ?? '',
      'שבוע התחלה': t.colWeek ?? '',
      'משך (שבועות)': t.spanWeeks ?? '',
      שורה: t.rowIndex ?? '',
      סטטוס: t.status === 'done' ? 'הושלם' : t.status === 'active' ? 'פעיל' : 'ממתין',
    }));
    root.file('11_ציר_זמן.csv',
      toCsv(rows, ['שם', 'שבוע התחלה', 'משך (שבועות)', 'שורה', 'סטטוס']));
  }

  // Price quotes CSV
  if (manifest.priceQuotes?.length) {
    const rows = manifest.priceQuotes.map((q: any) => ({
      נושא: q.topicName ?? q.topicKey ?? '',
      ספק: q.supplier ?? '',
      'איש קשר': q.contact ?? '',
      טלפון: q.phone ?? '',
      אימייל: q.email ?? '',
      'סכום כולל (₪)': q.total ?? 0,
      'תוקף ההצעה': q.validity ?? '',
      סטטוס: q.status === 'approved' ? 'נבחרה' : q.status === 'rejected' ? 'נדחתה' : 'ממתינה',
      הערות: q.notes ?? '',
      'תאריך יצירה': q.createdAt ?? '',
      'קובץ מצורף': q.fileName ?? (q.fileUrl ? 'קובץ מצורף' : ''),
    }));
    root.file('12_הצעות_מחיר.csv',
      toCsv(rows, ['נושא', 'ספק', 'איש קשר', 'טלפון', 'אימייל', 'סכום כולל (₪)', 'תוקף ההצעה', 'סטטוס', 'הערות', 'תאריך יצירה', 'קובץ מצורף']));
  }

  if (manifest.checklists?.length) {
    const checklistsFolder = root.folder("צ'קליסטים")!;
    const checklistRows: Record<string, any>[] = [];
    const itemRows: Record<string, any>[] = [];
    for (const checklist of manifest.checklists) {
      checklistRows.push({
        "צ'קליסט": checklist.title ?? '', תיאור: checklist.description ?? '', קטגוריה: checklist.category ?? '',
        סטטוס: checklist.status === 'done' ? 'הושלם' : checklist.status === 'in_progress' ? 'בתהליך' : 'ממתין',
        'תאריך יצירה': checklist.createdAt ? new Date(checklist.createdAt).toLocaleString('he-IL') : '',
      });
      for (const item of checklist.items ?? []) {
        itemRows.push({ "צ'קליסט": checklist.title ?? '', פריט: item.text ?? '', סטטוס: item.isCompleted ? 'הושלם' : 'פתוח', סדר: item.sortOrder ?? '' });
      }
    }
    checklistsFolder.file("00_צ'קליסטים.csv", toCsv(checklistRows, ["צ'קליסט", 'תיאור', 'קטגוריה', 'סטטוס', 'תאריך יצירה']));
    if (itemRows.length) checklistsFolder.file('01_פריטים.csv', toCsv(itemRows, ["צ'קליסט", 'פריט', 'סטטוס', 'סדר']));
  }

  if (manifest.activityFeed?.length) {
    const rows = manifest.activityFeed.map((item: any) => ({
      'תאריך ושעה': item.createdAt ? new Date(item.createdAt).toLocaleString('he-IL') : '',
      משתמש: item.actorName ?? '', תפקיד: item.role ?? '', פעילות: item.text ?? '',
      סוג: item.eventType ?? '', ישות: item.entityRef?.table ?? '', 'מזהה ישות': item.entityRef?.id ?? '',
    }));
    root.folder('יומן_פעילות')!.file('00_פעילות.csv', toCsv(rows,
      ['תאריך ושעה', 'משתמש', 'תפקיד', 'פעילות', 'סוג', 'ישות', 'מזהה ישות']));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 3: Download binary files (photos, documents, permits)
  // ─────────────────────────────────────────────────────────────────────────

  type DownloadTask = {
    url: string;
    folder: JSZip;
    filename: string;
    label: string;
  };
  const tasks: DownloadTask[] = [];

  // Photos
  if (manifest.photos?.length) {
    const photosFolder = root.folder('תמונות')!;
    for (const photo of manifest.photos) {
      const photoLabel = safe(photo.label ?? photo._id?.slice(-8) ?? 'photo');
      const photoFolder = photosFolder.folder(photoLabel)!;

      if (photo.originalUrl) {
        tasks.push({ url: photo.originalUrl, folder: photoFolder, filename: 'original.jpg', label: `תמונה: ${photo.label}` });
      }
      for (const version of photo.versions ?? []) {
        if (version.url) {
          tasks.push({ url: version.url, folder: photoFolder, filename: `version_${version.versionNumber}.jpg`, label: `${photo.label} — גרסה ${version.versionNumber}` });
        }
      }
    }
  }

  // Daily-log files are kept beside their CSVs, organized by log date.
  if (manifest.dailyLogs?.length) {
    const logsFilesFolder = root.folder('יומני_עבודה/קבצים')!;
    for (const log of manifest.dailyLogs) {
      for (const img of log.images ?? []) {
        if (img.url) {
          tasks.push({ url: img.url, folder: logsFilesFolder.folder(log.date ?? 'unknown')!, filename: `image_${img.storageId?.slice(-6) ?? Date.now()}.jpg`, label: `יומן ${log.date}` });
        }
      }
    }
  }

  // Uploaded documents
  if (manifest.documents?.length) {
    const docsFolder = root.folder('מסמכים_מקוריים')!;
    for (const doc of manifest.documents) {
      if (doc.url) {
        tasks.push({ url: doc.url, folder: docsFolder, filename: originalArchiveFilename(doc.originalName), label: `מסמך: ${doc.originalName}` });
      }
    }
  }

  // Permit files
  if (manifest.permits?.length) {
    const permitsFolder = root.folder('מסמכים_מקוריים/היתרים')!;
    for (const permit of manifest.permits) {
      if (permit.url) {
        tasks.push({ url: permit.url, folder: permitsFolder, filename: `${safe(permit.title)}.pdf`, label: `היתר: ${permit.title}` });
      }
    }
  }

  // Quote attachments
  if (manifest.priceQuotes?.length) {
    const quotesFolder = root.folder('הצעות_מחיר')!;
    for (const quote of manifest.priceQuotes) {
      if (quote.fileUrl) {
        const filename = safe(quote.fileName ?? `הצעה_${quote.supplier ?? quote._id}`);
        tasks.push({ url: quote.fileUrl, folder: quotesFolder, filename, label: `הצעת מחיר: ${quote.supplier ?? quote.topicName ?? ''}` });
      }
    }
  }

  // Delivery documents are stored directly on an order, rather than as a
  // projectFile, so they must be collected separately.
  if (manifest.orders?.length) {
    const ordersFolder = root.folder('הזמנות_חומרים/מסמכי_אספקה')!;
    for (const order of manifest.orders) {
      for (const document of order.deliveryDocuments ?? []) {
        if (document.url) {
          tasks.push({
            url: document.url,
            folder: ordersFolder,
            filename: safe(document.name ?? `מסמך_${document.storageId}`),
            label: `מסמך אספקה: ${order.title ?? ''}`,
          });
        }
      }
    }
  }

  // Contractor files
  if (manifest.contractors?.length) {
    for (const c of manifest.contractors) {
      const contractorFolder = root.folder(`מסמכים_מקוריים/קבלנים/${safe(c.name ?? 'contractor')}`)!;
      for (const f of c.files ?? []) {
        if (f.url) {
          tasks.push({ url: f.url, folder: contractorFolder, filename: originalArchiveFilename(f.originalName), label: `${c.name}: ${f.originalName}` });
        }
      }
    }
  }

  // Download files
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    onProgress({ phase: 'downloading', current: i, total: tasks.length, label: task.label });
    const buffer = await fetchBinary(task.url);
    if (buffer) task.folder.file(task.filename, buffer);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 4: Pack ZIP
  // ─────────────────────────────────────────────────────────────────────────
  onProgress({ phase: 'packing', current: 0, total: 100, label: 'אורז קבצים...' });

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (meta) => {
      onProgress({ phase: 'packing', current: Math.round(meta.percent), total: 100, label: `אורז: ${Math.round(meta.percent)}%` });
    },
  );

  onProgress({ phase: 'done', current: tasks.length, total: tasks.length, label: 'הארכיון מוכן!' });
  return blob;
}
