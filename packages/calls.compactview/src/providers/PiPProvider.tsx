import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocalParticipant } from '@livekit/components-react';
import { useDocumentPiP, useCompactNavigation } from '../hooks';
import { PiPCompactCall } from '../ui';
import { useCallStore } from '@xipkg/calls-store';
import { useRoom } from '@xipkg/calls-providers';
import { usePhoneLayout } from '@xipkg/calls-utils';
import { getPipHeightForMode, PIP_HEIGHT_BASIC_PX, PIP_PANEL_WIDTH_PX } from '../constants';

type PiPContextValue = {
  openPiP: () => Promise<void>;
  isPiPActive: boolean;
  isSupported: boolean;
  resizePiPTo: (height: number) => void;
};

const PiPContext = createContext<PiPContextValue | null>(null);

export function usePiP() {
  const ctx = useContext(PiPContext);
  return ctx;
}

function getMediaStreamTrack(
  pub: { track?: { mediaStreamTrack?: MediaStreamTrack } } | undefined,
): MediaStreamTrack | undefined {
  return pub?.track?.mediaStreamTrack;
}

function useMediaCaptureLive() {
  const { microphoneTrack, cameraTrack } = useLocalParticipant();
  const micTrack = getMediaStreamTrack(microphoneTrack);
  const camTrack = getMediaStreamTrack(cameraTrack);
  const micLive = !!micTrack && micTrack.readyState === 'live' && micTrack.enabled;
  const camLive = !!camTrack && camTrack.readyState === 'live' && camTrack.enabled;
  return { micLive, camLive };
}

type PiPProviderProps = {
  children: React.ReactNode;
};

/**
 * Предоставляет API PiP (openPiP, isSupported) дочерним компонентам и управляет
 * Document Picture-in-Picture (логика из PiPManager).
 */
export function PiPProvider({ children }: PiPProviderProps) {
  const isMobile = usePhoneLayout();
  const { micLive, camLive } = useMediaCaptureLive();
  const { room } = useRoom();
  const compactViewMode = useCallStore((s) => s.compactViewMode);
  const { totalParticipants } = useCompactNavigation();

  const {
    pipWindow,
    closePiP,
    resizePiP,
    openPiP: openPiPRaw,
    isSupported,
  } = useDocumentPiP({
    enabled: !isMobile,
    width: PIP_PANEL_WIDTH_PX,
    height: PIP_HEIGHT_BASIC_PX,
    microphoneActive: micLive,
    cameraActive: camLive,
  });

  const openPiP = useCallback(async () => {
    const width = PIP_PANEL_WIDTH_PX;
    const height = getPipHeightForMode(compactViewMode, totalParticipants);
    const pip = await openPiPRaw({ width, height });
    if (pip) {
      // requestWindow не всегда сразу даёт нужный innerHeight — подгоняем сразу при открытии
      requestAnimationFrame(() => {
        resizePiP?.(width, height);
      });
    }
  }, [openPiPRaw, resizePiP, compactViewMode, totalParticipants]);

  useEffect(() => {
    if (!room || !pipWindow) return;
    if (room.state !== 'connected') {
      closePiP();
      return;
    }
    const handleState = () => {
      if (room.state !== 'connected') closePiP();
    };
    room.on('connectionStateChanged', handleState);
    return () => {
      room.off('connectionStateChanged', handleState);
    };
  }, [room, pipWindow, closePiP]);

  const resizePiPTo = useCallback(
    (height: number) => {
      resizePiP?.(PIP_PANEL_WIDTH_PX, height);
    },
    [resizePiP],
  );

  const openPiPRef = useRef(openPiP);
  openPiPRef.current = openPiP;

  // Media Session PiP — с корректной высотой под текущий режим (не дефолт basic)
  useEffect(() => {
    if (!isSupported || isMobile) return;

    const action = 'enterpictureinpicture' as MediaSessionAction;
    try {
      navigator.mediaSession.setActionHandler(action, () => {
        void openPiPRef.current();
      });
    } catch {
      // enterpictureinpicture не поддерживается
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // ignore
      }
    };
  }, [isSupported, isMobile]);

  const value: PiPContextValue = {
    openPiP,
    isPiPActive: pipWindow !== null,
    isSupported: isSupported && !isMobile,
    resizePiPTo,
  };

  return (
    <PiPContext.Provider value={value}>
      {children}
      {pipWindow &&
        createPortal(
          <PiPCompactCall pipWindow={pipWindow} resizePiPTo={resizePiPTo} />,
          pipWindow.document.body,
        )}
    </PiPContext.Provider>
  );
}
