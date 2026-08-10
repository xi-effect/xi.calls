export type ReactionOptionT = {
  emoji: string;
  labelKey:
    | 'reactions.thumbsUp'
    | 'reactions.heart'
    | 'reactions.party'
    | 'reactions.clap'
    | 'reactions.laugh'
    | 'reactions.wow'
    | 'reactions.sad'
    | 'reactions.hands'
    | 'reactions.crocodile'
    | 'reactions.fire'
    | 'reactions.handshake'
    | 'reactions.column';
};

/** Курируемый набор реакций (как в Google Meet) + бренд-эмодзи */
export const REACTION_OPTIONS: ReactionOptionT[] = [
  { emoji: '👍', labelKey: 'reactions.thumbsUp' },
  { emoji: '❤️', labelKey: 'reactions.heart' },
  { emoji: '🎉', labelKey: 'reactions.party' },
  { emoji: '👏', labelKey: 'reactions.clap' },
  { emoji: '😂', labelKey: 'reactions.laugh' },
  { emoji: '😮', labelKey: 'reactions.wow' },
  { emoji: '😢', labelKey: 'reactions.sad' },
  { emoji: '🙌', labelKey: 'reactions.hands' },
  { emoji: '🐊', labelKey: 'reactions.crocodile' },
  { emoji: '🔥', labelKey: 'reactions.fire' },
  { emoji: '🤝', labelKey: 'reactions.handshake' },
  { emoji: '🏛️', labelKey: 'reactions.column' },
];

export const REACTION_MESSAGE_TYPE = 'reaction';

/** Не даём отправлять реакции чаще этого интервала — защита от спама кликом/хоткеем */
export const REACTION_SEND_COOLDOWN_MS = 280;
/** Скользящее окно и максимум реакций в нём от одного отправителя (доп. защита от автокликера) */
export const REACTION_RATE_LIMIT_WINDOW_MS = 10_000;
export const REACTION_RATE_LIMIT_MAX_IN_WINDOW = 12;
/** Получатель не доверяет чужому cooldown: не принимаем от одного участника чаще этого интервала */
export const REACTION_RECEIVE_MIN_INTERVAL_MS = 200;

/** Сколько смайликов всплывает на одну отправленную реакцию (как в Google Meet) */
export const REACTION_BURST_COUNT = 4;
/** Базовая задержка между смайликами внутри одной пачки */
export const REACTION_BURST_STAGGER_MS = 90;

/** Базовая длительность полёта одного эмодзи (фактическая варьируется случайно) */
export const FLOATING_REACTION_LIFETIME_MS = 2200;
