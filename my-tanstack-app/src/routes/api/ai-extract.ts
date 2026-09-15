import { createFileRoute } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import {
  buildNormalizedQuote,
  isSupportedQuoteFile,
  UnreadableDocumentError,
  UnsupportedFileTypeError,
} from '../../server/quotes';

const getConvexUrl = () =>
  process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || 'http://127.0.0.1:3210';

export const Route = createFileRoute('/api/ai-extract')({
  server: {
    handlers: {
      POST: async (ctx) => {
        try {
          const body = await ctx.request.json();
          const { quoteId, fileUrl, fileName, projectId, convexToken, supplier } = body;

          if (!quoteId || !fileUrl || !projectId) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
          }

          if (!process.env.OPENAI_API_KEY) {
            return Response.json({ error: 'AI service not configured' }, { status: 503 });
          }

          const name = fileName ?? 'quote.pdf';
          if (!isSupportedQuoteFile(name)) {
            return Response.json(
              {
                error: 'UNSUPPORTED_TYPE',
                message: 'ניתן לקרוא קבצי PDF, Word ותמונות (JPG/PNG) בלבד',
              },
              { status: 422 },
            );
          }

          // ── Fetch the file ─────────────────────────────────────────────────
          let fileBuffer: Buffer;
          try {
            const fileRes = await fetch(fileUrl);
            if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.status}`);
            fileBuffer = Buffer.from(await fileRes.arrayBuffer());
          } catch {
            return Response.json({ error: 'Could not download file' }, { status: 422 });
          }

          // ── Read it ────────────────────────────────────────────────────────
          let quote;
          try {
            quote = await buildNormalizedQuote(fileBuffer, name, {
              idPrefix: String(quoteId).slice(-4),
              ...(supplier ? { supplierName: supplier } : {}),
            });
          } catch (err: any) {
            if (err instanceof UnsupportedFileTypeError) {
              return Response.json(
                { error: 'UNSUPPORTED_TYPE', message: 'סוג הקובץ אינו נתמך' },
                { status: 422 },
              );
            }
            if (err instanceof UnreadableDocumentError) {
              return Response.json(
                {
                  error: 'UNREADABLE',
                  message: 'לא הצלחנו לקרוא את הקובץ — ייתכן שהוא מטושטש או ריק',
                },
                { status: 422 },
              );
            }
            console.error('[ai-extract] read failed for', name, '-', err?.message);
            return Response.json(
              { error: 'READ_FAILED', message: 'שגיאה בקריאת הקובץ' },
              { status: 422 },
            );
          }

          quote.meta.sourceUrl = fileUrl;
          const itemCount = quote.sections.reduce((n, s) => n + s.items.length, 0);
          const t = quote.terms;

          console.log(
            `[ai-extract] ${name}: ${itemCount} items (${quote.meta.source})` +
              `, total=${quote.computedTotal ?? quote.total ?? '—'}` +
              (quote.meta.lumpSum ? ' LUMP-SUM' : '') +
              (quote.meta.incomplete ? ' INCOMPLETE' : ''),
          );

          // A quote with no priced lines is not a failed read. A whole-build
          // quote is often a scope plus one number, and its scope, exclusions
          // and payment terms are exactly what a comparison needs.
          const hasContent =
            itemCount > 0 ||
            quote.total !== undefined ||
            !!t.scopeSummary ||
            t.workScope.length > 0 ||
            t.inclusions.length > 0 ||
            t.exclusions.length > 0;

          if (!hasContent) {
            return Response.json(
              {
                error: 'NO_CONTENT',
                message: 'לא הצלחנו לחלץ מהקובץ מידע להשוואה',
                meta: quote.meta,
              },
              { status: 422 },
            );
          }

          // ── Save to Convex ─────────────────────────────────────────────────
          const convex = new ConvexHttpClient(getConvexUrl());
          if (convexToken) convex.setAuth(convexToken);

          await convex.mutation(api.aiQuotes.saveQuoteExtraction, {
            quoteId,
            projectId,
            extractedJson: JSON.stringify(quote),
            modelUsed: 'gpt-5.6-luna',
          });

          return Response.json({ success: true, extraction: quote, itemCount });
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
