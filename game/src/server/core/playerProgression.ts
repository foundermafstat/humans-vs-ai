import type { ArmyColor, PlayerPowerView, RewardSummary } from '../../shared/api';
import { PLAYER_RANKS } from './playerRanks';
import {
  calculateDailyXp,
  getRankLevelForXp,
  PROGRESSION_MODEL_VERSION,
  RANK_XP_THRESHOLDS,
  type DailyXpBreakdown,
  type DivisionResult,
  type MissionOutcome,
} from './playerProgressionRules';

export { PLAYER_RANKS } from './playerRanks';

export type PlayerProgressionState = {
  version: string;
  consecutiveParticipationDays: number;
  totalParticipatedEvents: number;
  totalVictories: number;
  lastParticipationDate?: string;
  lastComebackRewardDate?: string;
};

export type ProgressionLedgerEntry = {
  battleId: string;
  userId: string;
  progressionVersion: string;
  xpBefore: number;
  xpAwarded: number;
  xpAfter: number;
  rankBefore: string;
  rankAfter: string;
  newMedals: readonly string[];
  breakdown: DailyXpBreakdown;
  appliedAt: string;
};

type FlairArmy = ArmyColor | 'gray';

const ARMY_FLAIR: Record<FlairArmy, {
  backgroundColor: string;
  label: string;
  symbol: string;
}> = {
  gray: {
    backgroundColor: '#6b7280',
    label: 'Gray Humanity Reserve',
    symbol: '⚪',
  },
  green: {
    backgroundColor: '#178c45',
    label: 'Green Army',
    symbol: '🟢',
  },
  blue: {
    backgroundColor: '#2475d1',
    label: 'Blue Army',
    symbol: '🔵',
  },
};

export function getRankIndexForXp(xp: number) {
  return getRankLevelForXp(xp) - 1;
}

export function getRankForXp(xp: number) {
  const index = getRankIndexForXp(xp);
  const number = String(index + 1).padStart(2, '0');
  const rank = PLAYER_RANKS[index] ?? PLAYER_RANKS[0];

  return {
    ...rank,
    index,
    number,
  };
}

export function createDefaultRewards(): RewardSummary {
  return {
    xp: 0,
    rank: PLAYER_RANKS[0].title,
    medals: [],
    streak: 0,
  };
}

export function createDefaultProgressionState(): PlayerProgressionState {
  return {
    version: PROGRESSION_MODEL_VERSION,
    consecutiveParticipationDays: 0,
    totalParticipatedEvents: 0,
    totalVictories: 0,
  };
}

export function normalizePlayerProgressionState(
  progression: PlayerProgressionState | undefined,
): PlayerProgressionState {
  if (!progression) return createDefaultProgressionState();

  return {
    version: PROGRESSION_MODEL_VERSION,
    consecutiveParticipationDays: normalizeCount(progression.consecutiveParticipationDays),
    totalParticipatedEvents: normalizeCount(progression.totalParticipatedEvents),
    totalVictories: normalizeCount(progression.totalVictories),
    lastParticipationDate: progression.lastParticipationDate,
    lastComebackRewardDate: progression.lastComebackRewardDate,
  };
}

export function normalizeRewardSummary(rewards: RewardSummary | undefined): RewardSummary {
  if (!rewards) return createDefaultRewards();

  const xp = Number.isFinite(rewards.xp) ? Math.max(0, rewards.xp) : 0;

  return {
    xp,
    rank: getRankForXp(xp).title,
    medals: rewards.medals ?? [],
    streak: Number.isFinite(rewards.streak) ? Math.max(0, rewards.streak) : 0,
  };
}

export function getPlayerPowerForXp(xp: number): PlayerPowerView {
  const normalizedXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const rankLevel = getRankLevelForXp(normalizedXp);
  const rank = getRankForXp(normalizedXp);
  const currentThreshold = RANK_XP_THRESHOLDS[rankLevel - 1] ?? 0;
  const nextThreshold = RANK_XP_THRESHOLDS[rankLevel];
  const rankProgress = nextThreshold === undefined || nextThreshold <= currentThreshold
    ? 0
    : clamp((normalizedXp - currentThreshold) / (nextThreshold - currentThreshold), 0, 0.999);

  return {
    xp: normalizedXp,
    rankLevel,
    rank: rank.title,
    rankProgress: roundPower(rankProgress),
    total: roundPower(rankLevel + rankProgress),
  };
}

