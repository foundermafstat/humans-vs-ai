import {
  DOCTRINE_IDS,
  type CommentSignalView,
  type DivisionTarget,
  type DoctrineId,
} from '../../shared/api';

export type CommentSignalInput = {
  branch: DivisionTarget;
  body: string;
  score: number;
};

const DOCTRINE_KEYWORDS: Record<DoctrineId, readonly string[]> = {
  STRIKE: ['strike', 'assault', 'attack', 'rush', 'frontal', 'push'],
  HACK: ['hack', 'exploit', 'backdoor', 'scan', 'control', 'bypass'],
  VIRUS: ['virus', 'infect', 'corrupt', 'replicate', 'payload', 'malware'],
  PHANTOM: ['phantom', 'stealth', 'silent', 'hidden', 'cloak', 'ghost'],
  SHIELD: ['shield', 'defend', 'hold', 'firewall', 'wall', 'block'],
  OVERLOAD: ['overload', 'ddos', 'swarm', 'spam', 'flood', 'traffic'],
  TRAP: ['trap', 'ambush', 'honeypot', 'bait', 'snare', 'quarantine'],
};

const DECEPTION_KEYWORDS = ['fake', 'decoy', 'mislead', 'bait', 'lie', 'noise', 'mask'];
const SPY_KEYWORDS = ['spy', 'agent', 'traitor', 'sabotage', 'suspicious'];

export function createEmptyCommentSignal(branch: DivisionTarget, updatedAt = new Date().toISOString()): CommentSignalView {
  return {
    branch,
    doctrineMentions: {},
    noiseScore: 0,
    deceptionScore: 0,
    scoreAggregate: 0,
    updatedAt,
  };
}

export function aggregateCommentSignals(
  branch: DivisionTarget,
  comments: readonly CommentSignalInput[],
  updatedAt = new Date().toISOString(),
): CommentSignalView {
  const doctrineMentions: Partial<Record<DoctrineId, number>> = {};
  let noiseScore = 0;
  let deceptionScore = 0;
  let scoreAggregate = 0;

  for (const comment of comments) {
    const body = comment.body.toLowerCase();
    const scoreWeight = Math.max(0, Math.min(6, Math.log1p(Math.max(0, comment.score))));
    scoreAggregate += scoreWeight;

    for (const doctrineId of DOCTRINE_IDS) {
      const mentions = countKeywordHits(body, DOCTRINE_KEYWORDS[doctrineId]);
      if (mentions > 0) {
        doctrineMentions[doctrineId] = (doctrineMentions[doctrineId] ?? 0) + mentions;
      }
    }

    deceptionScore += countKeywordHits(body, DECEPTION_KEYWORDS);
    noiseScore += Math.max(0, body.split(/\s+/).length - 28) / 10;
    noiseScore += countKeywordHits(body, SPY_KEYWORDS) * 0.75;
  }

  return {
    branch,
    topDoctrineId: getTopDoctrineId(doctrineMentions),
    doctrineMentions,
    noiseScore: Math.round(noiseScore * 10) / 10,
    deceptionScore: Math.round(deceptionScore * 10) / 10,
    scoreAggregate: Math.round(scoreAggregate * 10) / 10,
    updatedAt,
  };
}

export function getCommentSignalScore(signal: CommentSignalView, doctrineId: DoctrineId) {
  const doctrineMentions = signal.doctrineMentions[doctrineId] ?? 0;
  const publicLeakPenalty = signal.topDoctrineId === doctrineId ? Math.min(8, doctrineMentions * 2) : 0;
  const usefulNoise = Math.min(8, signal.noiseScore + signal.deceptionScore);
  const reputation = Math.min(5, signal.scoreAggregate / 2);

  return Math.round((usefulNoise + reputation - publicLeakPenalty) * 10) / 10;
}

export function getAiAwareness(signal: CommentSignalView, doctrineId: DoctrineId, spyLeak = 0) {
  const doctrineMentions = signal.doctrineMentions[doctrineId] ?? 0;
  const leak = Math.min(42, doctrineMentions * 9);
  const noiseReduction = Math.min(25, signal.noiseScore * 2 + signal.deceptionScore * 3);
  const awareness = 28 + leak + spyLeak - noiseReduction;

  return Math.max(0, Math.min(100, Math.round(awareness)));
}

function getTopDoctrineId(mentions: Partial<Record<DoctrineId, number>>) {
  let topDoctrineId: DoctrineId | undefined;
  let topMentions = 0;

  for (const doctrineId of DOCTRINE_IDS) {
    const count = mentions[doctrineId] ?? 0;
    if (count > topMentions) {
      topDoctrineId = doctrineId;
      topMentions = count;
    }
  }

  return topDoctrineId;
}

function countKeywordHits(body: string, keywords: readonly string[]) {
  let count = 0;

  for (const keyword of keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = body.match(new RegExp(`\\b${escaped}\\b`, 'g'));
    count += matches?.length ?? 0;
  }

  return count;
}
