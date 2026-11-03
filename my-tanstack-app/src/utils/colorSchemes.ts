export type AccentScheme =
  | 'orange'
  | 'blue'
  | 'teal'
  | 'indigo'
  | 'bronze'
  | 'slate';

export interface ColorSchemeDef {
  id: AccentScheme;
  label: string;
  desc: string;
  lightAccent: string;
  lightAccentDark: string;
  darkAccent: string;
  darkAccentDark: string;
}

export const DEFAULT_ACCENT_SCHEME: AccentScheme = 'orange';

export const COLOR_SCHEMES: readonly ColorSchemeDef[] = [
  {
    id: 'orange',
    label: 'כתום בנייה',
    desc: 'צבע המותג הקלאסי של BuildSync',
    lightAccent: '#E07A38',
    lightAccentDark: '#C4652A',
    darkAccent: '#F08A48',
    darkAccentDark: '#D4743C',
  },
  {
    id: 'blue',
    label: 'כחול הנדסי',
    desc: 'מראה טכני, נקי ומקצועי',
    lightAccent: '#2563EB',
    lightAccentDark: '#1D4ED8',
    darkAccent: '#3B82F6',
    darkAccentDark: '#2563EB',
  },
  {
    id: 'teal',
    label: 'טורקיז נדל״ן',
    desc: 'רגוע ומודרני בסגנון מערכות פרודוקטיביות',
    lightAccent: '#0D9488',
    lightAccentDark: '#0F766E',
    darkAccent: '#14B8A6',
    darkAccentDark: '#0D9488',
  },
  {
    id: 'indigo',
    label: 'אינדיגו מערכת',
    desc: 'עמוק וחד בסגנון כלי ניהול מתקדמים',
    lightAccent: '#4F46E5',
    lightAccentDark: '#4338CA',
    darkAccent: '#6366F1',
    darkAccentDark: '#4F46E5',
  },
  {
    id: 'bronze',
    label: 'ברונזה אדריכלית',
    desc: 'חמים ויוקרתי בהשראת חומרים טבעיים',
    lightAccent: '#B45309',
    lightAccentDark: '#92400E',
    darkAccent: '#D97706',
    darkAccentDark: '#B45309',
  },
  {
    id: 'slate',
    label: 'אפור גרפיט',
    desc: 'מינימליסטי ומונוכרומטי בסגנון אדריכלי',
    lightAccent: '#475569',
    lightAccentDark: '#334155',
    darkAccent: '#94A3B8',
    darkAccentDark: '#64748B',
  },
] as const;

const VALID_SCHEMES = new Set<string>(COLOR_SCHEMES.map((s) => s.id));

export function isValidAccentScheme(value: unknown): value is AccentScheme {
  return typeof value === 'string' && VALID_SCHEMES.has(value);
}

export function normalizeAccentScheme(value: unknown): AccentScheme {
  return isValidAccentScheme(value) ? value : DEFAULT_ACCENT_SCHEME;
}

export const accentKey = (userId?: string | null) =>
  userId ? `buildsync:accent:${userId}` : 'buildsync:accent';

export function getSavedAccentScheme(userId?: string | null): AccentScheme {
  if (typeof window === 'undefined') return DEFAULT_ACCENT_SCHEME;
  try {
    const perUser = userId ? localStorage.getItem(accentKey(userId)) : null;
    if (isValidAccentScheme(perUser)) return perUser;
    const generic = localStorage.getItem('buildsync:accent');
    if (isValidAccentScheme(generic)) return generic;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_ACCENT_SCHEME;
}

export function applyAccentScheme(scheme: AccentScheme): void {
  if (typeof document === 'undefined') return;
  const valid = normalizeAccentScheme(scheme);
  document.documentElement.setAttribute('data-accent', valid);
}

export function saveAndApplyAccentScheme(
  scheme: AccentScheme,
  userId?: string | null,
): AccentScheme {
  const valid = normalizeAccentScheme(scheme);
  applyAccentScheme(valid);
  if (typeof window !== 'undefined') {
    try {
      if (userId) {
        localStorage.setItem(accentKey(userId), valid);
      }
      localStorage.setItem('buildsync:accent', valid);
      window.dispatchEvent(
        new CustomEvent('buildsync:accent-change', { detail: valid }),
      );
    } catch {
      // ignore storage errors
    }
  }
  return valid;
}

export function getSchemeDefinition(scheme: AccentScheme): ColorSchemeDef {
  return (
    COLOR_SCHEMES.find((s) => s.id === scheme) ?? COLOR_SCHEMES[0]
  );
}
