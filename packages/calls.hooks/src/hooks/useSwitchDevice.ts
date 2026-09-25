import { useCallback, useEffect, useRef, useState } from 'react';
import type { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { queuedSetDeviceId } from './trackDeviceSwitchQueue';

type UseSwitchDeviceParams = {
  track?: LocalAudioTrack | LocalVideoTrack;
  /**
   * Сырое значение из `useMediaDeviceSelect` — по нему узнаём, что комната
   * подтвердила переключение (`RoomEvent.ActiveDeviceChanged`), и можно
   * сбросить `pendingDeviceId`.
   */
  activeDeviceId?: string;
  saveDeviceId: (deviceId: string) => void;
  saveEnabled: (enabled: boolean) => void;
  errorMessage: string;
};

type UseSwitchDeviceResult = {
  switchDeviceHandler: (deviceId: string) => Promise<void>;
  /**
   * Последний `deviceId`, успешно переданный в `track.setDeviceId()`, пока
   * переключение не подтверждено. Подтверждение приходит не мгновенно даже в
   * обычном случае — `Room.onLocalTrackRestarted` сам ждёт
   * `track.getDeviceId()`, прежде чем заэмитить `RoomEvent.ActiveDeviceChanged`,
   * — а если трек в момент выбора замьючен, restart и вовсе откладывается до
   * размьюта. `useResolvedActiveDeviceId` использует это значение, чтобы не
   * показывать устаревшее устройство в этом окне.
   */
  pendingDeviceId: string | undefined;
};

/**
 * Переключает микрофон/камеру на выбранное устройство
 * (`track.setDeviceId({exact})`) и отслеживает переключение до подтверждения
 * комнатой, отдавая промежуточное состояние как `pendingDeviceId`.
 *
 * Гарантии:
 * - `saveDeviceId`/`saveEnabled` вызываются только после подтверждённого
 *   успеха `setDeviceId()` (включая его булев результат, не только отсутствие
 *   исключения) — иначе можно запомнить нерабочее устройство.
 * - Вызовы `setDeviceId()` на одном треке сериализованы через
 *   `queuedSetDeviceId` — без этого быстрое переключение A→B может физически
 *   оставить трек на A, см. `trackDeviceSwitchQueue.ts`.
 * - Устаревший ответ не перезаписывает состояние: `requestIdRef` отбрасывает
 *   результат более раннего `switchDeviceHandler()`, если пользователь уже
 *   выбрал другое устройство.
 * - `pendingDeviceId` держится, пока `activeDeviceId` не подтвердит именно
 *   его; если подтверждения не будет, `useResolvedActiveDeviceId` всё равно
 *   перестанет его показывать, как только трек сам сообщит другое устройство.
 *
 * @param params.track - трек, на котором меняем устройство (микрофон/камера).
 * @param params.activeDeviceId - сырое `activeDeviceId` из `useMediaDeviceSelect`, см. описание поля типа.
 * @param params.saveDeviceId - персистентно сохранить выбранный `deviceId`.
 * @param params.saveEnabled - синхронизировать persisted "включено/выключено" с реальным состоянием трека после переключения.
 * @param params.errorMessage - сообщение для `console.error` при неудачном переключении.
 * @returns `switchDeviceHandler` - коллбэк для передачи выбранного `deviceId`; `pendingDeviceId` - см. описание поля типа.
 */
export const useSwitchDevice = ({
  track,
  activeDeviceId,
  saveDeviceId,
  saveEnabled,
  errorMessage,
}: UseSwitchDeviceParams): UseSwitchDeviceResult => {
  const [pendingDeviceId, setPendingDeviceId] = useState<string | undefined>(undefined);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (pendingDeviceId && activeDeviceId === pendingDeviceId) {
      setPendingDeviceId(undefined);
    }
  }, [activeDeviceId, pendingDeviceId]);

  const switchDeviceHandler = useCallback(
    async (deviceId: string) => {
      const requestId = ++requestIdRef.current;
      try {
        if (track) {
          // Сериализация вызовов на треке — см. trackDeviceSwitchQueue.ts.
          const succeeded = await queuedSetDeviceId(track, deviceId);
          if (!succeeded) {
            throw new Error(`Device did not switch to ${deviceId}`);
          }
        }
        // Пока ждали, мог прийти более новый выбор — не затираем его
        // результатом устаревшего запроса.
        if (requestId !== requestIdRef.current) return;
        if (track) {
          saveEnabled(!track.isMuted);
        }
        saveDeviceId(deviceId);
        setPendingDeviceId(deviceId);
      } catch (err) {
        if (requestId === requestIdRef.current) {
          console.error(errorMessage, err);
        }
      }
    },
    [track, saveDeviceId, saveEnabled, errorMessage],
  );

  return { switchDeviceHandler, pendingDeviceId };
};
