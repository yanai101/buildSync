// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { buildQuoteFromReading, parseAmount } from './normalize';
import { isSupportedQuoteFile } from './read';
import { cleanExtractedContent } from './clean';
import { extractJson } from './json';
import { compareQuotes, toMatchingPayload } from './compare';
import type { RawReading } from './normalize';

/**
 * The model does the reading; these tests cover the layer that decides whether
 * to believe it. Every figure below is re-derived from the reading, never
 * taken on trust.
 */

describe('parseAmount', () => {
  test('handles separators, currency marks and junk', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('₪ 14000')).toBe(14000);
    expect(parseAmount('12,600 ש"ח')).toBe(12600);
    expect(parseAmount(14000)).toBe(14000);
    expect(parseAmount(null)).toBeUndefined();
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount('abc')).toBeUndefined();
  });
});

describe('extractJson', () => {
  const payload = { summary: 'ok', items: [1, 2] };

  test('reads a bare object', () => {
    expect(extractJson(JSON.stringify(payload))).toEqual(payload);
  });

  test('reads it out of a code fence', () => {
    expect(extractJson('```json\n' + JSON.stringify(payload) + '\n```')).toEqual(payload);
    expect(extractJson('```\n' + JSON.stringify(payload) + '\n```')).toEqual(payload);
  });

  test('survives a sentence before or after the object', () => {
    expect(extractJson('הנה הניתוח:\n' + JSON.stringify(payload))).toEqual(payload);
    expect(extractJson(JSON.stringify(payload) + '\n\nמקווה שעזרתי!')).toEqual(payload);
    expect(extractJson('בבקשה:\n```json\n' + JSON.stringify(payload) + '\n```\nתודה')).toEqual(payload);
  });

  test('survives leading whitespace and newlines', () => {
    expect(extractJson('\n\n   ' + JSON.stringify(payload) + '  \n')).toEqual(payload);
  });

  test('still throws on an answer with no object in it', () => {
    expect(() => extractJson('לא הצלחתי לנתח את ההצעות')).toThrow();
    expect(() => extractJson('')).toThrow();
  });

  test('throws on a truncated object rather than returning half an answer', () => {
    expect(() => extractJson('{"summary":"ok","items":[1,2')).toThrow();
  });
});

describe('supported files', () => {
  test('accepts documents, scans and photos — and nothing else', () => {
    expect(isSupportedQuoteFile('quote.pdf')).toBe(true);
    expect(isSupportedQuoteFile('quote.docx')).toBe(true);
    expect(isSupportedQuoteFile('photo.jpg')).toBe(true);
    expect(isSupportedQuoteFile('photo.PNG')).toBe(true);
    expect(isSupportedQuoteFile('photo.heic')).toBe(false);
    expect(isSupportedQuoteFile('sheet.xlsx')).toBe(false);
    expect(isSupportedQuoteFile('noextension')).toBe(false);
  });
});

