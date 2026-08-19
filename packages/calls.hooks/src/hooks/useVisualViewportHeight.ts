import { useEffect, useState } from 'react';

const PINCH_SCALE_EPSILON = 0.01;

const getVisualViewportHeight = (): number | undefined => {
  if (typeof window === 'undefined') return undefined;
  const viewport = window.visualViewport;
  if (!viewport) return window.innerHeight;

  // Pinch-zoom на трекпаде уменьшает visualViewport.height, но ширина layout
  // остаётся прежней. Если отдать эту высоту контейнеру звонка, сетка считает
  // раскладку для широкого и очень низкого прямоугольника и складывает все
  // плитки в одну строку. Для pinch берём высоту layout viewport.
  if (Math.abs(viewport.scale - 1) > PINCH_SCALE_EPSILON) {
    return window.innerHeight;
  }

  return viewport.height;
};

/**
 * Реальная высота видимой области экрана (без части, скрытой под адресной строкой/
 * системными панелями браузера).
 *
 * На мобильном Safari (iOS) `100%`/`100dvh`, унаследованные от `html`/`body` вверх по
 * дереву хост-приложения, не всегда совпадают с фактически видимой областью: известный
 * баг WebKit — значение `dvh` может «залипнуть» на большем (адресная строка скрыта)
 * значении при первой отрисовке страницы и не пересчитаться, пока не произойдёт scroll.
 * Из-за этого контент, зависящий от `height: 100%`/`100dvh` по цепочке предков (в т.ч.
 * панель управления звонком внизу экрана), может оказаться ниже реально видимой области.
 *
 * `window.visualViewport` в отличие от `window.innerHeight`/`dvh` всегда отражает
 * актуальную видимую высоту (за вычетом адресной строки/клавиатуры). На десктопе
 * без pinch-zoom он совпадает с `window.innerHeight`. Во время pinch-zoom
 * (`visualViewport.scale !== 1`) высота layout не меняется — хук возвращает
 * `innerHeight`, чтобы не схлопывать сетку.
 */
export const useVisualViewportHeight = (): number | undefined => {
  const [height, setHeight] = useState<number | undefined>(getVisualViewportHeight);

  useEffect(() => {
    const update = () => setHeight(getVisualViewportHeight());
    update();

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return height;
};
