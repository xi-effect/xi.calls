import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Popover, PopoverContent } from '@xipkg/popover';
import { Check, Conference, Microphone } from '@xipkg/icons';
import { cn } from '@xipkg/utils';
import { useTranslation } from 'react-i18next';

const HOVER_OPEN_DELAY_MS = 1000;
// Даёт курсору время "перепрыгнуть" зазор между кнопкой и попапом (sideOffset),
// не закрывая меню раньше, чем пользователь успеет навести на него.
const HOVER_CLOSE_DELAY_MS = 300;

type DeviceHoverMenuPropsT = {
  devices?: MediaDeviceInfo[];
  activeDeviceId?: string;
  // useSwitchDevice.handler возвращает Promise<void> — мы его сознательно не
  // ждём (см. selectDeviceHandler): закрыть попап сразу по клику правильнее,
  // чем дожидаться завершения переключения устройства.
  onSelectDevice?: (deviceId: string) => void | Promise<void>;
  children: ReactNode;
};

export const DeviceHoverMenu = ({
  devices,
  activeDeviceId,
  onSelectDevice,
  children,
}: DeviceHoverMenuPropsT) => {
  const { t } = useTranslation('calls');
  const [isOpen, setIsOpen] = useState(false);
  // Открытие и закрытие никогда не ждут одновременно: каждый обработчик сначала
  // отменяет то, что уже запланировано, так что одного таймера достаточно.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearPendingTimeoutHandler = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  useEffect(() => clearPendingTimeoutHandler, [clearPendingTimeoutHandler]);

  const selectDeviceHandler = useCallback(
    (deviceId: string) => {
      setIsOpen(false);
      onSelectDevice?.(deviceId);
    },
    [onSelectDevice],
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
  // тот же экземпляр, просто с другим return), поэтому isOpen сам не сбросится.
  // Без этого при кратковременном схлопывании списка (например, дребезг
  // Bluetooth/USB-устройства) и последующем восстановлении попап может
  // открыться сразу, минуя задержку на hover.
  useEffect(() => {
    if (!hasSelectableDevices) {
      clearPendingTimeoutHandler();
      setIsOpen(false);
    }
  }, [hasSelectableDevices, clearPendingTimeoutHandler]);

  if (!hasSelectableDevices) {
    return children;
  }

  // Наведение и на кнопку, и на сам попап держат меню открытым: курсору нужно
  // время, чтобы "перепрыгнуть" зазор между ними (sideOffset у PopoverContent),
  // а сам попап рендерится порталом вне DOM обёртки, поэтому его наведение
  // нужно отслеживать отдельно.
  const schedulePopoverOpenHandler = () => {
    clearPendingTimeoutHandler();
    if (!isOpen) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = undefined;
        setIsOpen(true);
      }, HOVER_OPEN_DELAY_MS);
    }
  };

  const schedulePopoverCloseHandler = () => {
    clearPendingTimeoutHandler();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = undefined;
      setIsOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  };

  // onOpenChange не про hover: Anchor (не Trigger) не даёт Radix открыть попап
  // самому — единственный путь сюда — DismissableLayer при Escape или
  // клике/фокусе вне попапа, и закрытие в обход HOVER_CLOSE_DELAY_MS в этом
  // случае корректно (осознанный уход, а не отвод курсора). Чистим таймер на
  // всякий случай: если в этот момент как раз тикал наш CLOSE-таймер, он не
  // должен вхолостую сработать позже поверх уже закрытого попапа.
  const updatePopoverOpenStateHandler = (open: boolean) => {
    if (!open) {
      clearPendingTimeoutHandler();
    }
    setIsOpen(open);
  };

  return (
    <div
      className="relative"
      onMouseEnter={schedulePopoverOpenHandler}
      onMouseLeave={schedulePopoverCloseHandler}
    >
      <Popover open={isOpen} onOpenChange={updatePopoverOpenStateHandler}>
        <PopoverPrimitive.Anchor asChild>{children}</PopoverPrimitive.Anchor>
        <PopoverContent
          side="top"
          align="center"
          sideOffset={8}
          className="w-56 rounded-xl p-1"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onMouseEnter={schedulePopoverOpenHandler}
          onMouseLeave={schedulePopoverCloseHandler}
        >
          <ul className="flex flex-col gap-0.5">{deviceItems}</ul>
        </PopoverContent>
      </Popover>
    </div>
  );
};
