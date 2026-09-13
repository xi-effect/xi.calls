import { useEffect, useRef } from 'react';
import {
  LocalVideoTrack,
  RemoteVideoTrack,
  RoomEvent,
  Track,
  TrackEvent,
  type Participant,
  type Room,
  type TrackPublication,
} from 'livekit-client';
import { useCallStore, useUserChoicesStore } from '@xipkg/calls-store';
import { useRoom } from './RoomProvider';

const KEEP_ALIVE_WIDTH_PX = 16;
const KEEP_ALIVE_HEIGHT_PX = 9;

/**
 * Если браузер снимает элемент с воспроизведения быстрее, чем мы его запускаем
 * (перегруженный декодер, политика автоплея), безусловный retry превращается в
 * цикл play/pause на частоте кадров и съедает CPU, которого и без того не хватает.
 */
const MAX_PLAY_RETRIES_PER_WINDOW = 5;
const PLAY_RETRY_WINDOW_MS = 2_000;

/**
 * iOS после возврата из фона отдаёт камеру не сразу: первый getUserMedia часто
 * падает или возвращает muted-трек. Повторяем с нарастающей паузой.
 */
const IOS_CAMERA_RESTORE_DELAYS_MS = [300, 1_000, 2_500];

/** LiveKit на mobile через 5с ставит camera.enabled=false — отвечаем сразу после этого. */
const LIVEKIT_BACKGROUND_DISABLE_MS = 5_200;

/**
 * iPadOS 13+ по умолчанию шлёт desktop UA (`Macintosh` + Safari), без «iPad».
 * LiveKit `isMobile()` на таком устройстве false и не делает restart камеры.
 */
const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
};

const isKeepAliveVideo = (publication: TrackPublication, isLocal: boolean) => {
  if (publication.kind !== Track.Kind.Video) return false;
  if (publication.source === Track.Source.Camera) return true;
  return !isLocal && publication.source === Track.Source.ScreenShare;
};

const playVideoElement = (element: HTMLMediaElement) => {
  if (element.paused) {
    void element.play().catch(() => {
      /* autoplay can reject while the tab is frozen; next focus/visibility retries */
    });
  }
};

const forEachCallVideoElement = (room: Room, fn: (element: HTMLVideoElement) => void) => {
  const visit = (participant: Participant) => {
    participant.videoTrackPublications.forEach((publication) => {
      publication.track?.attachedElements.forEach((element) => {
        if (element instanceof HTMLVideoElement) fn(element);
      });
    });
  };

  visit(room.localParticipant);
  room.remoteParticipants.forEach(visit);
};

const getLocalCameraTrack = (room: Room) => {
  const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
  const track = publication?.track;
  return track instanceof LocalVideoTrack ? track : undefined;
};

const userWantsLocalCamera = (room: Room) => {
  const track = getLocalCameraTrack(room);
  // SDK-mute = пользователь выключил камеру. OS-mute это поле не трогает.
  if (track && !track.isMuted) return true;
  if (useCallStore.getState().videoEnabled) return true;
  if (useUserChoicesStore.getState().videoEnabled) return true;
  return false;
};

const isLocalCameraSending = (room: Room) => {
  const track = getLocalCameraTrack(room);
  const media = track?.mediaStreamTrack;

  return (
    !!track &&
    !track.isMuted &&
    !track.isUpstreamPaused &&
    !!media &&
    media.readyState === 'live' &&
    !media.muted &&
    media.enabled
  );
};

/**
 * LiveKit на mobile при скрытой вкладке сам глушит исходящую камеру:
 * `mediaStreamTrack.enabled = false`, затем через 5с `pauseUpstream()`
 * (`replaceTrack(null)`). Репетитор видит mute/аватар, хотя ученица камеру
 * не выключала. Пока трек жив — держим публикацию. Живой захват в фоне iOS
 * всё равно заберёт, но без mute собеседник остаётся на последнем кадре.
 */
const holdLocalCameraPublished = async (room: Room) => {
  if (!userWantsLocalCamera(room)) return;
  const track = getLocalCameraTrack(room);
  if (!track || track.isMuted) return;

  const media = track.mediaStreamTrack;
  if (media && media.readyState === 'live' && !media.enabled) {
    media.enabled = true;
  }
  if (track.isUpstreamPaused) {
    try {
      await track.resumeUpstream();
    } catch (error) {
      console.warn('LiveKit: failed to resume camera upstream in background', error);
    }
  }
};

/**
 * Снимок последнего кадра в canvas-stream: когда iOS уже забрал камеру,
 * в эфир уходит не mute, а замороженное изображение.
 */
