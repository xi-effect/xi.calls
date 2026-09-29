import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, ReactNode } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Popover, PopoverContent } from '@xipkg/popover';
import { Check } from '@xipkg/icons';
import { cn } from '@xipkg/utils';
import { useTranslation } from 'react-i18next';
import type { DeviceMenuGroupT, DeviceMenuGroupKindT } from '@xipkg/calls-hooks';

const HOVER_OPEN_DELAY_MS = 700;
// Даёт курсору время "перепрыгнуть" зазор между кнопкой и попапом (sideOffset),
// не закрывая меню раньше, чем пользователь успеет навести на него.
const HOVER_CLOSE_DELAY_MS = 300;
// На планшетах/телефонах нет hover — открываем тем же попапом по долгому тапу
// (стандартный порог long-press в мобильных UI).
const LONG_PRESS_DELAY_MS = 500;

const isMousePointer = (event: PointerEvent) => event.pointerType === 'mouse';

const GROUP_LABEL_KEYS: Record<DeviceMenuGroupKindT, string> = {
  audioinput: 'settings.microphone',
  audiooutput: 'settings.speakers',
  videoinput: 'settings.camera',
};

// Без разрешения на устройство браузер анонимизирует deviceId у ВСЕХ записей
// одного kind сразу (все '' или все реальные) — смешанного списка
// enumerateDevices не отдаёт, так что проверки первого элемента достаточно.
const hasRealDeviceIds = (devices: MediaDeviceInfo[] | undefined) =>
  !!devices && devices.length > 0 && devices[0].deviceId !== '';

