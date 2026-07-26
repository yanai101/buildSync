import JSZip from 'jszip';
import {
  buildSummaryHtml,
  buildStagesHtml,
  buildContractorsHtml,
  buildDailyLogsHtml,
  buildPermitsHtml,
  buildChecklistsHtml,
  buildActivityHtml,
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

/** Infer file extension from mime type or original name. */
function fileExt(mime: string, originalName?: string): string {
  if (originalName) {
    const m = originalName.match(/\.([a-zA-Z0-9]+)$/);
    if (m) return `.${m[1].toLowerCase()}`;
  }
  const MAP: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png',
    'image/webp': '.webp', 'image/gif': '.gif',
    'application/pdf': '.pdf',
  };
  return MAP[mime] ?? '';
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
  URL.revokeObjectURL(url);
}

// ── Main export function ───────────────────────────────────────────────────

/**
 * Builds a ZIP archive from the export manifest returned by Convex.
 * PDFs are generated via html2pdf.js (same as BOQ export).
 * Tabular data is exported as UTF-8 CSV (opens in Excel).
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
  // Phase 1: Generate PDFs
  // ─────────────────────────────────────────────────────────────────────────
  const pdfSteps: Array<{ name: string; htmlFn: () => string; file: string }> = [
    {
      name: 'דף שער — פרטי פרויקט',
      file: '00_סיכום_פרויקט.pdf',
      htmlFn: () => buildSummaryHtml(project, project.rooms ?? []),
    },
    ...(manifest.stages?.length ? [{
      name: 'שלבי בנייה ומשימות',
      file: '01_שלבי_בנייה.pdf',
      htmlFn: () => buildStagesHtml(manifest.stages, project),
    }] : []),
    ...(manifest.contractors?.length ? [{
      name: 'קבלנים ותשלומים',
      file: '02_קבלנים.pdf',
      htmlFn: () => buildContractorsHtml(manifest.contractors, project),
    }] : []),
    ...(manifest.dailyLogs?.length ? [{
      name: 'יומני עבודה',
      file: '03_יומני_עבודה.pdf',
      htmlFn: () => buildDailyLogsHtml(manifest.dailyLogs, project),
    }] : []),
    ...(manifest.permits?.length ? [{
      name: 'היתרים ורישוי',
      file: '04_היתרים_ורישוי.pdf',
      htmlFn: () => buildPermitsHtml(manifest.permits, project),
    }] : []),
    ...(manifest.checklists?.length ? [{
      name: "צ'קליסטים",
      file: '05_צ\'קליסטים.pdf',
      htmlFn: () => buildChecklistsHtml(manifest.checklists, project),
    }] : []),
    ...(manifest.activityFeed?.length ? [{
      name: 'יומן פעילות',
      file: '06_יומן_פעילות.pdf',
      htmlFn: () => buildActivityHtml(manifest.activityFeed, project),
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
    const rows: Record<string, any>[] = [];
    for (const c of manifest.contractors) {
      for (const m of c.paymentMilestones ?? []) {
        rows.push({
          קבלן: c.name ?? '',
          תפקיד: c.role ?? '',
          'שלב / אבן דרך': m.name ?? m.description ?? '',
          'סכום (₪)': m.amount ?? 0,
          סטטוס: m.isPaid ? 'שולם' : 'ממתין',
          'תאריך תשלום': m.paidAt ? new Date(m.paidAt).toLocaleDateString('he-IL') : '',
        });
      }
    }
    if (rows.length) {
      root.file('07_תשלומים_קבלנים.csv',
        toCsv(rows, ['קבלן', 'תפקיד', 'שלב / אבן דרך', 'סכום (₪)', 'סטטוס', 'תאריך תשלום']));
    }
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
      תיאור: item.name ?? item.description ?? '',
      קטגוריה: item.category ?? item.cat ?? '',
      יחידה: item.unit ?? '',
      כמות: item.qty ?? item.quantity ?? '',
      'מחיר יחידה (₪)': item.unitPrice ?? '',
      'סה"כ (₪)': ((item.qty ?? item.quantity ?? 0) * (item.unitPrice ?? 0)) || '',
      ספק: item.supplier ?? '',
      סטטוס: item.status ?? '',
    }));
    root.file('09_BOQ_כמויות.csv',
      toCsv(rows, ['תיאור', 'קטגוריה', 'יחידה', 'כמות', 'מחיר יחידה (₪)', 'סה"כ (₪)', 'ספק', 'סטטוס']));
  }

  // Orders CSV
  if (manifest.orders?.length) {
    const rows = manifest.orders.map((o: any) => ({
      תיאור: o.description ?? o.title ?? '',
      כמות: o.quantity ?? '',
      ספק: o.supplier ?? o.vendor ?? '',
      סטטוס: o.status ?? '',
      תאריך: o.orderDate ? new Date(o.orderDate).toLocaleDateString('he-IL') : '',
      הערות: o.notes ?? '',
    }));
    root.file('10_הזמנות_חומרים.csv',
      toCsv(rows, ['תיאור', 'כמות', 'ספק', 'סטטוס', 'תאריך', 'הערות']));
  }

  // Timeline CSV
  if (manifest.timeline?.length) {
    const rows = manifest.timeline.map((t: any) => ({
      שם: t.title ?? t.label ?? '',
      'תחילה מתוכנן': t.plannedStart ? new Date(t.plannedStart).toLocaleDateString('he-IL') : '',
      'סיום מתוכנן': t.plannedEnd ? new Date(t.plannedEnd).toLocaleDateString('he-IL') : '',
      'תחילה בפועל': t.actualStart ? new Date(t.actualStart).toLocaleDateString('he-IL') : '',
      'סיום בפועל': t.actualEnd ? new Date(t.actualEnd).toLocaleDateString('he-IL') : '',
    }));
    root.file('11_ציר_זמן.csv',
      toCsv(rows, ['שם', 'תחילה מתוכנן', 'סיום מתוכנן', 'תחילה בפועל', 'סיום בפועל']));
  }

  // Price quotes CSV
  if (manifest.priceQuotes?.length) {
    const rows = manifest.priceQuotes.map((q: any) => ({
      נושא: q.topicKey ?? '',
      תיאור: q.description ?? '',
      'מחיר מינימום': q.priceMin ?? '',
      'מחיר מקסימום': q.priceMax ?? '',
      'מחיר ממוצע': q.priceAvg ?? '',
      יחידה: q.unit ?? '',
    }));
    root.file('12_הצעות_מחיר.csv',
      toCsv(rows, ['נושא', 'תיאור', 'מחיר מינימום', 'מחיר מקסימום', 'מחיר ממוצע', 'יחידה']));
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

  // Daily log images
  if (manifest.dailyLogs?.length) {
    const logsImgFolder = root.folder('תמונות_יומני_עבודה')!;
    for (const log of manifest.dailyLogs) {
      for (const img of log.images ?? []) {
        if (img.url) {
          tasks.push({ url: img.url, folder: logsImgFolder.folder(log.date ?? 'unknown')!, filename: `image_${img.storageId?.slice(-6) ?? Date.now()}.jpg`, label: `יומן ${log.date}` });
        }
      }
    }
  }

  // Uploaded documents
  if (manifest.documents?.length) {
    const docsFolder = root.folder('מסמכים_מקוריים')!;
    for (const doc of manifest.documents) {
      if (doc.url) {
        tasks.push({ url: doc.url, folder: docsFolder, filename: safe(doc.originalName) + fileExt(doc.storedMimeType, doc.originalName), label: `מסמך: ${doc.originalName}` });
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

  // Contractor files
  if (manifest.contractors?.length) {
    for (const c of manifest.contractors) {
      const contractorFolder = root.folder(`מסמכים_מקוריים/קבלנים/${safe(c.name ?? 'contractor')}`)!;
      for (const f of c.files ?? []) {
        if (f.url) {
          tasks.push({ url: f.url, folder: contractorFolder, filename: safe(f.originalName) + fileExt(f.storedMimeType, f.originalName), label: `${c.name}: ${f.originalName}` });
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
