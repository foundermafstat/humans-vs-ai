import { context, redis, reddit, settings } from '@devvit/web/server';
import type {
  AiReportResponse,
  ArmyBalanceView,
  ArmyColor,
  BootstrapBattle,
  BootstrapResponse,
  BattleStatus,
  BattleResultView,
  CampaignStateView,
  CampaignTransition,
  DevThreadTarget,
  DevWarRoomState,
  DoctrineId,
  DoctrineOrder,
  DivisionCommentAnalysisResponse,
  DivisionTarget,
  DailyLeaderboardResponse,
  EligibleCommentsResponse,
  EventParticipantView,
  GlobalMapResponse,
  GlobalLeaderboardResponse,
  OrderResponse,
  PetitionStatusResponse,
  PlayerBattleState,
  PlayerJoinResponse,
  PersonalBattleRewardView,
  PublicPlayerProfileResponse,
  PublicBattleResultResponse,
  RewardSummary,
  SpySuspicionResponse,
  SpySuspicionView,
  TerritoryCaptureRecord,
  TerritoryTargetView,
  TerritoryView,
} from '../../shared/api';
import { DOCTRINE_LIST } from './doctrines';
import { aggregateCommentSignals, createEmptyCommentSignal } from './commentSignals';
import {
  applyDailyProgression,
  createDefaultProgressionState,
  createPlayerFlair,
  getPlayerPowerForXp,
  normalizeRewardSummary,
  normalizePlayerProgressionState,
  type PlayerProgressionState,
  type ProgressionLedgerEntry,
} from './playerProgression';
import {
  calculateArmyBalance,
  chooseBalancedArmy,
  createEmptyArmyBalance,
  getNextTieArmy,
  type EventParticipantRecord,
} from './eventParticipation';
import { resolveBattle } from './resolver';
import {
  buildCampaignAggregate,
  createCampaignNarrativePrompt,
  createCampaignReportPublication,
  type CampaignAggregateInput,
} from './campaignReport';
import {
  GLOBAL_MAP_COLUMNS,
  GLOBAL_MAP_ROWS,
  TERRITORIES,
  getCanonicalTerritoryId,
  getTerritoryById,
  getTerritoryStorageIds,
  selectCampaignTransition,
  selectInitialTerritory,
} from './territories';

type NewYorkParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type DailyBattle = {
  id: string;
  battleDate: string;
  status: BattleStatus;
  postId: string;
  postPermalink: string;
  resolvesAt: string;
  activeTerritoryId?: string;
  activeTerritoryBefore?: TerritoryView;
  armyBalance?: Record<ArmyColor, ArmyBalanceView>;
  nextTieArmy?: ArmyColor;
  createdAt: string;
  updatedAt: string;
  result?: BattleResultView;
  resultSummary?: string;
  resultCommentId?: string;
};

type StoredPlayer = {
  redditUserId: string;
  redditUsername?: string;
  affiliation: 'gray';
  joinedAt: string;
  updatedAt: string;
  rewards: RewardSummary;
  progression: PlayerProgressionState;
};

type StoredEventParticipant = EventParticipantRecord;

type StoredSpyOffer = {
  battleId: string;
  userId: string;
  offered: true;
  accepted?: boolean;
  coverArmy?: ArmyColor;
  objective: string;
  targetDoctrineHint: DoctrineId;
  updatedAt: string;
};

type ActiveSpyAssignment = StoredSpyOffer & {
  accepted: true;
  coverArmy: ArmyColor;
};

type PendingFlairSync = {
  taskId: string;
  userId: string;
  redditUsername?: string;
  requestedAt: string;
};

type PendingFlairTask = {
  id: string;
  sync: PendingFlairSync;
};

type DesiredPlayerFlair = {
  army: ArmyColor | undefined;
  stateKey: string;
};

type DailyTaskResult = {
  status: 'created' | 'resolved' | 'skipped';
  message: string;
  battle?: DailyBattle;
};

type CampaignFinalReportStatus = 'pending' | 'generated' | 'published';

type CampaignFinalReportPart = {
  index: number;
  marker: string;
  text: string;
  commentId?: string;
  permalink?: string;
};

type StoredCampaignState = {
  status: 'completed';
  winner: 'green' | 'blue' | 'ai';
  territoryCount: number;
  completionBattleId: string;
  completedAt: string;
  finalReport: {
    status: CampaignFinalReportStatus;
    title?: string;
    mainBody?: string;
    parts: CampaignFinalReportPart[];
    postId?: string;
    permalink?: string;
    generatedAt?: string;
    publishedAt?: string;
    backlinkCommentId?: string;
    backlinkPermalink?: string;
    lastError?: string;
    updatedAt: string;
  };
};

type PendingBattleResolution = {
  battleId: string;
  resolvedAt: string;
  result: BattleResultView;
};

type RedditCommentTargetId = `t1_${string}` | `t3_${string}`;
type RedditPostId = `t3_${string}`;
type RedditCommentId = `t1_${string}`;

type DivisionCommentTreeNode = {
  id: string;
  parentId: string;
  authorName: string;
  body: string;
  createdAt: Date;
  score: number;
  permalink?: string;
  replies: {
    children: DivisionCommentTreeNode[];
    all(): Promise<DivisionCommentTreeNode[]>;
  };
};

