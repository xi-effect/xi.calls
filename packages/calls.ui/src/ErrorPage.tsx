import React from 'react';
import { Link } from '@xipkg/link';
import { TelegramFilled, MailRounded } from '@xipkg/icons';
import { cn } from '@xipkg/utils';
import { Trans, useTranslation } from 'react-i18next';
import { LinkTanstack } from './LinkTanstack';
import { Logo } from './Logo';

export type ErrorPagePropsT = {
  title: string;
  errorCode: number;
  text: string;
  children?: React.ReactNode;
  withLogo?: boolean;
};

export const ErrorPage = ({
  title,
  errorCode,
  text,
  children,
  withLogo = true,
}: ErrorPagePropsT) => {
  const { t } = useTranslation('calls');

  return (
    <main
      className={cn(
        '3xl:px-[360px] flex h-full min-h-dvh w-full flex-col justify-center gap-8 overflow-y-scroll px-8 md:px-[60px] lg:px-[120px]',
        withLogo && 'h-dvh justify-between',
      )}
    >
      {withLogo && (
        <div className="flex h-[88px] min-h-[44px] items-end xl:h-[132px] xl:min-h-[52px]">
          <Logo />
        </div>
      )}
      <div className="flex flex-col justify-center">
        <span className="flex flex-col-reverse sm:flex-row sm:gap-1">
          <h1 className="text-text-primary text-h3 sm:text-h2 mb-4 font-bold xl:text-[64px] xl:leading-[78px]">
            {title}
          </h1>
          <span className="text-text-disabled text-h6 xl:text-h3 font-bold">{errorCode}</span>
        </span>
        <p className="text-text-primary text-l-base sm:text-xl-base mb-16 font-normal xl:text-[30px]">
          {text}
        </p>
        <p className="text-text-primary text-m-base">
          <Trans
            i18nKey="errorPage.contactIntro"
            ns="calls"
            components={{
              desktop: <span className="hidden sm:inline" />,
            }}
          />
          <span className="flex flex-col sm:flex-row">
            <span className="flex items-center">
              {t('errorPage.inTelegram')}&nbsp;
              <TelegramFilled className="fill-icon-brand mr-1" />
              <Link theme="brand" size="l" href="https://t.me/sovlium_support_bot" target="_blank">
                {t('errorPage.telegramChat')}
              </Link>
            </span>
            <span className="flex items-center">
              &nbsp;{t('errorPage.or')}&nbsp;
              <MailRounded className="fill-icon-brand mr-1" />
              <Link theme="brand" size="l" href="mailto:support@sovlium.ru">
                {t('errorPage.email')}
              </Link>
            </span>
          </span>
        </p>
        <p className="text-text-primary text-m-base mt-16 flex flex-row gap-2">
          {t('errorPage.backHomePrefix')}
          <LinkTanstack theme="brand" to="/">
            {t('errorPage.backHomeLink')}
          </LinkTanstack>
        </p>
        <div className="text-text-primary mt-[64px] text-[16px]">{children}</div>
      </div>
      <div className="h-[88px] min-h-[44px] xl:h-[132px] xl:min-h-[52px]" />
    </main>
  );
};
