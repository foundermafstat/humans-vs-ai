import {
  DOCTRINE_IDS,
  type ArmyColor,
  type BattleResultView,
  type BattleSide,
  type BattleWinner,
  type DoctrineId,
  type RewardSummary,
  type TerritoryCaptureRecord,
  type TerritoryOwner,
} from '../../shared/api';

export const CAMPAIGN_REPORT_MAIN_LIMIT = 30_000;
export const CAMPAIGN_REPORT_APPENDIX_LIMIT = 8_000;

export type CampaignResolvedBattleSnapshot = {
  id: string;
  battleDate: string;
  postPermalink?: string;
  result: BattleResultView;
};

export type CampaignParticipantSnapshot = {
  battleId: string;
  userId: string;
};

export type CampaignOrderSnapshot = {
  battleId: string;
  userId: string;
  army: ArmyColor;
  doctrineId: DoctrineId;
};

export type CampaignPlayerSnapshot = {
  userId: string;
  redditUsername?: string;
  rewards: Pick<RewardSummary, 'xp' | 'rank' | 'medals' | 'streak'>;
  progression: {
    totalParticipatedEvents: number;
    totalVictories: number;
  };
};

export type CampaignAggregateInput = {
  winner: BattleSide;
  completedAt: string;
  battles: readonly CampaignResolvedBattleSnapshot[];
  captures: readonly TerritoryCaptureRecord[];
  participants: readonly CampaignParticipantSnapshot[];
  orders: readonly CampaignOrderSnapshot[];
  players: readonly CampaignPlayerSnapshot[];
};

export type CampaignWinnerCounts = Record<BattleWinner, number>;

export type CampaignTerritoryStatistics = {
  captures: number;
  holds: number;
  draws: number;
  recaptures: number;
  capturesBySide: Record<BattleSide, number>;
};

export type CampaignDistributionEntry = {
  label: string;
  count: number;
};

export type CampaignNumericDistributionEntry = {
  value: number;
  count: number;
};

export type CampaignLeaderboardEntry = {
  position: number;
  username: string;
  xp: number;
  victories: number;
  participatedEvents: number;
  rank: string;
  streak: number;
  medals: readonly string[];
};

export type CampaignDayTimelineEntry = {
  day: number;
  date: string;
  territoryName: string;
  x: number;
  y: number;
  previousOwner: TerritoryOwner;
  newOwner: TerritoryOwner;
  ownershipChanged: boolean;
  outcome: 'capture' | 'recapture' | 'hold' | 'draw';
  winner: BattleWinner;
  doctrines: Record<BattleSide, DoctrineId>;
  scores: Record<BattleSide, number>;
  participants: number;
  submitters: number;
  postPermalink?: string;
};

export type CampaignPlayerStatistics = {
  registeredProfiles: number;
  uniqueParticipants: number;
  uniqueSubmitters: number;
  totalParticipations: number;
  totalOrders: number;
  totalXp: number;
  averageXp: number;
  maximumXp: number;
  averageStreak: number;
  maximumStreak: number;
  rankDistribution: readonly CampaignDistributionEntry[];
  xpDistribution: readonly CampaignNumericDistributionEntry[];
  streakDistribution: readonly CampaignNumericDistributionEntry[];
  medalFrequency: readonly CampaignDistributionEntry[];
};

export type CampaignAggregate = {
  winner: BattleSide;
  completedAt: string;
  resolvedDays: number;
  winnerCounts: CampaignWinnerCounts;
  territory: CampaignTerritoryStatistics;
  players: CampaignPlayerStatistics;
  doctrineUsage: Record<BattleSide, Record<DoctrineId, number>>;
  leaderboard: readonly CampaignLeaderboardEntry[];
  timeline: readonly CampaignDayTimelineEntry[];
};

export type CampaignMarkdownSections = {
  summary: string;
  leaderboard: string;
  timeline: string;
};

export type CampaignMarkdownLimits = {
  main?: number;
  appendix?: number;
};

export type CampaignReportPublication = {
  title: string;
  narrativePrompt: string;
  sections: CampaignMarkdownSections;
  mainBody: string;
  appendixBodies: readonly string[];
};

