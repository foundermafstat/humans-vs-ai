# Mobile loading and screen flow technical document

**Дата:** 2026-07-04  
**Проект:** Humans vs AI Devvit Phaser app  
**Цель:** описать все текущие экраны и сценарии запуска, включая сквозную загрузку в мобильном expanded view, и зафиксировать требования к выравниванию мобильного загрузчика.

---

## 1. Краткий вывод

На скриншоте показан expanded `game` entrypoint в мобильном режиме во время `Preloader`. Текущий загрузчик не адаптирован под реальный размер mobile webview: фон и progress bar рисуются в фиксированных координатах `512,384`, а Phaser canvas работает в режиме `RESIZE`. Поэтому на portrait-viewport progress bar смещается вправо и может частично уходить за край.

Минимальная техническая задача для исправления: сделать `Preloader` layout viewport-based, пересчитывать фон и progress bar от `this.scale.width / this.scale.height`, а не от базовой сцены `1024x768`.

---

## 2. Проверенные файлы

| Файл | Роль |
|---|---|
| `game/devvit.json` | Devvit entrypoints: inline `splash.html`, expanded `game.html`. |
| `game/src/client/splash.html` | Inline экран поста в Reddit feed. |
| `game/src/client/splash.ts` | Splash battlefield, title, Start, переход в expanded mode. |
| `game/src/client/splash.css` | Fixed/fullscreen layout inline splash. |
| `game/src/client/game.html` | Expanded game shell. |
| `game/src/client/game.ts` | Phaser config и старт scenes. |
| `game/src/client/game.css` | Fullscreen container для expanded canvas. |
| `game/src/client/scenes/Boot.ts` | Начальная загрузка background asset. |
| `game/src/client/scenes/Preloader.ts` | Экран загрузки assets, текущий источник mobile alignment issue. |
| `game/src/client/scenes/Game.ts` | Реальный игровой flow: army identification, paperwork. |
| `game/src/client/scenes/MainMenu.ts` | Существующая сцена, сейчас не достижима из текущего boot flow. |
| `game/src/client/scenes/GameOver.ts` | Существующая сцена, сейчас не достижима из текущего boot flow. |
| `game/src/server/routes/api.ts` | Dev API/war room endpoints, не подключены к текущему клиентскому визуальному flow. |

---

## 3. Текущая карта entrypoints

| Entrypoint | Devvit тип | HTML | Назначение |
|---|---|---|---|
| `default` | `inline: true` | `splash.html` | Экран внутри поста/feed. Показывает battlefield-анимацию, логотип, CTA Start. |
| `game` | expanded | `game.html` | Полноэкранный/expanded webview. Запускает Phaser scenes: `Boot -> Preloader -> Game`. |

Переход выполняется из `splash.ts` через:

```txt
requestExpandedMode(event, 'game')
```

---

## 4. Сквозной flow запуска

| Шаг | Сценарий | Экран | Текущее поведение |
|---|---|---|---|
| 1 | Пользователь открывает Reddit post | Reddit shell + inline app | Devvit грузит `default` entrypoint. |
| 2 | Inline first paint | Splash | Черный фон, battlefield canvas, awards, logo, title, Start, stats ticker. |
| 3 | Splash assets load | Splash battlefield | Phaser внутри splash грузит battlefield, армии, FX. Отдельного progress UI нет. |
| 4 | Tap Start | Transition | `requestExpandedMode(event, 'game')`. Reddit открывает expanded webview. |
| 5 | Expanded shell | `game.html` | DOM содержит `#app > #game-container`. |
| 6 | Font gate | `game.ts` | Перед стартом Phaser ожидает `document.fonts.load` и `document.fonts.ready`; при ошибке стартует fallback. |
| 7 | Boot | `Boot.ts` | Грузит `background` из `../assets/bg.png`. UI почти нет. |
| 8 | Preloader | `Preloader.ts` | Показывает background и progress bar. Это состояние видно на скриншоте. |
| 9 | Game start | `Game.ts` | После загрузки assets сразу стартует сцена `Game`, минуя `MainMenu`. |
| 10 | Identification | `Game.ts` | Игрок выбирает `COOL ARMY` или `REGULAR ARMY`. |
| 11 | Army transition | `Game.ts` | Выбранная армия сохраняется локально, слой рук уходит вверх. |
| 12 | Paperwork | `Game.ts` | Показывается стол, бумага, отметка армии, портрет, кнопки `<` и `>`. |
| 13 | Character switch | `Game.ts` | Игрок листает портреты внутри выбранной армии. |
| 14 | Resize/orientation | `Game.ts` | Текущая активная сцена пересоздает layout под новый размер. |

