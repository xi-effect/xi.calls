import {
  PointerSensor,
  TouchSensor,
  type PointerSensorOptions,
  type PointerSensorProps,
} from '@dnd-kit/core';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * dnd-kit отменяет drag на window `resize`. На планшете жест меняет visual viewport
 * (тулбар, dvh) и браузер шлёт resize сразу после старта: зоны уже видны, а перенос обрывается.
 */
const detachResizeCancel = (sensor: object, event: Event) => {
  const target = event.target;
  const view =
    target instanceof Node
      ? (target.ownerDocument?.defaultView ?? null)
      : 'view' in event && event.view instanceof Window
        ? event.view
        : null;

  if (!view) return;

  view.removeEventListener('resize', (sensor as { handleCancel: EventListener }).handleCancel);
};

/**
 * Мышь и стилус. Палец сюда не берём: PointerSensor на iOS отменяет касание (pointercancel),
 * потому что preventDefault на pointermove там не работает.
 */
export class CompactPointerSensor extends PointerSensor {
  constructor(props: PointerSensorProps) {
    super(props);
    detachResizeCancel(this, props.event);
  }

  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (
        { nativeEvent: event }: ReactPointerEvent,
        { onActivation }: PointerSensorOptions,
      ) => {
        if (!event.isPrimary || event.button !== 0 || event.pointerType === 'touch') {
          return false;
        }

        onActivation?.({ event });
        return true;
      },
    },
  ];
}

/** Палец. TouchSensor заранее вешает non-passive touchmove, без этого iOS Safari гасит жест. */
export class CompactTouchSensor extends TouchSensor {
  constructor(props: PointerSensorProps) {
    super(props);
    detachResizeCancel(this, props.event);
  }
}
