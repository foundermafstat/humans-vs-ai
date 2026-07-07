# Технический аудит и план доведения игры до финального результата

**Дата среза:** 2026-07-07  
**Проект:** `humans-vs-ai`  
**Цель документа:** зафиксировать текущее состояние системы, сверить его с дизайн-документом и определить поэтапный план доведения игры до законченного MVP/финального демо.

---

## 1. Короткий вывод

Игра уже имеет рабочий каркас Reddit-native приложения:

- Devvit custom post с inline и expanded entrypoints;
- Phaser-визуализацию splash battlefield и expanded onboarding flow;
- Hono backend внутри Devvit Web;
- Redis-хранилище текущей daily battle и игроков;
- автоматическое создание daily post через trigger/scheduler;
- war-room ветки комментариев для AI / Green / Blue;
- OpenAI-интеграцию для AI status report и анализа комментариев;
- базовую систему из 7 доктрин.

Но финальный core loop еще не собран. Сейчас результат daily battle выбирается детерминированной заглушкой и не зависит от приказов игроков, 7 доктрин, комментариев, шпионов, территорий, прогресса или наград.

Главная задача следующего этапа: превратить текущий визуально-серверный каркас в настоящую игровую петлю:

```txt
daily battle
-> join army
-> hidden doctrine order
-> public war-room comments
-> comment signal aggregation
-> AI awareness / counter-pick
-> spy influence
-> doctrine-based battle resolution
-> territory/progression update
-> battle report + rewards
```

---

## 2. Авторитетные источники

### 2.1. Авторитетный источник доктрин

Авторитетный источник доктрин: `game/src/server/core/doctrines.ts`.

В проекте целевой моделью считаются **7 доктрин**:

| ID | Название | Роль |
|---|---|---|
| `STRIKE` | Strike | Прямое давление и атака |
| `HACK` | Hack | Контроль, взлом, обход защиты |
| `VIRUS` | Virus | Коррупция и распространение |
| `PHANTOM` | Phantom | Стелс и обход предсказуемых систем |
| `SHIELD` | Shield | Защита, удержание, фильтрация |
| `OVERLOAD` | Overload | DDoS/swarm, перегрузка внимания |
| `TRAP` | Trap | Honeypot/ambush, наказание предсказуемости |

Ранние упрощенные заметки о меньшем наборе доктрин нужно считать историческим контекстом, а не источником истины для текущей реализации. Активные требования должны использовать только 7-доктринную механику.

### 2.2. Проверенные файлы

| Файл | Что проверено |
|---|---|
| `game/devvit.json` | Devvit entrypoints, permissions, scheduler, settings |
| `game/package.json` | стек, команды, версии зависимостей |
| `game/src/shared/api.ts` | shared API contracts |
| `game/src/server/index.ts` | Hono routing |
| `game/src/server/core/dailyCycle.ts` | daily battle, Redis, war-room, OpenAI, scheduler logic |
| `game/src/server/core/doctrines.ts` | 7 доктрин и матрица matchup |
| `game/src/server/routes/api.ts` | public/dev API endpoints |
| `game/src/server/routes/menu.ts` | ручное создание поста |
| `game/src/server/routes/triggers.ts` | install/upgrade bootstrap |
| `game/src/server/routes/scheduler.ts` | scheduled create/resolve |
| `game/src/client/splash.ts/html/css` | inline post flow |
| `game/src/client/game.ts/html/css` | expanded flow |
| `game/src/client/scenes/*.ts` | Phaser scenes |
| `docs/the_first_real_epic_human_war_versus_ai_technical_document.md` | целевой дизайн и acceptance criteria |
| `docs/core_mechanics_math_and_virality_review_ru.md` | математика/виральность/gap analysis |
| `docs/mobile_loading_and_screen_flow_technical_document_ru.md` | mobile screen flow |
| `docs/user_flair_interaction_technical_document_ru.md` | flair layer |

---

## 3. Текущее состояние системы

### 3.1. Стек

