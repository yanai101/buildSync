// Shared constants for the Premium "Room photos" archive feature.
// Pure TypeScript (no Convex imports) so both the backend and the React
// client import the same values.

/** Max photos per room per construction stage ("no stage" counts as one bucket). */
export const MAX_PHOTOS_PER_ROOM_STAGE = 10;
/** Upper bound used when reading all photos of one room (safety cap). */
export const MAX_PHOTOS_PER_ROOM_READ = 500;
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_NOTE_LENGTH = 4000;
export const MAX_BULK_DELETE = 100;

export const ROOM_PHOTO_CATEGORIES = [
  'general',
  'plumbing',
  'electrical',
  'ac',
  'waterproofing',
  'tiling',
  'plaster_paint',
  'carpentry',
  'aluminum',
  'drywall',
  'other',
] as const;

export type RoomPhotoCategory = (typeof ROOM_PHOTO_CATEGORIES)[number];

export const ROOM_PHOTO_CATEGORY_LABELS: Record<RoomPhotoCategory, string> = {
  general: 'כללי',
  plumbing: 'אינסטלציה',
  electrical: 'חשמל',
  ac: 'מיזוג אוויר',
  waterproofing: 'איטום',
  tiling: 'ריצוף וחיפוי',
  plaster_paint: 'טיח וצבע',
  carpentry: 'נגרות',
  aluminum: 'אלומיניום וחלונות',
  drywall: 'גבס',
  other: 'אחר',
};

export const ROOM_PHOTO_CATEGORY_COLORS: Record<RoomPhotoCategory, string> = {
  general: '#64748b',
  plumbing: '#0ea5e9',
  electrical: '#f59e0b',
  ac: '#06b6d4',
  waterproofing: '#6366f1',
  tiling: '#a16207',
  plaster_paint: '#ec4899',
  carpentry: '#92400e',
  aluminum: '#475569',
  drywall: '#8b5cf6',
  other: '#71717a',
};

export const floorLabel = (floor: number): string => {
  if (floor === 0) return 'קומת קרקע';
  if (floor < 0) return floor === -1 ? 'מרתף' : `מרתף ${Math.abs(floor)}`;
  return `קומה ${floor}`;
};
