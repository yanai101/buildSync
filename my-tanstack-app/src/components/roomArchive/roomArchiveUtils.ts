import type { Id } from '../../../convex/_generated/dataModel';
import {
  ROOM_PHOTO_CATEGORY_LABELS,
  type RoomPhotoCategory,
} from '../../../convex/_lib/roomArchiveShared';
import { ROOM_TYPE_OPTS } from '../../utils/mockData';

export type RoomStage = {
  id: Id<'stages'>;
  name: string;
  sortOrder: number;
  status: string;
  startDate: string;
  endDate: string;
};

export type RoomPhoto = {
  id: Id<'roomPhotos'>;
  url: string | null;
  originalName: string;
  category: RoomPhotoCategory;
  description: string;
  note: string;
  stageId: Id<'stages'> | null;
  stageDeleted: boolean;
  stageName: string | null;
  takenOn: string | null;
  uploadedAt: number;
  updatedAt: number | null;
  uploaderName: string;
};

/** A "bucket" a photo belongs to: a live stage, a deleted stage, or no stage. */
export type StageBucket = {
  key: string;
  label: string;
  stage: RoomStage | null;
  deleted: boolean;
  photos: RoomPhoto[];
};

export const NO_STAGE_KEY = 'none';

export const roomTypeLabel = (type: string) =>
  ROOM_TYPE_OPTS.find((o) => o.id === type)?.label ?? type;

export const categoryLabel = (c: RoomPhotoCategory) => ROOM_PHOTO_CATEGORY_LABELS[c] ?? c;

export const stageStatusLabel = (status: string) =>
  status === 'done' ? 'הושלם' : status === 'active' ? 'בביצוע' : 'מתוכנן';

export const formatDate = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '';
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('he-IL');
};

export const photoBucketKey = (p: RoomPhoto) =>
  p.stageId ?? (p.stageDeleted ? `deleted:${p.stageName ?? ''}` : NO_STAGE_KEY);

/**
 * Groups photos by stage in construction order: live stages by sortOrder,
 * then deleted stages, then "no stage". Stages without photos are included
 * only when `includeEmpty` is set.
 */
export function groupPhotosByStage(photos: RoomPhoto[], stages: RoomStage[], includeEmpty = false): StageBucket[] {
  const buckets = new Map<string, StageBucket>();
  for (const s of [...stages].sort((a, b) => a.sortOrder - b.sortOrder)) {
    buckets.set(s.id, { key: s.id, label: s.name, stage: s, deleted: false, photos: [] });
  }
  for (const p of photos) {
    const key = photoBucketKey(p);
    if (!buckets.has(key)) {
      buckets.set(key, key === NO_STAGE_KEY
        ? { key, label: 'ללא שלב', stage: null, deleted: false, photos: [] }
        : { key, label: `${p.stageName ?? 'שלב'} (שלב שנמחק)`, stage: null, deleted: true, photos: [] });
    }
    buckets.get(key)!.photos.push(p);
  }
  const ordered = Array.from(buckets.values());
  const live = ordered.filter((b) => b.stage);
  const deleted = ordered.filter((b) => b.deleted);
  const none = ordered.filter((b) => b.key === NO_STAGE_KEY);
  return [...live, ...deleted, ...none].filter((b) => includeEmpty || b.photos.length > 0);
}

/** Default upload stage: the active stage, else the first not-yet-done stage, else the last stage. */
export const defaultStageId = (stages: RoomStage[]): Id<'stages'> | undefined => {
  const ordered = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  return (ordered.find((s) => s.status === 'active')
    ?? ordered.find((s) => s.status !== 'done')
    ?? ordered[ordered.length - 1])?.id;
};