| Слой | Текущее решение |
|---|---|
| Reddit platform | Devvit Web `0.13.5` |
| Client build | Vite |
| Game renderer | Phaser `4.2.0` |
| Server | Hono inside Devvit Web |
| Storage | Devvit Redis |
| Reddit API | `reddit.submitCustomPost`, `submitComment`, `getComments`, `setUserFlair` |
| AI integration | OpenAI Responses API через server-side fetch |
| Language | TypeScript |

### 3.2. Devvit app configuration

`game/devvit.json` уже задает:

- inline post entrypoint `default -> splash.html`;
- expanded entrypoint `game -> game.html`;
- server entrypoint `dist/server/index.cjs`;
- Redis permission;
- Reddit moderator scope и `SUBMIT_COMMENT` as user/app capability;
- HTTP allowlist для `api.openai.com`;
- global secret setting `openai_api_key`;
- scheduler tasks для create/resolve daily battle;
- dev subreddit `humans_vs_ai_dev`.

Замечание: scheduler использует две пары cron-задач для EDT/EST и дополнительно проверяет wall time `America/New_York`. Это разумный DST workaround, но его нужно отдельно проверить в Devvit runtime.

### 3.3. Server routing

`game/src/server/index.ts` собирает Hono app:

| Prefix | Route module | Назначение |
|---|---|---|
| `/api` | `routes/api.ts` | игровой API и dev endpoints |
| `/internal/menu` | `routes/menu.ts` | Reddit menu action |
| `/internal/form` | `routes/forms.ts` | template/example form |
| `/internal/triggers` | `routes/triggers.ts` | install/upgrade bootstrap |
| `/internal/scheduler` | `routes/scheduler.ts` | daily create/resolve |

### 3.4. Daily battle backend

`game/src/server/core/dailyCycle.ts` сейчас реализует:

- расчет следующего `resolvesAt` на 21:00 America/New_York;
- создание battle id вида `battle:YYYY-MM-DD`;
- Redis-ключ текущей battle: `app:current_battle`;
- Redis battle record: `app:battle:{battleId}`;
- Redis связь post -> battle: `app:battle_by_post:{postId}`;
- Redis игроки: `app:players`;
- idempotency keys для daily create/resolve;
- создание custom post через `reddit.submitCustomPost`;
- создание war-room веток комментариев `AI Responses`, `Green HQ`, `Blue HQ`;
- закрепленный index comment со ссылками на ветки;
- bootstrap response для клиента: `promo`, `countdown`, `summary`;
- join player с записью `redditUserId`, `army`, `joinedAt`, `updatedAt`;
- AI status report через OpenAI;
- AI-анализ ветки Green/Blue comments через `reddit.getComments` и OpenAI;
- resolve текущей battle.

Текущий milestone подключает `resolveCurrentDailyBattle()` к real resolver: результат строится из hidden orders, 7-доктринных matchup, comment signals, AI awareness и active territory. Старый deterministic placeholder остается только fallback для старых resolved states без сохраненного result.

### 3.5. Doctrine system

`game/src/server/core/doctrines.ts` уже является сильной основой для core mechanics:

- тип `DoctrineId`;
- список `DOCTRINE_ORDER`;
- объект `DOCTRINES`;
- `DOCTRINE_LIST`;
- `normalizeDoctrineId(value)`;
- `getDoctrineMatchup(attacker, defender)`.

Матрица сейчас симметрична по уровню сложности: каждая доктрина бьет ровно половину остальных доктрин, проигрывает ровно половине остальных и играет draw против самой себя.

Чего не хватает:

- hidden order и one-order-per-battle уже подключены через `POST /api/orders`;
- resolver использует `getDoctrineMatchup`;
- AI doctrine выбирается детерминированно с учетом AI Awareness;
- OpenAI comment analysis остается отдельным commentary tool, а resolver использует keyword-based comment signal aggregates.

### 3.6. Client: inline splash

`splash.html` и `splash.ts` реализуют первый экран внутри Reddit post:

