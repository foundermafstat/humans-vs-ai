import { DOCTRINE_IDS, type DoctrineId } from '../../shared/api';

export type { DoctrineId } from '../../shared/api';

export type DoctrineOutcome = 'win' | 'loss' | 'draw';

export type DoctrineAdvantage = {
  target: DoctrineId;
  reason: string;
};

export type DoctrineDefinition = {
  id: DoctrineId;
  name: string;
  theme: string;
  description: string;
  combatRole: string;
  beats: readonly DoctrineAdvantage[];
  losesTo: readonly DoctrineId[];
};

export type DoctrineMatchup = {
  attacker: DoctrineId;
  defender: DoctrineId;
  outcome: DoctrineOutcome;
  reason: string;
};

export const DOCTRINE_ORDER: readonly DoctrineId[] = DOCTRINE_IDS;

export const DOCTRINES: Record<DoctrineId, DoctrineDefinition> = {
  STRIKE: {
    id: 'STRIKE',
    name: 'Strike',
    theme: 'Assault / Kinetics',
    description: 'Direct aggression, raw force, and frontal pressure.',
    combatRole: 'Breaks fragile or hidden systems before they can complete their setup.',
    beats: [
      {
        target: 'HACK',
        reason: 'Destroys the hacker before the exploit can finish.',
      },
      {
        target: 'VIRUS',
        reason: 'Wipes out infected servers together with the source of corruption.',
      },
      {
        target: 'PHANTOM',
        reason: 'Uses area pressure to catch stealth units without needing a precise lock.',
      },
    ],
    losesTo: ['SHIELD', 'OVERLOAD', 'TRAP'],
  },
  HACK: {
    id: 'HACK',
    name: 'Hack',
    theme: 'Exploit / Control',
    description: 'Precision bypasses, control hijacking, and code injection.',
    combatRole: 'Turns complex systems against themselves through targeted access.',
    beats: [
      {
        target: 'VIRUS',
        reason: 'Rewrites malicious code and claims it as a controlled payload.',
      },
      {
        target: 'PHANTOM',
        reason: 'Scans, fingerprints, and exposes hidden signatures.',
      },
      {
        target: 'SHIELD',
        reason: 'Bypasses static defenses through backdoors instead of brute force.',
      },
    ],
    losesTo: ['STRIKE', 'TRAP', 'OVERLOAD'],
  },
  VIRUS: {
    id: 'VIRUS',
    name: 'Virus',
    theme: 'Corruption / Replication',
    description: 'Self-replicating code that slowly eats through hostile systems.',
    combatRole: 'Wins extended contact by spreading, mutating, and degrading defenses.',
    beats: [
      {
        target: 'PHANTOM',
        reason: 'Passively infects stealth units on contact even when they stay hidden.',
      },
      {
        target: 'SHIELD',
        reason: 'Corrodes defensive layers from the inside.',
      },
      {
        target: 'OVERLOAD',
        reason: 'Hijacks botnet traffic and turns volume into a carrier network.',
      },
    ],
    losesTo: ['HACK', 'TRAP', 'STRIKE'],
  },
  PHANTOM: {
    id: 'PHANTOM',
    name: 'Phantom',
    theme: 'Stealth / Silence',
    description: 'Masking, radio silence, and movement outside normal sensor coverage.',
    combatRole: 'Avoids predictable engagements and slips past systems built to face clear targets.',
    beats: [
      {
        target: 'SHIELD',
        reason: 'Passes through static defense by avoiding its fixed engagement lanes.',
      },
      {
        target: 'OVERLOAD',
        reason: 'Ignores mass spam because it has no stable signature to flood.',
      },
      {
        target: 'TRAP',
        reason: 'Detects the shape of the ambush and routes around it.',
      },
    ],
    losesTo: ['VIRUS', 'STRIKE', 'HACK'],
  },
  SHIELD: {
    id: 'SHIELD',
    name: 'Shield',
    theme: 'Firewall / Hold',
    description: 'Hard defense, channel blocking, and disciplined point control.',
    combatRole: 'Absorbs pressure and makes reckless movement or noise ineffective.',
    beats: [
      {
        target: 'OVERLOAD',
        reason: 'Filters junk traffic without wasting critical resources.',
      },
      {
        target: 'TRAP',
        reason: 'Makes the ambush useless by refusing to move into it.',
      },
      {
        target: 'STRIKE',
        reason: 'Receives and dampens the kinetic impact of a frontal assault.',
      },
    ],
    losesTo: ['PHANTOM', 'HACK', 'VIRUS'],
  },
  OVERLOAD: {
    id: 'OVERLOAD',
    name: 'Overload',
    theme: 'DDoS / Swarm',
    description: 'Mass junk traffic, request spam, and crowd pressure.',
    combatRole: 'Wins by exhausting attention, bandwidth, and processing capacity.',
    beats: [
      {
        target: 'TRAP',
        reason: 'Floods the ambush with fake targets until the trap breaks.',
      },
      {
        target: 'STRIKE',
        reason: 'Stalls a direct offensive inside a dense mass of low-value targets.',
      },
      {
        target: 'HACK',
        reason: 'Starves the hacker of resources until the exploit chain collapses.',
      },
    ],
    losesTo: ['SHIELD', 'PHANTOM', 'VIRUS'],
  },
  TRAP: {
    id: 'TRAP',
    name: 'Trap',
    theme: 'Honeypot / Ambush',
    description: 'Prepared ambushes, false servers, and enemy misdirection.',
    combatRole: 'Punishes predictable aggression and isolates threats inside controlled terrain.',
    beats: [
      {
        target: 'STRIKE',
        reason: 'Meets the frontal attack with a prepared snare.',
      },
      {
        target: 'HACK',
        reason: 'Lures the hacker into an isolated sandbox.',
      },
      {
        target: 'VIRUS',
        reason: 'Routes malicious code into quarantine before it can spread.',
      },
    ],
    losesTo: ['OVERLOAD', 'SHIELD', 'PHANTOM'],
  },
};

export const DOCTRINE_LIST: readonly DoctrineDefinition[] = Object.values(DOCTRINES);

export function isDoctrineId(value: string): value is DoctrineId {
  return (
    value === 'STRIKE' ||
    value === 'HACK' ||
    value === 'VIRUS' ||
    value === 'PHANTOM' ||
    value === 'SHIELD' ||
    value === 'OVERLOAD' ||
    value === 'TRAP'
  );
}

export function normalizeDoctrineId(value: unknown) {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toUpperCase();
  if (!isDoctrineId(normalized)) return undefined;

  return normalized;
}

export function getDoctrineMatchup(attacker: DoctrineId, defender: DoctrineId): DoctrineMatchup {
  if (attacker === defender) {
    return {
      attacker,
      defender,
      outcome: 'draw',
      reason: 'Both sides use the same doctrine, so neither side has a doctrine advantage.',
    };
  }

  const advantage = DOCTRINES[attacker].beats.find((entry) => entry.target === defender);
  if (advantage) {
    return {
      attacker,
      defender,
      outcome: 'win',
      reason: advantage.reason,
    };
  }

  const counterAdvantage = DOCTRINES[defender].beats.find((entry) => entry.target === attacker);

  return {
    attacker,
    defender,
    outcome: 'loss',
    reason: counterAdvantage?.reason ?? `${defender} counters ${attacker}.`,
  };
}
