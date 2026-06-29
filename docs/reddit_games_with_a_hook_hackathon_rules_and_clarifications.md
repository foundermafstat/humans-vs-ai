# The first real epic human war versus AI  
# Документ правил, ограничений и уточнений по Reddit Games with a Hook Hackathon

**Версия:** 1.0  
**Дата подготовки:** 2026-06-29  
**Назначение документа:** зафиксировать правила хакатона, требования к подаче, ограничения Reddit Developer Platform / Devvit, риски для нашей игры и практические выводы для MVP.

> Это не юридическая консультация. Документ — рабочий чеклист для проектирования, разработки и сабмита игры на Reddit Games with a Hook Hackathon. Перед финальным сабмитом нужно повторно проверить официальные страницы хакатона и Devvit Rules.

---

## 1. Краткий вывод

Для хакатона мы должны подать не просто веб-игру, а **Reddit-native игру**, которая работает через Reddit Developer Platform / Devvit и ощущается как часть Reddit-сообщества.

Для нашей игры это означает:

```txt
Пост = поле боя
Комментарии = открытый штаб
Сообщество = армия / дивизия
Игрок = солдат
Шпион = добровольная временная скрытая роль
ИИ = антагонист, комментатор и источник давления
Глобальная карта = долгосрочная память войны
```

Самая важная задача: сделать так, чтобы судья и обычный пользователь поняли игру за первые 20–30 секунд.

Минимальная формула MVP:

```txt
Одна активная территория.
Две дивизии.
ИИ как третья сторона.
Таймер до события.
Игрок выбирает доктрину + поддействие.
Шпион добровольно принимает скрытую роль и пытается увести дивизию к проигрышу.
Комментарии создают открытый штаб.
ИИ комментирует агрегированные сигналы и итог фазы.
После фазы карта меняет состояние, игрок получает прогресс и медали.
```

---

## 2. Официальные сроки хакатона

### Submission Period

Официальный период подачи:

```txt
June 17, 2026, 12:00 PM Pacific Time
→ July 15, 2026, 6:00 PM Pacific Time
```

Для Испании это примерно:

```txt
Дедлайн: 16 июля 2026, 03:00 CEST
```

Практический вывод:

```txt
Финальную версию нельзя собирать в последнюю ночь.
До дедлайна должен быть готов:
- рабочий Reddit app listing;
- публичный demo post;
- README.md;
- Devpost description;
- короткое видео до 1 минуты;
- тестовый subreddit с доступом для судей.
```

### Judging Period

Официальный judging period:

```txt
July 16, 2026, 12:00 AM Pacific Time
→ July 27, 2026, 6:00 PM Pacific Time
```

### Winners Announced

```txt
On or around July 29, 2026, 3:00 PM Pacific Time
```

---

## 3. Что именно нужно создать

По правилам хакатона требуется создать **игру для сообществ Reddit** на Reddit Developer Platform.

Главный смысл темы:

```txt
игра должна возвращать людей день за днём;
игра должна объединять людей;
игра должна использовать социальную природу Reddit;
игра должна создавать обсуждение, коллективные решения и повторные заходы.
```

Особенно ценно:

```txt
shared play;
collaboration;
competition;
community-driven outcomes;
comment sections as gameplay;
daily / recurring content;
leaderboards;
streaks;
user contributions.
```

Для нашей игры это хорошо совпадает с концепцией:

```txt
дивизии;
глобальная карта;
8-часовые фазы;
комментарии как штаб;
шпионская роль;
ИИ-комментарии;
личная прогрессия;
медали;
территории;
события по фазам.
```

---

## 4. Что Reddit не хочет видеть

Официальная страница хакатона отдельно предупреждает, что слабее будут смотреться следующие направления.

### 4.1. AI slop

Нельзя, чтобы игра выглядела как случайно собранный AI-generated интерфейс:

```txt
плохая читаемость;
кривой viewport;
случайный стиль;
перегруженный UI;
непонятные кнопки;
слишком много текста;
ощущение сырой генерации.
```

Для нас:

```txt
ИИ как тема игры допустим.
Но интерфейс, тексты и механика должны ощущаться авторскими, отполированными и понятными.
```

### 4.2. Слишком буквальная Reddit-тематика

Reddit-y не значит:

