import { ArrowLeft, ArrowRight } from '@xipkg/icons';

interface GridPaginationControlsProps {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoToPage?: (page: number) => void;
  currentPage: number;
  totalPages: number;
}

/**
 * Элементы управления пагинацией для grid режима
 * Показывает кнопки навигации и индикаторы страниц
 */
export function GridPaginationControls({
  canPrev,
  canNext,
  onPrev,
  onNext,
  onGoToPage,
  currentPage,
  totalPages,
}: GridPaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Кнопка "Предыдущая страница" */}
      <div className="pointer-events-auto absolute top-1/2 left-4 -translate-y-1/2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={onPrev}
          className="bg-background-subtle/80 hover:bg-background-subtle fill-icon-primary z-10 flex items-center justify-center rounded-full p-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Предыдущая страница</span>
        </button>
      </div>

      {/* Кнопка "Следующая страница" */}
      <div className="pointer-events-auto absolute top-1/2 right-4 -translate-y-1/2">
        <button
          type="button"
          disabled={!canNext}
          onClick={onNext}
          className="bg-background-subtle/80 hover:bg-background-subtle fill-icon-primary z-10 flex items-center justify-center rounded-full p-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowRight className="h-4 w-4" />
          <span className="sr-only">Следующая страница</span>
        </button>
      </div>

      {/* Индикатор страниц внизу */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="bg-background-subtle/80 flex gap-2 rounded-full px-3 py-1">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onGoToPage?.(index + 1)}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentPage - 1
                  ? 'bg-background-canvas'
                  : 'bg-background-canvas/50 hover:bg-background-canvas/75'
              }`}
              aria-label={`Страница ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