const snapshotLocalCamera = (
  room: Room,
  keepAlives: Map<string, { element: HTMLVideoElement; track: LocalVideoTrack | RemoteVideoTrack }>,
) => {
  const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
  const track = publication?.track;
  if (!(track instanceof LocalVideoTrack) || !publication) return null;

  const candidates: HTMLVideoElement[] = [];
  const keepAlive = keepAlives.get(publication.trackSid);
  if (keepAlive) candidates.push(keepAlive.element);
  track.attachedElements.forEach((element) => {
    if (element instanceof HTMLVideoElement) candidates.push(element);
  });

  const video = candidates.find((element) => element.videoWidth > 0 && element.videoHeight > 0);
  if (!video) return null;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);

  const stream = canvas.captureStream(2);
  const still = stream.getVideoTracks()[0];
  if (!still) return null;

  return { canvas, ctx, still, sourceVideo: video };
};

const restoreLocalCamera = async (room: Room) => {
  if (!userWantsLocalCamera(room)) return;
  if (room.state !== 'connected') return;

  const participant = room.localParticipant;
  const track = getLocalCameraTrack(room);

  try {
    if (track && !track.isMuted) {
      await track.restartTrack();
      if (track.isUpstreamPaused) {
        await track.resumeUpstream();
      }
      return;
    }

    await participant.setCameraEnabled(true);
  } catch (error) {
    console.warn('LiveKit: failed to restore camera after tab became visible', error);
    try {
      await participant.setCameraEnabled(false);
      await participant.setCameraEnabled(true);
    } catch (retryError) {
      console.warn('LiveKit: camera republish after background failed', retryError);
    }
  }
};

const restoreRemotePlayback = async (room: Room) => {
  try {
    await room.startVideo();
  } catch {
    /* startVideo может требовать жест пользователя — ниже всё равно play() */
  }
};

/**
 * Браузер ставит <video> на паузу, когда вкладка скрыта или окно потеряло фокус.
 * AdaptiveStream для этого включать нельзя: он глушит чужие камеры в compact.
 * Исходящую камеру на iOS не даём LiveKit замьютить при сворачивании — иначе
 * репетитор сразу теряет картинку ученицы.
 */
