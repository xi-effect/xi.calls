import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';
import { Recording3 } from '@xipkg/icons';
import { cn } from '@xipkg/utils';
import { useLessonRecordingControlsStore } from '@xipkg/calls-store';
import { useConferenceAudioSources } from '@xipkg/calls-hooks';
import { useCalls } from '@xipkg/calls-providers';
import { useBuiltinLessonRecording } from './builtinLessonRecording';

const HOVER_DELAY_MS = 800;

function isDesktopRecordingBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const desktop = window.matchMedia(
    '(min-width: 960px) and (hover: hover) and (pointer: fine)',
  ).matches;
  const canCapture =
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator.mediaDevices?.getDisplayMedia === 'function';
  return desktop && canCapture;
}

function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(rest)}`;
  return `${pad(minutes)}:${pad(rest)}`;
}

export function LessonRecordButton({ className }: { className?: string }) {
  const { t } = useTranslation('calls');
  const hosted = useLessonRecordingControlsStore((state) => state.hosted);
  const hostVisible = useLessonRecordingControlsStore((state) => state.visible);
  const hostPhase = useLessonRecordingControlsStore((state) => state.phase);
  const hostStartedAt = useLessonRecordingControlsStore((state) => state.startedAt);
  const hostStart = useLessonRecordingControlsStore((state) => state.start);
  const hostStop = useLessonRecordingControlsStore((state) => state.stop);
  const { auth } = useCalls();
  const { data: user } = auth.useCurrentUser();
  const isTutor = user?.default_layout === 'tutor';
  const conference = useConferenceAudioSources();
  const builtin = useBuiltinLessonRecording(!hosted);
  const phase = hosted ? hostPhase : builtin.phase;
  const startedAt = hosted ? hostStartedAt : builtin.startedAt;
  const start = hosted ? hostStart : builtin.start;
  const stop = hosted ? hostStop : builtin.stop;
  const [supported, setSupported] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const recording = phase === 'recording' || phase === 'stopping';
  const busy = phase === 'starting' || phase === 'stopping';

  useEffect(() => {
    const query = window.matchMedia('(min-width: 960px) and (hover: hover) and (pointer: fine)');
    const update = () => setSupported(isDesktopRecordingBrowser());
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!hovering || !recording) {
      setPanelOpen(false);
      return;
    }
    const id = window.setTimeout(() => setPanelOpen(true), HOVER_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [hovering, recording]);

  useEffect(() => {
    if (!panelOpen || startedAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [panelOpen, startedAt]);

  const visible = hosted ? hostVisible : Boolean(isTutor && conference.connected);
  if (!visible || !supported) return null;

  const elapsed = startedAt == null ? 0 : Math.max(0, Math.round((now - startedAt) / 1000));
  const button = (
    <button
      type="button"
      disabled={busy}
      aria-pressed={recording}
      aria-label={recording ? t('bottomBar.stopRecording') : t('bottomBar.recordLesson')}
      onClick={() => {
        if (recording) stop();
        else start();
      }}
      className={cn(
        'relative m-0 flex h-10 w-10 items-center justify-center rounded-xl p-0 transition-colors disabled:opacity-60',
        recording
          ? 'bg-status-error-background hover:bg-status-error-background'
          : 'bg-background-surface hover:bg-background-page',
        className,
      )}
    >
      <Recording3 className={cn('h-6 w-6', recording ? 'fill-red-500' : 'fill-icon-primary')} />
    </button>
  );

  if (!recording) {
    return (
      <Tooltip delayDuration={1000}>
        <TooltipTrigger className="bg-transparent" asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {t('bottomBar.recordLesson')}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {panelOpen ? (
        <div className="bg-background-surface border-border-default pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium whitespace-nowrap shadow-lg">
          <span className="size-2.5 shrink-0 rounded-full bg-red-500" aria-hidden />
          {t('bottomBar.recordingNow')} · {formatClock(elapsed)}
        </div>
      ) : null}
      {button}
    </div>
  );
}