```txt
игра про карму;
игра про логотип Reddit;
игра про Snoo;
игра с названием Reddit в брендинге.
```

Reddit-y значит:

```txt
игра использует сообщества;
игра использует комментарии;
игра строится вокруг коллективной культуры;
игра порождает обсуждения и внутренние шутки.
```

Для нас:

```txt
В публичном названии НЕ используем Reddit.
Лучше говорить "communities", "divisions", "threads", "fronts".
Можно объяснять, что subreddit = division, но бренд Reddit не должен быть частью названия или логотипа.
```

### 4.3. Клоны и распространённые идеи

Слабее могут оцениваться:

```txt
обычные космические шутеры;
простые платформеры;
клоны популярных игр;
простые trivia apps;
collaborative storytelling без уникальной механики.
```

Для нас:

```txt
Нельзя продавать проект как "ещё одна стратегия с RPS".
Нужно продавать его как "open war-room game", где комментарии, шпионы и публичная дезинформация влияют на карту.
```

---

## 5. Критерии судейства

Все основные критерии судейства равновесные.

### 5.1. Delightful UX

Что оценивают:

```txt
красивый, интересный, приятный опыт;
увлекательные layout и тема;
легко и весело раскрывать игру.
```

Вывод для нас:

```txt
Первый экран должен быть очень сильным:
- карта / точка конфликта на фоне;
- таймер события;
- две дивизии против ИИ;
- три доктрины Strike / Shield / Hack;
- секретный шпионский момент как вау-сцена;
- минимум текста.
```

### 5.2. Polish

Что оценивают:

```txt
насколько проект близок к publishable;
насколько он соответствует Devvit Rules;
понятно ли всё через example posts;
работает ли без объяснений.
```

Вывод для нас:

```txt
Лучше меньше систем, но они должны работать:
- одна активная территория;
- один demo loop;
- рабочая смена фазы;
- AI broadcast;
- личная медаль;
- карта меняет состояние.
```

### 5.3. Reddity

Что оценивают:

```txt
самобытность;
сообщество;
bringing people together;
freshness for the platform.
```

Вывод для нас:

```txt
Комментарии нельзя оставлять декоративными.
Они должны быть открытым штабом:
- игроки спорят;
- шпион вводит в заблуждение;
- ИИ комментирует общие сигналы;
- публичное обсуждение может стать дезинформацией.
```

### 5.4. Hook

Что оценивают:

```txt
есть ли причина возвращаться регулярно;
есть ли ожидание следующей фазы;
есть ли ongoing goals;
есть ли evolving experience.
```

Вывод для нас:

```txt
Production loop:
- каждый день новый военный день;
- каждые 8 часов новая фаза;
- территории меняют владельцев;
- дивизии получают очки;
- игрок сохраняет звание, медали, streak.

Demo loop:
- фазы по 3 минуты;
- полный цикл показывается быстро.
```

### 5.5. Phaser Innovation

Если используем Phaser, можно претендовать на отдельный приз.

Вывод для нас:

```txt
Phaser стоит использовать для:
- глобальной карты;
- светящихся территорий;
- эффектов захвата;
- AI-core анимации;
- линий фронта;
- смены цвета территории после фазы.
```

---

## 6. Подкатегории и призы

Основные и дополнительные категории:

```txt
Best App with a Hook — $15,000
Best Use of Phaser — $5,000
Best Use of Retention Mechanics — $3,000
Best Use of User Contributions — $3,000
Honorable Mentions — $1,000, 10 winners
Devvit Helper Award — $500, 6 winners
Feedback Awards — $200, 5 winners
```

Важное уточнение:

```txt
Один проект может выиграть только один приз.
```

Для нашей игры самые реалистичные целевые категории:

```txt
1. Best App with a Hook
2. Best Use of Retention Mechanics
3. Best Use of User Contributions
4. Best Use of Phaser, если визуальная карта будет сделана на Phaser
```

---

## 7. Что нужно предоставить на сабмит

Обязательный набор:

```txt
1. Project built using Reddit Developer Platform.
2. Text description с объяснением features и functionality.
3. App listing:
   https://developers.reddit.com/apps/{app-name}
4. Detailed README.md в root directory приложения.
5. Demo post:
   ссылка на test subreddit + public post running the game.
6. Материалы на английском или с английским переводом.
7. Все материалы должны быть оригинальными или лицензированными.
```

