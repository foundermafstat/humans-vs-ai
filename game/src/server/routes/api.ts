import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  AiReportResponse,
  BootstrapResponse,
  DecrementResponse,
  DevActionResponse,
  DevStateResponse,
  DevThreadTarget,
  DevWarRoomState,
  DivisionCommentAnalysisResponse,
  DivisionTarget,
  DailyLeaderboardResponse,
  EligibleCommentsResponse,
  GlobalMapResponse,
  GlobalLeaderboardResponse,
  IncrementResponse,
  InitResponse,
  OrderResponse,
  PetitionStatusResponse,
  PlayerJoinResponse,
  PublicPlayerProfileResponse,
  PublicBattleResultResponse,
  SpySuspicionResponse,
} from '../../shared/api';
import { DEV_GREEN_PROFILE, DEV_USER_COMMENT_TEXT } from '../../shared/api';
import { normalizeDoctrineId } from '../core/doctrines';
import {
  getBootstrapResponse,
  getDailyLeaderboard,
  getEligibleComments,
  getPublicPlayerProfile,
  getPublicBattleResult,
  submitSpySuspicion,
  getGlobalMapResponse,
  getGlobalLeaderboard,
  joinCurrentPlayer,
  getEpicWarPetitionStatus,
  postAiStatusReport,
  postDivisionCommentAnalysis,
  syncCurrentPlayerFlair,
  submitDoctrineOrder,
  signEpicWarPetition,
} from '../core/dailyCycle';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

type RedditCommentId = `t1_${string}`;

