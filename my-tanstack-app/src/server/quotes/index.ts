import { readQuote } from './read';
import type { NormalizedQuote } from './types';

export * from './types';
export {
  readQuote,
  isSupportedQuoteFile,
  extensionOf,
  IMAGE_TYPES,
  UnreadableDocumentError,
  UnsupportedFileTypeError,
} from './read';
export { buildQuoteFromReading, parseAmount, round2 } from './normalize';
export type { RawReading } from './normalize';
export { cleanExtractedContent } from './clean';
export { extractJson, previewOf } from './json';
export { compareQuotes, toMatchingPayload, quoteTotal, allItems } from './compare';
export type { ItemMatch, MatchedLine, ComparisonMath } from './compare';

/**
 * The service entry point: a file in, a NormalizedQuote out.
 *
 * PDFs, scans and photos all go to the model as they are; DOCX is converted to
 * text first. Whatever comes back is recomputed and reconciled in code, so a
 * misread shows up as a warning instead of a wrong number in the comparison.
 *
 * Persist the result per quote file — a document is read once and reused by
 * every later comparison.
 */
export async function buildNormalizedQuote(
  buffer: Buffer,
  fileName: string,
  options: { idPrefix?: string; supplierName?: string } = {},
): Promise<NormalizedQuote> {
  return await readQuote(buffer, fileName, options);
}