describe('buildQuoteFromReading', () => {
  const reading: RawReading = {
    supplierName: 'ספק א',
    currency: 'ILS',
    statedTotal: 47850,
    warranty: '12 חודשים',
    paymentTerms: { upfrontPercent: 30, milestones: ['40% באמצע'], finalPercent: 30 },
    items: [
      { description: 'איטום חדרים רטובים', quantity: 4, unit: 'יחידה', unitPrice: 3500 },
      { description: 'ריצוף 60x60', quantity: 85, unit: 'מ"ר', unitPrice: 250, totalPrice: 21250 },
      { description: 'טיח פנים', quantity: 210, unit: 'מ"ר', totalPrice: 12600 },
    ],
  };

  test('computes every figure in code', () => {
    const quote = buildQuoteFromReading(reading, 'quote.pdf', { idPrefix: 'A' });
    const items = quote.sections.flatMap((s) => s.items);

    expect(items).toHaveLength(3);
    // 4 × 3500 — the model never supplied this total.
    expect(items[0].totalPrice).toBe(14000);
    expect(quote.computedTotal).toBe(47850);
    expect(quote.total).toBe(47850);
    expect(quote.meta.incomplete).toBe(false);
    expect(quote.meta.warnings).toHaveLength(0);
    expect(quote.meta.source).toBe('pdf');
  });

  test('keeps the commercial terms alongside the items', () => {
    const quote = buildQuoteFromReading(reading, 'quote.pdf');
    expect(quote.terms.paymentTerms?.upfrontPercent).toBe(30);
    expect(quote.terms.warranty).toBe('12 חודשים');
    expect(quote.remarks.join(' ')).toMatch(/12 חודשים/);
  });

  test('flags a line whose own arithmetic does not hold', () => {
    const quote = buildQuoteFromReading(
      {
        items: [
          // 85 × 250 = 21250, but 12250 was read.
          { description: 'ריצוף', quantity: 85, unit: 'מ"ר', unitPrice: 250, totalPrice: 12250 },
        ],
      },
      'quote.pdf',
    );
    expect(quote.meta.warnings.some((w) => w.includes('ריצוף'))).toBe(true);
    // The read value is kept, not silently replaced.
    expect(quote.sections[0].items[0].totalPrice).toBe(12250);
  });

  test('detects a reading that missed items, using the document total', () => {
    const quote = buildQuoteFromReading(
      { statedTotal: 300000, items: [{ description: 'עבודה', totalPrice: 40000 }] },
      'quote.pdf',
    );
    expect(quote.meta.incomplete).toBe(true);
    expect(quote.meta.warnings.some((w) => w.includes('לא נקראו'))).toBe(true);
  });

  test('mentions a small mismatch without calling the reading incomplete', () => {
    const quote = buildQuoteFromReading(
      { statedTotal: 10000, items: [{ description: 'עבודה', totalPrice: 9500 }] },
      'quote.pdf',
    );
    expect(quote.meta.incomplete).toBe(false);
    expect(quote.meta.warnings).toHaveLength(1);
  });

  test('parses amounts the model returned as strings', () => {
    const quote = buildQuoteFromReading(
      { items: [{ description: 'עבודה', quantity: '4', unitPrice: '1,250.50' }] },
      'scan.jpg',
    );
    expect(quote.sections[0].items[0]).toMatchObject({ quantity: 4, unitPrice: 1250.5 });
    expect(quote.computedTotal).toBe(5002);
    expect(quote.meta.source).toBe('image');
  });

  test('drops items with no description rather than inventing one', () => {
    const quote = buildQuoteFromReading(
      { items: [{ description: '  ', totalPrice: 500 }, { description: 'טיח', totalPrice: 300 }] },
      'scan.jpg',
    );
    expect(quote.sections[0].items).toHaveLength(1);
    expect(quote.computedTotal).toBe(300);
  });

  test('keeps a lump-sum quote instead of treating it as unreadable', () => {
    // A whole-build quote: one price, a described scope, no priced lines.
    const quote = buildQuoteFromReading(
      {
        statedTotal: 890000,
        scopeSummary: 'בניית שלד וילה כולל יסודות, גג רעפים וטיח חוץ.',
        workScope: ['עבודות עפר', 'יסודות', 'שלד', 'גג', 'טיח חוץ'],
        inclusions: ['פיגומים', 'פינוי פסולת'],
        exclusions: ['אינסטלציה', 'חשמל', 'ריצוף'],
        items: [],
      },
      'villa.pdf',
      { idPrefix: 'L' },
    );

    expect(quote.meta.lumpSum).toBe(true);
    // Not flagged as a failed reading — there were no lines to miss.
    expect(quote.meta.incomplete).toBe(false);
    expect(quote.total).toBe(890000);
    expect(quote.terms.workScope).toHaveLength(5);
    expect(quote.terms.exclusions).toContain('חשמל');
    expect(quote.remarks[0]).toMatch(/שלד וילה/);
  });

  test('an itemised quote is not mistaken for a lump-sum one', () => {
    const quote = buildQuoteFromReading(
      { statedTotal: 1000, items: [{ description: 'עבודה', totalPrice: 1000 }] },
      'quote.pdf',
    );
    expect(quote.meta.lumpSum).toBe(false);
  });
});

