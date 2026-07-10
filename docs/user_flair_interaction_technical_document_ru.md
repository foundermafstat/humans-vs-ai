# Технический документ: взаимодействие игры с Reddit User Flair

Дата среза: 2026-07-04

## 1. Назначение

User Flair в `humans-vs-ai` - это публичная Reddit-метка пользователя внутри сабреддита. В текущей реализации она используется как социальная идентификация игрока: фракция, ранг, класс и медали.

Ключевой принцип текущей архитектуры: flair не является источником игровой правды. Участие игрока в daily battle хранится отдельно в Redis, а flair является внешним публичным отображением профиля на Reddit.

Авторитетный источник 48 званий, slug, описаний и привязок `hva_rank_01`…`hva_rank_48`:
`game/src/server/core/playerRanks.ts`.

## 2. Текущий статус реализации

| Статус | Описание |
|---|---|
| Реализовано | Статический Green Tribe profile в shared-контракте. |
| Реализовано | Backend endpoint для применения Green Tribe flair текущему Reddit-пользователю. |
| Реализовано | Возврат `publicFlair` и `passportLines` из dev state/action responses. |
| Реализовано | Автоматическая синхронизация Green/Blue flair при выборе армии и изменении состояния. |
| Реализовано | Динамические звания по XP и custom emoji из `playerRanks.ts`. |
| Не реализовано | Чтение текущего flair пользователя из Reddit перед изменением. |
| Не реализовано | Хранение факта выданного flair в Redis. |
| Не реализовано | UI-кнопка в клиенте для `/api/dev/apply-flair`. |
| Не реализовано | Удаление, откат или восстановление flair. |

## 3. Основные файлы

| Файл | Роль |
|---|---|
| `game/src/shared/api.ts` | Shared contract. Содержит `DEV_GREEN_PROFILE`, `DevStateResponse`, `DevActionResponse`. |
| `game/src/server/routes/api.ts` | Hono API. Содержит `/api/dev/state` и `/api/dev/apply-flair`. |
| `game/src/server/core/dailyCycle.ts` | Daily battle state. Хранит участие игрока, но не работает с flair. |
| `game/devvit.json` | Devvit config. Включает Reddit moderator scope и dev subreddit. |
| `game/package.json` | Версия Devvit SDK: `devvit`/`@devvit/web` `0.13.5`. |

## 4. Текущий профиль flair

Источник: `DEV_GREEN_PROFILE` в `game/src/shared/api.ts`.

```ts
publicFlair: "🟢 Green Tribe · Infantry · 🏅🎖️"
```

Состав профиля:

| Поле | Значение |
|---|---|
| Tribe | `Green Tribe` |
| Rank | `Infantry` |
| Class | `Shield Doctrine` |
| Medals | `17` |
| Rare medals | `First Blood`, `AI Whisperer`, `Shield Wall Survivor`, `Spy Detected` |

Важно: сейчас эти значения статические. Они не рассчитываются из игровой статистики, Reddit-комментариев, побед, поражений или истории battles.

## 5. Backend flow: применение flair

Endpoint:

```txt
POST /api/dev/apply-flair
```

Текущий алгоритм:

1. Server получает текущий Reddit username через `reddit.getCurrentUsername()`.
2. Если username отсутствует, endpoint возвращает `400`.
3. Server вызывает `reddit.setUserFlair(...)`.
4. Flair применяется в текущем сабреддите.
5. Ответ возвращает `DevActionResponse` с тем же `publicFlair` и `passportLines`.

Текущие параметры Reddit API:

| Параметр | Значение |
|---|---|
| `subredditName` | `context.subredditName` или fallback `humans_vs_ai_dev` |
| `username` | Текущий Reddit username |
| `text` | `DEV_GREEN_PROFILE.publicFlair` |
| `textColor` | `light` |
| `backgroundColor` | `#178c45` |

Endpoint не принимает username из body. Это снижает риск случайной выдачи flair чужому пользователю в текущей реализации.

## 6. Dev state flow

Endpoint:

```txt
GET /api/dev/state
```

Назначение:

- вернуть текущий `postId`;
- вернуть имя сабреддита;
- вернуть статический `publicFlair`;
- вернуть `passportLines`;
- вернуть `warRoom`, если он был создан для post.

Этот endpoint не проверяет фактический Reddit flair пользователя. Он показывает профиль, который игра умеет выдать.

## 7. Player join flow и связь с flair

Endpoint:

```txt
POST /api/player/join
```

Текущий `joinCurrentPlayer(army)`:

- требует `context.userId`;
- записывает игрока в Redis hash `app:players`;
- хранит `redditUserId`, `army`, `joinedAt`, `updatedAt`;
- не вызывает `reddit.setUserFlair`;
- не сохраняет `redditUsername`;
- не сохраняет `publicFlair`;
- не различает Green/Blue flair.

