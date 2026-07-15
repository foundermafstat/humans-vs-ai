export type InitResponse = {
  type: "init";
  postId: string;
  count: number;
  username: string;
};

export type BattleView = "promo" | "countdown" | "summary";

export type BattleStatus = "active" | "resolved";

export type ArmyColor = "green" | "blue";

export type GlobalAffiliation = "gray";

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
  "join-and-balanced-assignment",
  "temporary-team-or-cover-flair",
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
  sourceCommentId: string;
  sourceCommentPermalink?: string;
  submittedAt: string;
};

export type OrderRequest = {
  doctrineId: DoctrineId;
  sourceCommentId: string;
};

export type EligibleCommentView = {
  id: string;
  authorUsername: string;
  excerpt: string;
  createdAt: string;
  permalink?: string;
};

export type EligibleCommentsResponse = {
  type: "eligible-comments";
  battleId: string;
  army: ArmyColor;
  warRoomPermalink: string;
  comments: readonly EligibleCommentView[];
  nextCursor?: string;
};

export type PlayerPowerView = {
  xp: number;
  rankLevel: number;
  rank: string;
  rankProgress: number;
  total: number;
};

export type EventParticipantView = {
  battleId: string;
  assignedArmy: ArmyColor;
  confirmedAt: string;
  powerSnapshot: PlayerPowerView;
};

export type ArmyBalanceView = {
  participantCount: number;
  totalPower: number;
};

export type PlayerBattleState = {
  exists: boolean;
  username?: string;
  affiliation?: GlobalAffiliation;
  participating: boolean;
  participant?: EventParticipantView;
  army?: ArmyColor;
  order?: DoctrineOrder;
  spyAssignment?: SpyAssignmentView;
  rewards?: RewardSummary;
  dailyReward?: PersonalBattleRewardView;
  spySuspicion?: SpySuspicionView;
};

export type OrderResponse = {
  type: "order";
  order: DoctrineOrder;
  player: PlayerBattleState;
};

export type SpyAssignmentView = {
  active: true;
  coverArmy: ArmyColor;
  objective: string;
  targetDoctrineHint: DoctrineId;
};

export type SpySuspicionView = {
  commentId: string;
  suspectedUsername: string;
  submittedAt: string;
};

export type SpySuspicionRequest = {
  commentId: string;
};

export type SpySuspicionResponse = {
  type: "spy-suspicion";
  suspicion: SpySuspicionView;
};

export type TerritoryView = {
  id: string;
  name: string;
  owner: TerritoryOwner;
  x: number;
  y: number;
};

export type TerritoryTargetReason =
  | "unoccupied"
  | "attack-ai"
  | "attack-rival-human"
  | "attack-human"
  | "retry-draw";

export type TerritoryTargetView = {
  territory: TerritoryView;
  selectedBy: BattleSide | "system";
  distance: number;
  reason: TerritoryTargetReason;
};

export type CampaignCompletionView = {
  winner: BattleSide;
  finalBattleId: string;
  completedAt: string;
  report: {
    status: "pending" | "generated" | "published";
    generatedAt?: string;
    publishedAt?: string;
    permalink?: string;
    lastError?: string;
  };
};

export type CampaignTransition =
  | {
      type: "next-target";
      target: TerritoryTargetView;
    }
  | {
      type: "campaign-complete";
      completion: CampaignCompletionView;
    };