type DivisionBranchComment = {
  id: string;
  parentId: string;
  authorName: string;
  body: string;
  createdAt: Date;
  score: number;
  depth: number;
  permalink?: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const NEW_YORK_TIME_ZONE = 'America/New_York';
const CURRENT_BATTLE_KEY = 'app:current_battle';
const PLAYERS_KEY = 'app:players';
const EPIC_WAR_PETITION_KEY = 'app:epic_war_petition';
const TERRITORIES_KEY = 'app:territories';
const DAILY_EVENTS_KEY = 'app:daily_events';
const TERRITORY_CAPTURES_KEY = 'app:territory_captures';
const CAMPAIGN_STATE_KEY = 'app:campaign_state';
const PENDING_FLAIR_SYNCS_KEY = 'app:pending_flair_syncs';
const PENDING_FLAIR_SYNC_CURSOR_KEY = 'app:pending_flair_sync_cursor';
const DAILY_POST_TITLE_PREFIX = 'Humans vs AI Daily Battle';
const OPENAI_API_KEY_SETTING = 'openai_api_key';
const DEMO_RESOLVE_MINUTES_SETTING = 'demo_resolve_minutes';
const OPENAI_REPORT_MODEL = 'gpt-5.4-nano';
const MAX_BRANCH_COMMENTS = 50;
const MAX_ELIGIBLE_COMMENTS = 200;
const ELIGIBLE_COMMENT_PAGE_SIZE = 20;
const MAX_PROMPT_COMMENTS = 25;
const MAX_COMMENT_BODY_CHARS = 320;
const MAX_COMMENT_TREE_DEPTH = 6;
const ASSIGNMENT_LOCK_SECONDS = 15;
const DAILY_TASK_LOCK_SECONDS = 600;
const FLAIR_SYNC_LOCK_SECONDS = 600;
const FLAIR_SYNC_BATCH_SIZE = 10;
const CAMPAIGN_REPORT_LOCK_SECONDS = 600;
const CAMPAIGN_REPORT_MAX_POSTS_TO_RECONCILE = 500;
const CAMPAIGN_REPORT_MAX_OUTPUT_TOKENS = 2_400;
const CAMPAIGN_REPORT_COMMENT_SCAN_LIMIT = 500;

const DIVISION_LABELS: Record<DivisionTarget, string> = {
  green: 'Green',
  blue: 'Blue',
};

const THREAD_BODIES: Record<DevThreadTarget, string> = {
  ai: [
    '## AI Responses',
    '',
    'Official branch for game-authored AI broadcasts.',
    '',
    'The machine will publish result pressure and phase taunts here.',
  ].join('\n'),
  green: [
    '## Green HQ',
    '',
    'Official Green Tribe headquarters branch.',
    '',
    'Coordinate shield doctrine, defensive timing, and clean signal reports here.',
  ].join('\n'),
  blue: [
    '## Blue HQ',
    '',
    'Official Blue Tribe headquarters branch.',
    '',
    'Coordinate flank reports, counter-pressure, and battle reads here.',
  ].join('\n'),
};

const DEFAULT_OUTCOME = {
  winner: 'Humanity holds the line',
  summary:
    'Human divisions held the signal line long enough to keep the AI wave out of the sector.',
  aiComment:
    'AI RESULT // Humanity survived this cycle. I have archived your coordination errors for tomorrow.',
};

const OUTCOMES = [
  DEFAULT_OUTCOME,
  {
    winner: 'AI pressure breaks through',
    summary:
      'The AI wave pierced the public signal and forced humanity into a defensive reset.',
    aiComment:
      'AI RESULT // Your defenses were expressive, inefficient, and ultimately readable.',
  },
  {
    winner: 'Contested territory',
    summary:
      'No side secured full control. The owner is unchanged and the same sector returns tomorrow.',
    aiComment:
      'AI RESULT // No one won. Humanity calls this resistance. I call it unresolved computation.',
  },
];

const newYorkFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: NEW_YORK_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function getBattleKey(battleId: string) {
  return `app:battle:${battleId}`;
}

function getBattleByPostKey(postId: string) {
  return `app:battle_by_post:${postId}`;
}

function getOrdersKey(battleId: string) {
  return `app:orders:${battleId}`;
}

function getParticipantsKey(battleId: string) {
  return `app:participants:${battleId}`;
}

function getAssignmentLockKey(battleId: string) {
  return `app:participant_assignment:${battleId}`;
}

function getSpyOffersKey(battleId: string) {
  return `app:spy_offers:${battleId}`;
}

function getSpySuspicionsKey(battleId: string) {
  return `app:spy_suspicions:${battleId}`;
}

function getSpySuspicionLockKey(battleId: string, userId: string) {
  return `app:spy_suspicion_lock:${battleId}:${userId}`;
}

function getProgressionLedgerKey(battleId: string) {
  return `app:progression_ledger:${battleId}`;
}

function getProgressionLockKey(battleId: string, userId: string) {
  return `app:progression_lock:${battleId}:${userId}`;
}

function getTerritoryCaptureHistoryKey(territoryId: string) {
  return `app:territory_captures:${territoryId}`;
}

function getCampaignReportLockKey(battleId: string) {
  return `app:campaign_final_report_lock:${battleId}`;
}

function getPendingResolutionKey(battleId: string) {
  return `app:pending_resolution:${battleId}`;
}

function getWarRoomKey(postId: string) {
  return `dev:war-room:${postId}`;
}

function getResolveIdempotencyKey(battleDate: string) {
  return `app:daily_resolve:${battleDate}`;
}

function getCreateIdempotencyKey(battleDate: string) {
  return `app:daily_create:${battleDate}`;
}

function toRedditUrl(permalink: string) {
  if (permalink.startsWith('http')) return permalink;

  return `https://www.reddit.com${permalink}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRedditCommentTargetId(id: string): id is RedditCommentTargetId {
  return id.startsWith('t1_') || id.startsWith('t3_');
}

function getRedditCommentTargetId(id: string): RedditCommentTargetId {
  if (isRedditCommentTargetId(id)) return id;

  throw new Error(`Invalid Reddit comment target id: ${id}`);
}

function isRedditPostId(id: string): id is RedditPostId {
  return id.startsWith('t3_');
}

function getRedditPostId(id: string): RedditPostId {
  if (isRedditPostId(id)) return id;

  throw new Error(`Invalid Reddit post id: ${id}`);
}

function isRedditCommentId(id: string): id is RedditCommentId {
  return id.startsWith('t1_');
}

function getRedditCommentId(id: string): RedditCommentId {
  if (isRedditCommentId(id)) return id;

  throw new Error(`Invalid Reddit comment id: ${id}`);
}

function parseNumber(value: string | undefined) {
  if (!value) return 0;

  return Number(value);
}

function getNewYorkParts(date: Date): NewYorkParts {
  const parts = newYorkFormatter.formatToParts(date);
  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }

  return {
    year: parseNumber(values.year),
    month: parseNumber(values.month),
    day: parseNumber(values.day),
    hour: parseNumber(values.hour),
    minute: parseNumber(values.minute),
    second: parseNumber(values.second),
  };
}

function formatYmd(parts: Pick<NewYorkParts, 'year' | 'month' | 'day'>) {
  const year = String(parts.year).padStart(4, '0');
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(parts: Pick<NewYorkParts, 'year' | 'month' | 'day'>, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = getNewYorkParts(date);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return localAsUtc - date.getTime();
}

function newYorkLocalToUtc(parts: NewYorkParts) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess));
  const firstUtc = new Date(utcGuess - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(firstUtc);

  return new Date(utcGuess - secondOffset);
}

function getNextResolveAt(now: Date) {
  const nowParts = getNewYorkParts(now);
  const todayResolveAt = newYorkLocalToUtc({
    year: nowParts.year,
    month: nowParts.month,
    day: nowParts.day,
    hour: 21,
    minute: 0,
    second: 0,
  });

  if (now.getTime() < todayResolveAt.getTime()) return todayResolveAt;

  const tomorrow = addDays(nowParts, 1);
  return newYorkLocalToUtc({
    year: tomorrow.year,
    month: tomorrow.month,
    day: tomorrow.day,
    hour: 21,
    minute: 0,
    second: 0,
  });
}

async function getResolveAt(now: Date) {
  const rawDemoMinutes = await settings.get<string>(DEMO_RESOLVE_MINUTES_SETTING);
  const demoMinutes = rawDemoMinutes ? Number(rawDemoMinutes) : 0;
  if (Number.isFinite(demoMinutes) && demoMinutes > 0 && demoMinutes <= 180) {
    return new Date(now.getTime() + demoMinutes * 60_000);
  }

  return getNextResolveAt(now);
}

function isDailyBattle(value: unknown): value is DailyBattle {
  if (!isRecord(value)) return false;

  const resultSummaryOk =
    value.resultSummary === undefined || typeof value.resultSummary === 'string';
  const resultCommentIdOk =
    value.resultCommentId === undefined || typeof value.resultCommentId === 'string';
  const activeTerritoryOk =
    value.activeTerritoryId === undefined || typeof value.activeTerritoryId === 'string';
  const activeTerritoryBeforeOk =
    value.activeTerritoryBefore === undefined || isTerritoryView(value.activeTerritoryBefore);
  const armyBalanceOk = value.armyBalance === undefined || isArmyBalance(value.armyBalance);
  const nextTieArmyOk =
    value.nextTieArmy === undefined || value.nextTieArmy === 'green' || value.nextTieArmy === 'blue';
  const resultOk = value.result === undefined || isRecord(value.result);

  return (
    typeof value.id === 'string' &&
    typeof value.battleDate === 'string' &&
    (value.status === 'active' || value.status === 'resolved') &&
    typeof value.postId === 'string' &&
    typeof value.postPermalink === 'string' &&
    typeof value.resolvesAt === 'string' &&
    activeTerritoryOk &&
    activeTerritoryBeforeOk &&
    armyBalanceOk &&
    nextTieArmyOk &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    resultOk &&
    resultSummaryOk &&
    resultCommentIdOk
  );
}

function parseStoredPlayer(rawPlayer: string | undefined): StoredPlayer | undefined {
  if (!rawPlayer) return undefined;

  const parsed: unknown = JSON.parse(rawPlayer);
  if (!isRecord(parsed)) return undefined;
  if (
    typeof parsed.redditUserId !== 'string' ||
    (parsed.redditUsername !== undefined && typeof parsed.redditUsername !== 'string') ||
    typeof parsed.joinedAt !== 'string' ||
    typeof parsed.updatedAt !== 'string'
  ) {
    return undefined;
  }

  return {
    redditUserId: parsed.redditUserId,
    redditUsername: typeof parsed.redditUsername === 'string' ? parsed.redditUsername : undefined,
    affiliation: 'gray',
    joinedAt: parsed.joinedAt,
    updatedAt: parsed.updatedAt,
    rewards: normalizeRewardSummary(parseRewardSummary(parsed.rewards)),
    progression: normalizePlayerProgressionState(parsePlayerProgressionState(parsed.progression)),
  };
}

function parseRewardSummary(value: unknown): RewardSummary | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.xp !== 'number' ||
    typeof value.rank !== 'string' ||
    !Array.isArray(value.medals) ||
    !value.medals.every((medal) => typeof medal === 'string') ||
    typeof value.streak !== 'number'
  ) {
    return undefined;
  }

  return {
    xp: value.xp,
    rank: value.rank,
    medals: value.medals,
    streak: value.streak,
  };
}

function parsePlayerProgressionState(value: unknown): PlayerProgressionState | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.version !== 'string' ||
    typeof value.consecutiveParticipationDays !== 'number' ||
    typeof value.totalParticipatedEvents !== 'number' ||
    typeof value.totalVictories !== 'number'
  ) {
    return undefined;
  }

  return {
    version: value.version,
    consecutiveParticipationDays: value.consecutiveParticipationDays,
    totalParticipatedEvents: value.totalParticipatedEvents,
    totalVictories: value.totalVictories,
    lastParticipationDate: typeof value.lastParticipationDate === 'string'
      ? value.lastParticipationDate
      : undefined,
    lastComebackRewardDate: typeof value.lastComebackRewardDate === 'string'
      ? value.lastComebackRewardDate
      : undefined,
  };
}

function isStoredEventParticipant(value: unknown): value is StoredEventParticipant {
  if (!isRecord(value) || !isRecord(value.powerSnapshot)) return false;

  return (
    typeof value.battleId === 'string' &&
    typeof value.userId === 'string' &&
    (value.assignedArmy === 'green' || value.assignedArmy === 'blue') &&
    typeof value.confirmedAt === 'string' &&
    typeof value.powerSnapshot.xp === 'number' &&
    typeof value.powerSnapshot.rankLevel === 'number' &&
    typeof value.powerSnapshot.rank === 'string' &&
    typeof value.powerSnapshot.rankProgress === 'number' &&
    typeof value.powerSnapshot.total === 'number' &&
    typeof value.activityXp === 'number' &&
    (
      value.missionOutcome === 'notStarted' ||
      value.missionOutcome === 'failed' ||
      value.missionOutcome === 'partial' ||
      value.missionOutcome === 'success'
    )
  );
}

function parseStoredEventParticipant(rawParticipant: string | undefined) {
  if (!rawParticipant) return undefined;

  const parsed: unknown = JSON.parse(rawParticipant);
  if (!isStoredEventParticipant(parsed)) return undefined;

  return parsed;
}

function isDoctrineOrder(value: unknown): value is DoctrineOrder {
  if (!isRecord(value)) return false;

  return (
    typeof value.battleId === 'string' &&
    (value.army === 'green' || value.army === 'blue') &&
    typeof value.doctrineId === 'string' &&
    (value.sourceCommentId === undefined || typeof value.sourceCommentId === 'string') &&
    typeof value.submittedAt === 'string'
  );
}

function parseDoctrineOrder(rawOrder: string | undefined) {
  if (!rawOrder) return undefined;

  const parsed: unknown = JSON.parse(rawOrder);
  if (!isDoctrineOrder(parsed)) return undefined;

  return parsed;
}

function parseProgressionLedgerEntry(rawEntry: string | undefined): ProgressionLedgerEntry | undefined {
  if (!rawEntry) return undefined;

  try {
    const value: unknown = JSON.parse(rawEntry);
    if (
      !isRecord(value) ||
      typeof value.battleId !== 'string' ||
      typeof value.userId !== 'string' ||
      typeof value.xpBefore !== 'number' ||
      typeof value.xpAwarded !== 'number' ||
      typeof value.xpAfter !== 'number' ||
      typeof value.rankBefore !== 'string' ||
      typeof value.rankAfter !== 'string' ||
      !isRecord(value.breakdown) ||
      typeof value.appliedAt !== 'string'
    ) return undefined;

    return value as ProgressionLedgerEntry;
  } catch {
    return undefined;
  }
}

async function getProgressionLedgerEntry(battleId: string, userId: string | undefined) {
  if (!userId) return undefined;

  return parseProgressionLedgerEntry(await redis.hGet(getProgressionLedgerKey(battleId), userId));
}

function toPersonalBattleRewardView(
  ledger: ProgressionLedgerEntry | undefined,
): PersonalBattleRewardView | undefined {
  if (!ledger) return undefined;

  return {
    xpBefore: ledger.xpBefore,
    xpAwarded: ledger.xpAwarded,
    xpAfter: ledger.xpAfter,
    rankBefore: ledger.rankBefore,
    rankAfter: ledger.rankAfter,
    rankAfterLevel: getPlayerPowerForXp(ledger.xpAfter).rankLevel,
    rankUp: ledger.rankBefore !== ledger.rankAfter,
    newMedals: ledger.newMedals ?? [],
    breakdown: {
      participationXp: ledger.breakdown.participationXp,
      activityXp: ledger.breakdown.activityXp,
      resultXp: ledger.breakdown.resultXp,
      missionXp: ledger.breakdown.missionXp,
      streakMultiplier: ledger.breakdown.streakMultiplier,
      comebackXp: ledger.breakdown.comebackXp,
      capReductionXp: ledger.breakdown.capReductionXp,
    },
    appliedAt: ledger.appliedAt,
  };
}

function isStoredSpyOffer(value: unknown): value is StoredSpyOffer {
  if (!isRecord(value)) return false;

  return (
    typeof value.battleId === 'string' &&
    typeof value.userId === 'string' &&
    value.offered === true &&
    (value.accepted === undefined || typeof value.accepted === 'boolean') &&
    (
      value.coverArmy === undefined ||
      value.coverArmy === 'green' ||
      value.coverArmy === 'blue'
    ) &&
    typeof value.objective === 'string' &&
    typeof value.targetDoctrineHint === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function parseStoredSpyOffer(rawOffer: string | undefined) {
  if (!rawOffer) return undefined;

  const parsed: unknown = JSON.parse(rawOffer);
  if (!isStoredSpyOffer(parsed)) return undefined;

  return parsed;
}

function parseSpySuspicion(rawSuspicion: string | undefined): SpySuspicionView | undefined {
  if (!rawSuspicion) return undefined;
  try {
    const value: unknown = JSON.parse(rawSuspicion);
    if (
      !isRecord(value) ||
      typeof value.commentId !== 'string' ||
      typeof value.suspectedUsername !== 'string' ||
      typeof value.submittedAt !== 'string'
    ) return undefined;
    return value as SpySuspicionView;
  } catch {
    return undefined;
  }
}

async function getSpySuspicion(battleId: string, userId: string | undefined) {
  if (!userId) return undefined;
  return parseSpySuspicion(await redis.hGet(getSpySuspicionsKey(battleId), userId));
}

function parsePendingFlairSync(rawSync: string | undefined): PendingFlairSync | undefined {
  if (!rawSync) return undefined;

  try {
    const parsed: unknown = JSON.parse(rawSync);
    if (!isRecord(parsed)) return undefined;
    if (
      typeof parsed.taskId !== 'string' ||
      typeof parsed.userId !== 'string' ||
      (parsed.redditUsername !== undefined && typeof parsed.redditUsername !== 'string') ||
      typeof parsed.requestedAt !== 'string'
    ) {
      return undefined;
    }

    return {
      taskId: parsed.taskId,
      userId: parsed.userId,
      redditUsername: typeof parsed.redditUsername === 'string'
        ? parsed.redditUsername
        : undefined,
      requestedAt: parsed.requestedAt,
    };
  } catch {
    return undefined;
  }
}

function isWarRoomState(value: unknown): value is DevWarRoomState {
  if (!isRecord(value)) return false;
  if (!isRecord(value.threadIds) || !isRecord(value.threadPermalinks)) return false;

  return (
    typeof value.postId === 'string' &&
    typeof value.postPermalink === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.threadIds.ai === 'string' &&
    typeof value.threadIds.green === 'string' &&
    typeof value.threadIds.blue === 'string' &&
    typeof value.threadPermalinks.ai === 'string' &&
    typeof value.threadPermalinks.green === 'string' &&
    typeof value.threadPermalinks.blue === 'string'
  );
}

function parseDailyBattle(rawBattle: string | undefined) {
  if (!rawBattle) return undefined;

  const parsed: unknown = JSON.parse(rawBattle);
  if (!isDailyBattle(parsed)) return undefined;

  return parsed;
}

function parsePendingBattleResolution(
  rawResolution: string | undefined,
): PendingBattleResolution | undefined {
  if (!rawResolution) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResolution);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || !isRecord(parsed.result)) return undefined;
  if (
    typeof parsed.battleId !== 'string' ||
    typeof parsed.resolvedAt !== 'string' ||
    !isBattleWinner(parsed.result.winner) ||
    !isTerritoryView(parsed.result.activeTerritoryBefore) ||
    !isTerritoryView(parsed.result.activeTerritoryAfter) ||
    !isRecord(parsed.result.campaignTransition) ||
    typeof parsed.result.reportText !== 'string'
  ) {
    return undefined;
  }

  return parsed as PendingBattleResolution;
}

async function getOrCreatePendingBattleResolution(candidate: PendingBattleResolution) {
  const key = getPendingResolutionKey(candidate.battleId);
  const saved = await redis.set(key, JSON.stringify(candidate), { nx: true });
  if (saved === 'OK') return candidate;

  const existing = parsePendingBattleResolution(await redis.get(key));
  if (!existing || existing.battleId !== candidate.battleId) {
    throw new Error(`Pending resolution for ${candidate.battleId} is invalid`);
  }

  return existing;
}

function parseCampaignFinalReportPart(value: unknown): CampaignFinalReportPart | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.index !== 'number' ||
    typeof value.marker !== 'string' ||
    typeof value.text !== 'string'
  ) {
    return undefined;
  }

  return {
    index: value.index,
    marker: value.marker,
    text: value.text,
    commentId: typeof value.commentId === 'string' ? value.commentId : undefined,
    permalink: typeof value.permalink === 'string' ? value.permalink : undefined,
  };
}

function parseStoredCampaignState(rawState: string | undefined): StoredCampaignState | undefined {
  if (!rawState) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawState);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || !isRecord(parsed.finalReport)) return undefined;
  if (
    parsed.status !== 'completed' ||
    (parsed.winner !== 'green' && parsed.winner !== 'blue' && parsed.winner !== 'ai') ||
    typeof parsed.territoryCount !== 'number' ||
    typeof parsed.completionBattleId !== 'string' ||
    typeof parsed.completedAt !== 'string' ||
    (
      parsed.finalReport.status !== 'pending' &&
      parsed.finalReport.status !== 'generated' &&
      parsed.finalReport.status !== 'published'
    ) ||
    typeof parsed.finalReport.updatedAt !== 'string'
  ) {
    return undefined;
  }

  const parts = Array.isArray(parsed.finalReport.parts)
    ? parsed.finalReport.parts
      .map((part) => parseCampaignFinalReportPart(part))
      .filter((part): part is CampaignFinalReportPart => part !== undefined)
    : [];

  return {
    status: 'completed',
    winner: parsed.winner,
    territoryCount: parsed.territoryCount,
    completionBattleId: parsed.completionBattleId,
    completedAt: parsed.completedAt,
    finalReport: {
      status: parsed.finalReport.status,
      title: typeof parsed.finalReport.title === 'string' ? parsed.finalReport.title : undefined,
      mainBody: typeof parsed.finalReport.mainBody === 'string'
        ? parsed.finalReport.mainBody
        : undefined,
      parts,
      postId: typeof parsed.finalReport.postId === 'string'
        ? parsed.finalReport.postId
        : undefined,
      permalink: typeof parsed.finalReport.permalink === 'string'
        ? parsed.finalReport.permalink
        : undefined,
      generatedAt: typeof parsed.finalReport.generatedAt === 'string'
        ? parsed.finalReport.generatedAt
        : undefined,
      publishedAt: typeof parsed.finalReport.publishedAt === 'string'
        ? parsed.finalReport.publishedAt
        : undefined,
      backlinkCommentId: typeof parsed.finalReport.backlinkCommentId === 'string'
        ? parsed.finalReport.backlinkCommentId
        : undefined,
      backlinkPermalink: typeof parsed.finalReport.backlinkPermalink === 'string'
        ? parsed.finalReport.backlinkPermalink
        : undefined,
      lastError: typeof parsed.finalReport.lastError === 'string'
        ? parsed.finalReport.lastError
        : undefined,
      updatedAt: parsed.finalReport.updatedAt,
    },
  };
}

async function getBattleById(battleId: string) {
  return parseDailyBattle(await redis.get(getBattleKey(battleId)));
}

async function getCurrentBattle() {
  const battleId = await redis.get(CURRENT_BATTLE_KEY);
  if (!battleId) return undefined;

  return await getBattleById(battleId);
}

async function getCampaignState() {
  return parseStoredCampaignState(await redis.get(CAMPAIGN_STATE_KEY));
}

async function saveCampaignState(state: StoredCampaignState) {
  await redis.set(CAMPAIGN_STATE_KEY, JSON.stringify(state));
}

async function getLatestResolvedBattle() {
  const currentBattle = await getCurrentBattle();
  if (currentBattle?.status === 'resolved') return currentBattle;

  const events = await redis.hGetAll(DAILY_EVENTS_KEY);
  const battleIds = Object.entries(events)
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .map(([, battleId]) => battleId);
  for (const battleId of battleIds) {
    const battle = await getBattleById(battleId);
    if (battle?.status === 'resolved') return battle;
  }

  return undefined;
}

async function recoverCompletedCampaignState(now = new Date()) {
  const existing = await getCampaignState();
  if (existing) return existing;

  const territories = await getStoredTerritorySnapshot();
  const winner = getCompleteMapWinner(territories);
  if (!winner) return undefined;

  const latestBattle = await getLatestResolvedBattle();
  const recovered = createCompletedCampaignState({
    winner,
    completionBattleId: latestBattle?.id ?? `campaign:recovered:${formatYmd(getNewYorkParts(now))}`,
    completedAt: latestBattle?.updatedAt ?? now.toISOString(),
  });
  const saved = await redis.set(CAMPAIGN_STATE_KEY, JSON.stringify(recovered), { nx: true });

  return saved === 'OK' ? recovered : await getCampaignState();
}

async function getCurrentResolvableBattle() {
  return (await getBattleForCurrentPost()) ?? (await getCurrentBattle());
}

async function getWarRoom(postId: string) {
  const rawState = await redis.get(getWarRoomKey(postId));
  if (!rawState) return undefined;

  const parsed: unknown = JSON.parse(rawState);
  if (!isWarRoomState(parsed)) return undefined;

  return parsed;
}

async function getBattleForCurrentPost() {
  const { postId } = context;
  if (!postId) return undefined;

  const battleId = await redis.get(getBattleByPostKey(postId));
  if (!battleId) return undefined;

  return await getBattleById(battleId);
}

async function getPlayer(userId: string | undefined) {
  if (!userId) return undefined;

  const rawPlayer = await redis.hGet(PLAYERS_KEY, userId);
  const player = parseStoredPlayer(rawPlayer);
  if (player && rawPlayer !== JSON.stringify(player)) await savePlayer(player);

  return player;
}

async function savePlayer(player: StoredPlayer) {
  await redis.hSet(PLAYERS_KEY, {
    [player.redditUserId]: JSON.stringify(player),
  });
}

function getSubredditName() {
  return context.subredditName ?? 'humans_vs_ai_dev';
}

async function syncPlayerFlair(
  player: StoredPlayer,
  army: ArmyColor | undefined,
) {
  const username = player.redditUsername;
  if (!username) return false;

  const flair = createPlayerFlair({
    army,
    rewards: player.rewards,
  });

  await reddit.setUserFlair({
    subredditName: getSubredditName(),
    username,
    text: flair.text,
    textColor: flair.textColor,
    backgroundColor: flair.backgroundColor,
  });

  return true;
}

function createPendingFlairTask(input: {
  userId: string;
  redditUsername?: string;
}): PendingFlairTask {
  const requestedAt = new Date().toISOString();
  const taskId = [
    input.userId,
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join(':');
  const pendingSync: PendingFlairSync = {
    taskId,
    userId: input.userId,
    redditUsername: input.redditUsername,
    requestedAt,
  };

  return { id: taskId, sync: pendingSync };
}

async function queuePendingFlairSync(player: StoredPlayer) {
  const task = createPendingFlairTask({
    userId: player.redditUserId,
    redditUsername: player.redditUsername,
  });

  await redis.hSet(PENDING_FLAIR_SYNCS_KEY, {
    [task.id]: JSON.stringify(task.sync),
  });

  return task;
}

function createFallbackPlayer(pendingSync: PendingFlairSync): StoredPlayer {
  return {
    redditUserId: pendingSync.userId,
    redditUsername: pendingSync.redditUsername,
    affiliation: 'gray',
    joinedAt: pendingSync.requestedAt,
    updatedAt: pendingSync.requestedAt,
    rewards: normalizeRewardSummary(undefined),
    progression: createDefaultProgressionState(),
  };
}

async function getDesiredPlayerFlair(userId: string): Promise<DesiredPlayerFlair> {
  const battle = await getCurrentBattle();
  if (
    !battle ||
    battle.status !== 'active' ||
    Date.now() >= new Date(battle.resolvesAt).getTime()
  ) {
    return {
      army: undefined,
      stateKey: `neutral:${battle?.id ?? 'none'}`,
    };
  }

  const participant = await getEventParticipant(battle.id, userId);
  if (!participant) {
    return {
      army: undefined,
      stateKey: `active:${battle.id}:neutral`,
    };
  }

  const spyAssignment = await getOrCreateSpyOffer(battle, participant);
  const army = getParticipantFlairArmy(participant, spyAssignment);
  return {
    army,
    stateKey: `active:${battle.id}:${army}`,
  };
}

async function postponePendingFlairTask(task: PendingFlairTask) {
  const postponed: PendingFlairSync = {
    ...task.sync,
    requestedAt: new Date().toISOString(),
  };
  await redis.hSet(PENDING_FLAIR_SYNCS_KEY, {
    [task.id]: JSON.stringify(postponed),
  });
}

async function processPendingPlayerFlair(taskId: string, player: StoredPlayer) {
  const lockKey = `app:flair_sync_lock:${player.redditUserId}`;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = `${player.redditUserId}:${Date.now()}:${attempt}`;
    const acquired = await redis.set(lockKey, token, {
      nx: true,
      expiration: new Date(Date.now() + FLAIR_SYNC_LOCK_SECONDS * 1_000),
    });
    if (acquired !== 'OK') {
      await sleep(40 * (attempt + 1));
      continue;
    }

    try {
      const rawSync = await redis.hGet(PENDING_FLAIR_SYNCS_KEY, taskId);
      const pendingSync = parsePendingFlairSync(rawSync);
      if (
        !rawSync ||
        !pendingSync ||
        pendingSync.taskId !== taskId ||
        pendingSync.userId !== player.redditUserId
      ) {
        if (rawSync) await redis.hDel(PENDING_FLAIR_SYNCS_KEY, [taskId]);
        return false;
      }

      const task: PendingFlairTask = { id: taskId, sync: pendingSync };
      const normalizedPlayer = player.redditUsername || !pendingSync.redditUsername
        ? player
        : { ...player, redditUsername: pendingSync.redditUsername };
      const desiredBefore = await getDesiredPlayerFlair(player.redditUserId);
      try {
        const synced = await syncPlayerFlair(normalizedPlayer, desiredBefore.army);
        if (!synced) {
          await postponePendingFlairTask(task);
          return false;
        }
      } catch (error) {
        await postponePendingFlairTask(task);
        throw error;
      }

      const desiredAfter = await getDesiredPlayerFlair(player.redditUserId);
      if (desiredAfter.stateKey === desiredBefore.stateKey) {
        await redis.hDel(PENDING_FLAIR_SYNCS_KEY, [taskId]);
        return true;
      }

      await postponePendingFlairTask(task);
      return false;
    } finally {
      if (await redis.get(lockKey) === token) await redis.del(lockKey);
    }
  }

  throw new Error('Player flair synchronization is busy');
}

async function processPendingPlayerFlairSafely(taskId: string, player: StoredPlayer) {
  try {
    return await processPendingPlayerFlair(taskId, player);
  } catch (error) {
    console.error(`Failed to sync player flair for ${player.redditUserId}: ${error}`);
    return false;
  }
}

async function syncPlayerFlairSafely(
  player: StoredPlayer,
) {
  let task: PendingFlairTask;
  try {
    task = await queuePendingFlairSync(player);
  } catch (error) {
    console.error(`Failed to queue player flair for ${player.redditUserId}: ${error}`);
    return false;
  }

  return await processPendingPlayerFlairSafely(task.id, player);
}

async function retryPendingPlayerFlair(player: StoredPlayer) {
  let cursor = 0;
  let task: PendingFlairTask | undefined;
  do {
    const scan = await redis.hScan(
      PENDING_FLAIR_SYNCS_KEY,
      cursor,
      `${player.redditUserId}:*`,
      1,
    );
    cursor = scan.cursor;
    const entry = scan.fieldValues[0];
    if (!entry) continue;

    const pendingSync = parsePendingFlairSync(entry.value);
    if (!pendingSync || pendingSync.taskId !== entry.field) {
      await redis.hDel(PENDING_FLAIR_SYNCS_KEY, [entry.field]);
      continue;
    }
    task = { id: entry.field, sync: pendingSync };
  } while (!task && cursor !== 0);

  if (!task) return;

  let redditUsername = player.redditUsername;
  if (!redditUsername) {
    try {
      redditUsername = await reddit.getCurrentUsername();
    } catch (error) {
      console.error(`Failed to load Reddit username for ${player.redditUserId}: ${error}`);
    }
  }
  const normalizedPlayer = redditUsername && redditUsername !== player.redditUsername
    ? {
        ...player,
        redditUsername,
        updatedAt: new Date().toISOString(),
      }
    : player;
  if (normalizedPlayer !== player) await savePlayer(normalizedPlayer);

  await processPendingPlayerFlairSafely(task.id, normalizedPlayer);
}

export async function retryPendingPlayerFlairs(limit = FLAIR_SYNC_BATCH_SIZE) {
  const rawCursor = Number(await redis.get(PENDING_FLAIR_SYNC_CURSOR_KEY));
  const cursor = Number.isInteger(rawCursor) && rawCursor >= 0 ? rawCursor : 0;
  const scan = await redis.hScan(
    PENDING_FLAIR_SYNCS_KEY,
    cursor,
    undefined,
    Math.max(1, Math.floor(limit)),
  );
  await redis.set(PENDING_FLAIR_SYNC_CURSOR_KEY, String(scan.cursor));
  const entries = scan.fieldValues;
  let synced = 0;
  let discarded = 0;

  for (const entry of entries) {
    const pendingSync = parsePendingFlairSync(entry.value);
    if (!pendingSync || pendingSync.taskId !== entry.field) {
      await redis.hDel(PENDING_FLAIR_SYNCS_KEY, [entry.field]);
      discarded += 1;
      continue;
    }

    const player = await getPlayer(pendingSync.userId) ?? createFallbackPlayer(pendingSync);

    if (await processPendingPlayerFlairSafely(entry.field, player)) {
      synced += 1;
    }
  }

  return {
    status: 'processed' as const,
    processed: entries.length,
    synced,
    discarded,
    remaining: await redis.hLen(PENDING_FLAIR_SYNCS_KEY),
  };
}

async function getPlayers() {
  const rawPlayers = await redis.hGetAll(PLAYERS_KEY);
  const players: StoredPlayer[] = [];
  const migrations: Record<string, string> = {};

  for (const [userId, rawPlayer] of Object.entries(rawPlayers)) {
    const player = parseStoredPlayer(rawPlayer);
    if (!player) continue;

    players.push(player);
    const serialized = JSON.stringify(player);
    if (serialized !== rawPlayer) migrations[userId] = serialized;
  }

  if (Object.keys(migrations).length > 0) await redis.hSet(PLAYERS_KEY, migrations);

  return players;
}

async function getEventParticipant(battleId: string, userId: string | undefined) {
  if (!userId) return undefined;

  return parseStoredEventParticipant(await redis.hGet(getParticipantsKey(battleId), userId));
}

async function getEventParticipants(battleId: string) {
  const rawParticipants = await redis.hGetAll(getParticipantsKey(battleId));
  const participants: StoredEventParticipant[] = [];

  for (const rawParticipant of Object.values(rawParticipants)) {
    const participant = parseStoredEventParticipant(rawParticipant);
    if (participant) participants.push(participant);
  }

  return participants;
}

async function saveEventParticipant(participant: StoredEventParticipant) {
  await redis.hSet(getParticipantsKey(participant.battleId), {
    [participant.userId]: JSON.stringify(participant),
  });
}

function toEventParticipantView(participant: StoredEventParticipant): EventParticipantView {
  return {
    battleId: participant.battleId,
    assignedArmy: participant.assignedArmy,
    confirmedAt: participant.confirmedAt,
    powerSnapshot: participant.powerSnapshot,
  };
}

async function getPlayerOrder(battleId: string, userId: string | undefined) {
  if (!userId) return undefined;

  return parseDoctrineOrder(await redis.hGet(getOrdersKey(battleId), userId));
}

async function getBattleOrders(battleId: string) {
  const rawOrders = await redis.hGetAll(getOrdersKey(battleId));
  const orders = new Map<string, DoctrineOrder>();

  for (const [userId, rawOrder] of Object.entries(rawOrders)) {
    const order = parseDoctrineOrder(rawOrder);
    if (order) orders.set(userId, order);
  }

  return orders;
}

function isTerritoryView(value: unknown): value is TerritoryView {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (
      value.owner === 'green' ||
      value.owner === 'blue' ||
      value.owner === 'ai' ||
      value.owner === 'contested'
    ) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number'
  );
}

function isTerritoryOwner(value: unknown): value is TerritoryView['owner'] {
  return value === 'green' || value === 'blue' || value === 'ai' || value === 'contested';
}

function isBattleWinner(value: unknown): value is BattleResultView['winner'] {
  return isTerritoryOwner(value) || value === 'humanity';
}

function isArmyBalance(value: unknown): value is Record<ArmyColor, ArmyBalanceView> {
  if (!isRecord(value) || !isRecord(value.green) || !isRecord(value.blue)) return false;

  return (
    typeof value.green.participantCount === 'number' &&
    typeof value.green.totalPower === 'number' &&
    typeof value.blue.participantCount === 'number' &&
    typeof value.blue.totalPower === 'number'
  );
}

function parseTerritory(rawTerritory: string | undefined) {
  if (!rawTerritory) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawTerritory);
  } catch {
    return undefined;
  }
  if (!isTerritoryView(parsed)) return undefined;

  return parsed;
}

function normalizeTerritoryView(territory: TerritoryView): TerritoryView {
  const canonical = getTerritoryById(territory.id);

  return {
    ...canonical,
    owner: territory.owner,
  };
}

function parseTerritoryCapture(rawCapture: string | undefined): TerritoryCaptureRecord | undefined {
  if (!rawCapture) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawCapture);
  } catch {
    return undefined;
  }
  if (
    !isRecord(parsed) ||
    typeof parsed.id !== 'string' ||
    typeof parsed.battleId !== 'string' ||
    typeof parsed.battleDate !== 'string' ||
    typeof parsed.territoryId !== 'string' ||
    !isTerritoryOwner(parsed.previousOwner) ||
    !isTerritoryOwner(parsed.newOwner) ||
    !isBattleWinner(parsed.winner) ||
    typeof parsed.capturedAt !== 'string'
  ) {
    return undefined;
  }

  const canonicalTerritoryId = getCanonicalTerritoryId(parsed.territoryId);
  const territory = TERRITORIES.find((entry) => entry.id === canonicalTerritoryId);
  if (!territory) return undefined;
  return {
    id: parsed.id,
    battleId: parsed.battleId,
    battleDate: parsed.battleDate,
    territoryId: territory.id,
    x: territory.x,
    y: territory.y,
    previousOwner: parsed.previousOwner,
    newOwner: parsed.newOwner,
    winner: parsed.winner,
    ownershipChanged: typeof parsed.ownershipChanged === 'boolean'
      ? parsed.ownershipChanged
      : parsed.previousOwner !== parsed.newOwner,
    capturedAt: parsed.capturedAt,
    postPermalink: typeof parsed.postPermalink === 'string'
      ? parsed.postPermalink
      : undefined,
  };
}

async function getStoredTerritory(id: string | undefined) {
  const fallback = getTerritoryById(id);
  const rawTerritories = await Promise.all(
    getTerritoryStorageIds(id).map((storageId) => redis.hGet(TERRITORIES_KEY, storageId)),
  );
  const stored = rawTerritories
    .map((rawTerritory) => parseTerritory(rawTerritory))
    .find((territory) => territory !== undefined);

  return stored ? normalizeTerritoryView(stored) : fallback;
}

async function getStoredTerritorySnapshot() {
  const rawTerritories = await redis.hGetAll(TERRITORIES_KEY);
  const storedOwners = new Map<string, TerritoryView['owner']>();

  for (const [storageId, rawTerritory] of Object.entries(rawTerritories)) {
    const storedTerritory = parseTerritory(rawTerritory);
    if (!storedTerritory) continue;

    const canonicalId = getCanonicalTerritoryId(storedTerritory.id || storageId);
    const isCanonicalRecord = storageId === canonicalId || storedTerritory.id === canonicalId;
    if (!storedOwners.has(canonicalId) || isCanonicalRecord) {
      storedOwners.set(canonicalId, storedTerritory.owner);
    }
  }

  return TERRITORIES.map((territory) => ({
    ...territory,
    owner: storedOwners.get(territory.id) ?? territory.owner,
  }));
}

function createCompletedCampaignState(input: {
  winner: 'green' | 'blue' | 'ai';
  completionBattleId: string;
  completedAt: string;
}): StoredCampaignState {
  return {
    status: 'completed',
    winner: input.winner,
    territoryCount: TERRITORIES.length,
    completionBattleId: input.completionBattleId,
    completedAt: input.completedAt,
    finalReport: {
      status: 'pending',
      parts: [],
      updatedAt: input.completedAt,
    },
  };
}

function createCompletedCampaignStateFromTransition(
  transition: Extract<CampaignTransition, { type: 'campaign-complete' }>,
) {
  return createCompletedCampaignState({
    winner: transition.completion.winner,
    completionBattleId: transition.completion.finalBattleId,
    completedAt: transition.completion.completedAt,
  });
}

function toCampaignStateView(state: StoredCampaignState | undefined): CampaignStateView {
  if (!state) return { status: 'active' };

  return {
    status: 'complete',
    completion: {
      winner: state.winner,
      finalBattleId: state.completionBattleId,
      completedAt: state.completedAt,
      report: {
        status: state.finalReport.status,
        generatedAt: state.finalReport.generatedAt,
        publishedAt: state.finalReport.publishedAt,
        permalink: state.finalReport.permalink,
        lastError: state.finalReport.lastError,
      },
    },
  };
}

function getCompleteMapWinner(
  territories: readonly { owner: TerritoryView['owner'] }[],
): 'green' | 'blue' | 'ai' | undefined {
  const firstOwner = territories[0]?.owner;
  if (firstOwner !== 'green' && firstOwner !== 'blue' && firstOwner !== 'ai') return undefined;

  return territories.length === TERRITORIES.length &&
    territories.every((territory) => territory.owner === firstOwner)
    ? firstOwner
    : undefined;
}

async function getSpyOffer(battleId: string, userId: string | undefined) {
  if (!userId) return undefined;

  return parseStoredSpyOffer(await redis.hGet(getSpyOffersKey(battleId), userId));
}

function getOpposingArmy(army: ArmyColor): ArmyColor {
  return army === 'green' ? 'blue' : 'green';
}

function getParticipantFlairArmy(
  participant: StoredEventParticipant,
  spyAssignment: ActiveSpyAssignment | undefined,
) {
  return spyAssignment?.coverArmy ?? participant.assignedArmy;
}

async function getAcceptedSpyInfluence(
  battleId: string,
  participants: readonly StoredEventParticipant[],
) {
  const rawOffers = await redis.hGetAll(getSpyOffersKey(battleId));
  const participantByUserId = new Map(participants.map((participant) => [participant.userId, participant]));
  const influence: Record<ArmyColor, number> = {
    green: 0,
    blue: 0,
  };

  for (const rawOffer of Object.values(rawOffers)) {
    const offer = parseStoredSpyOffer(rawOffer);
    if (!offer?.accepted) continue;

    const participant = participantByUserId.get(offer.userId);
    if (!participant) continue;

    const coverArmy = offer.coverArmy ?? getOpposingArmy(participant.assignedArmy);
    influence[coverArmy] = Math.max(-12, influence[coverArmy] - 6);
  }

  return influence;
}

async function getOrCreateSpyOffer(
  battle: DailyBattle,
  participant: StoredEventParticipant | undefined,
): Promise<ActiveSpyAssignment | undefined> {
  if (
    !participant ||
    battle.status === 'resolved' ||
    Date.now() >= new Date(battle.resolvesAt).getTime()
  ) {
    return undefined;
  }

  const userId = participant.userId;
  const coverArmy = getOpposingArmy(participant.assignedArmy);
  const existing = await getSpyOffer(battle.id, userId);
  if (existing) {
    const assignment: ActiveSpyAssignment = {
      ...existing,
      accepted: true,
      coverArmy,
      updatedAt: new Date().toISOString(),
    };
    if (existing.accepted !== true || existing.coverArmy !== coverArmy) {
      await redis.hSet(getSpyOffersKey(battle.id), {
        [userId]: JSON.stringify(assignment),
      });
    }

    return assignment;
  }
  if (hashString(`${battle.id}:${userId}:spy`) % 4 !== 0) return undefined;

  const doctrine = DOCTRINE_LIST[hashString(`${battle.id}:${userId}:hint`) % DOCTRINE_LIST.length];
  if (!doctrine) return undefined;

  const offer: ActiveSpyAssignment = {
    battleId: battle.id,
    userId,
    offered: true,
    accepted: true,
    coverArmy,
    objective: `Create enough public noise to hide ${doctrine.name}.`,
    targetDoctrineHint: doctrine.id,
    updatedAt: new Date().toISOString(),
  };

  await redis.hSet(getSpyOffersKey(battle.id), {
    [userId]: JSON.stringify(offer),
  });

  return offer;
}

async function saveBattle(battle: DailyBattle) {
  const serialized = JSON.stringify(battle);

  await Promise.all([
    redis.set(getBattleKey(battle.id), serialized),
    redis.set(getBattleByPostKey(battle.postId), battle.id),
    redis.set(CURRENT_BATTLE_KEY, battle.id),
    redis.hSet(DAILY_EVENTS_KEY, { [battle.battleDate]: battle.id }),
  ]);
}

async function saveResolvedBattleState(
  battle: DailyBattle,
  territory: TerritoryView,
  capture: TerritoryCaptureRecord,
  pendingFlairTasks: readonly PendingFlairTask[],
  campaignState?: StoredCampaignState,
) {
  const canonicalTerritory = normalizeTerritoryView(territory);
  const serializedBattle = JSON.stringify(battle);
  const serializedTerritory = JSON.stringify(canonicalTerritory);
  const serializedCapture = JSON.stringify(capture);
  const captureHistoryKey = getTerritoryCaptureHistoryKey(capture.territoryId);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const transaction = await redis.watch(
      TERRITORIES_KEY,
      TERRITORY_CAPTURES_KEY,
      captureHistoryKey,
      getBattleKey(battle.id),
      DAILY_EVENTS_KEY,
      CAMPAIGN_STATE_KEY,
    );
    await transaction.multi();
    await transaction.hSet(TERRITORIES_KEY, {
      [canonicalTerritory.id]: serializedTerritory,
    });
    await transaction.hSet(TERRITORY_CAPTURES_KEY, {
      [capture.id]: serializedCapture,
    });
    await transaction.hSet(captureHistoryKey, {
      [capture.battleId]: serializedCapture,
    });
    await transaction.set(getBattleKey(battle.id), serializedBattle);
    await transaction.set(getBattleByPostKey(battle.postId), battle.id);
    await transaction.hSet(DAILY_EVENTS_KEY, { [battle.battleDate]: battle.id });
    if (campaignState) {
      await transaction.set(CAMPAIGN_STATE_KEY, JSON.stringify(campaignState));
    }
    if (pendingFlairTasks.length > 0) {
      await transaction.hSet(PENDING_FLAIR_SYNCS_KEY, Object.fromEntries(
        pendingFlairTasks.map((task) => [task.id, JSON.stringify(task.sync)]),
      ));
    }
    const replies = await transaction.exec();
    if (replies.length > 0) return;
  }

  throw new Error(`Could not persist resolved map state for ${battle.id}`);
}

function getOutcomeIndex(seed: string) {
  return hashString(seed) % OUTCOMES.length;
}

function hashString(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function createDeterministicResult(battle: DailyBattle) {
  const outcome = OUTCOMES[getOutcomeIndex(`${battle.id}:${battle.battleDate}`)] ?? DEFAULT_OUTCOME;

  return {
    resultSummary: `${outcome.winner}. ${outcome.summary}`,
    aiComment: outcome.aiComment,
  };
}

function getTerritoryTargetReasonText(target: TerritoryTargetView) {
  if (target.reason === 'unoccupied') return 'nearest unoccupied sector';
  if (target.reason === 'attack-ai') return 'nearest AI-held sector in range';
  if (target.reason === 'attack-rival-human') return 'nearest rival human sector in range';
  if (target.reason === 'attack-human') return 'nearest human-held sector in range';

  return 'unresolved battle rematch';
}

function appendCampaignTransitionReport(
  reportText: string,
  transition: CampaignTransition,
) {
  if (transition.type === 'campaign-complete') {
    return [
      reportText,
      `CAMPAIGN COMPLETE // ${transition.completion.winner.toUpperCase()} controls all ${TERRITORIES.length} sectors. No further daily battles will be created.`,
    ].join(' ');
  }

  const target = transition.target;
  const territory = getTerritoryById(target.territory.id);
  return [
    reportText,
    `NEXT OBJECTIVE // ${territory.name} (${territory.id.toUpperCase()}) is the next contested battlefield: ${getTerritoryTargetReasonText(target)}; Manhattan distance ${target.distance}.`,
  ].join(' ');
}

