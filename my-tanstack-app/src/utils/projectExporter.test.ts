import { describe, expect, test } from 'vitest';
import { originalArchiveFilename } from './projectExporter';

describe('originalArchiveFilename', () => {
  test('keeps an uploaded extension exactly once', () => {
    expect(originalArchiveFilename('הצעת מחיר.pdf')).toBe('הצעת מחיר.pdf');
    expect(originalArchiveFilename('site-photo.JPG')).toBe('site-photo.JPG');
  });

  test('sanitizes unsafe filename characters without changing the extension', () => {
    expect(originalArchiveFilename('דו"ח/חודש:07.pdf')).toBe('דו_ח_חודש_07.pdf');
  });
});
