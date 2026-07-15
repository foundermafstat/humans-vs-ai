import {
  DOCTRINE_IDS,
  type ArmyColor,
  type BattleResultView,
  type BattleScoreBreakdown,
  type BattleSide,
  type BattleWinner,
  type CommentSignalView,
  type DoctrineId,
  type DoctrineOrder,
  type TerritoryView,
} from '../../shared/api';
import { getCommentSignalScore, getAiAwareness } from './commentSignals';
import { getDoctrineMatchup } from './doctrines';
import { applyTerritoryWinner } from './territories';

export type ResolveBattleInput = {
  battleId: string;
  battleDate: string;
  activeTerritory: TerritoryView;
  orders: readonly DoctrineOrder[];
  commentSignals: Record<ArmyColor, CommentSignalView>;
  spyInfluence: Record<ArmyColor, number>;
  seed: string;
};

const DEFAULT_DOCTRINES: Record<BattleSide, DoctrineId> = {
  green: 'SHIELD',
  blue: 'HACK',
  ai: 'OVERLOAD',
};

export function resolveBattle(input: ResolveBattleInput): BattleResultView {
  const greenDoctrine = getDominantDoctrine(input.orders, 'green', input.seed) ?? DEFAULT_DOCTRINES.green;
  const blueDoctrine = getDominantDoctrine(input.orders, 'blue', input.seed) ?? DEFAULT_DOCTRINES.blue;
  const greenAwareness = getAiAwareness(input.commentSignals.green, greenDoctrine);
  const blueAwareness = getAiAwareness(input.commentSignals.blue, blueDoctrine);
  const aiDoctrine = chooseAiDoctrine({
    seed: input.seed,
    greenDoctrine,
    blueDoctrine,
    greenAwareness,
    blueAwareness,
  });

  const greenScores = createSideScore({
    side: 'green',
    doctrine: greenDoctrine,
    opposingHumanDoctrine: blueDoctrine,
    aiDoctrine,
    orders: input.orders,
    commentSignal: input.commentSignals.green,
    aiAwareness: greenAwareness,
    spyInfluence: input.spyInfluence.green,
  });
  const blueScores = createSideScore({
    side: 'blue',
    doctrine: blueDoctrine,
    opposingHumanDoctrine: greenDoctrine,
    aiDoctrine,
    orders: input.orders,
    commentSignal: input.commentSignals.blue,
    aiAwareness: blueAwareness,
    spyInfluence: input.spyInfluence.blue,
  });
  const aiScores = createAiScore({
    aiDoctrine,
    greenDoctrine,
    blueDoctrine,
    greenAwareness,
    blueAwareness,
  });
  const winner = selectWinner({
    green: greenScores.total,
    blue: blueScores.total,
    ai: aiScores.total,
  });
  const activeTerritoryAfter = applyTerritoryWinner(input.activeTerritory, winner);

  return {
    winner,
    activeTerritoryBefore: input.activeTerritory,
    activeTerritoryAfter,
    doctrines: {
      green: greenDoctrine,
      blue: blueDoctrine,
      ai: aiDoctrine,
    },
    scores: {
      green: greenScores,
      blue: blueScores,
      ai: aiScores,
    },
    commentSignals: input.commentSignals,
    aiAwareness: {
      green: greenAwareness,
      blue: blueAwareness,
    },
    spyInfluence: {
      green: input.spyInfluence.green,
      blue: input.spyInfluence.blue,
    },
    reportText: createReportText({
      battleDate: input.battleDate,
      territory: activeTerritoryAfter,
      winner,
      greenDoctrine,
      blueDoctrine,
      aiDoctrine,
      greenScores,
      blueScores,
      aiScores,
      greenAwareness,
      blueAwareness,
    }),
  };
}

export function getDominantDoctrine(
  orders: readonly DoctrineOrder[],
  army: ArmyColor,
  battleSeed: string = army,
) {
  const counts: Partial<Record<DoctrineId, number>> = {};

  for (const order of orders) {
    if (order.army !== army) continue;
    counts[order.doctrineId] = (counts[order.doctrineId] ?? 0) + 1;
  }

  const dominantCount = Math.max(...DOCTRINE_IDS.map((doctrineId) => counts[doctrineId] ?? 0));
  if (dominantCount === 0) return undefined;

  const tiedDoctrines = DOCTRINE_IDS.filter(
    (doctrineId) => (counts[doctrineId] ?? 0) === dominantCount,
  );
  const tieIndex = hashString(`${battleSeed}:${army}:doctrine-tie`) % tiedDoctrines.length;

  return tiedDoctrines[tieIndex];
}

