import { useEffect, useState } from 'react';
import { useBoardChromeInsets } from '../boardChromeInsets';

/**
 * Максимальная высота контейнера compact call (видео + нижняя панель).
 * На доске учитывает отступы тулбара из CSS-переменных `--board-chrome-*`.
 */
export function useCompactAvailableHeight(isOnBoardPage: boolean): number {
  const insets = useBoardChromeInsets(isOnBoardPage);
  const [availableHeight, setAvailableHeight] = useState(() => {
    if (typeof window === 'undefined') return 400;
    return window.innerHeight - insets.top - insets.bottom;
  });

  useEffect(() => {
    const update = () => {
      setAvailableHeight(window.innerHeight - insets.top - insets.bottom);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [insets.top, insets.bottom]);

  return availableHeight;
}
