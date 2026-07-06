import { useEffect, useState } from 'react';

const getVisualViewportHeight = (): number | undefined => {
  if (typeof window === 'undefined') return undefined;
  return window.visualViewport?.height ?? window.innerHeight;
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
 * актуальную видимую высоту (за вычетом адресной строки/клавиатуры) и одинаково на
 * всех платформах — на десктопе и в браузерах без адресной строки поверх контента он
 * совпадает с `window.innerHeight`, поэтому применение этого хука безопасно и не меняет
 * поведение вне iOS Safari.
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
