import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, Conference, Microphone, SoundTwo } from '@xipkg/icons';
import { Sheet, SheetContent, SheetOverlay, SheetPortal, SheetTitle } from '@xipkg/sheet';
import { openPermissionsDialog } from '@xipkg/calls-store';
import {
  useCannotUseDevice,
  type DeviceMenuGroupKindT,
  type DeviceMenuGroupT,
} from '@xipkg/calls-hooks';
import { cn } from '@xipkg/utils';
import { useTranslation } from 'react-i18next';

const SWIPE_CLOSE_PX = 56;

const GROUP_ORDER: DeviceMenuGroupKindT[] = ['audioinput', 'audiooutput', 'videoinput'];

const GROUP_LABEL_KEYS: Record<DeviceMenuGroupKindT, string> = {
  audioinput: 'settings.microphone',
  audiooutput: 'settings.speakers',
  videoinput: 'settings.camera',
};

const hasRealDeviceIds = (devices: MediaDeviceInfo[]) =>
  devices.length > 0 && devices[0].deviceId !== '';

type MobileDeviceDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: DeviceMenuGroupT[];
};

const GroupIcon = ({ kind }: { kind: DeviceMenuGroupKindT }) => {
  if (kind === 'audioinput') return <Microphone className="fill-icon-primary h-5 w-5" />;
  if (kind === 'audiooutput') return <SoundTwo className="fill-icon-primary h-5 w-5" />;
  return <Conference className="fill-icon-primary h-5 w-5" />;
};

export const MobileDeviceDrawer = ({ open, onOpenChange, groups }: MobileDeviceDrawerProps) => {
  const { t } = useTranslation('calls');
  const microphoneBlocked = useCannotUseDevice('audioinput');
  const cameraBlocked = useCannotUseDevice('videoinput');
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const close = () => onOpenChange(false);

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null) return;
    setDragY(Math.max(0, event.clientY - dragStartY.current));
  };

  const onHandlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null) return;
    const distance = event.clientY - dragStartY.current;
    dragStartY.current = null;
    setDragY(0);
    if (distance > SWIPE_CLOSE_PX) close();
  };

  const orderedGroups = GROUP_ORDER.flatMap((kind) => {
    const group = groups.find((item) => item.kind === kind);
    return group ? [group] : [];
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay />
      </SheetPortal>
      <SheetContent
        side="bottom"
        className="bg-background-surface max-h-[85dvh] overflow-y-auto rounded-t-3xl border-none px-2 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]"
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <div
          className="flex cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <div className="bg-border-default h-1 w-10 rounded-full" />
        </div>
        <SheetTitle className="text-text-primary px-4 pb-2 text-base font-medium">
          {t('bottomBar.devices')}
        </SheetTitle>
        <div className="flex flex-col gap-4 px-2 pb-2">
          {orderedGroups.map((group) => {
            const blocked = group.kind === 'videoinput' ? cameraBlocked : microphoneBlocked;
            const devices = hasRealDeviceIds(group.devices) ? group.devices : [];

            return (
              <section key={group.kind} className="flex flex-col gap-1">
                <h3 className="text-text-secondary flex items-center gap-2 px-2 text-xs">
                  <GroupIcon kind={group.kind} />
                  {t(GROUP_LABEL_KEYS[group.kind])}
                </h3>
                {devices.length > 0 ? (
                  devices.map((device) => {
                    const isActive = device.deviceId === group.activeDeviceId;
                    return (
                      <button
                        key={`${group.kind}-${device.deviceId}`}
                        type="button"
                        className={cn(
                          'text-text-primary active:bg-background-subtle flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left',
                          isActive && 'bg-selection-background',
                        )}
                        onClick={() => {
                          close();
                          void group.onSelectDevice(device.deviceId);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate text-base">
                          {device.label ||
                            t('settings.device.unnamed', {
                              shortId: device.deviceId.slice(0, 8),
                            })}
                        </span>
                        {isActive ? (
                          <Check className="fill-selection-icon size-4 shrink-0" />
                        ) : null}
                      </button>
                    );
                  })
                ) : blocked ? (
                  <button
                    type="button"
                    className="text-text-secondary active:bg-background-subtle flex h-12 w-full items-center rounded-2xl px-4 text-left text-base"
                    onClick={() => {
                      close();
                      openPermissionsDialog();
                    }}
                  >
                    {t(
                      group.kind === 'videoinput'
                        ? 'settings.allowCamera'
                        : 'settings.allowMicrophone',
                    )}
                  </button>
                ) : (
                  <p className="text-text-secondary flex h-12 items-center px-4 text-base">
                    {t('bottomBar.noDevices')}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
