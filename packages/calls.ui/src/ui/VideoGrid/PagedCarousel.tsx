import React, { useState } from 'react';
import { PaginationControls } from './PaginationControls';
import { useSize } from '@xipkg/calls-hooks';

type Orientation = 'vertical' | 'horizontal';

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  orientation?: Orientation;
  /** соотношение сторон элементов (ширина/высота) */
  aspectRatio?: number;
  /** отступ между плитками, в px */
  gap?: number;
  /** минимальный размер элемента, в px */
  minItemSize?: number;
  /** максимальный размер элемента, в px */
  maxItemSize?: number;
  className?: string;
}

/**
 * Универсальная карусель с пагинацией
 * Динамически рассчитывает размеры элементов на основе контейнера
 * и соотношения сторон
 */
export function PagedCarousel<T>({
  items,
  renderItem,
  orientation = 'vertical',
  aspectRatio = 16 / 9, // по умолчанию 16:9
  gap = 8,
  minItemSize = 120,
  maxItemSize = 300,
  className,
}: CarouselProps<T>) {
  const [page, setPage] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const containerSize = useSize(containerRef as React.RefObject<HTMLDivElement>);

  const isVertical = orientation === 'vertical';

  /** Фиксированная высота полосы превью (не из ResizeObserver — там часто на 1–2px меньше) */
  const horizontalThumbHeight = React.useMemo(() => {
    if (isVertical) return null;
    return Math.ceil(maxItemSize / aspectRatio);
  }, [isVertical, maxItemSize, aspectRatio]);

  const horizontalItemSize = React.useMemo(() => {
    if (!horizontalThumbHeight) return null;

    const itemHeight = horizontalThumbHeight;
    const itemWidth = Math.max(minItemSize, Math.min(maxItemSize, itemHeight * aspectRatio));

    return { itemHeight, itemWidth };
  }, [horizontalThumbHeight, minItemSize, maxItemSize, aspectRatio]);

  // Рассчитываем количество элементов на основе контейнера
  const pageSize = React.useMemo(() => {
    if (!containerSize.width || (isVertical && !containerSize.height)) {
      return 4;
    }

    if (isVertical) {
      // Для вертикальной карусели: считаем по высоте
      const availableHeight = containerSize.height;
      const itemHeight = Math.max(minItemSize, Math.min(maxItemSize, availableHeight));
      const itemsPerPage = Math.floor(availableHeight / (itemHeight + gap));
      return Math.max(1, itemsPerPage);
    }

    const itemWidth = horizontalItemSize?.itemWidth ?? minItemSize;
    const itemsPerPage = Math.floor(containerSize.width / (itemWidth + gap));
    return Math.max(1, itemsPerPage);
  }, [containerSize, isVertical, gap, minItemSize, maxItemSize, horizontalItemSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const start = clampedPage * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const containerCls = [
    'relative flex shrink-0',
    isVertical
      ? 'min-h-0 h-full w-full overflow-hidden items-center justify-center px-2 xs:px-0'
      : 'w-full overflow-visible items-stretch justify-center',
    className ?? '',
  ].join(' ');

  const itemsCls = [
    'relative flex shrink-0',
    isVertical ? 'w-full flex-col' : 'h-full flex-row items-stretch',
  ].join(' ');

  const canPrev = clampedPage > 0;
  const canNext = clampedPage < totalPages - 1;

  return (
    <div
      ref={containerRef}
      className={containerCls}
      style={horizontalThumbHeight ? { height: horizontalThumbHeight } : undefined}
    >
      <div className={itemsCls} style={{ gap }}>
        {pageItems.map((item, i) => (
          <div
            key={i}
            className={`shrink-0 rounded-2xl ${isVertical ? 'overflow-hidden' : 'overflow-visible'}`}
            style={
              isVertical
                ? {
                    aspectRatio: aspectRatio,
                    minHeight: `${minItemSize}px`,
                    maxHeight: `${maxItemSize}px`,
                  }
                : horizontalItemSize
                  ? {
                      height: `${horizontalItemSize.itemHeight}px`,
                      width: `${horizontalItemSize.itemWidth}px`,
                    }
                  : { aspectRatio: aspectRatio }
            }
          >
            {renderItem(item, start + i)}
          </div>
        ))}

        <PaginationControls
          canPrev={canPrev}
          canNext={canNext}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          orientation={orientation}
        />
      </div>
    </div>
  );
}