const DEV_WAR_POST_TITLE = 'Humans vs AI: Dev War Room';
const THREAD_TITLES: Record<DevThreadTarget, string> = {
  ai: 'AI Responses',
  green: 'Green HQ',
  blue: 'Blue HQ',
};
const THREAD_BODIES: Record<DevThreadTarget, string> = {
  ai: [
    '## AI Responses',
    '',
    'Official branch for game-authored AI broadcasts.',
    '',
    'Use this thread to watch machine pressure, phase taunts, and strategic alerts.',
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
const GAME_COMMENT_TEXT: Record<DevThreadTarget, string> = {
  ai: 'AI RESPONSE // Your coordination has been logged. Continue arguing in public.',
  green: 'GREEN HQ // Shield doctrine active. Hold the line and report clean signals.',
  blue: 'BLUE HQ // The flank is active. Keep plans disciplined.',
};
function getWarRoomKey(postId: string) {
  return `dev:war-room:${postId}`;
}

function getSubredditName() {
  return context.subredditName ?? 'humans_vs_ai_dev';
}

function toRedditUrl(permalink: string) {
  if (permalink.startsWith('http')) return permalink;

  return `https://www.reddit.com${permalink}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCommentId(id: string): id is RedditCommentId {
  return id.startsWith('t1_');
}

function isDivisionTarget(value: unknown): value is DivisionTarget {
  return value === 'green' || value === 'blue';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRateLimitDelayMs(error: unknown) {
  const message = getErrorMessage(error);
  const match = /RatelimitError\(TimeString="(\d+)\s+(second|seconds|minute|minutes)"\)/.exec(message);
  if (!match) return undefined;

  const [, rawAmount, unit] = match;
  if (!rawAmount || !unit) return undefined;

  const amount = Number(rawAmount);
  const baseMs = unit.startsWith('minute') ? amount * 60_000 : amount * 1_000;

  return baseMs + 750;
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

function normalizeTarget(value: unknown): DevThreadTarget | undefined {
  if (value === 'ai' || value === 'green' || value === 'blue') return value;

  return undefined;
}

function normalizeUserTarget(value: unknown): Exclude<DevThreadTarget, 'ai'> | undefined {
  if (value === 'green' || value === 'blue') return value;

  return undefined;
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

async function getWarRoom(postId: string) {
  const rawState = await redis.get(getWarRoomKey(postId));
  if (!rawState) return undefined;

  const parsed: unknown = JSON.parse(rawState);
  if (!isWarRoomState(parsed)) return undefined;

  return parsed;
}

function createDevStateResponse(postId: string, warRoom?: DevWarRoomState): DevStateResponse {
  const response: DevStateResponse = {
    type: 'dev-state',
    postId,
    subredditName: getSubredditName(),
    publicFlair: DEV_GREEN_PROFILE.publicFlair,
    passportLines: DEV_GREEN_PROFILE.passportLines,
  };

  if (warRoom) response.warRoom = warRoom;

  return response;
}

function createDevActionResponse(message: string, warRoom?: DevWarRoomState): DevActionResponse {
  const response: DevActionResponse = {
    type: 'dev-action',
    message,
    publicFlair: DEV_GREEN_PROFILE.publicFlair,
    passportLines: DEV_GREEN_PROFILE.passportLines,
  };

  if (warRoom) response.warRoom = warRoom;

  return response;
}

async function getCurrentWarRoom() {
  const { postId } = context;
  if (!postId) return undefined;

  return await getWarRoom(postId);
}

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.get('/bootstrap', async (c) => {
  try {
    return c.json<BootstrapResponse>(await getBootstrapResponse());
  } catch (error) {
    console.error(`API Bootstrap Error: ${error}`);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'Failed to load daily battle state',
      },
      400
    );
  }
});

api.get('/global-map', async (c) => {
  try {
    return c.json<GlobalMapResponse>(await getGlobalMapResponse());
  } catch (error) {
    console.error(`API Global Map Error: ${error}`);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'Failed to load global territory history',
      },
      400
    );
  }
});

api.get('/leaderboard/global', async (c) => {
  try {
    return c.json<GlobalLeaderboardResponse>(await getGlobalLeaderboard(c.req.query('cursor')));
  } catch (error) {
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load global leaderboard',
    }, 400);
  }
});

api.get('/petition/epic-war', async (c) => {
  try {
    return c.json<PetitionStatusResponse>(await getEpicWarPetitionStatus());
  } catch (error) {
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load petition',
    }, 400);
  }
});

api.post('/petition/epic-war/sign', async (c) => {
  try {
    return c.json<PetitionStatusResponse>(await signEpicWarPetition());
  } catch (error) {
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to sign petition',
    }, 400);
  }
});

api.get('/eligible-comments', async (c) => {
  try {
    return c.json<EligibleCommentsResponse>(await getEligibleComments(c.req.query('cursor')));
  } catch (error) {
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load eligible comments',
    }, 400);
  }
});

api.get('/battles/:battleId/leaderboard', async (c) => {
  try {
    return c.json<DailyLeaderboardResponse>(await getDailyLeaderboard(
      c.req.param('battleId'),
      c.req.query('cursor'),
    ));
  } catch (error) {
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load leaderboard',
    }, 404);
  }
});

api.get('/battles/:battleId/result', async (c) => {
  try {
    return c.json<PublicBattleResultResponse>(await getPublicBattleResult(c.req.param('battleId')));
  } catch (error) {
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load battle result',
    }, 404);
  }
});

api.get('/profiles/me', async (c) => {
  try {
    return c.json<PublicPlayerProfileResponse>(await getPublicPlayerProfile());
  } catch (error) {
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load profile',
    }, 404);
  }
});

api.get('/profiles/:username', async (c) => {
  try {
    return c.json<PublicPlayerProfileResponse>(await getPublicPlayerProfile(c.req.param('username')));
  } catch (error) {
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to load profile',
    }, 404);
  }
});

api.post('/player/join', async (c) => {
  try {
    return c.json<PlayerJoinResponse>(await joinCurrentPlayer());
  } catch (error) {
    console.error(`API Player Join Error: ${error}`);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: error instanceof Error
          ? error.message
          : 'Failed to join the daily event',
      },
      400
    );
  }
});

api.post('/orders', async (c) => {
  try {
    const body: { doctrineId?: unknown; sourceCommentId?: unknown } = await c.req.json().catch(() => ({}));
    const doctrineId = normalizeDoctrineId(body.doctrineId);
    if (!doctrineId) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'doctrineId must be one of STRIKE, HACK, VIRUS, PHANTOM, SHIELD, OVERLOAD, TRAP',
        },
        400
      );
    }
    if (typeof body.sourceCommentId !== 'string' || !body.sourceCommentId.startsWith('t1_')) {
      return c.json<ErrorResponse>({
        status: 'error',
        message: 'sourceCommentId must be a Reddit comment id',
      }, 400);
    }

    return c.json<OrderResponse>(await submitDoctrineOrder(doctrineId, body.sourceCommentId));
  } catch (error) {
    console.error(`API Order Error: ${error}`);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit doctrine order',
      },
      400
    );
  }
});

api.post('/spy/suspicions', async (c) => {
  try {
    const body: { commentId?: unknown } = await c.req.json().catch(() => ({}));
    if (typeof body.commentId !== 'string' || !body.commentId.startsWith('t1_')) {
      return c.json<ErrorResponse>({ status: 'error', message: 'commentId must be a Reddit comment id' }, 400);
    }
    return c.json<SpySuspicionResponse>(await submitSpySuspicion(body.commentId));
  } catch (error) {
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to save counterintelligence choice',
    }, 400);
  }
});

api.post('/ai/test-message', async (c) => {
  try {
    return c.json<AiReportResponse>(await postAiStatusReport());
  } catch (error) {
    console.error(`API AI Test Message Error: ${error}`);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to post AI test message',
      },
      400
    );
  }
});

api.post('/ai/comments-analysis', async (c) => {
  try {
    const body: { target?: unknown } = await c.req.json().catch(() => ({}));
    if (!isDivisionTarget(body.target)) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'target must be green or blue',
        },
        400
      );
    }

    return c.json<DivisionCommentAnalysisResponse>(await postDivisionCommentAnalysis(body.target));
  } catch (error) {
    console.error(`API AI Comments Analysis Error: ${error}`);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to post AI comments analysis',
      },
      400
    );
  }
});

// Dev-only template counter endpoint retained for local smoke checks.
api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

// Dev-only template counter endpoint retained for local smoke checks.
api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

api.get('/dev/state', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const warRoom = await getWarRoom(postId);
  return c.json<DevStateResponse>(createDevStateResponse(postId, warRoom));
});

api.post('/dev/apply-flair', async (c) => {
  try {
    const applied = await syncCurrentPlayerFlair();
    if (!applied) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'Join today\'s event before applying temporary player flair',
        },
        400
      );
    }

    return c.json<DevActionResponse>(
      createDevActionResponse('Applied dynamic player flair from Redis state.')
    );
  } catch (error) {
    console.error(`Error applying dev flair: ${error}`);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'Failed to apply dynamic player flair',
      },
      400
    );
  }
});

api.post('/dev/create-war-post', async (c) => {
  try {
    const post = await withRedditRateLimitRetry(() => reddit.submitCustomPost({
      title: DEV_WAR_POST_TITLE,
    }));
    const aiThread = await withRedditRateLimitRetry(() => reddit.submitComment({
      id: post.id,
      text: THREAD_BODIES.ai,
      runAs: 'APP',
    }));
    const greenThread = await withRedditRateLimitRetry(() => reddit.submitComment({
      id: post.id,
      text: THREAD_BODIES.green,
      runAs: 'APP',
    }));
    const blueThread = await withRedditRateLimitRetry(() => reddit.submitComment({
      id: post.id,
      text: THREAD_BODIES.blue,
      runAs: 'APP',
    }));
    await withRedditRateLimitRetry(() => aiThread.distinguish(true));

    const warRoom: DevWarRoomState = {
      postId: post.id,
      postPermalink: post.permalink,
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

    await redis.set(getWarRoomKey(post.id), JSON.stringify(warRoom));

    const response = createDevActionResponse('Created dev war post and official war-room branches.', warRoom);
    response.navigateUrl = toRedditUrl(post.permalink);

    return c.json<DevActionResponse>(response);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(`Error creating dev war post: ${errorMessage}`);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: `Failed to create dev war post: ${errorMessage}`,
      },
      400
    );
  }
});

api.post('/dev/comment/app', async (c) => {
  try {
    const body: { target?: unknown } = await c.req.json().catch(() => ({}));
    const target = normalizeTarget(body.target);
    const warRoom = await getCurrentWarRoom();

    if (!target || !warRoom) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'Valid initialized war-room target is required',
        },
        400
      );
    }

    const parentId = warRoom.threadIds[target];
    if (!isCommentId(parentId)) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'Stored war-room comment id is invalid',
        },
        400
      );
    }

    const comment = await reddit.submitComment({
      id: parentId,
      text: GAME_COMMENT_TEXT[target],
      runAs: 'APP',
    });
    const response = createDevActionResponse(`Posted game comment to ${THREAD_TITLES[target]}.`, warRoom);
    response.commentPermalink = comment.permalink;

    return c.json<DevActionResponse>(response);
  } catch (error) {
    console.error(`Error posting app dev comment: ${error}`);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'Failed to post game comment',
      },
      400
    );
  }
});

api.post('/dev/comment/user', async (c) => {
  try {
    const body: { target?: unknown } = await c.req.json().catch(() => ({}));
    const target = normalizeUserTarget(body.target);
    const warRoom = await getCurrentWarRoom();

    if (!target || !warRoom) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'Valid initialized Green or Blue war-room target is required',
        },
        400
      );
    }

    const parentId = warRoom.threadIds[target];
    if (!isCommentId(parentId)) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'Stored war-room comment id is invalid',
        },
        400
      );
    }

    const comment = await reddit.submitComment({
      id: parentId,
      text: DEV_USER_COMMENT_TEXT[target],
      runAs: 'USER',
    });
    const response = createDevActionResponse(`Posted your comment to ${THREAD_TITLES[target]}.`, warRoom);
    response.commentPermalink = comment.permalink;

    return c.json<DevActionResponse>(response);
  } catch (error) {
    console.error(`Error posting user dev comment: ${error}`);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'Failed to post user comment',
      },
      400
    );
  }
});
