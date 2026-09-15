/**
 * Strips everything from extracted text that costs tokens without carrying
 * meaning for a price comparison: page furniture, boilerplate, contact blocks
 * and whitespace noise.
 */

/** A line repeated on this share of pages is page furniture, not content. */
const REPEAT_RATIO = 0.6;

const PAGE_NUMBER_PATTERNS = [
  /^\s*-?\s*\d+\s*-?\s*$/,
  /^\s*עמוד\s+\d+(\s*(מתוך|\/)\s*\d+)?\s*$/i,
  /^\s*page\s+\d+(\s*(of|\/)\s*\d+)?\s*$/i,
  /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/i,
];

const CONTACT_PATTERNS = [
  /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/, // email
  /\b0\d{1,2}[-\s]?\d{7}\b/, // Israeli phone
  /\b05\d[-\s]?\d{3}[-\s]?\d{4}\b/, // Israeli mobile
  /\bhttps?:\/\/\S+/i,
  /\bwww\.\S+/i,
  /\bח\.?פ\.?\s*\d{8,9}\b/, // company number
  /\bע\.?מ\.?\s*\d{8,9}\b/,
];

const LEGAL_BOILERPLATE = [
  /^\s*(כל הזכויות שמורות|הודעה משפטית|תנאים כלליים|מסמך זה חסוי)/i,
  /^\s*(confidential|all rights reserved|disclaimer|terms and conditions)/i,
  /המסמך מיועד לנמען בלבד/,
];

export interface CleanResult {
  text: string;
  removedLines: number;
  droppedChars: number;
}

/**
 * @param text  Raw extracted text.
 * @param pageCount Number of pages, used to detect repeated headers/footers.
 */
export function cleanExtractedContent(text: string, pageCount = 1): CleanResult {
  const before = text.length;

  let lines = text
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim());

  const repeated = findRepeatedLines(lines, pageCount);

  const kept: string[] = [];
  let removedLines = 0;

  for (const line of lines) {
    if (!line) {
      // Collapse runs of blank lines to a single separator.
      if (kept[kept.length - 1] !== '') kept.push('');
      continue;
    }
    if (shouldDrop(line, repeated)) {
      removedLines++;
      continue;
    }
    kept.push(line);
  }

  const cleaned = kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text: cleaned, removedLines, droppedChars: before - cleaned.length };
}

function shouldDrop(line: string, repeated: Set<string>): boolean {
  if (repeated.has(line)) return true;
  if (PAGE_NUMBER_PATTERNS.some((re) => re.test(line))) return true;
  if (LEGAL_BOILERPLATE.some((re) => re.test(line))) return true;

  // A line that is only contact details carries no comparison value. A line
  // that merely *contains* a phone number (e.g. an item note) is kept.
  if (CONTACT_PATTERNS.some((re) => re.test(line))) {
    const withoutContacts = CONTACT_PATTERNS.reduce(
      (acc, re) => acc.replace(new RegExp(re.source, re.flags + 'g'), ''),
      line,
    );
    const residue = withoutContacts.replace(/[\s|,:;.\-–—]/g, '');
    if (residue.length < 12 && !/\d{3,}/.test(residue)) return true;
  }

  return false;
}

/**
 * Lines appearing on most pages are headers/footers rather than content.
 * Counted by repetition rather than by page, since a single extracted page
 * can still carry a banner repeated at every section break.
 */
function findRepeatedLines(lines: string[], pageCount: number): Set<string> {
  const repeated = new Set<string>();
  const counts = new Map<string, number>();
  for (const line of lines) {
    if (!line || line.length < 4) continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }

  const threshold = Math.max(2, Math.ceil(pageCount * REPEAT_RATIO));
  for (const [line, count] of counts) {
    // Never drop a repeated line that looks like a priced item.
    if (count >= threshold && !/\d{2,}[\d,.]*\s*(₪|ils|nis)?\s*$/i.test(line)) {
      repeated.add(line);
    }
  }
  return repeated;
}