- battlefield Phaser scene в `#battlefield-scene`;
- awards image;
- случайный logo из `logo1.webp`, `logo2.webp`, `logo3.webp`;
- title/status text;
- Start/Open/View button;
- dev buttons `Test message`, `Comments Green`, `Comments Blue`;
- bottom ticker;
- загрузку текущего battle state через `/api/bootstrap`;
- переход в expanded mode через `requestExpandedMode(event, 'game')`;
- post AI test message через `/api/ai/test-message`;
- post comments analysis через `/api/ai/comments-analysis`.

Splash battlefield визуально богатый: армии Green/Blue/AI, солдаты, выстрелы, гранаты, FX, battlefield image. Но это renderer-level simulation, не источник game state.

### 3.7. Client: expanded game

`game.ts` перед запуском Phaser:

- грузит web font;
- вызывает `/api/bootstrap`;
- показывает state screen:
  - `summary` -> battle report;
  - `countdown` -> active battle timer;
  - `promo` -> join humanity;
- запускает Phaser game по кнопке.

`Game.ts` реализует onboarding:

- выбор армии Green/Blue;
- POST `/api/player/join`;
- переход к paperwork scene;
- выбор персонажа из 8 вариантов;
- responsive relayout.

Чего нет в expanded game:

- выбор 7 доктрин;
- приказ/поддействие;
- карта территорий;
- active territory;
- spy offer;
- profile/progression screen;
- объяснение результата;
- final battle report UI поверх игровых данных.

### 3.8. Assets

В `game/public/assets` уже есть:

- battlefield image;
- Green/Blue/AI army sprites;
- arms/weapons;
- FX sprites;
- medals/cutouts;
- paper/table/hands/pills assets;
- logo variants;
- doctrine counters image.

Это достаточно для submission-grade визуального MVP, если связать assets с core loop.

### 3.9. Flair/profile layer

Отдельный документ `docs/user_flair_interaction_technical_document_ru.md` фиксирует текущий статус:

- есть статический `DEV_GREEN_PROFILE`;
- есть dev endpoint для применения Green Tribe flair;
- flair не связан с `joinCurrentPlayer`;
- Blue flair, динамические ранги, медали и progress не реализованы.

Вывод: flair сейчас демонстрирует будущую социальную идентичность, но не является gameplay системой.

### 3.10. Template leftovers

В проекте остались элементы starter/template уровня:

- `game/README.md` описывает Devvit Phaser Starter, а не игру;
- `routes/forms.ts` содержит example form;
- `routes/menu.ts` создает пост с title `'<% name %>'`;
- `MainMenu.ts` и `GameOver.ts` остаются starter-like сценами и почти не участвуют в текущем flow;
- `/api/increment` и `/api/decrement` выглядят как template endpoints.

Это не ломает приложение, но мешает submission-readiness.

---

## 4. Сверка с дизайн-документом

### 4.1. Что уже реализовано

| Требование | Статус | Комментарий |
|---|---:|---|
| Devvit app | Частично готово | Есть config, server, client entrypoints |
| Custom post | Частично готово | Создается daily post, есть inline splash |
| Игровой интерфейс в посте | Частично готово | Splash battlefield + expanded onboarding |
| Выбор стороны | Частично готово | Green/Blue army через expanded Game scene |
| Таймер | Частично готово | Countdown до 21:00 ET |
| AI broadcast | Частично готово | AI status и result comment от app account |
| War-room comments | Частично готово | AI/Green/Blue ветки создаются |
| Комментарии как input | Частично готово | Есть ручной AI analysis, но нет сохраненных агрегатов |
| 7 доктрин | Готово для MVP | Модель, order input и resolver подключены |
| Battle report | Частично готово | Есть summary/result comment, но не объяснительный report |
| Flair/social identity | Частично готово | Есть Green dev flair, нет динамики |

### 4.2. Что не реализовано

