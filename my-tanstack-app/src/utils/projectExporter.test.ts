import { describe, expect, test } from 'vitest';
import { originalArchiveFilename, photoArchiveMetadata } from './projectExporter';

describe('originalArchiveFilename', () => {
  test('keeps an uploaded extension exactly once', () => {
    expect(originalArchiveFilename('הצעת מחיר.pdf')).toBe('הצעת מחיר.pdf');
    expect(originalArchiveFilename('site-photo.JPG')).toBe('site-photo.JPG');
  });

  test('sanitizes unsafe filename characters without changing the extension', () => {
    expect(originalArchiveFilename('דו"ח/חודש:07.pdf')).toBe('דו_ח_חודש_07.pdf');
  });
});

describe('photoArchiveMetadata', () => {
  test('maps each photo and its user notes to its archived file', () => {
    const { photoRows, noteRows } = photoArchiveMetadata([{
      _id: 'photo-1',
      label: 'סדק בקיר',
      originalUrl: 'https://storage.example/photo',
      originalFileName: 'crack.jpg',
      takenOn: '2026-07-27',
      location: 'סלון',
      stageLabel: 'טיח',
      tag: 'בעיה',
      versions: [{ _id: 'version-1', versionNumber: 2 }],
      notes: [{ versionId: 'version-1', authorName: 'דני', role: 'owner', text: 'לטפל לפני צבע' }],
    }]);

    expect(photoRows[0]).toMatchObject({
      כותרת: 'סדק בקיר',
      'קובץ מקורי': 'תמונות/סדק בקיר/crack.jpg',
      מיקום: 'סלון',
      'מספר הערות': 1,
    });
    expect(noteRows).toEqual([{
      כותרת_תמונה: 'סדק בקיר',
      קובץ: 'גרסה 2',
      כותב: 'דני',
      תפקיד: 'owner',
      הערה: 'לטפל לפני צבע',
    }]);
  });
});