const BATTLE_SIDES: readonly BattleSide[] = ['green', 'blue', 'ai'];

export function buildCampaignAggregate(input: CampaignAggregateInput): CampaignAggregate {
  const battles = getUniqueResolvedBattles(input.battles);
  const battleIds = new Set(battles.map((battle) => battle.id));
  const capturesByBattleId = indexCaptures(input.captures, battleIds);
  const participants = getUniqueEventUsers(input.participants, battleIds);
  const orders = getUniqueEventUsers(input.orders, battleIds);
  const participantCounts = countEventUsers(participants);
  const orderCounts = countEventUsers(orders);
  const winnerCounts = createWinnerCounts();
  const doctrineUsage = createDoctrineUsage();
  const territory = createTerritoryStatistics();

  const timeline = battles.map((battle, index): CampaignDayTimelineEntry => {
    const capture = chooseCapture(capturesByBattleId.get(battle.id), battle.result);
    const transition = getTerritoryTransition(battle.result, capture);
    const outcome = getTerritoryOutcome(battle.result.winner, transition);

    winnerCounts[battle.result.winner] += 1;
    for (const side of BATTLE_SIDES) {
      doctrineUsage[side][battle.result.doctrines[side]] += 1;
    }
    applyTerritoryOutcome(territory, outcome, transition.newOwner);

    return {
      day: index + 1,
      date: battle.battleDate,
      territoryName: battle.result.activeTerritoryAfter.name,
      x: transition.x,
      y: transition.y,
      previousOwner: transition.previousOwner,
      newOwner: transition.newOwner,
      ownershipChanged: transition.ownershipChanged,
      outcome,
      winner: battle.result.winner,
      doctrines: {
        green: battle.result.doctrines.green,
        blue: battle.result.doctrines.blue,
        ai: battle.result.doctrines.ai,
      },
      scores: {
        green: finiteNumber(battle.result.scores.green.total),
        blue: finiteNumber(battle.result.scores.blue.total),
        ai: finiteNumber(battle.result.scores.ai.total),
      },
      participants: participantCounts.get(battle.id) ?? 0,
      submitters: orderCounts.get(battle.id) ?? 0,
      postPermalink: getPublicPermalink(battle.postPermalink ?? capture?.postPermalink),
    };
  });

  const uniquePlayers = getUniquePlayers(input.players);
  const leaderboard = createLeaderboard(uniquePlayers);
  const playerStatistics = createPlayerStatistics({
    players: uniquePlayers,
    participants,
    orders,
  });

  return {
    winner: input.winner,
    completedAt: input.completedAt,
    resolvedDays: timeline.length,
    winnerCounts,
    territory,
    players: playerStatistics,
    doctrineUsage,
    leaderboard,
    timeline,
  };
}

