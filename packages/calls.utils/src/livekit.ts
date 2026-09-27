import { getBrowser, LocalParticipant, LogLevel, Participant, setLogLevel } from 'livekit-client';

export const silenceLiveKitLogs = (shouldSilenceLogs: boolean) => {
  setLogLevel(shouldSilenceLogs ? LogLevel.silent : LogLevel.debug);
};

export function isFireFox(): boolean {
  return getBrowser()?.name === 'Firefox';
}

export function isChromiumBased(): boolean {
  return getBrowser()?.name === 'Chrome';
}

export function isSafari(): boolean {
  return getBrowser()?.name === 'Safari';
}

export function isLocal(p: Participant) {
  return p instanceof LocalParticipant;
}

export function isMacintosh() {
  return navigator.platform.indexOf('Mac') > -1;
}

/** Псевдо-id "устройство ОС по умолчанию" — не конкретное физическое устройство. */
const OS_DEFAULT_DEVICE_IDS = new Set(['default', 'communications']);

/**
 * Браузер сам добавляет в `enumerateDevices()` псевдо-записи `"default"` (и
 * `"communications"` на Windows), которые указывают на РЕАЛЬНОЕ устройство,
 * уже присутствующее в том же списке под своим настоящим id — то есть одно и
 * то же физическое устройство пользователь видит дважды. Убираем эти
 * дубликаты: выбор конкретного устройства из списка достаточен, а сама
 * "default"-запись ещё и мешает надёжно определять активное устройство (см.
 * `useResolvedActiveDeviceId` — `activeDeviceId`/`track.getDeviceId()` иногда
 * тоже "застревают" на этом сентинеле, не называя конкретное устройство).
 */
export function excludeOsDefaultDevices(devices: MediaDeviceInfo[] | undefined): MediaDeviceInfo[] {
  return devices?.filter((device) => !OS_DEFAULT_DEVICE_IDS.has(device.deviceId)) ?? [];
}
