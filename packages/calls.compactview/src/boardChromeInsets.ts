import { useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CornerT } from '@xipkg/calls-store';
import {
  BOTTOM_OFFSET_DEFAULT_PX,
  COMPACT_BOTTOM_OFFSET_BOARD_PX,
  HEADER_HEIGHT_PX,
} from './constants';

/**
 * Доска публикует отступы хрома на documentElement.
 * Имена совпадают с modules.board `boardToolbarDock`.
 */
const TOP_VAR = '--board-chrome-top';
const RIGHT_VAR = '--board-chrome-right';
const BOTTOM_VAR = '--board-chrome-bottom';
const LEFT_VAR = '--board-chrome-left';

const EDGE_PX = 16;
const CHAT_TOP_PX = 128;
const CHAT_LEFT_EXTRA_PX = 72;

export type BoardChromeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function readPx(name: string): number | null {
  if (typeof document === 'undefined') return null;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

export function defaultBoardChromeInsets(isBoardPage: boolean): BoardChromeInsets {
  return {
    top: HEADER_HEIGHT_PX,
    right: EDGE_PX,
    bottom: isBoardPage ? COMPACT_BOTTOM_OFFSET_BOARD_PX : BOTTOM_OFFSET_DEFAULT_PX,
    left: EDGE_PX,
  };
}

export function readBoardChromeInsets(isBoardPage: boolean): BoardChromeInsets {
  const fallback = defaultBoardChromeInsets(isBoardPage);
  return {
    top: readPx(TOP_VAR) ?? fallback.top,
    right: readPx(RIGHT_VAR) ?? fallback.right,
    bottom: readPx(BOTTOM_VAR) ?? fallback.bottom,
    left: readPx(LEFT_VAR) ?? fallback.left,
  };
}

function sameInsets(left: BoardChromeInsets, right: BoardChromeInsets) {
  return (
    left.top === right.top &&
    left.right === right.right &&
    left.bottom === right.bottom &&
    left.left === right.left
  );
}

export function useBoardChromeInsets(isBoardPage: boolean): BoardChromeInsets {
  const [insets, setInsets] = useState(() => readBoardChromeInsets(isBoardPage));

  useLayoutEffect(() => {
    const update = () => {
      const next = readBoardChromeInsets(isBoardPage);
      setInsets((current) => (sameInsets(current, next) ? current : next));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
    return () => observer.disconnect();
  }, [isBoardPage]);

  return insets;
}

export function cornerStyle(corner: CornerT, insets: BoardChromeInsets): CSSProperties {
  switch (corner) {
    case 'top-left':
      return { top: insets.top, left: insets.left };
    case 'top-right':
      return { top: insets.top, right: insets.right };
    case 'bottom-left':
      return { bottom: insets.bottom, left: insets.left };
    case 'bottom-right':
      return { bottom: insets.bottom, right: insets.right };
  }
}

export function chatPositionStyle(corner: CornerT, insets: BoardChromeInsets): CSSProperties {
  const oppositeLeft = corner === 'top-right' || corner === 'bottom-right';
  const top = CHAT_TOP_PX + Math.max(0, insets.top - HEADER_HEIGHT_PX);
  return oppositeLeft
    ? { top, bottom: insets.bottom, left: insets.left + CHAT_LEFT_EXTRA_PX }
    : { top, bottom: insets.bottom, right: insets.right };
}
