import type { NormalizedQuote, QuoteItem } from './types';
import { round2 } from './normalize';

/**
 * Every number the comparison reports is computed here. The LLM is only ever
 * asked which items correspond to which — never to add anything up.
 */

export interface ItemMatch {
  quoteAItemIds: string[];
  quoteBItemIds: string[];
  matchType: 'exact' | 'partial' | 'missing-in-a' | 'missing-in-b' | 'scope-differs';
  confidence: number;
  reason: string;
}

export interface MatchedLine extends ItemMatch {
  label: string;
  aTotal: number;
  bTotal: number;
  /** bTotal - aTotal. Positive means quote B is more expensive here. */
  diff: number;
  diffPercent?: number;
}

export interface ComparisonMath {
  totals: Record<string, number>;
  cheapestSupplier?: string;
  spread: number;
  spreadPercent: number;
  byLine: MatchedLine[];
  /** Items present in one quote and absent in the other. */
  unmatchedA: string[];
  unmatchedB: string[];
}

export function allItems(quote: NormalizedQuote): QuoteItem[] {
  return quote.sections.flatMap((s) => s.items);
}

function sumItems(quote: NormalizedQuote, ids: string[]): number {
  const index = new Map(allItems(quote).map((i) => [i.id, i]));
  return round2(ids.reduce((sum, id) => sum + (index.get(id)?.totalPrice ?? 0), 0));
}

/** Quote total, preferring the computed sum over a stated figure. */
export function quoteTotal(quote: NormalizedQuote): number {
  return quote.computedTotal ?? quote.total ?? 0;
}

/**
 * Applies the LLM's semantic matches to the real numbers.
 *
 * @param matches Item correspondences returned by the model.
 */
export function compareQuotes(
  a: { name: string; quote: NormalizedQuote },
  b: { name: string; quote: NormalizedQuote },
  matches: ItemMatch[],
): ComparisonMath {
  const byLine: MatchedLine[] = matches.map((m) => {
    const aTotal = sumItems(a.quote, m.quoteAItemIds);
    const bTotal = sumItems(b.quote, m.quoteBItemIds);
    const diff = round2(bTotal - aTotal);
    const aIndex = new Map(allItems(a.quote).map((i) => [i.id, i]));
    const bIndex = new Map(allItems(b.quote).map((i) => [i.id, i]));

    const label =
      m.quoteAItemIds.map((id) => aIndex.get(id)?.description).find(Boolean) ??
      m.quoteBItemIds.map((id) => bIndex.get(id)?.description).find(Boolean) ??
      'סעיף';

    return {
      ...m,
      label,
      aTotal,
      bTotal,
      diff,
      ...(aTotal > 0 ? { diffPercent: round2((diff / aTotal) * 100) } : {}),
    };
  });

  const matchedA = new Set(matches.flatMap((m) => m.quoteAItemIds));
  const matchedB = new Set(matches.flatMap((m) => m.quoteBItemIds));

  const totals: Record<string, number> = {
    [a.name]: quoteTotal(a.quote),
    [b.name]: quoteTotal(b.quote),
  };

  const values = Object.values(totals).filter((v) => v > 0);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  return {
    totals,
    cheapestSupplier: values.length
      ? Object.keys(totals).find((k) => totals[k] === min)
      : undefined,
    spread: round2(max - min),
    spreadPercent: min > 0 ? round2(((max - min) / min) * 100) : 0,
    byLine,
    unmatchedA: allItems(a.quote).filter((i) => !matchedA.has(i.id)).map((i) => i.id),
    unmatchedB: allItems(b.quote).filter((i) => !matchedB.has(i.id)).map((i) => i.id),
  };
}

/**
 * The payload sent to the model for matching: ids and descriptions only.
 *
 * Prices are deliberately omitted — the model does not need them to decide
 * which items correspond, and leaving them out keeps it from doing math.
 *
 * Emitted as one line per item rather than JSON: the key names in a JSON
 * object repeat for every row and cost more tokens than the content itself.
 * Format: `id | description | quantity unit`
 */
export function toMatchingPayload(quote: NormalizedQuote): string {
  const lines: string[] = [];

  for (const section of quote.sections) {
    if (quote.sections.length > 1) lines.push(`## ${section.name}`);
    for (const item of section.items) {
      const measure = [item.quantity, item.unit].filter(Boolean).join(' ');
      lines.push([item.id, item.description, measure].filter(Boolean).join(' | '));
    }
  }

  return lines.join('\n');
}