export function createCampaignNarrativePrompt(aggregate: CampaignAggregate): string {
  const dayFacts = aggregate.timeline.map((day) => [
    `Day ${day.day} (${day.date})`,
    `${day.territoryName} [${day.x},${day.y}]`,
    `${ownerLabel(day.previousOwner)} -> ${ownerLabel(day.newOwner)}`,
    `winner ${winnerLabel(day.winner)}`,
    `doctrines G=${day.doctrines.green}, B=${day.doctrines.blue}, AI=${day.doctrines.ai}`,
    `scores G=${formatNumber(day.scores.green)}, B=${formatNumber(day.scores.blue)}, AI=${formatNumber(day.scores.ai)}`,
    `participants ${day.participants}, orders ${day.submitters}`,
  ].join('; '));
  const leaders = aggregate.leaderboard.slice(0, 10).map((player) =>
    `${player.position}. u/${player.username}: ${player.xp} XP, ${player.victories} victories, ${player.participatedEvents} events`,
  );

  return [
    'Write a concise English narrative and epilogue for the completed Humans vs AI campaign.',
    'Use only the verified facts below. Do not invent or estimate numbers, dates, players, locations, doctrines, scores, quotes, or events.',
    'Do not repeat the full leaderboard or timeline: the server adds those sections separately.',
    'Return plain Markdown prose only: 3-6 short paragraphs, no title, no tables, no JSON, and no calls to action.',
    '',
    'VERIFIED CAMPAIGN FACTS',
    `Campaign winner: ${sideLabel(aggregate.winner)}`,
    `Completed at: ${aggregate.completedAt}`,
    `Resolved days: ${aggregate.resolvedDays}`,
    `Day winners: Green ${aggregate.winnerCounts.green}; Blue ${aggregate.winnerCounts.blue}; AI ${aggregate.winnerCounts.ai}; Humanity ${aggregate.winnerCounts.humanity}; draws ${aggregate.winnerCounts.contested}`,
    `Territory results: ${aggregate.territory.captures} captures; ${aggregate.territory.recaptures} recaptures; ${aggregate.territory.holds} holds; ${aggregate.territory.draws} draws`,
    `Territory gains by side: Green ${aggregate.territory.capturesBySide.green}; Blue ${aggregate.territory.capturesBySide.blue}; AI ${aggregate.territory.capturesBySide.ai}`,
    `Players: ${aggregate.players.registeredProfiles} registered; ${aggregate.players.uniqueParticipants} unique participants; ${aggregate.players.uniqueSubmitters} unique order submitters; ${aggregate.players.totalParticipations} total participations`,
    `Player progression: ${aggregate.players.totalXp} total XP; ${formatNumber(aggregate.players.averageXp)} average XP; maximum streak ${aggregate.players.maximumStreak}`,
    `XP distribution: ${renderNumericDistribution(aggregate.players.xpDistribution)}`,
    `Streak distribution: ${renderNumericDistribution(aggregate.players.streakDistribution)}`,
    '',
    'PUBLIC TOP PLAYERS',
    ...(leaders.length > 0 ? leaders : ['No public Reddit usernames were available.']),
    '',
    'VERIFIED DAY-BY-DAY FACTS',
    ...(dayFacts.length > 0 ? dayFacts : ['No resolved days were supplied.']),
  ].join('\n');
}

export function renderCampaignMarkdownSections(
  aggregate: CampaignAggregate,
  narrative?: string,
): CampaignMarkdownSections {
  return {
    summary: renderCampaignSummaryMarkdown(aggregate, narrative),
    leaderboard: renderCampaignLeaderboardMarkdown(aggregate),
    timeline: renderCampaignTimelineMarkdown(aggregate),
  };
}

export function renderCampaignSummaryMarkdown(aggregate: CampaignAggregate, narrative?: string): string {
  const safeNarrative = narrative?.trim() ||
    `${sideLabel(aggregate.winner)} secured the campaign after ${aggregate.resolvedDays} resolved days.`;
  const rankDistribution = renderDistribution(aggregate.players.rankDistribution);
  const xpDistribution = renderNumericDistribution(aggregate.players.xpDistribution);
  const streakDistribution = renderNumericDistribution(aggregate.players.streakDistribution);
  const medalFrequency = renderDistribution(aggregate.players.medalFrequency);
  const doctrineLines = BATTLE_SIDES.map((side) => {
    const deployments = DOCTRINE_IDS
      .map((doctrine) => `${doctrine} ${aggregate.doctrineUsage[side][doctrine]}`)
      .join(', ');
    return `- **${sideLabel(side)}:** ${deployments}`;
  });

  return [
    '## Campaign epilogue',
    safeNarrative,
    '## Verified campaign summary',
    `**Winner:** ${sideLabel(aggregate.winner)}  \n**Completed:** ${escapeMarkdown(formatReportDate(aggregate.completedAt))}  \n**Resolved days:** ${aggregate.resolvedDays}`,
    `**Day victories:** Green ${aggregate.winnerCounts.green} · Blue ${aggregate.winnerCounts.blue} · AI ${aggregate.winnerCounts.ai} · Humanity ${aggregate.winnerCounts.humanity} · Draws ${aggregate.winnerCounts.contested}`,
    `**Territory record:** ${aggregate.territory.captures} captures · ${aggregate.territory.recaptures} recaptures · ${aggregate.territory.holds} holds · ${aggregate.territory.draws} draws`,
    `**Territory gains by side:** Green ${aggregate.territory.capturesBySide.green} · Blue ${aggregate.territory.capturesBySide.blue} · AI ${aggregate.territory.capturesBySide.ai}`,
    `**Players:** ${aggregate.players.registeredProfiles} registered · ${aggregate.players.uniqueParticipants} unique participants · ${aggregate.players.uniqueSubmitters} unique submitters · ${aggregate.players.totalParticipations} participations · ${aggregate.players.totalOrders} orders`,
    `**Progression:** ${aggregate.players.totalXp} total XP · ${formatNumber(aggregate.players.averageXp)} average XP · ${aggregate.players.maximumXp} maximum XP · ${formatNumber(aggregate.players.averageStreak)} average streak · ${aggregate.players.maximumStreak} maximum streak`,
    `**Rank distribution:** ${rankDistribution}`,
    `**XP distribution:** ${xpDistribution}`,
    `**Streak distribution:** ${streakDistribution}`,
    `**Medals:** ${medalFrequency}`,
    '### Doctrine deployments',
    doctrineLines.join('\n'),
  ].join('\n\n');
}

