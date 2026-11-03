import { getFloorLabel } from '../screens/ProjectSetupScreen';

export const DEFAULT_FLOOR_WASTE_PCT = 15;
export const FLOOR_CATEGORY = 'ריצוף';
export const FLOOR_NAME = 'ריצוף לחדר';
export const FLOOR_UNIT = 'מ"ר';
export const WALL_TILE_CATEGORY = 'חיפוי קירות';
export const WALL_TILE_NAME = 'ריצוף לחיפוי קירות';
export const WALL_TILE_UNIT = 'מ"ר';

export const wasteFactor = (pct: number | undefined) =>
  1 + Number(pct ?? DEFAULT_FLOOR_WASTE_PCT) / 100;

export const applyWaste = (base: number, pct: number | undefined) =>
  Math.ceil(Math.max(0, base) * wasteFactor(pct));

export type AggregatedWizardItem = {
  name: string;
  cat: string;
  unit: string;
  total: number;
  rooms: { name: string; qty: number; notes?: string }[];
  notes: string[];
};

export function aggregateWizardItems(
  rooms: { uid: string; name: string; floor: number | string }[],
  allItems: Record<string, any[]>,
  housingUnits?: number,
): Record<string, AggregatedWizardItem> {
  const aggregated: Record<string, AggregatedWizardItem> = {};
  Object.keys(allItems).forEach((ruid) => {
    const room = rooms.find((r) => r.uid === ruid);
    const rName = room
      ? `${room.name} (${getFloorLabel(Number(room.floor), housingUnits)})`
      : 'חדר';
    (allItems[ruid] || []).forEach((item: any) => {
      if (item.isLocked && item.isEnabled === false) return;
      const effectiveQty = item.isLocked
        ? Number(item.qty ?? 0)
        : Number(item.userQty ?? item.qty ?? 0);
      if (effectiveQty <= 0) return;
      const key = `${item.name}|${item.cat}|${item.unit}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          name: item.name,
          cat: item.cat,
          unit: item.unit,
          total: 0,
          rooms: [],
          notes: [],
        };
      }
      aggregated[key].total += effectiveQty;
      const notes = String(item.notes ?? '').trim();
      aggregated[key].rooms.push({
        name: rName,
        qty: effectiveQty,
        ...(notes ? { notes } : {}),
      });
      if (notes && !aggregated[key].notes.includes(notes)) {
        aggregated[key].notes.push(notes);
      }
    });
  });
  return aggregated;
}
