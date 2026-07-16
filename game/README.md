# Humans vs AI — Devvit application

This directory contains the playable Reddit/Devvit implementation of **Humans vs AI**.

For the complete game description, daily loop, seven doctrines, scoring model, spies, campaign, progression, implementation status, and roadmap, read the [project README](../README.md).

## Runtime map

- `src/client/splash.html` — lightweight inline Reddit post entrypoint;
- `src/client/game.html` — expanded tactical desk entrypoint;
- `src/client/game.ts` — forms, map, profiles, leaderboards, reports, and desk interactions;
- `src/server/index.ts` — Hono/Devvit server entrypoint;
- `src/server/routes/api.ts` — contextual game API;
- `src/server/core/dailyCycle.ts` — daily post, participation, orders, resolution, and persistence;
- `src/server/core/doctrines.ts` — authoritative seven-doctrine matrix;
- `src/server/core/resolver.ts` — deterministic battle scoring;
- `src/server/core/territories.ts` — persistent 30-sector campaign;
- `src/server/core/playerProgressionRules.ts` — XP and 48-rank progression model;
- `src/shared/api.ts` — shared client/server contracts;
- `devvit.json` — entrypoints, permissions, settings, triggers, and scheduler tasks.

## Requirements

- Node.js `>=22.2.0`;
- npm;
- Reddit Devvit access and CLI authentication;
- a test subreddit;
- optional `openai_api_key` app setting for generated narrative features.

## Local playtest

```bash
npm ci
npm run login
npm run dev
```

`npm run dev` invokes `devvit playtest` against the subreddit configured in `devvit.json`.

## Verification

```bash
npm run type-check
npm run lint
npm run test:battlefields
npm run test:navigation
npm run build
```

`npm run test:core` is currently a legacy harness: it still references a removed design document and pre-WebP trigger assets. Update those assertions before using it as a release gate.

## Release commands

```bash
npm run deploy
npm run launch
```

- `deploy` runs type checking and linting, then uploads the Devvit app.
- `launch` uploads and invokes the Devvit publish flow.

## License

[BSD 3-Clause](LICENSE)