function chooseAiDoctrine(input: {
  seed: string;
  greenDoctrine: DoctrineId;
  blueDoctrine: DoctrineId;
  greenAwareness: number;
  blueAwareness: number;
}) {
  const targetDoctrine = input.greenAwareness >= input.blueAwareness ? input.greenDoctrine : input.blueDoctrine;
  const counter = DOCTRINE_IDS.find((doctrineId) => getDoctrineMatchup(doctrineId, targetDoctrine).outcome === 'win');
  const awareness = Math.max(input.greenAwareness, input.blueAwareness);
  const seedIndex = hashString(input.seed) % DOCTRINE_IDS.length;

  if (awareness >= 70 && counter) return counter;
  if (awareness >= 42 && counter && seedIndex % 2 === 0) return counter;

  return DOCTRINE_IDS[seedIndex] ?? DEFAULT_DOCTRINES.ai;
}

function createSideScore(input: {
  side: ArmyColor;
  doctrine: DoctrineId;
  opposingHumanDoctrine: DoctrineId;
  aiDoctrine: DoctrineId;
  orders: readonly DoctrineOrder[];
  commentSignal: CommentSignalView;
  aiAwareness: number;
  spyInfluence: number;
}): BattleScoreBreakdown {
  const aiMatchup = getDoctrineMatchup(input.doctrine, input.aiDoctrine);
  const humanMatchup = getDoctrineMatchup(input.doctrine, input.opposingHumanDoctrine);
  const doctrineScore = getMatchupScore(aiMatchup.outcome) + Math.round(getMatchupScore(humanMatchup.outcome) * 0.35);
  const orderCount = input.orders.filter((order) => order.army === input.side).length;
  const orderParticipationScore = Math.min(16, orderCount * 4);
  const commentSignalScore = getCommentSignalScore(input.commentSignal, input.doctrine);
  const aiAwarenessModifier = Math.round(-Math.min(15, input.aiAwareness / 7));
  const spyScore = Math.max(-12, Math.min(8, input.spyInfluence));
  const momentumScore = orderCount > 0 ? 3 : 0;
  const total = Math.round(
    doctrineScore +
    orderParticipationScore +
    commentSignalScore +
    aiAwarenessModifier +
    spyScore +
    momentumScore,
  );

  return {
    doctrineScore,
    orderParticipationScore,
    commentSignalScore,
    aiAwarenessModifier,
    spyScore,
    momentumScore,
    total,
  };
}

function createAiScore(input: {
  aiDoctrine: DoctrineId;
  greenDoctrine: DoctrineId;
  blueDoctrine: DoctrineId;
  greenAwareness: number;
  blueAwareness: number;
}): BattleScoreBreakdown {
  const greenMatchup = getDoctrineMatchup(input.aiDoctrine, input.greenDoctrine);
  const blueMatchup = getDoctrineMatchup(input.aiDoctrine, input.blueDoctrine);
  const doctrineScore = getMatchupScore(greenMatchup.outcome) + getMatchupScore(blueMatchup.outcome);
  const aiAwarenessModifier = Math.min(18, Math.round((input.greenAwareness + input.blueAwareness) / 10));
  const total = doctrineScore + aiAwarenessModifier;

  return {
    doctrineScore,
    orderParticipationScore: 0,
    commentSignalScore: 0,
    aiAwarenessModifier,
    spyScore: 0,
    momentumScore: 0,
    total,
  };
}

function selectWinner(scores: Record<BattleSide, number>): BattleWinner {
  const sorted = Object.entries(scores).sort(([, left], [, right]) => right - left) as Array<[BattleSide, number]>;
  const [first, second] = sorted;
  if (!first || !second) return 'contested';
  if (first[1] - second[1] <= 3) return 'contested';

  return first[0];
}

function getMatchupScore(outcome: 'win' | 'loss' | 'draw') {
  if (outcome === 'win') return 24;
  if (outcome === 'loss') return -18;

  return 2;
}

function createReportText(input: {
  battleDate: string;
  territory: TerritoryView;
  winner: BattleWinner;
  greenDoctrine: DoctrineId;
  blueDoctrine: DoctrineId;
  aiDoctrine: DoctrineId;
  greenScores: BattleScoreBreakdown;
  blueScores: BattleScoreBreakdown;
  aiScores: BattleScoreBreakdown;
  greenAwareness: number;
  blueAwareness: number;
}) {
  const winnerLabel = input.winner === 'contested' ? 'Contested territory' : `${input.winner.toUpperCase()} wins`;

  return [
    `BATTLE REPORT // ${input.battleDate}`,
    `${winnerLabel} at ${input.territory.name}.`,
    `Doctrines: Green ${input.greenDoctrine}, Blue ${input.blueDoctrine}, AI ${input.aiDoctrine}.`,
    `Scores: Green ${input.greenScores.total}, Blue ${input.blueScores.total}, AI ${input.aiScores.total}.`,
    `AI Awareness: Green ${input.greenAwareness}, Blue ${input.blueAwareness}.`,
  ].join(' ');
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