| Требование из дизайна | Текущий gap |
|---|---|
| Игрок делает приказ: доктрина + поддействие | UI и backend order model отсутствуют |
| Один приказ на фазу | Нет Redis/order idempotency по user+battle |
| 10-12 территорий на карте | Нет модели территорий и карты владения |
| Одна активная территория | Нет active territory state |
| Система рассчитывает победителя | Сейчас deterministic placeholder |
| Территория меняет цвет или остается спорной | Нет territory result update |
| XP/медаль/прогресс | Нет progression model |
| Spy offer accept/refuse | Нет spy assignment/offers |
| Шпион видит секретную цель и доктрину AI | Нет spy UI и secret state |
| Комментарии агрегируются по ключевым словам | Есть чтение комментариев для OpenAI, нет persisted signal vectors |
| AI Awareness | Нет численной модели |
| Karma/comment score influence | Score читается в prompt, но не влияет на resolver |
| Result explains why side won | Summary не раскрывает расчет |
| Comment delete handling | Нет trigger/fallback cleanup |
| Production README/submission docs | README еще starter-level |
| Test coverage | Тестов в проекте не найдено |

---

## 5. Целевая архитектура

### 5.1. Главный принцип

Phaser должен быть renderer/onboarding layer. Источник правды должен жить на server side в Redis и typed core modules.

```txt
Client UI
  -> sends actions
Server API
  -> validates action
Redis/state modules
  -> persist truth
Core resolver
  -> computes battle result
Client/Reddit comments
  -> render outcome
```

Не нужно переносить правила боя в Phaser scene.

### 5.2. Рекомендуемые core modules

| Модуль | Назначение |
|---|---|
| `core/doctrines.ts` | Уже есть: 7 doctrines + matchup |
| `core/battles.ts` | battle lifecycle, phase/status helpers |
| `core/orders.ts` | hidden doctrine orders, one order per user per battle |
| `core/territories.ts` | 10-12 territories, active territory, ownership |
| `core/commentSignals.ts` | keyword/score aggregates from Reddit comments |
| `core/aiAwareness.ts` | awareness scoring and AI counter-pick |
| `core/spies.ts` | offers, accept/refuse, secret objective, capped influence |
| `core/resolver.ts` | final deterministic battle calculation |
| `core/rewards.ts` | XP, medals, ranks, flair/passport projection |
| `core/reports.ts` | battle report text/data model |

### 5.3. Minimal data model

```txt
Battle
  id
  battleDate
  status
  postId
  activeTerritoryId
  resolvesAt
  result?

Player
  redditUserId
  army
  joinedAt
  updatedAt
  xp
  medals[]
  rank

Order
  battleId
  userId
  army
  doctrineId
  subAction?
  createdAt

Territory
  id
  name
  owner: green | blue | ai | contested
  lastBattleId?

CommentSignal
  battleId
  branch: green | blue | ai
  doctrineMentions
  noiseScore
  deceptionScore
  scoreAggregate
  updatedAt

SpyAssignment
  battleId
  userId
  army
  type
  targetDoctrineHint
  objective
  acceptedAt?
  resolvedAt?

BattleResult
  battleId
  winner
  activeTerritoryBefore
  activeTerritoryAfter
  armyDoctrines
  aiDoctrine
  doctrineScores
  commentSignalScores
  aiAwareness
  spyInfluence
  rewards
  reportText
```

---

## 6. Поэтапный план работ

### Этап 0. Зафиксировать source of truth

**Цель:** убрать противоречия перед реализацией.

Задачи:

1. Зафиксировать 7 доктрин как единственный целевой набор.
2. Обновить README: проект, запуск, сабмит, game loop.
3. Убрать или пометить как dev-only template endpoints/UI.
4. Зафиксировать MVP loop на уровне shared contracts.
5. Добавить небольшой `docs/current_gameplay_contract_ru.md` или обновить главный техдок.

Acceptance:

- в документах нет активного требования вернуться к ранней упрощенной модели;
- README больше не выглядит как Phaser Starter;
- dev-only кнопки и endpoints явно отделены от production flow.

### Этап 1. Orders и выбор 7 доктрин

**Цель:** игрок должен сделать реальный игровой приказ.

Задачи:

1. Добавить shared types для `DoctrineId`, `OrderRequest`, `OrderResponse`.
2. Добавить endpoint `POST /api/orders`.
3. Добавить Redis key `app:orders:{battleId}` или `app:order:{battleId}:{userId}`.
4. Запретить повторный приказ в одной battle.
5. Добавить UI выбора 7 доктрин в expanded game.
6. Показывать игроку статус: order submitted / locked / battle resolved.

