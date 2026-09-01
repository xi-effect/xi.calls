import { createContext, useContext, ReactNode, useMemo } from 'react';
import { Room, RoomOptions, ConnectionQuality, Track, VideoPresets } from 'livekit-client';
import { getBaselineAudioCaptureOptions } from '@xipkg/calls-config';

type RoomContextTypeT = {
  room: Room;
};

const RoomContext = createContext<RoomContextTypeT | null>(null);

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};

type RoomProviderProps = {
  children: ReactNode;
};

// Определяем, является ли устройство мобильным
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const RoomProvider = ({ children }: RoomProviderProps) => {
  // Создаем комнату только один раз при монтировании компонента
  // с настройками для устойчивого соединения
  const room = useMemo(() => {
    const roomOptions: RoomOptions = {
      // Не отключаемся при потере фокуса
      stopLocalTrackOnUnpublish: false,
      // AdaptiveStream нельзя включать «чтобы видео жило в фоне»: он глушит
      // удалённый поток, когда <video> не виден или нулевого размера (compact,
      // свёрнутая вкладка). Фон/расфокус держит KeepVideosPlaying.
      adaptiveStream: false,
      // Dynacast вызывает частые renegotiation при смене подписок — на локальном сервере
      // это часто приводит к NegotiationError: negotiation timed out
      dynacast: false,
      disconnectOnPageLeave: false,
      audioCaptureDefaults: getBaselineAudioCaptureOptions(),
      // Раз adaptiveStream выключен, подписчик всегда берёт верхний simulcast-слой,
      // независимо от размера плитки. На 720p это ~1.7 Мбит/с на каждого участника:
      // группа из 4 человек упирается в домашний канал и рвёт соединение. 540p
      // держит вдвое меньший поток при том же субъективном качестве в сетке.
      videoCaptureDefaults: {
        resolution: VideoPresets.h540.resolution,
      },
      publishDefaults: {
        simulcast: true,
        videoEncoding: VideoPresets.h540.encoding,
        videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
      },
    };

    const newRoom = new Room(roomOptions);

    // Обработка событий переподключения
    newRoom.on('reconnecting', () => {
      console.log('LiveKit: Attempting to reconnect...');
    });

    newRoom.on('reconnected', () => {
      console.log('LiveKit: Successfully reconnected');
    });

    // Улучшенный мониторинг качества соединения
    let lastQuality: ConnectionQuality | null = null;
    newRoom.on('connectionQualityChanged', (quality: ConnectionQuality) => {
      if (quality !== lastQuality) {
        lastQuality = quality;

        if (quality === 'poor' || quality === 'unknown') {
          console.warn('LiveKit: Connection quality degraded:', quality);
          // Можно добавить уведомление пользователю через toast
        } else if (quality === 'excellent' && lastQuality === 'poor') {
          console.log('LiveKit: Connection quality improved');
        }
      }
    });

    // Обработка ошибок соединения
    newRoom.on('connectionStateChanged', (state) => {
      console.log('LiveKit: Connection state changed:', state);
    });

    // Обработка публикации треков
    newRoom.on('trackPublished', (publication, participant) => {
      if (publication.kind === Track.Kind.Video) {
        console.log('LiveKit: Video track published by', participant.identity);
      }
    });

    // Оптимизация для мобильных устройств
    if (isMobileDevice()) {
      // На мобильных устройствах можно дополнительно оптимизировать
      console.log('LiveKit: Mobile device detected - applying optimizations');
    }

    return newRoom;
  }, []);

  return <RoomContext.Provider value={{ room }}>{children}</RoomContext.Provider>;
};
