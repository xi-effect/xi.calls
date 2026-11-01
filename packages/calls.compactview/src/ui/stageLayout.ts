export type StageInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type StageFrame = {
  /** Узкий экран или низкий (телефон в портрете и в альбомной ориентации) */
  handheld: boolean;
  landscape: boolean;
  /** В портрете прячем переключение вида и ограничиваем высоту плитки */
  lockCompactModes: boolean;
  width: number;
  tileHeight: number;
  insets: StageInsets;
};

const EDGE_PX = 12;
/** Плитка + отступ mb-2 + нижняя панель */
const CONTROLS_PX = 48;

const EMPTY_INSETS: StageInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function viewportBox() {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
    offsetLeft: viewport?.offsetLeft ?? 0,
    offsetTop: viewport?.offsetTop ?? 0,
  };
}

export function readSafeInsets(): StageInsets {
  if (typeof document === 'undefined') return EMPTY_INSETS;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: Number.parseFloat(style.paddingTop) || 0,
    right: Number.parseFloat(style.paddingRight) || 0,
    bottom: Number.parseFloat(style.paddingBottom) || 0,
    left: Number.parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

export function computeStageFrame(): StageFrame {
  const box = viewportBox();
  const insets = readSafeInsets();
  const landscape = box.width > box.height;
  const handheld = box.width <= 720 || box.height <= 500;

  if (!handheld) {
    const width = 400;
    return {
      handheld: false,
      landscape,
      lockCompactModes: false,
      width,
      tileHeight: Math.round((width * 9) / 16),
      insets,
    };
  }

  const maxWidth = Math.max(220, box.width - insets.left - insets.right - EDGE_PX * 2);
  const width = Math.min(400, maxWidth);
  const naturalTile = Math.round((width * 9) / 16);
  // В альбоме оставляем честные 16:9. Сжимаем плитку только в портрете, чтобы панель не закрывала демонстрацию.
  const maxPanel = box.height * 0.36;
  const tileHeight = landscape
    ? naturalTile
    : Math.max(84, Math.min(naturalTile, Math.floor(maxPanel - CONTROLS_PX)));

  return { handheld: true, landscape, lockCompactModes: !landscape, width, tileHeight, insets };
}

export function sameStageFrame(left: StageFrame, right: StageFrame) {
  return (
    left.handheld === right.handheld &&
    left.landscape === right.landscape &&
    left.lockCompactModes === right.lockCompactModes &&
    left.width === right.width &&
    left.tileHeight === right.tileHeight &&
    left.insets.top === right.insets.top &&
    left.insets.right === right.insets.right &&
    left.insets.bottom === right.insets.bottom &&
    left.insets.left === right.insets.left
  );
}

export function clampStagePosition(
  x: number,
  y: number,
  width: number,
  height: number,
  insets: StageInsets,
) {
  const box = viewportBox();
  const minX = box.offsetLeft + insets.left + 8;
  const minY = box.offsetTop + insets.top + 8;
  const maxX = Math.max(minX, box.offsetLeft + box.width - insets.right - width - 8);
  const maxY = Math.max(minY, box.offsetTop + box.height - insets.bottom - height - 8);
  return {
    x: Math.min(Math.max(minX, x), maxX),
    y: Math.min(Math.max(minY, y), maxY),
  };
}

/** Портрет — по центру снизу, альбом — слева снизу, чтобы демонстрация оставалась видна. */
export function defaultStagePosition(frame: StageFrame) {
  const box = viewportBox();
  const panelHeight = frame.tileHeight + CONTROLS_PX + 8;
  if (!frame.handheld) {
    return clampStagePosition(
      EDGE_PX + frame.insets.left,
      EDGE_PX + frame.insets.top,
      frame.width,
      panelHeight,
      frame.insets,
    );
  }
  const y = box.offsetTop + box.height - frame.insets.bottom - EDGE_PX - panelHeight;
  const x = frame.landscape
    ? box.offsetLeft + frame.insets.left + EDGE_PX
    : box.offsetLeft + (box.width - frame.width) / 2;
  return clampStagePosition(x, y, frame.width, panelHeight, frame.insets);
}

export function stagePanelHeight(frame: StageFrame) {
  return frame.tileHeight + CONTROLS_PX + 8;
}