Опционально, но практически обязательно для сильной подачи:

```txt
1. Demo video до 1 минуты.
2. Public repository.
3. Developer Platform feedback survey.
```

Важно:

```txt
Судьи не обязаны тестировать проект.
Они могут судить только по description, images и video.
```

Практический вывод:

```txt
Видео должно за 60 секунд показать:
- игрок входит в битву;
- получает предложение стать шпионом;
- принимает роль;
- видит секретную цель;
- публично/стратегически влияет на направление;
- фаза завершается;
- ИИ оставляет язвительный комментарий;
- территория на карте меняет цвет;
- игрок получает медаль и прогресс.
```

---

## 8. Требования к demo post и test subreddit

Для сабмита нужен demo post — рабочий пост с игрой.

Официальная рекомендация:

```txt
делать demo post в public subreddit с менее чем 200 members;
или установить app для auto-approval admins.
```

Также проект должен быть:

```txt
free of charge;
без ограничений для тестирования;
доступен до конца judging period.
```

Критическое уточнение:

```txt
Для сабмита лучше иметь маленький public demo subreddit.
Но для Developer Funds позже считаются Daily Qualified Engagers только в сообществах с минимум 200 members и Safe-for-Work / monetization-eligible контекстом.
```

То есть:

```txt
Hackathon judging subreddit != future growth subreddit.
```

---

## 9. Язык материалов

Все материалы должны быть на английском или иметь английский перевод.

Для нашей игры:

```txt
Русское рабочее название:
"Первая эпическая битва человечества против искусственного интеллекта"

Английское публичное название:
"The first real epic human war versus AI"
```

Но для Devvit app slug нужно короткое техническое имя.

Рекомендуемые варианты slug:

```txt
first-ai-war
human-vs-ai
war-vs-ai
ai-front
```

Не использовать:

```txt
reddit-war
subreddit-war
snoo-war
```

Потому что нельзя создавать впечатление официальной связи с Reddit и нельзя использовать Reddit IP / brand assets без письменного разрешения.

---

## 10. Devvit Web: как должна быть устроена игра

Devvit Web поддерживает стандартную web-архитектуру:

```txt
client
server
devvit.json
```

Можно использовать:

```txt
React;
Phaser;
Three.js;
Express / Hono / Koa на server side;
Redis;
Reddit API;
Realtime;
Scheduler;
Triggers.
```

Для нашей игры рекомендуемая архитектура:

```txt
Client:
- React UI для интерфейса;
- Phaser canvas для карты / фронта / территорий;
- fetch только в собственные /api endpoints.

Devvit server:
- авторизация через Devvit context;
- проверка действия игрока;
- запись в Redis;
- публикация AI comments от app account;
- отправка Realtime events;
- server-side fetch во внешний backend при необходимости.

External backend:
- глобальная карта;
- междивизионные результаты;
- история территорий;
- сложные аналитические расчёты;
- но только через allow-listed domain.
```

---

## 11. Custom post размеры и UI-ограничения

Custom posts имеют две основные высоты:

```txt
REGULAR = 320px
TALL = 512px
```

Ширина меняется примерно:

```txt
~288px → ~880px
```

Для нашей игры:

```txt
основной inline target:
288 × 512

comfort mobile:
320–390 × 512

desktop inline:
640–880 × 512
```

Практический вывод:

```txt
Первый экран не должен быть обычным fullscreen mobile UI.
Всё главное должно помещаться в 512px высоты:
- точка конфликта на карте;
- координаты;
- таймер;
- две дивизии;
- ИИ;
- три доктрины;
- статус подозрительной активности;
- CTA.
```

Если нужен более глубокий интерфейс:

```txt
использовать expanded mode после явного действия пользователя.
```

---

## 12. Технические ограничения Devvit Web

Критические ограничения:

```txt
1. Server endpoints serverless.
2. Нельзя рассчитывать на долгоживущий Node server внутри Devvit.
3. WebSockets не поддерживаются.
4. Streaming / chunked responses не поддерживаются.
5. Клиент не может делать внешние fetch-запросы напрямую.
6. Внешние запросы должны идти через server-side fetch.
7. localStorage очищается при обновлении app version.
8. Важные данные хранить в Redis / внешнем backend.
9. Max request time: 30s.
10. Max payload size: 4MB.
11. Max response size: 10MB.
```

