import { createFileRoute } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const getConvexUrl = () =>
  process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || 'http://127.0.0.1:3210';

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
  questionsToAsk: z.array(z.string()).optional(),   // questions to ask suppliers before deciding
  negotiationTips: z.array(z.string()).optional(),  // concrete negotiation leverage
  filesRead: z.array(z.string()),
  filesSkipped: z.array(z.string()),
});

export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;

const SYSTEM_PROMPT = `אתה יועץ לניהול פרויקטי בנייה ושיפוצים בישראל עם ניסיון של 20 שנה, שמלווה מזמיני עבודות פרטיים מול קבלנים וספקים.
קיבלת נתונים מעובדים של מספר הצעות מחיר עבור אותו נושא עבודה, כולל (כשקיים) מידע שחולץ מקובצי ההצעות עצמם: פירוט עבודות, תנאי תשלום, אחריות, מה כלול ומה לא.

תפקידך לספק ניתוח מעמיק ומעשי — לא תקציר שטחי:

1. **ניתוח מחירים**: השווה בין הסכומים במספרים אמיתיים — ציין את הפער בין הזולה ליקרה בש"ח ובאחוזים, האם הפער מוצדק לפי היקף העבודה, והאם מחיר חריג (נמוך או גבוה) צריך להדליק נורה אדומה.
2. **לכל ספק** — נתח לעומק:
   - 2-4 יתרונות ו-2-4 חסרונות קונקרטיים, מבוססים על הנתונים (לא כלליים כמו "מחיר טוב" אלא "זול ב-12% מהממוצע וכולל פירוק וסילוק פסולת").
   - priceAssessment: איך המחיר עומד מול השאר ומה מקבלים תמורתו.
   - paymentTermsSummary: תנאי התשלום שידועים (מקדמה, פעימות, תשלום סופי) — או ציין שלא צוינו.
   - warrantySummary: תנאי האחריות — או ציין במפורש שאין/לא צוינה אחריות.
   - completeness: 'detailed' אם ההצעה מפורטת ברמת סעיפים וכמויות, 'partial' אם חלקית, 'minimal' אם רק סכום כולל.
   - paymentRisk: 'high' אם מקדמה מעל 30% או תנאים בעייתיים, 'medium' אם יש אי-בהירות, 'low' אם תנאים סבירים.
3. **דגלים אדומים**: תשלום מראש מעל 30%, היעדר אחריות, תנאים מעורפלים, פירוט חסר, פערי מחיר קיצוניים, סעיפים שמופיעים אצל ספק אחד וחסרים אצל אחר.
4. **המלצה מנומקת**: בחר ספק תוך שקלול מחיר, תנאי תשלום, אחריות ורמת פירוט — והסבר בכמה משפטים למה דווקא הוא ומה בכל זאת כדאי לוודא מולו.
5. **questionsToAsk**: 3-5 שאלות ספציפיות שכדאי לשאול את הספקים לפני החלטה (מבוססות על מה שחסר או מעורפל בהצעות האלה).
6. **negotiationTips**: 2-4 טיפים קונקרטיים למשא ומתן — למשל להשתמש בהצעה זולה כמנוף, לבקש לפרוס את המקדמה, לדרוש הוספת אחריות בכתב.

עבוד בעברית. החזר JSON בלבד לפי הסכמה שניתנה.
אל תמציא מידע שאינו קיים בנתונים — אם משהו לא ידוע, כתוב שלא צוין.
אם להצעה אין מידע מקובץ, נתח אותה לפי הנתונים הידניים בלבד וציין שהניתוח חלקי.`;

export const Route = createFileRoute('/api/ai-compare')({
  server: {
    handlers: {
      POST: async (ctx) => {
        try {
          const body = await ctx.request.json();
          const { quotes, topicName, projectId, topicKey, cacheKey, convexToken } = body;

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
          if (cacheKey) {
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
                if (q.fileName) filesRead.push(q.fileName);
              } catch {
                if (q.fileName) filesSkipped.push(`${q.fileName} (שגיאת פענוח)`);
              }
            } else if (q.hasFile && q.fileName) {
              filesSkipped.push(`${q.fileName} (לא בוצע חילוץ)`);
            }

            return {
              supplier: q.supplier,
              totalAmount: q.total,
              validity: q.validity ?? null,
              notes: q.notes ?? null,
              status: q.status,
              extractedData: extraction,
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

הצעות מחיר (כולל נתונים שחולצו מקבצים):
${JSON.stringify(quoteSummaries, null, 2)}

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
      "fileInsights": "string",
      "paymentRisk": "low" | "medium" | "high"
    }
  ],
  "redFlags": ["string"],
  "questionsToAsk": ["string — 3-5 שאלות"],
  "negotiationTips": ["string — 2-4 טיפים"],
  "filesRead": ["string"],
  "filesSkipped": ["string"]
}
החזר אך ורק את ה-JSON ללא טקסט עוטף וללא בלוקים של קוד (ללא \`\`\`json).`;

          // ── TanStack AI comparison call ────────────────────────────────────
          // chat() takes an `adapter` and returns a stream by default;
          // stream: false makes it resolve to the full text response.
          const responseText = await chat({
            adapter: openaiText('gpt-4o-mini'),
            messages: [{ role: 'user', content: userMessage }],
            systemPrompts: [SYSTEM_PROMPT],
            stream: false,
          });

          if (!responseText) {
            return Response.json({ error: 'AI failed to produce a comparison' }, { status: 500 });
          }

          let result;
          try {
            const rawContent = responseText.replace(/^```json\n?/, '').replace(/```$/, '').trim();
            result = JSON.parse(rawContent);
          } catch (e) {
            return Response.json({ error: 'AI returned invalid JSON format' }, { status: 500 });
          }

          const tokensUsed = 0;

          // Merge the files lists from our tracking into the result
          const finalResult: ComparisonResult = {
            ...result,
            filesRead: [...new Set([...(result.filesRead ?? []), ...filesRead])],
            filesSkipped: [...new Set([...(result.filesSkipped ?? []), ...filesSkipped])],
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
