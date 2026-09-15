/**
 * The normalized shape every uploaded quote is reduced to. Persisted per quote
 * file so a document is read once, not on every comparison.
 */

export interface QuoteItem {
  /** Stable id within the quote ("A-12"), used to reference the item later. */
  id: string;
  code?: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  notes?: string[];
}

export interface QuoteSection {
  name: string;
  items: QuoteItem[];
}

/**
 * Everything that is not a priced line. For a lump-sum quote — common for
 * whole-build work — this is the entire comparable content, so it is never
 * treated as secondary to the items.
 */
export interface QuoteTerms {
  paymentTerms: {
    upfrontPercent: number | null;
    milestones: string[];
    finalPercent: number | null;
  } | null;
  warranty: string | null;
  validUntil: string | null;
  /** A few sentences on what the quote actually covers. */
  scopeSummary: string | null;
  /** Stages or trades named in the document, priced or not. */
  workScope: string[];
  /**
   * Services bundled into the price rather than goods — design work, personal
   * accompaniment (including trips abroad), measuring, supervision, delivery,
   * assembly. Often the real difference between two similar-looking quotes,
   * and rarely priced as a line of its own.
   */
  servicesIncluded: string[];
  inclusions: string[];
  exclusions: string[];
  redFlags: string[];
}

export interface NormalizedQuote {
  supplierName?: string;
  currency?: string;
  /** Total as stated in the document, when one was found. */
  total?: number;
  /** Total computed from the line items — the figure to compare on. */
  computedTotal?: number;
  sections: QuoteSection[];
  terms: QuoteTerms;
  /** Free text worth keeping that is not a priced item. */
  remarks: string[];
  meta: {
    source: 'pdf' | 'image' | 'docx';
    /**
     * The file this reading came from. A stored reading is reused only while
     * this still matches, so replacing a quote's file forces a fresh read.
     */
    sourceUrl?: string;
    /**
     * True when the items read add up to materially less than the total the
     * document states — part of the quote is missing.
     */
    incomplete: boolean;
    /**
     * The quote states a price for the work as a whole rather than per line.
     * Not a failure: the scope and terms still carry the comparison.
     */
    lumpSum: boolean;
    warnings: string[];
  };
}
