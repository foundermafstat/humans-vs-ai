## Humans vs AI

Reddit-native social strategy game built with Devvit Web, Phaser, Hono, Redis, and TypeScript.

The game turns a Reddit post into a daily war room: players join Green or Blue, submit a hidden doctrine order, coordinate in public comments, and fight an AI opponent that reacts to the public signal.

## Core Game Loop

The target MVP loop is:

```txt
daily battle
-> request participation and receive an immediate balanced assignment
-> receive a temporary army flair (or cover flair for a spy)
-> choose one hidden doctrine from the 7-doctrine system
-> coordinate or misdirect in war-room comments
-> aggregate comment signals
-> AI awareness / counter-pick
-> spy influence
-> doctrine-based battle resolution
-> territory and progression update
-> battle report and rewards
-> reset temporary flair to neutral gray
```

Green and Blue have no captain or command hierarchy. Every participant has one
equal-weight doctrine order; deterministic battle-seed hashing resolves an
internal tie. Spy is the only special role: the order counts for the true army,
while the public flair shows the opposing cover army.

Each Daily Post starts with exactly three app comments: pinned AI Responses,
Green HQ, and Blue HQ. There is no distribution/index comment.

Canonical daily-cycle rules: `../docs/daily_event_cycle_ru.md`.

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