function createPlayerBattleState(input: {
  player?: StoredPlayer;
  participant?: StoredEventParticipant;
  order?: DoctrineOrder;
  spyOffer?: ActiveSpyAssignment;
  dailyReward?: ProgressionLedgerEntry;
  spySuspicion?: SpySuspicionView;
  petition?: PetitionStatusResponse;
}): PlayerBattleState {
  return {
    exists: Boolean(input.player),
    username: input.player?.redditUsername,
    affiliation: input.player?.affiliation,
    participating: Boolean(input.participant),
    participant: input.participant ? toEventParticipantView(input.participant) : undefined,
    army: input.participant?.assignedArmy,
    order: input.order,
    rewards: input.player ? normalizeRewardSummary(input.player.rewards) : undefined,
    dailyReward: toPersonalBattleRewardView(input.dailyReward),
    spySuspicion: input.spySuspicion,
    petition: input.petition,
    spyAssignment: input.spyOffer
      ? {
        active: true,
        coverArmy: input.spyOffer.coverArmy,
        objective: input.spyOffer.objective,
        targetDoctrineHint: input.spyOffer.targetDoctrineHint,
      }
      : undefined,
  };
}

async function getOrMigrateEventParticipant(
  battle: DailyBattle,
  userId: string | undefined,
  player: StoredPlayer | undefined,
  order: DoctrineOrder | undefined,
) {
  if (!userId) return undefined;

  const existing = await getEventParticipant(battle.id, userId);
  if (existing || !player || !order) return existing;

  const participant: StoredEventParticipant = {
    battleId: battle.id,
    userId,
    assignedArmy: order.army,
    confirmedAt: order.submittedAt,
    powerSnapshot: getPlayerPowerForXp(player.rewards.xp),
    activityXp: 0,
    missionOutcome: 'notStarted',
  };
  await saveEventParticipant(participant);

  return participant;
}

