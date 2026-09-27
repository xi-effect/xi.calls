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

/** Сентинел LiveKit/браузера — "устройство ОС по умолчанию", а не конкретный физический девайс. */
const DEFAULT_SENTINEL = 'default';

/**
 * Резолвит реальный активный `deviceId` для отображения (галочка в
 * `DeviceHoverMenu`, выбранное значение в `DeviceSelector`).
 *
 * `useMediaDeviceSelect` инициализирует `activeDeviceId` литералом `"default"`
 * до первого события об активном устройстве от комнаты. Для видео такой записи
 * в списке устройств не бывает вовсе, и подбор по `activeDeviceId` там просто
 * молча проваливается. Для аудио — хуже: `"default"` почти всегда СУЩЕСТВУЕТ
 * как реальная запись в списке (браузер сам её добавляет), но это не значит,
 * что оно достоверно указывает на конкретное устройство. На Linux/Chrome
 * `track.getSettings().deviceId` (а значит и то, что дальше узнаёт комната)
 * может вернуть буквально `"default"` даже когда мы запросили конкретный
 * `exact`-deviceId, если он на момент запроса совпадал с системным дефолтом —
 * это особенность браузера, не наша логика. Поэтому `"default"` — это в лучшем
 * случае неоднозначное подтверждение: и `activeDeviceId`, и `track.getDeviceId()`
 * могут "застрять" на нём даже после успешного переключения на конкретное
 * устройство, если оно просто совпадает с текущим дефолтом ОС.
 *
 * Приоритет разрешения:
 * 1. `pendingDeviceId`, пока он не подтверждён ни `activeDeviceId`, ни самим
 *    треком — актуально не только пока трек замьючен (restart отложен
 *    целиком), но и в обычном случае: подтверждение от комнаты приходит
 *    асинхронно даже когда restart уже фактически случился
 *    (`Room.onLocalTrackRestarted` сам ждёт `track.getDeviceId()`, прежде чем
 *    заэмитить `ActiveDeviceChanged`). Само подтверждение и сброс — на стороне
 *    `useSwitchDevice`.
 * 2. `activeDeviceId` / `track.getDeviceId()`, если это КОНКРЕТНОЕ устройство
 *    из списка (не сентинел `"default"`) — однозначное подтверждение.
 * 3. `fallbackDeviceId` (обычно — то, что пользователь явно выбрал и что было
 *    запрошено при создании трека), если он есть в списке устройств — сильнее
 *    неоднозначного `"default"`, потому что отражает явное намерение
 *    пользователя, а не догадку браузера.
 * 4. `activeDeviceId` / `track.getDeviceId()` даже если это `"default"` —
 *    когда лучшего сигнала нет, показать хоть что-то лучше, чем ничего.
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

  const isRealDevice = (id: string | undefined) =>
    !!id && !!devices?.some((d) => d.deviceId === id);
  const isUnambiguousMatch = (id: string | undefined) =>
    isRealDevice(id) && id !== DEFAULT_SENTINEL;
  // Булево значение, а не сама функция — в deps эффекта нужен стабильный
  // примитив, а не новая на каждый рендер isUnambiguousMatch.
  const hasUnambiguousActiveDevice = isUnambiguousMatch(activeDeviceId);

  useEffect(() => {
    // "default" — неоднозначный сигнал (см. комментарий выше), поэтому он НЕ
    // должен останавливать опрос track.getDeviceId(): именно в этом случае
    // трек — единственный шанс узнать, какое устройство активно на самом деле.
    if (hasUnambiguousActiveDevice || !track) {
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
  }, [hasUnambiguousActiveDevice, track, pendingDeviceId]);

  if (pendingDeviceId && pendingDeviceId !== activeDeviceId && pendingDeviceId !== trackDeviceId) {
    return pendingDeviceId;
  }

  if (hasUnambiguousActiveDevice) return activeDeviceId;
  if (isUnambiguousMatch(trackDeviceId)) return trackDeviceId;
  if (isRealDevice(fallbackDeviceId)) return fallbackDeviceId;
  if (isRealDevice(activeDeviceId)) return activeDeviceId;
  if (isRealDevice(trackDeviceId)) return trackDeviceId;
  return devices?.[0]?.deviceId;
};