---

## 5. Экран 1: Inline Splash

**Источник:** `splash.html`, `splash.ts`, `splash.css`

### Состав экрана

| Элемент | Поведение |
|---|---|
| Battlefield canvas | Fixed fullscreen, Phaser `RESIZE`, прозрачный canvas поверх background. |
| Awards image | Fixed top center, scale `0.6`. |
| Game logo | Случайный выбор из `logo1.webp`, `logo2.webp`, `logo3.webp`. |
| Title | `Join the ranks of humanity, {username/fighter}`. |
| Start button | Запускает expanded `game` entrypoint. |
| Stats ticker | Бегущая строка внизу. |

Фраза `ranks of humanity` является маркетинговым текстом splash. Канонические игровые звания,
их slug, описания и custom emoji определены в `game/src/server/core/playerRanks.ts`.

### Mobile требования

1. Inline splash должен занимать всю область Devvit inline post.
2. Start button должен оставаться доступным пальцем.
3. Stats ticker не должен перекрывать Start.
4. Battlefield canvas должен resize-иться без черных внутренних полос.

---

## 6. Экран 2: Expanded Shell

**Источник:** `game.html`, `game.css`

### Состав экрана

```txt
body
  #app
    #game-container
      Phaser canvas
```

`#app` имеет `height: 100vh`, `overflow: hidden`; `#game-container` занимает 100% ширины и высоты.

### Mobile требования

1. Canvas должен занимать весь доступный webview, не документ целиком.
2. UI должен учитывать Reddit mobile chrome сверху.
3. Нельзя позиционировать игровые элементы относительно ожидаемой desktop-сцены, если включен `Phaser.Scale.RESIZE`.

---

## 7. Сквозной экран загрузки: Boot + Preloader

**Источник:** `Boot.ts`, `Preloader.ts`  
**Скриншот:** `Снимок экрана - 2026-07-04 в 13.19.38.png`

### Текущее состояние

`Boot` грузит `background`. `Preloader.init()` рисует:

| Элемент | Текущие координаты |
|---|---|
| Background image | `this.add.image(512, 384, 'background')` |
| Progress outline | `this.add.rectangle(512, 384, 468, 32)` |
| Progress fill | `this.add.rectangle(512 - 230, 384, 4, 28)` |

При этом game config использует:

```txt
scale.mode = Phaser.Scale.RESIZE
width = 1024
height = 768
```

В режиме `RESIZE` фактические `this.scale.width` и `this.scale.height` равны текущему webview, а не гарантированно `1024x768`. Из-за этого фиксированная точка `512,384` перестает быть центром на мобильном portrait.

### Видимый дефект

| Симптом | Причина |
|---|---|
| Progress bar смещен вправо | Центр загрузчика жестко задан как `x=512`, а mobile viewport может быть уже 1024. |
| Progress bar может обрезаться справа | Ширина bar фиксированная `468`, правая граница не проверяется относительно viewport. |
| Background выглядит как большая синяя область без композиции | Background не cover-fit под текущий viewport. |
| Нет safe-area отступов | Layout не учитывает мобильную верхнюю панель Reddit/browser. |

### Целевое поведение

| Условие | Требование |
|---|---|
| Mobile portrait | Progress bar строго по центру доступного canvas. |
| Mobile landscape | Progress bar по центру, не ближе 24px к краям. |
| Desktop expanded | Progress bar остается визуально в центре, максимум `468px`. |
| Resize/orientation during loading | Background и bar пересчитываются без перезапуска загрузки. |
| Медленная загрузка assets | Bar плавно обновляется по `progress`, текст/индикатор не обязателен, но допустим. |

