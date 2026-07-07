# Методология создания пиксельных изображений для Humans vs AI

**Дата:** 2026-07-07
**Статус:** базовый стандарт для игровых изображений и карты территорий
**Цель:** удерживать единый комичный пиксельный стиль без разного уровня детализации между ассетами.

---

## 1. Базовый визуальный стандарт

- Все игровые изображения сначала проектируются в низком разрешении, затем экспортируются в `4x` через nearest-neighbor.
- Внутренний пиксельный масштаб: `1 source pixel = 4 output pixels`.
- Без сглаживания, мягких градиентов, фотореалистичных бликов и мелких текстур, которые не читаются после сжатия.
- Детализация должна быть крупной: пятна, трещины, дым, потертости и контуры рисуются блоками от `1` до `3` source pixels.
- Контур у игровых объектов обязателен: темный пиксельный outline отделяет объект от фона.
- Текст внутри игровых изображений не используется, если это не отдельный UI-ассет.

## 2. Палитра и читаемость

Базовая карта использует грязно-земляную основу, чтобы командные цвета были главным сигналом.

| Роль | Цвет |
|---|---|
| Red team | `#cd3d32` |
| Green team | `#40ae52` |
| Blue team | `#3a6ad7` |
| Outline | `#181513` |
| Neutral ground | `#64543a` |
| Conflict overlay | серый дым/царапины поверх цвета команды |

Командный цвет всегда должен быть различим даже под серой конфликтной накладкой.

## 3. Правило native imagegen

Художественные terrain tiles создаются через встроенный Codex `image_gen`, не через локальный Python-генератор. Промпт должен фиксировать общий уровень пикселизации:

```txt
Comedic low-resolution pixel art game asset for a Reddit humans-vs-AI war game.
Use a strict chunky pixel style, no anti-aliasing look, no photorealism, no smooth gradients, no text, no watermark.
Use large readable details, dark pixel outline, limited palette, top-down game readability.
Export should feel like source art scaled up with nearest-neighbor.
```

Для прозрачности использовать flat chroma-key background `#ff00ff`, затем локально удалять фон. Исходный chroma-файл нужно сохранять рядом с очищенной PNG-версией, чтобы можно было повторить более чистую вырезку.

## 4. Бесшовные треугольные тайлы

Созданный набор лежит в:

```txt
game/public/assets/triangle-battlefield/imagegen/
```

Состав:

| Файл | Назначение |
|---|---|
| `triangle-biome-tileset-v1-chroma.png` | native imagegen источник на chroma-key фоне |
| `triangle-biome-tileset-v1.png` | прозрачная рабочая версия tileset |

Текущий tileset содержит `5` биомов, каждый в паре `up/down`:

- cracked dry wasteland;
- green muddy grassland;
- blue cold techno-ice;
- scorched black ash battlefield;
- rusted cyber-metal ground.

Тайлы рассчитаны как художественная база для бесконечной карты: верхний и нижний треугольник одного биома должны стыковаться грань к грани и повторяться в треугольной сетке.

## 5. Правила сборки карты

- Карта собирается из двух ориентаций: `up` и `down`.
- В соседних ячейках должны чередоваться ориентации, чтобы треугольники образовывали плотную triangular lattice.
- Для runtime лучше использовать маску треугольника на уровне кода, потому что native imagegen может оставить 1-2 пикселя мягкой chroma-каймы.
- На границах между разными биомами нужен отдельный transition tile или overlay, иначе резкая смена биома будет выглядеть как технический шов.
- Для бесконечной карты хранить не одну большую картинку, а набор biome tile pairs и seed-based выбор биома/варианта.

## 6. Prompt текущего tileset

Короткая версия промпта:

```txt
Create a production spritesheet of seamless triangular terrain tiles for a comedic Reddit humans-vs-AI war game.
Use chunky low-resolution pixel art.
Arrange 10 tiles in 5 columns x 2 rows: top row upward triangles, bottom row matching downward triangles.
Biomes: cracked wasteland, green muddy grassland, blue techno-ice, scorched ash battlefield, rusted cyber-metal.
Use a perfectly flat #ff00ff chroma-key background. No text, no watermark, no characters.
```

Полный build игры для изменения ассетов не требуется, пока tileset не подключен к runtime-коду.
