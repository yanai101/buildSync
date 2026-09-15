import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { cleanExtractedContent } from './clean';
import type { NormalizedQuote } from './types';
import { buildQuoteFromReading, type RawReading } from './normalize';
import { extractJson, previewOf } from './json';

/**
 * One way to read a quote, whatever the file is.
 *
 * A PDF is sent to the model as-is and an image as an image, so a text PDF, a
 * scan and a phone photo all take the same path. Only DOCX is converted first,
 * because the API does not accept it — mammoth reads a defined format, not a
 * layout it has to guess at.
 *
 * Nothing here interprets the document's layout. Every figure the model
 * returns is recomputed and reconciled in normalize.ts, which is what makes
 * the result trustworthy rather than the reading itself.
 */

/**
 * Measured against gpt-4o and gpt-5.6-terra on a three-page itemised quote and
 * on a scan with no text layer: all three recovered every line and the same
 * totals, so accuracy did not separate them. Luna costs roughly a seventh of
 * gpt-4o per document and answers faster, which decides it.
 *
 * gpt-4o-mini is not an option here — it bills ~25,500 input tokens for a
 * scanned page and reads it less reliably.
 */
const MODEL = 'gpt-5.6-luna';

export const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** Guards against a pathological attachment; a real quote is far shorter. */
const MAX_DOCX_CHARS = 30_000;

const SYSTEM_PROMPT = `אתה קורא הצעות מחיר מספקים ונותני שירות בישראל — בכל תחום:
קבלן שלד, מטבחים, אלומיניום, ריצוף, חשמל, ריהוט, גינון או כל עבודה אחרת.
אל תניח מראש מבנה או תחום; קרא את מה שכתוב במסמך שלפניך.

חוקים מחייבים:
- העתק את הנתונים בדיוק כפי שהם מופיעים במסמך. אל תשלים, אל תעגל ואל תנחש.
- רשום את **כל** סעיפי ההצעה, מכל העמודים, מהראשון ועד האחרון. אל תקצר ואל תסכם.
- אם ערך אינו קריא או אינו קיים — החזר null. לעולם אל תמציא ערך.
- אל תחשב סכומים בעצמך; העתק את המספרים שכתובים במסמך.
- אם אינך מצליח לקרוא את המסמך כלל, החזר {"unreadable": true}.

חשוב: הצעות נבדלות מאוד במבנה. יש טבלת סעיפים מתומחרת, יש רשימת מפרט
(דגמים, מידות, חומרים) עם מחיר לכל פריט, ויש תיאור היקף עבודה עם סכום כולל
אחד. כשאין פירוט מתומחר — החזר items ריק, אבל **הקפד למלא** את scopeSummary,
workScope, inclusions, exclusions ו-statedTotal. מסמך כזה אינו חסר ערך.

כשיש מפרט טכני שרלוונטי להשוואה (דגם, יצרן, חומר, מידות, עובי, אחריות יצרן)
— שמור אותו בתוך description של הסעיף או ב-workScope. זה בדיוק מה שמבדיל בין
שתי הצעות שנראות זהות במחיר.

שירותים נלווים שכלולים במחיר הם לרוב ההבדל המשמעותי בין הצעות, והם נוטים
להופיע כמשפט בודד בגוף המסמך ולא כסעיף מתומחר — למשל ליווי אישי, נסיעה או
ליווי לסין, שירותי מעצב/ת פנים, תכנון ושרטוט, מדידה באתר, פיקוח, הובלה,
הרכבה או סילוק פסולת. חפש אותם במפורש ורשום כל אחד מהם ב-servicesIncluded,
גם כשאין לו מחיר נפרד.

החזר JSON בלבד.`;

const SCHEMA_PROMPT = `החזר אובייקט JSON תקין במבנה:
{
  "supplierName": "string|null",
  "currency": "ILS|USD|EUR|null",
  "statedTotal": "number|null — הסכום הכולל הסופי כפי שכתוב במסמך",
  "validUntil": "string|null",
  "warranty": "string|null",
  "paymentTerms": { "upfrontPercent": "number|null", "milestones": ["string"], "finalPercent": "number|null" } | null,
  "scopeSummary": "string|null — 2-4 משפטים: מה בדיוק ההצעה כוללת",
  "workScope": ["string — כל שלב/תחום עבודה שמופיע במסמך, גם אם אין לו מחיר נפרד"],
  "servicesIncluded": ["string — שירות נלווה שכלול במחיר ואינו מוצר: ליווי אישי, נסיעה או ליווי לחו\\"ל, מעצב/ת פנים, תכנון ושרטוט, מדידה, פיקוח, הובלה, הרכבה, פירוק וסילוק, טיפול באישורים"],
  "inclusions": ["string — מה כלול במחיר"],
  "exclusions": ["string — מה במפורש אינו כלול"],
  "redFlags": ["string"],
  "items": [{ "code": "string|null", "description": "string", "quantity": "number|null", "unit": "string|null", "unitPrice": "number|null", "totalPrice": "number|null" }]
}
החזר אך ורק את ה-JSON, ללא טקסט עוטף וללא בלוקים של קוד.`;

