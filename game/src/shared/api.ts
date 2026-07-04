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

export type BootstrapBattle = {
  id: string;
  battleDate: string;
  status: BattleStatus;
  postId: string;
  postPermalink: string;
  resolvesAt: string;
  secondsUntilResolve: number;
  resultSummary?: string;
};

export type BootstrapResponse = {
  type: "bootstrap";
  serverNow: string;
  view: BattleView;
  user: {
    exists: boolean;
  };
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