Практический вывод:

```txt
Нельзя строить real-time MMO через WebSockets.
Нужно строить асинхронную фазовую стратегию:
- player action → server endpoint → Redis/backend → Realtime update.
```

---

## 13. Внешний сервер и HTTP Fetch

Внешний сервер возможен, но с важными ограничениями.

### 13.1. Клиент не ходит наружу напрямую

Нельзя:

```txt
client → https://my-backend.com/api
```

Правильно:

```txt
client → /api/action
Devvit server → external backend через allow-listed HTTP Fetch
```

### 13.2. Домены должны быть allow-listed

В `devvit.json` нужно указать точные домены:

```json
{
  "permissions": {
    "http": {
      "enable": true,
      "domains": ["your-project.supabase.co"]
    }
  }
}
```

Требования:

```txt
- exact hostname only;
- без протокола https://;
- без wildcard;
- без path;
- каждый домен нужно запросить отдельно.
```

### 13.3. Personal domains — высокий риск

Правила HTTP Fetch говорят, что personal domains по умолчанию не approved, кроме возможных исключений с детальным обоснованием.

Практический вывод:

```txt
Для MVP лучше не завязывать жизнеспособность игры на свой VPS-домен.

Более безопасные варианты:
- Devvit Redis для demo;
- Supabase;
- Firebase;
- SpacetimeDB;
- S3 / Google Storage для файлов;
- внешний backend только если домен и use case проходят review.
```

### 13.4. Terms & Privacy обязательны при fetch

Если app использует HTTP Fetch, нужно иметь:

```txt
Terms and Conditions;
Privacy Policy;
Fetch Domains section в README.
```

---

## 14. LLM и ИИ-комментатор

В нашей игре есть ИИ-антагонист. Но важно отделять:

```txt
ИИ как персонаж игры
```

от

```txt
реального LLM, который генерирует комментарии.
```

### 14.1. Самый безопасный MVP

```txt
Шаблонный AI-commentator.
Анализ комментариев через агрегаты:
- mentions Strike;
- mentions Shield;
- mentions Hack;
- общий noise score;
- public plan mismatch;
- spy pressure.
```

Плюсы:

```txt
быстрее;
без внешнего LLM;
меньше review-риск;
нет риска токсичных генераций;
легко контролировать стиль.
```

### 14.2. Если использовать настоящий LLM

Devvit Rules разрешают только approved LLMs:

```txt
Google Gemini;
OpenAI ChatGPT.
```

Нельзя:

```txt
self-hosted Llama;
Mistral;
Hugging Face;
любой другой AI provider без approval.
```

Также нельзя использовать Reddit data для:

```txt
training;
fine-tuning;
model improvement;
ML/NLP training by third parties.
```

Если используем LLM, нужны:

```txt
Terms;
Privacy Policy;
объяснение в README;
минимизация данных;
не отправлять лишний текст;
не хранить лишние комментарии.
```

Рекомендация для хакатона:

```txt
Не делать LLM обязательным для MVP.
Сделать AI narrator через шаблоны.
LLM оставить как optional polish только после стабильного core gameplay.
```

---

## 15. Комментарии, User Actions и открытый штаб

### 15.1. Нельзя заставлять комментировать

Reddit запрещает делать так, чтобы пользователь должен был:

```txt
запостить;
прокомментировать;
подписаться;
```

для продолжения игры.

Игровые действия должны быть внутри UI:

```txt
Choose Strike;
Choose Shield;
Choose Hack;
Accept Spy Role;
Decline Spy Role;
Commit Order.
```

Комментарии — добровольный социальный слой.

### 15.2. Нельзя автоматически писать от имени пользователя

Если приложение хочет создать пост или комментарий от имени пользователя:

```txt
нужен явный ручной action;
нужно заранее показать пользователю, что будет опубликовано;
комментирование должно быть отдельной кнопкой;
нельзя объединять "играть дальше" и "оставить комментарий".
```

Для MVP:

```txt
Не использовать комментарии от имени пользователя.
AI comments публиковать от app account.
```

### 15.3. ИИ-комментарии не должны спамить

Рекомендованный лимит:

