import { ArrowLeft, ArrowRight } from '@xipkg/icons';

interface CompactNavigationControlsProps {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  totalParticipants: number;
}

/**
 * Элементы управления навигацией для компактного вида
 * Показывает кнопки навигации и индикаторы участников только при наведении
 */
export function CompactNavigationControls({
  canPrev,
  canNext,
  onPrev,
  onNext,
  currentIndex,
  totalParticipants,
}: CompactNavigationControlsProps) {
  if (totalParticipants <= 1) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Индикатор участников вверху */}
      <div className="pointer-events-auto absolute top-2 left-1/2 -translate-x-1/2">
        <div className="bg-background-subtle/80 flex gap-1 rounded-full px-2 py-1 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
          {Array.from({ length: totalParticipants }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                // Здесь можно добавить логику для прямого перехода к участнику
                // Пока оставляем только навигацию через кнопки
              }}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-background-canvas'
                  : 'bg-background-canvas/50 hover:bg-background-canvas/75'
              }`}
              aria-label={`Участник ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Кнопка "Предыдущий участник" */}
      <div className="pointer-events-auto absolute top-1/2 left-2 -translate-y-1/2 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
        <button
          type="button"
          disabled={!canPrev}
          onClick={onPrev}
          className="bg-background-subtle/80 hover:bg-background-subtle fill-icon-primary z-10 flex items-center justify-center rounded-full p-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Предыдущий участник</span>
        </button>
      </div>

      {/* Кнопка "Следующий участник" */}
      <div className="pointer-events-auto absolute top-1/2 right-2 -translate-y-1/2 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
        <button
          type="button"
          disabled={!canNext}
          onClick={onNext}
          className="bg-background-subtle/80 hover:bg-background-subtle fill-icon-primary z-10 flex items-center justify-center rounded-full p-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowRight className="h-4 w-4" />
          <span className="sr-only">Следующий участник</span>
        </button>
      </div>
    </div>
  );
}