export type CampaignStateView =
  | {
      status: "active";
    }
  | {
      status: "complete";
      completion: CampaignCompletionView;
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

export const MEDAL_CATALOG = {
  "First Deployment": {
    id: "first-deployment",
    title: "First Deployment",
    description: "Submitted the first valid doctrine order.",
    rarity: "common",
    assetPath: "/assets/medals/medal_001.webp",
  },
  "Territory Captured": {
    id: "territory-captured",
    title: "Territory Captured",
    description: "Participated when the assigned army captured the active territory.",
    rarity: "rare",
    assetPath: "/assets/medals/medal_002.webp",
  },
} as const;

export type DailyXpBreakdownView = {
  participationXp: number;
  activityXp: number;
  resultXp: number;
  missionXp: number;
  streakMultiplier: number;
  comebackXp: number;
  capReductionXp: number;
};

export type PersonalBattleRewardView = {
  xpBefore: number;
  xpAwarded: number;
  xpAfter: number;
  rankBefore: string;
  rankAfter: string;
  rankAfterLevel: number;
  rankUp: boolean;
  newMedals: readonly string[];
  breakdown: DailyXpBreakdownView;
  appliedAt: string;
};

export type DailyLeaderboardEntry = {
  position: number;
  username: string;
  army: ArmyColor;
  rank: string;
  rankLevel: number;
  xpAwarded: number;
  newMedals: readonly string[];
  isCurrentUser: boolean;
};

export type DailyLeaderboardResponse = {
  type: "daily-leaderboard";
  battleId: string;
  entries: readonly DailyLeaderboardEntry[];
  currentUserEntry?: DailyLeaderboardEntry;
  nextCursor?: string;
};

export type PublicProfileBattleView = {
  battleId: string;
  battleDate: string;
  army: ArmyColor;
  winner: BattleWinner;
  territoryName: string;
  postPermalink: string;
};

export type PublicPlayerProfileResponse = {
  type: "public-profile";
  username: string;
  shareSlug: string;
  xp: number;
  rank: string;
  rankLevel: number;
  rankProgress: number;
  streak: number;
  medals: readonly string[];
  totalParticipatedEvents: number;
  totalVictories: number;
  recentBattles: readonly PublicProfileBattleView[];
};

export type GlobalLeaderboardEntry = {
  position: number;
  username: string;
  xp: number;
  rank: string;
  rankLevel: number;
  victories: number;
  participatedEvents: number;
  medals: number;
  isCurrentUser: boolean;
};

export type GlobalLeaderboardResponse = {
  type: "global-leaderboard";
  entries: readonly GlobalLeaderboardEntry[];
  currentUserEntry?: GlobalLeaderboardEntry;
  nextCursor?: string;
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
  campaignTransition?: CampaignTransition;
  doctrines: {
    green: DoctrineId;
    blue: DoctrineId;
    ai: DoctrineId;
  };
  scores: Record<BattleSide, BattleScoreBreakdown>;
  commentSignals: Record<DivisionTarget, CommentSignalView>;
  aiAwareness: Record<DivisionTarget, number>;
  spyInfluence: Record<DivisionTarget, number>;
  reportText: string;
};

export type PublicBattleResultResponse = {
  type: "public-battle-result";
  battleId: string;
  battleDate: string;
  postPermalink: string;
  result: BattleResultView;
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
  armyBalance: Record<ArmyColor, ArmyBalanceView>;
  result?: BattleResultView;
  resultSummary?: string;
  warRoomPermalinks?: Record<DevThreadTarget, string>;
};

export type BootstrapResponse = {
  type: "bootstrap";
  serverNow: string;
  view: BattleView;
  user: PlayerBattleState;
  battle?: BootstrapBattle;
};

export type PlayerJoinResponse = {
  type: "event-participation";
  user: PlayerBattleState & {
    exists: true;
    affiliation: GlobalAffiliation;
    participating: true;
    participant: EventParticipantView;
    army: ArmyColor;
  };
};

export type TerritoryCaptureRecord = {
  id: string;
  battleId: string;
  battleDate: string;
  territoryId: string;
  x: number;
  y: number;
  previousOwner: TerritoryOwner;
  newOwner: TerritoryOwner;
  winner: BattleWinner;
  ownershipChanged: boolean;
  capturedAt: string;
  postPermalink?: string;
};

export type GlobalMapTerritoryView = TerritoryView & {
  column: number;
  row: number;
  history: readonly TerritoryCaptureRecord[];
};

export type GlobalMapResponse = {
  type: "global-map";
  columns: number;
  rows: number;
  generatedAt: string;
  activeTerritoryId?: string;
  nextTargetId?: string;
  campaign?: CampaignStateView;
  territories: readonly GlobalMapTerritoryView[];
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