```txt
1 комментарий ИИ в начале фазы;
1 комментарий ИИ в конце фазы;
опционально 1 mid-phase taunt при важном событии;
никаких ответов на каждый пользовательский комментарий.
```

### 15.4. Как сделать комментарии игровыми

Разрешено и желательно:

```txt
люди обсуждают стратегию в комментариях;
игра анализирует агрегированные сигналы;
ИИ комментирует не личности, а поведение дивизии;
публичный шум может стать deception mechanic.
```

Пример безопасного комментария ИИ:

```txt
"Division A mentioned Shield 31 times. Your secrecy protocol is loud."
```

Нельзя:

```txt
"u/username is suspicious."
"u/username is the traitor."
"Everyone report this player."
```

---

## 16. Удаление пользовательского контента и приватность

Если игра хранит комментарии или данные из Reddit, нужно уважать удаления.

Правило для MVP:

```txt
Не хранить полный текст комментариев без необходимости.
```

Лучше хранить агрегаты:

```txt
territory:{id}:comments:mentions:strike = 14
territory:{id}:comments:mentions:shield = 9
territory:{id}:comments:mentions:hack = 21
territory:{id}:comments:noiseScore = 0.64
```

Если всё же хранится `commentId`:

```txt
нужно реагировать на comment delete triggers;
удалять связанные данные;
не сохранять deleted content навсегда.
```

---

## 17. Шпионская механика: правила безопасности

Шпион — обязательная часть нашего MVP, но это самый рискованный социальный элемент.

### 17.1. Что можно

```txt
Шпион получает временную роль только на одну фазу.
Шпион должен явно согласиться.
Шпион может отказаться.
Шпион знает точную следующую доктрину ИИ.
Шпион видит реальное распределение приказов раньше остальных.
Шпион пытается направить обсуждение в неправильную сторону.
Шпион получает тайную медаль при успехе.
После раунда раскрывается только факт влияния шпиона.
```

### 17.2. Что нельзя

```txt
Нельзя публично раскрывать ник шпиона.
Нельзя поощрять травлю.
Нельзя давать кнопку "обвинить игрока".
Нельзя награждать за массовые обвинения в комментариях.
Нельзя делать шпиону обязательную задачу писать комментарии.
Нельзя автоматически публиковать комментарии от имени шпиона.
```

### 17.3. Как показывать подозрение

Правильно:

```txt
Suspicious activity: Low / Medium / High
AI Agent influenced this battle
Rival Agent pressure detected
Chaos signal disrupted coordination
```

Неправильно:

```txt
This player sabotaged you.
Find the traitor.
Report the spy.
```

### 17.4. Фиктивная ветка

Если вводим “фиктивную ветку”, она должна быть безопасной:

```txt
не фейковый официальный комментарий;
не impersonation;
не обман интерфейса;
не автоматический пост от пользователя.
```

Безопасный вариант для MVP:

```txt
В посте есть публичная ветка "War Room".
Шпион как обычный пользователь может писать туда добровольно.
Игра не требует комментариев.
Игра анализирует только общий public chatter.
```

Более сложный вариант после MVP:

```txt
App-created comment thread:
"Rumor Channel"
"Signal Noise"
"Intel Board"

Шпион может через UI добавить predefined rumor token:
- "Strike is safe"
- "Shield is needed"
- "Hack is a trap"

Но это должно быть создано приложением как игровая mechanic, без impersonation и без выдачи за реальные слова другого игрока.
```

---

## 18. Restricted content и темы, которых избегаем

Devvit Rules запрещают или ограничивают приложения, связанные с:

```txt
gambling;
financial products;
cryptocurrency;
healthcare;
political persuasion;
alcohol;
recreational drugs;
illegal/restricted activities;
harmful/dangerous activities.
```

Для нашей игры:

```txt
Не использовать crypto/NFT/tokens.
Не делать ставки на победу дивизий.
Не делать real-money wagering.
Не использовать реальные политические войны, реальные армии, реальные страны.
Не давать инструкции по реальному саботажу, взлому или вредным действиям.
```

Тематика должна быть:

```txt
fictional sci-fi;
symbolic AI war;
non-realistic;
community strategy;
no real-world violent instructions.
```

---

## 19. Брендинг и интеллектуальная собственность

Нельзя использовать:

