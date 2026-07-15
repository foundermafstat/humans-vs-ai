# Challenges we ran into

## English

The hardest problem was not making AI sound intelligent. It was making AI feel dangerous **without allowing it to cheat**.

The model must see enough public information to threaten the humans, but it must never see their hidden orders, true spy allegiance, or private server state. At the same time, Reddit discussion is noisy, nested, sarcastic, contradictory, and vulnerable to prompt injection. We had to turn that chaos into a bounded signal, constrain doctrine recommendations to the seven valid choices, and keep the final battle result inside an auditable deterministic resolver.

The second major challenge was state. A player is globally a neutral member of humanity, but temporarily Green or Blue in a specific daily event. A spy adds a third truth: global identity, real army, and public cover must all coexist without leaking into one another. We separated persistent player profiles from event-local participants and kept hidden orders attached to the real army rather than the visible flair.

Then came the distributed-system version of war:

- two players can join at almost the same moment;
- a repeated request must not create a second soldier;
- Reddit can accept the event but temporarily reject a flair update;
- a scheduler can retry or overlap;
- the result must not be published twice;
- yesterday’s delayed flair retry must never overwrite today’s identity.

We solved these cases with assignment locks, idempotency keys, battle-scoped storage, deterministic tie-breaking, and a durable flair retry queue that recalculates the desired state before every attempt.

Designing seven doctrines was another challenge. The system had to be deeper than rock-paper-scissors but still understandable in seconds. We created a symmetric ring where every doctrine defeats three and loses to three, then made public readability, participation, and spy influence matter around that clean core.

Finally, we had to protect the idea from its own ambition. The long-term vision is a massive persistent war, but the hackathon build needed a coherent daily loop first. We chose to complete the backbone—join, assign, deceive, order, resolve, report, progress—before expanding the campaign.

Our first enemy was AI. Our second enemy was state synchronization. The second one had better logs.

---

## Русский перевод

Самая сложная задача заключалась не в том, чтобы заставить ИИ звучать умно. Нужно было сделать ИИ опасным, **не позволяя ему жульничать**.

Модель должна видеть достаточно публичной информации, чтобы угрожать людям, но не должна получать скрытые приказы, настоящую принадлежность шпионов или приватное состояние сервера. При этом обсуждения Reddit шумные, разветвлённые, саркастичные, противоречивые и уязвимые для prompt injection. Нам пришлось превратить этот хаос в ограниченный сигнал, разрешить рекомендации только из семи допустимых доктрин и оставить финальный результат боя внутри проверяемого детерминированного resolver.

Второй большой проблемой стало состояние. Глобально игрок остаётся нейтральным представителем человечества, но временно относится к Green или Blue в конкретном дневном событии. Шпион добавляет третью правду: глобальная личность, настоящая армия и публичное прикрытие должны сосуществовать и не раскрывать друг друга. Мы разделили постоянные профили и локальных участников события, а скрытые приказы привязали к настоящей армии, а не к видимому flair.

Затем началась война в терминах распределённых систем:

- два игрока могут присоединиться почти одновременно;
- повторный запрос не должен создавать второго солдата;
- Reddit может принять участие, но временно отклонить обновление flair;
- scheduler может повторить или пересечь задачу;
- результат нельзя опубликовать дважды;
- запоздалый retry вчерашнего flair не должен перезаписать сегодняшнюю принадлежность.

Мы решили эти случаи с помощью блокировок назначения, ключей идемпотентности, battle-scoped хранилища, детерминированного разрешения ничьих и надёжной очереди flair retry, которая перед каждой попыткой заново вычисляет правильное состояние.

Ещё одной задачей стал дизайн семи доктрин. Система должна была быть глубже, чем «камень, ножницы, бумага», но оставаться понятной за несколько секунд. Мы построили симметричное кольцо, где каждая доктрина побеждает три и проигрывает трём, а поверх чистого ядра добавили влияние публичной предсказуемости, участия и шпионов.

Наконец, нам пришлось защитить идею от её собственного масштаба. Долгосрочное видение — огромная постоянная война, но хакатонной версии прежде всего требовался цельный дневной цикл. Мы решили сначала завершить основу: присоединиться, получить назначение, обмануть, отдать приказ, разрешить бой, увидеть отчёт и получить прогрессию — и только затем расширять кампанию.

Нашим первым врагом был ИИ. Вторым — синхронизация состояния. У второго хотя бы были нормальные логи.
