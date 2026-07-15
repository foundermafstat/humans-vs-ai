import type {
  BattleSide,
  BattleWinner,
  CampaignTransition,
  TerritoryOwner,
  TerritoryTargetReason,
  TerritoryTargetView,
  TerritoryView,
} from '../../shared/api';

export type Territory = TerritoryView;

export type GlobalMapTerritory = Territory & {
  column: number;
  row: number;
};

export const GLOBAL_MAP_COLUMNS = 6;
export const GLOBAL_MAP_ROWS = 5;

const TERRITORY_DEFINITIONS = [
  { id: 'c01-r01', name: 'Taiga Watchtower', owner: 'contested', column: 1, row: 1 },
  { id: 'c01-r02', name: 'Forest Road Fork', owner: 'contested', column: 1, row: 2 },
  { id: 'c01-r03', name: 'River Marsh', owner: 'green', column: 1, row: 3 },
  { id: 'c01-r04', name: 'Deep Marsh Channels', owner: 'contested', column: 1, row: 4 },
  { id: 'c01-r05', name: 'Blackwater Grove', owner: 'contested', column: 1, row: 5 },
  { id: 'c02-r01', name: 'Sunken Bunker', owner: 'ai', column: 2, row: 1 },
  { id: 'c02-r02', name: 'Command Center', owner: 'contested', column: 2, row: 2 },
  { id: 'c02-r03', name: 'Marsh Bridge', owner: 'contested', column: 2, row: 3 },
  { id: 'c02-r04', name: 'Artillery Island', owner: 'ai', column: 2, row: 4 },
  { id: 'c02-r05', name: 'Flooded High Ground', owner: 'contested', column: 2, row: 5 },
  { id: 'c03-r01', name: 'Mountain Foot', owner: 'contested', column: 3, row: 1 },
  { id: 'c03-r02', name: 'Eastern Pillbox', owner: 'contested', column: 3, row: 2 },
  { id: 'c03-r03', name: 'Central Crossroads', owner: 'green', column: 3, row: 3 },
  { id: 'c03-r04', name: 'Wetland Bypass', owner: 'green', column: 3, row: 4 },
  { id: 'c03-r05', name: 'Coastal Pine Line', owner: 'contested', column: 3, row: 5 },
  { id: 'c04-r01', name: 'Alpine Pass', owner: 'contested', column: 4, row: 1 },
  { id: 'c04-r02', name: 'Rocky Watchtower', owner: 'blue', column: 4, row: 2 },
  { id: 'c04-r03', name: 'Border Bunker', owner: 'contested', column: 4, row: 3 },
  { id: 'c04-r04', name: 'Controlled Crossing', owner: 'blue', column: 4, row: 4 },
  { id: 'c04-r05', name: 'River Desert Grove', owner: 'contested', column: 4, row: 5 },
  { id: 'c05-r01', name: 'Snowbound Approach', owner: 'contested', column: 5, row: 1 },
  { id: 'c05-r02', name: 'Thaw Corridor', owner: 'contested', column: 5, row: 2 },
  { id: 'c05-r03', name: 'Sandbag Defense', owner: 'contested', column: 5, row: 3 },
  { id: 'c05-r04', name: 'Logistics Checkpoint', owner: 'contested', column: 5, row: 4 },
  { id: 'c05-r05', name: 'Desert Bunker Road', owner: 'contested', column: 5, row: 5 },
  { id: 'c06-r01', name: 'Arctic Radar Base', owner: 'contested', column: 6, row: 1 },
  { id: 'c06-r02', name: 'Radar Access Road', owner: 'ai', column: 6, row: 2 },
  { id: 'c06-r03', name: 'Missile Platform', owner: 'contested', column: 6, row: 3 },
  { id: 'c06-r04', name: 'Desert Motor Pool', owner: 'blue', column: 6, row: 4 },
  { id: 'c06-r05', name: 'Bunker Defense Hub', owner: 'contested', column: 6, row: 5 },
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  owner: TerritoryOwner;
  column: number;
  row: number;
}>;

const LEGACY_TERRITORY_ALIASES: Readonly<Record<string, string>> = {
  'signal-tower-7': 'c02-r02',
  'cache-delta': 'c02-r01',
  'packet-yard': 'c03-r03',
  'firewall-pass': 'c04-r02',
  'mirror-farm': 'c05-r03',
  'botnet-marsh': 'c02-r04',
  'human-uplink': 'c03-r04',
  'null-bridge': 'c04-r04',
  'rumor-market': 'c05-r04',
  'honeypot-row': 'c06-r02',
  'overflow-gate': 'c01-r03',
  'phantom-lane': 'c06-r04',
};