```txt
Reddit trademark в названии;
Snoo как персонажа;
официальные логотипы Reddit;
чужие игровые UI, логотипы, персонажей, ассеты;
материалы без лицензии.
```

Для нашей игры:

```txt
Название: The first real epic human war versus AI
Неофициальный подзаголовок: A community war game built for Reddit posts
В публичной подаче: avoid implying endorsement by Reddit.
```

Лучше использовать формулировки:

```txt
communities;
divisions;
war rooms;
threads;
fronts;
battle posts.
```

Осторожнее использовать:

```txt
Reddit;
subreddit;
Snoo;
karma.
```

---

## 20. Payments и монетизация

### 20.1. Developer Program / Reddit Gold

Developer Program позволяет разработчикам зарабатывать:

```txt
$0.01 за 1 Reddit Gold,
потраченный на Devvit goods внутри приложения.
```

Минимальный payout:

```txt
$10
```

Но для MVP и хакатона не стоит делать монетизацию core mechanic.

Разрешённые будущие monetization ideas:

```txt
cosmetic division banners;
AI taunt skins;
soldier profile frames;
medal display themes;
map skin;
commander cosmetic effects;
supporter flair.
```

Не делать:

```txt
pay-to-win;
дополнительный голос за деньги;
купить роль шпиона;
купить победу территории;
lootbox с gameplay power;
ставки.
```

---

## 21. Reddit Developer Funds 2026

Программа Developer Funds 2026 работает:

```txt
April 1, 2025 → July 31, 2026
```

То есть окно короткое.

### 21.1. Daily Qualified Engager

Daily Qualified Engager — это уникальный logged-in user, который взаимодействует с app в конкретный день, в community минимум с 200 members и в monetization-eligible / Safe-for-Work контексте.

Пороги:

```txt
500 DQE     → $500
1,000 DQE   → $1,000
10,000 DQE  → $5,000
25,000 DQE  → $10,500
50,000 DQE  → $25,000
100,000 DQE → $25,000
250,000 DQE → $25,000
1,000,000 DQE → $75,000
```

Threshold считается по rolling 7-day average.

Практический вывод:

```txt
Для Funds важно не количество просмотров, а logged-in users, которые реально взаимодействуют с app.
```

Наша игра должна иметь очень короткий first action:

```txt
Open battle post.
Choose order.
Commit action.
Done.
```

### 21.2. Qualified Installs

Qualified Install — community с установленным Devvit App, минимум 1,000 members и monetization-eligible / SFW.

Пороги:

```txt
50 installs → $500
250 installs → $1,000
1,000 installs → $2,000
```

Threshold должен удерживаться 7 consecutive days.

### 21.3. Что не считается

Не засчитываются installs или members, полученные через:

```txt
spam;
bots;
manipulation.
```

Практический вывод:

```txt
Нельзя делать агрессивный invite spam.
Нельзя заставлять комментировать.
Нельзя строить growth loop через манипуляцию.
```

---

## 22. Различие между Hackathon demo и Developer Funds

Это важное противоречие:

```txt
Hackathon demo:
рекомендуется public subreddit с менее чем 200 members.

Developer Funds:
Daily Qualified Engagers считаются только в communities минимум с 200 members.
```

Решение:

```txt
1. Для сабмита используем маленький public demo subreddit.
2. Для будущего Developer Funds готовим стратегию установки в реальные SFW communities 200+ members.
3. В MVP не строим всё вокруг Funds.
4. В Devpost показываем retention potential, а не обещаем мгновенный payout.
```

---

## 23. Обязательные требования к README.md

README должен быть в root directory.

Рекомендуемая структура README:

```md
# The first real epic human war versus AI

## What is this game?
## How to play
## Reddit-native design
## Core loop
## Demo mode
## Production mode
## Spy role safety
## Comment usage and privacy
## Tech stack
## Devvit features used
## Fetch Domains
## Data stored
## Local development
## How to create demo post
## Known limitations
## License / assets
```

Если используем external fetch, обязательно добавить:

```md
## Fetch Domains

- `your-project.supabase.co` — stores global map and cross-division campaign state.
- `api.openai.com` — optional AI narration, only if enabled.
```

---

## 24. Devpost description: что обязательно объяснить

В описании Devpost нужно раскрыть:

```txt
1. One-line hook.
2. Почему это Reddit-native.
3. Как работает один раунд.
4. Как работают комментарии.
5. Как работает шпион.
6. Как игра возвращает игроков.
7. Что построено в MVP.
8. Что в demo mode.
9. Какие Devvit capabilities используются.
10. Почему это безопасно и не спамит.
```

Пример one-line hook:

```txt
The first real epic human war versus AI turns a Reddit post into a battlefield where divisions fight for territories, comments become open war rooms, and one hidden spy may quietly lead humanity into the machine’s trap.
```

---

## 25. Demo video: сценарий до 60 секунд

Рекомендованный сценарий:

```txt
0–5 сек:
Глобальная карта. Одна территория мигает как конфликт.

5–12 сек:
Открывается battle post.
Видно: Division A vs Division B vs AI.
Таймер до события.

12–20 сек:
Игрок выбирает дивизию / видит звание.
Появляется предложение стать шпионом.
Игрок принимает.

20–30 сек:
Secret Spy Objective:
AI will choose Shield.
Lead your division toward Strike.

30–40 сек:
Игрок делает приказ.
В интерфейсе видно public chatter и подозрительную активность.

40–50 сек:
Фаза завершается.
ИИ оставляет язвительный broadcast по итогам переписки.

50–57 сек:
Территория меняет цвет.
Игрок получает медаль False Prophet или First Deployment.

57–60 сек:
Tagline:
Posts are battlefields. Comments are war rooms. Humanity is not coordinated.
```

---

## 26. Что в MVP обязательно должно работать

### Core

```txt
1. Custom post запускается в Reddit.
2. Inline UI помещается в 288×512.
3. Есть карта с 10–12 территориями.
4. Есть одна активная территория.
5. Есть две дивизии и ИИ.
6. Игрок выбирает дивизию из 2–3 recommended divisions.
7. Игрок может отдать приказ: Strike / Shield / Hack.
8. Игрок выбирает доктрину + поддействие.
9. В фазе есть таймер 3 минуты для demo.
10. Результат считается по формуле.
```

### Spy

```txt
1. Игроку может быть предложена роль шпиона.
2. Игрок явно принимает или отказывается.
3. Шпион видит точный ход ИИ.
4. Шпион видит раннее распределение приказов.
5. Шпион выигрывает, если помогает ИИ / rival / chaos outcome.
6. Шпион не раскрывается по имени.
7. Шпион получает тайную медаль.
```

### Comments / AI

```txt
1. Есть AI broadcast в интерфейсе.
2. App account может публиковать фазовые комментарии.
3. Комментарии не обязательны для игры.
4. Анализ комментариев — агрегированный.
5. Нет публичного обвинения конкретных игроков.
```

### Progression

```txt
1. У игрока есть rank / level.
2. Есть медали.
3. Есть phase participation.
4. Есть personal result после фазы.
```

---

## 27. Что НЕ включать в MVP

```txt
1. Настоящая сеть множества реальных сабреддитов.
2. Автоматическая публикация комментариев от имени пользователей.
3. Обязательные комментарии для прогресса.
4. Раскрытие никнеймов шпионов.
5. Внешний LLM как обязательная часть игры.
6. Ставки / токены / крипта.
7. Сложная экономика ресурсов.
8. 20+ территорий.
9. Политическая или реалистичная военная тема.
10. Любые механики травли предателей.
```

---

## 28. Риски и меры снижения

| Риск | Почему опасно | Что делаем |
|---|---|---|
| Игра слишком сложная | Пользователь не поймёт за 20 секунд | Первый экран = карта, таймер, 3 кнопки |
| Шпионы вызовут токсичность | Игроки начнут обвинять друг друга | Не раскрываем имена, показываем только общий spy influence |
| ИИ-комментарии станут спамом | Модераторы/судьи воспримут как шум | 1 стартовый, 1 финальный, максимум 1 mid-phase |
| Внешний сервер не пройдёт review | Игра может не заработать | Fallback на Redis / allow-list-friendly backend |
| LLM сгенерирует плохой текст | Safety/review-риск | MVP на шаблонах |
| Карта декоративная | Игроки не увидят смысла территорий | Территория меняет цвет, даёт очки, двигает сюжет |
| Комментарии наказывают игроков | Люди перестанут писать | Добавить deception/noise bonus |
| Видео не объяснит игру | Судьи могут не тестировать | 60-секундный demo scenario |
| Неподходящий subreddit для demo | Судьи не смогут попасть | Public test subreddit + проверить доступ |
| Нарушение IP | Дисквалификация/удаление | Только собственные ассеты и брендинг |

