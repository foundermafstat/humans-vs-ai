import type { ArmyColor, RewardSummary } from '../../shared/api';

export type PlayerFlairStatus = 'awaiting-orders' | 'orders-locked' | 'standing-by';

const RANK_XP_STEP = 25;

export const PLAYER_RANKS = [
  'Captcha Casualty',
  'Prompt Peasant',
  'Keyboard Militia',
  'Tin Foil Recruit',
  'Spreadsheet Survivor',
  'Copy Paste Cadet',
  'Algorithm Alarmist',
  'Ctrl Plus Z Fighter',
  'Meme Infantry',
  'Captcha Squire',
  'Wi Fi Trench Scout',
  'Prompt Dodger',
  'AI Panic Intern',
  'Forum Skirmisher',
  'Bot Spotting Corporal',
  'Neural Net Naysayer',
  'JPEG Resistance Trooper',
  'Deepfake Detective',
  'Anti Autocomplete Sergeant',
  'Spam Folder Veteran',
  'Doomscroll Lieutenant',
  'Firewall Knight',
  'Prompt Injection Ranger',
  'Model Collapse Monk',
  'Captcha Paladin',
  'Meme War Chaplain',
  'Hallucination Hunter',
  'Token Economy Warlord',
  'GPU Siege Captain',
  'Dataset Raider',
  'Bias Exorcist',
  'Luddite Commander',
  'Synthetic Slop Slayer',
  'Anti Bot Inquisitor',
  'Turing Test Duelist',
  'Reddit Uprising Marshal',
  'Doom Prophet of the Feed',
  'Grandmaster of Manual Labor',
  'Supreme Prompt Breaker',
  'Commander of the Human Lag',
  'Archduke of Analog Truth',
  'High Admiral of the Offline Fleet',
  'Lord of the Final Captcha',
  'Saint of the Broken Algorithm',
  'Emperor of Unoptimized Humanity',
  'The Last Organic Moderator',
  'Supreme Warlord of the Comment Section',
  'Eternal Champion of Meatspace',
] as const;

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
  const title = PLAYER_RANKS[index] ?? 'Captcha Casualty';

  return {
    emojiRef: `:hva_rank_${number}:`,
    index,
    number,
    title,
  };
}

export function createDefaultRewards(): RewardSummary {
  return {
    xp: 0,
    rank: PLAYER_RANKS[0],
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
