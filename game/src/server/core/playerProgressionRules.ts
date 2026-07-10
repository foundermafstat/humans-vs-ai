import { PLAYER_RANKS } from './playerRanks';

/**
 * Server-owned retention/progression model.
 *
 * Design targets:
 * - an ideal player reaches rank 48 in about 90 daily cycles;
 * - a low-engagement player reaches rank 48 in about 270 calendar days;
 * - participation always grants progress, even after defeat or a failed mission;
 * - the first week promotes quickly, then rank costs grow gradually;
 * - no multiplier may reduce already earned XP or demote a player.
 */
export const PROGRESSION_MODEL_VERSION = 'daily-retention-v1';

export const PROGRESSION_TARGETS = {
  idealDaysToRank48: 90,
  lowEngagementCalendarDaysToRank48: 270,
  lowEngagementActiveDaysPerWeek: 5,
  idealFirstWeekFinalRank: 7,
  lowEngagementFirstWeekFinalRank: 4,
  rank48TotalXp: 10_250,
} as const;

export const PROGRESSION_INVARIANTS = {
  allowNegativeXp: false,
  allowRankDemotion: false,
  divisionResultAffectsStreak: false,
  rewardIdempotencyScope: 'battleId',
  postRank48Progression: 'seasonal-medals-or-prestige',
} as const;

/** A valid participation requires a meaningful daily action, such as submitting an order. */
export const DAILY_XP_RULES = {
  participationXp: 30,
  dailyXpCap: 120,
  activity: {
    warRoomContribution: 10,
    aiForecastReturn: 5,
    battleReportReturn: 5,
    maximum: 20,
  },
  divisionResult: {
    baseXp: 12,
    coefficients: {
      defeat: 1,
      draw: 1.25,
      victory: 1.5,
    },
  },
  mission: {
    notStarted: 0,
    failed: 6,
    partial: 18,
    success: 30,
  },
  streak: {
    multiplierStep: 0.05,
    daysToMaximum: 6,
    maximumMultiplier: 1.25,
    milestoneDays: [7, 14, 30, 60, 90],
  },
  comeback: {
    minimumMissedDays: 2,
    cooldownDays: 14,
    baseXp: 5,
    xpPerMissedDay: 2,
    maximumXp: 20,
  },
} as const;

/** Inputs used to calibrate, simulate and regression-test the 90/270 day targets. */
export const PROGRESSION_CALIBRATION_SCENARIOS = {
  ideal: {
    activeDaysPerWeek: 7,
    activityXp: DAILY_XP_RULES.activity.maximum,
    divisionResult: 'victory',
    missionOutcome: 'success',
  },
  lowEngagement: {
    activeDaysPerWeek: PROGRESSION_TARGETS.lowEngagementActiveDaysPerWeek,
    activityXp: 0,
    divisionResult: 'draw',
    missionOutcome: 'failed',
  },
} as const;

export type DivisionResult = keyof typeof DAILY_XP_RULES.divisionResult.coefficients;
export type MissionOutcome = keyof typeof DAILY_XP_RULES.mission;

export type DailyXpInput = {
  participated: boolean;
  activityXp: number;
  divisionResult: DivisionResult;
  missionOutcome: MissionOutcome;
  consecutiveParticipationDays: number;
  missedDaysBeforeReturn?: number;
  daysSinceLastComebackReward?: number;
};

export type DailyXpBreakdown = {
  participationXp: number;
  activityXp: number;
  resultXp: number;
  missionXp: number;
  streakMultiplier: number;
  scaledContributionXp: number;
  comebackXp: number;
  xpBeforeCap: number;
  capReductionXp: number;
  totalXp: number;
};

/**
 * Hand-tuned onboarding thresholds.
 * Ideal cadence: ranks 2, 3, 4, 5, 6 and 7 during the first seven deployments.
 */
export const EARLY_RANK_XP_THRESHOLDS = [0, 25, 110, 205, 320, 450, 650, 850] as const;

/** Rank 9 onward uses a mildly accelerating curve up to 10,250 total XP. */
export const LATE_RANK_XP_CURVE = {
  firstCalculatedLevel: 9,
  anchorLevel: 8,
  anchorTotalXp: 850,
  exponent: 1.05,
  finalLevel: PLAYER_RANKS.length,
  finalTotalXp: PROGRESSION_TARGETS.rank48TotalXp,
} as const;

export const IDEAL_FIRST_WEEK_RANK_BY_DAY = [2, 3, 4, 5, 6, 6, 7] as const;

export const RANK_XP_THRESHOLDS: readonly number[] = Object.freeze(
  PLAYER_RANKS.map((rank) => getRequiredTotalXp(rank.level)),
);

