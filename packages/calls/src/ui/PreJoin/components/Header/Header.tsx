import { Button } from '@xipkg/button';
import { ArrowLeft } from '@xipkg/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';
import { useCalls } from '@xipkg/calls-providers';
import { useCallBackNavigation } from '@xipkg/calls-hooks';

/* eslint-disable no-irregular-whitespace */
export const Header = () => {
  const { callId, leaveToClassroom } = useCallBackNavigation();
  const { room } = useCalls();
  const { data: classroom } = room.useGetClassroom(Number(callId));

  return (
    <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
      <div className="flex flex-row items-center gap-2">
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <Button
              onClick={leaveToClassroom}
              type="button"
              variant="none"
              className="flex size-[40px] min-h-[40xp] min-w-[40px] items-center justify-center rounded-[12px] p-0"
            >
              <ArrowLeft className="fill-icon-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            Вернуться в кабинет
          </TooltipContent>
        </Tooltip>
        <h1 className="text-s-base sm:text-xl-base text-text-primary font-semibold">
          Присоединиться к занятию
        </h1>
      </div>
      <p className="text-xs-base sm:text-s-base text-text-secondary pt-0 pl-12 align-baseline sm:pt-2 sm:pl-0">
        {classroom?.name}
      </p>
    </div>
  );
};
