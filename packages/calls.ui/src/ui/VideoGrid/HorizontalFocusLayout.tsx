import React from 'react';
import { FocusStage } from './FocusStage';
import { PagedCarousel } from './PagedCarousel';

interface HorizontalFocusLayoutProps {
  focus: React.ReactNode; // сюда кладём видео фокусного участника
  thumbs: React.ReactNode[]; // превью участников
  className?: string;
}

/**
 * Горизонтальный FocusLayout: фокусная сцена + горизонтальная карусель вверху
 * Подходит для широких экранов и горизонтальной ориентации
 */
export function HorizontalFocusLayout({
  focus,
  thumbs,
  className = '',
}: HorizontalFocusLayoutProps) {
  return (
    <div className={`flex h-full min-h-0 w-full flex-col gap-1 px-1 py-0.5 ${className}`}>
      {/* Горизонтальная карусель вверху */}
      <div className="horizontal-focus-thumbs w-full shrink-0 overflow-visible pt-0.5">
        <PagedCarousel
          items={thumbs}
          orientation="horizontal"
          aspectRatio={16 / 9}
          minItemSize={150}
          maxItemSize={250}
          renderItem={(node) => (
            <div className="relative h-full w-full overflow-hidden">
              <div className="absolute inset-0">{node}</div>
            </div>
          )}
        />
      </div>

      {/* Сцена - занимает основное пространство */}
      <div className="focus-stage-area min-h-0 flex-1 overflow-visible">
        <FocusStage>{focus}</FocusStage>
      </div>
    </div>
  );
}