const legacyIdsByCanonicalId = new Map<string, string[]>();
for (const [legacyId, canonicalId] of Object.entries(LEGACY_TERRITORY_ALIASES)) {
  const legacyIds = legacyIdsByCanonicalId.get(canonicalId) ?? [];
  legacyIds.push(legacyId);
  legacyIdsByCanonicalId.set(canonicalId, legacyIds);
}

export const TERRITORIES: readonly GlobalMapTerritory[] = TERRITORY_DEFINITIONS.map(
  (territory) => ({
    ...territory,
    x: ((territory.column - 0.5) / GLOBAL_MAP_COLUMNS) * 100,
    y: ((territory.row - 0.5) / GLOBAL_MAP_ROWS) * 100,
  }),
);

const territoriesById = new Map(TERRITORIES.map((territory) => [territory.id, territory]));
const DEFAULT_TERRITORY = TERRITORIES[0] as GlobalMapTerritory;

export function getCanonicalTerritoryId(id: string | undefined) {
  if (!id) return DEFAULT_TERRITORY.id;

  return LEGACY_TERRITORY_ALIASES[id] ?? id;
}

export function getTerritoryById(id: string | undefined): GlobalMapTerritory {
  return territoriesById.get(getCanonicalTerritoryId(id)) ?? DEFAULT_TERRITORY;
}

export function getTerritoryStorageIds(id: string | undefined): readonly string[] {
  const canonicalId = getTerritoryById(id).id;

  return [canonicalId, ...(legacyIdsByCanonicalId.get(canonicalId) ?? [])];
}

export function selectActiveTerritory(seed: string): GlobalMapTerritory {
  const battleDate = /\d{4}-\d{2}-\d{2}/.exec(seed)?.[0];
  const dateIndex = battleDate ? getUtcDayIndex(battleDate) : undefined;
  const index = dateIndex === undefined
    ? hashString(seed) % TERRITORIES.length
    : positiveModulo(dateIndex, TERRITORIES.length);

  return TERRITORIES[index] ?? DEFAULT_TERRITORY;
}

export function applyTerritoryWinner(territory: Territory, winner: BattleWinner): Territory {
  const canonicalTerritory = getTerritoryById(territory.id);

  return {
    ...canonicalTerritory,
    owner: getOwnerForWinner(territory.owner, winner),
  };
}

export function getManhattanDistance(
  left: Pick<GlobalMapTerritory, 'column' | 'row'>,
  right: Pick<GlobalMapTerritory, 'column' | 'row'>,
) {
  return Math.abs(left.column - right.column) + Math.abs(left.row - right.row);
}

export function getOrthogonalNeighbors(
  territory: Pick<GlobalMapTerritory, 'column' | 'row'>,
  territories: readonly GlobalMapTerritory[] = TERRITORIES,
): readonly GlobalMapTerritory[] {
  return territories
    .filter((candidate) => getManhattanDistance(territory, candidate) === 1)
    .sort(compareTerritories);
}

export function selectInitialTerritory(
  territories: readonly GlobalMapTerritory[],
  seed: string,
): TerritoryTargetView | undefined {
  const unoccupied = territories.filter((territory) => territory.owner === 'contested');
  const candidates = unoccupied.length > 0
    ? unoccupied
    : territories.filter((territory) => territory.owner === 'green' || territory.owner === 'blue');
  const selected = selectSeeded(candidates, seed);
  if (!selected) return undefined;

  return createTarget(
    selected,
    'system',
    0,
    unoccupied.length > 0 ? 'unoccupied' : 'attack-human',
  );
}

export type CampaignTransitionInput = {
  battleId: string;
  completedAt: string;
  winner: BattleWinner;
  activeTerritory: Territory;
  territories: readonly GlobalMapTerritory[];
};

