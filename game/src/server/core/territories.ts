import type { BattleWinner, TerritoryOwner, TerritoryView } from '../../shared/api';

export type Territory = TerritoryView;

export const TERRITORIES: readonly Territory[] = [
  { id: 'signal-tower-7', name: 'Signal Tower 7', owner: 'contested', x: 18, y: 31 },
  { id: 'cache-delta', name: 'Cache Delta', owner: 'ai', x: 32, y: 18 },
  { id: 'packet-yard', name: 'Packet Yard', owner: 'green', x: 47, y: 42 },
  { id: 'firewall-pass', name: 'Firewall Pass', owner: 'blue', x: 61, y: 25 },
  { id: 'mirror-farm', name: 'Mirror Farm', owner: 'contested', x: 73, y: 52 },
  { id: 'botnet-marsh', name: 'Botnet Marsh', owner: 'ai', x: 26, y: 68 },
  { id: 'human-uplink', name: 'Human Uplink', owner: 'green', x: 42, y: 73 },
  { id: 'null-bridge', name: 'Null Bridge', owner: 'blue', x: 55, y: 64 },
  { id: 'rumor-market', name: 'Rumor Market', owner: 'contested', x: 68, y: 78 },
  { id: 'honeypot-row', name: 'Honeypot Row', owner: 'ai', x: 84, y: 36 },
  { id: 'overflow-gate', name: 'Overflow Gate', owner: 'green', x: 12, y: 53 },
  { id: 'phantom-lane', name: 'Phantom Lane', owner: 'blue', x: 88, y: 70 },
] as const;

const DEFAULT_TERRITORY = TERRITORIES[0] as Territory;

export function getTerritoryById(id: string | undefined): Territory {
  return TERRITORIES.find((territory) => territory.id === id) ?? DEFAULT_TERRITORY;
}

export function selectActiveTerritory(seed: string): Territory {
  const index = hashString(seed) % TERRITORIES.length;
  return TERRITORIES[index] ?? DEFAULT_TERRITORY;
}

export function applyTerritoryWinner(territory: Territory, winner: BattleWinner): Territory {
  return {
    ...territory,
    owner: getOwnerForWinner(winner),
  };
}

function getOwnerForWinner(winner: BattleWinner): TerritoryOwner {
  if (winner === 'green' || winner === 'blue' || winner === 'ai' || winner === 'contested') {
    return winner;
  }

  return 'contested';
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