async function assignPlayerToDailyEvent(
  battle: DailyBattle,
  player: StoredPlayer,
): Promise<StoredEventParticipant> {
  const existing = await getEventParticipant(battle.id, player.redditUserId);
  if (existing) return existing;

  return await withAssignmentLock(battle.id, async () => {
    const currentBattle = await getBattleById(battle.id);
    if (!currentBattle || currentBattle.status === 'resolved') {
      throw new Error('Daily event participation is closed');
    }
    if (Date.now() >= new Date(currentBattle.resolvesAt).getTime()) {
      throw new Error('Daily event participation is closed');
    }

    const currentParticipant = await getEventParticipant(battle.id, player.redditUserId);
    if (currentParticipant) return currentParticipant;

    const participants = await getEventParticipants(battle.id);
    const balance = calculateArmyBalance(participants);
    const assignedArmy = chooseBalancedArmy(
      balance,
      currentBattle.nextTieArmy ?? 'green',
    );
    const participant: StoredEventParticipant = {
      battleId: battle.id,
      userId: player.redditUserId,
      assignedArmy,
      confirmedAt: new Date().toISOString(),
      powerSnapshot: getPlayerPowerForXp(player.rewards.xp),
      activityXp: 0,
      missionOutcome: 'notStarted',
    };
    const updatedParticipants = [...participants, participant];

    await saveEventParticipant(participant);
    await saveBattle({
      ...currentBattle,
      armyBalance: calculateArmyBalance(updatedParticipants),
      nextTieArmy: getNextTieArmy(assignedArmy),
      updatedAt: new Date().toISOString(),
    });

    return participant;
  });
}

async function withAssignmentLock<T>(battleId: string, operation: () => Promise<T>): Promise<T> {
  const lockKey = getAssignmentLockKey(battleId);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const token = `${context.userId ?? 'system'}:${Date.now()}:${attempt}`;
    const acquired = await redis.set(lockKey, token, {
      nx: true,
      expiration: new Date(Date.now() + ASSIGNMENT_LOCK_SECONDS * 1_000),
    });
    if (acquired !== 'OK') {
      await sleep(40 * (attempt + 1));
      continue;
    }

    try {
      return await operation();
    } finally {
      if (await redis.get(lockKey) === token) await redis.del(lockKey);
    }
  }

  throw new Error('Daily event assignment is busy; retry joining the event');
}

