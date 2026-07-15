import { Hono } from 'hono';
import {
  isNewYorkWallTime,
  reconcileDailyCycle,
  retryPendingPlayerFlairs,
  resolveCurrentDailyBattle,
} from '../core/dailyCycle';

export const scheduler = new Hono();

scheduler.post('/resolve-daily-battle', async (c) => {
  const now = new Date();

  if (!isNewYorkWallTime(now, 21, 0)) {
    return c.json({
      status: 'skipped',
      message: 'Not 21:00 in America/New_York.',
    });
  }

  return c.json(await resolveCurrentDailyBattle(now));
});

scheduler.post('/create-daily-battle', async (c) => {
  const now = new Date();

  if (!isNewYorkWallTime(now, 21, 1)) {
    return c.json({
      status: 'skipped',
      message: 'Not 21:01 in America/New_York.',
    });
  }

  return c.json(await reconcileDailyCycle(now));
});

scheduler.post('/reconcile-daily-cycle', async (c) => {
  return c.json(await reconcileDailyCycle());
});

scheduler.post('/retry-player-flairs', async (c) => {
  return c.json(await retryPendingPlayerFlairs());
});
