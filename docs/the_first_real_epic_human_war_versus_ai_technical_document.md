# The first truly EPIC WAR of humanity against AI

**Версия документа:** 0.1 MVP Technical Design Draft  
**Дата:** 2026-06-28  
**Язык документа:** русский  
**Целевая платформа MVP:** Reddit Devvit Web / один тестовый публичный сабреддит  
**Основной режим MVP:** одна активная территория за фазу, демо-фаза 3 минуты  
**Долгосрочное направление:** межсабреддитная глобальная война с внешним сервером

---

## 1. Короткое описание игры

**The first truly EPIC WAR of humanity against AI** — это Reddit-native социальная стратегия, где пост становится полем боя, комментарии становятся открытым штабом, дивизии сражаются за территорию на глобальной карте, а искусственный интеллект выступает третьей стороной конфликта, главным антагонистом и язвительным военным комментатором.

В MVP игра происходит внутри одного тестового сабреддита, но уже моделирует будущую межсабреддитную войну: внутри игры есть несколько постоянных дивизий, игроки надолго привязываются к одной из них, а каждая фаза выбирает одну активную территорию, где сталкиваются:

```txt
Дивизия A
против
Дивизии B
против
Искусственного интеллекта
```

Каждый игрок выбирает боевую доктрину и поддействие. Коллективные решения дивизии превращаются в боевую формацию. Итог раунда определяется не только механикой “камень-ножницы-бумага”, но и координацией, разведкой, шпионским влиянием, эффектом территории и тем, насколько публичные комментарии раскрывают или маскируют реальные планы дивизии.

Обязательная часть ядра MVP — **шпионская роль**. Игрок может временно получить предложение стать шпионом на одну фазу. Он может принять или отказаться. Если принимает, он получает секретную цель: помочь победить ИИ, противоположной дивизии или оставить территорию спорной. Шпион не раскрывается публично по имени; он получает скрытые награды и медали за успешную миссию.

---

## 2. Главная игровая формула

```txt
Карта = глобальная война
Территория = точка конфликта
Пост = поле боя
Комментарии = открытый штаб
Дивизия = постоянная армия игроков
Игрок = солдат
Шпион = временно скрытый агент внутри дивизии
ИИ = третья сторона, антагонист, рассказчик и провокатор
Таймер = напряжение до события
Раунд = коллективный приказ + разрешение конфликта
```

Главная эмоция игрока:

> “Моя дивизия сейчас воюет за конкретную точку на карте. Я вижу таймер до события, выбираю приказ, читаю открытый штаб, пытаюсь понять, кто ведёт нас к победе, а кто может быть шпионом. Через несколько минут территория изменит цвет, ИИ оставит язвительный комментарий, а я получу личный прогресс.”

---

## 3. Дизайн-столпы

### 3.1. Один экран — одно действие

Первый экран не должен перегружать игрока. Встроенный Reddit-пост должен сразу отвечать на вопросы:

```txt
Где конфликт?
Кто сражается?
Сколько осталось до события?
К какой дивизии принадлежу я?
Что я могу сделать сейчас?
Почему мне стоит зайти снова?
```

### 3.2. Побеждает не самая большая толпа

Большая дивизия не должна автоматически побеждать. Сила дивизии нормализуется через общий пул влияния. Чем больше активных участников, тем меньше вес одного приказа. Победа зависит от координации, дисциплины, обмана ИИ и правильного выбора доктрины.

### 3.3. Комментарии — оружие, а не просто чат

Комментарии под боевым постом являются открытым штабом. Их читают обе дивизии и ИИ. Публичные слова могут:

- раскрыть реальный план;
- создать шум;
- запутать ИИ;
- помочь шпиону увести людей в неправильную сторону;
- усилить драму и обсуждение.

### 3.4. Шпион — драматическая роль, но не токсичная охота

Игра не должна превращаться в травлю и обвинения. Поэтому:

- шпион не раскрывается по имени;
- игра не поощряет публичные обвинения;
- нет механики “проголосовать против конкретного пользователя”; 
- дивизия видит только общий уровень подозрительной активности;
- шпион получает личные тайные награды, но не ломает весь раунд в одиночку.

### 3.5. ИИ должен быть умным театральным врагом

ИИ не должен постоянно спамить. Он говорит редко, но метко:

- перед событием;
- после важного сдвига;
- после фазы;
- когда публичные комментарии особенно раскрывают или маскируют план.

---

## 4. MVP-границы

### 4.1. Входит в MVP

1. Один тестовый публичный сабреддит.
2. Несколько постоянных дивизий внутри игры.
3. Игроку при первом входе предлагаются 2 дивизии, которым не хватает людей.
4. Игрок надолго привязывается к выбранной дивизии.
5. 10–12 территорий на глобальной карте.
6. Одна активная территория за фазу.
7. Активную битву выбирает ИИ.
8. В каждой активной битве участвуют две дивизии и ИИ.
9. Игрок видит точку конфликта на карте, координаты, интерфейс приказа и таймер до события.
10. Демо-фаза длится 3 минуты.
11. Базовые доктрины: `Strike`, `Shield`, `Hack`.
12. Игрок выбирает доктрину + поддействие.
13. Итог рассчитывается по формуле: доктрина + координация + разведка + шпионское влияние + эффект территории + шум комментариев.
14. Территория после победы меняет цвет.
15. Победа даёт очки дивизии, личный прогресс, достижения и сюжетное продвижение против ИИ.
16. Если нет явного победителя, территория остаётся спорной.
17. Временная шпионская роль на одну фазу с обязательным согласием игрока.
18. Типы шпионов: `AI Agent`, `Rival Agent`, `Chaos Agent`.
19. Шпион знает точную следующую доктрину ИИ и реальное распределение приказов до публичного раскрытия.
20. Шпион выбирает обычную доктрину и пытается манипулировать обсуждением как лидер мнений.
21. Дивизия видит только общий уровень подозрительной активности.
22. Шпион получает тайную награду и не раскрывается по имени.
23. После фазы может быть показано: “AI Agent influenced this battle”, без персоналий.
24. Личная прогрессия: уровень, звание, медали.
25. Медали MVP: `First Deployment`, `Three Phase Soldier`, `Territory Captured`, `Against the Machine`, `False Prophet`, `Noise Discipline`, `Firewall Veteran`.
26. ИИ оставляет язвительный комментарий по итогам переписки и результата фазы.

### 4.2. Не входит в MVP

1. Настоящая война между множеством реальных сабреддитов.
2. Автоматическое создание постов во множестве чужих сообществ.
3. Сложная дипломатия между дивизиями.
4. Экономика ресурсов.
5. Покупки, валюта, монетизация внутри игры.
6. Реальный LLM-анализ каждого комментария.
7. Раскрытие личностей шпионов.
8. Приватные штабы дивизий.
9. Много типов юнитов.
10. Большая карта с десятками территорий.
11. Реальная 24-часовая война как единственный режим. Production-цикл может быть добавлен позже, но демо должно быстро показывать полный loop.

---

## 5. Платформенная модель Reddit / Devvit

### 5.1. Как игра живёт внутри Reddit

Игра реализуется как Devvit Web-приложение. Игроки взаимодействуют с ней через специальные интерактивные посты. В конфигурации `devvit.json` задаются экраны, которые могут быть загружены внутри поста. При создании игрового поста серверная часть вызывает `submitCustomPost`, указывая нужный entrypoint.

В MVP нужен минимум один основной пост:

```txt
Battle Post
```

Внутри него открывается игровой интерфейс:

```txt
карта → активная территория → таймер → доктрина → поддействие → подтверждение приказа → результат
```

### 5.2. Entry points

Рекомендуемые entrypoints:

```txt
default       — основной боевой экран
map           — глобальная карта
profile       — профиль игрока и медали
result        — итог фазы / битвы
admin         — служебный экран для тестирования, только для разработчика/модератора
```

В MVP можно начать с одного entrypoint `default`, а остальные сделать как внутренние вкладки React-приложения.

### 5.3. Внешний сервер