function extractOpenAIText(response: OpenAIResponse) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  for (const output of response.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content.text === 'string' && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return undefined;
}

async function requestOpenAIText(input: string, maxOutputTokens: number) {
  const apiKey = await settings.get<string>(OPENAI_API_KEY_SETTING);
  if (!apiKey) throw new Error('OpenAI API key is not configured');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_REPORT_MODEL,
      input,
      max_output_tokens: maxOutputTokens,
    }),
  });
  const body: OpenAIResponse = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message ?? 'OpenAI request failed');
  }

  const report = extractOpenAIText(body);
  if (!report) throw new Error('OpenAI response did not include text');

  return report;
}

async function loadCampaignAggregateInput(
  state: StoredCampaignState,
): Promise<CampaignAggregateInput> {
  const [rawEvents, rawCaptures, players, currentBattle] = await Promise.all([
    redis.hGetAll(DAILY_EVENTS_KEY),
    redis.hGetAll(TERRITORY_CAPTURES_KEY),
    getPlayers(),
    getCurrentBattle(),
  ]);
  const captures = Object.values(rawCaptures)
    .map((capture) => parseTerritoryCapture(capture))
    .filter((capture): capture is TerritoryCaptureRecord => capture !== undefined);
  const battleIds = [...new Set(
    [
      ...Object.entries(rawEvents)
        .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
        .map(([, battleId]) => battleId),
      ...captures.map((capture) => capture.battleId),
      state.completionBattleId,
      ...(currentBattle ? [currentBattle.id] : []),
    ],
  )];
  const battles: CampaignAggregateInput['battles'][number][] = [];
  const participants: CampaignAggregateInput['participants'][number][] = [];
  const orders: CampaignAggregateInput['orders'][number][] = [];

  for (const battleId of battleIds) {
    const battle = await getBattleById(battleId);
    if (battle?.status !== 'resolved' || !battle.result) continue;

    const battleSnapshot = {
      id: battle.id,
      battleDate: battle.battleDate,
      result: battle.result,
    };
    battles.push(battle.postPermalink
      ? { ...battleSnapshot, postPermalink: battle.postPermalink }
      : battleSnapshot);

    const [eventParticipants, battleOrders] = await Promise.all([
      getEventParticipants(battle.id),
      getBattleOrders(battle.id),
    ]);
    participants.push(...eventParticipants.map((participant) => ({
      battleId: battle.id,
      userId: participant.userId,
    })));
    orders.push(...Array.from(battleOrders.entries()).map(([userId, order]) => ({
      battleId: battle.id,
      userId,
      army: order.army,
      doctrineId: order.doctrineId,
    })));
  }

  const playerSnapshots: CampaignAggregateInput['players'][number][] = players.map((player) => {
    const snapshot = {
      userId: player.redditUserId,
      rewards: player.rewards,
      progression: {
        totalParticipatedEvents: player.progression.totalParticipatedEvents,
        totalVictories: player.progression.totalVictories,
      },
    };

    return player.redditUsername
      ? { ...snapshot, redditUsername: player.redditUsername }
      : snapshot;
  });

  return {
    winner: state.winner,
    completedAt: state.completedAt,
    battles,
    captures,
    participants,
    orders,
    players: playerSnapshots,
  };
}

function getCampaignReportError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();

  return 'Campaign final report failed';
}

function clearCampaignReportError(report: StoredCampaignState['finalReport']) {
  const cleared = { ...report };
  delete cleared.lastError;
  return cleared;
}

async function findExistingPostByTitle(title: string, authorName?: string) {
  const posts = await reddit.getNewPosts({
    subredditName: getSubredditName(),
    limit: CAMPAIGN_REPORT_MAX_POSTS_TO_RECONCILE,
    pageSize: 100,
  }).all();

  return posts.find((post) => (
    post.title === title && (!authorName || post.authorName === authorName)
  ));
}

async function findExistingCampaignReportComment(input: {
  postId: string;
  marker: string;
  commentId?: string;
  exactBody?: string;
  authorName?: string;
}) {
  const comments = input.commentId
    ? await reddit.getComments({
      postId: getRedditPostId(input.postId),
      commentId: getRedditCommentId(input.commentId),
      depth: MAX_COMMENT_TREE_DEPTH,
      limit: CAMPAIGN_REPORT_COMMENT_SCAN_LIMIT,
      pageSize: 100,
      sort: 'new',
    }).all()
    : await reddit.getComments({
      postId: getRedditPostId(input.postId),
      depth: MAX_COMMENT_TREE_DEPTH,
      limit: CAMPAIGN_REPORT_COMMENT_SCAN_LIMIT,
      pageSize: 100,
      sort: 'new',
    }).all();
  const flattened = await collectDivisionBranchComments(
    comments,
    0,
    [],
    CAMPAIGN_REPORT_COMMENT_SCAN_LIMIT,
  );

  return flattened.find((comment) => {
    const bodyMatches = input.exactBody
      ? comment.body === input.exactBody
      : comment.body === input.marker || comment.body.startsWith(`${input.marker}\n`);
    const authorMatches = !input.authorName || comment.authorName === input.authorName;

    return bodyMatches && authorMatches;
  });
}

async function publishCampaignFinalReport(state: StoredCampaignState) {
  if (!state.finalReport.title || !state.finalReport.mainBody) {
    throw new Error('Generated campaign report content is missing');
  }
  const reportTitle = state.finalReport.title;
  const reportBody = state.finalReport.mainBody;
  const finalBattleForAuthor = await getBattleById(state.completionBattleId);
  const finalWarRoomForAuthor = finalBattleForAuthor
    ? await getWarRoom(finalBattleForAuthor.postId)
    : undefined;
  const appCommentId = finalBattleForAuthor?.resultCommentId ?? finalWarRoomForAuthor?.threadIds.ai;
  const appAuthorName = appCommentId
    ? (await reddit.getCommentById(getRedditCommentId(appCommentId))).authorName
    : undefined;

  let current = state;
  if (!current.finalReport.postId || !current.finalReport.permalink) {
    const existing = await findExistingPostByTitle(reportTitle, appAuthorName);
    const post = existing ?? await withRedditRateLimitRetry(() => reddit.submitPost({
      subredditName: getSubredditName(),
      title: reportTitle,
      text: reportBody,
      runAs: 'APP',
    }));
    current = {
      ...current,
      finalReport: {
        ...clearCampaignReportError(current.finalReport),
        postId: post.id,
        permalink: toRedditUrl(post.permalink),
        updatedAt: new Date().toISOString(),
      },
    };
    await saveCampaignState(current);
  }

  const reportPostId = current.finalReport.postId;
  if (!reportPostId) throw new Error('Campaign report post id is missing');
  const reportPost = await reddit.getPostById(getRedditPostId(reportPostId));
  const parts = [...current.finalReport.parts];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!part || part.commentId) continue;

    const existing = await findExistingCampaignReportComment({
      postId: reportPostId,
      marker: part.marker,
      exactBody: part.text,
      authorName: reportPost.authorName,
    });
    if (existing) {
      parts[index] = { ...part, commentId: existing.id };
    } else {
      const comment = await withRedditRateLimitRetry(() => reddit.submitComment({
        id: getRedditCommentTargetId(reportPostId),
        text: part.text,
        runAs: 'APP',
      }));
      parts[index] = { ...part, commentId: comment.id, permalink: comment.permalink };
    }
    current = {
      ...current,
      finalReport: {
        ...clearCampaignReportError(current.finalReport),
        parts,
        updatedAt: new Date().toISOString(),
      },
    };
    await saveCampaignState(current);
  }

  if (!current.finalReport.backlinkCommentId && current.finalReport.permalink) {
    const finalBattle = await getBattleById(current.completionBattleId);
    if (!finalBattle) throw new Error('Final daily battle is unavailable for report backlink');

    const warRoom = await getWarRoom(finalBattle.postId);
    const targetCommentId = finalBattle.resultCommentId ?? warRoom?.threadIds.ai;
    if (!targetCommentId) throw new Error('Final daily battle has no report thread for backlink');

    const marker = `CAMPAIGN FINAL REPORT // ${current.completionBattleId}`;
    const backlinkText = `${marker}\n\n[Open the complete campaign report](${current.finalReport.permalink})`;
    const targetComment = await reddit.getCommentById(getRedditCommentId(targetCommentId));
    const existing = await findExistingCampaignReportComment({
      postId: finalBattle.postId,
      commentId: targetCommentId,
      marker,
      exactBody: backlinkText,
      authorName: targetComment.authorName,
    });
    const backlink = existing
      ? { backlinkCommentId: existing.id }
      : await withRedditRateLimitRetry(async () => {
        const comment = await reddit.submitComment({
          id: getRedditCommentTargetId(targetCommentId),
          text: backlinkText,
          runAs: 'APP',
        });
        return {
          backlinkCommentId: comment.id,
          backlinkPermalink: comment.permalink,
        };
      });
    current = {
      ...current,
      finalReport: {
        ...clearCampaignReportError(current.finalReport),
        ...backlink,
        updatedAt: new Date().toISOString(),
      },
    };
    await saveCampaignState(current);
  }

  if (!current.finalReport.backlinkCommentId) {
    throw new Error('Campaign report backlink is not published');
  }

  const publishedAt = new Date().toISOString();
  current = {
    ...current,
    finalReport: {
      ...clearCampaignReportError(current.finalReport),
      status: 'published',
      publishedAt,
      updatedAt: publishedAt,
    },
  };
  await saveCampaignState(current);

  return current;
}

async function ensureCampaignFinalReport(initialState: StoredCampaignState) {
  if (initialState.finalReport.status === 'published') return initialState;

  const lockKey = getCampaignReportLockKey(initialState.completionBattleId);
  const token = `${initialState.completionBattleId}:${Date.now()}:${Math.random()}`;
  const acquired = await redis.set(lockKey, token, {
    nx: true,
    expiration: new Date(Date.now() + CAMPAIGN_REPORT_LOCK_SECONDS * 1_000),
  });
  if (acquired !== 'OK') return await getCampaignState() ?? initialState;

  let state = await getCampaignState() ?? initialState;
  try {
    if (state.finalReport.status === 'pending') {
      const aggregate = buildCampaignAggregate(await loadCampaignAggregateInput(state));
      const narrative = await requestOpenAIText(
        createCampaignNarrativePrompt(aggregate),
        CAMPAIGN_REPORT_MAX_OUTPUT_TOKENS,
      );
      const publication = createCampaignReportPublication(aggregate, narrative, {
        main: 29_800,
        appendix: 7_800,
      });
      const generatedAt = new Date().toISOString();
      const appendixCount = publication.appendixBodies.length;
      state = {
        ...state,
        finalReport: {
          status: 'generated',
          title: publication.title,
          mainBody: `CAMPAIGN FINAL // ${state.completionBattleId}\n\n${publication.mainBody}`,
          parts: publication.appendixBodies.map((body, index) => {
            const marker = `CAMPAIGN FINAL // ${state.completionBattleId} // APPENDIX ${index + 1}/${appendixCount}`;
            return {
              index,
              marker,
              text: `${marker}\n\n${body}`,
            };
          }),
          generatedAt,
          updatedAt: generatedAt,
        },
      };
      await saveCampaignState(state);
    }

    if (state.finalReport.status === 'generated') {
      state = await publishCampaignFinalReport(state);
    }

    return state;
  } catch (error) {
    const failedAt = new Date().toISOString();
    state = {
      ...state,
      finalReport: {
        ...state.finalReport,
        lastError: getCampaignReportError(error),
        updatedAt: failedAt,
      },
    };
    await saveCampaignState(state);
    console.error(`Campaign final report error: ${getCampaignReportError(error)}`);

    return state;
  } finally {
    if (await redis.get(lockKey) === token) await redis.del(lockKey);
  }
}

async function generateAiStatusReport(input: {
  battleDate: string;
  serverNow: string;
  secondsUntilResolve: number;
  playerCount: number;
}) {
  return await requestOpenAIText(
    [
      'Write a short in-universe AI branch status report for the Humans vs AI Reddit game.',
      `Today battle date: ${input.battleDate}.`,
      `Server time: ${input.serverNow}.`,
      `Seconds until today's battle result: ${input.secondsUntilResolve}.`,
      `Registered players in Redis: ${input.playerCount}.`,
      'Keep it under 45 words. No markdown table. Start with "AI STATUS //".',
    ].join('\n'),
    90,
  );
}

function compactPromptText(value: string, maxChars: number) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxChars) return compact;

  return `${compact.slice(0, maxChars - 3)}...`;
}

function createDoctrinePromptText() {
  return DOCTRINE_LIST.map((doctrine) => {
    const beats = doctrine.beats.map((entry) => entry.target).join(', ');

    return [
      `${doctrine.id} (${doctrine.name})`,
      `Theme: ${doctrine.theme}.`,
      `Role: ${doctrine.combatRole}`,
      `Beats: ${beats}.`,
      `Loses to: ${doctrine.losesTo.join(', ')}.`,
    ].join(' ');
  }).join('\n');
}

function createDivisionCommentsPromptText(comments: readonly DivisionBranchComment[]) {
  if (comments.length === 0) return 'No replies found in this division branch yet.';

  return comments.slice(0, MAX_PROMPT_COMMENTS).map((comment, index) => {
    const body = compactPromptText(comment.body, MAX_COMMENT_BODY_CHARS);
    const createdAt = comment.createdAt.toISOString();
    const threadPosition = comment.depth === 0 ? 'top-level' : `reply depth ${comment.depth} to ${comment.parentId}`;

    return `${index + 1}. ${threadPosition} | u/${comment.authorName} | score ${comment.score} | ${createdAt}: ${body}`;
  }).join('\n');
}

async function collectDivisionBranchComments(
  comments: readonly DivisionCommentTreeNode[],
  depth = 0,
  collected: DivisionBranchComment[] = [],
  maxComments = MAX_BRANCH_COMMENTS,
): Promise<DivisionBranchComment[]> {
  for (const comment of comments) {
    if (collected.length >= maxComments) break;

    collected.push({
      id: comment.id,
      parentId: comment.parentId,
      authorName: comment.authorName,
      body: comment.body,
      createdAt: comment.createdAt,
      score: comment.score,
      depth,
      permalink: comment.permalink,
    });

    if (depth + 1 >= MAX_COMMENT_TREE_DEPTH || collected.length >= maxComments) continue;

    const replies = await comment.replies.all().catch(() => comment.replies.children);
    await collectDivisionBranchComments(replies, depth + 1, collected, maxComments);
  }

  return collected;
}