### Рекомендуемая формула layout

```txt
viewportWidth = this.scale.width
viewportHeight = this.scale.height
safePad = 24
barWidth = min(468, viewportWidth - safePad * 2)
barHeight = 32
barX = viewportWidth / 2
barY = viewportHeight * 0.58
fillOriginX = barX - barWidth / 2 + 2
fillWidth = max(4, (barWidth - 8) * progress)
```

Background должен использовать cover-fit:

```txt
backgroundScale = max(viewportWidth / image.width, viewportHeight / image.height)
background.x = viewportWidth / 2
background.y = viewportHeight / 2
background.scale = backgroundScale
```

---

## 8. Экран 3: Identification

**Источник:** `Game.ts`

### Состав экрана

| Элемент | Текущее поведение |
|---|---|
| Floor | TileSprite `floor-tree`, масштаб зависит от `min(width, height)`. |
| Left hand | `COOL ARMY`, green pill, кликабельна. |
| Right hand | `REGULAR ARMY`, blue pill, кликабельна. |
| Text labels | Phaser text с `VT323`, stroke. |
| Entry animation | Обе руки падают сверху через `Back.easeOut`. |

### Сценарии

| ID | Сценарий | Результат |
|---|---|---|
| ID-1 | Первый вход после загрузки | Показываются две армии. |
| ID-2 | Tap green hand/pill | `selectedArmy = green`, переход к paperwork. |
| ID-3 | Tap blue hand/pill | `selectedArmy = blue`, переход к paperwork. |
| ID-4 | Resize/orientation | Identification layer пересоздается без анимации. |
| ID-5 | Быстрый двойной tap | `isTransitioning` блокирует повторный переход. |

### Mobile требования

1. Две руки не должны выходить за горизонтальные границы.
2. Pill должен иметь touch target не меньше 44px.
3. Подписи не должны пересекаться между колонками.
4. На узких экранах допустимо уменьшить масштаб рук или перейти к вертикальной компоновке.

---

## 9. Экран 4: Army Selection Transition

**Источник:** `Game.ts`

### Поведение

После выбора армии:

1. `selectedArmy` обновляется.
2. `identificationLayer` уходит вверх на `-height * 0.95`.
3. После завершения tween слой уничтожается.
4. Запускается `showPaperworkScene(true)`.

### Mobile требования

1. Во время tween не должно быть пустого кадра с одним фоном дольше одного frame.
2. Повторный tap не должен запускать второй transition.
3. При resize во время transition нужно либо завершить transition, либо пересоздать текущую стадию безопасно.

---

## 10. Экран 5: Paperwork / Character Selection

**Источник:** `Game.ts`

### Состав экрана

| Элемент | Текущее поведение |
|---|---|
| Table | Cover-scale относительно viewport, `* 1.18`. |
| Back paper | Slight offset, angle `4`. |
| Front paper | Основной лист анкеты. |
| Army mark | Рисуется graphics-галочкой по выбранной армии. |
| Portrait | Crop из выбранного character asset. |
| Left/right buttons | Phaser graphics buttons `<` и `>`. |
| Name text | Имя текущего character id uppercase. |
| Camera focus | Pan/zoom на бумагу. |

### Сценарии

| ID | Сценарий | Результат |
|---|---|---|
| PW-1 | Вход из green army | Зеленая отметка, green character assets. |
| PW-2 | Вход из blue army | Blue отметка, blue character assets. |
| PW-3 | Tap `<` | Индекс персонажа уменьшается по кругу. |
| PW-4 | Tap `>` | Индекс персонажа увеличивается по кругу. |
| PW-5 | Resize/orientation | Paperwork scene пересоздается, camera focus применяется без анимации. |

### Mobile требования