Acceptance:

- игрок выбирает Green/Blue и одну из 7 доктрин;
- сервер сохраняет приказ;
- повторная отправка не перезаписывает приказ без явного правила;
- bootstrap сообщает клиенту, есть ли order у текущего пользователя.

### Этап 2. Battle resolver на базе 7 доктрин

**Цель:** заменить deterministic placeholder на расчет результата.

Задачи:

1. Добавить `core/resolver.ts`.
2. Считать dominant doctrine по армии из orders.
3. Выбрать AI doctrine: сначала deterministic/random, затем awareness-based.
4. Использовать `getDoctrineMatchup` для Green vs AI, Blue vs AI, Green vs Blue.
5. Вернуть structured `BattleResult`.
6. Сохранять result в battle record.
7. Генерировать report с причинами победы.

Минимальная формула:

```txt
armyScore =
  doctrineMatchupScore
  + orderParticipationScore
  + commentSignalScore
  + spyScore
  + momentumScore
```

Acceptance:

- результат зависит от выбранных игроками доктрин;
- report показывает выбранные доктрины и ключевые причины;
- battle result сохраняется и повторно читается без пересчета.

### Этап 3. Карта территорий

**Цель:** дать battle долгосрочную цель.

Задачи:

1. Добавить список 10-12 территорий.
2. Добавить owner state: `green | blue | ai | contested`.
3. Добавить active territory selection.
4. При resolve обновлять owner/contested status.
5. Показать карту/territory status в splash или expanded screen.
6. Добавить простой визуальный state: active, captured, contested.

Acceptance:

- каждый день/фаза имеет active territory;
- после result меняется владение или contested state;
- игрок видит, за что идет бой.

### Этап 4. Comment signals без хранения лишнего текста

**Цель:** сделать комментарии gameplay input.

Задачи:

1. Добавить `core/commentSignals.ts`.
2. Определить keyword mapping для 7 доктрин.
3. Читать Green/Blue branch comments.
4. Считать агрегаты: doctrine mentions, noise, deception, score aggregate.
5. Сохранять только агрегированные данные и минимальные ids при необходимости.
6. Подключить агрегаты к resolver.
7. Добавить fallback recount перед resolve.

Acceptance:

- комментарии влияют на result;
- report показывает агрегаты без раскрытия лишних персональных данных;
- удаленный/измененный контент не становится вечным source of truth.

### Этап 5. AI Awareness и AI counter-pick

**Цель:** ИИ должен казаться умным, но не быть unfair.

Задачи:

1. Добавить awareness score 0-100 по армии.
2. Учитывать public doctrine leaks, comment noise, deception, spy leaks.
3. Выбирать AI doctrine вероятностно:
   - low awareness -> weak/random pick;
   - medium -> weighted counter;
   - high -> strong counter chance.
4. Ограничить максимальный advantage AI.
5. Отразить awareness в report.

Acceptance:

- открытые комментарии могут помочь или навредить;
- ИИ не всегда идеально контрит игроков;
- игрок понимает, почему AI прочитал или не прочитал людей.

### Этап 6. Spy loop

**Цель:** добавить главный социальный hook без токсичности.

Задачи:

1. Добавить spy offer model.
2. Добавить accept/refuse endpoint.
3. Показать spy offer только выбранному игроку.
4. Дать секретную цель: push doctrine, create noise, reduce awareness, bait AI.
5. Считать capped spy influence.
6. Не раскрывать ник шпиона публично.
7. Давать private/hidden medal или report line без doxxing.

Acceptance:

- spy role добровольная;
- spy influence влияет на result, но не ломает матч;
- публичный report не провоцирует травлю конкретного пользователя.

### Этап 7. Rewards, ranks, flair

**Цель:** закрыть retention loop.

Задачи:

1. Добавить XP/rank model в Redis.
2. Добавить medals за участие, победу, deception, anti-spy, streak.
3. Связать rewards с battle result.
4. Добавить Blue flair и dynamic public profile projection.
5. При необходимости использовать Reddit user flair как публичный summary, а не source of truth.
6. Показать reward screen после battle.

Acceptance:

- игрок получает понятный прогресс;
- flair/passport отражает реальные достижения;
- повторный daily visit имеет смысл.

### Этап 8. UX polish и demo readiness

**Цель:** сделать игру понятной за 10-20 секунд.

Задачи:

1. Убрать dev buttons из production splash или спрятать за dev flag.
2. Сделать clear first action: join -> choose doctrine -> submit order.
3. Добавить active territory и timer на первый экран.
4. Сделать battle report главным reward moment.
5. Проверить mobile portrait/landscape.
6. Обновить README и submission сценарий.
7. Подготовить demo mode с короткой фазой для видео.

Acceptance:

- пользователь без чтения техдока понимает, что делать;
- demo показывает Reddit-native hook: post + comments + AI + result;
- mobile flow не ломается.

### Этап 9. Verification

**Цель:** не сломать Devvit flow перед финальным сабмитом.

Задачи:

1. Добавить unit tests для doctrine resolver.
2. Добавить focused tests для order idempotency.
3. Добавить tests для territory update.
4. Прогнать `npm run type-check`.
5. Прогнать `npm run lint`.
6. Прогнать targeted playtest в Devvit.
7. Проверить live test subreddit:
   - create daily post;
   - join;
   - submit order;
   - comments;
   - resolve;
   - report;
   - reward/flair.

Acceptance:

- core resolver покрыт тестами;
- Devvit upload/playtest проходит;
- полный сценарий показан в test subreddit.

---

## 7. Приоритетная версия MVP

Чтобы быстро дойти до законченного результата, минимальный MVP должен быть таким:

1. Оставить 7 доктрин.
2. Дать игроку выбор армии и одной скрытой доктрины.
3. Хранить один приказ на battle.
4. Создавать daily post и war-room ветки как сейчас.
5. Перед resolve агрегировать комментарии Green/Blue.
6. Выбирать AI doctrine по awareness.
7. Рассчитывать result через 7-doctrine matchup.
8. Обновлять одну active territory.
9. Публиковать AI result comment.
10. Показывать battle report с причинами.

Spy loop, dynamic flair и сложные medals можно добавить сразу после этого. Без doctrine orders и real resolver игра остается красивым прототипом, а не социальной стратегией.

---

## 8. Риски

| Риск | Почему важно | Решение |
|---|---|---|
| 7 доктрин сложнее объяснить, чем меньший набор | Новый игрок может не понять выбор | UI должен показывать простые counters и recommended role |
| Комментарии могут стать шумом | Игроки будут писать случайно | Report должен явно показывать влияние public signal |
| AI counter может казаться unfair | Игроки не любят идеально читающего ИИ | Делать AI counter вероятностным и capped |
| Spy loop может вызвать токсичность | Reddit social dynamics чувствительны | Не раскрывать личности, показывать только aggregate influence |
| OpenAI dependency может сломать demo | Secret/key/rate limit | Resolver должен работать без LLM; LLM только усиливает commentary |
| Scheduler DST behavior | Daily automation может не сработать | Проверить cron в test subreddit и иметь manual dev resolve |
| Нет тестов | Resolver легко сломать | Начать с маленьких unit tests на pure functions |

---

## 9. Следующий практический шаг

Первый кодовый milestone:

```txt
M1: Orders + real 7-doctrine resolver
```

Состав:

- shared `DoctrineId` export;
- `POST /api/orders`;
- Redis order storage;
- expanded UI выбора 7 доктрин;
- `core/resolver.ts`;
- `resolveCurrentDailyBattle()` использует real result;
- battle report показывает:
  - Green doctrine;
  - Blue doctrine;
  - AI doctrine;
  - matchup result;
  - participation score;
  - final winner.

Это минимальная доработка, после которой проект перестанет быть только визуальной оболочкой и станет настоящей игрой с понятным gameplay outcome.