export const KeepVideosPlaying = () => {
  const { room } = useRoom();
  const isStarted = useCallStore((state) => state.isStarted);
  const connect = useCallStore((state) => state.connect);
  const hostRef = useRef<HTMLDivElement>(null);
  const keepAliveRef = useRef(
    new Map<string, { element: HTMLVideoElement; track: LocalVideoTrack | RemoteVideoTrack }>(),
  );

  useEffect(() => {
    if (!isStarted || !connect) return;

    const host = hostRef.current;
    if (!host) return;

    const keepAlives = keepAliveRef.current;
    const playRetries = new WeakMap<HTMLVideoElement, { count: number; windowStart: number }>();
    const restoreTimers: number[] = [];
    let wasHidden = document.visibilityState === 'hidden';
    let restoreGeneration = 0;
    let cameraFrozen = false;
    let freezeTimer: number | null = null;
    let freezeTrack: MediaStreamTrack | null = null;
    let boundCameraTrack: LocalVideoTrack | null = null;

    const canRetryPlay = (element: HTMLVideoElement) => {
      const now = Date.now();
      const budget = playRetries.get(element);

      if (!budget || now - budget.windowStart > PLAY_RETRY_WINDOW_MS) {
        playRetries.set(element, { count: 1, windowStart: now });
        return true;
      }

      budget.count += 1;
      return budget.count <= MAX_PLAY_RETRIES_PER_WINDOW;
    };

    const detachKeepAlive = (trackSid: string) => {
      const keepAlive = keepAlives.get(trackSid);
      if (!keepAlive) return;

      keepAlive.track.detach(keepAlive.element);
      keepAlive.element.remove();
      keepAlives.delete(trackSid);
    };

    const attachKeepAlive = (publication: TrackPublication) => {
      const track = publication.track;
      if (!(track instanceof RemoteVideoTrack) && !(track instanceof LocalVideoTrack)) {
        detachKeepAlive(publication.trackSid);
        return;
      }

      const existing = keepAlives.get(publication.trackSid);
      if (existing && existing.track !== track) {
        detachKeepAlive(publication.trackSid);
      }

      let keepAlive = keepAlives.get(publication.trackSid);
      if (!keepAlive) {
        const element = document.createElement('video');
        element.muted = true;
        element.playsInline = true;
        element.autoplay = true;
        element.setAttribute('playsinline', 'true');
        element.setAttribute('webkit-playsinline', 'true');
        element.setAttribute('aria-hidden', 'true');
        element.dataset.callsKeepPlaying = 'true';
        element.style.width = `${KEEP_ALIVE_WIDTH_PX}px`;
        element.style.height = `${KEEP_ALIVE_HEIGHT_PX}px`;
        host.appendChild(element);
        keepAlive = { element, track };
        keepAlives.set(publication.trackSid, keepAlive);
      }

      if (!track.attachedElements.includes(keepAlive.element)) {
        track.attach(keepAlive.element);
      }
      playVideoElement(keepAlive.element);
    };

    const syncKeepAlives = () => {
      const seen = new Set<string>();

      const visit = (participant: Participant, isLocal: boolean) => {
        participant.videoTrackPublications.forEach((publication) => {
          if (!isKeepAliveVideo(publication, isLocal)) {
            detachKeepAlive(publication.trackSid);
            return;
          }
          seen.add(publication.trackSid);
          attachKeepAlive(publication);
        });
      };

      visit(room.localParticipant, true);
      room.remoteParticipants.forEach((participant) => visit(participant, false));

      for (const trackSid of keepAlives.keys()) {
        if (!seen.has(trackSid)) detachKeepAlive(trackSid);
      }
    };

    const playAllCallVideos = () => {
      keepAlives.forEach(({ element }) => playVideoElement(element));
      forEachCallVideoElement(room, playVideoElement);
    };

    const clearRestoreTimers = () => {
      restoreTimers.splice(0).forEach((id) => window.clearTimeout(id));
    };

    const stopFreeze = () => {
      if (freezeTimer !== null) {
        window.clearInterval(freezeTimer);
        freezeTimer = null;
      }
      freezeTrack?.stop();
      freezeTrack = null;
      cameraFrozen = false;
    };

    const handleUpstreamPaused = (pausedTrack: Track) => {
      if (!(pausedTrack instanceof LocalVideoTrack)) return;
      if (pausedTrack.source !== Track.Source.Camera) return;
      void holdLocalCameraPublished(room);
    };

    const bindLocalCameraHold = () => {
      const track = getLocalCameraTrack(room);
      if (boundCameraTrack && boundCameraTrack !== track) {
        boundCameraTrack.off(TrackEvent.UpstreamPaused, handleUpstreamPaused);
        boundCameraTrack = null;
      }
      if (track && boundCameraTrack !== track) {
        track.on(TrackEvent.UpstreamPaused, handleUpstreamPaused);
        boundCameraTrack = track;
      }
    };

    const freezeLocalCameraSnapshot = async () => {
      if (!isIOSDevice() || cameraFrozen) return;
      if (!userWantsLocalCamera(room)) return;
      const track = getLocalCameraTrack(room);
      if (!track || track.isMuted) return;

      const snapshot = snapshotLocalCamera(room, keepAlives);
      if (!snapshot) return;

      freezeTrack = snapshot.still;
      freezeTimer = window.setInterval(() => {
        if (!snapshot.sourceVideo.videoWidth) return;
        snapshot.ctx.drawImage(
          snapshot.sourceVideo,
          0,
          0,
          snapshot.canvas.width,
          snapshot.canvas.height,
        );
      }, 1_000);

      try {
        await track.replaceTrack(snapshot.still, { userProvidedTrack: true });
        cameraFrozen = true;
        bindLocalCameraHold();
        syncKeepAlives();
      } catch (error) {
        console.warn('LiveKit: failed to publish frozen camera frame', error);
        stopFreeze();
      }
    };

    const runForegroundRestore = async (forceCameraRestart: boolean) => {
      if (document.visibilityState === 'hidden') return;

      await restoreRemotePlayback(room);
      playAllCallVideos();

      const shouldRestart = forceCameraRestart || cameraFrozen || !isLocalCameraSending(room);
      if (!shouldRestart) return;

      await restoreLocalCamera(room);
      stopFreeze();
      bindLocalCameraHold();
      syncKeepAlives();
      playAllCallVideos();
    };

    const onBackground = () => {
      wasHidden = true;
      clearRestoreTimers();
      bindLocalCameraHold();
      void freezeLocalCameraSnapshot();
      void holdLocalCameraPublished(room);

      restoreTimers.push(
        window.setTimeout(() => {
          void holdLocalCameraPublished(room);
        }, LIVEKIT_BACKGROUND_DISABLE_MS),
      );
      restoreTimers.push(
        window.setTimeout(() => {
          void holdLocalCameraPublished(room);
        }, LIVEKIT_BACKGROUND_DISABLE_MS + 3_000),
      );
    };

    const scheduleForegroundRestore = () => {
      if (document.visibilityState === 'hidden') {
        onBackground();
        return;
      }

      const returningFromBackground = wasHidden;
      wasHidden = false;

      if (!returningFromBackground) {
        void runForegroundRestore(false);
        return;
      }

      const generation = ++restoreGeneration;
      clearRestoreTimers();

      const delays = isIOSDevice() ? IOS_CAMERA_RESTORE_DELAYS_MS : [0];
      delays.forEach((delay, index) => {
        const timer = window.setTimeout(() => {
          if (generation !== restoreGeneration) return;
          if (document.visibilityState === 'hidden') return;
          void runForegroundRestore(isIOSDevice() && index === 0);
        }, delay);
        restoreTimers.push(timer);
      });
    };

    const handlePause = (event: Event) => {
      const element = event.target;
      if (!(element instanceof HTMLVideoElement)) return;
      if (element.dataset.callsKeepPlaying !== 'true') {
        let managed = false;
        forEachCallVideoElement(room, (callElement) => {
          if (callElement === element) managed = true;
        });
        if (!managed) return;
      }

      const stream = element.srcObject;
      if (stream instanceof MediaStream) {
        const videoTracks = stream.getVideoTracks();
        const hasLiveTrack = videoTracks.some(
          (mediaTrack) => mediaTrack.readyState === 'live' && mediaTrack.enabled,
        );
        if (!hasLiveTrack) return;
      }

      if (!canRetryPlay(element)) return;

      requestAnimationFrame(() => playVideoElement(element));
    };

    syncKeepAlives();
    bindLocalCameraHold();

    room.on(RoomEvent.Connected, syncKeepAlives);
    room.on(RoomEvent.ParticipantConnected, syncKeepAlives);
    room.on(RoomEvent.ParticipantDisconnected, syncKeepAlives);
    room.on(RoomEvent.TrackSubscribed, syncKeepAlives);
    room.on(RoomEvent.TrackUnsubscribed, syncKeepAlives);
    room.on(RoomEvent.TrackPublished, syncKeepAlives);
    room.on(RoomEvent.TrackUnpublished, syncKeepAlives);
    room.on(RoomEvent.LocalTrackPublished, bindLocalCameraHold);
    room.on(RoomEvent.LocalTrackPublished, syncKeepAlives);
    room.on(RoomEvent.LocalTrackUnpublished, syncKeepAlives);
    room.on(RoomEvent.TrackMuted, syncKeepAlives);
    room.on(RoomEvent.TrackUnmuted, syncKeepAlives);

    const holdWhileHidden = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        void holdLocalCameraPublished(room);
      }
    }, 2_000);

    document.addEventListener('visibilitychange', scheduleForegroundRestore);
    document.addEventListener('resume', scheduleForegroundRestore);
    document.addEventListener('freeze', onBackground);
    window.addEventListener('focus', scheduleForegroundRestore);
    window.addEventListener('pageshow', scheduleForegroundRestore);
    window.addEventListener('pagehide', onBackground);
    document.addEventListener('pause', handlePause, true);

    if (document.visibilityState === 'hidden') {
      onBackground();
    }

    return () => {
      clearRestoreTimers();
      window.clearInterval(holdWhileHidden);
      stopFreeze();
      boundCameraTrack?.off(TrackEvent.UpstreamPaused, handleUpstreamPaused);

      room.off(RoomEvent.Connected, syncKeepAlives);
      room.off(RoomEvent.ParticipantConnected, syncKeepAlives);
      room.off(RoomEvent.ParticipantDisconnected, syncKeepAlives);
      room.off(RoomEvent.TrackSubscribed, syncKeepAlives);
      room.off(RoomEvent.TrackUnsubscribed, syncKeepAlives);
      room.off(RoomEvent.TrackPublished, syncKeepAlives);
      room.off(RoomEvent.TrackUnpublished, syncKeepAlives);
      room.off(RoomEvent.LocalTrackPublished, bindLocalCameraHold);
      room.off(RoomEvent.LocalTrackPublished, syncKeepAlives);
      room.off(RoomEvent.LocalTrackUnpublished, syncKeepAlives);
      room.off(RoomEvent.TrackMuted, syncKeepAlives);
      room.off(RoomEvent.TrackUnmuted, syncKeepAlives);

      document.removeEventListener('visibilitychange', scheduleForegroundRestore);
      document.removeEventListener('resume', scheduleForegroundRestore);
      document.removeEventListener('freeze', onBackground);
      window.removeEventListener('focus', scheduleForegroundRestore);
      window.removeEventListener('pageshow', scheduleForegroundRestore);
      window.removeEventListener('pagehide', onBackground);
      document.removeEventListener('pause', handlePause, true);

      for (const trackSid of [...keepAlives.keys()]) {
        detachKeepAlive(trackSid);
      }
    };
  }, [connect, isStarted, room]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        width: KEEP_ALIVE_WIDTH_PX,
        height: KEEP_ALIVE_HEIGHT_PX,
        overflow: 'hidden',
        // opacity: 0 и z-index: -1 WebKit считает «невидимым» медиа: ставит
        // <video> на паузу и может остановить локальную камеру (iPad Safari).
        opacity: 0.011,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};
