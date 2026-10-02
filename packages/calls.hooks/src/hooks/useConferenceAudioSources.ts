import { useEffect, useState } from 'react';
import { RoomEvent, Track, type Room } from 'livekit-client';
import { useRoom } from '@xipkg/calls-providers';

export type ConferenceAudioSourceT = {
  /** identity участника + sid трека. Меняется при смене микрофона, не при mute. */
  id: string;
  /** Живой трек LiveKit. Его нельзя останавливать: запись только подключается к нему. */
  track: MediaStreamTrack;
  origin: 'local' | 'remote';
};

export type ConferenceAudioSnapshotT = {
  sources: ConferenceAudioSourceT[];
  participantCount: number;
  connected: boolean;
};

type PublicationLike = {
  source: Track.Source;
  trackSid: string;
  isSubscribed?: boolean;
  track?: { mediaStreamTrack?: MediaStreamTrack | null } | null;
};

function isRecordable(source: Track.Source, origin: 'local' | 'remote'): boolean {
  if (source === Track.Source.Microphone) return true;
  // Локальный звук демонстрации экрана уже содержит голоса из динамиков — его не дублируем.
  return source === Track.Source.ScreenShareAudio && origin === 'remote';
}

function pushPublication(
  sources: ConferenceAudioSourceT[],
  identity: string,
  publication: PublicationLike,
  origin: 'local' | 'remote',
): void {
  if (!isRecordable(publication.source, origin)) return;
  if (origin === 'remote' && publication.isSubscribed === false) return;
  const track = publication.track?.mediaStreamTrack;
  if (!track || track.readyState === 'ended') return;
  sources.push({
    id: `${identity}:${publication.trackSid}`,
    track,
    origin,
  });
}

/** Снимок микрофона преподавателя и звука остальных участников. Оригинальные треки не клонируются и не останавливаются. */
export function collectConferenceAudioSources(room: Room): ConferenceAudioSnapshotT {
  const connected = room.state === 'connected';
  if (!connected) {
    return { sources: [], participantCount: 0, connected: false };
  }

  const sources: ConferenceAudioSourceT[] = [];
  const local = room.localParticipant;
  local.audioTrackPublications.forEach((publication) => {
    pushPublication(sources, local.identity, publication, 'local');
  });
  room.remoteParticipants.forEach((participant) => {
    participant.audioTrackPublications.forEach((publication) => {
      pushPublication(sources, participant.identity, publication, 'remote');
    });
  });

  return {
    sources,
    participantCount: room.remoteParticipants.size + 1,
    connected: true,
  };
}

/**
 * Аудио конференции для локальной записи урока.
 * Подписка только читает публикации LiveKit и не меняет их жизненный цикл.
 */
export function useConferenceAudioSources(): ConferenceAudioSnapshotT {
  const { room } = useRoom();
  const [, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((current) => current + 1);
    const events = [
      RoomEvent.Connected,
      RoomEvent.Disconnected,
      RoomEvent.Reconnected,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
    ] as const;

    for (const event of events) room.on(event, bump);
    return () => {
      for (const event of events) room.off(event, bump);
    };
  }, [room]);

  return collectConferenceAudioSources(room);
}
