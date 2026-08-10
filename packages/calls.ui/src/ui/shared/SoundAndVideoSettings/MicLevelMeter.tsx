import { useEffect, useRef, useState } from 'react';
import type { LocalAudioTrack } from 'livekit-client';
import { cn } from '@xipkg/utils';

type MicLevelMeterProps = {
  track?: LocalAudioTrack;
  active: boolean;
  className?: string;
  /** Чувствительность микрофона 0..1 — масштабирует индикатор при проверке. */
  sensitivity?: number;
};

const BAR_COUNT = 16;
/** RMS ниже порога = тишина (глушим шум пола / WebAudio destination). */
const NOISE_FLOOR = 0.02;
const DISPLAY_GAIN = 1.6;

function rmsFromTimeDomain(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

function toBars(rms: number, sensitivity: number): number {
  const effective = rms * Math.max(0, Math.min(1, sensitivity));
  if (effective < NOISE_FLOOR) return 0;
  const normalized = (effective - NOISE_FLOOR) / (1 - NOISE_FLOOR);
  return Math.round(Math.min(1, Math.sqrt(normalized) * DISPLAY_GAIN) * BAR_COUNT);
}

export const MicLevelMeter = ({
  track,
  active,
  className,
  sensitivity = 1,
}: MicLevelMeterProps) => {
  const [filled, setFilled] = useState(0);
  const filledRef = useRef(0);
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;

  useEffect(() => {
    if (!active || !track) {
      filledRef.current = 0;
      setFilled(0);
      return;
    }

    const mediaTrack = track.mediaStreamTrack;
    if (!mediaTrack || mediaTrack.readyState === 'ended') {
      setFilled(0);
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    let cancelled = false;
    let rafId: number | null = null;
    let ctx: AudioContext | null = null;

    const start = async () => {
      ctx = new AudioContextCtor();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (cancelled || !ctx) return;

      const source = ctx.createMediaStreamSource(new MediaStream([mediaTrack]));
      const analyser = ctx.createAnalyser();
      // Сильное сглаживание на стороне Web Audio — основной анти-«дребезг»
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.92;
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (cancelled || !ctx) return;
        analyser.getByteTimeDomainData(data);
        const bars = toBars(rmsFromTimeDomain(data), sensitivityRef.current);
        if (bars !== filledRef.current) {
          filledRef.current = bars;
          setFilled(bars);
        }
        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
    };

    void start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      void ctx?.close().catch(() => undefined);
      filledRef.current = 0;
      setFilled(0);
    };
  }, [active, track]);

  return (
    <div className={cn('flex h-2 items-end gap-0.5', className)} aria-hidden={!active}>
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <div
          key={index}
          className={cn(
            'bg-gray-20 h-full flex-1 rounded-sm transition-colors duration-200',
            index < filled && 'bg-[var(--xi-brand-80)]',
          )}
        />
      ))}
    </div>
  );
};
