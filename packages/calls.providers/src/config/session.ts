/** Сброс UI-состояния ВКС при отключении (чат, руки и т.д.) — реализует хост */
export type CallsSessionPortT = {
  clearConferenceUiState: () => void;
};