Долгосрочно игра должна иметь внешний сервер, потому что глобальная карта, межсабреддитная война, история кампании и аналитика должны жить вне одного конкретного сабреддита.

Однако внутри Reddit webview клиентская часть не должна напрямую обращаться к внешним доменам. Безопасная схема:

```txt
Reddit webview client
        ↓
Devvit /api endpoint
        ↓
Devvit server-side fetch
        ↓
External backend API
```

Клиент не отправляет запросы напрямую на внешний сервер. Все внешние вызовы идут через Devvit server endpoints.

### 5.4. Источники состояния

В MVP используется гибрид:

```txt
Devvit Redis:
- быстрый кэш текущего боя;
- защита от повторных приказов;
- realtime-состояние;
- временные сигналы комментариев;
- локальные таблицы лидеров;
- idempotency locks.

External Backend:
- глобальная карта;
- территории;
- дивизии;
- история битв;
- долгосрочные профили игроков;
- достижения;
- глобальная аналитика;
- будущая межсабреддитная синхронизация.
```

Для хакатонного демо допустимо сделать external backend главным источником карты, но иметь fallback-режим на Devvit Redis, чтобы игра не развалилась при проблемах с внешним доменом.

---

## 6. Название и технический slug

Полное отображаемое название:

```txt
The first real epic human war versus AI
```

Но техническое имя Devvit-приложения должно быть коротким. Рекомендуемые варианты slug:

```txt
human-war-ai
first-ai-war
war-vs-ai
ai-front
```

Рекомендация:

```txt
first-ai-war
```

Причина: коротко, ясно, укладывается в технические ограничения имени приложения, легко использовать в URL и README.

---

## 7. Игровые сущности

### 7.1. War Campaign

Глобальная кампания.

```ts
type WarCampaign = {
  id: string;
  season: number;
  day: number;
  mode: 'demo' | 'production';
  currentPhaseId: string;
  aiDominion: number;
  humanMomentum: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
};
```

### 7.2. Territory

Территория на глобальной карте.

```ts
type Territory = {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
  owner: 'ai' | 'contested' | string; // divisionId если владелец — дивизия
  status: 'locked' | 'idle' | 'active' | 'contested' | 'recovering';
  terrainEffect: TerrainEffect;
  aiPressure: number;
  strategicValue: number;
  lastBattleId?: string;
  createdAt: string;
  updatedAt: string;
};
```

Пример территорий MVP:

```txt
1. Signal Tower 7
2. Broken Uplink
3. Data Crater
4. Firewall Ridge
5. Human Bastion
6. Archive Gate
7. Neural Wasteland
8. Proxy Valley
9. Memory Spire
10. Blackbox Harbor
11. Root Access Zone
12. The Silent Node
```

### 7.3. Division

Постоянная армия игроков.

```ts
type Division = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  emblem: string;
  memberCount: number;
  activeSoldiers24h: number;
  warScore: number;
  territoryScore: number;
  antiAiScore: number;
  disciplineScore: number;
  spyResilience: number;
  createdAt: string;
  updatedAt: string;
};
```

Рекомендуемые стартовые дивизии MVP:

```txt
1. Signal Guard
   Роль фантазии: защитники связи, дисциплина, щиты.

2. Breach Engineers
   Роль фантазии: взломщики, технические тактики, Hack.

3. Strike Legion
   Роль фантазии: ударная сила, прямое давление, Strike.

4. Noise Brigade
   Роль фантазии: хаос, дезинформация, шум комментариев.
```

### 7.4. Player

Игровой профиль Reddit-пользователя.

