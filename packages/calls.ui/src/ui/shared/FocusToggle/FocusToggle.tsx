import { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import {
  FocusToggleIcon,
  LayoutContext,
  useFocusToggle,
  useMaybeTrackRefContext,
} from '@livekit/components-react';
import { Participant } from 'livekit-client';
import React from 'react';
import { cn } from '@xipkg/utils';

export type FocusTogglePropsT = {
  trackRef?: TrackReferenceOrPlaceholder;
  /** @deprecated This parameter will be removed in a future version use `trackRef` instead. */
  participant?: Participant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Стили кнопки фокуса — Tailwind; в хосте нужен scan @xipkg/calls-ui (см. xi-tutor-local-link.md). */
const focusToggleClassName =
  'rounded-lg absolute top-2 right-2 z-10 box-border flex h-6 w-6 min-h-6 min-w-6 cursor-pointer appearance-none items-center justify-center border-none bg-gray-0/80 p-0 opacity-80 transition-opacity lg:opacity-0 lg:group-hover:opacity-80';

export const FocusToggle = ({ trackRef, ...props }: FocusTogglePropsT) => {
  const trackRefFromContext = useMaybeTrackRefContext();

  const { mergedProps, inFocus } = useFocusToggle({
    trackRef: trackRef ?? trackRefFromContext,
    props,
  });

  return (
    <LayoutContext.Consumer>
      {(layoutContext) => {
        if (!layoutContext) return null;

        // style из LiveKit не используем — оформление через Tailwind
        const { className, style, ...buttonProps } = mergedProps;
        void style;

        return (
          <button type="button" className={cn(focusToggleClassName, className)} {...buttonProps}>
            {props.children
              ? props.children
              : !inFocus && <FocusToggleIcon className="fill-gray-100" />}
          </button>
        );
      }}
    </LayoutContext.Consumer>
  );
};