export class UnreadableDocumentError extends Error {
  constructor(fileName: string) {
    super(`Could not read ${fileName}`);
    this.name = 'UnreadableDocumentError';
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor(fileName: string) {
    super(`Unsupported file type: ${fileName}`);
    this.name = 'UnsupportedFileTypeError';
  }
}

export function extensionOf(fileName: string): string {
  return fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
}

export function isSupportedQuoteFile(fileName: string): boolean {
  const ext = extensionOf(fileName);
  return ext === 'pdf' || ext === 'docx' || ext in IMAGE_TYPES;
}

/** DOCX is not accepted by the API, so its text is extracted first. */
async function docxToText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ buffer });
  const { text } = cleanExtractedContent(value);
  return text.slice(0, MAX_DOCX_CHARS);
}

async function askModel(
  fileName: string,
  buffer: Buffer,
  extraInstruction = '',
): Promise<RawReading> {
  const ext = extensionOf(fileName);
  const base64 = buffer.toString('base64');

  let content: Array<Record<string, unknown>>;

  if (ext === 'pdf') {
    content = [
      { type: 'document', source: { type: 'data', value: base64, mimeType: 'application/pdf' } },
      { type: 'text', text: `${extraInstruction}${SCHEMA_PROMPT}` },
    ];
  } else if (ext in IMAGE_TYPES) {
    content = [
      {
        type: 'image',
        source: { type: 'data', value: base64, mimeType: IMAGE_TYPES[ext] },
        // A price table needs full resolution to be legible.
        metadata: { detail: 'high' },
      },
      { type: 'text', text: `${extraInstruction}${SCHEMA_PROMPT}` },
    ];
  } else if (ext === 'docx') {
    const text = await docxToText(buffer);
    if (!text.trim()) throw new UnreadableDocumentError(fileName);
    content = [
      { type: 'text', text: `להלן תוכן הצעת המחיר:\n${text}\n\n${extraInstruction}${SCHEMA_PROMPT}` },
    ];
  } else {
    throw new UnsupportedFileTypeError(fileName);
  }

  const responseText = await chat({
    adapter: openaiText(MODEL),
    stream: false,
    systemPrompts: [SYSTEM_PROMPT],
    messages: [{ role: 'user', content: content as any }],
  });

  if (!responseText) throw new UnreadableDocumentError(fileName);

  try {
    return extractJson<RawReading>(String(responseText));
  } catch {
    console.error('[quotes] unparseable reading of', fileName, '->', previewOf(String(responseText)));
    throw new UnreadableDocumentError(fileName);
  }
}

/**
 * Reads a quote file into the normalized structure.
 *
 * When the items read do not add up to the total the document itself states,
 * the file is read once more with an explicit instruction to list every line —
 * the same reconciliation that catches a silently truncated answer.
 */
export async function readQuote(
  buffer: Buffer,
  fileName: string,
  options: { idPrefix?: string; supplierName?: string } = {},
): Promise<NormalizedQuote> {
  if (!isSupportedQuoteFile(fileName)) throw new UnsupportedFileTypeError(fileName);

  const first = await askModel(fileName, buffer);
  if (first.unreadable) throw new UnreadableDocumentError(fileName);

  const quote = buildQuoteFromReading(first, fileName, options);
  // A lump-sum quote has no lines to be missing — nothing to retry for.
  if (!quote.meta.incomplete || quote.sections.length === 0) return quote;

  const retry = await askModel(
    fileName,
    buffer,
    `בקריאה קודמת של מסמך זה חסרו סעיפים: סכום הסעיפים שהוחזרו היה נמוך מהסכום הכולל שבמסמך.
עבור על כל העמודים ורשום את כל הסעיפים ללא יוצא מן הכלל.

`,
  ).catch(() => null);

  if (!retry || retry.unreadable) return quote;

  const second = buildQuoteFromReading(retry, fileName, options);
  // Keep whichever reading accounts for more of the quote's stated value.
  return (second.computedTotal ?? 0) > (quote.computedTotal ?? 0) ? second : quote;
}