async function generateDivisionCommentAnalysis(input: {
  target: DivisionTarget;
  battleDate: string;
  comments: readonly DivisionBranchComment[];
}) {
  const label = DIVISION_LABELS[input.target];

  return await requestOpenAIText(
    [
      `Analyze the ${label} division Reddit branch for the Humans vs AI daily battle.`,
      'Infer the division intent from the comments and choose the single best doctrine that helps this division win.',
      'Choose exactly one doctrine id from this list. Do not invent doctrine ids.',
      '',
      createDoctrinePromptText(),
      '',
      `Battle date: ${input.battleDate}.`,
      `Branch comments and nested replies, newest first within loaded Reddit pages (${input.comments.length} loaded):`,
      createDivisionCommentsPromptText(input.comments),
      '',
      'Use nested replies as meaningful context, especially when they correct, reject, or refine a parent comment.',
      `Output under 85 words. Start with "AI COMMENT ANALYSIS // ${label.toUpperCase()}".`,
      'Include exactly one line: "Recommended doctrine: <ID>".',
    ].join('\n'),
    170,
  );
}

function getRateLimitDelayMs(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const match = /RatelimitError\(TimeString="(\d+)\s+(second|seconds|minute|minutes)"\)/.exec(message);
  if (!match) return undefined;

  const [, rawAmount, unit] = match;
  if (!rawAmount || !unit) return undefined;

  const amount = Number(rawAmount);
  const baseMs = unit.startsWith('minute') ? amount * 60_000 : amount * 1_000;

  return baseMs + 750;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRedditRateLimitRetry<T>(operation: () => Promise<T>) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const delayMs = getRateLimitDelayMs(error);
      if (!delayMs || attempt === maxAttempts) throw error;

      await sleep(delayMs);
    }
  }

  throw new Error('Reddit API retry failed');
}

async function createDailyWarRoom(postId: string, postPermalink: string) {
  const storedWarRoom = await getWarRoom(postId);
  if (storedWarRoom) return storedWarRoom;

  const targetPostId = getRedditCommentTargetId(postId);
  const comments = await reddit.getComments({
    postId: getRedditPostId(postId),
    depth: 1,
    limit: 100,
    pageSize: 100,
    sort: 'new',
  }).all();
  const getOrCreateThread = async (target: DevThreadTarget) => {
    const existing = comments.find((comment) => comment.body === THREAD_BODIES[target]);
    return existing ?? await withRedditRateLimitRetry(() => reddit.submitComment({
      id: targetPostId,
      text: THREAD_BODIES[target],
      runAs: 'APP',
    }));
  };
  const aiThread = await getOrCreateThread('ai');
  const greenThread = await getOrCreateThread('green');
  const blueThread = await getOrCreateThread('blue');
  await withRedditRateLimitRetry(() => aiThread.distinguish(true));

  const warRoom: DevWarRoomState = {
    postId,
    postPermalink,
    threadIds: {
      ai: aiThread.id,
      green: greenThread.id,
      blue: blueThread.id,
    },
    threadPermalinks: {
      ai: aiThread.permalink,
      green: greenThread.permalink,
      blue: blueThread.permalink,
    },
    createdAt: new Date().toISOString(),
  };

  await redis.set(getWarRoomKey(postId), JSON.stringify(warRoom));

  return warRoom;
}

async function createBootstrapBattle(battle: DailyBattle, now: Date): Promise<BootstrapBattle> {
  const resolvesAtMs = new Date(battle.resolvesAt).getTime();
  const secondsUntilResolve = Math.max(0, Math.ceil((resolvesAtMs - now.getTime()) / 1_000));
  const activeTerritory = normalizeTerritoryView(battle.result?.activeTerritoryAfter ??
    battle.activeTerritoryBefore ??
    await getStoredTerritory(battle.activeTerritoryId));
  const armyBalance = calculateArmyBalance(await getEventParticipants(battle.id));
  const warRoom = await getWarRoom(battle.postId);
  const bootstrapBattle: BootstrapBattle = {
    id: battle.id,
    battleDate: battle.battleDate,
    status: battle.status,
    postId: battle.postId,
    postPermalink: battle.postPermalink,
    resolvesAt: battle.resolvesAt,
    secondsUntilResolve,
    activeTerritory,
    armyBalance,
    ...(warRoom ? { warRoomPermalinks: warRoom.threadPermalinks } : {}),
  };

  if (battle.result) bootstrapBattle.result = battle.result;
  if (battle.resultSummary) bootstrapBattle.resultSummary = battle.resultSummary;

  return bootstrapBattle;
}

export function isNewYorkWallTime(now: Date, hour: number, minute: number) {
  const parts = getNewYorkParts(now);

  return parts.hour === hour && parts.minute === minute;
}

export async function getBootstrapResponse(): Promise<BootstrapResponse> {
  const now = new Date();
  const userId = context.userId;
  const [storedPlayer, registeredPlayerCount] = await Promise.all([
    getPlayer(userId),
    redis.hLen(PLAYERS_KEY),
  ]);
  let player = storedPlayer;
  if (player && !player.redditUsername) {
    const redditUsername = await reddit.getCurrentUsername().catch(() => undefined);
    if (redditUsername) {
      player = { ...player, redditUsername, updatedAt: now.toISOString() };
      await savePlayer(player);
    }
  }
  const battle = await getCurrentResolvableBattle();
  const order = battle ? await getPlayerOrder(battle.id, userId) : undefined;
  const participant = battle
    ? await getOrMigrateEventParticipant(battle, userId, player, order)
    : undefined;
  const spyOffer = battle ? await getOrCreateSpyOffer(battle, participant) : undefined;
  const dailyReward = battle ? await getProgressionLedgerEntry(battle.id, userId) : undefined;
  const spySuspicion = battle ? await getSpySuspicion(battle.id, userId) : undefined;
  const petition = player ? await getEpicWarPetitionStatus() : undefined;
  if (player) await retryPendingPlayerFlair(player);
  const response: BootstrapResponse = {
    type: 'bootstrap',
    serverNow: now.toISOString(),
    view: 'promo',
    registeredPlayerCount,
    user: createPlayerBattleState({ player, participant, order, spyOffer, dailyReward, spySuspicion, petition }),
  };

  if (!battle) return response;

  const isResolved = battle.status === 'resolved' || now.getTime() >= new Date(battle.resolvesAt).getTime();
  let displayBattle: DailyBattle = battle;
  if (isResolved && !battle.resultSummary) {
    displayBattle = {
      ...battle,
      status: 'resolved',
      resultSummary: createDeterministicResult(battle).resultSummary,
    };
  }

  response.battle = await createBootstrapBattle(displayBattle, now);

  if (isResolved) {
    response.view = 'summary';
    return response;
  }

  response.view = player ? 'countdown' : 'promo';
  return response;
}

export async function getEpicWarPetitionStatus(): Promise<PetitionStatusResponse> {
  const userId = context.userId;
  if (!userId) throw new Error('Reddit user id is required');
  const [signatureCount, signedAt] = await Promise.all([
    redis.hLen(EPIC_WAR_PETITION_KEY),
    redis.hGet(EPIC_WAR_PETITION_KEY, userId),
  ]);
  return {
    type: 'epic-war-petition',
    signed: Boolean(signedAt),
    signatureCount,
    ...(signedAt ? { signedAt } : {}),
  };
}

export async function signEpicWarPetition(): Promise<PetitionStatusResponse> {
  const userId = context.userId;
  if (!userId) throw new Error('Reddit user id is required');
  const player = await getPlayer(userId);
  if (!player) throw new Error('Register in Humans vs AI before signing the petition');
  const existing = await redis.hGet(EPIC_WAR_PETITION_KEY, userId);
  if (!existing) {
    await redis.hSet(EPIC_WAR_PETITION_KEY, { [userId]: new Date().toISOString() });
  }
  return await getEpicWarPetitionStatus();
}

export async function getGlobalMapResponse(): Promise<GlobalMapResponse> {
  const [territories, rawCaptures, battle, campaignState] = await Promise.all([
    getStoredTerritorySnapshot(),
    redis.hGetAll(TERRITORY_CAPTURES_KEY),
    getCurrentBattle(),
    getCampaignState(),
  ]);
  const historyByTerritoryId = new Map<string, TerritoryCaptureRecord[]>();

  for (const rawCapture of Object.values(rawCaptures)) {
    const capture = parseTerritoryCapture(rawCapture);
    if (!capture) continue;

    const history = historyByTerritoryId.get(capture.territoryId) ?? [];
    history.push(capture);
    historyByTerritoryId.set(capture.territoryId, history);
  }

  for (const history of historyByTerritoryId.values()) {
    history.sort((left, right) => (
      right.battleDate.localeCompare(left.battleDate) ||
      right.capturedAt.localeCompare(left.capturedAt)
    ));
  }

  const response: GlobalMapResponse = {
    type: 'global-map',
    columns: GLOBAL_MAP_COLUMNS,
    rows: GLOBAL_MAP_ROWS,
    generatedAt: new Date().toISOString(),
    campaign: toCampaignStateView(campaignState),
    territories: territories
      .map((territory) => ({
        ...territory,
        history: historyByTerritoryId.get(territory.id) ?? [],
      }))
      .sort((left, right) => left.row - right.row || left.column - right.column),
  };
  const activeTerritory = battle?.status === 'active'
    ? battle.activeTerritoryBefore ??
      (battle.activeTerritoryId ? getTerritoryById(battle.activeTerritoryId) : undefined)
    : battle?.result?.activeTerritoryAfter ?? battle?.activeTerritoryBefore;
  if (activeTerritory) {
    response.activeTerritoryId = getCanonicalTerritoryId(activeTerritory.id);
  }
  const transition = battle?.result?.campaignTransition;
  if (transition?.type === 'next-target') {
    response.nextTargetId = getCanonicalTerritoryId(transition.target.territory.id);
  }

  return response;
}