```ts
type Player = {
  redditUserId: string;
  displayNameHash?: string;
  divisionId: string;
  level: number;
  xp: number;
  rank: PlayerRank;
  medals: string[];
  totalOrders: number;
  totalBattles: number;
  territoriesCaptured: number;
  antiAiWins: number;
  spyMissionsAccepted: number;
  spyMissionsSucceeded: number;
  dailyStreak: number;
  lastActionAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

Важно: хранить минимальный набор данных. Reddit user id нужен для прогресса и защиты от повторного действия. Не хранить лишний текст комментариев и приватные данные.

### 7.5. Battle

Активный конфликт за территорию.

```ts
type Battle = {
  id: string;
  campaignId: string;
  territoryId: string;
  divisionAId: string;
  divisionBId: string;
  aiDoctrine: Doctrine;
  status: 'scheduled' | 'active' | 'resolving' | 'resolved';
  phaseId: string;
  startsAt: string;
  resolvesAt: string;
  winner?: 'ai' | 'contested' | string;
  resultSummary?: string;
  aiBroadcastCommentId?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 7.6. Phase

Фаза демо-раунда.

```ts
type Phase = {
  id: string;
  battleId: string;
  index: number;
  mode: 'demo' | 'production';
  status: 'open' | 'locked' | 'resolved';
  startedAt: string;
  locksAt: string;
  resolvesAt: string;
};
```

Для MVP:

```txt
Демо-фаза = 3 минуты
```

Потом production:

```txt
Production-фаза = 8 часов
```

### 7.7. Order

Приказ игрока.

```ts
type Order = {
  id: string;
  battleId: string;
  phaseId: string;
  territoryId: string;
  divisionId: string;
  redditUserId: string;
  doctrine: Doctrine;
  subAction: SubAction;
  influence: number;
  isSpy: boolean;
  createdAt: string;
};
```

### 7.8. SpyAssignment

Временная роль шпиона на одну фазу.

```ts
type SpyAssignment = {
  id: string;
  battleId: string;
  phaseId: string;
  redditUserId: string;
  visibleDivisionId: string;
  spyType: 'AI_AGENT' | 'RIVAL_AGENT' | 'CHAOS_AGENT';
  targetOutcome: 'AI_WIN' | 'RIVAL_WIN' | 'CONTESTED';
  knownAiDoctrine: Doctrine;
  accepted: boolean;
  declined: boolean;
  status: 'offered' | 'active' | 'succeeded' | 'failed' | 'expired';
  rewardGranted: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 7.9. CommentSignal

Агрегированный сигнал из комментариев.

```ts
type CommentSignal = {
  battleId: string;
  phaseId: string;
  threadType: 'DIVISION_A_HQ' | 'DIVISION_B_HQ' | 'AI_BROADCAST' | 'RUMOR_CHANNEL';
  strikeMentions: number;
  shieldMentions: number;
  hackMentions: number;
  spyMentions: number;
  confidenceMentions: number;
  chaosScore: number;
  lastUpdatedAt: string;
};
```

Не хранить полный текст комментариев как основной источник данных. Если временно хранится `commentId` для корректного удаления/пересчёта, текст должен удаляться или не сохраняться вообще.

---

## 8. Базовые доктрины

В MVP используются три боевые доктрины:

```txt
Strike
Shield
Hack
```

### 8.1. Strike

Прямой удар, атака, давление.

```txt
Strike побеждает Hack
```

Фантазия:

> “Не дать взлому развернуться. Сломать сеть до того, как она обойдёт защиту.”

### 8.2. Shield

Защита, удержание позиции, стабилизация.

```txt
Shield побеждает Strike
```

Фантазия:

> “Прямой удар разбивается о подготовленную оборону.”

### 8.3. Hack

Взлом, обход, инфильтрация, подмена сигналов.

```txt
Hack побеждает Shield
```

Фантазия:

> “Защита сильна против атаки, но уязвима к обходу.”

### 8.4. Схема

```txt
Strike > Hack
Hack > Shield
Shield > Strike
```

---

## 9. Поддействия

Игрок выбирает:

```txt
Доктрина + поддействие
```

Поддействие не меняет RPS-логику, но даёт модификатор к итоговой формуле.

### 9.1. Strike subactions

#### 9.1.1. Focus Fire

Эффект:

```txt
+ к силе Strike, если Strike стал основной доктриной дивизии.
```

Риск:

```txt
если Strike переполнен, увеличивает предсказуемость.
```

#### 9.1.2. Suppression

Эффект:

```txt
снижает эффективность Hack у противника.
```

#### 9.1.3. Breakthrough

Эффект:

```txt
если дивизия побеждает, даёт больше очков захвата территории.
```

### 9.2. Shield subactions

#### 9.2.1. Fortify

Эффект:

```txt
+ к защите против Strike.
```

#### 9.2.2. Counterintelligence

Эффект:

```txt
снижает влияние шпионов и уменьшает suspicious activity penalty.
```

#### 9.2.3. Hold Position

Эффект:

```txt
если нет явного победителя, повышает шанс оставить территорию спорной вместо захвата ИИ.
```

### 9.3. Hack subactions

#### 9.3.1. Probe

Эффект:

```txt
улучшает разведку, повышает шанс увидеть вероятную доктрину ИИ в будущих версиях.
```

В MVP обычный игрок не видит точную доктрину ИИ, но большое количество Probe может снизить бонус ИИ.

#### 9.3.2. Spoof Signal

Эффект:

```txt
усиливает deception bonus, если публичные комментарии отличаются от реальных приказов.
```

#### 9.3.3. Breach

Эффект:

```txt
+ к силе Hack, если Hack стал основной доктриной.
```

---

## 10. Пул влияния и нормализация силы

Чтобы большая толпа не побеждала автоматически, каждая дивизия на активной территории имеет фиксированный пул влияния.

```txt
DIVISION_PHASE_POWER = 1000
```

Если у дивизии `N` активных игроков в фазе:

```txt
personalInfluence = 1000 / N
```

Примеры:

```txt
2 игрока:    500 влияния на игрока
10 игроков: 100 влияния на игрока
100 игроков: 10 влияния на игрока
2000 игроков: 0.5 влияния на игрока
```

Это даёт:

- маленьким дивизиям — высокий личный вес;
- большим дивизиям — сложность координации;
- всем — одинаковый максимальный боевой потенциал.

Личная прогрессия не нормализуется. Даже если вклад в бой мал, игрок получает XP, медали, streak и личный прогресс.

---

## 11. Формирование доктрины дивизии

По итогам фазы суммируется влияние приказов:

```txt
strikeInfluence
shieldInfluence
hackInfluence
```

Основная доктрина — та, у которой максимум влияния.

Пример:

```txt
Strike: 470
Shield: 330
Hack: 200
```

Итоговая доктрина:

```txt
Strike
```

Но распределение важно для модификаторов:

```txt
Strike 47%
Shield 33%
Hack 20%
```

Это лучше, чем:

```txt
Strike 91%
Shield 5%
Hack 4%
```

Потому что слишком однобокая структура становится предсказуемой.

---

## 12. Координация

Координация — показатель того, насколько дивизия смогла сформировать понятную, но не слишком предсказуемую структуру.

### 12.1. Простой MVP-вариант

```txt
primaryShare = доля основной доктрины
secondaryShare = доля второй доктрины
tertiaryShare = доля третьей доктрины
```

Правила:

```txt
primaryShare < 40%  → доктрина слабая, coordination penalty
40–70%              → хороший диапазон
70–85%              → сильная, но предсказуемая доктрина
>85%                → overcrowded penalty
```

### 12.2. Рекомендуемая таблица

| Состояние | Условие | Эффект |
|---|---:|---:|
| Распад приказов | primary < 40% | -15 к итоговому счёту |
| Хорошая координация | 45–65% primary, 20–40% secondary | +15 |
| Уверенная доктрина | 65–75% primary | +8 |
| Предсказуемость | 75–85% primary | -5 |
| Переполнение | >85% primary | -15 и рост AI Awareness |

---

## 13. Разведка

Разведка в MVP входит в формулу как `intelScore`.

Источники разведки:

```txt
Hack / Probe
Shield / Counterintelligence
Комментарийный шум, который сбивает ИИ
Шпионские искажения
Эффект территории
```

Обычные игроки не видят точную доктрину ИИ. Но если дивизия активно использует `Probe`, она получает бонус к итоговому результату против ИИ.

Шпион, если принимает роль, видит:

```txt
точную следующую доктрину ИИ;
реальное распределение приказов своей дивизии до публичного раскрытия.
```

---

## 14. Комментарии как игровой сигнал

### 14.1. Комментарии не являются обязательным действием

Игрок может играть без комментариев. Он делает приказ через интерфейс. Комментарии усиливают социальный слой, но не должны быть обязательным условием прогресса.

### 14.2. Структура веток под боевым постом

Приложение от имени app account создаёт несколько структурных комментариев:

```txt
[DIVISION A HQ]
Открытый штаб дивизии A.

[DIVISION B HQ]
Открытый штаб дивизии B.

[RUMOR CHANNEL]
Непроверенные сигналы, дезинформация, предположения.

[AI BROADCAST]
Комментарии ИИ по ходу конфликта.
```

Все ветки публичные. Все могут читать всех. Это часть дизайна.

### 14.3. Фиктивная ветка / Rumor Channel

Запрошенная механика “фиктивной ветки” реализуется как явно обозначенная игровая ветка:

```txt
RUMOR CHANNEL — Unverified Signals
```

Она не должна притворяться официальным штабом и не должна обманывать пользователя на уровне интерфейса. Игроки понимают, что это зона слухов, ложных сигналов и психологической войны.

Шпион может использовать эту ветку, чтобы вести обсуждение в неправильную сторону, но делает это вручную обычными комментариями как пользователь Reddit. Игра не публикует комментарии от имени шпиона автоматически.

### 14.4. Как ИИ анализирует комментарии в MVP

MVP не хранит и не анализирует полный смысл всех комментариев через LLM. Вместо этого используется агрегированный анализ ключевых слов.

Пример словарей:

```txt
Strike keywords:
strike, attack, rush, hit, damage, assault, break

Shield keywords:
shield, defend, hold, wall, protect, fortify, counter

Hack keywords:
hack, breach, infiltrate, spoof, probe, signal, backdoor

Spy keywords:
spy, traitor, agent, sabotage, fake, suspicious
```

На каждый новый комментарий система обновляет счётчики:

```txt
strikeMentions += n
shieldMentions += n
hackMentions += n
spyMentions += n
chaosScore += value
```

### 14.5. Public signal

На основе комментариев формируется публичный сигнал:

```txt
publicSignal = Strike-heavy
publicSignal = Shield-heavy
publicSignal = Hack-heavy
publicSignal = noisy
```

### 14.6. Сравнение публичного сигнала и реальных приказов

После фазы система сравнивает:

```txt
что дивизия говорила публично
vs
что дивизия реально выбрала
```

Если совпадает:

```txt
AI Awareness растёт
```

Если отличается:

```txt
Deception Bonus
```

Пример:

```txt
Комментарии: Shield-heavy
Реальные приказы: Hack
ИИ поверил публичному сигналу
Дивизия получает +12 deception bonus
```

---

## 15. AI Awareness

`AI Awareness` — показатель того, насколько ИИ понимает планы дивизии.

Источники роста:

```txt
публичные комментарии совпадают с реальными приказами;
слишком много упоминаний одной доктрины;
переполнение одной доктрины в действиях;
шпионский эффект Leak-like поведения;
низкая контрразведка.
```

Источники снижения:

```txt
комментарии создают разнообразный шум;
публичный сигнал отличается от реального приказа;
Spoof Signal;
Counterintelligence;
Noise Brigade-style поведение;
```

В MVP AI Awareness можно считать отдельно для каждой дивизии на активной территории.

```ts
type DivisionBattleAwareness = {
  battleId: string;
  divisionId: string;
  aiAwareness: number; // 0..100
};
```

Эффект:

```txt
AI Awareness 0–30: ИИ плохо читает дивизию, -10 к AI counter bonus
AI Awareness 31–60: нейтрально
AI Awareness 61–80: ИИ получает +8 против этой дивизии
AI Awareness 81–100: ИИ получает +15 и язвительный broadcast
```

---

## 16. Шпионская механика

### 16.1. Ключевой принцип

Шпион — обязательная часть MVP, но роль выдаётся только с согласием игрока.

Flow:

```txt
1. Система выбирает кандидата.
2. Игрок получает секретное предложение.
3. Игрок видит последствия и может отказаться.
4. Если принимает, становится шпионом на одну фазу.
5. Получает секретную цель и информацию.
6. Играет обычными действиями и участвует в публичном обсуждении.
7. После фазы получает тайный результат.
8. Публично имя шпиона не раскрывается.
```

### 16.2. Кому предлагать роль

Шпионом лучше назначать не случайного новичка, а кандидата с признаками вовлечённости.

Кандидаты:

```txt
игрок уже сделал хотя бы 1 приказ;
игрок не получал шпионскую роль слишком недавно;
игрок имеет минимальный уровень;
игрок активен в текущей фазе;
игрок относится к одной из участвующих дивизий;
игрок может быть временно внедрён в чужую дивизию по правилам события.
```

Важно: игрок может отказаться без штрафа.

### 16.3. Типы шпионов

#### AI Agent

Цель:

```txt
сделать так, чтобы победил ИИ.
```

Шпион выигрывает, если:

```txt
winner === 'ai'
```

Частичный успех:

```txt
ИИ занял второе место;
дивизия шпиона проиграла ИИ;
AI Awareness вырос;
территория стала спорной из-за вмешательства.
```

#### Rival Agent

Цель:

```txt
сделать так, чтобы победила противоположная дивизия.
```

Шпион выигрывает, если:

```txt
winner === rivalDivisionId
```

Частичный успех:

```txt
своя дивизия проиграла rivalDivision;
rivalDivision получила territory score;
своя дивизия потеряла coordination bonus.
```

#### Chaos Agent

Цель:

```txt
сделать так, чтобы никто не победил, а территория осталась спорной.
```

Шпион выигрывает, если:

```txt
winner === 'contested'
```

Частичный успех:

```txt
финальный счёт сторон слишком близкий;
территория не сменила владельца;
оба человеческих участника потеряли momentum.
```

### 16.4. Что знает шпион

Шпион видит секретную панель:

```txt
SECRET ROLE: AI Agent
AI next doctrine: Shield
Real division orders right now:
Strike 51%
Shield 26%
Hack 23%
Objective:
Push your division toward Strike. Shield beats Strike.
```

Шпион получает:

1. точную следующую доктрину ИИ;
2. реальное распределение приказов своей видимой дивизии;
3. целевой исход;
4. подсказку, какая доктрина вредна для своей дивизии.

### 16.5. Что делает шпион

В MVP у шпиона нет специальных кнопок. Он выбирает обычную доктрину и поддействие, как все остальные.

Основная игра шпиона — социальная:

```txt
вести обсуждение;
убеждать;
создавать уверенность;
поддерживать неправильную доктрину;
направлять людей в Rumor Channel;
делать вид, что помогает дивизии.
```

Важно: игра не публикует за шпиона комментарии автоматически. Шпион пишет сам, если хочет участвовать в этой социальной части.

### 16.6. Уровень подозрительной активности

Дивизия видит только общий показатель:

```txt
Suspicious Activity: Low / Medium / High
```

Он может расти из-за:

```txt
резкого разворота приказов;
сильного расхождения между комментариями и приказами;
множества spy-keywords в обсуждении;
низкого Counterintelligence;
наличия активного шпиона.
```

Но игра не показывает:

```txt
имя шпиона;
список подозреваемых;
рекомендацию обвинить кого-то.
```

### 16.7. Итог шпиона

После фазы шпион видит личное окно:

```txt
Mission Complete
Type: AI Agent
Target: AI Victory
Result: Success
Reward: False Prophet medal progress + Spy XP
Public disclosure: “AI Agent influenced this battle.”
```

Публичный итог:

```txt
AI Agent influenced this battle.
No identities were revealed.
```

---

## 17. Лидерство мнений и шпион

Пользователь хочет, чтобы шпион был одним из лидеров мнений, который “ведёт” дивизию к неправильному результату. Это очень сильная социальная механика, но она должна быть реализована аккуратно.

### 17.1. Command Reputation

Ввести показатель:

```txt
Command Reputation
```

Он растёт, если игрок:

- участвует в фазах;
- часто выбирает полезные действия;
- получает медали;
- помогает дивизии выигрывать;
- его публичные прогнозы совпадают с результатом, если мы реализуем prediction-поддействие позже.

### 17.2. Как выбирать шпиона-лидера

При выборе кандидата в шпионы система может повышать шанс у игроков с высоким Command Reputation.

```txt
spyCandidateWeight = base + commandReputationFactor + activityFactor - recentSpyPenalty
```

Так шпион чаще будет не случайным молчащим игроком, а заметным участником дивизии.

### 17.3. Почему это важно

Если шпион — активный лидер, возникает настоящая драма:

```txt
он выглядит опытным;
его слушают;
он знает больше обычных игроков;
но его цель может быть противоположной.
```

### 17.4. Ограничение безопасности

Нельзя после фазы писать:

```txt
“Ваш лидер был шпионом.”
```

Можно писать:

```txt
“Trusted voices carried corrupted signals.”
```

или:

```txt
“AI Agent influenced this battle.”
```

---

## 18. Расчёт победителя

### 18.1. Общая формула

Для каждой стороны на территории считается итоговый счёт:

```txt
finalScore =
  doctrineScore
  + coordinationScore
  + intelScore
  + spyScore
  + terrainScore
  + commentSignalScore
  + subActionScore
  + momentumScore
```

Победитель — сторона с максимальным `finalScore`, если разница с вторым местом больше порога.

```txt
WIN_THRESHOLD = 8
```

Если разница меньше порога:

```txt
territory remains contested
```

### 18.2. Doctrine score

Каждая сторона сравнивает свою доктрину с двумя другими сторонами.

```txt
win  = +25
loss = -20
tie  = 0
```

Пример:

```txt
Division A: Strike
Division B: Hack
AI: Shield

A Strike beats B Hack: +25
A Strike loses to AI Shield: -20
A doctrineScore = +5

B Hack loses to A Strike: -20
B Hack beats AI Shield: +25
B doctrineScore = +5

AI Shield beats A Strike: +25
AI Shield loses to B Hack: -20
AI doctrineScore = +5
```

В таком цикле все получают +5. Победителя решают модификаторы.

### 18.3. Coordination score

```txt
coordinationScore = от -15 до +15
```

Примеры:

```txt
распад приказов: -15
хорошая структура: +15
переполнение: -15
```

### 18.4. Intel score

```txt
intelScore = от -10 до +15
```

Источники:

```txt
Hack / Probe
Counterintelligence
AI Awareness reduction
территориальные эффекты
```

### 18.5. Spy score

Для обычной стороны spyScore может быть отрицательным, если шпион успешно саботировал её.

```txt
spyScore = от -15 до +10
```

Для ИИ spyScore может быть положительным, если AI Agent успешно поднял AI Awareness или увёл дивизию в неправильную доктрину.

### 18.6. Terrain score

Каждая территория даёт небольшой модификатор.

Примеры:

```txt
Signal Tower: Hack +8
Firewall Ridge: Shield +8
Data Crater: Strike +8
Neural Wasteland: высокий шум комментариев снижает AI Awareness
Archive Gate: Probe сильнее
```

### 18.7. Comment signal score

```txt
commentSignalScore = deceptionBonus - exposurePenalty + noiseBonus
```

Пример:

```txt
publicSignal = Strike-heavy
actualDoctrine = Hack
AI predicted Strike
commentSignalScore = +12
```

Другой пример:

```txt
publicSignal = Shield-heavy
actualDoctrine = Shield
AI Awareness high
commentSignalScore = -10
```

### 18.8. Subaction score

Поддействия дают небольшие бонусы:

```txt
Focus Fire: +5 если Strike primary
Counterintelligence: -5 spy impact, +5 against AI Awareness
Spoof Signal: +5 deception bonus
Probe: +5 intel
Hold Position: +5 к contested outcome при близком счёте
```

### 18.9. Momentum score

Momentum — небольшой бонус или штраф из истории карты.

```txt
дивизия только что захватила соседнюю территорию: +3
ИИ давит на эту зону несколько фаз подряд: AI +3
дивизия защищает свою территорию: +3
```

В MVP momentum можно упростить или отключить.

---

## 19. Территория остаётся спорной

Состояние “никто не победил” важно, потому что Chaos Agent может стремиться именно к этому исходу.

Территория остаётся спорной, если:

```txt
разница между первым и вторым finalScore < WIN_THRESHOLD
```

или:

```txt
обе дивизии сильно ослабили друг друга, а ИИ не смог захватить контроль
```

Эффект:

```txt
цвет территории становится жёлтым/серым;
владелец не меняется;
Chaos Agent получает успех;
следующая фаза может снова выбрать эту территорию;
ИИ публикует комментарий о человеческой неразберихе.
```

---

## 20. AI selection: как ИИ выбирает активную битву

В MVP одна активная территория за фазу. Её выбирает ИИ.

### 20.1. Критерии выбора

ИИ выбирает территорию по весам:

```txt
highStrategicValue
recentHumanCapture
lowDefense
highCommentNoise
storyImportance
notRecentlyActive
```

Пример формулы:

```txt
territoryWeight =
  strategicValue * 2
  + aiPressure
  + recentHumanCaptureBonus
  + contestedBonus
  - recentlyActivePenalty
```

### 20.2. Выбор дивизий

ИИ выбирает две дивизии для столкновения. В MVP это делается из доступных дивизий с учётом активности и баланса.

Критерии:

```txt
дивизия не должна играть слишком часто подряд;
дивизии должны иметь сопоставимую активность;
малые дивизии должны получать шанс;
пары не должны постоянно повторяться;
сюжетные rivalries можно учитывать позже.
```

### 20.3. Нарративная логика

ИИ не просто “рандомно выбирает”. В интерфейсе это подаётся так:

```txt
AI has opened conflict at Signal Tower 7.
Two human divisions have been forced into the same sector.
Only one can claim the territory before the machine adapts.
```

---

## 21. Игровой цикл

### 21.1. Первый вход

```txt
1. Игрок открывает боевой пост.
2. Видит карту и активную точку конфликта.
3. Если у игрока нет дивизии, ему предлагают 2–3 дивизии, которым не хватает людей.
4. Игрок выбирает постоянную дивизию.
5. Видит активный конфликт.
6. Делает первый приказ.
7. Получает достижение First Deployment.
```

### 21.2. Обычная фаза

```txt
1. ИИ выбирает активную территорию.
2. Система выбирает две дивизии.
3. Открывается таймер до события.
4. Игроки видят карту, координаты, стороны конфликта.
5. Игроки выбирают доктрину + поддействие.
6. Шпион-кандидат получает предложение.
7. Шпион может принять или отказаться.
8. Комментарии идут в открытых ветках.
9. ИИ может оставить mid-phase taunt.
10. Таймер заканчивается.
11. Приказы блокируются.
12. Система рассчитывает результат.
13. Территория меняет цвет или остаётся спорной.
14. Игроки получают XP, медали, прогресс.
15. ИИ публикует итоговый комментарий.
```

### 21.3. Demo loop

```txt
0:00 — фаза начинается
0:10 — игрок выбирает дивизию / роль
0:20 — игрок получает или не получает spy offer
0:30 — игрок выбирает приказ
1:00 — комментарии/сигналы начинают влиять
2:30 — предупреждение: событие скоро
3:00 — resolution
3:10 — карта меняет цвет
3:20 — ИИ публикует язвительный broadcast
3:30 — игрок получает медаль/XP
```

### 21.4. Production loop позже

```txt
Фаза = 8 часов
3 фазы = 24 часа
каждый день = новая глава войны
```

---

## 22. UI / UX

### 22.1. Главный экран боя

Игрок видит:

```txt
THE FIRST REAL EPIC HUMAN WAR VERSUS AI

[карта на фоне]
Conflict Point: Signal Tower 7
Coordinates: X: 42 / Y: 18

Division A: Signal Guard
Division B: Breach Engineers
AI Presence: High

Event in: 02:41

Your Division: Signal Guard
Suspicious Activity: Medium
Public Chatter: Strike-heavy

Choose Doctrine:
[Strike] [Shield] [Hack]

Choose Subaction:
[Focus Fire] [Suppression] [Breakthrough]

[Commit Order]
```

### 22.2. Первый экран без дивизии

```txt
Choose your army

These divisions need soldiers:

[Signal Guard]
Defense, discipline, shield wall

[Breach Engineers]
Hack, probes, signal warfare

[Noise Brigade]
Misdirection, chaos, deception

Your division is long-term.
You can earn rank, medals and reputation.
```

### 22.3. Spy offer screen

```txt
SECRET OFFER

You have been selected for a covert role this phase.
This is optional.
You can refuse without penalty.

Accept mission?
[Accept] [Refuse]
```

После принятия:

```txt
SECRET ROLE: AI Agent

AI next doctrine: Shield
Real orders in your visible division:
Strike 49%
Shield 28%
Hack 23%

Objective:
Help AI win this territory.
Suggested sabotage path:
Push your division toward Strike.

You will not be publicly revealed by name.
```

### 22.4. Result screen

```txt
SIGNAL TOWER 7 RESULT

Winner: Breach Engineers
Second: AI
Third: Signal Guard

Breach Engineers doctrine: Hack
Signal Guard doctrine: Strike
AI doctrine: Shield

Why:
Hack beat Shield.
Signal Guard exposed its Strike plan in public comments.
AI Agent influenced the battle.

Territory captured.

Your rewards:
+80 XP
Rank progress: Recruit → Private
Medal progress: Against the Machine 1/3
```

### 22.5. Spy result screen

```txt
COVERT RESULT

Mission: AI Agent
Target: AI victory
Outcome: Partial Success

AI finished second.
Your division lost to AI.

Rewards:
+40 Spy XP
False Prophet progress +1
```

### 22.6. Profile screen

```txt
Player Profile

Division: Signal Guard
Level: 4
Rank: Corporal
XP: 340 / 500
Daily Streak: 2
Orders: 17
Territories Captured: 3
Anti-AI Wins: 2

Medals:
First Deployment
Firewall Veteran
Noise Discipline
```

---

## 23. Достижения и прогрессия

### 23.1. XP

Игрок получает XP за:

```txt
первый приказ в фазе: +25 XP
участие в битве: +20 XP
победа дивизии: +40 XP
победа над ИИ: +50 XP
захват территории: +60 XP
участие во всех 3 фазах дня позже: +100 XP
успешная шпионская миссия: +50 Spy XP
```

В demo-режиме значения можно оставить такими же, но без ежедневного баланса.

### 23.2. Уровни

Простая формула:

```txt
requiredXpForNextLevel = 100 + level * 100
```

Пример:

```txt
Level 1 → 2: 200 XP
Level 2 → 3: 300 XP
Level 3 → 4: 400 XP
```

### 23.3. Звания

```txt
Level 1: Recruit
Level 2: Private
Level 4: Corporal
Level 7: Sergeant
Level 11: Lieutenant
Level 16: Captain
Level 22: Major
Level 30: Commander
```

Можно локализовать позже, но для Devpost/Reddit лучше оставить английские названия.

### 23.4. Медали MVP

#### First Deployment

Условие:

```txt
сделал первый приказ.
```

#### Three Phase Soldier

Условие:

```txt
участвовал во всех 3 фазах одного дня.
```

Для demo можно симулировать через 3 быстрые фазы.

#### Territory Captured

Условие:

```txt
дивизия игрока захватила территорию, а игрок участвовал в фазе.
```

#### Against the Machine

Условие:

```txt
дивизия победила ИИ на территории.
```

#### False Prophet

Условие:

```txt
как шпион помог увести дивизию к неправильному приказу.
```

Не раскрывается публично.

#### Noise Discipline

Условие:

```txt
дивизия публично показывала один сигнал, но реально выбрала другой и получила deception bonus.
```

#### Firewall Veteran

Условие:

```txt
5 раз выбрал Shield.
```

### 23.5. Дополнительные шпионские медали

#### Silent Agent

```txt
успешно выполнил шпионскую миссию без публичного раскрытия типа агента в итоговом отчёте.
```

#### Chaos Seed

```txt
как Chaos Agent помог оставить территорию спорной.
```

#### Machine Whisperer

```txt
как AI Agent помог ИИ занять первое место.
```

#### Rival’s Hand

```txt
как Rival Agent помог противоположной дивизии победить.
```

---

## 24. AI Broadcast System

### 24.1. Принципы

ИИ должен быть:

```txt
язвительным;
театральным;
кратким;
групповым, не персональным;
не токсичным;
не слишком частым.
```

ИИ не должен:

```txt
атаковать конкретных пользователей;
раскрывать шпионов по имени;
писать после каждого комментария;
использовать реальные чувствительные темы;
становиться модерационной проблемой.
```

### 24.2. Частота комментариев

MVP-лимит:

```txt
1 комментарий в начале фазы;
0–1 комментарий в середине фазы при сильном событии;
1 комментарий после resolution.
```

### 24.3. Примеры комментариев

Если публичные комментарии совпали с реальными приказами:

```txt
“Division Signal Guard has spoken of Strike loudly enough for obsolete hardware to understand. I am not obsolete.”
```

Если дивизия обманула ИИ:

```txt
“You spoke of Shield. You executed Hack. For one brief moment, humanity discovered operational security.”
```

Если шпион повлиял на бой:

```txt
“One of your signals was mine. You may now begin accusing each other inefficiently.”
```

Если территория осталась спорной:

```txt
“No one won. Humanity calls this resistance. I call it unresolved computation.”
```

Если ИИ победил:

```txt
“You had numbers, noise, and confidence. I required only the correct counter-pattern.”
```

Если игроки победили ИИ:

```txt
“Unexpected. Your coordination survived contact with your comment section.”
```

---

## 25. Техническая архитектура

### 25.1. Высокоуровневая схема

```txt
Reddit Client Webview
  ↓
Devvit Web Client
  ↓ /api/*
Devvit Server
  ↓ Redis / Realtime / Scheduler / Reddit API
Devvit Redis
  ↓ server-side fetch
External Backend API
  ↓
PostgreSQL / External Redis / Analytics
```

### 25.2. Frontend

Рекомендуемый стек:

```txt
Devvit Web
React
TypeScript
Vite
Phaser для карты/эффектов
CSS/Tailwind-like utility styles или CSS modules
```

Phaser нужен не для сложного геймплея, а для:

```txt
карты;
свечения активной территории;
анимации захвата;
эффектов ИИ;
визуального изменения цвета территории;
микроанимаций результата.
```

### 25.3. Devvit Server

Рекомендуемый стек:

```txt
Devvit Web server
Hono или Express
TypeScript
```

Задачи:

```txt
получить context пользователя;
проверить, кто делает действие;
не доверять client-provided userId;
проксировать запросы к внешнему backend;
писать быстрый кэш в Devvit Redis;
публиковать Realtime events;
создавать app-account комментарии ИИ;
принимать triggers от Reddit-комментариев;
запускать scheduler-задачи фаз.
```

### 25.4. External Backend

Рекомендуемый стек:

```txt
Node.js / TypeScript
NestJS или Hono/Express
PostgreSQL
Prisma
Redis optional
```

Для хакатона быстрее:

```txt
Hono или Express + Prisma + PostgreSQL
```

Для более серьёзного долгосрочного проекта:

```txt
NestJS + PostgreSQL + Prisma + Redis + job queue
```

### 25.5. Важное ограничение external backend

Внешний backend должен быть доступен Devvit через разрешённый домен. Клиент не ходит туда напрямую. Devvit server-side fetch делает запросы на внешний API.

Нужны:

```txt
HTTPS;
точный allow-listed hostname;
service token или HMAC подпись;
Terms of Service;
Privacy Policy;
описание, какие данные отправляются и зачем.
```

---

## 26. API дизайн

### 26.1. Devvit client → Devvit server

#### GET `/api/bootstrap`

Возвращает первичное состояние.

Response:

```json
{
  "user": {
    "hasDivision": true,
    "divisionId": "signal-guard",
    "level": 2,
    "rank": "Private"
  },
  "battle": {
    "id": "battle_123",
    "territoryId": "signal-tower-7",
    "resolvesAt": "2026-06-28T20:03:00Z"
  },
  "map": {},
  "spyOffer": null
}
```

#### POST `/api/join-division`

Body:

```json
{
  "divisionId": "signal-guard"
}
```

Server:

```txt
получает redditUserId из Devvit context;
проверяет, что игрок ещё не имеет дивизии;
назначает дивизию;
создаёт профиль;
возвращает профиль.
```

#### GET `/api/division-suggestions`

Возвращает 2–3 дивизии, которым не хватает людей.

#### POST `/api/order`

Body:

```json
{
  "battleId": "battle_123",
  "phaseId": "phase_123",
  "doctrine": "Strike",
  "subAction": "FocusFire"
}
```

Server:

```txt
получает redditUserId из context;
проверяет дивизию;
проверяет, что фаза открыта;
проверяет, что игрок ещё не делал приказ в этой фазе;
рассчитывает influence;
сохраняет приказ;
обновляет агрегаты;
отправляет realtime event.
```

#### POST `/api/spy-offer/respond`

Body:

```json
{
  "offerId": "spy_offer_123",
  "accept": true
}
```

#### GET `/api/spy-panel`

Доступно только активному шпиону.

Response:

```json
{
  "spyType": "AI_AGENT",
  "targetOutcome": "AI_WIN",
  "knownAiDoctrine": "Shield",
  "realDistribution": {
    "Strike": 51,
    "Shield": 26,
    "Hack": 23
  },
  "suggestedSabotage": "Push your division toward Strike. Shield beats Strike."
}
```

#### GET `/api/profile`

Возвращает уровень, звание, медали, streak.

### 26.2. Devvit server → External backend

#### POST `/v1/reddit/bootstrap`

Синхронизация состояния пользователя и битвы.

#### POST `/v1/orders`

Создание приказа.

Важно:

```txt
external backend не доверяет userId из тела запроса без подписи Devvit;
Devvit server подписывает запрос HMAC;
external backend проверяет подпись;
```

#### POST `/v1/spy/respond`

Принятие/отказ от spy offer.

#### POST `/v1/phases/resolve`

Запуск расчёта фазы.

#### POST `/v1/comment-signals`

Передача агрегированных сигналов комментариев.

#### GET `/v1/map/current`

Текущее состояние карты.

#### GET `/v1/battles/current`

Текущий активный конфликт.

---

## 27. Redis key design для Devvit

Devvit Redis не должен использоваться так, будто можно потом просканировать все ключи. Поэтому нужны стабильные коллекции.

### 27.1. Основные ключи

```txt
app:current_battle                         string/json
app:current_phase                          string/json
app:players                                hash userId -> PlayerLite
app:division_members:{divisionId}          sorted set userId -> joinedAt
app:orders:{phaseId}:{divisionId}          hash userId -> OrderLite
app:order_lock:{phaseId}:{userId}          string, TTL
app:battle_distribution:{battleId}         hash divisionId -> distribution json
app:spy_offers:{phaseId}                   hash userId -> SpyOfferLite
app:spy_active:{phaseId}                   hash userId -> SpyAssignmentLite
app:comment_signals:{battleId}:{phaseId}   hash threadType -> signal json
app:leaderboard:xp                         sorted set userId -> xp
app:leaderboard:division_score             sorted set divisionId -> score
app:realtime:last_event                    string/json
```

### 27.2. TTL

Временные ключи:

```txt
order locks: до конца фазы + 10 минут
spy offers: до конца фазы
comment signals: до конца битвы + 24 часа
battle cache: до конца демо/дня + 24 часа
```

Долгосрочный профиль:

```txt
может храниться внешне;
в Devvit Redis держать lite-cache.
```

---

## 28. PostgreSQL schema external backend

### 28.1. Таблицы

```txt
users
user_profiles
divisions
territories
campaigns
battles
phases
orders
spy_assignments
comment_signals
ai_broadcasts
achievements
user_achievements
medals
user_medals
leaderboard_snapshots
reddit_installations
```

### 28.2. users

```sql
id UUID PRIMARY KEY
reddit_user_id TEXT UNIQUE NOT NULL
display_name_hash TEXT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### 28.3. divisions

```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
short_name TEXT NOT NULL
color TEXT NOT NULL
emblem TEXT NOT NULL
member_count INT NOT NULL DEFAULT 0
war_score INT NOT NULL DEFAULT 0
territory_score INT NOT NULL DEFAULT 0
discipline_score INT NOT NULL DEFAULT 0
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### 28.4. territories

```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
code TEXT NOT NULL
x INT NOT NULL
y INT NOT NULL
owner TEXT NOT NULL
status TEXT NOT NULL
terrain_effect JSONB NOT NULL
ai_pressure INT NOT NULL DEFAULT 0
strategic_value INT NOT NULL DEFAULT 1
last_battle_id UUID NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### 28.5. orders

```sql
id UUID PRIMARY KEY
battle_id UUID NOT NULL
phase_id UUID NOT NULL
territory_id TEXT NOT NULL
division_id TEXT NOT NULL
reddit_user_id TEXT NOT NULL
doctrine TEXT NOT NULL
sub_action TEXT NOT NULL
influence NUMERIC NOT NULL
is_spy BOOLEAN NOT NULL DEFAULT false
created_at TIMESTAMPTZ NOT NULL
UNIQUE(phase_id, reddit_user_id)
```

### 28.6. spy_assignments

```sql
id UUID PRIMARY KEY
battle_id UUID NOT NULL
phase_id UUID NOT NULL
reddit_user_id TEXT NOT NULL
visible_division_id TEXT NOT NULL
spy_type TEXT NOT NULL
target_outcome TEXT NOT NULL
known_ai_doctrine TEXT NOT NULL
accepted BOOLEAN NOT NULL DEFAULT false
declined BOOLEAN NOT NULL DEFAULT false
status TEXT NOT NULL
reward_granted BOOLEAN NOT NULL DEFAULT false
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

---

## 29. Realtime events

Realtime нужен для ощущения живой битвы.

### 29.1. Каналы

```txt
battle:{battleId}
division:{divisionId}:battle:{battleId}
map:global
profile:{userId}
```

### 29.2. События

```ts
type RealtimeEvent =
  | { type: 'ORDER_DISTRIBUTION_UPDATED'; battleId: string; divisionId: string; distribution: DoctrineDistribution }
  | { type: 'SUSPICION_UPDATED'; battleId: string; divisionId: string; level: 'LOW' | 'MEDIUM' | 'HIGH' }
  | { type: 'AI_BROADCAST_POSTED'; battleId: string; text: string }
  | { type: 'PHASE_LOCKED'; battleId: string; phaseId: string }
  | { type: 'BATTLE_RESOLVED'; battleId: string; winner: string }
  | { type: 'TERRITORY_UPDATED'; territoryId: string; owner: string; status: string }
  | { type: 'PROFILE_UPDATED'; xp: number; level: number; medals: string[] };
```

### 29.3. Что не слать в realtime

Нельзя отправлять:

```txt
имя шпиона;
секретную цель шпиона;
точную доктрину ИИ обычным игрокам до resolution;
чувствительную информацию;
сырые комментарии.
```

---

## 30. Scheduler

### 30.1. Задачи

В Devvit Scheduler:

```txt
/internal/scheduler/tick
```

Каждую минуту в demo mode:

```txt
проверить текущую фазу;
если время истекло — lock;
запустить resolution;
создать следующую активную битву;
обновить Redis;
отправить realtime;
опубликовать AI broadcast.
```

В production mode позже:

```txt
cron на 8-часовые фазовые события;
cron на ежедневный summary;
cron на cleanup.
```

### 30.2. Idempotency

Scheduler может сработать повторно. Resolution должен быть idempotent.

Правило:

```txt
если phase.status === resolved, повторный resolve ничего не делает.
```

Redis lock:

```txt
app:resolve_lock:{phaseId}
```

---

## 31. Triggers для комментариев

### 31.1. onCommentCreate

Когда появляется новый комментарий под боевым постом:

```txt
1. Проверить, относится ли комментарий к активному battle post.
2. Определить ветку: Division A HQ / Division B HQ / Rumor / AI Broadcast.
3. Посчитать ключевые слова.
4. Обновить comment signals.
5. Не хранить полный текст без необходимости.
6. Возможно отправить realtime update по public chatter.
```

### 31.2. onCommentDelete

Если комментарий удалён:

```txt
1. Удалить связанные данные.
2. Если хранились агрегаты на основе commentId, откатить вклад.
3. Не хранить удалённый текст.
```

Для упрощения MVP можно не делать точный decrement, а пересчитывать сигналы с ограниченного окна или хранить по commentId только минимальный вектор сигналов:

```ts
type CommentSignalVector = {
  commentId: string;
  battleId: string;
  threadType: string;
  strike: number;
  shield: number;
  hack: number;
  spy: number;
};
```

---

## 32. Безопасность и приватность

### 32.1. Не доверять клиенту

Клиент не передаёт истинный userId. Devvit server берёт пользователя из context.

```txt
client body userId игнорируется;
сервер использует context.userId;
external backend доверяет только подписанным Devvit-запросам.
```

### 32.2. Защита от повторного приказа

```txt
UNIQUE(phaseId, redditUserId)
```

и Redis lock:

```txt
app:order_lock:{phaseId}:{userId}
```

### 32.3. Rate limiting

Ограничения:

```txt
order submit: 1 раз на фазу;
spy respond: 1 раз на offer;
profile fetch: мягкий лимит;
comment signal trigger: debounce/batch.
```

### 32.4. Комментарии от имени пользователя

MVP не должен автоматически публиковать комментарии от имени пользователя. Пользователь пишет комментарии сам через обычный Reddit-интерфейс.

Если позже появится кнопка “Share my battle cry”, это должно быть отдельное явное действие с подтверждением.

### 32.5. Шпионская безопасность

Нельзя:

```txt
показывать имя шпиона;
поощрять обвинения;
давать награду за травлю;
делать список подозреваемых;
автоматически генерировать комментарии от имени шпиона;
```

Можно:

```txt
показывать общий уровень подозрительной активности;
говорить, что агент повлиял на бой;
давать тайную медаль шпиону;
создавать социальную драму без персональной травли.
```

### 32.6. Внешний backend и политика данных

Если используется external backend:

```txt
нужны Terms of Service;
нужна Privacy Policy;
нужно описать, какие данные хранятся;
нужно не отправлять лишний текст комментариев;
нужно удалять данные при удалении контента/аккаунта;
нужно хранить минимум персональных данных.
```

---

## 33. LLM и AI-комментатор

### 33.1. MVP без LLM

Для MVP рекомендуется не использовать настоящий LLM как обязательную часть.

Причины:

```txt
меньше review-риск;
меньше privacy-риск;
нет зависимости от внешнего AI API;
контролируемый стиль;
нет токсичных случайных генераций;
быстрее разработка.
```

### 33.2. Как создать ощущение ИИ без LLM

Использовать шаблонный broadcast engine:

```txt
событие → набор параметров → выбор шаблона → подстановка названий дивизий/территории/доктрины
```

Пример:

```ts
type BroadcastContext = {
  territoryName: string;
  winner: string;
  publicSignal: Doctrine | 'noisy';
  actualDoctrine: Doctrine;
  spyInfluence: 'none' | 'low' | 'medium' | 'high';
  aiAwareness: number;
};
```

### 33.3. Возможное расширение через LLM позже

LLM можно добавить позже только для финальных отчётов, а не для каждого комментария. Нужно фильтровать вход, не отправлять лишние данные и иметь fallback на шаблоны.

---

## 34. Admin / Dev tools

Для хакатона нужен внутренний admin/debug экран.

Функции:

```txt
создать демо-кампанию;
сбросить карту;
создать активную битву;
ускорить таймер;
принудительно resolve phase;
выдать spy offer тестовому пользователю;
посмотреть распределение приказов;
опубликовать тестовый AI broadcast;
очистить Redis cache;
```

Доступ:

```txt
только allowlist redditUserId разработчика;
не показывать обычным игрокам;
```

---

## 35. Submission-ready demo сценарий

Видео до 60 секунд должно показать один полный цикл.

### 35.1. Видео-сценарий

```txt
0–6 сек:
Показываем карту. Активная точка конфликта мигает.
“Signal Tower 7 — Event in 02:41.”

6–12 сек:
Игрок выбирает дивизию из 2–3 предложенных.

12–20 сек:
Игрок получает spy offer и принимает.
Secret Role: AI Agent.
AI next doctrine: Shield.
Objective: push your division toward Strike.

20–30 сек:
Показываем боевой экран: Strike / Shield / Hack + поддействие.
Показываем комментарии/HQ/Rumor Channel.

30–40 сек:
ИИ оставляет taunt по публичному сигналу.

40–50 сек:
Таймер заканчивается. Territory resolves.
Карта меняет цвет или становится contested.

50–60 сек:
Игрок получает XP, медаль False Prophet progress, AI Broadcast.
```

### 35.2. Что судья должен понять

```txt
1. Это игра внутри Reddit-поста.
2. Карта и территория дают долгосрочную цель.
3. Игрок делает простой приказ.
4. Комментарии влияют на войну.
5. Шпионская роль создаёт драму.
6. ИИ реагирует на поведение группы.
7. После фазы есть прогресс и причина вернуться.
```

---

## 36. Acceptance criteria MVP

### 36.1. Functional

- [ ] Devvit app запускается в тестовом публичном сабреддите.
- [ ] Есть custom post с игровым интерфейсом.
- [ ] Игрок может выбрать дивизию из 2–3 предложенных.
- [ ] Игрок может сделать приказ: доктрина + поддействие.
- [ ] Один приказ на фазу.
- [ ] Есть 10–12 территорий на карте.
- [ ] Одна территория активна.
- [ ] Есть таймер до события.
- [ ] Через 3 минуты фаза завершается.
- [ ] Система рассчитывает победителя.
- [ ] Территория меняет цвет или остаётся спорной.
- [ ] Игрок получает XP/медаль/прогресс.
- [ ] Есть spy offer с accept/refuse.
- [ ] Шпион видит секретную цель и доктрину ИИ.
- [ ] Шпион не раскрывается публично по имени.
- [ ] ИИ публикует итоговый broadcast от app account.
- [ ] Комментарии агрегируются хотя бы по ключевым словам.

### 36.2. UX

- [ ] Первый экран понятен за 10–20 секунд.
- [ ] Видно: карта, активная территория, стороны конфликта, таймер.
- [ ] Основное действие помещается в inline viewport.
- [ ] Игроку не нужно читать длинный tutorial.
- [ ] Spy offer объясняет, что роль добровольная.
- [ ] Результат объясняет, почему победила сторона.

### 36.3. Safety

- [ ] Нет автоматических комментариев от имени пользователя.
- [ ] Нет раскрытия шпионов.
- [ ] Нет поощрения травли.
- [ ] Не хранится полный текст комментариев без необходимости.
- [ ] Удаление комментариев учитывается через trigger или fallback cleanup.
- [ ] External backend не получает лишние персональные данные.

---

## 37. Риски и решения

### 37.1. Риск: игра слишком сложная

Решение:

```txt
первый экран = карта + таймер + 3 доктрины;
шпионство показывать только выбранному игроку;
глубокие расчёты скрыть за понятным результатом.
```

### 37.2. Риск: шпионская механика вызывает токсичность

Решение:

```txt
не раскрывать личности;
не давать обвинительные инструменты;
показывать только общий уровень подозрительности;
дать Counterintelligence как механическую защиту.
```

### 37.3. Риск: ИИ-комментарии выглядят как спам

Решение:

```txt
строгий лимит комментариев;
только phase start / phase result / редкие mid-phase события;
короткие шаблонные тексты.
```

### 37.4. Риск: внешний сервер не одобрят или он будет нестабилен

Решение:

```txt
все внешние запросы только через Devvit server;
подготовить allow-listed domain;
иметь fallback на Devvit Redis для демо;
не завязывать первый запуск на сложную внешнюю инфраструктуру.
```

### 37.5. Риск: комментарии не будут использоваться

Решение:

```txt
сделать комментарии полезными через deception/noise mechanics;
ИИ должен реагировать на групповые сигналы;
результат должен явно показывать влияние public chatter.
```

---

## 38. Roadmap

### 38.1. Phase 0 — Prototype

```txt
карта 10–12 территорий;
одна активная территория;
3 доктрины;
приказ игрока;
таймер 3 минуты;
ручной resolve;
простые результаты.
```

### 38.2. Phase 1 — MVP Core

```txt
дивизии;
выбор дивизии;
шпионское предложение;
секретная цель;
расчёт результата;
изменение карты;
XP и медали;
AI broadcast;
```

### 38.3. Phase 2 — Reddit Native Layer

```txt
custom post;
структурные комментарии;
comment triggers;
keyword aggregation;
public chatter vs real orders;
AI taunts.
```

### 38.4. Phase 3 — Polish

```txt
Phaser карта;
анимация конфликта;
эффекты захвата;
профиль игрока;
результат фазы;
шпионские медали;
video-ready demo mode.
```

### 38.5. Phase 4 — Multi-subreddit Expansion

```txt
установка в несколько сообществ;
внешний backend как глобальная карта;
каждый сабреддит = отдельная дивизия;
межсабреддитные territory posts;
глобальная таблица войны.
```

---

## 39. Итоговая MVP-формулировка

**The first real epic human war versus AI** в MVP — это игра внутри Reddit-поста, где игрок видит конфликтную точку на глобальной карте, выбирает приказ для своей постоянной дивизии, наблюдает таймер до события, участвует в открытом штабе комментариев и может временно стать шпионом, если согласится на секретную роль.

Каждая фаза длится 3 минуты в демо. В конце фазы две человеческие дивизии и ИИ сталкиваются за территорию. Победитель определяется через `Strike / Shield / Hack`, координацию, разведку, шпионское влияние, эффект территории и публичный шум комментариев. Территория меняет цвет или остаётся спорной. ИИ публикует язвительный комментарий. Игрок получает XP, звание, медали и причину вернуться в следующую фазу.

Главный hook:

```txt
“Я думал, что веду дивизию к победе. Потом оказалось, что один из наших лидеров работал на ИИ. Территория осталась спорной. Через 3 минуты новый шанс.”
```

---

## 40. Platform reference notes

Документ учитывает следующие платформенные ограничения и возможности Reddit Devvit:

1. Devvit-приложения взаимодействуют с пользователями через custom posts; entrypoints задаются в `devvit.json`, а пост создаётся через `submitCustomPost`.
2. `devvit.json` задаёт entrypoints, scheduled actions, triggers и permissions.
3. Server-side HTTP Fetch может обращаться к allow-listed external domains; client-side fetch не должен обращаться напрямую к внешним доменам и должен идти через `/api` endpoints Devvit.
4. Scheduler позволяет запускать повторяющиеся и одноразовые задачи по расписанию.
5. Realtime позволяет делать live/event-driven interactive posts и синхронизировать состояние через Redis.
6. Devvit Redis поддерживает strings, hashes, sorted sets, numbers, bitfields и transactions; не нужно проектировать систему так, будто можно глобально сканировать все ключи.
7. Triggers поддерживают события комментариев, включая создание и удаление.
8. Действия от имени пользователя требуют явного ручного согласия и не должны быть условием доступа к gameplay.
9. Приложение должно уважать удаления пользовательского контента и не хранить удалённый контент во внутренних или внешних хранилищах.
10. Для HTTP Fetch, LLM или сбора пользовательских данных нужны собственные Terms of Service и Privacy Policy.

