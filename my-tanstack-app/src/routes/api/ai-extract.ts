import { createFileRoute } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { MarkItDown } from 'markitdown-ts';
import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const getConvexUrl = () =>
  process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || 'http://127.0.0.1:3210';

// ── Zod schema for the extraction result ────────────────────────────────────

const QuoteExtractionSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      pricePerUnit: z.number().nullable(),
      total: z.number().nullable(),
    }),
  ),
  paymentTerms: z
    .object({
      upfrontPercent: z.number().nullable(),
      milestones: z.array(z.string()),
      finalPercent: z.number().nullable(),
    })
    .nullable(),
  warranty: z.string().nullable(),
  validUntil: z.string().nullable(),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  redFlags: z.array(z.string()),
  rawSummary: z.string(),
});

const SYSTEM_PROMPT = `אתה מנתח מסמכי הצעות מחיר לפרויקטי בנייה בישראל.
תפקידך לחלץ מידע מובנה מהצעות מחיר ולהחזיר אותו בפורמט JSON בלבד.

חלץ את הנתונים הבאים:
- פירוט עבודות/פריטים (שם, כמות, יחידה, מחיר ליחידה, סה"כ)
- תנאי תשלום (אחוז מקדמה, תשלומי ביניים, תשלום סופי)
- אחריות על העבודה
- תוקף ההצעה
- מה כלול ומה לא כלול
- דגלים אדומים (תשלום גבוה מראש מעל 30%, תניות חריגות, אי-בהירויות)

אם שדה לא קיים במסמך, החזר null או מערך ריק בהתאם לסכמה.
החזר JSON בלבד, ללא טקסט נוסף.`;

export const Route = createFileRoute('/api/ai-extract')({
  server: {
    handlers: {
      POST: async (ctx) => {
        try {
          const body = await ctx.request.json();
          const { quoteId, fileUrl, fileName, projectId, convexToken } = body;

          if (!quoteId || !fileUrl || !projectId) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
          }

          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            return Response.json({ error: 'AI service not configured' }, { status: 503 });
          }

          // ── Fetch the file ─────────────────────────────────────────────────
          let fileBuffer: Buffer;
          try {
            const fileRes = await fetch(fileUrl);
            if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.status}`);
            fileBuffer = Buffer.from(await fileRes.arrayBuffer());
          } catch (err) {
            return Response.json({ error: 'Could not download file' }, { status: 422 });
          }

          // ── Convert to Markdown ────────────────────────────────────────────
          let markdown: string;
          try {
            const mid = new MarkItDown();
            // markitdown-ts accepts a buffer + file_extension hint for format detection
            const file_extension = fileName ? fileName.split('.').pop() : undefined;
            const result = await mid.convert(fileBuffer as any, { file_extension });
            markdown = result?.markdown ?? '';
            if (!markdown.trim()) {
              return Response.json(
                { error: 'Could not extract text from file — is it a scanned image?' },
                { status: 422 },
              );
            }
          } catch (err) {
            return Response.json(
              { error: 'File conversion failed. Only PDF and Word files are supported.' },
              { status: 422 },
            );
          }

          // Limit to ~12K tokens worth of text (≈48K chars) to stay cost-efficient
          const MAX_CHARS = 48_000;
          if (markdown.length > MAX_CHARS) {
            markdown = markdown.slice(0, MAX_CHARS) + '\n\n[מסמך קוצר בגלל אורכו]';
          }

          // ── Extract with TanStack AI ─────────────────────────────────────────
          process.env.OPENAI_API_KEY = apiKey;
          const prompt = `מסמך להלן (מומר לטקסט):
${markdown}

עליך להחזיר אובייקט JSON תקין לחלוטין העונה לסכמה הבאה:
{
  "items": [{ "name": "string", "quantity": "number|null", "unit": "string|null", "pricePerUnit": "number|null", "total": "number|null" }],
  "paymentTerms": { "upfrontPercent": "number|null", "milestones": ["string"], "finalPercent": "number|null" } | null,
  "warranty": "string|null",
  "validUntil": "string|null",
  "inclusions": ["string"],
  "exclusions": ["string"],
  "redFlags": ["string"],
  "rawSummary": "string"
}
החזר אך ורק את ה-JSON ללא טקסט עוטף, ללא בלוקים של קוד (ללא \`\`\`json) וללא הסברים.`;

          // chat() takes an `adapter` and returns a stream by default;
          // stream: false makes it resolve to the full text response.
          const responseText = await chat({
            adapter: openaiText('gpt-4o-mini'),
            messages: [{ role: 'user', content: prompt }],
            systemPrompts: [SYSTEM_PROMPT],
            stream: false,
          });

          if (!responseText) {
            return Response.json({ error: 'AI failed to produce extraction' }, { status: 500 });
          }

          let parsedExtraction;
          try {
            // Remove markdown code blocks if the model accidentally included them
            const rawContent = responseText.replace(/^```json\n?/, '').replace(/```$/, '').trim();
            parsedExtraction = JSON.parse(rawContent);
          } catch (e) {
            return Response.json({ error: 'AI returned invalid JSON format' }, { status: 500 });
          }

          const tokensUsed = 0; // Usage metrics optionalable directly when using outputSchema in this version

          // ── Save to Convex ─────────────────────────────────────────────────
          // Use the token from the request for authenticated Convex calls
          const convex = new ConvexHttpClient(getConvexUrl());
          if (convexToken) convex.setAuth(convexToken);

          await convex.mutation(api.aiQuotes.saveQuoteExtraction, {
            quoteId,
            projectId,
            extractedJson: JSON.stringify(parsedExtraction),
            modelUsed: 'gpt-4o-mini',
          });

          return Response.json({
            success: true,
            extraction: parsedExtraction,
            tokensUsed,
          });
        } catch (err: any) {
          console.error('[ai-extract] Error:', err);
          return Response.json(
            { error: err?.message ?? 'Internal server error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
