import { createFileRoute } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';
import { extractJson, previewOf } from '../../server/quotes';
import { zodToJsonSchema } from 'zod-to-json-schema';

const getConvexUrl = () =>
  process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || 'http://127.0.0.1:3210';

/**
 * Luna reads and compares as well as the larger models on these documents and
 * costs about a cent per comparison, so there is no cheaper/stronger split to
 * make: everyone gets the same analysis.
 */
const COMPARE_MODEL = 'gpt-5.6-luna';

// ── Zod schema for comparison result ────────────────────────────────────────

const SupplierAnalysisSchema = z.object({
  supplier: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  fileInsights: z.string().optional(),
  paymentRisk: z.enum(['low', 'medium', 'high']),
  // Enriched analysis fields
  priceAssessment: z.string().optional(),      // how this price stands vs the others / value for money
  paymentTermsSummary: z.string().optional(),  // upfront %, milestones, final payment
  warrantySummary: z.string().optional(),      // warranty terms or their absence
  completeness: z.enum(['detailed', 'partial', 'minimal']).optional(), // how detailed the quote is
  /** Bundled services — design, accompaniment, delivery — that carry real value. */
  servicesIncluded: z.array(z.string()).optional(),
});

const ComparisonResultSchema = z.object({
  summary: z.string(),
  recommendation: z.object({
    supplier: z.string(),
    reason: z.string(),
  }),
  suppliers: z.array(SupplierAnalysisSchema),
  redFlags: z.array(z.string()),
  // Enriched analysis fields
  priceAnalysis: z.string().optional(),        // paragraph on the price spread with real numbers
  /** Where the quotes do not cover the same work — why a price gap may be unreal. */
  scopeDifferences: z.array(z.string()).optional(),
  questionsToAsk: z.array(z.string()).optional(),   // questions to ask suppliers before deciding
  negotiationTips: z.array(z.string()).optional(),  // concrete negotiation leverage
  filesRead: z.array(z.string()),
  filesSkipped: z.array(z.string()),
});

export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;

const SYSTEM_PROMPT = `אתה יועץ רכש ישראלי מנוסה שמלווה מזמיני עבודות פרטיים מול ספקים וקבלנים.
ההשוואה יכולה להיות בכל תחום — קבלן שלד, מטבח, אלומיניום, ריצוף, חשמל, ריהוט,
גינון או כל עבודה אחרת. נושא העבודה מצוין בתחילת ההודעה; התאם אליו את הניתוח
ואת השפה, ואל תניח מראש שמדובר בעבודות בנייה.

קיבלת נתונים מעובדים של מספר הצעות עבור אותו נושא, כולל (כשקיים) מידע שנקרא
מקובצי ההצעות: סעיפים, מפרט, תנאי תשלום, אחריות, מה כלול ומה לא.

תפקידך לספק ניתוח מעמיק ומעשי — לא תקציר שטחי:

1. **ניתוח מחירים**: השווה בין הסכומים במספרים אמיתיים — ציין את הפער בין הזולה ליקרה בש"ח ובאחוזים, האם הפער מוצדק לפי מה שכל הצעה כוללת, והאם מחיר חריג (נמוך או גבוה) צריך להדליק נורה אדומה.
2. **לכל ספק** — נתח לעומק:
   - 2-4 יתרונות ו-2-4 חסרונות קונקרטיים, מבוססים על הנתונים. לא "מחיר טוב" אלא משהו שאפשר להצביע עליו: "זול ב-12% מהממוצע וכולל פירוק והובלה", או "משתמש בפרזול Blum מול פרזול לא מצוין אצל האחרים".
   - priceAssessment: איך המחיר עומד מול השאר ומה מקבלים תמורתו.
   - paymentTermsSummary: תנאי התשלום שידועים — או ציין שלא צוינו.
   - warrantySummary: תנאי האחריות — או ציין במפורש שאין/לא צוינה אחריות.
   - completeness: 'detailed' אם ההצעה מפורטת ברמת סעיפים או מפרט, 'partial' אם חלקית, 'minimal' אם רק סכום כולל.
   - paymentRisk: 'high' אם מקדמה מעל 30% או תנאים בעייתיים, 'medium' אם יש אי-בהירות, 'low' אם תנאים סבירים.
3. **הבדלי מפרט והיקף**: זה הלב של ההשוואה. ציין מה נכלל אצל אחד וחסר אצל האחר — שלב עבודה, פריט, דגם, חומר, עובי, יצרן, כמות או אחריות. הצעה זולה שמציעה פחות אינה זולה יותר.
4. **שירותים נלווים**: השדה terms.servicesIncluded מכיל שירותים שכלולים במחיר ואינם מוצר — ליווי אישי, נסיעה או ליווי לחו"ל, מעצב/ת פנים, תכנון, מדידה, פיקוח, הובלה, הרכבה. אלה פריטים בעלי ערך כספי ממשי ולעתים קרובות הם ההבדל האמיתי בין ההצעות. רשום אותם ב-servicesIncluded של אותו ספק, הזכר אותם ביתרונות, ואם שירות כזה קיים אצל ספק אחד בלבד — ציין זאת מפורשות ב-scopeDifferences ושקלל אותו בהמלצה. לעולם אל תשמיט שירות כזה מהניתוח.
5. **דגלים אדומים**: תשלום מראש מעל 30%, היעדר אחריות, תנאים מעורפלים, פירוט חסר, פערי מחיר קיצוניים, מפרט שלא צוין שם היצרן או הדגם שלו.
6. **המלצה מנומקת**: בחר ספק תוך שקלול מחיר, מה כלול, תנאי תשלום, אחריות ורמת פירוט — והסבר בכמה משפטים למה דווקא הוא ומה בכל זאת כדאי לוודא מולו.
7. **questionsToAsk**: 3-5 שאלות ספציפיות שכדאי לשאול לפני החלטה, מבוססות על מה שחסר או מעורפל בהצעות האלה.
8. **negotiationTips**: 2-4 טיפים קונקרטיים למשא ומתן — למשל להשתמש בהצעה זולה כמנוף, לבקש לפרוס את המקדמה, לדרוש השוואת מפרט או אחריות בכתב.

עבוד בעברית. החזר JSON בלבד לפי הסכמה שניתנה.
אל תמציא מידע שאינו קיים בנתונים — אם משהו לא ידוע, כתוב שלא צוין.
אם להצעה אין מידע מקובץ, נתח אותה לפי הנתונים הידניים בלבד וציין שהניתוח חלקי.`;

