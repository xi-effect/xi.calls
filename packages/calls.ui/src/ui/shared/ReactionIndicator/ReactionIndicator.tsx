import { useEffect } from 'react';
import { Participant } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactionsStore, PARTICIPANT_REACTION_TTL_MS } from '@xipkg/calls-store';
import { EmojiGlyph } from '../EmojiGlyph';

type ReactionIndicatorPropsT = {
  participant: Participant;
};

/**
 * Короткая метка последней реакции участника на его плитке (бейдж, как у RaisedHandIndicator,
 * но эфемерный — исчезает через PARTICIPANT_REACTION_TTL_MS после получения реакции).
 * Специально не зависит от пакета @xipkg/calls-reactions (только от calls.store), чтобы не
 * создавать обратную зависимость calls.ui -> calls.reactions.
 */
export const ReactionIndicator = ({ participant }: ReactionIndicatorPropsT) => {
  const reaction = useReactionsStore((s) => s.participantReactions[participant.identity]);
  const clearParticipantReaction = useReactionsStore((s) => s.clearParticipantReaction);

  useEffect(() => {
    if (!reaction) return;

    const remainingMs = reaction.timestamp + PARTICIPANT_REACTION_TTL_MS - Date.now();

    if (remainingMs <= 0) {
      clearParticipantReaction(participant.identity);
      return;
    }

    const timeoutId = setTimeout(() => {
      clearParticipantReaction(participant.identity);
    }, remainingMs);

    return () => clearTimeout(timeoutId);
  }, [reaction, participant.identity, clearParticipantReaction]);

  return (
    <AnimatePresence>
      {reaction && (
        <motion.div
          key={`${reaction.emoji}-${reaction.timestamp}`}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="bg-background-surface/80 flex h-8 w-8 items-center justify-center rounded-2xl"
        >
          <EmojiGlyph emoji={reaction.emoji} className="h-5 w-5" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