export function renderCampaignLeaderboardMarkdown(aggregate: CampaignAggregate): string {
  const entries = aggregate.leaderboard.map((player) => {
    const medals = player.medals.length > 0
      ? player.medals.map(escapeMarkdown).join(', ')
      : 'None';
    return `${player.position}. **u/${escapeMarkdown(player.username)}** — ${player.xp} XP · ${player.victories} victories · ${player.participatedEvents} events · ${escapeMarkdown(player.rank)} · streak ${player.streak} · medals: ${medals}`;
  });

  return [
    '## Top 100 players',
    ...(entries.length > 0 ? entries : ['No public Reddit usernames were available.']),
  ].join('\n\n');
}

export function renderCampaignTimelineMarkdown(aggregate: CampaignAggregate): string {
  const days = aggregate.timeline.map((day) => {
    const dailyPost = day.postPermalink
      ? ` · [Daily post](${day.postPermalink})`
      : '';
    return [
      `### Day ${day.day} — ${escapeMarkdown(day.date)}`,
      `**${escapeMarkdown(day.territoryName)}** [${day.x}, ${day.y}] · ${ownerLabel(day.previousOwner)} → ${ownerLabel(day.newOwner)} · ${outcomeLabel(day.outcome)} · Winner: ${winnerLabel(day.winner)}${dailyPost}  \nDoctrines: Green ${day.doctrines.green}, Blue ${day.doctrines.blue}, AI ${day.doctrines.ai}  \nScores: Green ${formatNumber(day.scores.green)}, Blue ${formatNumber(day.scores.blue)}, AI ${formatNumber(day.scores.ai)} · Participants: ${day.participants} · Orders: ${day.submitters}`,
    ].join('\n');
  });

  return [
    '## Full day-by-day timeline',
    ...(days.length > 0 ? days : ['No resolved days were supplied.']),
  ].join('\n\n');
}

export function createCampaignReportPublication(
  aggregate: CampaignAggregate,
  narrative?: string,
  limits?: CampaignMarkdownLimits,
): CampaignReportPublication {
  const title = `Humans vs AI — Campaign Final Report — ${sideLabel(aggregate.winner)} — ${formatReportDate(aggregate.completedAt)}`;
  const sections = renderCampaignMarkdownSections(aggregate, narrative);
  const fullBody = [sections.summary, sections.leaderboard, sections.timeline].join('\n\n');
  const split = splitMarkdownAtParagraphBoundaries(fullBody, limits);

  return {
    title,
    narrativePrompt: createCampaignNarrativePrompt(aggregate),
    sections,
    mainBody: split.mainBody,
    appendixBodies: split.appendixBodies,
  };
}

