import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';
import { WhiteBoard } from '@xipkg/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WhiteboardsModal } from './WhiteboardsModal';
import { Button } from '@xipkg/button';
import { ONBOARDING_IDS } from '@xipkg/calls-config';

export const WhiteBoardButton = () => {
  const { t } = useTranslation('calls');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <Tooltip delayDuration={1000}>
        <TooltipTrigger className="bg-transparent" asChild>
          <Button
            id={ONBOARDING_IDS.WHITEBOARD_BUTTON}
            size="icon"
            variant="none"
            onClick={handleClick}
            className="bg-background-surface hover:bg-background-page text-text-primary relative m-0 h-10 w-10 rounded-xl p-0"
            data-umami-event="call-whiteboard-button"
          >
            <WhiteBoard className="fill-icon-primary h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {t('bottomBar.selectBoard')}
        </TooltipContent>
      </Tooltip>

      <WhiteboardsModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
};
