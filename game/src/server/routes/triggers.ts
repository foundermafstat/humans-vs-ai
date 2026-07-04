import { Hono } from 'hono';
import type { OnAppInstallRequest, OnAppUpgradeRequest, TriggerResponse } from '@devvit/web/shared';
import { ensureDailyBattle } from '../core/dailyCycle';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const input = await c.req.json<OnAppInstallRequest>();
    const result = await ensureDailyBattle();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `${result.message} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});

triggers.post('/on-app-upgrade', async (c) => {
  try {
    const input = await c.req.json<OnAppUpgradeRequest>();
    const result = await ensureDailyBattle();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `${result.message} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error ensuring daily battle: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to ensure daily battle',
      },
      400
    );
  }
});
