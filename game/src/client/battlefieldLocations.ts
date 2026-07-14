import type { TerritoryView } from '../shared/api';
import locationData from './battlefield-locations.json';

export type BattlefieldPoint = {
  x: number;
  y: number;
};

export type BattlefieldObstacle = {
  id: string;
  points: BattlefieldPoint[];
};

export type BattlefieldLocation = {
  id: string;
  column: number;
  row: number;
  image: string;
  theme: string;
  obstacles: BattlefieldObstacle[];
};

const locations = locationData as BattlefieldLocation[];
const locationsById = new Map(locations.map((location) => [location.id, location]));
const fallbackLocation: BattlefieldLocation = (() => {
  const location = locationsById.get('c03-r03') ?? locations[0];
  if (!location) throw new Error('Battlefield location manifest is empty');
  return location;
})();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function coordinateId(column: number, row: number) {
  return `c${String(column).padStart(2, '0')}-r${String(row).padStart(2, '0')}`;
}

export function getBattlefieldLocation(territory: TerritoryView | undefined, overrideId: string | null) {
  if (overrideId) {
    const overridden = locationsById.get(overrideId);
    if (overridden) return overridden;
  }

  if (!territory) return fallbackLocation;

  const column = clamp(Math.floor((territory.x / 100) * 6) + 1, 1, 6);
  const row = clamp(Math.floor((territory.y / 100) * 5) + 1, 1, 5);

  return locationsById.get(coordinateId(column, row)) ?? fallbackLocation;
}