---

## 29. Финальный compliance checklist перед сабмитом

### Devpost

```txt
[ ] Зарегистрированы на Devpost.
[ ] Создан project.
[ ] Заполнено описание на английском.
[ ] Добавлена ссылка на app listing.
[ ] Добавлена ссылка на demo post.
[ ] Добавлен README.md в root.
[ ] Добавлено видео до 1 минуты.
[ ] Видео публично доступно на разрешённой платформе.
[ ] Добавлены screenshots/gifs.
[ ] Указано, что built during hackathon / что было обновлено.
[ ] Все материалы на английском.
```

### Reddit / Devvit

```txt
[ ] App запускается в Reddit custom post.
[ ] Demo subreddit public.
[ ] Custom post использует TALL 512px.
[ ] UI читается на 288×512.
[ ] Нет внешнего client-side fetch.
[ ] Все external domains указаны в devvit.json.
[ ] README содержит Fetch Domains section, если есть fetch.
[ ] Есть Terms & Privacy, если используется fetch/LLM/payments.
[ ] Нет Reddit/Snoo branding.
[ ] Нет обязательных комментариев.
[ ] Нет автоматических user actions.
[ ] AI comments не спамят.
[ ] Шпион не раскрывается по имени.
```

### Game

```txt
[ ] Игрок понимает цель без tutorial.
[ ] Есть 3-минутный demo loop.
[ ] Есть фаза результата.
[ ] Территория меняет состояние.
[ ] Игрок получает прогресс.
[ ] Шпион получает секретную цель.
[ ] ИИ оставляет фазовый broadcast.
[ ] Комментарии учитываются как агрегированные сигналы.
[ ] Есть минимум 5 медалей.
[ ] Есть понятная формула победы.
```

---

## 30. Практическая рекомендация по стратегии хакатона

Главная версия для сабмита:

```txt
Один public demo subreddit.
Один главный battle post.
Одна активная территория.
Две дивизии внутри игры.
ИИ как третья сторона.
Шпионская роль как главный вау-момент.
Фазы по 3 минуты в demo mode.
Глобальная карта из 10–12 территорий как визуальная рамка.
```

Не пытаться в хакатонной версии доказать:

```txt
реальную масштабную войну десятков сабреддитов.
```

Нужно доказать:

```txt
формат работает;
он понятен;
он вызывает социальное напряжение;
комментарии действительно становятся игровой частью;
ИИ-комментатор добавляет драму;
игроку есть зачем вернуться.
```

---

## 31. Источники

Официальные источники, использованные для этого документа:

1. Reddit Games with a Hook Hackathon — Overview  
   https://redditgameswithahook.devpost.com/

2. Reddit Games with a Hook Hackathon — Resources  
   https://redditgameswithahook.devpost.com/resources

3. Reddit Games with a Hook Hackathon — Official Rules  
   https://redditgameswithahook.devpost.com/rules

4. Reddit Developer Funds 2026 Terms  
   https://support.reddithelp.com/hc/en-us/articles/27958169342996-Reddit-Developer-Funds-2026-Terms

5. Reddit Developer Program  
   https://support.reddithelp.com/hc/en-us/articles/30641905617428-Developer-Program

6. Reddit Developer Docs — Feature Guide  
   https://developers.reddit.com/docs/guides/launch/feature-guide

7. Reddit Developer Docs — Devvit Web  
   https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview

8. Reddit Developer Docs — Creating a Custom Post  
   https://developers.reddit.com/docs/capabilities/creating_custom_post

9. Reddit Developer Docs — HTTP Fetch  
   https://developers.reddit.com/docs/capabilities/http-fetch

10. Reddit Developer Docs — User Actions  
    https://developers.reddit.com/docs/capabilities/server/userActions

11. Reddit Developer Docs — Realtime  
    https://developers.reddit.com/docs/capabilities/realtime/overview

12. Reddit Developer Docs — Devvit Rules  
    https://developers.reddit.com/docs/devvit_rules
