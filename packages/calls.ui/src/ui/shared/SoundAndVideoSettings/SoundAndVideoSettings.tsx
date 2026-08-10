import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LocalAudioTrack,
  LocalVideoTrack,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from 'livekit-client';
import { Button } from '@xipkg/button';
import { Checkbox } from '@xipkg/checkbox';
import { Label } from '@xipkg/label';
import { Toggle } from '@xipkg/toggle';
import { Conference, HelpCircle, Microphone, SoundTwo } from '@xipkg/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';
import { supportsBackgroundProcessors } from '@livekit/track-processors';
import { getBaselineAudioCaptureOptions } from '@xipkg/calls-config';
import {
  useCannotUseDevice,
  useNoiseCancellation,
  usePersistentUserChoices,
  useVideoBlur,
} from '@xipkg/calls-hooks';
import { useCallsRuntimeConfig } from '@xipkg/calls-providers';
import { openPermissionsDialog, usePermissionsStore } from '@xipkg/calls-store';
import { playSpeakerTestTone } from '@xipkg/calls-utils';
import { useTranslation } from 'react-i18next';
import { NoiseCancellationSettings } from '../NoiseCancellationSettings';
import { CameraPreview } from './CameraPreview';
import { DeviceSelect } from './DeviceSelect';
import { MicLevelMeter } from './MicLevelMeter';
import { VolumeSlider } from './VolumeSlider';

const CAMERA_RESOLUTION = { width: 1280, height: 720 };
const MIC_TEST_MS = 4000;

type SoundAndVideoSettingsProps = {
  className?: string;
};

