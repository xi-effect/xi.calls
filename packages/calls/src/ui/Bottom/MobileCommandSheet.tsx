import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Track } from 'livekit-client';
import { supportsScreenSharing } from '@livekit/components-core';
import { useDisconnectButton, useRoomContext, useTrackToggle } from '@livekit/components-react';
import {
  Chat,
  Endcall,
  MenuDots,
  Settings as SettingsIcon,
  Screenshare,
  WhiteBoard,
} from '@xipkg/icons';
import { Button } from '@xipkg/button';
import {
  Sheet,
  SheetContent,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from '@xipkg/sheet';
import { EmojiGlyph, WhiteboardsModal } from '@xipkg/calls-ui';
import { useCallStore } from '@xipkg/calls-store';
import { useChat } from '@xipkg/calls-chat';
import { REACTION_OPTIONS, useReactions } from '@xipkg/calls-reactions';
import { cn } from '@xipkg/utils';
import { useTranslation } from 'react-i18next';

const SWIPE_CLOSE_PX = 56;

type MobileCommandSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewIcon: ReactNode;
  viewDisabled: boolean;
  viewLayout: string;
  onToggleView: () => void;
  showBoard: boolean;
  showBackToBoard: boolean;
  onBackToBoard: () => void;
  onOpenSettings: () => void;
};

const rowClassName =
  'bg-background-page text-text-primary active:bg-background-subtle m-0 flex h-14 w-full appearance-none items-center gap-3 rounded-2xl border-0 px-4 text-left';

export const MobileCommandSheet = ({
  open,
  onOpenChange,
  viewIcon,
  viewDisabled,
  viewLayout,
  onToggleView,
  showBoard,
  showBackToBoard,
  onBackToBoard,
  onOpenSettings,
}: MobileCommandSheetProps) => {
  const { t } = useTranslation('calls');
  const updateStore = useCallStore((state) => state.updateStore);
  const isNote = useCallStore((state) => state.activeMaterialKind) === 'note';
  const { toggleChat } = useChat();
  const { sendReaction, isOnCooldown } = useReactions();
  const { buttonProps } = useDisconnectButton({});
  const [boardOpen, setBoardOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const room = useRoomContext();

  const screenShareSupported = supportsScreenSharing();
  const { toggle: toggleScreenShare, enabled: screenShareEnabled } = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: { audio: true, selfBrowserSurface: 'include' },
  });

  const stopScreenShare = () => {
    room.localParticipant.getTrackPublications().forEach((publication) => {
      if (
        publication.source === Track.Source.ScreenShare ||
        publication.source === Track.Source.ScreenShareAudio
      ) {
        publication.track?.mediaStreamTrack?.stop();
      }
    });
    void toggleScreenShare(false);
  };

  const close = () => onOpenChange(false);

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null) return;
    setDragY(Math.max(0, event.clientY - dragStartY.current));
  };

  const onHandlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null) return;
    const distance = event.clientY - dragStartY.current;
    dragStartY.current = null;
    setDragY(0);
    if (distance > SWIPE_CLOSE_PX) close();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="none"
            className="bg-background-surface border-border-default flex h-12 w-full items-center justify-center rounded-2xl border p-0"
            aria-label={t('bottomBar.commands')}
            data-umami-event="call-open-commands"
          >
            <MenuDots className="fill-icon-primary" />
          </Button>
        </SheetTrigger>
        <SheetPortal>
          <SheetOverlay />
        </SheetPortal>
        <SheetContent
          side="bottom"
          className="bg-background-surface max-h-[85dvh] overflow-y-auto rounded-t-3xl border-none px-2 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]"
          style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        >
          <div
            className="flex cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
            <div className="bg-border-default h-1 w-10 rounded-full" />
          </div>
          <SheetTitle className="sr-only">{t('bottomBar.commands')}</SheetTitle>
          <div className="flex flex-col gap-2 px-2 pb-2">
            <div className="bg-background-page rounded-2xl px-2 py-2">
              <p className="text-text-secondary px-2 pb-2 text-xs">{t('bottomBar.reactions')}</p>
              <div className="grid grid-cols-6 gap-1">
                {REACTION_OPTIONS.map((option) => (
                  <button
                    key={option.emoji}
                    type="button"
                    aria-label={t(option.labelKey)}
                    title={t(option.labelKey)}
                    disabled={isOnCooldown}
                    className="flex h-10 w-full items-center justify-center rounded-xl bg-transparent disabled:opacity-40"
                    data-umami-event="call-send-reaction"
                    onClick={() => sendReaction(option.emoji)}
                  >
                    <EmojiGlyph
                      emoji={option.emoji}
                      className="h-6 w-6"
                      aria-label={t(option.labelKey)}
                    />
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className={cn(rowClassName, 'disabled:opacity-50')}
              disabled={viewDisabled}
              data-umami-event="call-toggle-layout"
              data-umami-event-layout={viewLayout}
              onClick={() => {
                close();
                onToggleView();
              }}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">{viewIcon}</span>
              <span className="truncate text-base">{t('upBar.view')}</span>
            </button>
            {screenShareSupported ? (
              <button
                type="button"
                className={rowClassName}
                onClick={() => {
                  close();
                  if (screenShareEnabled) stopScreenShare();
                  else void toggleScreenShare(true);
                }}
              >
                <Screenshare
                  className={cn(
                    'h-6 w-6 shrink-0',
                    screenShareEnabled ? 'fill-status-success-text' : 'fill-icon-primary',
                  )}
                />
                <span className="truncate text-base">
                  {screenShareEnabled ? t('bottomBar.stopScreenShare') : t('bottomBar.shareScreen')}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className={rowClassName}
              onClick={() => {
                close();
                toggleChat();
              }}
            >
              <Chat className="fill-icon-primary h-6 w-6 shrink-0" />
              <span className="truncate text-base">{t('bottomBar.chat')}</span>
            </button>
            <button
              type="button"
              className={rowClassName}
              onClick={() => {
                close();
                onOpenSettings();
              }}
            >
              <SettingsIcon className="fill-icon-primary h-6 w-6 shrink-0" />
              <span className="truncate text-base">{t('settings.title')}</span>
            </button>
            {showBoard ? (
              <button
                type="button"
                className={rowClassName}
                onClick={() => {
                  close();
                  setBoardOpen(true);
                }}
              >
                <WhiteBoard className="fill-icon-primary h-6 w-6 shrink-0" />
                <span className="truncate text-base">{t('bottomBar.board')}</span>
              </button>
            ) : null}
            {showBackToBoard ? (
              <button
                type="button"
                className={rowClassName}
                onClick={() => {
                  close();
                  onBackToBoard();
                }}
              >
                <WhiteBoard className="fill-icon-primary h-6 w-6 shrink-0" />
                <span className="truncate text-base">
                  {t(isNote ? 'bottomBar.toNote' : 'bottomBar.toBoard')}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className={cn(rowClassName, 'text-text-danger')}
              disabled={buttonProps.disabled}
              onClick={() => {
                close();
                buttonProps.onClick?.();
                updateStore('isStarted', false);
                updateStore('connect', false);
              }}
            >
              <Endcall className="fill-icon-danger h-6 w-6 shrink-0" />
              <span className="truncate text-base">{t('bottomBar.leave')}</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
      {boardOpen ? <WhiteboardsModal open onOpenChange={setBoardOpen} /> : null}
    </>
  );
};
