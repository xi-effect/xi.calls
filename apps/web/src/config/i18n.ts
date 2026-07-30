import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { callsEn, callsRu } from '@xipkg/calls/locales';

const initI18n = async () => {
  await i18n.use(initReactI18next).init({
    resources: {
      en: { calls: callsEn },
      ru: { calls: callsRu },
    },
    lng: 'ru',
    fallbackLng: 'ru',
    defaultNS: 'calls',
    ns: ['calls'],
    debug: import.meta.env.DEV,
    interpolation: { escapeValue: false },
  });
};

export const i18nInitPromise = initI18n();

export default i18n;
