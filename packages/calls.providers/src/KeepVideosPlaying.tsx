import { useEffect, useRef } from 'react';
import {
  RemoteVideoTrack,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrackPublication,
  type Room,
} from 'livekit-client';
import { useCallStore } from '@xipkg/calls-store';
import { useRoom } from './RoomProvider';

const KEEP_ALIVE_WIDTH_PX = 16;
const KEEP_ALIVE_HEIGHT_PX = 9;

const isRemoteCameraOrScreen = (publication: RemoteTrackPublication) =>
  publication.kind === Track.Kind.Video &&
  (publication.source === Track.Source.Camera || publication.source === Track.Source.ScreenShare);

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

/**
 * Браузер ставит <video> на паузу, когда вкладка скрыта или окно потеряло фокус.
 * AdaptiveStream для этого включать нельзя: он глушит чужие камеры в compact.
 * Держим удалённые треки на скрытых, но видимых IntersectionObserver элементах
 * и заново вызываем play() на паузе / focus / visibilitychange.
 */
export const KeepVideosPlaying = () => {
  const { room } = useRoom();
  const isStarted = useCallStore((state) => state.isStarted);
  const connect = useCallStore((state) => state.connect);
  const hostRef = useRef<HTMLDivElement>(null);
  const keepAliveRef = useRef(
    new Map<string, { element: HTMLVideoElement; track: RemoteVideoTrack }>(),
  );

  useEffect(() => {
    if (!isStarted || !connect) return;

    const host = hostRef.current;
    if (!host) return;

    const keepAlives = keepAliveRef.current;

    const detachKeepAlive = (trackSid: string) => {
      const keepAlive = keepAlives.get(trackSid);
      if (!keepAlive) return;

      keepAlive.track.detach(keepAlive.element);
      keepAlive.element.remove();
      keepAlives.delete(trackSid);
    };

    const attachKeepAlive = (publication: RemoteTrackPublication) => {
      if (!isRemoteCameraOrScreen(publication)) {
        detachKeepAlive(publication.trackSid);
        return;
      }

      const track = publication.track;
      if (!(track instanceof RemoteVideoTrack)) {
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

      room.remoteParticipants.forEach((participant) => {
        participant.videoTrackPublications.forEach((publication) => {
          seen.add(publication.trackSid);
          attachKeepAlive(publication);
        });
      });

      for (const trackSid of keepAlives.keys()) {
        if (!seen.has(trackSid)) detachKeepAlive(trackSid);
      }
    };

    const playAllCallVideos = () => {
      keepAlives.forEach(({ element }) => playVideoElement(element));
      forEachCallVideoElement(room, playVideoElement);
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

      requestAnimationFrame(() => playVideoElement(element));
    };

    syncKeepAlives();

    room.on(RoomEvent.Connected, syncKeepAlives);
    room.on(RoomEvent.ParticipantConnected, syncKeepAlives);
    room.on(RoomEvent.ParticipantDisconnected, syncKeepAlives);
    room.on(RoomEvent.TrackSubscribed, syncKeepAlives);
    room.on(RoomEvent.TrackUnsubscribed, syncKeepAlives);
    room.on(RoomEvent.TrackPublished, syncKeepAlives);
    room.on(RoomEvent.TrackUnpublished, syncKeepAlives);

    document.addEventListener('visibilitychange', playAllCallVideos);
    document.addEventListener('resume', playAllCallVideos);
    window.addEventListener('focus', playAllCallVideos);
    window.addEventListener('pageshow', playAllCallVideos);
    document.addEventListener('pause', handlePause, true);

    return () => {
      room.off(RoomEvent.Connected, syncKeepAlives);
      room.off(RoomEvent.ParticipantConnected, syncKeepAlives);
      room.off(RoomEvent.ParticipantDisconnected, syncKeepAlives);
      room.off(RoomEvent.TrackSubscribed, syncKeepAlives);
      room.off(RoomEvent.TrackUnsubscribed, syncKeepAlives);
      room.off(RoomEvent.TrackPublished, syncKeepAlives);
      room.off(RoomEvent.TrackUnpublished, syncKeepAlives);

      document.removeEventListener('visibilitychange', playAllCallVideos);
      document.removeEventListener('resume', playAllCallVideos);
      window.removeEventListener('focus', playAllCallVideos);
      window.removeEventListener('pageshow', playAllCallVideos);
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
        top: 0,
        width: KEEP_ALIVE_WIDTH_PX,
        height: KEEP_ALIVE_HEIGHT_PX,
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
};
