import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LocalStorageBackend from 'i18next-localstorage-backend';

// Динамические импорты переводов для уменьшения размера основного бандла
// Добавьте импорты переводов из ваших пакетов здесь
// const loadTranslations = async () => {
//   // Пример: const [{ commonEn, commonRu }] = await Promise.all([import('common.ui')]);

//   return {
//     // Добавьте ваши переводы здесь
//   };
// };

// Инициализация i18n с динамической загрузкой переводов
const initI18n = async () => {
  // const translations = await loadTranslations();

  const resources = {
    en: {
      // Добавьте ваши переводы здесь
      // common: translations.commonEn,
    },
    ru: {
      // Добавьте ваши переводы здесь
      // common: translations.commonRu,
    },
  };

  await i18n.use(initReactI18next).init({
    resources,
    fallbackLng: 'ru',
    debug: import.meta.env.DEV,
    interpolation: { escapeValue: false },
    backend: {
      backends: [LocalStorageBackend, HttpBackend],
      backendOptions: [
        {
          expirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
        },
        {
          loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
      ],
    },
  });
};

// Экспортируем промис инициализации для ожидания перед рендерингом
export const i18nInitPromise = initI18n();

export default i18n;
