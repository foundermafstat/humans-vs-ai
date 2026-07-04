import { Hono } from 'hono';
import {
  createNextDailyBattle,
  isNewYorkWallTime,
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

  return c.json(await createNextDailyBattle(now));
});
