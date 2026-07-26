import { useEffect } from 'react';
import { LocalVideoTrack } from 'livekit-client';
import { BackgroundProcessor, supportsBackgroundProcessors } from '@livekit/track-processors';
import { useUserChoicesStore } from '@xipkg/calls-store';

export function useVideoBlur(videoTrack: LocalVideoTrack | null | undefined) {
  const blurEnabled = useUserChoicesStore((state) => state.blurEnabled);

  useEffect(() => {
    if (!videoTrack || !supportsBackgroundProcessors()) {
      return;
    }

    let cancelled = false;

    const applyBlur = async () => {
      // Смотрим на фактическое состояние САМОГО трека (videoTrack.getProcessor()),
      // а не на свой ref: раньше ref переживал смену videoTrack (например, при
      // переключении full/compact — см. ActiveRoom.tsx) и хук на КАЖДОЙ такой смене
      // безусловно дёргал stopProcessor()/setProcessor(), даже когда блюр никогда не
      // включался и трогать было нечего.
      //
      // videoTrack.stopProcessor()/setProcessor() всегда вызывают
      // sender.setParameters() (LocalVideoTrack.refreshSenderEncodings), а это может
      // столкнуться по времени с параллельной renegotiation на том же publisher-
      // соединении (например, стартом демонстрации экрана). Chrome в такой гонке рвёт
      // ВЕСЬ SDP-ответ с `ERROR_CONTENT: Failed to set remote video description send
      // parameters for m-section` — и трек демонстрации экрана так и не долетает до
      // SFU, хотя локально всё выглядит как будто включилось. Поэтому трогаем
      // процессор только когда состояние реально должно измениться.
      const hasProcessor = Boolean(videoTrack.getProcessor());
      if (blurEnabled === hasProcessor) {
        return;
      }

      try {
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
          }
        } else {
          await videoTrack.stopProcessor();
        }
      } catch (error) {
        console.error('Возникла ошибка, связанная с размытием фона:', error);
      }
    };

    applyBlur();

    return () => {
      cancelled = true;
      // Останавливаем процессор при отвязке/размонтировании только если он
      // действительно стоит на этом треке — тот же принцип «не дёргаем sender
      // без необходимости».
      if (videoTrack.getProcessor()) {
        videoTrack.stopProcessor().catch(console.error);
      }
    };
  }, [videoTrack, blurEnabled]);
}