Следствие: игрок может присоединиться к армии без изменения Reddit user flair.

## 8. Источники правды

| Данные | Источник правды сейчас |
|---|---|
| Участие игрока в battle | Redis `app:players` |
| Выбранная армия | Redis `app:players[redditUserId].army` |
| Текст текущего dev flair | `DEV_GREEN_PROFILE.publicFlair` |
| Фактически примененный flair на Reddit | Reddit subreddit user flair |
| Passport lines | Статический массив `DEV_GREEN_PROFILE.passportLines` |
| Ранги/медали | Пока не имеют backend-источника |

## 9. Возможности Devvit SDK, релевантные системе flair

Локальный SDK `@devvit/web`/`devvit` версии `0.13.5` предоставляет Reddit client методы:

| Метод | Возможность | Статус в игре |
|---|---|---|
| `setUserFlair(options)` | Установить user flair одному пользователю | Используется |
| `setUserFlairBatch(subredditName, flairs)` | Массово установить flair до 100 пользователей за вызов | Не используется |
| `removeUserFlair(subredditName, username)` | Удалить user flair | Не используется |
| `getUserFlairTemplates(subredditName)` | Получить user flair templates | Не используется |
| `createUserFlairTemplate(options)` | Создать user flair template | Не используется |
| `editFlairTemplate(options)` | Изменить flair template | Не используется |
| `deleteFlairTemplate(...)` | Удалить flair template | Не используется |
| `reddit.getUserByUsername(username)` + `user.getUserFlairBySubreddit(subreddit)` | Прочитать flair одного пользователя | Не используется |
| `reddit.getSubredditByName(name)` + `subreddit.getUserFlair(options)` | Прочитать список user flair в сабреддите или по usernames | Не используется |
| `subreddit.userFlairsEnabled` | Проверить, включены ли user flairs в сабреддите | Не используется |
| `subreddit.usersCanAssignUserFlairs` | Проверить, могут ли пользователи назначать себе user flair | Не используется |

Поддерживаемые параметры одиночной установки:

| Параметр | Назначение |
|---|---|
| `subredditName` | Сабреддит, где меняется flair |
| `username` | Пользователь, которому меняется flair |
| `flairTemplateId` | ID существующего flair template |
| `text` | Текст flair |
| `cssClass` | CSS class flair |
| `backgroundColor` | Цвет фона или `transparent` |
| `textColor` | `light` или `dark` |

### 9.1. Flair как сущность Reddit/Devvit

User Flair - это не внутренняя игровая сущность Devvit webview, а Reddit-сущность сабреддита. Игра через Devvit может читать и изменять ее server-side, но фактическое состояние живет на стороне Reddit.

Практические свойства:

| Свойство | Значение для разработки |
|---|---|
| Scope | Flair действует внутри одного subreddit, не глобально по Reddit. |
| Visibility | Отображается Reddit UI рядом с пользователем в поддерживаемых поверхностях. |
| Ownership | Состояние принадлежит Reddit/subreddit, не Redis игры. |
| Mutability | Flair может быть изменен игрой, модератором, пользователем при разрешенных настройках или другой автоматизацией. |
| Runtime | Изменение выполняется backend-кодом Devvit через Reddit client. |
| Client | Phaser/webview не имеет прямого доступа к Reddit flair API. |
| Consistency | После изменения возможна задержка отображения в Reddit UI или кэширование. |

Следствие: flair подходит для публичной идентичности и наград, но не подходит как единственный источник игровой логики.

### 9.2. User flair vs post flair

В SDK есть два близких, но разных класса задач:

| Тип | Что маркирует | Применение в игре |
|---|---|---|
| User flair | Пользователя внутри subreddit | Фракция, ранг, медали, статус участника. |
| Post flair | Пост внутри subreddit | Тип battle post, daily event, announcement, result post. |

Этот документ описывает user flair. Post flair можно использовать отдельно для классификации игровых постов, но он не заменяет профиль игрока.

### 9.3. Прямой flair и flair templates

Есть две модели назначения:

| Модель | Как работает | Плюсы | Минусы |
|---|---|---|---|
| Direct assignment | `setUserFlair` задает `text`, `backgroundColor`, `textColor`, `cssClass` напрямую | Максимально гибко, можно генерировать текст под игрока | Легче получить хаос форматов, сложнее миграции |
| Template-based | Создаются user flair templates, затем назначается `flairTemplateId` | Единый стиль, стабильные цвета, проще модерация | Меньше гибкости для динамических медалей и рангов |

Для production-игры безопаснее держать ограниченный набор templates для фракций и статусов, а динамические данные хранить в Redis/passport. Flair тогда показывает короткий публичный summary.

### 9.4. Настройки user flair template