export function applyDailyProgression(input: {
  battleId: string;
  userId: string;
  battleDate: string;
  appliedAt: string;
  previousRewards?: RewardSummary;
  previousProgression?: PlayerProgressionState;
  activityXp: number;
  divisionResult: DivisionResult;
  missionOutcome: MissionOutcome;
  territoryCaptured: boolean;
}) {
  const previousRewards = normalizeRewardSummary(input.previousRewards);
  const previousProgression = normalizePlayerProgressionState(input.previousProgression);
  const daysSinceLastParticipation = differenceInDays(
    previousProgression.lastParticipationDate,
    input.battleDate,
  );
  const consecutiveParticipationDays = daysSinceLastParticipation === 1
    ? previousProgression.consecutiveParticipationDays + 1
    : 1;
  const missedDaysBeforeReturn = daysSinceLastParticipation === undefined
    ? 0
    : Math.max(0, daysSinceLastParticipation - 1);
  const daysSinceLastComebackReward = differenceInDays(
    previousProgression.lastComebackRewardDate,
    input.battleDate,
  );
  const breakdown = calculateDailyXp({
    participated: true,
    activityXp: input.activityXp,
    divisionResult: input.divisionResult,
    missionOutcome: input.missionOutcome,
    consecutiveParticipationDays,
    missedDaysBeforeReturn,
    daysSinceLastComebackReward,
  });
  const xp = previousRewards.xp + breakdown.totalXp;
  const medals = new Set(previousRewards.medals);
  medals.add('First Deployment');
  if (input.territoryCaptured) medals.add('Territory Captured');
  const newMedals = Array.from(medals).filter((medal) => !previousRewards.medals.includes(medal));
  const rewards: RewardSummary = {
    xp,
    rank: getRankForXp(xp).title,
    medals: Array.from(medals),
    streak: consecutiveParticipationDays,
  };
  const progression: PlayerProgressionState = {
    ...previousProgression,
    version: PROGRESSION_MODEL_VERSION,
    consecutiveParticipationDays,
    totalParticipatedEvents: previousProgression.totalParticipatedEvents + 1,
    totalVictories: previousProgression.totalVictories + (input.divisionResult === 'victory' ? 1 : 0),
    lastParticipationDate: input.battleDate,
    lastComebackRewardDate: breakdown.comebackXp > 0
      ? input.battleDate
      : previousProgression.lastComebackRewardDate,
  };
  const ledger: ProgressionLedgerEntry = {
    battleId: input.battleId,
    userId: input.userId,
    progressionVersion: PROGRESSION_MODEL_VERSION,
    xpBefore: previousRewards.xp,
    xpAwarded: breakdown.totalXp,
    xpAfter: xp,
    rankBefore: previousRewards.rank,
    rankAfter: rewards.rank,
    newMedals,
    breakdown,
    appliedAt: input.appliedAt,
  };

  return { rewards, progression, ledger };
}

export function createPlayerFlair(input: {
  army?: ArmyColor;
  rewards?: RewardSummary;
}) {
  const rewards = normalizeRewardSummary(input.rewards);
  const rank = getRankForXp(rewards.xp);
  const army = ARMY_FLAIR[input.army ?? 'gray'];

  return {
    backgroundColor: army.backgroundColor,
    text: `${rank.emojiRef} ${army.symbol} ${army.label} · ${rank.title}`,
    textColor: 'light' as const,
  };
}

function normalizeCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function differenceInDays(from: string | undefined, to: string) {
  if (!from) return undefined;

  const fromTime = Date.parse(`${from}T00:00:00.000Z`);
  const toTime = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return undefined;

  return Math.max(0, Math.round((toTime - fromTime) / 86_400_000));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundPower(value: number) {
  return Math.round(value * 1_000) / 1_000;
}