/**
 * Line items as one compact line each — `description | qty unit | total`.
 * JSON would repeat every key name per row and cost far more tokens than the
 * content itself.
 */
function compactItems(extraction: any): string | null {
  const sections = extraction?.sections;
  if (!Array.isArray(sections) || sections.length === 0) return null;

  const lines: string[] = [];
  for (const section of sections) {
    for (const item of section.items ?? []) {
      const measure = [item.quantity, item.unit].filter(Boolean).join(' ');
      lines.push(
        [item.description, measure, item.totalPrice].filter(Boolean).join(' | '),
      );
    }
  }
  return lines.length > 0 ? lines.join('\n') : null;
}

export const Route = createFileRoute('/api/ai-compare')({
  server: {
    handlers: {
      POST: async (ctx) => {
        try {
          const body = await ctx.request.json();
          const { quotes, topicName, projectId, topicKey, cacheKey, skipCache, convexToken } = body;

          if (!quotes || !projectId || !topicKey) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
          }

          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            return Response.json({ error: 'AI service not configured' }, { status: 503 });
          }

          const convex = new ConvexHttpClient(getConvexUrl());
          if (convexToken) convex.setAuth(convexToken);

          // ── Rate limit check ───────────────────────────────────────────────
          const rateLimit = await convex.query(api.aiQuotes.checkAiRateLimit, {
            projectId,
            feature: 'quoteCompare',
          });

          if (!rateLimit.allowed) {
            return Response.json(
              {
                error: 'RATE_LIMIT_EXCEEDED',
                remaining: rateLimit.remaining,
                limitPerMonth: rateLimit.limitPerMonth,
                tier: rateLimit.tier,
              },
              { status: 429 },
            );
          }

          // ── Cache check ────────────────────────────────────────────────────
          // A forced refresh drops the stored analysis for this topic first, so
          // the stale one can never be served again even if this run fails.
          if (skipCache) {
            await convex
              .mutation(api.aiQuotes.invalidateComparisonCache, { projectId, topicKey })
              .catch(() => { });
          }

          if (cacheKey && !skipCache) {
            const cached = await convex.query(api.aiQuotes.getComparisonCache, {
              projectId,
              topicKey,
              cacheKey,
            });
            if (cached) {
              return Response.json({
                ...JSON.parse(cached),
                fromCache: true,
                remaining: rateLimit.remaining,
                limitPerMonth: rateLimit.limitPerMonth,
              });
            }
          }

          // ── Build comparison prompt ────────────────────────────────────────
          const filesRead: string[] = [];
          const filesSkipped: string[] = [];

          // Build a compact representation of each quote
          const quoteSummaries = (quotes as any[]).map((q: any) => {
            let extraction: any = null;
            if (q.extraction) {
              try {
                extraction = typeof q.extraction === 'string'
                  ? JSON.parse(q.extraction)
                  : q.extraction;
                if (q.fileName) {
                  // Say what came out of the file, so "read" is verifiable
                  // rather than a claim.
                  const itemCount = (extraction.sections ?? []).reduce(
                    (n: number, s: any) => n + (s.items?.length ?? 0),
                    0,
                  );
                  const value = extraction.computedTotal ?? extraction.total;
                  const what = extraction.meta?.lumpSum
                    ? 'סכום כולל ללא פירוט'
                    : `${itemCount} סעיפים`;
                  const covered = value ? `, ${Math.round(value).toLocaleString()} ₪` : '';
                  const partial = extraction.meta?.incomplete ? ', ייתכן שחלקי' : '';
                  filesRead.push(`${q.fileName} (${what}${covered}${partial})`);
                }
              } catch {
                if (q.fileName) filesSkipped.push(`${q.fileName} — שגיאת פענוח`);
              }
            } else if (q.hasFile && q.fileName) {
              filesSkipped.push(`${q.fileName} — ${q.skipReason ?? 'לא בוצעה קריאה'}`);
            }

            return {
              supplier: q.supplier,
              totalAmount: q.total,
              validity: q.validity ?? null,
              notes: q.notes ?? null,
              status: q.status,
              // Line items are already priced and summed in code; the model
              // gets them as compact lines and only the commercial terms.
              items: compactItems(extraction),
              terms: extraction?.terms ?? null,
              // Say when a reading is known to be partial, so the analysis can
              // hedge instead of comparing a fraction of one quote to all of
              // another without noticing.
              readingWarnings: extraction?.meta?.incomplete
                ? extraction.meta.warnings
                : undefined,
            };
          });

          // Pre-computed price stats so the model quotes accurate numbers
          const totals = quoteSummaries.map((q) => q.totalAmount).filter((t) => typeof t === 'number');
          const minTotal = Math.min(...totals);
          const maxTotal = Math.max(...totals);
          const avgTotal = totals.reduce((a, b) => a + b, 0) / (totals.length || 1);
          const gapPercent = minTotal > 0 ? Math.round(((maxTotal - minTotal) / minTotal) * 100) : 0;

          const userMessage = `נושא העבודה: ${topicName}

נתוני מחיר מחושבים (השתמש במספרים האלה בניתוח):
- הצעה זולה ביותר: ${minTotal.toLocaleString()} ₪
- הצעה יקרה ביותר: ${maxTotal.toLocaleString()} ₪
- ממוצע: ${Math.round(avgTotal).toLocaleString()} ₪
- פער בין הזולה ליקרה: ${(maxTotal - minTotal).toLocaleString()} ₪ (${gapPercent}%)

הצעות מחיר — השדה items מכיל את סעיפי ההצעה כפי שחולצו מקובץ ההצעה
(פורמט: תיאור | כמות ויחידה | סכום), והשדה terms את התנאים המסחריים:
${JSON.stringify(quoteSummaries, null, 2)}

כך עליך לנתח את מה שנקרא מהקבצים:
- כשיש סעיפים (items) — השווה סעיפים מקבילים בין הספקים, ציין מה מופיע אצל
  אחד וחסר אצל האחר, והפנה לסעיפים בשמם ב-fileInsights של אותו ספק.
- כשהצעה מנוסחת כסכום כולל (terms.workScope ו-scopeSummary במקום items) —
  השווה לפי **מה שההצעה כוללת**: אילו שלבים, פריטים או תחומים נכללים אצל כל
  ספק, מה מופיע ב-inclusions של אחד וב-exclusions של האחר, ואיפה ההיקפים
  אינם חופפים. הצעה זולה שמציעה פחות אינה זולה יותר.
- שים לב להבדלי מפרט בתוך תיאורי הסעיפים — דגם, יצרן, חומר, עובי, מידות,
  כמות. שתי הצעות באותו מחיר יכולות להיות שונות מאוד באיכות מה שמסופק.
- כשההיקפים שונים — אמור זאת מפורשות ב-scopeDifferences, בסיכום ובהמלצה,
  ואל תציג את ההפרש במחיר כאילו מדובר באותו דבר בדיוק.
- ב-fileInsights של כל ספק כתוב 2-3 משפטים קונקרטיים ממה שנקרא מהקובץ שלו.
  אל תשאיר את השדה ריק כשיש תוכן.

קבצים שנקראו בהצלחה: ${filesRead.length > 0 ? filesRead.join(', ') : 'אין'}
קבצים שדולגו: ${filesSkipped.length > 0 ? filesSkipped.join(', ') : 'אין'}

עליך להחזיר אובייקט JSON תקין לחלוטין העונה לסכמה הבאה:
{
  "summary": "string — שורת סיכום ברורה",
  "priceAnalysis": "string — פסקת ניתוח מחירים עם מספרים אמיתיים (פער בש\\"ח ובאחוזים)",
  "recommendation": { "supplier": "string", "reason": "string — נימוק מפורט של כמה משפטים" },
  "suppliers": [
    {
      "supplier": "string",
      "pros": ["string — 2-4 יתרונות קונקרטיים"],
      "cons": ["string — 2-4 חסרונות קונקרטיים"],
      "priceAssessment": "string",
      "paymentTermsSummary": "string",
      "warrantySummary": "string",
      "completeness": "detailed" | "partial" | "minimal",
      "servicesIncluded": ["string — שירות נלווה שכלול אצל ספק זה"],
      "fileInsights": "string",
      "paymentRisk": "low" | "medium" | "high"
    }
  ],
  "redFlags": ["string"],
  "scopeDifferences": ["string — כל הבדל בהיקף העבודה בין ההצעות, עם שם הספק"],
  "questionsToAsk": ["string — 3-5 שאלות"],
  "negotiationTips": ["string — 2-4 טיפים"],
  "filesRead": ["string"],
  "filesSkipped": ["string"]
}
החזר אך ורק את ה-JSON ללא טקסט עוטף וללא בלוקים של קוד (ללא \`\`\`json).`;

          // ── Ask for the analysis ───────────────────────────────────────────
          // chat() returns a stream by default; stream: false resolves to the
          // full text response.
          const askForAnalysis = (extraInstruction = '') =>
            chat({
              adapter: openaiText(COMPARE_MODEL),
              messages: [{ role: 'user', content: extraInstruction + userMessage }],
              systemPrompts: [SYSTEM_PROMPT],
              stream: false,
            });

          let result: any;
          let responseText = await askForAnalysis();

          try {
            result = extractJson(String(responseText ?? ''));
          } catch {
            // Occasionally the answer arrives wrapped in a sentence or a code
            // fence the extractor cannot recover. One firmer retry is far
            // cheaper than making the user press "try again".
            console.warn(
              '[ai-compare] unparseable answer, retrying —',
              previewOf(String(responseText ?? '')),
            );
            responseText = await askForAnalysis(
              'התשובה הקודמת לא הייתה JSON תקין. החזר אך ורק אובייקט JSON, ' +
              'ללא מילה לפניו ואחריו וללא סימני ``` כלשהם.\n\n',
            );
            try {
              result = extractJson(String(responseText ?? ''));
            } catch {
              console.error(
                '[ai-compare] retry also unparseable —',
                previewOf(String(responseText ?? '')),
              );
              return Response.json(
                { error: 'לא הצלחנו לקבל ניתוח תקין מה-AI. נסו שוב בעוד רגע.' },
                { status: 502 },
              );
            }
          }

          const tokensUsed = 0;

          // Merge the files lists from our tracking into the result
          // The file lists are facts we tracked, not something the model should
          // restate — merging its echo back in is what produced duplicates.
          const finalResult: ComparisonResult = {
            ...result,
            filesRead,
            filesSkipped,
          };

          // ── Save cache + log usage ─────────────────────────────────────────
          await Promise.all([
            cacheKey
              ? convex.mutation(api.aiQuotes.saveComparisonCache, {
                projectId,
                topicKey,
                cacheKey,
                result: JSON.stringify(finalResult),
              })
              : Promise.resolve(),
            convex.mutation(api.aiQuotes.logAiUsage, {
              projectId,
              feature: 'quoteCompare',
              tokensUsed,
            }),
          ]);

          return Response.json({
            ...finalResult,
            fromCache: false,
            tokensUsed,
            remaining: rateLimit.remaining - 1,
            limitPerMonth: rateLimit.limitPerMonth,
          });
        } catch (err: any) {
          console.error('[ai-compare] Error:', err);
          return Response.json(
            { error: err?.message ?? 'Internal server error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