При создании или редактировании template доступны:

| Параметр | Значение для игры |
|---|---|
| `allowableContent` | Ограничить содержимое: `all`, `text`, `emoji`. |
| `backgroundColor` | Цвет фона template. |
| `maxEmojis` | Лимит emoji внутри template. |
| `modOnly` | Template доступен только модераторам/автоматизации. |
| `text` | Базовый текст template. |
| `textColor` | `light` или `dark`. |
| `allowUserEdits` | Разрешить пользователю редактировать выбранный flair. |

Важное ограничение SDK: при `editFlairTemplate(options)` поля, оставленные `undefined`, могут сброситься к default. Поэтому редактирование templates нужно делать аккуратно и передавать полный ожидаемый набор настроек.

### 9.5. Чтение и сверка flair

Для developer-flow доступны два подхода:

| Подход | Для чего нужен |
|---|---|
| `user.getUserFlairBySubreddit(subreddit)` | Проверить flair одного игрока. |
| `subreddit.getUserFlair({ usernames })` | Проверить flair группы пользователей. |
| `subreddit.getUserFlair({ after })` | Пагинировать список flair сабреддита. |

Ограничения чтения:

- список user flair возвращается порциями;
- в моделях указан default limit `25`, max `1000`;
- чтение не заменяет внутренний audit log игры;
- read-back после write может быть полезен, но его нельзя использовать как высокочастотный realtime-loop.

### 9.6. Массовые операции

`setUserFlairBatch(subredditName, flairs)` позволяет обновлять до 100 пользователей за один вызов.

Применение в игре:

- сезонный reset flair;
- массовая выдача reward flair после battle;
- миграция старого формата flair на новый;
- исправление некорректных flair после бага;
- выдача supporter/cosmetic flair.

Ограничения batch:

- максимум 100 entries за вызов;
- batch config поддерживает `username`, `text`, `cssClass`;
- batch не принимает `backgroundColor`, `textColor` или `flairTemplateId` в текущем типе SDK;
- если `text` и `cssClass` пустые, flair будет очищен;
- `text` в batch не должен содержать comma character `,`;
- результат нужно логировать по каждому пользователю, потому что частичный успех возможен на уровне entries.

### 9.7. Что можно строить на user flair в игре

Подходящие сценарии:

| Сценарий | Реалистичность |
|---|---|
| Фракционная идентичность Green/Blue | Хорошо подходит. |
| Ранг игрока | Подходит как короткий публичный summary. |
| Медали/бейджи | Подходит для 1-3 ключевых emoji, полный список лучше хранить отдельно. |
| Сезонный статус | Подходит: `Season 1 Veteran`, `Battle Winner`, `Founding Soldier`. |
| Supporter/cosmetic flair | Подходит, если не дает gameplay advantage. |
| Временный статус события | Подходит, если обновления редкие. |
| Массовая награда после daily battle | Подходит через batch/job-like flow. |
| Доступ к закрытой логике | Не подходит как единственная проверка. Нужна Redis/server-side проверка. |
| Realtime HP/score/progress | Не подходит. Слишком внешняя и медленная сущность. |

### 9.8. Developer-ограничения при проектировании

- Не обновлять flair при каждом изменении счета, hp, kill count или frame/state.
- Не хранить во flair секретные роли, если они не должны быть публичными.
- Не делать flair единственным anti-cheat или access-control механизмом.
- Не полагаться на то, что пользователь увидит обновленный flair мгновенно.
- Не смешивать user-editable flair с authoritative game state.
- Не кодировать слишком много данных в одной строке flair: Reddit UI может обрезать или плохо отобразить длинный текст.
- Не использовать comma в batch text.
- Не считать `cssClass` полноценным styling API внутри Devvit webview: это Reddit flair styling, а не CSS игры.
- Не запускать массовые flair-операции из пользовательского клика без очереди, лимитов и idempotency.

### 9.9. Рекомендуемые архитектурные паттерны

| Паттерн | Описание |
|---|---|
| Server-owned flair profile | Карта `army/status/rank -> flair text/templateId` хранится в server/shared config. |
| Redis audit | После попытки write сохранять `requestedText`, `status`, `error`, `updatedAt`. |
| Idempotency | Не вызывать Reddit API, если нужная версия flair уже применялась. |
| Reconcile job | Периодически сверять Redis и Reddit flair для важных игроков. |
| Template registry | Создать и версионировать разрешенный набор flair templates. |
| Manual admin repair | Иметь moderator-only endpoint для повторной выдачи или очистки flair. |
| Public summary, private truth | Flair показывает короткий статус, а полная truth-модель остается в Redis. |

## 10. Ограничения текущей реализации

### 10.1 Игровые ограничения

