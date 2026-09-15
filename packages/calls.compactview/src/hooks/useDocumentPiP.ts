import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface DocumentPictureInPicture {
    requestWindow(options?: {
      width?: number;
      height?: number;
      disallowReturnToOpener?: boolean;
      preferInitialWindowPlacement?: boolean;
    }): Promise<Window>;
    window: Window | null;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface DocumentPictureInPictureEvent extends Event {}

  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
    __SOVLIUM_NATIVE__?: boolean;
  }

  // setMicrophoneActive / setCameraActive есть в Chrome 93+, в lib.dom.d.ts пока нет
  interface MediaSession {
    setMicrophoneActive(active: boolean): Promise<void> | void;
    setCameraActive(active: boolean): Promise<void> | void;
  }
}

function setMediaSessionCaptureState(
  setActive: ((active: boolean) => Promise<void> | void) | undefined,
  active: boolean,
) {
  if (!setActive) return;
  try {
    const result = setActive(active);
    result?.catch(() => {
      // Chrome отклоняет активацию без user gesture — ожидаемо вне обработчика клика
    });
  } catch {
    // ignore
  }
}

type UseDocumentPiPOptions = {
  width?: number;
  height?: number;
  enabled?: boolean;
  microphoneActive?: boolean;
  cameraActive?: boolean;
};

function applyDocumentTheme(sourceDoc: Document, targetDoc: Document) {
  const sourceEl = sourceDoc.documentElement;
  const targetEl = targetDoc.documentElement;
  const theme = sourceEl.getAttribute('data-theme');
  if (theme) {
    targetEl.setAttribute('data-theme', theme);
  } else {
    targetEl.removeAttribute('data-theme');
  }
  targetEl.className = sourceEl.className;
  const colorScheme = getComputedStyle(sourceEl).colorScheme;
  if (colorScheme) {
    targetEl.style.colorScheme = colorScheme;
    targetDoc.body.style.colorScheme = colorScheme;
  }
  const pageBg =
    getComputedStyle(sourceEl).getPropertyValue('--xi-background-page').trim() ||
    (theme === 'dark' ? '#1a1a1a' : '#ffffff');
  targetEl.style.height = '100%';
  targetEl.style.background = pageBg;
  targetDoc.body.style.margin = '0';
  targetDoc.body.style.height = '100%';
  targetDoc.body.style.overflow = 'hidden';
  targetDoc.body.style.background = pageBg;
}

function copyStylesToWindow(targetWindow: Window) {
  [...document.styleSheets].forEach((styleSheet) => {
    try {
      const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
      const style = document.createElement('style');
      style.textContent = cssRules;
      targetWindow.document.head.appendChild(style);
    } catch {
      if (styleSheet.href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = styleSheet.type || 'text/css';
        link.media = styleSheet.media.mediaText;
        link.href = styleSheet.href;
        targetWindow.document.head.appendChild(link);
      }
    }
  });

  try {
    document.fonts.forEach((font) => {
      targetWindow.document.fonts.add(font);
    });
  } catch {
    // ignore
  }
}

export function useDocumentPiP({
  width = 380,
  height = 270,
  enabled = true,
  microphoneActive = false,
  cameraActive = false,
}: UseDocumentPiPOptions = {}) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const micActiveRef = useRef(microphoneActive);
  const camActiveRef = useRef(cameraActive);

  micActiveRef.current = microphoneActive;
  camActiveRef.current = cameraActive;

  const isSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  // Chrome для авто-PiP при видеозвонках требует setCameraActive / setMicrophoneActive
  useEffect(() => {
    if (!enabled) return;

    const mediaSession = navigator.mediaSession as MediaSession;
    setMediaSessionCaptureState(
      'setMicrophoneActive' in mediaSession
        ? mediaSession.setMicrophoneActive.bind(mediaSession)
        : undefined,
      microphoneActive,
    );
    setMediaSessionCaptureState(
      'setCameraActive' in mediaSession
        ? mediaSession.setCameraActive.bind(mediaSession)
        : undefined,
      cameraActive,
    );
  }, [enabled, microphoneActive, cameraActive]);

  const openPiP = useCallback(
    async (overrides?: { width?: number; height?: number }): Promise<Window | null> => {
      if (!isSupported || !enabled) return null;
      if (pipWindowRef.current) return pipWindowRef.current;

      const w = overrides?.width ?? width;
      const h = overrides?.height ?? height;

      try {
        const pip = await window.documentPictureInPicture!.requestWindow({
          width: w,
          height: h,
        });

        copyStylesToWindow(pip);
        applyDocumentTheme(document, pip.document);

        const themeObserver = new MutationObserver(() => {
          applyDocumentTheme(document, pip.document);
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme', 'class', 'style'],
        });

        pipWindowRef.current = pip;
        setPipWindow(pip);

        try {
          pip.resizeTo(w, h);
        } catch {
          // ignore
        }

        pip.addEventListener('pagehide', () => {
          themeObserver.disconnect();
          pipWindowRef.current = null;
          setPipWindow(null);
        });

        return pip;
      } catch {
        return null;
      }
    },
    [isSupported, enabled, width, height],
  );

  const closePiP = useCallback(() => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
    }
  }, []);

  // Закрываем PiP при возврате на вкладку
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      // Native mini-window *is* the opener; closing on focus would expand
      // the call every time the user clicks the overlay.
      if (typeof window !== 'undefined' && window.__SOVLIUM_NATIVE__) return;
      if (!document.hidden && pipWindowRef.current) {
        closePiP();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, closePiP]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pipWindowRef.current?.close();
      pipWindowRef.current = null;
    };
  }, []);

  const resizePiP = useCallback((w: number, h: number) => {
    if (pipWindowRef.current) {
      try {
        pipWindowRef.current.resizeTo(w, h);
      } catch {
        // ignore
      }
    }
  }, []);

  return {
    isSupported,
    pipWindow,
    isPiPActive: pipWindow !== null,
    openPiP,
    closePiP,
    resizePiP,
  };
}