export function splitMarkdownAtParagraphBoundaries(
  markdown: string,
  limits: CampaignMarkdownLimits = {},
): { mainBody: string; appendixBodies: readonly string[] } {
  const mainLimit = normalizeLimit(limits.main, CAMPAIGN_REPORT_MAIN_LIMIT);
  const appendixLimit = normalizeLimit(limits.appendix, CAMPAIGN_REPORT_APPENDIX_LIMIT);
  const paragraphLimit = Math.min(mainLimit, appendixLimit);
  const paragraphs = splitIntoParagraphs(markdown, paragraphLimit);
  const main = takeChunk(paragraphs, mainLimit, 0);
  const appendixBodies: string[] = [];
  let cursor = main.nextIndex;

  while (cursor < paragraphs.length) {
    const appendix = takeChunk(paragraphs, appendixLimit, cursor);
    if (appendix.nextIndex === cursor) break;
    appendixBodies.push(appendix.body);
    cursor = appendix.nextIndex;
  }

  return {
    mainBody: main.body,
    appendixBodies,
  };
}

function getUniqueResolvedBattles(
  battles: readonly CampaignResolvedBattleSnapshot[],
): CampaignResolvedBattleSnapshot[] {
  const sorted = [...battles].sort((left, right) =>
    compareText(left.battleDate, right.battleDate) || compareText(left.id, right.id),
  );
  const seen = new Set<string>();
  const seenDates = new Set<string>();

  return sorted.filter((battle) => {
    if (seen.has(battle.id) || seenDates.has(battle.battleDate)) return false;
    seen.add(battle.id);
    seenDates.add(battle.battleDate);
    return true;
  });
}

function indexCaptures(
  captures: readonly TerritoryCaptureRecord[],
  battleIds: ReadonlySet<string>,
): Map<string, TerritoryCaptureRecord[]> {
  const capturesByBattleId = new Map<string, TerritoryCaptureRecord[]>();

  for (const capture of captures) {
    if (!battleIds.has(capture.battleId)) continue;
    const existing = capturesByBattleId.get(capture.battleId) ?? [];
    existing.push(capture);
    capturesByBattleId.set(capture.battleId, existing);
  }
  for (const existing of capturesByBattleId.values()) {
    existing.sort((left, right) =>
      compareText(left.capturedAt, right.capturedAt) || compareText(left.id, right.id),
    );
  }

  return capturesByBattleId;
}

function chooseCapture(
  captures: readonly TerritoryCaptureRecord[] | undefined,
  result: BattleResultView,
): TerritoryCaptureRecord | undefined {
  if (!captures || captures.length === 0) return undefined;
  return captures.find((capture) => capture.territoryId === result.activeTerritoryAfter.id) ?? captures[0];
}

function getTerritoryTransition(
  result: BattleResultView,
  capture: TerritoryCaptureRecord | undefined,
) {
  return {
    x: capture?.x ?? result.activeTerritoryAfter.x,
    y: capture?.y ?? result.activeTerritoryAfter.y,
    previousOwner: capture?.previousOwner ?? result.activeTerritoryBefore.owner,
    newOwner: capture?.newOwner ?? result.activeTerritoryAfter.owner,
    ownershipChanged: capture?.ownershipChanged ??
      result.activeTerritoryBefore.owner !== result.activeTerritoryAfter.owner,
  };
}

function getTerritoryOutcome(
  winner: BattleWinner,
  transition: ReturnType<typeof getTerritoryTransition>,
): CampaignDayTimelineEntry['outcome'] {
  if (winner === 'contested') return 'draw';
  if (!transition.ownershipChanged) return 'hold';
  if (transition.previousOwner !== 'contested' && transition.newOwner !== 'contested') {
    return 'recapture';
  }
  return 'capture';
}

function createWinnerCounts(): CampaignWinnerCounts {
  return { green: 0, blue: 0, ai: 0, humanity: 0, contested: 0 };
}

function createDoctrineUsage(): Record<BattleSide, Record<DoctrineId, number>> {
  const empty = () => Object.fromEntries(
    DOCTRINE_IDS.map((doctrine) => [doctrine, 0]),
  ) as Record<DoctrineId, number>;
  return { green: empty(), blue: empty(), ai: empty() };
}

function createTerritoryStatistics(): CampaignTerritoryStatistics {
  return {
    captures: 0,
    holds: 0,
    draws: 0,
    recaptures: 0,
    capturesBySide: { green: 0, blue: 0, ai: 0 },
  };
}

