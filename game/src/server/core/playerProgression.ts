import type { ArmyColor, RewardSummary } from '../../shared/api';
import { PLAYER_RANKS } from './playerRanks';

export { PLAYER_RANKS } from './playerRanks';

export type PlayerFlairStatus = 'awaiting-orders' | 'orders-locked' | 'standing-by';

const RANK_XP_STEP = 25;

const ARMY_FLAIR: Record<ArmyColor, {
  backgroundColor: string;
  label: string;
  symbol: string;
}> = {
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

const STATUS_LABELS: Record<PlayerFlairStatus, string> = {
  'awaiting-orders': 'Awaiting Orders',
  'orders-locked': 'Orders Locked',
  'standing-by': 'Standing By',
};

export function getRankIndexForXp(xp: number) {
  if (!Number.isFinite(xp) || xp <= 0) return 0;

  return Math.min(PLAYER_RANKS.length - 1, Math.floor(xp / RANK_XP_STEP));
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

export function updateRewardSummary(previous: RewardSummary | undefined, won: boolean): RewardSummary {
  const normalizedPrevious = normalizeRewardSummary(previous);
  const previousXp = normalizedPrevious.xp;
  const xp = previousXp + (won ? 25 : 10);
  const medals = new Set(normalizedPrevious.medals);
  medals.add('First Deployment');
  if (won) medals.add('Territory Captured');

  return {
    xp,
    rank: getRankForXp(xp).title,
    medals: Array.from(medals),
    streak: won ? normalizedPrevious.streak + 1 : 0,
  };
}

export function createPlayerFlair(input: {
  army: ArmyColor;
  rewards?: RewardSummary;
  status?: PlayerFlairStatus;
}) {
  const rewards = normalizeRewardSummary(input.rewards);
  const rank = getRankForXp(rewards.xp);
  const army = ARMY_FLAIR[input.army];
  const status = input.status ? ` · ${STATUS_LABELS[input.status]}` : '';

  return {
    backgroundColor: army.backgroundColor,
    text: `${rank.emojiRef} ${army.symbol} ${army.label} · ${rank.title}${status}`,
    textColor: 'light' as const,
  };
}
