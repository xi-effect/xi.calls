import { useAudioWaveform } from '@livekit/components-react';
import type { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';
import { Participant, Track } from 'livekit-client';
import { ChevronBottom, MicrophoneOff, RedLine } from '@xipkg/icons';
import { Button } from '@xipkg/button';
import { ParticipantName, TrackMutedIndicator, RaisedHandIndicator } from '@xipkg/calls-ui';
import { cn } from '@xipkg/utils';

type CompactCallCollapsedBarProps = {
  participant: Participant | null;
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | null;
  onExpand: () => void;
  className?: string;
};

export function CompactCallCollapsedBar({
  participant,
  audioTrack,
  onExpand,
  className,
}: CompactCallCollapsedBarProps) {
  const { bars } = useAudioWaveform(audioTrack ?? undefined, {
    barCount: 24,
    volMultiplier: 4,
    updateInterval: 50,
  });
  return (
    <div
      className={cn(
        'bg-action-secondary-background-pressed flex items-center gap-2 rounded-2xl px-2 py-2 shadow-lg',
        className,
      )}
    >
      {/* Тот же блок, что и в плитке участника ВКС: микрофон + имя */}
      <div className="bg-background-surface/80 flex h-6 max-w-[45%] min-w-0 shrink gap-1.5 rounded-lg px-1.5 py-1 backdrop-blur">
        {participant ? (
          <>
            <TrackMutedIndicator
              trackRef={{
                participant,
                source: Track.Source.Microphone,
              }}
              show="muted"
              style={{ marginRight: '0.45rem', background: 'transparent' }}
            />
            <span className="flex min-w-0 truncate">
              <ParticipantName participant={participant} />
            </span>
          </>
        ) : (
          <>
            <div className="relative w-3 shrink-0">
              <MicrophoneOff className="fill-icon-primary absolute h-4 w-4" />
              <RedLine className="fill-icon-danger absolute h-4 w-4" />
            </div>
            <span className="text-xs-base-size text-text-primary leading-[16px]">
              Нет участников
            </span>
          </>
        )}
      </div>
      {participant && <RaisedHandIndicator participant={participant ?? 'unknown'} />}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 py-1">
        {bars.length > 0 ? (
          <div className="flex h-4 items-end justify-center gap-0.5">
            {bars.map((h, i) => (
              <div
                key={i}
                className="bg-action-primary-background-default w-0.5 min-w-[2px] rounded-full transition-all duration-75"
                style={{ height: `${Math.min(100, Math.max(20, h * 150))}%` }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-action-primary-background-default h-2 w-12 rounded-full" />
        )}
      </div>
      <Button
        size="icon"
        variant="none"
        onClick={onExpand}
        className="bg-action-primary-background-pressed hover:bg-action-primary-background-pressed/80 text-text-on-accent h-8 w-8 shrink-0 rounded-xl p-0"
        aria-label="Развернуть"
      >
        <ChevronBottom className="fill-action-primary-text h-4 w-4" />
      </Button>
    </div>
  );
}