function applyTerritoryOutcome(
  statistics: CampaignTerritoryStatistics,
  outcome: CampaignDayTimelineEntry['outcome'],
  newOwner: TerritoryOwner,
) {
  if (outcome === 'draw') statistics.draws += 1;
  if (outcome === 'hold') statistics.holds += 1;
  if (outcome === 'capture' || outcome === 'recapture') {
    statistics.captures += 1;
    if (newOwner !== 'contested') statistics.capturesBySide[newOwner] += 1;
  }
  if (outcome === 'recapture') statistics.recaptures += 1;
}

function getUniqueEventUsers<T extends { battleId: string; userId: string }>(
  records: readonly T[],
  battleIds: ReadonlySet<string>,
): T[] {
  const sorted = [...records]
    .filter((record) => battleIds.has(record.battleId))
    .sort((left, right) =>
      compareText(left.battleId, right.battleId) || compareText(left.userId, right.userId),
    );
  const seen = new Set<string>();

  return sorted.filter((record) => {
    const key = `${record.battleId}\u0000${record.userId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countEventUsers(records: readonly { battleId: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.battleId, (counts.get(record.battleId) ?? 0) + 1);
  return counts;
}

function getUniquePlayers(players: readonly CampaignPlayerSnapshot[]): CampaignPlayerSnapshot[] {
  const sorted = [...players].sort((left, right) => compareText(left.userId, right.userId));
  const seen = new Set<string>();
  return sorted.filter((player) => {
    if (seen.has(player.userId)) return false;
    seen.add(player.userId);
    return true;
  });
}

function createLeaderboard(players: readonly CampaignPlayerSnapshot[]): CampaignLeaderboardEntry[] {
  const candidates = players.flatMap((player) => {
    const username = normalizeRedditUsername(player.redditUsername);
    if (!username) return [];
    return [{
      username,
      xp: nonNegativeCount(player.rewards.xp),
      victories: nonNegativeCount(player.progression.totalVictories),
      participatedEvents: nonNegativeCount(player.progression.totalParticipatedEvents),
      rank: normalizeLabel(player.rewards.rank, 'Unranked'),
      streak: nonNegativeCount(player.rewards.streak),
      medals: getUniqueLabels(player.rewards.medals),
    }];
  });
  candidates.sort(compareLeaderboardCandidates);

  const seenUsernames = new Set<string>();
  return candidates
    .filter((candidate) => {
      const key = candidate.username.toLowerCase();
      if (seenUsernames.has(key)) return false;
      seenUsernames.add(key);
      return true;
    })
    .slice(0, 100)
    .map((candidate, index) => ({ ...candidate, position: index + 1 }));
}

function compareLeaderboardCandidates(
  left: Omit<CampaignLeaderboardEntry, 'position'>,
  right: Omit<CampaignLeaderboardEntry, 'position'>,
) {
  return right.xp - left.xp ||
    right.victories - left.victories ||
    right.participatedEvents - left.participatedEvents ||
    compareText(left.username.toLowerCase(), right.username.toLowerCase()) ||
    compareText(left.username, right.username);
}

function createPlayerStatistics(input: {
  players: readonly CampaignPlayerSnapshot[];
  participants: readonly CampaignParticipantSnapshot[];
  orders: readonly CampaignOrderSnapshot[];
}): CampaignPlayerStatistics {
  const xpValues = input.players.map((player) => nonNegativeCount(player.rewards.xp));
  const streakValues = input.players.map((player) => nonNegativeCount(player.rewards.streak));
  const totalXp = sum(xpValues);

  return {
    registeredProfiles: input.players.length,
    uniqueParticipants: new Set(input.participants.map((participant) => participant.userId)).size,
    uniqueSubmitters: new Set(input.orders.map((order) => order.userId)).size,
    totalParticipations: input.participants.length,
    totalOrders: input.orders.length,
    totalXp,
    averageXp: roundToTwo(input.players.length === 0 ? 0 : totalXp / input.players.length),
    maximumXp: Math.max(0, ...xpValues),
    averageStreak: roundToTwo(input.players.length === 0 ? 0 : sum(streakValues) / input.players.length),
    maximumStreak: Math.max(0, ...streakValues),
    rankDistribution: countLabels(input.players.map((player) => normalizeLabel(player.rewards.rank, 'Unranked'))),
    xpDistribution: countNumbers(xpValues),
    streakDistribution: countNumbers(streakValues),
    medalFrequency: countLabels(input.players.flatMap((player) => getUniqueLabels(player.rewards.medals))),
  };
}

function countLabels(labels: readonly string[]): CampaignDistributionEntry[] {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || compareText(left.label, right.label));
}

function countNumbers(values: readonly number[]): CampaignNumericDistributionEntry[] {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value - right.value);
}

function getUniqueLabels(labels: readonly string[]): string[] {
  return [...new Set(labels.map((label) => label.trim()).filter(Boolean))].sort(compareText);
}

function renderDistribution(entries: readonly CampaignDistributionEntry[]): string {
  if (entries.length === 0) return 'None';
  return entries.map((entry) => `${escapeMarkdown(entry.label)} ${entry.count}`).join(' · ');
}

function renderNumericDistribution(entries: readonly CampaignNumericDistributionEntry[]): string {
  if (entries.length === 0) return 'None';
  return entries.map((entry) => `${entry.value}: ${entry.count}`).join(' · ');
}

function splitIntoParagraphs(markdown: string, limit: number): string[] {
  const source = markdown.replace(/\r\n?/g, '\n').trim();
  if (!source) return [];
  return source
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => splitOversizedParagraph(paragraph, limit));
}

function splitOversizedParagraph(paragraph: string, limit: number): string[] {
  const parts: string[] = [];
  let remaining = paragraph;

  while (remaining.length > limit) {
    const slice = remaining.slice(0, limit + 1);
    let splitAt = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
    if (splitAt < Math.floor(limit * 0.5)) splitAt = safeSliceIndex(remaining, limit);
    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

function takeChunk(paragraphs: readonly string[], limit: number, startIndex: number) {
  const accepted: string[] = [];
  let length = 0;
  let index = startIndex;

  while (index < paragraphs.length) {
    const paragraph = paragraphs[index];
    if (!paragraph) {
      index += 1;
      continue;
    }
    const nextLength = length + (accepted.length > 0 ? 2 : 0) + paragraph.length;
    if (nextLength > limit) break;
    accepted.push(paragraph);
    length = nextLength;
    index += 1;
  }

  return { body: accepted.join('\n\n'), nextIndex: index };
}

function normalizeLimit(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || value === undefined || value < 1) return fallback;
  return Math.floor(value);
}

function safeSliceIndex(value: string, requestedIndex: number) {
  if (requestedIndex <= 1) return requestedIndex;
  const code = value.charCodeAt(requestedIndex - 1);
  return code >= 0xd800 && code <= 0xdbff ? requestedIndex - 1 : requestedIndex;
}

function normalizeRedditUsername(value: string | undefined) {
  const username = value?.trim().replace(/^\/?u\//iu, '');
  if (!username || !/^[A-Za-z0-9_-]+$/u.test(username)) return undefined;
  return username;
}

function normalizeLabel(value: string, fallback: string) {
  return value.trim() || fallback;
}

function getPublicPermalink(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function formatReportDate(value: string) {
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/u.test(date) ? date : value;
}

function sideLabel(side: BattleSide) {
  if (side === 'green') return 'Green Army';
  if (side === 'blue') return 'Blue Army';
  return 'AI';
}

function winnerLabel(winner: BattleWinner) {
  if (winner === 'humanity') return 'Humanity';
  if (winner === 'contested') return 'Draw';
  return sideLabel(winner);
}

function ownerLabel(owner: TerritoryOwner) {
  if (owner === 'contested') return 'Unoccupied';
  return sideLabel(owner);
}

function outcomeLabel(outcome: CampaignDayTimelineEntry['outcome']) {
  if (outcome === 'recapture') return 'Recapture';
  if (outcome === 'capture') return 'Capture';
  if (outcome === 'hold') return 'Hold';
  return 'Draw';
}

function escapeMarkdown(value: string) {
  const specialCharacters = '\\`*_{}[]()#+.!|>-';
  return [...value]
    .map((character) => specialCharacters.includes(character) ? `\\${character}` : character)
    .join('');
}

function finiteNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function nonNegativeCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(roundToTwo(value));
}

function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function compareText(left: string, right: string) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
