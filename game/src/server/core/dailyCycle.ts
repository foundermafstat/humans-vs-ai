import { context, redis, reddit, settings } from '@devvit/web/server';
import type {
  AiReportResponse,
  ArmyColor,
  BootstrapBattle,
  BootstrapResponse,
  BattleStatus,
  BattleResultView,
  DevThreadTarget,
  DevWarRoomState,
  DoctrineId,
  DoctrineOrder,
  DivisionCommentAnalysisResponse,
  DivisionTarget,
  OrderResponse,
  PlayerBattleState,
  PlayerJoinResponse,
  RewardSummary,
  SpyResponse,
  SpyResponseRequest,
  TerritoryView,
} from '../../shared/api';
import { DOCTRINE_LIST } from './doctrines';
import { aggregateCommentSignals, createEmptyCommentSignal } from './commentSignals';
import { resolveBattle } from './resolver';
import { getTerritoryById, selectActiveTerritory } from './territories';

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
  createdAt: string;
  updatedAt: string;
  result?: BattleResultView;
  resultSummary?: string;
  resultCommentId?: string;
};

type StoredPlayer = {
  redditUserId: string;
  army: ArmyColor;
  joinedAt: string;
  updatedAt: string;
  rewards?: RewardSummary;
};

type StoredSpyOffer = {
  battleId: string;
  userId: string;
  offered: true;
  accepted?: boolean;
  objective: string;
  targetDoctrineHint: DoctrineId;
  updatedAt: string;
};