type DeviceHoverMenuPropsT = {
  /**
   * Секции попапа: у микрофона это сам микрофон + динамики, у камеры — только
   * камера. Секции без доступных устройств отсеиваются здесь же.
   */
  groups?: DeviceMenuGroupT[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export const DeviceHoverMenu = ({
  groups,
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
  // Нажатие по кнопке — это команда мьюта, а не запрос списка устройств.
  // Держим hover-открытие заблокированным до тех пор, пока курсор не уйдёт с
  // кнопки и не вернётся осознанно: иначе попап всплывёт поверх только что
  // нажатой кнопки просто потому, что курсор на ней задержался.
  const hoverOpenSuppressedRef = useRef(false);
  // Попап рендерится порталом. В Document PiP портал по умолчанию уходит в
  // document основного окна, где его не видно, — поэтому берём document той
  // кнопки, рядом с которой стоим.
  const [anchorNode, setAnchorNode] = useState<HTMLDivElement | null>(null);
  const portalContainer = anchorNode?.ownerDocument?.body;

  const clearPendingTimeoutHandler = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  useEffect(() => clearPendingTimeoutHandler, [clearPendingTimeoutHandler]);

  const selectDeviceHandler = useCallback(
    (group: DeviceMenuGroupT, deviceId: string) => {
      onOpenChange(false);
      group.onSelectDevice?.(deviceId);
    },
    [onOpenChange],
  );

  const visibleGroups = useMemo(
    () => groups?.filter((group) => hasRealDeviceIds(group.devices)) ?? [],
    [groups],
  );
  // Смысл есть, только если хоть в одной секции есть между чем выбирать:
  // один микрофон + один динамик переключать не на что, а один микрофон и три
  // динамика — уже повод показать попап (раньше он в этом случае не всплывал).
  const hasSelectableDevices = visibleGroups.some((group) => group.devices.length > 1);

  // TrackToggle ре-рендерится ~30 раз/сек (индикатор громкости микрофона),
  // поэтому список пересчитываем только при смене устройств/активного id,
  // а не на каждый такой ре-рендер.
  const groupItems = useMemo(
    () =>
      visibleGroups.map((group, groupIndex) => (
        <Fragment key={group.kind}>
          {/* Заголовок показываем всегда, в том числе у единственной секции:
              иконки в строках только дублировали бы его для каждого устройства. */}
          <li
            className={cn(
              'text-text-secondary px-2 pt-1.5 pb-1 text-xs',
              groupIndex > 0 && 'border-border-default mt-1.5 border-t pt-2.5',
            )}
            aria-hidden
          >
            {t(GROUP_LABEL_KEYS[group.kind])}
          </li>
          {group.devices.map((device) => {
            const isActive = device.deviceId === group.activeDeviceId;
            return (
              <li key={`${group.kind}-${device.deviceId}`}>
                <button
                  type="button"
                  onClick={() => selectDeviceHandler(group, device.deviceId)}
                  className={cn(
                    'text-text-primary hover:bg-selection-background flex w-full items-center gap-2 rounded-lg bg-transparent px-2 py-1.5 text-left text-sm transition-colors',
                    isActive && 'bg-selection-background',
                  )}
                >
                  <span className="flex-1 truncate">
                    {device.label ||
                      t('settings.device.unnamed', { shortId: device.deviceId.slice(0, 8) })}
                  </span>
                  {isActive && <Check className="fill-selection-icon size-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </Fragment>
      )),
    [visibleGroups, selectDeviceHandler, t],
  );

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

  // События из PopoverContent всплывают сюда по дереву React, хотя в DOM портал
  // лежит отдельно. Для обработчиков самой кнопки это чужие события.
  const isInsideAnchor = (event: PointerEvent | MouseEvent) =>
    event.currentTarget instanceof Node && event.currentTarget.contains(event.target as Node);

  // Наведение и на кнопку, и на сам попап держат меню открытым: курсору нужно
  // время, чтобы "перепрыгнуть" зазор между ними (sideOffset у PopoverContent),
  // а сам попап рендерится порталом вне DOM обёртки, поэтому его наведение
  // нужно отслеживать отдельно. Актуально только для мыши: touch/pen "enter"
  // срабатывает в момент касания одновременно с pointerdown, и это не hover —
  // им занимается отдельная long-press-логика ниже.
  const schedulePopoverOpenHandler = (event: PointerEvent) => {
    if (!isMousePointer(event)) return;
    clearPendingTimeoutHandler();
    if (open || hoverOpenSuppressedRef.current) return;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = undefined;
      onOpenChange(true);
    }, HOVER_OPEN_DELAY_MS);
  };

  const schedulePopoverCloseHandler = (event: PointerEvent) => {
    // Курсор ушёл с кнопки — следующее наведение снова считается осознанным.
    hoverOpenSuppressedRef.current = false;
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
  const pointerDownHandler = (event: PointerEvent) => {
    if (!isInsideAnchor(event)) return;

    if (isMousePointer(event)) {
      // Правая кнопка — это запрос меню (см. contextMenuHandler), её гасить нельзя.
      if (event.button !== 0) return;
      // Пользователь целится в мьют, а не в список: снимаем уже запущенный
      // отсчёт и не начинаем новый, пока курсор не покинет кнопку.
      clearPendingTimeoutHandler();
      hoverOpenSuppressedRef.current = true;
      // Открытый попап при этом закрываем — клик по кнопке завершает
      // взаимодействие, оставлять список висеть поверх неё незачем.
      if (open) onOpenChange(false);
      return;
    }

    if (open) return;
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
    if (isMousePointer(event) || !isInsideAnchor(event)) return;
    clearPendingTimeoutHandler();
  };

  // Правый клик по кнопке — привычный способ попросить список, не дожидаясь
  // задержки на hover (и единственный, если hover только что был подавлен кликом).
  const contextMenuHandler = (event: MouseEvent) => {
    if (!isInsideAnchor(event)) return;
    event.preventDefault();
    clearPendingTimeoutHandler();
    hoverOpenSuppressedRef.current = false;
    onOpenChange(true);
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
      ref={setAnchorNode}
      className="relative"
      onPointerEnter={schedulePopoverOpenHandler}
      onPointerLeave={schedulePopoverCloseHandler}
      onPointerDown={pointerDownHandler}
      onPointerUp={endLongPressHandler}
      onPointerCancel={endLongPressHandler}
      onContextMenu={contextMenuHandler}
      onClickCapture={suppressGhostClickHandler}
    >
      <Popover open={open} onOpenChange={updatePopoverOpenStateHandler}>
        <PopoverPrimitive.Anchor asChild>{children}</PopoverPrimitive.Anchor>
        <PopoverContent
          side="top"
          align="center"
          sideOffset={8}
          container={portalContainer}
          className="z-1000 w-80 max-w-[calc(100vw-16px)] rounded-xl p-1"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerEnter={schedulePopoverOpenHandler}
          onPointerLeave={schedulePopoverCloseHandler}
        >
          <ul className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto">{groupItems}</ul>
        </PopoverContent>
      </Popover>
    </div>
  );
};
