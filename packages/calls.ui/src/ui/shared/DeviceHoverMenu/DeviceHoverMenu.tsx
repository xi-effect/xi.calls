import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MouseEvent, PointerEvent, ReactNode } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Popover, PopoverContent } from '@xipkg/popover';
import { Check, Conference, Microphone } from '@xipkg/icons';
import { cn } from '@xipkg/utils';
import { useTranslation } from 'react-i18next';

const HOVER_OPEN_DELAY_MS = 1000;
// Даёт курсору время "перепрыгнуть" зазор между кнопкой и попапом (sideOffset),
// не закрывая меню раньше, чем пользователь успеет навести на него.
const HOVER_CLOSE_DELAY_MS = 300;
// На планшетах/телефонах нет hover — открываем тем же попапом по долгому тапу
// (стандартный порог long-press в мобильных UI).
const LONG_PRESS_DELAY_MS = 500;

const isMousePointer = (event: PointerEvent) => event.pointerType === 'mouse';

type DeviceHoverMenuPropsT = {
  devices?: MediaDeviceInfo[];
  activeDeviceId?: string;
  onSelectDevice?: (deviceId: string) => void | Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export const DeviceHoverMenu = ({
  devices,
  activeDeviceId,
  onSelectDevice,
  open,
  onOpenChange,
  children,
}: DeviceHoverMenuPropsT) => {
  const { t } = useTranslation('calls');
  // Открытие и закрытие никогда не ждут одновременно: каждый обработчик сначала
  // отменяет то, что уже запланировано, так что одного таймера достаточно.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // true между тем, как long-press реально открыл попап, и последующим pointerup
  // на том же тапе — нужен, чтобы погасить синтетический click, который браузер
  // шлёт после touch, иначе он тут же переключит мьют/анмьют следом за открытием.
  const longPressOpenedRef = useRef(false);

  const clearPendingTimeoutHandler = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  useEffect(() => clearPendingTimeoutHandler, [clearPendingTimeoutHandler]);

  const selectDeviceHandler = useCallback(
    (deviceId: string) => {
      onOpenChange(false);
      onSelectDevice?.(deviceId);
    },
    [onSelectDevice, onOpenChange],
  );

  // TrackToggle ре-рендерится ~30 раз/сек (индикатор громкости микрофона),
  // поэтому список пересчитываем только при смене устройств/активного id,
  // а не на каждый такой ре-рендер.
  const deviceItems = useMemo(
    () =>
      devices?.map((device) => {
        const isActive = device.deviceId === activeDeviceId;
        const DeviceIcon = device.kind === 'videoinput' ? Conference : Microphone;
        return (
          <li key={device.deviceId}>
            <button
              type="button"
              onClick={() => selectDeviceHandler(device.deviceId)}
              className={cn(
                'text-text-primary hover:bg-selection-background flex w-full items-center gap-2 rounded-lg bg-white p-2 text-left text-sm transition-colors',
                isActive && 'bg-selection-background',
              )}
            >
              <DeviceIcon width={14} className="fill-icon-primary shrink-0" />
              <span className="flex-1 truncate">
                {device.label ||
                  t('settings.device.unnamed', { shortId: device.deviceId.slice(0, 8) })}
              </span>
              {isActive && <Check className="fill-selection-icon size-5 shrink-0" />}
            </button>
          </li>
        );
      }),
    [devices, activeDeviceId, selectDeviceHandler, t],
  );

  // devices[0] как индикатор для всего списка: без разрешения на устройство
  // браузер анонимизирует deviceId у ВСЕХ записей сразу (все '' или все
  // реальные) — смешанного списка enumerateDevices не отдаёт, так что
  // проверки первого элемента достаточно.
  const hasSelectableDevices = !!devices && devices.length > 1 && devices[0].deviceId !== '';

  // Компонент не размонтируется при переходе hasSelectableDevices -> false (это
  // тот же экземпляр, просто с другим return), поэтому open сам не сбросится.
  // Без этого при кратковременном схлопывании списка (например, дребезг
  // Bluetooth/USB-устройства) и последующем восстановлении попап может
  // открыться сразу, минуя задержку на hover. Шлём onOpenChange(false) только
  // если это меню сейчас и есть открытое — иначе, будучи уже закрытым, оно
  // затёрло бы общий "какое меню открыто" стейт и закрыло бы соседа.
  useEffect(() => {
    if (!hasSelectableDevices && open) {
      clearPendingTimeoutHandler();
      onOpenChange(false);
    }
  }, [hasSelectableDevices, open, onOpenChange, clearPendingTimeoutHandler]);

  if (!hasSelectableDevices) {
    return children;
  }

  // Наведение и на кнопку, и на сам попап держат меню открытым: курсору нужно
  // время, чтобы "перепрыгнуть" зазор между ними (sideOffset у PopoverContent),
  // а сам попап рендерится порталом вне DOM обёртки, поэтому его наведение
  // нужно отслеживать отдельно. Актуально только для мыши: touch/pen "enter"
  // срабатывает в момент касания одновременно с pointerdown, и это не hover —
  // им занимается отдельная long-press-логика ниже.
  const schedulePopoverOpenHandler = (event: PointerEvent) => {
    if (!isMousePointer(event)) return;
    clearPendingTimeoutHandler();
    if (!open) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = undefined;
        onOpenChange(true);
      }, HOVER_OPEN_DELAY_MS);
    }
  };

  const schedulePopoverCloseHandler = (event: PointerEvent) => {
    if (!isMousePointer(event)) {
      // Палец соскользнул с кнопки/попапа или отпущен раньше LONG_PRESS_DELAY_MS —
      // просто гасим отложенное открытие, никакой задержки на закрытие для touch нет:
      // если попап уже открыт, он остаётся открытым до тапа по пункту или мимо.
      clearPendingTimeoutHandler();
      return;
    }
    clearPendingTimeoutHandler();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = undefined;
      onOpenChange(false);
    }, HOVER_CLOSE_DELAY_MS);
  };

  // Долгий тап — открытие попапа на устройствах без hover (планшеты/телефоны).
  const startLongPressHandler = (event: PointerEvent) => {
    if (isMousePointer(event) || open) return;
    // Сбрасываем на случай, если предыдущий тап так и не получил свой
    // синтетический click (см. suppressGhostClickHandler) — иначе флаг
    // мог бы застрять и погасить клик уже от совсем другого нажатия.
    longPressOpenedRef.current = false;
    clearPendingTimeoutHandler();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = undefined;
      longPressOpenedRef.current = true;
      onOpenChange(true);
    }, LONG_PRESS_DELAY_MS);
  };

  const endLongPressHandler = (event: PointerEvent) => {
    if (isMousePointer(event)) return;
    clearPendingTimeoutHandler();
  };

  // Мобильные браузеры шлют обычный click вслед за touch/pen-нажатием
  // независимо от pointer-событий (в спеке это завязано на preventDefault на
  // pointerdown/pointerup, что не везде надёжно) — поэтому гасим его сами на
  // capture-фазе, раньше, чем он дойдёт до onClick кнопки мьюта/анмьюта.
  const suppressGhostClickHandler = (event: MouseEvent) => {
    if (!longPressOpenedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    longPressOpenedRef.current = false;
  };

  // onOpenChange не про hover: Anchor (не Trigger) не даёт Radix открыть попап
  // самому — единственный путь сюда — DismissableLayer при Escape или
  // клике/фокусе вне попапа, и закрытие в обход HOVER_CLOSE_DELAY_MS в этом
  // случае корректно (осознанный уход, а не отвод курсора). Чистим таймер на
  // всякий случай: если в этот момент как раз тикал наш CLOSE-таймер, он не
  // должен вхолостую сработать позже поверх уже закрытого попапа.
  const updatePopoverOpenStateHandler = (nextOpen: boolean) => {
    if (!nextOpen) {
      clearPendingTimeoutHandler();
    }
    onOpenChange(nextOpen);
  };

  return (
    <div
      className="relative"
      onPointerEnter={schedulePopoverOpenHandler}
      onPointerLeave={schedulePopoverCloseHandler}
      onPointerDown={startLongPressHandler}
      onPointerUp={endLongPressHandler}
      onPointerCancel={endLongPressHandler}
      onClickCapture={suppressGhostClickHandler}
    >
      <Popover open={open} onOpenChange={updatePopoverOpenStateHandler}>
        <PopoverPrimitive.Anchor asChild>{children}</PopoverPrimitive.Anchor>
        <PopoverContent
          side="top"
          align="center"
          sideOffset={8}
          className="w-80 rounded-xl p-1"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerEnter={schedulePopoverOpenHandler}
          onPointerLeave={schedulePopoverCloseHandler}
        >
          <ul className="flex flex-col gap-0.5">{deviceItems}</ul>
        </PopoverContent>
      </Popover>
    </div>
  );
};
