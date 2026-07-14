import { useEffect, useRef } from 'react';
import { LocalVideoTrack } from 'livekit-client';
import { BackgroundProcessor, supportsBackgroundProcessors } from '@livekit/track-processors';
import { useUserChoicesStore } from '@xipkg/calls-store';

export function useVideoBlur(videoTrack: LocalVideoTrack | null | undefined) {
  const blurEnabled = useUserChoicesStore((state) => state.blurEnabled);
  const processorRef = useRef<ReturnType<typeof BackgroundProcessor> | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!videoTrack || !supportsBackgroundProcessors()) {
      // Останавливаем процессор, если трек или поддержка отсутствуют
      if (processorRef.current && videoTrack) {
        videoTrack.stopProcessor().catch(console.error);
        processorRef.current = null;
      }
      return;
    }

    const applyBlur = async () => {
      // Предотвращаем параллельные вызовы

      try {
        // Сначала останавливаем старый процессор, если он есть
        if (processorRef.current) {
          await videoTrack.stopProcessor();
          if (cancelled) return;
          processorRef.current = null;
        }

        if (blurEnabled) {
          const processor = BackgroundProcessor({
            mode: 'background-blur',
            blurRadius: 25,
          } as Parameters<typeof BackgroundProcessor>[0]);

          await videoTrack.setProcessor(processor);
          if (cancelled) {
            // Пока ждали setProcessor, эффект уже "ушёл" — откатываем,
            // чтобы не оставить процессор, который никто не запрашивал.
            await videoTrack.stopProcessor().catch(console.error);
            return;
          }
          processorRef.current = processor;
        } else {
          // Если блюр выключен, убеждаемся, что процессор остановлен
          await videoTrack.stopProcessor();
          if (cancelled) return;
          processorRef.current = null;
        }
      } catch (error) {
        console.error('Возникла ошибка, связанная с размытием фона:', error);
        if (!cancelled) {
          processorRef.current = null;
        }
      }
    };

    applyBlur();

    return () => {
      cancelled = true;
      if (videoTrack && processorRef.current) {
        videoTrack.stopProcessor().catch(console.error);
        processorRef.current = null;
      }
    };
  }, [videoTrack, blurEnabled]);
}