export function selectCampaignTransition(
  input: CampaignTransitionInput,
): CampaignTransition {
  const activeTerritory = getResolvedActiveTerritory(input.activeTerritory, input.winner);
  const territories = input.territories.map((territory) => (
    getCanonicalTerritoryId(territory.id) === activeTerritory.id
      ? { ...territory, owner: activeTerritory.owner }
      : territory
  ));
  const campaignWinner = getCampaignWinner(territories);

  if (campaignWinner) {
    return {
      type: 'campaign-complete',
      completion: {
        winner: campaignWinner,
        finalBattleId: input.battleId,
        completedAt: input.completedAt,
        report: {
          status: 'pending',
        },
      },
    };
  }

  if (!isDecisiveWinner(input.winner)) {
    return {
      type: 'next-target',
      target: createTarget(activeTerritory, 'system', 0, 'retry-draw'),
    };
  }

  const unoccupied = territories.filter((territory) => territory.owner === 'contested');
  if (unoccupied.length > 0) {
    return {
      type: 'next-target',
      target: selectClosestTarget(
        activeTerritory,
        unoccupied,
        input.winner,
        `${input.battleId}:${input.winner}:unoccupied`,
        'unoccupied',
      ),
    };
  }

  const opponents = territories.filter((territory) => (
    territory.owner !== input.winner && territory.owner !== 'contested'
  ));
  const closestOpponents = getClosestRing(activeTerritory, opponents);

  if (input.winner === 'ai') {
    return {
      type: 'next-target',
      target: selectClosestTarget(
        activeTerritory,
        closestOpponents,
        input.winner,
        `${input.battleId}:${input.winner}:human`,
        'attack-human',
      ),
    };
  }

  const aiTargets = closestOpponents.filter((territory) => territory.owner === 'ai');
  const candidates = aiTargets.length > 0 ? aiTargets : closestOpponents;

  return {
    type: 'next-target',
    target: selectClosestTarget(
      activeTerritory,
      candidates,
      input.winner,
      `${input.battleId}:${input.winner}:${aiTargets.length > 0 ? 'ai' : 'rival-human'}`,
      aiTargets.length > 0 ? 'attack-ai' : 'attack-rival-human',
    ),
  };
}

function getOwnerForWinner(
  currentOwner: TerritoryOwner,
  winner: BattleWinner,
): TerritoryOwner {
  if (winner === 'green' || winner === 'blue' || winner === 'ai') {
    return winner;
  }

  return currentOwner;
}

function getResolvedActiveTerritory(
  territory: Territory,
  winner: BattleWinner,
): GlobalMapTerritory {
  const canonicalTerritory = getTerritoryById(territory.id);

  return {
    ...canonicalTerritory,
    owner: getOwnerForWinner(territory.owner, winner),
  };
}

function getCampaignWinner(
  territories: readonly GlobalMapTerritory[],
): BattleSide | undefined {
  const ownersByTerritoryId = new Map<string, TerritoryOwner>();

  for (const territory of territories) {
    const canonicalId = getCanonicalTerritoryId(territory.id);
    if (territoriesById.has(canonicalId)) {
      ownersByTerritoryId.set(canonicalId, territory.owner);
    }
  }

  if (ownersByTerritoryId.size !== TERRITORIES.length) return undefined;

  const owners = [...ownersByTerritoryId.values()];
  const winner = owners[0];
  if (!winner || winner === 'contested') return undefined;

  return owners.every((owner) => owner === winner) ? winner : undefined;
}

function isDecisiveWinner(winner: BattleWinner): winner is BattleSide {
  return winner === 'green' || winner === 'blue' || winner === 'ai';
}

function selectClosestTarget(
  origin: GlobalMapTerritory,
  candidates: readonly GlobalMapTerritory[],
  selectedBy: BattleSide,
  seed: string,
  reason: TerritoryTargetReason,
): TerritoryTargetView {
  const closest = getClosestRing(origin, candidates);
  const selected = selectSeeded(closest, seed) ?? origin;

  return createTarget(
    selected,
    selectedBy,
    getManhattanDistance(origin, selected),
    selected === origin ? 'retry-draw' : reason,
  );
}

function getClosestRing(
  origin: GlobalMapTerritory,
  territories: readonly GlobalMapTerritory[],
) {
  let closestDistance = Number.POSITIVE_INFINITY;
  const closest: GlobalMapTerritory[] = [];

  for (const territory of territories) {
    const distance = getManhattanDistance(origin, territory);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest.length = 0;
      closest.push(territory);
    } else if (distance === closestDistance) {
      closest.push(territory);
    }
  }

  return closest;
}

function selectSeeded(
  territories: readonly GlobalMapTerritory[],
  seed: string,
) {
  if (territories.length === 0) return undefined;

  const ordered = [...territories].sort(compareTerritories);
  return ordered[hashString(seed) % ordered.length];
}

function createTarget(
  territory: GlobalMapTerritory,
  selectedBy: BattleSide | 'system',
  distance: number,
  reason: TerritoryTargetReason,
): TerritoryTargetView {
  return {
    territory,
    selectedBy,
    distance,
    reason,
  };
}

function compareTerritories(left: GlobalMapTerritory, right: GlobalMapTerritory) {
  return left.id.localeCompare(right.id);
}

function getUtcDayIndex(battleDate: string) {
  const timestamp = Date.parse(`${battleDate}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return undefined;

  return Math.floor(timestamp / 86_400_000);
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
