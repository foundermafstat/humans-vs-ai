export type InitResponse = {
  type: "init";
  postId: string;
  count: number;
  username: string;
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
