import type { NormalizedQuote, QuoteItem, QuoteSection } from './types';
import { extensionOf, IMAGE_TYPES } from './read';

/**
 * Everything the model returns passes through here, and every number is
 * recomputed rather than trusted. The model is asked only to read; the
 * arithmetic, the reconciliation and the warnings are the code's job.
 */

/** Shape the model is asked to return. Every field may be missing or wrong. */
export interface RawReading {
  unreadable?: boolean;
  supplierName?: string | null;
  currency?: string | null;
  statedTotal?: number | string | null;
  validUntil?: string | null;
  warranty?: string | null;
  paymentTerms?: {
    upfrontPercent?: number | string | null;
    milestones?: string[];
    finalPercent?: number | string | null;
  } | null;
  scopeSummary?: string | null;
  workScope?: string[];
  servicesIncluded?: string[];
  inclusions?: string[];
  exclusions?: string[];
  redFlags?: string[];
  items?: Array<{
    code?: string | null;
    description?: string;
    quantity?: number | string | null;
    unit?: string | null;
    unitPrice?: number | string | null;
    totalPrice?: number | string | null;
  }>;
}

/** A line whose own figures disagree by more than this is reported. */
const LINE_TOLERANCE = 0.01;
/** Items summing this far below the stated total mean lines are missing. */
const MISSING_ITEMS_GAP = 0.1;
/** A smaller mismatch is worth mentioning but is not a failed reading. */
const TOTAL_TOLERANCE = 0.02;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Parses "1,234.56" / "1.234,56" / "₪ 1234" into a number. */
export function parseAmount(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;

  const cleaned = String(raw)
    .replace(/[₪$€]|ils|nis|שח|ש["']ח/gi, '')
    .replace(/\s/g, '')
    .trim();
  if (!cleaned) return undefined;

  let normalized = cleaned;
  // European style "1.234,56" — dot as thousands, comma as decimal.
  if (/,\d{1,2}$/.test(cleaned) && /\./.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function sourceFor(fileName: string): NormalizedQuote['meta']['source'] {
  const ext = extensionOf(fileName);
  if (ext === 'docx') return 'docx';
  if (ext in IMAGE_TYPES) return 'image';
  return 'pdf';
}

/**
 * Turns a reading into a NormalizedQuote, re-deriving every figure and
 * flagging anything that does not reconcile.
 */
export function buildQuoteFromReading(
  reading: RawReading,
  fileName: string,
  options: { idPrefix?: string; supplierName?: string } = {},
): NormalizedQuote {
  const idPrefix = options.idPrefix ?? 'Q';
  const warnings: string[] = [];

  const items: QuoteItem[] = [];
  let index = 0;

  for (const raw of reading.items ?? []) {
    const description = (raw.description ?? '').trim();
    if (!description) continue;

    const quantity = parseAmount(raw.quantity);
    const unitPrice = parseAmount(raw.unitPrice);
    let totalPrice = parseAmount(raw.totalPrice);

    // quantity × unitPrice is arithmetic, so the code owns it.
    if (quantity !== undefined && unitPrice !== undefined) {
      const computed = round2(quantity * unitPrice);
      if (totalPrice === undefined) {
        totalPrice = computed;
      } else if (Math.abs(computed - totalPrice) > Math.max(1, totalPrice * LINE_TOLERANCE)) {
        warnings.push(
          `בסעיף "${description}" הכמות והמחיר ליחידה אינם מסתדרים עם הסכום שנקרא (${totalPrice}).`,
        );
      }
    }

    const item: QuoteItem = { id: `${idPrefix}-${++index}`, description };
    if (raw.code) item.code = String(raw.code);
    if (quantity !== undefined) item.quantity = quantity;
    if (raw.unit) item.unit = String(raw.unit);
    if (unitPrice !== undefined) item.unitPrice = unitPrice;
    if (totalPrice !== undefined) item.totalPrice = totalPrice;
    items.push(item);
  }

  const sections: QuoteSection[] = items.length > 0 ? [{ name: 'סעיפי ההצעה', items }] : [];
  const computedTotal = round2(items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0));
  const statedTotal = parseAmount(reading.statedTotal);

  // A quote priced as a whole rather than per line. Common for a full build,
  // and perfectly comparable through its scope and terms.
  const lumpSum = items.length === 0 && statedTotal !== undefined && statedTotal > 0;
  if (lumpSum) {
    warnings.push('ההצעה מנוסחת כסכום כולל ללא פירוט סעיפים מתומחרים.');
  }

  // The document's own total is the check on the reading: if the lines we got
  // add up to materially less, lines are missing and a comparison built on
  // them would mislead.
  let incomplete = false;
  if (statedTotal !== undefined && statedTotal > 0 && computedTotal > 0) {
    const gap = (statedTotal - computedTotal) / statedTotal;
    if (gap > MISSING_ITEMS_GAP) {
      incomplete = true;
      warnings.push(
        `נקראו סעיפים בסך ${Math.round(computedTotal).toLocaleString()} מתוך ${Math.round(statedTotal).toLocaleString()} — ייתכן שחלק מהסעיפים לא נקראו.`,
      );
    } else if (Math.abs(gap) > TOTAL_TOLERANCE) {
      warnings.push(
        `הסכום הכולל במסמך (${Math.round(statedTotal).toLocaleString()}) שונה מסכום הסעיפים (${Math.round(computedTotal).toLocaleString()}).`,
      );
    }
  }

  const remarks: string[] = [];
  if (reading.scopeSummary) remarks.push(reading.scopeSummary);
  if (reading.warranty) remarks.push(`אחריות: ${reading.warranty}`);
  if (reading.validUntil) remarks.push(`תוקף ההצעה: ${reading.validUntil}`);

  const quote: NormalizedQuote = {
    sections,
    remarks,
    terms: {
      paymentTerms: reading.paymentTerms
        ? {
            upfrontPercent: parseAmount(reading.paymentTerms.upfrontPercent) ?? null,
            milestones: reading.paymentTerms.milestones ?? [],
            finalPercent: parseAmount(reading.paymentTerms.finalPercent) ?? null,
          }
        : null,
      warranty: reading.warranty ?? null,
      validUntil: reading.validUntil ?? null,
      scopeSummary: reading.scopeSummary ?? null,
      workScope: reading.workScope ?? [],
      servicesIncluded: reading.servicesIncluded ?? [],
      inclusions: reading.inclusions ?? [],
      exclusions: reading.exclusions ?? [],
      redFlags: reading.redFlags ?? [],
    },
    meta: {
      source: sourceFor(fileName),
      incomplete,
      lumpSum,
      warnings,
    },
  };

  const supplier = options.supplierName ?? reading.supplierName ?? undefined;
  if (supplier) quote.supplierName = String(supplier);
  if (reading.currency) quote.currency = String(reading.currency);
  if (statedTotal !== undefined) quote.total = statedTotal;
  if (computedTotal > 0) quote.computedTotal = computedTotal;

  return quote;
}
