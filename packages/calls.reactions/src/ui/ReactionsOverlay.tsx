import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReactionsStore } from '@xipkg/calls-store';
import { EmojiGlyph } from '@xipkg/calls-ui';
import { useReactions } from '../hooks';
import {
  FLOATING_REACTION_LIFETIME_MS,
  REACTION_BURST_COUNT,
  REACTION_BURST_STAGGER_MS,
} from '../constants';

/** Отступ от левого края колонки */
const LEFT_EDGE_PX = 8;
/** Максимальный разброс по горизонтали внутри левой колонки */
const MAX_SPREAD_PX = 140;
/** Сколько реакцию ещё держим в DOM с учётом stagger и разброса длительности */
const MAX_VISIBLE_MS =
  Math.ceil(FLOATING_REACTION_LIFETIME_MS * 1.3) + REACTION_BURST_STAGGER_MS * REACTION_BURST_COUNT;

const hashString = (id: string) => {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/** Детерминированный [0..1) из хэша — одинаковый id даёт одинаковый полёт на всех клиентах */
const unit = (hash: number, salt: number) => {
  const mixed = Math.imul(hash ^ (salt * 0x9e3779b9), 0x85ebca6b) >>> 0;
  return (mixed % 10_000) / 10_000;
};

const getFlightParams = (id: string, viewportHeight: number) => {
  const hash = hashString(id);

  const leftPx = Math.round(LEFT_EDGE_PX + unit(hash, 1) * MAX_SPREAD_PX);
  const swayA = Math.round(unit(hash, 2) * 48 - 24);
  const swayB = Math.round(unit(hash, 3) * 56 - 28);
  const travelRatio = 0.38 + unit(hash, 4) * 0.4; // 38–78% высоты окна
  const durationFactor = 0.85 + unit(hash, 5) * 0.35; // 85–120% базовой длительности
  const delayJitterSec = unit(hash, 6) * 0.18;
  const rotate = Math.round(unit(hash, 7) * 24 - 12);
  const scale = 0.85 + unit(hash, 8) * 0.35;
  const startY = Math.round(8 + unit(hash, 9) * 24);

  return {
    leftPx,
    swayKeyframes: [0, swayA, swayB, swayA * 0.35],
    travelY: -Math.round(viewportHeight * travelRatio),
    durationSec: (FLOATING_REACTION_LIFETIME_MS / 1000) * durationFactor,
    delayJitterSec,
    rotate,
    scale,
    startY,
  };
};

/**
 * Оверлей всплывающих реакций поверх сетки видео. Монтируется один раз в ActiveRoom
 * (полноэкранный режим); заодно держит примонтированным useReactions, чтобы слушатель
 * DataChannel был активен, пока идёт звонок.
 */
export const ReactionsOverlay = () => {
  useReactions();

  const floatingReactions = useReactionsStore((s) => s.floatingReactions);
  const removeFloatingReaction = useReactionsStore((s) => s.removeFloatingReaction);

  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Убираем просроченные реакции (например, оставшиеся в сторе после прошлого захода в звонок)
  useEffect(() => {
    const now = Date.now();
    const { floatingReactions: current, removeFloatingReaction: remove } =
      useReactionsStore.getState();
    current.forEach((reaction) => {
      if (now - reaction.timestamp >= MAX_VISIBLE_MS) {
        remove(reaction.id);
      }
    });
  }, []);

  // Снимаем реакцию по таймеру — onAnimationComplete у framer-motion при пачке ререндеров
  // срабатывал слишком рано и мгновенно чистил стор (реакции «не было видно»).
  useEffect(() => {
    if (floatingReactions.length === 0) return undefined;

    const timers = floatingReactions.map((reaction) => {
      const flight = getFlightParams(reaction.id, viewportHeight);
      const burstIndexMatch = /-(\d+)$/.exec(reaction.id);
      const burstIndex = burstIndexMatch ? Number(burstIndexMatch[1]) : 0;
      const delayMs = burstIndex * REACTION_BURST_STAGGER_MS + flight.delayJitterSec * 1000;
      const totalMs = delayMs + flight.durationSec * 1000 + 50;
      const elapsed = Date.now() - reaction.timestamp;
      const remaining = Math.max(0, totalMs - elapsed);

      return window.setTimeout(() => {
        removeFloatingReaction(reaction.id);
      }, remaining);
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [floatingReactions, removeFloatingReaction, viewportHeight]);

  const now = Date.now();
  const activeReactions = floatingReactions.filter(
    (reaction) => now - reaction.timestamp < MAX_VISIBLE_MS,
  );

  // В пачке от одного отправителя подписываем только один смайлик (последний активный)
  const labeledSenderIds = new Set<string>();
  const labeledIds = new Set<string>();
  for (let i = activeReactions.length - 1; i >= 0; i -= 1) {
    const reaction = activeReactions[i];
    if (!labeledSenderIds.has(reaction.senderId)) {
      labeledSenderIds.add(reaction.senderId);
      labeledIds.add(reaction.id);
    }
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-52 overflow-hidden">
      <AnimatePresence>
        {activeReactions.map((reaction) => {
          const flight = getFlightParams(reaction.id, viewportHeight);
          const showSenderName = labeledIds.has(reaction.id);
          const burstIndexMatch = /-(\d+)$/.exec(reaction.id);
          const burstIndex = burstIndexMatch ? Number(burstIndexMatch[1]) : 0;
          const delaySec = (burstIndex * REACTION_BURST_STAGGER_MS) / 1000 + flight.delayJitterSec;

          return (
            <motion.div
              key={reaction.id}
              initial={{
                opacity: 0,
                y: flight.startY,
                x: 0,
                scale: 0.5,
                rotate: flight.rotate * 0.35,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: flight.travelY,
                x: flight.swayKeyframes,
                scale: flight.scale,
                rotate: flight.rotate,
              }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{
                duration: flight.durationSec,
                delay: delaySec,
                ease: 'easeOut',
                opacity: { times: [0, 0.08, 0.72, 1], duration: flight.durationSec },
                x: { duration: flight.durationSec, ease: 'easeInOut' },
                rotate: { duration: flight.durationSec, ease: 'easeOut' },
              }}
              className="absolute bottom-10 flex flex-col items-center gap-1 will-change-transform"
              style={{ left: flight.leftPx }}
            >
              <EmojiGlyph emoji={reaction.emoji} className="h-11 w-11 drop-shadow-lg" />
              {showSenderName && (
                <span className="bg-background-surface/80 text-text-primary max-w-[100px] truncate rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur">
                  {reaction.senderName}
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