describe('cleanExtractedContent', () => {
  test('drops page furniture, boilerplate and contact-only lines', () => {
    const raw = [
      'ACME Builders Ltd',
      'Waterproofing wet rooms   4   unit   14000',
      'Page 1 of 3',
      'info@acme.co.il',
      'ACME Builders Ltd',
      'Floor tiling 85 sqm 21250',
      'עמוד 2 מתוך 3',
      'ACME Builders Ltd',
      'כל הזכויות שמורות',
    ].join('\n');

    const { text } = cleanExtractedContent(raw, 3);

    expect(text).not.toMatch(/Page 1 of 3/);
    expect(text).not.toMatch(/עמוד 2/);
    expect(text).not.toMatch(/info@acme\.co\.il/);
    expect(text).not.toMatch(/כל הזכויות שמורות/);
    expect(text).not.toMatch(/ACME Builders Ltd/);
    expect(text).toMatch(/Waterproofing wet rooms/);
    expect(text).toMatch(/Floor tiling/);
  });
});

describe('compareQuotes', () => {
  const quoteA = buildQuoteFromReading(
    {
      items: [
        { description: 'Waterproofing, all wet rooms', quantity: 1, unit: 'lump', totalPrice: 14000 },
        { description: 'Floor tiling', quantity: 85, unit: 'sqm', totalPrice: 21250 },
      ],
    },
    'a.pdf',
    { idPrefix: 'A' },
  );

  const quoteB = buildQuoteFromReading(
    {
      items: [
        { description: 'Waterproofing bathroom', quantity: 1, unit: 'unit', totalPrice: 9000 },
        { description: 'Waterproofing kitchen', quantity: 1, unit: 'unit', totalPrice: 7000 },
        { description: 'Floor tiling', quantity: 85, unit: 'sqm', totalPrice: 19000 },
      ],
    },
    'b.pdf',
    { idPrefix: 'B' },
  );

  test('computes every figure in code from the model’s matches', () => {
    const result = compareQuotes(
      { name: 'ספק א', quote: quoteA },
      { name: 'ספק ב', quote: quoteB },
      [
        {
          quoteAItemIds: ['A-1'],
          quoteBItemIds: ['B-1', 'B-2'],
          matchType: 'partial',
          confidence: 0.82,
          reason: 'הצעה ב מפצלת את האיטום לשני סעיפים.',
        },
        {
          quoteAItemIds: ['A-2'],
          quoteBItemIds: ['B-3'],
          matchType: 'exact',
          confidence: 0.97,
          reason: 'אותה עבודה ואותה כמות.',
        },
      ],
    );

    expect(result.totals['ספק א']).toBe(35250);
    expect(result.totals['ספק ב']).toBe(35000);
    expect(result.cheapestSupplier).toBe('ספק ב');
    expect(result.spread).toBe(250);

    const [waterproofing, tiling] = result.byLine;
    expect(waterproofing.aTotal).toBe(14000);
    expect(waterproofing.bTotal).toBe(16000); // 9000 + 7000
    expect(waterproofing.diff).toBe(2000);
    expect(tiling.diff).toBe(-2250);

    expect(result.unmatchedA).toEqual([]);
    expect(result.unmatchedB).toEqual([]);
  });

  test('matching payload carries no prices, so the model cannot do math', () => {
    const payload = toMatchingPayload(quoteA);
    expect(payload).toMatch(/Waterproofing/);
    expect(payload).toMatch(/A-1/);
    expect(payload).not.toMatch(/14000/);
    expect(payload).not.toMatch(/21250/);
  });
});