- Flair не влияет на победу, matchmaking, урон, счетчик армии или результат daily battle.
- Flair не является доказательством участия игрока в battle.
- Пользовательский выбор Green/Blue в игре не синхронизируется с flair.
- Все пользователи получают один и тот же Green Tribe flair.
- Ранг `Infantry`, класс `Shield Doctrine` и медали сейчас декоративные.
- Нет механики повышения ранга или пересчета медалей.
- Нет отдельного flair для AI Agent, Spy, Commander или временных ролей.

### 10.2 Технические ограничения

- Endpoint `/api/dev/apply-flair` не использует retry-helper для Reddit rate limit.
- Нет idempotency key для операции применения flair.
- Нет read-back проверки после `setUserFlair`.
- Нет Redis-аудита успешных и неуспешных попыток.
- Нет защиты от повторных вызовов endpoint одним пользователем.
- Нет server-side проверки, что пользователь уже joined daily battle.
- Нет server-side проверки соответствия `army` и выдаваемого flair.
- Нет client flow, который вызывает endpoint после выбора армии.
- Нет отдельного production/admin gate для dev endpoint.
- Fallback `humans_vs_ai_dev` может быть нежелателен в production-контексте без `context.subredditName`.

### 10.3 Platform-ограничения

- User flair scoped на конкретный subreddit.
- Flair может быть изменен Reddit-модератором, пользователем или другой автоматизацией вне игры.
- Игра сейчас не синхронизирует внешние изменения flair обратно в Redis.
- Reddit API может отклонить flair по platform-валидации, правам, rate limit или настройкам сабреддита.
- Batch API локального SDK ограничен 100 записями за вызов.
- Для batch-конфигурации текст не должен содержать comma character `,`.

## 11. Права и безопасность

Текущий `game/devvit.json` включает:

```json
"permissions": {
  "reddit": {
    "scope": "moderator",
    "asUser": ["SUBMIT_COMMENT"]
  }
}
```

Практические выводы:

- Flair меняется только server-side через `@devvit/web/server`.
- Client не получает прямой доступ к Reddit credentials.
- Для изменения user flair требуется moderator-level Reddit capability в контексте приложения.
- Текущий endpoint меняет flair только текущему пользователю, потому что username берется из Reddit context.
- Dev endpoints не должны считаться production-safe без отдельной проверки доступа.

## 12. Ошибки и ответы

Успех:

```json
{
  "type": "dev-action",
  "message": "Applied Green Tribe flair to u/<username>.",
  "publicFlair": "🟢 Green Tribe · Infantry · 🏅🎖️",
  "passportLines": ["..."]
}
```

Ошибка без username:

```json
{
  "status": "error",
  "message": "Current Reddit username is required"
}
```

Ошибка Reddit API:

```json
{
  "status": "error",
  "message": "Failed to apply Green Tribe flair"
}
```

## 13. Рекомендуемая production-модель

Если flair должен стать частью основного игрового flow, минимальная безопасная модель:

1. Создать enum/profile map для обеих армий:
   - `green`;
   - `blue`.
2. Применять flair после успешного `joinCurrentPlayer(army)`.
3. Хранить в Redis:
   - `redditUserId`;
   - `redditUsername`;
   - `army`;
   - `flairText`;
   - `flairVersion`;
   - `flairAppliedAt`;
   - `flairApplyStatus`.
4. Добавить idempotency:
   - если текущий `flairVersion` уже применен, не дергать Reddit API повторно.
5. Добавить retry для Reddit rate limit по аналогии с war-room comments.
6. Разделить dev endpoints и production endpoints.
7. Добавить явный rollback/remove endpoint только для moderator/admin flow.

## 14. Минимальный будущий API-контракт

Вариант без усложнения:

```txt
POST /api/player/join
```

Body:

```json
{
  "army": "green"
}
```

Server-side поведение:

1. Сохранить join в Redis.
2. Получить current username.
3. Выбрать flair profile по `army`.
4. Применить flair через `reddit.setUserFlair`.
5. Сохранить результат применения в Redis.
6. Вернуть игрока, армию и статус flair.

Response:

```json
{
  "type": "player-join",
  "user": {
    "exists": true
  },
  "flair": {
    "status": "applied",
    "text": "🟢 Green Tribe · Infantry"
  }
}
```

## 15. Что нельзя считать реализованным

Нельзя заявлять, что система уже поддерживает:

- полноценные player passports;
- постоянные профили игроков;
- динамические medal/rank rewards;
- разные flair по фракциям;
- flair-based access control;
- автоматическую выдачу после выбора армии;
- защиту от ручного изменения flair;
- массовую миграцию flair;
- production-ready moderation flow.

Сейчас реализован только dev/MVP-скелет: один статический Green Tribe flair, который backend может применить текущему Reddit-пользователю через Reddit API.
