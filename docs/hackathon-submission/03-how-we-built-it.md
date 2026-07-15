# How we built it

## English

We built **Humans vs AI** as a Reddit-native system, not as a conventional web game placed behind a link.

The experience has two Devvit Web entry points: a lightweight inline splash inside the post and an expanded game view. **Phaser 4** powers the visual battlefield, while responsive HTML, CSS, and TypeScript handle the operation interface, doctrine controls, reports, and global map. **Vite** bundles the client and server, and shared TypeScript contracts keep both sides aligned.

On the server, **Hono** exposes a small API for bootstrap data, event participation, hidden orders, AI interactions, and the global map. **Redis** separates persistent identity from daily battle state:

- global player profile, XP, rank, streaks, and rewards;
- event-local army assignment and spy cover;
- hidden doctrine orders;
- daily posts, battles, and results;
- territory ownership and capture history;
- pending Reddit flair synchronization.

Reddit itself provides the social layer. Devvit creates the Daily Post, publishes the AI, Green, and Blue branches, reads public discussion, applies temporary user flair, posts the result, and runs scheduled daily tasks. The server is authoritative: duplicate joins are idempotent, concurrent assignments use a lock, doctrine ties use a battle-seeded hash, and battle resolution can be explained from stored inputs.

The **OpenAI Responses API** gives the opponent an in-universe voice and can analyze public war-room discussions to recommend a doctrine. We deliberately keep the model outside the trusted core. It receives public information, never hidden player orders, while the deterministic resolver calculates the actual result.

That separation became one of our most important design rules:

> **AI creates pressure; deterministic server rules preserve trust.**

We also built for the unglamorous realities of a living Reddit game. Flair failures enter a durable retry queue instead of canceling participation. Scheduled operations are idempotent. Resolved state is saved before cosmetic cleanup. The apocalypse may be epic, but it still needs reliable cron jobs.

---

## Русский перевод

Мы создали **Humans vs AI** как нативную систему Reddit, а не как обычную веб-игру, спрятанную за внешней ссылкой.

У Devvit Web-приложения есть две точки входа: лёгкий inline-экран прямо внутри поста и развёрнутая игровая сцена. **Phaser 4** отвечает за визуальное поле боя, а адаптивные HTML, CSS и TypeScript — за интерфейс операции, выбор доктрины, отчёты и глобальную карту. **Vite** собирает клиент и сервер, а общие TypeScript-контракты синхронизируют обе стороны.

На сервере **Hono** предоставляет компактный API для начального состояния, участия в событии, скрытых приказов, взаимодействия с ИИ и глобальной карты. **Redis** разделяет постоянную личность игрока и состояние конкретного дневного боя:

- глобальный профиль, XP, звание, серии участия и награды;
- локальное назначение в армию и прикрытие шпиона;
- скрытые доктринальные приказы;
- ежедневные посты, сражения и результаты;
- владение территориями и история захватов;
- ожидающая синхронизация Reddit flair.

Сам Reddit формирует социальный слой. Devvit создаёт Daily Post, публикует ветки ИИ, Green и Blue, читает публичные обсуждения, применяет временные пользовательские flair, публикует результат и запускает ежедневные задачи по расписанию. Авторитет остаётся у сервера: повторная заявка идемпотентна, конкурентные назначения защищены блокировкой, ничьи доктрин разрешаются hash от battle seed, а результат боя можно объяснить через сохранённые входные данные.

**OpenAI Responses API** даёт противнику голос внутри игрового мира и может анализировать публичные обсуждения штабов, чтобы рекомендовать доктрину. Мы намеренно оставили модель за пределами доверенного ядра. Она получает публичную информацию, но никогда не видит скрытые приказы игроков, а фактический результат рассчитывает детерминированный resolver.

Это разделение стало одним из главных правил проекта:

> **ИИ создаёт давление; детерминированные серверные правила сохраняют доверие.**

Мы также учли негламурную реальность живой Reddit-игры. Ошибки flair попадают в надёжную очередь повторных попыток и не отменяют участие. Задачи по расписанию идемпотентны. Состояние завершённого боя сохраняется до косметической очистки. Апокалипсис может быть эпическим, но даже ему нужны надёжные cron-задачи.