export const SoundAndVideoSettings = ({ className }: SoundAndVideoSettingsProps) => {
  const { t } = useTranslation('calls');
  const {
    noiseCancellation: { featureEnabled: noiseCancellationFeatureEnabled },
  } = useCallsRuntimeConfig();

  const {
    userChoices: {
      audioDeviceId,
      audioOutputDeviceId,
      videoDeviceId,
      blurEnabled,
      microphoneVolume = 1,
      speakerVolume = 1,
      mirrorVideo = true,
    },
    saveAudioInputDeviceId,
    saveAudioOutputDeviceId,
    saveVideoInputDeviceId,
    saveBlurEnabled,
    saveMicrophoneVolume,
    saveSpeakerVolume,
    saveMirrorVideo,
  } = usePersistentUserChoices();

  const cameraPermission = usePermissionsStore((s) => s.cameraPermission);
  const microphonePermission = usePermissionsStore((s) => s.microphonePermission);
  const isCameraBlocked = useCannotUseDevice('videoinput');
  const isMicrophoneBlocked = useCannotUseDevice('audioinput');

  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | undefined>();
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | undefined>();
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [isSpeakerTesting, setIsSpeakerTesting] = useState(false);

  const isBlurSupported = useMemo(() => supportsBackgroundProcessors(), []);

  const noiseCancellation = useNoiseCancellation(null, { localAudioTrack: audioTrack });
  useVideoBlur(videoTrack);
  // Громкость mic применяем в PreJoin/ActiveRoom; здесь не трогаем трек —
  // иначе метр «Проверить» читает WebAudio destination и скачет на тишине.

  // Запрашиваем/синхронизируем permissions при открытии панели
  useEffect(() => {
    if (typeof navigator.permissions?.query !== 'function') return;

    let cancelled = false;

    const checkPermissions = async () => {
      try {
        const [cam, mic] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }),
          navigator.permissions.query({ name: 'microphone' as PermissionName }),
        ]);
        if (cancelled) return;
        usePermissionsStore.setState({
          cameraPermission: cam.state === 'prompt' ? undefined : cam.state,
          microphonePermission: mic.state === 'prompt' ? undefined : mic.state,
        });
      } catch {
        // Permissions API может не поддерживать camera/microphone — getUserMedia обновит store
      }
    };

    void checkPermissions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preview audio track — пересоздаём после выдачи разрешения микрофона
  useEffect(() => {
    let cancelled = false;
    let track: LocalAudioTrack | undefined;

    const start = async () => {
      try {
        const baselineAudio = getBaselineAudioCaptureOptions();
        track = await createLocalAudioTrack({
          ...baselineAudio,
          deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
        });
        if (cancelled) {
          track.stop();
          return;
        }
        setAudioTrack(track);
      } catch (error) {
        console.error('Failed to create preview audio track', error);
        if (!cancelled) setAudioTrack(undefined);
      }
    };

    void start();

    return () => {
      cancelled = true;
      track?.stop();
      setAudioTrack(undefined);
    };
    // audioDeviceId применяется через setDeviceId; здесь — mount / смена permission
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphonePermission]);

  // Preview video track — пересоздаём после выдачи разрешения камеры
  useEffect(() => {
    let cancelled = false;
    let track: LocalVideoTrack | undefined;

    const start = async () => {
      try {
        track = await createLocalVideoTrack({
          deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
          resolution: CAMERA_RESOLUTION,
        });
        if (cancelled) {
          track.stop();
          return;
        }
        setVideoTrack(track);
      } catch (error) {
        console.error('Failed to create preview video track', error);
        if (!cancelled) setVideoTrack(undefined);
      }
    };

    void start();

    return () => {
      cancelled = true;
      track?.stop();
      setVideoTrack(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraPermission]);

  const handleAudioDeviceChange = useCallback(
    async (deviceId: string) => {
      saveAudioInputDeviceId(deviceId);
      try {
        if (audioTrack) {
          await audioTrack.setDeviceId({ exact: deviceId });
        }
      } catch (error) {
        console.error('Failed to switch microphone device', error);
      }
    },
    [audioTrack, saveAudioInputDeviceId],
  );

  const handleVideoDeviceChange = useCallback(
    async (deviceId: string) => {
      saveVideoInputDeviceId(deviceId);
      try {
        if (videoTrack) {
          await videoTrack.setDeviceId({ exact: deviceId });
        }
      } catch (error) {
        console.error('Failed to switch camera device', error);
      }
    },
    [videoTrack, saveVideoInputDeviceId],
  );

  const handleAudioOutputDeviceChange = useCallback(
    (deviceId: string) => {
      saveAudioOutputDeviceId(deviceId);
    },
    [saveAudioOutputDeviceId],
  );

  const handleMicTest = useCallback(() => {
    if (!audioTrack || isMicrophoneBlocked) {
      openPermissionsDialog();
      return;
    }
    setIsMicTesting(true);
  }, [audioTrack, isMicrophoneBlocked]);

  useEffect(() => {
    if (!isMicTesting) return;
    const timer = window.setTimeout(() => setIsMicTesting(false), MIC_TEST_MS);
    return () => window.clearTimeout(timer);
  }, [isMicTesting]);

  const handleSpeakerTest = useCallback(async () => {
    if (isSpeakerTesting) return;
    setIsSpeakerTesting(true);
    try {
      await playSpeakerTestTone({
        volume: speakerVolume,
        sinkId: audioOutputDeviceId,
      });
    } catch (error) {
      console.warn('Speaker test failed', error);
    } finally {
      setIsSpeakerTesting(false);
    }
  }, [audioOutputDeviceId, isSpeakerTesting, speakerVolume]);

  const videoSelectorKey = `videoinput-${cameraPermission}`;
  const audioInputSelectorKey = `audioinput-${microphonePermission}`;
  const audioOutputSelectorKey = `audiooutput-${microphonePermission}`;

  return (
    <div className={className}>
      <div className="flex flex-col gap-4">
        {/* Звук */}
        <section className="border-border-control rounded-2xl border p-4">
          <h2 className="text-text-primary mb-4 text-base font-semibold">
            {t('soundAndVideo.sound')}
          </h2>

          <div className="space-y-5">
            <div className="space-y-3">
              <Label className="text-text-primary text-sm font-medium">
                {t('soundAndVideo.microphone')}
              </Label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DeviceSelect
                    key={audioInputSelectorKey}
                    kind="audioinput"
                    currentDeviceId={audioDeviceId}
                    onDeviceChange={handleAudioDeviceChange}
                    icon={<Microphone className="h-4 w-4" />}
                    disabled={isMicrophoneBlocked}
                  />
                </div>
                <Button
                  type="button"
                  size="s"
                  onClick={handleMicTest}
                  disabled={isMicTesting}
                  className="shrink-0"
                >
                  {isMicTesting ? t('soundAndVideo.testing') : t('soundAndVideo.test')}
                </Button>
              </div>
              {isMicrophoneBlocked && (
                <Button type="button" size="s" variant="ghost" onClick={openPermissionsDialog}>
                  {t('soundAndVideo.allowMicrophone')}
                </Button>
              )}
              {isMicTesting && (
                <MicLevelMeter
                  track={audioTrack}
                  active={isMicTesting}
                  sensitivity={microphoneVolume}
                  className="mt-1"
                />
              )}
              <VolumeSlider
                variant="microphone"
                value={microphoneVolume}
                onChange={saveMicrophoneVolume}
                disabled={isMicrophoneBlocked}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-text-primary text-sm font-medium">
                {t('soundAndVideo.speakers')}
              </Label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DeviceSelect
                    key={audioOutputSelectorKey}
                    kind="audiooutput"
                    currentDeviceId={audioOutputDeviceId}
                    onDeviceChange={handleAudioOutputDeviceChange}
                    icon={<SoundTwo className="h-4 w-4" />}
                    disabled={isMicrophoneBlocked}
                  />
                </div>
                <Button
                  type="button"
                  size="s"
                  onClick={handleSpeakerTest}
                  disabled={isSpeakerTesting}
                  className="shrink-0"
                >
                  {isSpeakerTesting ? t('soundAndVideo.testing') : t('soundAndVideo.test')}
                </Button>
              </div>
              <VolumeSlider variant="speaker" value={speakerVolume} onChange={saveSpeakerVolume} />
            </div>

            {noiseCancellationFeatureEnabled && (
              <div className="border-border-default border-t pt-4">
                <NoiseCancellationSettings nc={noiseCancellation} hideOffOption />
              </div>
            )}
          </div>
        </section>

        {/* Камера */}
        <section className="border-border-control rounded-2xl border p-4">
          <h2 className="text-text-primary mb-4 text-base font-semibold">
            {t('soundAndVideo.camera')}
          </h2>

          <div className="space-y-4">
            <CameraPreview
              videoTrack={videoTrack}
              mirror={mirrorVideo}
              unavailable={isCameraBlocked || !videoTrack}
              blurEnabled={!!blurEnabled}
            />

            <div className="flex items-center gap-2">
              <Checkbox
                id="mirror-video"
                checked={mirrorVideo}
                onCheckedChange={(checked) => saveMirrorVideo(checked === true)}
              />
              <label htmlFor="mirror-video" className="text-text-primary cursor-pointer text-sm">
                {t('soundAndVideo.mirror')}
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex shrink-0 rounded-sm bg-transparent p-0"
                    aria-label={t('soundAndVideo.mirrorTooltip')}
                  >
                    <HelpCircle className="fill-icon-secondary h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64">
                  {t('soundAndVideo.mirrorTooltip')}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-2">
              <Label className="text-text-primary text-sm font-medium">
                {t('soundAndVideo.camera')}
              </Label>
              <DeviceSelect
                key={videoSelectorKey}
                kind="videoinput"
                currentDeviceId={videoDeviceId}
                onDeviceChange={handleVideoDeviceChange}
                icon={<Conference className="h-4 w-4" />}
                disabled={isCameraBlocked}
              />
              {isCameraBlocked && (
                <Button type="button" size="s" variant="ghost" onClick={openPermissionsDialog}>
                  {t('soundAndVideo.allowCamera')}
                </Button>
              )}
            </div>

            {isBlurSupported && (
              <div className="flex items-center justify-between">
                <Label className="text-text-primary font-medium">
                  {t('settings.backgroundBlur')}
                </Label>
                <Toggle checked={!!blurEnabled} onCheckedChange={saveBlurEnabled} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