export async function getDailyLeaderboard(
  battleId: string,
  cursor?: string,
): Promise<DailyLeaderboardResponse> {
  const battle = await getBattleById(battleId);
  if (!battle || battle.status !== 'resolved') throw new Error('Resolved battle not found');

  const [participants, players, rawLedger] = await Promise.all([
    getEventParticipants(battleId),
    getPlayers(),
    redis.hGetAll(getProgressionLedgerKey(battleId)),
  ]);
  const playersById = new Map(players.map((player) => [player.redditUserId, player]));
  const currentUserId = context.userId;
  const ranked = participants
    .map((participant) => {
      const player = playersById.get(participant.userId);
      const ledger = parseProgressionLedgerEntry(rawLedger[participant.userId]);
      if (!player?.redditUsername || !ledger) return undefined;
      return {
        username: player.redditUsername,
        army: participant.assignedArmy,
        rank: ledger.rankAfter,
        rankLevel: getPlayerPowerForXp(ledger.xpAfter).rankLevel,
        xpAwarded: ledger.xpAwarded,
        newMedals: ledger.newMedals ?? [],
        isCurrentUser: participant.userId === currentUserId,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .sort((left, right) => (
      right.xpAwarded - left.xpAwarded || left.username.localeCompare(right.username)
    ))
    .map((entry, index) => ({ ...entry, position: index + 1 }));
  const offset = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
  const entries = ranked.slice(offset, offset + 50);
  const nextOffset = offset + entries.length;
  const currentUserEntry = ranked.find((entry) => entry.isCurrentUser);

  return {
    type: 'daily-leaderboard',
    battleId,
    entries,
    ...(currentUserEntry ? { currentUserEntry } : {}),
    ...(nextOffset < ranked.length ? { nextCursor: String(nextOffset) } : {}),
  };
}

export async function getPublicBattleResult(battleId: string): Promise<PublicBattleResultResponse> {
  const battle = await getBattleById(battleId);
  if (!battle || battle.status !== 'resolved' || !battle.result) {
    throw new Error('Resolved battle not found');
  }
  return {
    type: 'public-battle-result',
    battleId: battle.id,
    battleDate: battle.battleDate,
    postPermalink: battle.postPermalink,
    result: battle.result,
  };
}

export async function getPublicPlayerProfile(
  requestedUsername?: string,
): Promise<PublicPlayerProfileResponse> {
  const players = await getPlayers();
  const currentUserId = context.userId;
  const normalizedUsername = requestedUsername?.replace(/^u\//i, '').trim().toLowerCase();
  const player = normalizedUsername
    ? players.find((candidate) => candidate.redditUsername?.toLowerCase() === normalizedUsername)
    : players.find((candidate) => candidate.redditUserId === currentUserId);
  if (!player?.redditUsername) throw new Error('Player profile not found');

  const rawEvents = await redis.hGetAll(DAILY_EVENTS_KEY);
  const battleIds = Object.entries(rawEvents)
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([, battleId]) => battleId);
  const recentBattles: PublicPlayerProfileResponse['recentBattles'][number][] = [];
  for (const battleId of battleIds) {
    if (recentBattles.length >= 10) break;
    const [participant, battle] = await Promise.all([
      getEventParticipant(battleId, player.redditUserId),
      getBattleById(battleId),
    ]);
    if (!participant || battle?.status !== 'resolved' || !battle.result) continue;
    recentBattles.push({
      battleId,
      battleDate: battle.battleDate,
      army: participant.assignedArmy,
      winner: battle.result.winner,
      territoryName: battle.result.activeTerritoryAfter.name,
      postPermalink: battle.postPermalink,
    });
  }
  const power = getPlayerPowerForXp(player.rewards.xp);

  return {
    type: 'public-profile',
    username: player.redditUsername,
    shareSlug: player.redditUsername,
    xp: player.rewards.xp,
    rank: player.rewards.rank,
    rankLevel: power.rankLevel,
    rankProgress: power.rankProgress,
    streak: player.rewards.streak,
    medals: player.rewards.medals,
    totalParticipatedEvents: player.progression.totalParticipatedEvents,
    totalVictories: player.progression.totalVictories,
    recentBattles,
  };
}

export async function getGlobalLeaderboard(cursor?: string): Promise<GlobalLeaderboardResponse> {
  const currentUserId = context.userId;
  const ranked = (await getPlayers())
    .filter((player) => Boolean(player.redditUsername))
    .sort((left, right) => (
      right.rewards.xp - left.rewards.xp ||
      right.progression.totalVictories - left.progression.totalVictories ||
      right.progression.totalParticipatedEvents - left.progression.totalParticipatedEvents ||
      (left.redditUsername ?? '').localeCompare(right.redditUsername ?? '')
    ))
    .map((player, index) => ({
      position: index + 1,
      username: player.redditUsername ?? 'unknown',
      xp: player.rewards.xp,
      rank: player.rewards.rank,
      rankLevel: getPlayerPowerForXp(player.rewards.xp).rankLevel,
      victories: player.progression.totalVictories,
      participatedEvents: player.progression.totalParticipatedEvents,
      medals: player.rewards.medals.length,
      isCurrentUser: player.redditUserId === currentUserId,
    }));
  const offset = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
  const entries = ranked.slice(offset, offset + 50);
  const nextOffset = offset + entries.length;
  const currentUserEntry = ranked.find((entry) => entry.isCurrentUser);
  return {
    type: 'global-leaderboard',
    entries,
    ...(currentUserEntry ? { currentUserEntry } : {}),
    ...(nextOffset < ranked.length ? { nextCursor: String(nextOffset) } : {}),
  };
}

export async function joinCurrentPlayer(): Promise<PlayerJoinResponse> {
  const { userId } = context;

  if (!userId) throw new Error('Reddit user id is required');

  const battle = await getCurrentResolvableBattle();
  if (!battle) throw new Error('No current daily event found');
  if (
    battle.status === 'resolved' ||
    Date.now() >= new Date(battle.resolvesAt).getTime()
  ) {
    throw new Error('Daily event participation is closed');
  }

  const now = new Date().toISOString();
  const redditUsername = await reddit.getCurrentUsername();
  const existing = await getPlayer(userId);
  const player: StoredPlayer = {
    redditUserId: userId,
    redditUsername: redditUsername ?? existing?.redditUsername,
    affiliation: 'gray',
    joinedAt: now,
    updatedAt: now,
    rewards: normalizeRewardSummary(existing?.rewards),
    progression: existing?.progression ?? createDefaultProgressionState(),
  };

  if (existing) {
    player.joinedAt = existing.joinedAt;
  }

  await savePlayer(player);
  const participant = await assignPlayerToDailyEvent(battle, player);
  const spyOffer = await getOrCreateSpyOffer(battle, participant);
  await syncPlayerFlairSafely(player);
  const order = await getPlayerOrder(battle.id, userId);
  const user = createPlayerBattleState({ player, participant, order, spyOffer });

  return {
    type: 'event-participation',
    user: {
      ...user,
      exists: true,
      affiliation: 'gray',
      participating: true,
      participant: toEventParticipantView(participant),
      army: participant.assignedArmy,
    },
  };
}

async function loadEligibleComments(
  battle: DailyBattle,
  army: ArmyColor,
  currentUsername: string | undefined,
) {
  const warRoom = await getWarRoom(battle.postId);
  if (!warRoom) throw new Error('War room is not initialized for the current battle');

  const branchComments = await reddit.getComments({
    postId: getRedditPostId(battle.postId),
    commentId: getRedditCommentId(warRoom.threadIds[army]),
    depth: MAX_COMMENT_TREE_DEPTH,
    limit: MAX_ELIGIBLE_COMMENTS,
    pageSize: 100,
    sort: 'new',
  }).all();
  const comments = await collectDivisionBranchComments(
    branchComments,
    0,
    [],
    MAX_ELIGIBLE_COMMENTS,
  );
  const cutoff = new Date(battle.resolvesAt).getTime();
  const candidates = comments.filter((comment) => (
    comment.authorName !== currentUsername && comment.createdAt.getTime() < cutoff
  ));

  const flairMatches = await Promise.all(candidates.map(async (comment) => {
    const user = await reddit.getUserByUsername(comment.authorName).catch(() => undefined);
    const flair = await user?.getUserFlairBySubreddit(getSubredditName()).catch(() => undefined);
    return flair?.flairText?.includes(army === 'green' ? 'Green Army' : 'Blue Army') === true;
  }));

  return candidates
    .filter((_, index) => flairMatches[index])
    .map((comment) => ({
      id: comment.id,
      authorUsername: comment.authorName,
      excerpt: compactPromptText(comment.body, 180),
      createdAt: comment.createdAt.toISOString(),
      ...(comment.permalink ? { permalink: toRedditUrl(comment.permalink) } : {}),
    }));
}

export async function getEligibleComments(cursor?: string): Promise<EligibleCommentsResponse> {
  const { userId } = context;
  if (!userId) throw new Error('Reddit user id is required');

  const battle = await getCurrentResolvableBattle();
  if (!battle || battle.status === 'resolved') throw new Error('No active daily battle found');
  const participant = await getEventParticipant(battle.id, userId);
  if (!participant) throw new Error('Join today\'s event before choosing a comment');
  const spyOffer = await getOrCreateSpyOffer(battle, participant);
  const army = getParticipantFlairArmy(participant, spyOffer);
  const currentUsername = await reddit.getCurrentUsername();
  const warRoom = await getWarRoom(battle.postId);
  if (!warRoom) throw new Error('War room is not initialized for the current battle');
  const comments = await loadEligibleComments(battle, army, currentUsername ?? undefined);
  const offset = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
  const page = comments.slice(offset, offset + ELIGIBLE_COMMENT_PAGE_SIZE);
  const nextOffset = offset + page.length;

  return {
    type: 'eligible-comments',
    battleId: battle.id,
    army,
    warRoomPermalink: toRedditUrl(warRoom.threadPermalinks[army]),
    comments: page,
    ...(nextOffset < comments.length ? { nextCursor: String(nextOffset) } : {}),
  };
}

export async function submitSpySuspicion(commentId: string): Promise<SpySuspicionResponse> {
  const { userId } = context;
  if (!userId) throw new Error('Reddit user id is required');
  const battle = await getCurrentResolvableBattle();
  if (!battle || battle.status === 'resolved' || Date.now() >= new Date(battle.resolvesAt).getTime()) {
    throw new Error('Counterintelligence is closed');
  }
  const existing = await getSpySuspicion(battle.id, userId);
  if (existing) return { type: 'spy-suspicion', suspicion: existing };
  const participant = await getEventParticipant(battle.id, userId);
  if (!participant) throw new Error('Join today\'s event before using counterintelligence');
  const spyOffer = await getOrCreateSpyOffer(battle, participant);
  const army = getParticipantFlairArmy(participant, spyOffer);
  const currentUsername = await reddit.getCurrentUsername();
  const candidates = await loadEligibleComments(battle, army, currentUsername ?? undefined);
  const selected = candidates.find((comment) => comment.id === commentId);
  if (!selected) throw new Error('Choose an eligible teammate comment');
  const lock = await redis.set(getSpySuspicionLockKey(battle.id, userId), '1', {
    nx: true,
    expiration: new Date(new Date(battle.resolvesAt).getTime() + 60_000),
  });
  if (lock !== 'OK') {
    const locked = await getSpySuspicion(battle.id, userId);
    if (locked) return { type: 'spy-suspicion', suspicion: locked };
    throw new Error('Counterintelligence choice is already being submitted');
  }

  const suspicion: SpySuspicionView = {
    commentId: selected.id,
    suspectedUsername: selected.authorUsername,
    submittedAt: new Date().toISOString(),
  };
  await redis.hSet(getSpySuspicionsKey(battle.id), {
    [userId]: JSON.stringify(suspicion),
  });
  return { type: 'spy-suspicion', suspicion };
}

export async function submitDoctrineOrder(
  doctrineId: DoctrineId,
  sourceCommentId: string,
): Promise<OrderResponse> {
  const { userId } = context;
  if (!userId) throw new Error('Reddit user id is required');

  const battle = await getCurrentResolvableBattle();
  if (!battle) throw new Error('No current battle found');
  if (
    battle.status === 'resolved' ||
    Date.now() >= new Date(battle.resolvesAt).getTime()
  ) {
    throw new Error('Battle is already resolved');
  }

  const player = await getPlayer(userId);
  const participant = await getEventParticipant(battle.id, userId);
  if (!player || !participant) {
    throw new Error('Join today\'s event before submitting an order');
  }

  const existingOrder = await getPlayerOrder(battle.id, userId);
  const spyOffer = await getOrCreateSpyOffer(battle, participant);
  if (existingOrder) {
    await syncPlayerFlairSafely(player);

    return {
      type: 'order',
      order: existingOrder,
      player: createPlayerBattleState({
        player,
        participant,
        order: existingOrder,
        spyOffer,
      }),
    };
  }

  const currentUsername = await reddit.getCurrentUsername();
  const publicArmy = getParticipantFlairArmy(participant, spyOffer);
  const eligibleComments = await loadEligibleComments(battle, publicArmy, currentUsername ?? undefined);
  const sourceComment = eligibleComments.find((comment) => comment.id === sourceCommentId);
  if (!sourceComment) {
    throw new Error('Choose an eligible teammate comment before submitting an order');
  }

  const order: DoctrineOrder = {
    battleId: battle.id,
    army: participant.assignedArmy,
    doctrineId,
    sourceCommentId: sourceComment.id,
    ...(sourceComment.permalink ? { sourceCommentPermalink: sourceComment.permalink } : {}),
    submittedAt: new Date().toISOString(),
  };

  await redis.hSet(getOrdersKey(battle.id), {
    [userId]: JSON.stringify(order),
  });
  await syncPlayerFlairSafely(player);

  return {
    type: 'order',
    order,
    player: createPlayerBattleState({
      player,
      participant,
      order,
      spyOffer,
    }),
  };
}

export async function syncCurrentPlayerFlair() {
  const { userId } = context;
  if (!userId) throw new Error('Reddit user id is required');

  const player = await getPlayer(userId);
  if (!player) return false;

  const redditUsername = await reddit.getCurrentUsername();
  const normalizedPlayer: StoredPlayer = {
    ...player,
    redditUsername: redditUsername ?? player.redditUsername,
    rewards: normalizeRewardSummary(player.rewards),
    updatedAt: new Date().toISOString(),
  };

  await savePlayer(normalizedPlayer);
  return await syncPlayerFlairSafely(normalizedPlayer);
}

export async function postAiStatusReport(): Promise<AiReportResponse> {
  const now = new Date();
  const battle = await getCurrentResolvableBattle();
  if (!battle) throw new Error('No current battle found');

  const warRoom = await getWarRoom(battle.postId);
  if (!warRoom) throw new Error('AI branch is not initialized for the current battle');

  const playerCount = await redis.hLen(PLAYERS_KEY);
  const secondsUntilResolve = Math.max(
    0,
    Math.ceil((new Date(battle.resolvesAt).getTime() - now.getTime()) / 1_000),
  );
  const report = await generateAiStatusReport({
    battleDate: battle.battleDate,
    serverNow: now.toISOString(),
    secondsUntilResolve,
    playerCount,
  });
  const comment = await withRedditRateLimitRetry(() => reddit.submitComment({
    id: getRedditCommentTargetId(warRoom.threadIds.ai),
    text: report,
    runAs: 'APP',
  }));

  return {
    type: 'ai-report',
    message: report,
    commentPermalink: comment.permalink,
  };
}

export async function postDivisionCommentAnalysis(
  target: DivisionTarget,
): Promise<DivisionCommentAnalysisResponse> {
  const battle = await getCurrentResolvableBattle();
  if (!battle) throw new Error('No current battle found');

  const warRoom = await getWarRoom(battle.postId);
  if (!warRoom) throw new Error('War room is not initialized for the current battle');

  const branchComments = await reddit.getComments({
    postId: getRedditPostId(battle.postId),
    commentId: getRedditCommentId(warRoom.threadIds[target]),
    depth: MAX_COMMENT_TREE_DEPTH,
    limit: MAX_BRANCH_COMMENTS,
    pageSize: MAX_BRANCH_COMMENTS,
    sort: 'new',
  }).all();
  const promptComments = await collectDivisionBranchComments(branchComments);
  const message = await generateDivisionCommentAnalysis({
    target,
    battleDate: battle.battleDate,
    comments: promptComments,
  });
  const comment = await withRedditRateLimitRetry(() => reddit.submitComment({
    id: getRedditCommentTargetId(warRoom.threadIds.ai),
    text: message,
    runAs: 'APP',
  }));

  return {
    type: 'division-comment-analysis',
    target,
    message,
    commentPermalink: comment.permalink,
  };
}

export async function createNextDailyBattle(now = new Date()): Promise<DailyTaskResult> {
  const completedCampaign = await recoverCompletedCampaignState(now);
  if (completedCampaign) {
    await ensureCampaignFinalReport(completedCampaign);
    return {
      status: 'skipped',
      message: `Campaign is complete. ${completedCampaign.winner.toUpperCase()} controls all ${completedCampaign.territoryCount} sectors.`,
    };
  }

  const resolvesAt = await getResolveAt(now);
  const battleDate = formatYmd(getNewYorkParts(resolvesAt));
  const battleId = `battle:${battleDate}`;
  const existing = await getBattleById(battleId);

  if (existing) {
    await redis.set(CURRENT_BATTLE_KEY, existing.id);
    return {
      status: 'skipped',
      message: `Daily battle ${battleId} already exists.`,
      battle: existing,
    };
  }

  const [territories, previousBattle] = await Promise.all([
    getStoredTerritorySnapshot(),
    getCurrentBattle(),
  ]);
  let selectedTarget: TerritoryTargetView | undefined;
  const storedTransition = previousBattle?.result?.campaignTransition;
  if (storedTransition?.type === 'next-target') {
    selectedTarget = storedTransition.target;
  } else if (storedTransition?.type === 'campaign-complete') {
    const recoveredState = createCompletedCampaignStateFromTransition(storedTransition);
    const saved = await redis.set(CAMPAIGN_STATE_KEY, JSON.stringify(recoveredState), { nx: true });
    const state = saved === 'OK' ? recoveredState : await getCampaignState();
    if (state) await ensureCampaignFinalReport(state);
    return {
      status: 'skipped',
      message: 'Campaign is complete. No new daily battle was created.',
    };
  } else {
    selectedTarget = selectInitialTerritory(territories, battleId);
  }

  if (!selectedTarget) {
    throw new Error('No valid territory is available for the next daily battle');
  }

  const createLockKey = getCreateIdempotencyKey(battleDate);
  const created = await redis.set(createLockKey, now.toISOString(), {
    nx: true,
    expiration: new Date(now.getTime() + DAILY_TASK_LOCK_SECONDS * 1_000),
  });
  if (created !== 'OK') {
    return {
      status: 'skipped',
      message: `Daily battle ${battleId} creation is already locked.`,
    };
  }

  const campaignBeforePost = await recoverCompletedCampaignState(now);
  if (campaignBeforePost) {
    await redis.del(createLockKey);
    await ensureCampaignFinalReport(campaignBeforePost);
    return {
      status: 'skipped',
      message: 'Campaign completed before Daily Post creation; no post was created.',
    };
  }

  const postTitle = `${DAILY_POST_TITLE_PREFIX} - ${battleDate}`;
  const existingPost = await findExistingPostByTitle(postTitle);
  const post = existingPost ?? await withRedditRateLimitRetry(() => reddit.submitCustomPost({
    title: postTitle,
  }));
  const postPermalink = toRedditUrl(post.permalink);
  await createDailyWarRoom(post.id, postPermalink);
  const activeTerritoryBefore = await getStoredTerritory(selectedTarget.territory.id);

  const battle: DailyBattle = {
    id: battleId,
    battleDate,
    status: 'active',
    postId: post.id,
    postPermalink,
    resolvesAt: resolvesAt.toISOString(),
    activeTerritoryId: activeTerritoryBefore.id,
    activeTerritoryBefore,
    armyBalance: createEmptyArmyBalance(),
    nextTieArmy: 'green',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await saveBattle(battle);

  return {
    status: 'created',
    message: `Created ${battleId}.`,
    battle,
  };
}

export async function ensureDailyBattle(now = new Date()): Promise<DailyTaskResult> {
  const completedCampaign = await recoverCompletedCampaignState(now);
  if (completedCampaign) {
    await ensureCampaignFinalReport(completedCampaign);
    return {
      status: 'skipped',
      message: 'Campaign is complete. Daily battle creation is disabled.',
    };
  }

  const currentBattle = await getCurrentBattle();

  if (currentBattle?.status === 'active') {
    return {
      status: 'skipped',
      message: now.getTime() < new Date(currentBattle.resolvesAt).getTime()
        ? `Current battle ${currentBattle.id} is still active.`
        : `Current battle ${currentBattle.id} is awaiting resolution.`,
      battle: currentBattle,
    };
  }

  return await createNextDailyBattle(now);
}

export async function resolveCurrentDailyBattle(now = new Date()): Promise<DailyTaskResult> {
  const battle = await getCurrentBattle();

  if (!battle) {
    return {
      status: 'skipped',
      message: 'No current battle found.',
    };
  }

  if (battle.status === 'resolved') {
    await redis.del(getPendingResolutionKey(battle.id));
    return {
      status: 'skipped',
      message: `Battle ${battle.id} is already resolved.`,
      battle,
    };
  }

  if (now.getTime() < new Date(battle.resolvesAt).getTime()) {
    return {
      status: 'skipped',
      message: `Battle ${battle.id} has not reached its resolution time.`,
      battle,
    };
  }

  const locked = await redis.set(getResolveIdempotencyKey(battle.battleDate), now.toISOString(), {
    nx: true,
    expiration: new Date(now.getTime() + DAILY_TASK_LOCK_SECONDS * 1_000),
  });
  if (locked !== 'OK') {
    return {
      status: 'skipped',
      message: `Battle ${battle.id} resolve is already locked.`,
      battle,
    };
  }

  const activeTerritory = normalizeTerritoryView(
    battle.activeTerritoryBefore ?? await getStoredTerritory(battle.activeTerritoryId),
  );
  const [ordersByUser, players, storedParticipants, warRoom, territories] = await Promise.all([
    getBattleOrders(battle.id),
    getPlayers(),
    getEventParticipants(battle.id),
    getWarRoom(battle.postId),
    getStoredTerritorySnapshot(),
  ]);
  const participants = await migrateLegacyEventParticipants(
    battle.id,
    storedParticipants,
    ordersByUser,
    players,
  );
  let pendingResolution = parsePendingBattleResolution(
    await redis.get(getPendingResolutionKey(battle.id)),
  );
  if (!pendingResolution) {
    const orders = Array.from(ordersByUser.values());
    const commentSignals = warRoom
      ? {
        green: aggregateCommentSignals(
          'green',
          await loadBranchCommentSignalInput(battle, warRoom, 'green'),
          now.toISOString(),
        ),
        blue: aggregateCommentSignals(
          'blue',
          await loadBranchCommentSignalInput(battle, warRoom, 'blue'),
          now.toISOString(),
        ),
      }
      : {
        green: createEmptyCommentSignal('green', now.toISOString()),
        blue: createEmptyCommentSignal('blue', now.toISOString()),
      };
    const spyInfluence = await getAcceptedSpyInfluence(battle.id, participants);
    const baseResult = resolveBattle({
      battleId: battle.id,
      battleDate: battle.battleDate,
      activeTerritory,
      orders,
      commentSignals,
      spyInfluence,
      seed: `${battle.id}:${battle.battleDate}`,
    });
    const campaignTransition = selectCampaignTransition({
      battleId: battle.id,
      completedAt: now.toISOString(),
      winner: baseResult.winner,
      activeTerritory,
      territories,
    });
    const result: BattleResultView = {
      ...baseResult,
      campaignTransition,
      reportText: appendCampaignTransitionReport(baseResult.reportText, campaignTransition),
    };
    pendingResolution = await getOrCreatePendingBattleResolution({
      battleId: battle.id,
      resolvedAt: now.toISOString(),
      result,
    });
  }

  const { result } = pendingResolution;
  const campaignTransition = result.campaignTransition;
  if (!campaignTransition) throw new Error(`Pending resolution for ${battle.id} has no transition`);
  const resolvedAt = new Date(pendingResolution.resolvedAt);
  if (Number.isNaN(resolvedAt.getTime())) {
    throw new Error(`Pending resolution for ${battle.id} has an invalid timestamp`);
  }
  const resultThreadId = warRoom?.threadIds.ai;
  if (!resultThreadId) throw new Error('AI branch is missing for the daily battle report');
  const resultMarker = `AI RESULT // ${battle.id}`;
  const resultBody = `${resultMarker}\n\n${result.reportText}`;
  const resultThread = await reddit.getCommentById(getRedditCommentId(resultThreadId));
  const existingResultComment = await findExistingCampaignReportComment({
    postId: battle.postId,
    commentId: resultThreadId,
    marker: resultMarker,
    exactBody: resultBody,
    authorName: resultThread.authorName,
  });
  const resultCommentId = existingResultComment?.id ?? (
    await withRedditRateLimitRetry(() => reddit.submitComment({
      id: getRedditCommentTargetId(resultThreadId),
      text: resultBody,
      runAs: 'APP',
    }))
  ).id;
  const resolvedBattle: DailyBattle = {
    ...battle,
    status: 'resolved',
    result,
    activeTerritoryBefore: activeTerritory,
    activeTerritoryId: result.activeTerritoryAfter.id,
    armyBalance: calculateArmyBalance(participants),
    resultSummary: result.reportText,
    resultCommentId,
    updatedAt: pendingResolution.resolvedAt,
  };

  const captureRecord = createTerritoryCaptureRecord(battle, result, resolvedAt);
  await saveParticipantProgression(
    battle,
    participants,
    ordersByUser,
    result,
    resolvedAt,
  );
  const pendingFlairTasks = createParticipantFlairTasks(participants, players);
  const completedCampaign = campaignTransition.type === 'campaign-complete'
    ? createCompletedCampaignStateFromTransition(campaignTransition)
    : undefined;
  await saveResolvedBattleState(
    resolvedBattle,
    result.activeTerritoryAfter,
    captureRecord,
    pendingFlairTasks,
    completedCampaign,
  );
  await redis.del(getPendingResolutionKey(battle.id));
  await resetParticipantFlairs(pendingFlairTasks);
  if (completedCampaign) await ensureCampaignFinalReport(completedCampaign);

  return {
    status: 'resolved',
    message: `Resolved ${battle.id}.`,
    battle: resolvedBattle,
  };
}

export async function reconcileDailyCycle(now = new Date()): Promise<DailyTaskResult> {
  const completedCampaign = await recoverCompletedCampaignState(now);
  if (completedCampaign) {
    await ensureCampaignFinalReport(completedCampaign);
    return {
      status: 'skipped',
      message: 'Campaign is complete. Final report reconciliation ran; no new battle was created.',
    };
  }

  const currentBattle = await getCurrentBattle();
  if (
    currentBattle?.status === 'active' &&
    now.getTime() < new Date(currentBattle.resolvesAt).getTime()
  ) {
    return {
      status: 'skipped',
      message: `Current battle ${currentBattle.id} is still active.`,
      battle: currentBattle,
    };
  }

  if (currentBattle?.status === 'active') {
    const resolution = await resolveCurrentDailyBattle(now);
    if (resolution.status !== 'resolved') return resolution;
    if (await getCampaignState()) return resolution;
  }

  return await createNextDailyBattle(now);
}

async function loadBranchCommentSignalInput(
  battle: DailyBattle,
  warRoom: DevWarRoomState,
  target: DivisionTarget,
) {
  const branchComments = await reddit.getComments({
    postId: getRedditPostId(battle.postId),
    commentId: getRedditCommentId(warRoom.threadIds[target]),
    depth: MAX_COMMENT_TREE_DEPTH,
    limit: MAX_BRANCH_COMMENTS,
    pageSize: MAX_BRANCH_COMMENTS,
    sort: 'new',
  }).all();
  const comments = await collectDivisionBranchComments(branchComments);

  return comments.map((comment) => ({
    branch: target,
    body: comment.body,
    score: comment.score,
  }));
}

async function migrateLegacyEventParticipants(
  battleId: string,
  existingParticipants: readonly StoredEventParticipant[],
  ordersByUser: ReadonlyMap<string, DoctrineOrder>,
  players: readonly StoredPlayer[],
) {
  const participantsByUserId = new Map(
    existingParticipants.map((participant) => [participant.userId, participant]),
  );
  const playersByUserId = new Map(players.map((player) => [player.redditUserId, player]));
  const updates: Record<string, string> = {};

  for (const [userId, order] of ordersByUser) {
    if (participantsByUserId.has(userId)) continue;

    const player = playersByUserId.get(userId);
    if (!player) continue;

    const participant: StoredEventParticipant = {
      battleId,
      userId,
      assignedArmy: order.army,
      confirmedAt: order.submittedAt,
      powerSnapshot: getPlayerPowerForXp(player.rewards.xp),
      activityXp: 0,
      missionOutcome: 'notStarted',
    };
    participantsByUserId.set(userId, participant);
    updates[userId] = JSON.stringify(participant);
  }

  if (Object.keys(updates).length > 0) {
    await redis.hSet(getParticipantsKey(battleId), updates);
  }

  return Array.from(participantsByUserId.values());
}

function createTerritoryCaptureRecord(
  battle: DailyBattle,
  result: BattleResultView,
  now: Date,
): TerritoryCaptureRecord {
  const before = result.activeTerritoryBefore;
  const after = result.activeTerritoryAfter;

  return {
    id: `capture:${battle.id}:${after.id}`,
    battleId: battle.id,
    battleDate: battle.battleDate,
    territoryId: after.id,
    x: after.x,
    y: after.y,
    previousOwner: before.owner,
    newOwner: after.owner,
    winner: result.winner,
    ownershipChanged: before.owner !== after.owner,
    capturedAt: now.toISOString(),
    postPermalink: battle.postPermalink,
  };
}

function getParticipantDivisionResult(
  participant: StoredEventParticipant,
  result: BattleResultView,
) {
  if (result.winner === 'humanity' || result.winner === participant.assignedArmy) {
    return 'victory' as const;
  }
  if (result.winner === 'contested') return 'draw' as const;

  return 'defeat' as const;
}

async function saveParticipantProgression(
  battle: DailyBattle,
  participants: readonly StoredEventParticipant[],
  ordersByUser: ReadonlyMap<string, DoctrineOrder>,
  result: BattleResultView,
  now: Date,
) {
  for (const participant of participants) {
    if (!ordersByUser.has(participant.userId)) continue;

    await applyParticipantProgression(battle, participant, result, now);
  }
}

function createParticipantFlairTasks(
  participants: readonly StoredEventParticipant[],
  players: readonly StoredPlayer[],
) {
  const playersByUserId = new Map(players.map((player) => [player.redditUserId, player]));
  return participants.map((participant) => createPendingFlairTask({
    userId: participant.userId,
    redditUsername: playersByUserId.get(participant.userId)?.redditUsername,
  }));
}

async function resetParticipantFlairs(tasks: readonly PendingFlairTask[]) {
  for (const task of tasks) {
    const player = await getPlayer(task.sync.userId) ?? createFallbackPlayer(task.sync);
    await processPendingPlayerFlairSafely(task.id, player);
  }
}

async function applyParticipantProgression(
  battle: DailyBattle,
  participant: StoredEventParticipant,
  result: BattleResultView,
  now: Date,
) {
  const ledgerKey = getProgressionLedgerKey(battle.id);
  const lockKey = getProgressionLockKey(battle.id, participant.userId);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = `${battle.id}:${participant.userId}:${Date.now()}:${attempt}`;
    const acquired = await redis.set(lockKey, token, {
      nx: true,
      expiration: new Date(Date.now() + ASSIGNMENT_LOCK_SECONDS * 1_000),
    });
    if (acquired !== 'OK') {
      if (await redis.hGet(ledgerKey, participant.userId)) return;
      await sleep(50 * (attempt + 1));
      continue;
    }

    let updatedPlayer: StoredPlayer | undefined;
    try {
      if (await redis.hGet(ledgerKey, participant.userId)) return;

      const player = parseStoredPlayer(await redis.hGet(PLAYERS_KEY, participant.userId));
      if (!player) return;

      const progressionUpdate = applyDailyProgression({
        battleId: battle.id,
        userId: participant.userId,
        battleDate: battle.battleDate,
        appliedAt: now.toISOString(),
        previousRewards: player.rewards,
        previousProgression: player.progression,
        activityXp: participant.activityXp,
        divisionResult: getParticipantDivisionResult(participant, result),
        missionOutcome: participant.missionOutcome,
        territoryCaptured:
          result.activeTerritoryBefore.owner !== result.activeTerritoryAfter.owner &&
          result.activeTerritoryAfter.owner === participant.assignedArmy,
      });
      updatedPlayer = {
        ...player,
        affiliation: 'gray',
        rewards: progressionUpdate.rewards,
        progression: progressionUpdate.progression,
        updatedAt: now.toISOString(),
      };

      const transaction = await redis.watch(PLAYERS_KEY, ledgerKey);
      await transaction.multi();
      await transaction.hSet(PLAYERS_KEY, {
        [participant.userId]: JSON.stringify(updatedPlayer),
      });
      await transaction.hSet(ledgerKey, {
        [participant.userId]: JSON.stringify(progressionUpdate.ledger),
      });
      const replies = await transaction.exec();
      if (replies.length === 0) {
        updatedPlayer = undefined;
        continue;
      }
    } finally {
      if (await redis.get(lockKey) === token) await redis.del(lockKey);
    }

    if (updatedPlayer) return;
  }

  throw new Error(`Could not apply progression for ${participant.userId}`);
}
