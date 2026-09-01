import * as React from 'react';
import { useCallback, useMemo } from 'react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@xipkg/sheet';
import { Close, Conference, HelpCircle, Microphone, SoundTwo, Music } from '@xipkg/icons';
import { Label } from '@xipkg/label';
import { Toggle } from '@xipkg/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@xipkg/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';
import {
  useLocalParticipant,
  usePersistentUserChoices,
  useTrackToggle,
} from '@livekit/components-react';
import { useMediaDeviceSelect } from '@livekit/components-react';
import { Track, LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { supportsBackgroundProcessors } from '@livekit/track-processors';

import {
  useUserChoicesStore,
  usePermissionsStore,
  openPermissionsDialog,
} from '@xipkg/calls-store';
import { useRoom, useCallsNavigation, useCallsRuntimeConfig } from '@xipkg/calls-providers';
import { useNoiseCancellation, useCannotUseDevice } from '@xipkg/calls-hooks';
import { NoiseCancellationSettings } from '../shared/NoiseCancellationSettings';
import { VoiceEnhancementSettings } from '../shared/VoiceEnhancementSettings';
import { Button } from '@xipkg/button';
import { useTranslation } from 'react-i18next';

type SettingsPropsT = {
  children: React.ReactNode;
};

// Компонент для выбора устройства (перемонтируется по key при смене разрешения, чтобы обновить список)
const DeviceSelector = ({
  kind,
  currentDeviceId,
  onDeviceChange,
  icon,
  disabled,
}: {
  kind: 'videoinput' | 'audioinput' | 'audiooutput';
  currentDeviceId?: string;
  onDeviceChange: (deviceId: string) => void;
  icon: React.ReactNode;
  disabled?: boolean;
}) => {
  const { t } = useTranslation('calls');
  const { devices } = useMediaDeviceSelect({ kind });

  const placeholders = {
    audioinput: t('settings.device.builtinMic'),
    audiooutput: t('settings.device.builtinSpeakers'),
    videoinput: t('settings.device.builtinCamera'),
  };

  const currentDevice = devices?.find((device) => device.deviceId === currentDeviceId);
  const displayValue = currentDevice?.label || placeholders[kind];
  const hasDevices = devices && devices.length > 0 && devices[0].deviceId !== '';

  return (
    <Select
      onValueChange={onDeviceChange}
      value={currentDeviceId || undefined}
      disabled={disabled || !hasDevices}
    >
      <SelectTrigger
        className="text-text-primary w-full"
        before={
          <span className="fill-icon-primary [&_svg]:fill-icon-primary shrink-0">{icon}</span>
        }
      >
        <SelectValue placeholder={placeholders[kind]}>{displayValue}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-full">
        {devices?.map((device) => (
          <SelectItem
            key={device.deviceId}
            className="text-text-primary h-auto"
            value={device.deviceId}
          >
            {device.label || t('settings.device.unnamed', { shortId: device.deviceId.slice(0, 8) })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const Settings = ({ children }: SettingsPropsT) => {
  const { t } = useTranslation('calls');
  const { room } = useRoom();
  const {
    noiseCancellation: { featureEnabled: noiseCancellationFeatureEnabled },
  } = useCallsRuntimeConfig();
  const { microphoneTrack, cameraTrack, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();
  const noiseCancellation = useNoiseCancellation(room);
  const {
    userChoices: { audioDeviceId, videoDeviceId },
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
    saveAudioInputEnabled,
    saveVideoInputEnabled,
  } = usePersistentUserChoices();

  // Получаем audioOutputDeviceId, blurEnabled и mirrorVideo из store напрямую
  // (LiveKit usePersistentUserChoices этих полей не знает)
  const audioOutputDeviceId = useUserChoicesStore((state) => state.audioOutputDeviceId);
  const blurEnabled = useUserChoicesStore((state) => state.blurEnabled);
  const mirrorVideo = useUserChoicesStore((state) => state.mirrorVideo ?? true);

  const navigation = useCallsNavigation();

  const saveAudioOutputDeviceId = useCallback((deviceId: string) => {
    useUserChoicesStore.setState({ audioOutputDeviceId: deviceId });
  }, []);

  const handleBlurToggle = useCallback((checked: boolean) => {
    useUserChoicesStore.setState({ blurEnabled: checked });
  }, []);

  const handleMirrorToggle = useCallback((checked: boolean) => {
    useUserChoicesStore.setState({ mirrorVideo: checked });
  }, []);

  const cameraPermission = usePermissionsStore((s) => s.cameraPermission);
  const microphonePermission = usePermissionsStore((s) => s.microphonePermission);

  // Единая с TrackToggle логика блокировки: если Permissions API недоступен
  // ('unavailable') или права ещё не запрошены ('undefined'), не блокируем
  // управление устройствами намертво — реальный результат покажет getUserMedia.
  const isCameraBlocked = useCannotUseDevice('videoinput');
  const isMicrophoneBlocked = useCannotUseDevice('audioinput');
  const isCameraGranted = !isCameraBlocked;
  const isMicrophoneGranted = !isMicrophoneBlocked;

  // Ключи для перемонтирования селекторов при смене разрешения (обновление списка устройств)
  const videoSelectorKey = `videoinput-${cameraPermission}`;
  const audioInputSelectorKey = `audioinput-${microphonePermission}`;
  const audioOutputSelectorKey = `audiooutput-${microphonePermission}`;

  // Мемоизируем проверку поддержки, чтобы не создавать WebGL контекст при каждом рендере
  const isBlurSupported = useMemo(() => supportsBackgroundProcessors(), []);

  // Получаем треки из публикаций и приводим к правильному типу
  const audioTrack = microphoneTrack?.track as LocalAudioTrack | undefined;
  const videoTrack = cameraTrack?.track as LocalVideoTrack | undefined;

  // Используем useTrackToggle для правильного управления треками
  const microphoneToggle = useTrackToggle({
    source: Track.Source.Microphone,
    onChange: (enabled: boolean, isUserInitiated: boolean) => {
      if (isUserInitiated) {
        saveAudioInputEnabled(enabled);
      }
    },
  });

  const cameraToggle = useTrackToggle({
    source: Track.Source.Camera,
    onChange: (enabled: boolean, isUserInitiated: boolean) => {
      if (isUserInitiated) {
        saveVideoInputEnabled(enabled);
      }
    },
  });

  // Обработчики смены устройств с применением к трекам
  const handleAudioDeviceChange = useCallback(
    async (deviceId: string) => {
      try {
        saveAudioInputDeviceId(deviceId);
        if (audioTrack) {
          await audioTrack.setDeviceId({ exact: deviceId });
          const isActuallyEnabled = !audioTrack.isMuted;
          saveAudioInputEnabled(isActuallyEnabled);
          console.log('Audio device changed to:', deviceId);
        }
      } catch (err) {
        console.error('Failed to switch microphone device', err);
      }
    },
    [audioTrack, saveAudioInputDeviceId, saveAudioInputEnabled],
  );

  const handleVideoDeviceChange = useCallback(
    async (deviceId: string) => {
      try {
        saveVideoInputDeviceId(deviceId);
        if (videoTrack) {
          await videoTrack.setDeviceId({ exact: deviceId });
          const isActuallyEnabled = !videoTrack.isMuted;
          saveVideoInputEnabled(isActuallyEnabled);
          console.log('Video device changed to:', deviceId);
        }
      } catch (err) {
        console.error('Failed to switch camera device', err);
      }
    },
    [videoTrack, saveVideoInputDeviceId, saveVideoInputEnabled],
  );

  const handleAudioOutputDeviceChange = useCallback(
    async (deviceId: string) => {
      try {
        saveAudioOutputDeviceId(deviceId);
        // LiveKitProvider также слушает store; здесь применяем сразу для отзывчивости UI
        await room.switchActiveDevice('audiooutput', deviceId);
        console.log('Audio output device changed to:', deviceId);
      } catch (err) {
        console.error('Failed to switch audio output device', err);
      }
    },
    [room, saveAudioOutputDeviceId],
  );

  // Обработчики включения/выключения
  const handleMicrophoneToggle = useCallback(
    async (enabled: boolean) => {
      await microphoneToggle.toggle(enabled);
    },
    [microphoneToggle],
  );

  const handleCameraToggle = useCallback(
    async (enabled: boolean) => {
      await cameraToggle.toggle(enabled);
    },
    [cameraToggle],
  );

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="bg-background-surface text-text-primary w-100 rounded-tl-2xl rounded-bl-2xl border-none p-4 shadow-2xl">
        <SheetHeader className="mb-6 flex h-10 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-text-primary">{t('settings.title')}</SheetTitle>
          <SheetClose className="hover:bg-background-page mt-0 rounded-md bg-transparent p-1">
            <Close className="fill-icon-primary" />
          </SheetClose>
        </SheetHeader>

        <div className="space-y-6">
          {/* Камера */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-text-primary font-medium">{t('settings.camera')}</Label>
              <Toggle
                checked={isCameraEnabled}
                onCheckedChange={handleCameraToggle}
                disabled={!isCameraGranted}
              />
            </div>
            <DeviceSelector
              key={videoSelectorKey}
              kind="videoinput"
              currentDeviceId={videoDeviceId}
              onDeviceChange={handleVideoDeviceChange}
              icon={<Conference className="h-4 w-4" />}
              disabled={!isCameraGranted}
            />
            {!isCameraGranted && (
              <Button type="button" size="s" variant="ghost" onClick={openPermissionsDialog}>
                {t('settings.allowCamera')}
              </Button>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-text-primary font-medium">{t('settings.mirror')}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex shrink-0 rounded-sm bg-transparent p-0"
                      aria-label={t('settings.mirrorTooltip')}
                    >
                      <HelpCircle className="fill-icon-secondary h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64">
                    {t('settings.mirrorTooltip')}
                  </TooltipContent>
                </Tooltip>
              </div>
              <Toggle checked={mirrorVideo} onCheckedChange={handleMirrorToggle} />
            </div>
          </div>

          {/* Микрофон */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-text-primary font-medium">{t('settings.microphone')}</Label>
              <Toggle
                checked={isMicrophoneEnabled}
                onCheckedChange={handleMicrophoneToggle}
                disabled={!isMicrophoneGranted}
              />
            </div>
            <DeviceSelector
              key={audioInputSelectorKey}
              kind="audioinput"
              currentDeviceId={audioDeviceId}
              onDeviceChange={handleAudioDeviceChange}
              icon={<Microphone className="h-4 w-4" />}
              disabled={!isMicrophoneGranted}
            />
            {!isMicrophoneGranted && (
              <Button type="button" size="s" variant="ghost" onClick={openPermissionsDialog}>
                {t('settings.allowMicrophone')}
              </Button>
            )}

            {noiseCancellationFeatureEnabled && (
              <div className="mt-4">
                <NoiseCancellationSettings nc={noiseCancellation} hideOffOption />
              </div>
            )}
            <div className="border-border-default mt-4 border-t pt-4">
              <VoiceEnhancementSettings />
            </div>
          </div>

          {/* Динамики (список устройств вывода может зависеть от разрешения микрофона в части браузеров) */}
          <div className="space-y-3">
            <Label className="text-text-primary font-medium">{t('settings.speakers')}</Label>
            <DeviceSelector
              key={audioOutputSelectorKey}
              kind="audiooutput"
              currentDeviceId={audioOutputDeviceId}
              onDeviceChange={handleAudioOutputDeviceChange}
              icon={<SoundTwo className="h-4 w-4" />}
              disabled={!isMicrophoneGranted}
            />
          </div>

          {/* Размытие фона */}
          {isBlurSupported && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-text-primary font-medium">
                  {t('settings.backgroundBlur')}
                </Label>
                <Toggle checked={blurEnabled} onCheckedChange={handleBlurToggle} />
              </div>
            </div>
          )}

          {/* Кнопка для перехода к настройкам звуков */}
          <div className="border-border-default border-t pt-6">
            <Button
              type="button"
              variant="ghost"
              size="s"
              className="w-full gap-2"
              onClick={() => {
                navigation.replaceSearch({ ...navigation.search, profile: 'effects' });
              }}
            >
              <Music className="h-4 w-4" />
              {t('settings.effects')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
