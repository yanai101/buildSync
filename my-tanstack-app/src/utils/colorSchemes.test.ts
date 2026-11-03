import { describe, expect, test } from 'vitest';
import {
  COLOR_SCHEMES,
  DEFAULT_ACCENT_SCHEME,
  accentKey,
  getSchemeDefinition,
  isValidAccentScheme,
  normalizeAccentScheme,
} from './colorSchemes';

describe('colorSchemes utilities', () => {
  test('defines 6 valid color schemes with orange as default', () => {
    expect(DEFAULT_ACCENT_SCHEME).toBe('orange');
    expect(COLOR_SCHEMES.map((s) => s.id)).toEqual([
      'orange',
      'blue',
      'teal',
      'indigo',
      'bronze',
      'slate',
    ]);
  });

  test('validates known schemes and rejects invalid values', () => {
    for (const scheme of COLOR_SCHEMES) {
      expect(isValidAccentScheme(scheme.id)).toBe(true);
    }
    expect(isValidAccentScheme('purple')).toBe(false);
    expect(isValidAccentScheme('')).toBe(false);
    expect(isValidAccentScheme(null)).toBe(false);
    expect(isValidAccentScheme(undefined)).toBe(false);
  });

  test('normalizes invalid scheme values back to default orange', () => {
    expect(normalizeAccentScheme('blue')).toBe('blue');
    expect(normalizeAccentScheme('teal')).toBe('teal');
    expect(normalizeAccentScheme('unknown')).toBe('orange');
    expect(normalizeAccentScheme(undefined)).toBe('orange');
  });

  test('formats per-user and fallback localStorage keys properly', () => {
    expect(accentKey()).toBe('buildsync:accent');
    expect(accentKey(null)).toBe('buildsync:accent');
    expect(accentKey('user_123')).toBe('buildsync:accent:user_123');
  });

  test('returns scheme definition with light and dark hex tokens', () => {
    const blue = getSchemeDefinition('blue');
    expect(blue.id).toBe('blue');
    expect(blue.lightAccent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(blue.darkAccent).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