1. Бумага должна быть читаемой в portrait.
2. Кнопки `<` и `>` должны оставаться внутри видимой области бумаги.
3. Camera zoom не должен обрезать интерактивные элементы.
4. При very narrow viewport нужно ограничить `targetZoom`, чтобы не увести кнопки за края.

---

## 11. Существующие, но не активные сцены

| Сцена | Статус | Причина |
|---|---|---|
| `MainMenu` | Не достижима в текущем boot flow | `Preloader.create()` сразу вызывает `this.scene.start('Game')`. |
| `GameOver` | Не достижима в текущем gameplay | В `Game.ts` нет перехода в `GameOver`. |

Эти сцены нужно либо удалить из текущего flow-документа после рефакторинга, либо подключить осознанно. Сейчас они не должны считаться пользовательскими экранами MVP.

---

## 12. Server/API сценарии

Текущий клиентский visual flow не вызывает `/api`. Серверные endpoints существуют для Devvit/dev-функций:

| Endpoint | Назначение |
|---|---|
| `GET /api/init` | Возвращает postId, count, username. |
| `POST /api/increment` | Dev counter increment. |
| `POST /api/decrement` | Dev counter decrement. |
| `GET /api/dev/state` | Dev war room state. |
| `POST /api/dev/apply-flair` | Применить тестовый Green Tribe flair. |
| `POST /api/dev/create-war-post` | Создать dev war post и ветки комментариев. |
| `POST /api/dev/comment/app` | Оставить app-комментарий в war room branch. |
| `POST /api/dev/comment/user` | Оставить user-комментарий в Green/Blue branch. |

Для текущего mobile loading fix API менять не нужно.

---

## 13. Mobile viewport matrix

Минимальная проверка после исправления загрузчика:

| Viewport | Ожидание |
|---|---|
| 375x667 portrait | Bar виден полностью, центрирован, не ближе 24px к краям. |
| 390x844 portrait | Bar центрирован, background cover-fit. |
| 430x932 portrait | Bar центрирован, нет горизонтального scroll/clip. |
| 768x1024 tablet portrait | Bar центрирован, не выглядит слишком большим. |
| 844x390 landscape | Bar центрирован, не перекрывается Reddit chrome. |
| Desktop expanded | Поведение не хуже текущего, bar максимум 468px. |

---

## 14. Acceptance criteria для исправления загрузки

1. `Preloader` не использует фиксированные координаты `512,384` для layout.
2. Progress outline и fill рассчитываются от текущего viewport.
3. Background в `Preloader` центрируется и cover-fit масштабируется.
4. Resize/orientation во время загрузки пересчитывает layout.
5. Progress fill растет от левого края outline, не сдвигая outline.
6. На mobile portrait progress bar полностью виден в пределах canvas.
7. После `Preloader` игра стартует в `Game` без изменения текущего gameplay flow.
8. Исправление не требует серверных изменений и не меняет Devvit entrypoints.

---

## 15. Минимальный план реализации

1. В `Preloader.ts` сохранить ссылки на `background`, `outline`, `bar`.
2. Добавить `layoutLoadingScreen(progress = currentProgress)`.
3. В `init()` создать объекты с временными координатами и сразу вызвать layout.
4. В `load.on('progress')` обновлять `currentProgress` и ширину fill через layout helper.
5. Подписаться на `this.scale.on('resize', ...)` и снять подписку при shutdown.
6. При необходимости обновить комментарий в `game.ts`: текущий режим не fixed resolution, а viewport resize.
7. Проверить только targeted run: `npm run dev` уже поднимает Devvit playtest; full build/test запускать только при отдельном подтверждении.

---

## 16. Риски и предположения

1. Скриншот показывает именно expanded `game` preloader, а не inline splash.
2. Черные боковые области вокруг mobile frame относятся к Reddit/browser shell, не обязательно к canvas.
3. Google Font ожидание перед стартом Phaser может добавлять задержку до `Boot`; это отдельный UX-риск, но не источник смещенного progress bar.
4. В текущей реализации нет сохранения выбранной армии/персонажа через backend.
5. MainMenu и GameOver присутствуют в scene array, но пользователь их сейчас не видит.
