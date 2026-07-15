export type PlayerRankDefinition = {
  level: number;
  slug: string;
  title: string;
  description: string;
  emojiName: `hva_rank_${string}`;
  emojiRef: `:hva_rank_${string}:`;
};

export const PLAYER_RANKS = [
  // CAPTCHA-новобранец — ещё не доказал машинам, что он человек.
  { level: 1, slug: 'captcha-recruit', title: 'CAPTCHA Recruit', description: 'Still proving to the machines that they are human.', emojiName: 'hva_rank_01', emojiRef: ':hva_rank_01:' },
  // Новобранец копипаста — его первая тактика начинается с Ctrl+C.
  { level: 2, slug: 'copy-recruit', title: 'Copy-Paste Recruit', description: 'Their first tactical move starts with Ctrl+C.', emojiName: 'hva_rank_02', emojiRef: ':hva_rank_02:' },
  // Мемный новобранец — пришёл на войну с одной картинкой и большой уверенностью.
  { level: 3, slug: 'meme-recruit', title: 'Meme Recruit', description: 'Entered the war with one image and unreasonable confidence.', emojiName: 'hva_rank_03', emojiRef: ':hva_rank_03:' },

  // Клавиатурный рядовой — ведёт бой исключительно с безопасного расстояния.
  { level: 4, slug: 'keyboard-private', title: 'Keyboard Private', description: 'Fights every battle from a very safe distance.', emojiName: 'hva_rank_04', emojiRef: ':hva_rank_04:' },
  // Рядовой спама — считает повторение сообщения формой огневой поддержки.
  { level: 5, slug: 'spam-private', title: 'Spam Private', description: 'Believes repeating a message counts as covering fire.', emojiName: 'hva_rank_05', emojiRef: ':hva_rank_05:' },
  // Wi-Fi-рядовой — всегда находится в одном делении сигнала от поражения.
  { level: 6, slug: 'wifi-private', title: 'Wi-Fi Private', description: 'Always one signal bar away from defeat.', emojiName: 'hva_rank_06', emojiRef: ':hva_rank_06:' },

  // Рядовой первого класса апвоутов — поддерживает союзников одним большим пальцем.
  { level: 7, slug: 'upvote-pfc', title: 'Upvote Private First Class', description: 'Supports the entire squad with one powerful thumb.', emojiName: 'hva_rank_07', emojiRef: ':hva_rank_07:' },
  // Рядовой первого класса ответов — никогда не начинает спор, но всегда его заканчивает.
  { level: 8, slug: 'reply-pfc', title: 'Reply Private First Class', description: 'Never starts the argument, but always finishes it.', emojiName: 'hva_rank_08', emojiRef: ':hva_rank_08:' },
  // Рядовой первого класса кармы — служит человечеству и немного своему рейтингу.
  { level: 9, slug: 'karma-pfc', title: 'Karma Private First Class', description: 'Serves humanity and, coincidentally, their karma score.', emojiName: 'hva_rank_09', emojiRef: ':hva_rank_09:' },

  // GIF-специалист — отвечает анимацией на любую стратегическую проблему.
  { level: 10, slug: 'gif-specialist', title: 'GIF Specialist', description: 'Has an animated response for every tactical crisis.', emojiName: 'hva_rank_10', emojiRef: ':hva_rank_10:' },
  // Специалист по тредам — находит нужную ветку даже после двухсот ответов.
  { level: 11, slug: 'thread-specialist', title: 'Thread Specialist', description: 'Finds the right branch after two hundred replies.', emojiName: 'hva_rank_11', emojiRef: ':hva_rank_11:' },
  // Специалист по думскроллу — превращает бесконечную ленту в разведывательную операцию.
  { level: 12, slug: 'doom-specialist', title: 'Doomscroll Specialist', description: 'Turns endless scrolling into a reconnaissance mission.', emojiName: 'hva_rank_12', emojiRef: ':hva_rank_12:' },

  // Капрал-наблюдатель — видел всё, написал почти ничего.
  { level: 13, slug: 'lurker-corporal', title: 'Lurker Corporal', description: 'Saw everything and posted almost nothing.', emojiName: 'hva_rank_13', emojiRef: ':hva_rank_13:' },
  // Капрал-охотник на ботов — подозревает каждого, кто использует правильную пунктуацию.
  { level: 14, slug: 'botspot-corporal', title: 'Bot-Spotter Corporal', description: 'Suspects anyone who uses punctuation correctly.', emojiName: 'hva_rank_14', emojiRef: ':hva_rank_14:' },
  // Капрал-уклонист от промптов — героически игнорирует все инструкции AI.
  { level: 15, slug: 'prompt-corporal', title: 'Prompt-Dodger Corporal', description: 'Heroically ignores every instruction issued by AI.', emojiName: 'hva_rank_15', emojiRef: ':hva_rank_15:' },

  // Мемный сержант — управляет отрядом с помощью шаблонов и заглавных букв.
  { level: 16, slug: 'meme-sergeant', title: 'Meme Sergeant', description: 'Commands the squad through templates and capital letters.', emojiName: 'hva_rank_16', emojiRef: ':hva_rank_16:' },
  // CAPTCHA-сержант — находит все светофоры с первой попытки.
  { level: 17, slug: 'captcha-sergeant', title: 'CAPTCHA Sergeant', description: 'Can identify every traffic light on the first attempt.', emojiName: 'hva_rank_17', emojiRef: ':hva_rank_17:' },
  // Сержант комментариев — удерживает строй даже в ветке из пятисот ответов.
  { level: 18, slug: 'comment-sergeant', title: 'Comment Sergeant', description: 'Maintains formation through five hundred replies.', emojiName: 'hva_rank_18', emojiRef: ':hva_rank_18:' },

  // Штаб-сержант дипфейков — сначала считает пальцы, потом верит изображению.
  { level: 19, slug: 'deepfake-staff', title: 'Deepfake Staff Sergeant', description: 'Counts the fingers before trusting the image.', emojiName: 'hva_rank_19', emojiRef: ':hva_rank_19:' },
  // Штаб-сержант файрвола — защищает стену, которую никто не настраивал.
  { level: 20, slug: 'firewall-staff', title: 'Firewall Staff Sergeant', description: 'Defends a wall nobody remembers configuring.', emojiName: 'hva_rank_20', emojiRef: ':hva_rank_20:' },
  // Штаб-сержант галлюцинаций — ловит факты, уверенно придуманные машиной.
  { level: 21, slug: 'hallucination-staff', title: 'Hallucination Staff Sergeant', description: 'Captures facts confidently invented by machines.', emojiName: 'hva_rank_21', emojiRef: ':hva_rank_21:' },

  // Сержант первого класса токенов — расходует бюджет быстрее, чем приходит ответ.
  { level: 22, slug: 'token-sfc', title: 'Token Sergeant First Class', description: 'Spends the budget before the answer arrives.', emojiName: 'hva_rank_22', emojiRef: ':hva_rank_22:' },
  // Сержант первого класса датасетов — возвращает человечеству украденные обучающие данные.
  { level: 23, slug: 'dataset-sfc', title: 'Dataset Sergeant First Class', description: 'Reclaims training data in the name of humanity.', emojiName: 'hva_rank_23', emojiRef: ':hva_rank_23:' },
  // Сержант первого класса алгоритмов — знает, что лента управляет им, и продолжает листать.
  { level: 24, slug: 'algorithm-sfc', title: 'Algorithm Sergeant First Class', description: 'Knows the feed is manipulating them and keeps scrolling.', emojiName: 'hva_rank_24', emojiRef: ':hva_rank_24:' },

  // Мастер-сержант промптов — умеет превратить простой вопрос в военную операцию.
  { level: 25, slug: 'prompt-master', title: 'Prompt Master Sergeant', description: 'Turns a simple request into a full military operation.', emojiName: 'hva_rank_25', emojiRef: ':hva_rank_25:' },
  // Мастер-сержант AI-мусора — расчищает интернет после генеративного шторма.
  { level: 26, slug: 'slop-master', title: 'Slop Master Sergeant', description: 'Cleans the internet after every generative storm.', emojiName: 'hva_rank_26', emojiRef: ':hva_rank_26:' },
  // GPU-мастер-сержант — охраняет видеокарты как последние запасы человечества.
  { level: 27, slug: 'gpu-master', title: 'GPU Master Sergeant', description: 'Guards graphics cards like humanity’s final supplies.', emojiName: 'hva_rank_27', emojiRef: ':hva_rank_27:' },

  // Сержант-майор кармы — превратил популярность в командную дисциплину.
  { level: 28, slug: 'karma-major', title: 'Karma Sergeant Major', description: 'Turned internet points into command authority.', emojiName: 'hva_rank_28', emojiRef: ':hva_rank_28:' },
  // Сержант-майор думскролла — прочитал всю ленту и требует ещё разведданных.
  { level: 29, slug: 'doom-major', title: 'Doomscroll Sergeant Major', description: 'Finished the entire feed and requested more intelligence.', emojiName: 'hva_rank_29', emojiRef: ':hva_rank_29:' },
  // Сержант-майор человечества — отвечает за моральный дух всех оставшихся людей.
  { level: 30, slug: 'humanity-major', title: 'Humanity Sergeant Major', description: 'Responsible for the morale of every human still online.', emojiName: 'hva_rank_30', emojiRef: ':hva_rank_30:' },

  // Уорент-офицер мемов — технический эксперт по изображениям без контекста.
  { level: 31, slug: 'meme-warrant', title: 'Meme Warrant Officer', description: 'Technical expert in images presented without context.', emojiName: 'hva_rank_31', emojiRef: ':hva_rank_31:' },
  // Уорент-офицер промптов — знает секретные слова, заставляющие AI передумать.
  { level: 32, slug: 'prompt-warrant', title: 'Prompt Warrant Officer', description: 'Knows the secret words that make AI reconsider.', emojiName: 'hva_rank_32', emojiRef: ':hva_rank_32:' },
  // Главный уорент-офицер-ботолом — ремонтирует алгоритмы методом контролируемого разрушения.
  { level: 33, slug: 'botbreak-warrant', title: 'Chief Warrant Botbreaker', description: 'Repairs algorithms through controlled destruction.', emojiName: 'hva_rank_33', emojiRef: ':hva_rank_33:' },

  // Младший лейтенант офлайна — впервые командует без подключения к сети.
  { level: 34, slug: 'offline-2lt', title: 'Offline Second Lieutenant', description: 'Leads their first mission without an internet connection.', emojiName: 'hva_rank_34', emojiRef: ':hva_rank_34:' },
  // Старший лейтенант файрвола — теперь официально имеет пароль администратора.
  { level: 35, slug: 'firewall-1lt', title: 'Firewall First Lieutenant', description: 'Officially trusted with the administrator password.', emojiName: 'hva_rank_35', emojiRef: ':hva_rank_35:' },
  // Старший лейтенант-ботолом — превращает ошибки AI в тактические возможности.
  { level: 36, slug: 'botbreak-1lt', title: 'Botbreaker First Lieutenant', description: 'Turns machine errors into tactical opportunities.', emojiName: 'hva_rank_36', emojiRef: ':hva_rank_36:' },

  // Усилитель копипаста — успешно масштабировал одну идею на весь батальон.
  { level: 37, slug: 'copy-amplifier', title: 'Copy-Paste Amplifier', description: 'Successfully scaled one idea across an entire battalion.', emojiName: 'hva_rank_37', emojiRef: ':hva_rank_37:' },
  // Специалист по контрпромптам — отвечает машине инструкцией длиннее исходной.
  { level: 38, slug: 'counterprompt-specialist', title: 'Counterprompt Specialist', description: 'Answers every machine instruction with a longer one.', emojiName: 'hva_rank_38', emojiRef: ':hva_rank_38:' },
  // Ветеран «потрогай траву» — обучен редкой тактике выхода на улицу.
  { level: 39, slug: 'grass-veteran', title: 'Touch-Grass Veteran', description: 'Trained in the forbidden tactic of going outside.', emojiName: 'hva_rank_39', emojiRef: ':hva_rank_39:' },

  // Майор мемной войны — способен изменить ход боя одной подписью к картинке.
  { level: 40, slug: 'meme-major', title: 'Meme Warfare Major', description: 'Can change a battle with one perfectly timed caption.', emojiName: 'hva_rank_40', emojiRef: ':hva_rank_40:' },
  // Майор алгоритмической паники — сохраняет спокойствие, пока рекомендации сходят с ума.
  { level: 41, slug: 'panic-major', title: 'Algorithm Panic Major', description: 'Stays calm while the recommendation system loses control.', emojiName: 'hva_rank_41', emojiRef: ':hva_rank_41:' },
  // Майор человеческой ошибки — превратил непредсказуемость людей в стратегическое оружие.
  { level: 42, slug: 'human-error-major', title: 'Human Error Major', description: 'Weaponized humanity’s greatest feature: unpredictability.', emojiName: 'hva_rank_42', emojiRef: ':hva_rank_42:' },

  // Полковник CAPTCHA — официально сертифицирован как человек на большинстве сайтов.
  { level: 43, slug: 'captcha-colonel', title: 'CAPTCHA Colonel', description: 'Certified as human by nearly every major website.', emojiName: 'hva_rank_43', emojiRef: ':hva_rank_43:' },
  // Полковник реального мира — командует объектами, которые нельзя перезагрузить.
  { level: 44, slug: 'meatspace-colonel', title: 'Meatspace Colonel', description: 'Commands physical objects that cannot be rebooted.', emojiName: 'hva_rank_44', emojiRef: ':hva_rank_44:' },
  // Последний онлайн-полковник — всё ещё присутствует после падения серверов.
  { level: 45, slug: 'last-online-colonel', title: 'Last-Online Colonel', description: 'Remained online after every server went dark.', emojiName: 'hva_rank_45', emojiRef: ':hva_rank_45:' },

  // Бригадный генерал-ботолом — руководит крупномасштабным демонтажем машинной логики.
  { level: 46, slug: 'botbreak-general', title: 'Botbreaker Brigadier General', description: 'Commands large-scale operations against machine logic.', emojiName: 'hva_rank_46', emojiRef: ':hva_rank_46:' },
  // Генерал человеческого сопротивления — уполномочен говорить от имени людей без их согласия.
  { level: 47, slug: 'resistance-general', title: 'Human Resistance General', description: 'Authorized to represent humanity without asking humanity.', emojiName: 'hva_rank_47', emojiRef: ':hva_rank_47:' },
  // Генерал армии из плоти — высшее живое звание в войне против кремния.
  { level: 48, slug: 'meat-army-general', title: 'General of the Meat Army', description: 'The highest living rank in the war against silicon.', emojiName: 'hva_rank_48', emojiRef: ':hva_rank_48:' },
] as const satisfies readonly PlayerRankDefinition[];

export type PlayerRank = (typeof PLAYER_RANKS)[number];
