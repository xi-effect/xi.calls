import type { CompactViewModeT } from '@xipkg/calls-store';

/** Высота шапки приложения (top-16) */
export const HEADER_HEIGHT_PX = 64;
/**
 * Доп. зазор между fixed compact overlay и контентом доски на телефоне.
 * marginTop контента = высота overlay + этот отступ.
 */
export const COMPACT_MOBILE_CONTENT_GAP_PX = 12;
/** Fallback высоты overlay, пока ResizeObserver ещё не дал headerHeight */
export const COMPACT_MOBILE_OVERLAY_FALLBACK_PX = 120;
/** Тулбар доски сверху и снизу при работе на доске */
export const BOARD_TOP_TOOLBAR_PX = 64;
export const BOARD_BOTTOM_TOOLBAR_PX = 64;
/** Нижний отступ: при доске — тулбар доски, иначе общий отступ */
export const BOTTOM_OFFSET_BOARD_PX = BOARD_BOTTOM_TOOLBAR_PX;
export const BOTTOM_OFFSET_DEFAULT_PX = 16;
export const COMPACT_BOTTOM_BAR_PX = 40;
/** Высота полоски «только аудио» (CompactCallCollapsedBar) */
export const COMPACT_AUDIO_BAR_HEIGHT_PX = 48;
export const TILES_PADDING_PX = 16;

export const TILE_MIN_HEIGHT_PX = 120;
export const TILE_GAP_PX = 8;

/** Вертикальный padding контейнера expanded-режима (p-1: 4px сверху + 4px снизу) */
export const EXPANDED_VIDEO_PADDING_VERTICAL_PX = 8;
/** Отступ между областью видео и нижней панелью (mb-2 на контейнере видео) */
export const COMPACT_VIDEO_AREA_MARGIN_PX = 8;
/** Нижний отступ compact call на странице доски, соответствует CSS bottom-[72px] */
export const COMPACT_BOTTOM_OFFSET_BOARD_PX = BOARD_BOTTOM_TOOLBAR_PX + TILE_GAP_PX; // 72

/** Ширина панели компакт-ВКС (с запасом под кнопку чата); высота плитки 16:9 при этой ширине */
export const COMPACT_PANEL_WIDTH_PX = 360;
export const TILE_HEIGHT_16_9_PX = Math.round((COMPACT_PANEL_WIDTH_PX * 9) / 16); // 203 при ширине 360

/** Размеры окна PiP Document */
export const PIP_PANEL_WIDTH_PX = 380;
export const PIP_BAR_HEIGHT_PX = 48;
/** Зазор между областью видео и нижней панелью в PiP (gap-1) */
export const PIP_VIDEO_BAR_GAP_PX = 4;
/** Внутренний вертикальный padding области плиток в PiP expanded (p-0.5) */
export const PIP_EXPANDED_INNER_PADDING_PX = 4;
/** Панель управления + gap + внешний padding корня PiP (p-1 + gap-1 + h-12) */
export const PIP_CHROME_HEIGHT_PX =
  PIP_BAR_HEIGHT_PX + PIP_VIDEO_BAR_GAP_PX + EXPANDED_VIDEO_PADDING_VERTICAL_PX;

/**
 * Доп. высота окна Document PiP: шапка браузера не входит в innerHeight,
 * без неё обрезается нижняя панель (~⅔ высоты control bar).
 */
export const PIP_DOCUMENT_WINDOW_FRAME_PX = Math.round((PIP_BAR_HEIGHT_PX * 2) / 3);

/**
 * Высота «хрома» + внутренний padding expanded-области (p-0.5).
 * Используется при расчёте, сколько плиток влезает по высоте окна.
 */
export const PIP_RESERVED_HEIGHT_PX = PIP_CHROME_HEIGHT_PX + PIP_EXPANDED_INNER_PADDING_PX;

/** Высота одной плитки 16:9 при ширине PiP */
export const PIP_TILE_HEIGHT_16_9_PX = Math.round((PIP_PANEL_WIDTH_PX * 9) / 16);

/**
 * Высота области с плитками в PiP.
 * @param tileCount — число видимых плиток 16:9
 * @param withExpandedInnerPadding — p-0.5 вокруг стека в expanded
 */
export function getPipTilesStackHeightPx(
  tileCount: number,
  withExpandedInnerPadding = false,
): number {
  const n = Math.max(1, tileCount);
  const innerPad = withExpandedInnerPadding ? PIP_EXPANDED_INNER_PADDING_PX : 0;
  return innerPad + n * PIP_TILE_HEIGHT_16_9_PX + Math.max(0, n - 1) * TILE_GAP_PX;
}

/** Высота контента PiP (innerHeight), без шапки окна браузера */
export function getPipContentHeight(mode: CompactViewModeT, tileCount = 1): number {
  if (mode === 'audio') {
    return PIP_CHROME_HEIGHT_PX + COMPACT_AUDIO_BAR_HEIGHT_PX;
  }
  if (mode === 'basic') {
    return PIP_CHROME_HEIGHT_PX + getPipTilesStackHeightPx(1, false);
  }
  const n = Math.min(Math.max(1, tileCount), 4);
  return PIP_CHROME_HEIGHT_PX + getPipTilesStackHeightPx(n, true);
}

/** Высота для resizeTo / requestWindow (контент + шапка Document PiP) */
export function getPipWindowHeight(mode: CompactViewModeT, tileCount = 1): number {
  return getPipContentHeight(mode, tileCount) + PIP_DOCUMENT_WINDOW_FRAME_PX;
}

/** Минимальный innerHeight для n плиток в expanded */
export function getPipRequiredHeightForTiles(tileCount: number): number {
  return getPipContentHeight('expanded', tileCount);
}

/** @deprecated Используйте getPipWindowHeight('basic', 1) */
export const PIP_HEIGHT_BASIC_PX = getPipWindowHeight('basic', 1);

/** @deprecated Используйте getPipWindowHeight('audio', 1) */
export const PIP_HEIGHT_AUDIO_PX = getPipWindowHeight('audio', 1);

const COMPACT_VIEW_MODES: CompactViewModeT[] = ['basic', 'expanded', 'audio'];

export function getNextCompactViewMode(current: CompactViewModeT): CompactViewModeT {
  const index = COMPACT_VIEW_MODES.indexOf(current);
  return COMPACT_VIEW_MODES[(index + 1) % COMPACT_VIEW_MODES.length];
}

export function getPipHeightForMode(mode: CompactViewModeT, participantCount: number): number {
  if (mode === 'expanded') {
    const n = Math.min(Math.max(1, participantCount), 4);
    return getPipWindowHeight('expanded', n);
  }
  return getPipWindowHeight(mode, 1);
}

/** @deprecated Используйте getPipWindowHeight('expanded', n) */
export function getPipHeightExpandedPx(participantCount: number): number {
  return getPipHeightForMode('expanded', participantCount);
}