export const PLAYER_RANK_PROGRESSION = Object.freeze(
  PLAYER_RANKS.map((rank, index) => ({
    ...rank,
    requiredTotalXp: RANK_XP_THRESHOLDS[index] ?? PROGRESSION_TARGETS.rank48TotalXp,
  })),
);

export function calculateDailyXp(input: DailyXpInput): DailyXpBreakdown {
  if (!input.participated) return createEmptyDailyXpBreakdown();

  const participationXp = DAILY_XP_RULES.participationXp;
  const activityXp = clampInteger(input.activityXp, 0, DAILY_XP_RULES.activity.maximum);
  const resultXp = getDivisionResultXp(input.divisionResult);
  const missionXp = DAILY_XP_RULES.mission[input.missionOutcome];
  const streakMultiplier = getStreakMultiplier(input.consecutiveParticipationDays);
  const scaledContributionXp = Math.round(
    (activityXp + resultXp + missionXp) * streakMultiplier,
  );
  const comebackXp = getComebackXp(
    input.missedDaysBeforeReturn ?? 0,
    input.daysSinceLastComebackReward,
  );
  const xpBeforeCap = participationXp + scaledContributionXp + comebackXp;
  const totalXp = Math.min(DAILY_XP_RULES.dailyXpCap, xpBeforeCap);

  return {
    participationXp,
    activityXp,
    resultXp,
    missionXp,
    streakMultiplier,
    scaledContributionXp,
    comebackXp,
    xpBeforeCap,
    capReductionXp: xpBeforeCap - totalXp,
    totalXp,
  };
}

export function getDivisionResultXp(result: DivisionResult) {
  return Math.round(
    DAILY_XP_RULES.divisionResult.baseXp *
    DAILY_XP_RULES.divisionResult.coefficients[result],
  );
}

export function getStreakMultiplier(consecutiveParticipationDays: number) {
  const days = clampInteger(
    consecutiveParticipationDays,
    1,
    DAILY_XP_RULES.streak.daysToMaximum,
  );
  const multiplier = 1 + (days - 1) * DAILY_XP_RULES.streak.multiplierStep;

  return Math.min(DAILY_XP_RULES.streak.maximumMultiplier, multiplier);
}

export function getComebackXp(
  missedDays: number,
  daysSinceLastComebackReward: number | undefined,
) {
  const normalizedMissedDays = clampInteger(missedDays, 0, Number.MAX_SAFE_INTEGER);
  if (normalizedMissedDays < DAILY_XP_RULES.comeback.minimumMissedDays) return 0;

  if (
    daysSinceLastComebackReward !== undefined &&
    daysSinceLastComebackReward < DAILY_XP_RULES.comeback.cooldownDays
  ) {
    return 0;
  }

  return Math.min(
    DAILY_XP_RULES.comeback.maximumXp,
    DAILY_XP_RULES.comeback.baseXp +
    normalizedMissedDays * DAILY_XP_RULES.comeback.xpPerMissedDay,
  );
}

export function getRankLevelForXp(xp: number) {
  const normalizedXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;

  for (let index = RANK_XP_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    const threshold = RANK_XP_THRESHOLDS[index];
    if (threshold !== undefined && normalizedXp >= threshold) return index + 1;
  }

  return 1;
}

export function getRequiredTotalXp(level: number) {
  const normalizedLevel = clampInteger(level, 1, PLAYER_RANKS.length);
  const earlyThreshold = EARLY_RANK_XP_THRESHOLDS[normalizedLevel - 1];
  if (earlyThreshold !== undefined) return earlyThreshold;

  const progress =
    (normalizedLevel - LATE_RANK_XP_CURVE.anchorLevel) /
    (LATE_RANK_XP_CURVE.finalLevel - LATE_RANK_XP_CURVE.anchorLevel);

  return Math.round(
    LATE_RANK_XP_CURVE.anchorTotalXp +
    (LATE_RANK_XP_CURVE.finalTotalXp - LATE_RANK_XP_CURVE.anchorTotalXp) *
    Math.pow(progress, LATE_RANK_XP_CURVE.exponent),
  );
}

function createEmptyDailyXpBreakdown(): DailyXpBreakdown {
  return {
    participationXp: 0,
    activityXp: 0,
    resultXp: 0,
    missionXp: 0,
    streakMultiplier: 1,
    scaledContributionXp: 0,
    comebackXp: 0,
    xpBeforeCap: 0,
    capReductionXp: 0,
    totalXp: 0,
  };
}

function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;

  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}
