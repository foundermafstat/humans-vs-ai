export type InitResponse = {
  type: "init";
  postId: string;
  count: number;
  username: string;
};

export type BattleView = "promo" | "countdown" | "summary";

export type BattleStatus = "active" | "resolved";

export type ArmyColor = "green" | "blue";

export type DivisionTarget = "green" | "blue";

export type BattleSide = ArmyColor | "ai";

export type TerritoryOwner = BattleSide | "contested";

export type BattleWinner = BattleSide | "humanity" | "contested";

export const DOCTRINE_IDS = [
  "STRIKE",
  "HACK",
  "VIRUS",
  "PHANTOM",
  "SHIELD",
  "OVERLOAD",
  "TRAP",
] as const;

export type DoctrineId = (typeof DOCTRINE_IDS)[number];

export const MVP_GAME_LOOP_STEPS = [
  "daily-battle",
  "join-army",
  "choose-hidden-doctrine",
  "war-room-comments",
  "comment-signal-aggregation",
  "ai-awareness-counter-pick",
  "spy-influence",
  "doctrine-based-resolution",
  "territory-and-progression-update",
  "battle-report-and-rewards",
] as const;

export type MvpGameLoopStep = (typeof MVP_GAME_LOOP_STEPS)[number];

export type DoctrineOrder = {
  battleId: string;
  army: ArmyColor;
  doctrineId: DoctrineId;
  submittedAt: string;
};

export type OrderRequest = {
  doctrineId: DoctrineId;
};

export type PlayerBattleState = {
  exists: boolean;
  army?: ArmyColor;
  order?: DoctrineOrder;
  spyOffer?: SpyOfferView;
  rewards?: RewardSummary;
};

export type OrderResponse = {
  type: "order";
  order: DoctrineOrder;
  player: PlayerBattleState;
};

export type SpyResponseRequest = {
  accept: boolean;
};

export type SpyOfferView = {
  offered: boolean;
  accepted?: boolean;
  objective?: string;
  targetDoctrineHint?: DoctrineId;
};

export type SpyResponse = {
  type: "spy-response";
  spyOffer: SpyOfferView;
};

export type TerritoryView = {
  id: string;
  name: string;
  owner: TerritoryOwner;
  x: number;
  y: number;
};

export type CommentSignalView = {
  branch: DivisionTarget;
  topDoctrineId?: DoctrineId;
  doctrineMentions: Partial<Record<DoctrineId, number>>;
  noiseScore: number;
  deceptionScore: number;
  scoreAggregate: number;
  updatedAt: string;
};

export type RewardSummary = {
  xp: number;
  rank: string;
  medals: readonly string[];
  streak: number;
};

export type BattleScoreBreakdown = {
  doctrineScore: number;
  orderParticipationScore: number;
  commentSignalScore: number;
  aiAwarenessModifier: number;
  spyScore: number;
  momentumScore: number;
  total: number;
};

export type BattleResultView = {
  winner: BattleWinner;
  activeTerritoryBefore: TerritoryView;
  activeTerritoryAfter: TerritoryView;
  doctrines: {
    green: DoctrineId;
    blue: DoctrineId;
    ai: DoctrineId;
  };
  scores: Record<BattleSide, BattleScoreBreakdown>;
  commentSignals: Record<DivisionTarget, CommentSignalView>;
  aiAwareness: Record<DivisionTarget, number>;
  spyInfluence: Record<DivisionTarget, number>;
  rewards: Partial<Record<ArmyColor, RewardSummary>>;
  reportText: string;
};

export type BootstrapBattle = {
  id: string;
  battleDate: string;
  status: BattleStatus;
  postId: string;
  postPermalink: string;
  resolvesAt: string;
  secondsUntilResolve: number;
  activeTerritory?: TerritoryView;
  result?: BattleResultView;
  resultSummary?: string;
};

export type BootstrapResponse = {
  type: "bootstrap";
  serverNow: string;
  view: BattleView;
  user: PlayerBattleState;
  battle?: BootstrapBattle;
};

export type PlayerJoinResponse = {
  type: "player-join";
  user: {
    exists: true;
  };
};

export type AiReportResponse = {
  type: "ai-report";
  message: string;
  commentPermalink: string;
};

export type DivisionCommentAnalysisResponse = {
  type: "division-comment-analysis";
  target: DivisionTarget;
  message: string;
  commentPermalink: string;
};

export type IncrementResponse = {
  type: "increment";
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: "decrement";
  postId: string;
  count: number;
};

export const DEV_GREEN_PROFILE = {
  publicFlair: "🟢 Green Tribe · Infantry · 🏅🎖️",
  passportLines: [
    "Full Tribal Passport:",
    "- Tribe: Green Tribe",
    "- Rank: Infantry",
    "- Class: Shield Doctrine",
    "- Medals: 17",
    "- Rare medals:",
    "  🏅 First Blood",
    "  🧠 AI Whisperer",
    "  🛡️ Shield Wall Survivor",
    "  🕵️ Spy Detected",
  ],
} as const;

export const DEV_USER_COMMENT_TEXT = {
  green: "Green HQ check-in: I am joining the shield line for humanity.",
  blue: "Blue HQ check-in: I am reporting for coordinated defense.",
} as const;

export type DevThreadTarget = "ai" | "green" | "blue";

export type DevWarRoomState = {
  postId: string;
  postPermalink: string;
  indexCommentId: string;
  indexPermalink: string;
  threadIds: Record<DevThreadTarget, string>;
  threadPermalinks: Record<DevThreadTarget, string>;
  createdAt: string;
};

export type DevStateResponse = {
  type: "dev-state";
  postId: string;
  subredditName: string;
  publicFlair: string;
  passportLines: readonly string[];
  warRoom?: DevWarRoomState;
};

export type DevActionResponse = {
  type: "dev-action";
  message: string;
  publicFlair: string;
  passportLines: readonly string[];
  warRoom?: DevWarRoomState;
  navigateUrl?: string;
  commentPermalink?: string;
};