type DailyTaskResult = {
  status: 'created' | 'resolved' | 'skipped';
  message: string;
  battle?: DailyBattle;
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
const TERRITORIES_KEY = 'app:territories';
const DAILY_POST_TITLE_PREFIX = 'Humans vs AI Daily Battle';
const OPENAI_API_KEY_SETTING = 'openai_api_key';
const DEMO_RESOLVE_MINUTES_SETTING = 'demo_resolve_minutes';
const OPENAI_REPORT_MODEL = 'gpt-5.4-nano';
const MAX_BRANCH_COMMENTS = 50;
const MAX_PROMPT_COMMENTS = 25;
const MAX_COMMENT_BODY_CHARS = 320;
const MAX_COMMENT_TREE_DEPTH = 6;

const THREAD_TITLES: Record<DevThreadTarget, string> = {
  ai: 'AI Responses',
  green: 'Green HQ',
  blue: 'Blue HQ',
};

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
      'No side secured full control. The territory remains contested until the next daily battle.',
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

function getSpyOffersKey(battleId: string) {
  return `app:spy_offers:${battleId}`;
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
  const resultOk = value.result === undefined || isRecord(value.result);

  return (
    typeof value.id === 'string' &&
    typeof value.battleDate === 'string' &&
    (value.status === 'active' || value.status === 'resolved') &&
    typeof value.postId === 'string' &&
    typeof value.postPermalink === 'string' &&
    typeof value.resolvesAt === 'string' &&
    activeTerritoryOk &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    resultOk &&
    resultSummaryOk &&
    resultCommentIdOk
  );
}

function isStoredPlayer(value: unknown): value is StoredPlayer {
  if (!isRecord(value)) return false;

  return (
    typeof value.redditUserId === 'string' &&
    (value.army === 'green' || value.army === 'blue') &&
    typeof value.joinedAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function parseStoredPlayer(rawPlayer: string | undefined) {
  if (!rawPlayer) return undefined;

  const parsed: unknown = JSON.parse(rawPlayer);
  if (!isStoredPlayer(parsed)) return undefined;

  return parsed;
}

function isDoctrineOrder(value: unknown): value is DoctrineOrder {
  if (!isRecord(value)) return false;

  return (
    typeof value.battleId === 'string' &&
    (value.army === 'green' || value.army === 'blue') &&
    typeof value.doctrineId === 'string' &&
    typeof value.submittedAt === 'string'
  );
}

function parseDoctrineOrder(rawOrder: string | undefined) {
  if (!rawOrder) return undefined;

  const parsed: unknown = JSON.parse(rawOrder);
  if (!isDoctrineOrder(parsed)) return undefined;

  return parsed;
}

function isStoredSpyOffer(value: unknown): value is StoredSpyOffer {
  if (!isRecord(value)) return false;

  return (
    typeof value.battleId === 'string' &&
    typeof value.userId === 'string' &&
    value.offered === true &&
    (value.accepted === undefined || typeof value.accepted === 'boolean') &&
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

function isWarRoomState(value: unknown): value is DevWarRoomState {
  if (!isRecord(value)) return false;
  if (!isRecord(value.threadIds) || !isRecord(value.threadPermalinks)) return false;

  return (
    typeof value.postId === 'string' &&
    typeof value.postPermalink === 'string' &&
    typeof value.indexCommentId === 'string' &&
    typeof value.indexPermalink === 'string' &&
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

async function getBattleById(battleId: string) {
  return parseDailyBattle(await redis.get(getBattleKey(battleId)));
}

async function getCurrentBattle() {
  const battleId = await redis.get(CURRENT_BATTLE_KEY);
  if (!battleId) return undefined;

  return await getBattleById(battleId);
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

  return parseStoredPlayer(await redis.hGet(PLAYERS_KEY, userId));
}

async function getPlayers() {
  const rawPlayers = await redis.hGetAll(PLAYERS_KEY);
  const players: StoredPlayer[] = [];

  for (const rawPlayer of Object.values(rawPlayers)) {
    const player = parseStoredPlayer(rawPlayer);
    if (player) players.push(player);
  }

  return players;
}

async function getPlayerOrder(battleId: string, userId: string | undefined) {
  if (!userId) return undefined;

  return parseDoctrineOrder(await redis.hGet(getOrdersKey(battleId), userId));
}

async function getBattleOrders(battleId: string) {
  const rawOrders = await redis.hGetAll(getOrdersKey(battleId));
  const orders: DoctrineOrder[] = [];

  for (const rawOrder of Object.values(rawOrders)) {
    const order = parseDoctrineOrder(rawOrder);
    if (order) orders.push(order);
  }

  return orders;
}

function parseTerritory(rawTerritory: string | undefined) {
  if (!rawTerritory) return undefined;

  const parsed: unknown = JSON.parse(rawTerritory);
  if (!isRecord(parsed)) return undefined;
  if (
    typeof parsed.id !== 'string' ||
    typeof parsed.name !== 'string' ||
    typeof parsed.x !== 'number' ||
    typeof parsed.y !== 'number'
  ) {
    return undefined;
  }

  return parsed as TerritoryView;
}

async function getStoredTerritory(id: string | undefined) {
  const fallback = getTerritoryById(id);
  const stored = parseTerritory(await redis.hGet(TERRITORIES_KEY, fallback.id));

  return stored ?? fallback;
}

async function saveTerritory(territory: TerritoryView) {
  await redis.hSet(TERRITORIES_KEY, {
    [territory.id]: JSON.stringify(territory),
  });
}

async function getSpyOffer(battleId: string, userId: string | undefined) {
  if (!userId) return undefined;

  return parseStoredSpyOffer(await redis.hGet(getSpyOffersKey(battleId), userId));
}

async function getAcceptedSpyInfluence(battleId: string, players: readonly StoredPlayer[]) {
  const rawOffers = await redis.hGetAll(getSpyOffersKey(battleId));
  const playerByUserId = new Map(players.map((player) => [player.redditUserId, player]));
  const influence: Record<ArmyColor, number> = {
    green: 0,
    blue: 0,
  };

  for (const rawOffer of Object.values(rawOffers)) {
    const offer = parseStoredSpyOffer(rawOffer);
    if (!offer?.accepted) continue;

    const player = playerByUserId.get(offer.userId);
    if (!player) continue;

    influence[player.army] = Math.max(-12, influence[player.army] - 6);
  }

  return influence;
}

async function getOrCreateSpyOffer(battle: DailyBattle, userId: string | undefined) {
  if (!userId || battle.status === 'resolved') return undefined;

  const existing = await getSpyOffer(battle.id, userId);
  if (existing) return existing;
  if (getOutcomeIndex(`${battle.id}:${userId}:spy`) % 4 !== 0) return undefined;

  const doctrine = DOCTRINE_LIST[getOutcomeIndex(`${battle.id}:${userId}:hint`) % DOCTRINE_LIST.length];
  if (!doctrine) return undefined;

  const offer: StoredSpyOffer = {
    battleId: battle.id,
    userId,
    offered: true,
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
  ]);
}

function getOutcomeIndex(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash % OUTCOMES.length;
}

function createDeterministicResult(battle: DailyBattle) {
  const outcome = OUTCOMES[getOutcomeIndex(`${battle.id}:${battle.battleDate}`)] ?? DEFAULT_OUTCOME;

  return {
    resultSummary: `${outcome.winner}. ${outcome.summary}`,
    aiComment: outcome.aiComment,
  };
}

function createPlayerBattleState(input: {
  player?: StoredPlayer;
  order?: DoctrineOrder;
  spyOffer?: StoredSpyOffer;
}): PlayerBattleState {
  return {
    exists: Boolean(input.player),
    army: input.player?.army,
    order: input.order,
    rewards: input.player?.rewards,
    spyOffer: input.spyOffer
      ? {
        offered: true,
        accepted: input.spyOffer.accepted,
        objective: input.spyOffer.objective,
        targetDoctrineHint: input.spyOffer.targetDoctrineHint,
      }
      : undefined,
  };
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
): Promise<DivisionBranchComment[]> {
  for (const comment of comments) {
    if (collected.length >= MAX_BRANCH_COMMENTS) break;

    collected.push({
      id: comment.id,
      parentId: comment.parentId,
      authorName: comment.authorName,
      body: comment.body,
      createdAt: comment.createdAt,
      score: comment.score,
      depth,
    });

    if (depth + 1 >= MAX_COMMENT_TREE_DEPTH || collected.length >= MAX_BRANCH_COMMENTS) continue;

    const replies = await comment.replies.all().catch(() => comment.replies.children);
    await collectDivisionBranchComments(replies, depth + 1, collected);
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

function createIndexCommentText(warRoom: Pick<DevWarRoomState, 'threadPermalinks'>) {
  return [
    '## Official War Room Branches',
    '',
    'Pinned index for this daily battle post. Use the linked branches below.',
    '',
    `- ${THREAD_TITLES.ai}: [Open branch](${toRedditUrl(warRoom.threadPermalinks.ai)})`,
    `- ${THREAD_TITLES.green}: [Open branch](${toRedditUrl(warRoom.threadPermalinks.green)})`,
    `- ${THREAD_TITLES.blue}: [Open branch](${toRedditUrl(warRoom.threadPermalinks.blue)})`,
  ].join('\n');
}

async function createDailyWarRoom(postId: string, postPermalink: string) {
  const targetPostId = getRedditCommentTargetId(postId);
  const aiThread = await withRedditRateLimitRetry(() => reddit.submitComment({
    id: targetPostId,
    text: THREAD_BODIES.ai,
    runAs: 'APP',
  }));
  const greenThread = await withRedditRateLimitRetry(() => reddit.submitComment({
    id: targetPostId,
    text: THREAD_BODIES.green,
    runAs: 'APP',
  }));
  const blueThread = await withRedditRateLimitRetry(() => reddit.submitComment({
    id: targetPostId,
    text: THREAD_BODIES.blue,
    runAs: 'APP',
  }));
  const partialWarRoom = {
    threadPermalinks: {
      ai: aiThread.permalink,
      green: greenThread.permalink,
      blue: blueThread.permalink,
    },
  };
  const indexComment = await withRedditRateLimitRetry(() => reddit.submitComment({
    id: targetPostId,
    text: createIndexCommentText(partialWarRoom),
    runAs: 'APP',
  }));

  await withRedditRateLimitRetry(() => indexComment.distinguish(true));

  const warRoom: DevWarRoomState = {
    postId,
    postPermalink,
    indexCommentId: indexComment.id,
    indexPermalink: indexComment.permalink,
    threadIds: {
      ai: aiThread.id,
      green: greenThread.id,
      blue: blueThread.id,
    },
    threadPermalinks: partialWarRoom.threadPermalinks,
    createdAt: new Date().toISOString(),
  };

  await redis.set(getWarRoomKey(postId), JSON.stringify(warRoom));

  return warRoom;
}

async function createBootstrapBattle(battle: DailyBattle, now: Date): Promise<BootstrapBattle> {
  const resolvesAtMs = new Date(battle.resolvesAt).getTime();
  const secondsUntilResolve = Math.max(0, Math.ceil((resolvesAtMs - now.getTime()) / 1_000));
  const activeTerritory = battle.result?.activeTerritoryAfter ?? await getStoredTerritory(battle.activeTerritoryId);
  const bootstrapBattle: BootstrapBattle = {
    id: battle.id,
    battleDate: battle.battleDate,
    status: battle.status,
    postId: battle.postId,
    postPermalink: battle.postPermalink,
    resolvesAt: battle.resolvesAt,
    secondsUntilResolve,
    activeTerritory,
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
  const player = await getPlayer(userId);
  const battle = await getCurrentResolvableBattle();
  const order = battle ? await getPlayerOrder(battle.id, userId) : undefined;
  const spyOffer = battle ? await getOrCreateSpyOffer(battle, userId) : undefined;
  const response: BootstrapResponse = {
    type: 'bootstrap',
    serverNow: now.toISOString(),
    view: 'promo',
    user: createPlayerBattleState({ player, order, spyOffer }),
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

export async function joinCurrentPlayer(army: ArmyColor): Promise<PlayerJoinResponse> {
  const { userId } = context;

  if (!userId) throw new Error('Reddit user id is required');

  const now = new Date().toISOString();
  const existing = parseStoredPlayer(await redis.hGet(PLAYERS_KEY, userId));
  const player: StoredPlayer = {
    redditUserId: userId,
    army,
    joinedAt: now,
    updatedAt: now,
    rewards: existing?.rewards,
  };

  if (existing) {
    player.joinedAt = existing.joinedAt;
  }

  await redis.hSet(PLAYERS_KEY, {
    [userId]: JSON.stringify(player),
  });

  return {
    type: 'player-join',
    user: {
      exists: true,
    },
  };
}

export async function submitDoctrineOrder(doctrineId: DoctrineId): Promise<OrderResponse> {
  const { userId } = context;
  if (!userId) throw new Error('Reddit user id is required');

  const battle = await getCurrentResolvableBattle();
  if (!battle) throw new Error('No current battle found');
  if (battle.status === 'resolved') throw new Error('Battle is already resolved');

  const player = await getPlayer(userId);
  if (!player) throw new Error('Join an army before submitting an order');

  const existingOrder = await getPlayerOrder(battle.id, userId);
  if (existingOrder) {
    return {
      type: 'order',
      order: existingOrder,
      player: createPlayerBattleState({
        player,
        order: existingOrder,
        spyOffer: await getSpyOffer(battle.id, userId),
      }),
    };
  }

  const order: DoctrineOrder = {
    battleId: battle.id,
    army: player.army,
    doctrineId,
    submittedAt: new Date().toISOString(),
  };

  await redis.hSet(getOrdersKey(battle.id), {
    [userId]: JSON.stringify(order),
  });

  return {
    type: 'order',
    order,
    player: createPlayerBattleState({
      player,
      order,
      spyOffer: await getSpyOffer(battle.id, userId),
    }),
  };
}

export async function respondToSpyOffer(input: SpyResponseRequest): Promise<SpyResponse> {
  const { userId } = context;
  if (!userId) throw new Error('Reddit user id is required');

  const battle = await getCurrentResolvableBattle();
  if (!battle) throw new Error('No current battle found');

  const offer = await getOrCreateSpyOffer(battle, userId);
  if (!offer) {
    return {
      type: 'spy-response',
      spyOffer: {
        offered: false,
      },
    };
  }

  const updatedOffer: StoredSpyOffer = {
    ...offer,
    accepted: input.accept,
    updatedAt: new Date().toISOString(),
  };

  await redis.hSet(getSpyOffersKey(battle.id), {
    [userId]: JSON.stringify(updatedOffer),
  });

  return {
    type: 'spy-response',
    spyOffer: {
      offered: true,
      accepted: updatedOffer.accepted,
      objective: updatedOffer.objective,
      targetDoctrineHint: updatedOffer.targetDoctrineHint,
    },
  };
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

  const created = await redis.set(getCreateIdempotencyKey(battleDate), now.toISOString(), { nx: true });
  if (created !== 'OK') {
    return {
      status: 'skipped',
      message: `Daily battle ${battleId} creation is already locked.`,
    };
  }

  const post = await withRedditRateLimitRetry(() => reddit.submitCustomPost({
    title: `${DAILY_POST_TITLE_PREFIX} - ${battleDate}`,
  }));
  const postPermalink = toRedditUrl(post.permalink);
  await createDailyWarRoom(post.id, postPermalink);

  const battle: DailyBattle = {
    id: battleId,
    battleDate,
    status: 'active',
    postId: post.id,
    postPermalink,
    resolvesAt: resolvesAt.toISOString(),
    activeTerritoryId: selectActiveTerritory(battleId).id,
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
  const currentBattle = await getCurrentBattle();

  if (
    currentBattle &&
    currentBattle.status === 'active' &&
    now.getTime() < new Date(currentBattle.resolvesAt).getTime()
  ) {
    return {
      status: 'skipped',
      message: `Current battle ${currentBattle.id} is still active.`,
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
    return {
      status: 'skipped',
      message: `Battle ${battle.id} is already resolved.`,
      battle,
    };
  }

  const locked = await redis.set(getResolveIdempotencyKey(battle.battleDate), now.toISOString(), {
    nx: true,
  });
  if (locked !== 'OK') {
    return {
      status: 'skipped',
      message: `Battle ${battle.id} resolve is already locked.`,
      battle,
    };
  }

  const activeTerritory = await getStoredTerritory(battle.activeTerritoryId);
  const [orders, players, warRoom] = await Promise.all([
    getBattleOrders(battle.id),
    getPlayers(),
    getWarRoom(battle.postId),
  ]);
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
  const previousRewards = {
    green: players.find((player) => player.army === 'green')?.rewards,
    blue: players.find((player) => player.army === 'blue')?.rewards,
  };
  const spyInfluence = await getAcceptedSpyInfluence(battle.id, players);
  const result = resolveBattle({
    battleId: battle.id,
    battleDate: battle.battleDate,
    activeTerritory,
    orders,
    commentSignals,
    spyInfluence,
    previousRewards,
    seed: `${battle.id}:${battle.battleDate}`,
  });
  const comment = await withRedditRateLimitRetry(() => reddit.submitComment({
    id: getRedditCommentTargetId(battle.postId),
    text: `AI RESULT // ${result.reportText}`,
    runAs: 'APP',
  }));
  const resolvedBattle: DailyBattle = {
    ...battle,
    status: 'resolved',
    result,
    activeTerritoryId: result.activeTerritoryAfter.id,
    resultSummary: result.reportText,
    resultCommentId: comment.id,
    updatedAt: now.toISOString(),
  };

  await Promise.all([
    savePlayerRewards(players, result),
    saveTerritory(result.activeTerritoryAfter),
  ]);
  await saveBattle(resolvedBattle);

  return {
    status: 'resolved',
    message: `Resolved ${battle.id}.`,
    battle: resolvedBattle,
  };
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

async function savePlayerRewards(players: readonly StoredPlayer[], result: BattleResultView) {
  const updates: Record<string, string> = {};

  for (const player of players) {
    const reward = result.rewards[player.army];
    if (!reward) continue;

    updates[player.redditUserId] = JSON.stringify({
      ...player,
      rewards: reward,
      updatedAt: new Date().toISOString(),
    });
  }

  if (Object.keys(updates).length > 0) {
    await redis.hSet(PLAYERS_KEY, updates);
  }
}
