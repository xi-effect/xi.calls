import { useEffect, useState } from 'react';
import type { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';

type UseResolvedActiveDeviceIdOptions = {
  /** Живой трек — чтобы спросить реальное устройство напрямую (`track.getDeviceId()`), если activeDeviceId ещё не подтверждён. */
  track?: LocalAudioTrack | LocalVideoTrack;
  /**
   * Устройство, которое пользователь только что выбрал через `useSwitchDevice`
   * в этом же компоненте, но переключение ещё не подтверждено ни комнатой, ни
   * самим треком.
   */
  pendingDeviceId?: string;
  /**
   * Мгновенно доступное значение на случай, если ни `activeDeviceId`, ни
   * `track` ничего не подтвердили (например, у `audiooutput` вовсе нет
   * track) — вместо произвольного первого устройства из списка.
   */
  fallbackDeviceId?: string;
};

/**
 * Резолвит реальный активный `deviceId` для отображения (галочка в
 * `DeviceHoverMenu`, выбранное значение в `DeviceSelector`).
 *
 * `useMediaDeviceSelect` инициализирует `activeDeviceId` литералом `"default"`
 * до первого события об активном устройстве от комнаты. У аудио такой id
 * часто действительно совпадает с реальным устройством (браузер сам добавляет
 * `"default"`-запись) — но для видео такой записи не бывает никогда, и подбор
 * по `activeDeviceId` молча проваливается.
 *
 * Приоритет разрешения:
 * 1. `pendingDeviceId`, пока он не подтверждён ни `activeDeviceId`, ни самим
 *    треком — актуально не только пока трек замьючен (restart отложен
 *    целиком), но и в обычном случае: подтверждение от комнаты приходит
 *    асинхронно даже когда restart уже фактически случился
 *    (`Room.onLocalTrackRestarted` сам ждёт `track.getDeviceId()`, прежде чем
 *    заэмитить `ActiveDeviceChanged`). Само подтверждение и сброс — на стороне
 *    `useSwitchDevice`.
 * 2. `activeDeviceId`, если он ссылается на реальное устройство из списка.
 * 3. Устройство, о котором сообщил сам трек через `track.getDeviceId()` (тот
 *    же приём, что и в `useResolveInitiallyDefaultDeviceId`).
 * 4. `fallbackDeviceId`, если он есть в списке устройств.
 * 5. Первое устройство из списка — последний резерв.
 *
 * @param devices - список устройств нужного kind (из `useMediaDeviceSelect`).
 * @param activeDeviceId - активное устройство по мнению комнаты (из `useMediaDeviceSelect`).
 * @param options - `track` / `pendingDeviceId` / `fallbackDeviceId`, см. описания полей типа.
 */
export const useResolvedActiveDeviceId = (
  devices: MediaDeviceInfo[] | undefined,
  activeDeviceId: string | undefined,
  options: UseResolvedActiveDeviceIdOptions = {},
): string | undefined => {
  const { track, pendingDeviceId, fallbackDeviceId } = options;
  const [trackDeviceId, setTrackDeviceId] = useState<string | undefined>(undefined);
  const matchesRealDevice = !!devices?.some((device) => device.deviceId === activeDeviceId);

  useEffect(() => {
    if (matchesRealDevice || !track) {
      setTrackDeviceId(undefined);
      return;
    }
    let cancelled = false;
    track.getDeviceId().then((id) => {
      if (!cancelled) setTrackDeviceId(id);
    });
    return () => {
      cancelled = true;
    };
    // pendingDeviceId в зависимостях — не для сравнения значений, а чтобы
    // принудительно перезапросить getDeviceId() после каждого нового выбора:
    // restart() может заменить MediaStreamTrack внутри того же объекта
    // LocalTrack, не меняя его identity, так что одного track недостаточно.
  }, [matchesRealDevice, track, pendingDeviceId]);

  if (pendingDeviceId && pendingDeviceId !== activeDeviceId && pendingDeviceId !== trackDeviceId) {
    return pendingDeviceId;
  }

  if (matchesRealDevice) return activeDeviceId;
  if (trackDeviceId && devices?.some((device) => device.deviceId === trackDeviceId)) {
    return trackDeviceId;
  }
  if (fallbackDeviceId && devices?.some((device) => device.deviceId === fallbackDeviceId)) {
    return fallbackDeviceId;
  }
  return devices?.[0]?.deviceId;
};
