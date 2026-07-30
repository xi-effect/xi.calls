import { useState } from 'react';
import { Button } from '@xipkg/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@xipkg/dropdown';
import { Emotions } from '@xipkg/icons';
import { EmojiGlyph } from '@xipkg/calls-ui';
import { cn } from '@xipkg/utils';
import { useReactions } from '../hooks';
import { REACTION_OPTIONS } from '../constants';

type ReactionButtonPropsT = {
  className?: string;
};

export const ReactionButton = ({ className }: ReactionButtonPropsT) => {
  const [open, setOpen] = useState(false);
  const { sendReaction, isOnCooldown } = useReactions();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="none"
              className={cn(
                'bg-background-surface hover:bg-background-page text-text-primary relative m-0 rounded-xl p-0',
                !className && 'h-10 w-10',
                open && 'text-text-link',
                className,
              )}
              data-umami-event="call-open-reactions"
            >
              <Emotions className={cn('h-6 w-6', open ? 'fill-icon-brand' : 'fill-icon-primary')} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          Реакции
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="grid w-auto grid-cols-4 gap-1 p-2"
      >
        {REACTION_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.emoji}
            aria-label={option.label}
            title={option.label}
            disabled={isOnCooldown}
            // Не закрываем пикер — можно сразу отправить несколько реакций подряд
            onSelect={(event) => {
              event.preventDefault();
              sendReaction(option.emoji);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl p-0"
            data-umami-event="call-send-reaction"
          >
            <EmojiGlyph emoji={option.emoji} className="h-6 w-6" aria-label={option.label} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
