## Humans vs AI

Reddit-native social strategy game built with Devvit Web, Phaser, Hono, Redis, and TypeScript.

The game turns a Reddit post into a daily war room: players join Green or Blue, submit a hidden doctrine order, coordinate in public comments, and fight an AI opponent that reacts to the public signal.

## Core Game Loop

The target MVP loop is:

```txt
daily battle
-> join army
-> choose one hidden doctrine from the 7-doctrine system
-> coordinate or misdirect in war-room comments
-> aggregate comment signals
-> AI awareness / counter-pick
-> spy influence
-> doctrine-based battle resolution
-> territory and progression update
-> battle report and rewards
```

## Doctrine System

The authoritative doctrine set contains exactly seven doctrines:

- `STRIKE`
- `HACK`
- `VIRUS`
- `PHANTOM`
- `SHIELD`
- `OVERLOAD`
- `TRAP`

Source of truth:

- shared contract: `src/shared/api.ts`
- matchup implementation: `src/server/core/doctrines.ts`

Older 3-doctrine notes are historical context only and are not the target gameplay model.

## Current Runtime Shape

- Inline post entrypoint: `src/client/splash.html`
- Expanded game entrypoint: `src/client/game.html`
- Server entrypoint: `src/server/index.ts`
- Daily battle lifecycle: `src/server/core/dailyCycle.ts`
- Reddit/Devvit config: `devvit.json`

## Commands

Requires Node.js `>=22.2.0`.

- `npm run dev`: run Devvit playtest.
- `npm run build`: build client and server.
- `npm run type-check`: run TypeScript project checks.
- `npm run lint`: run ESLint.
- `npm run deploy`: type-check, lint, then upload to Devvit.
- `npm run launch`: deploy and publish for review.
- `npm run login`: log into the Devvit CLI.

## Submission Checklist

- Confirm the app runs in the test subreddit.
- Create or verify a daily battle post.
- Show inline splash, expanded game, join flow, doctrine order, comments, resolve, and battle report.
- Keep dev-only buttons/endpoints out of the public demo path or label them clearly as developer tools.
- Update the root submission text and demo video around the 7-doctrine mechanic.
