import {
  buildToolcraftHalftoneGrid,
  isToolcraftHalftoneCellOn,
  type ToolcraftHalftoneGridLayout,
  type ToolcraftHalftoneDirection,
  type ToolcraftHalftonePatternMode,
} from "./pattern-math";

export type ToolcraftHalftoneColorOpacity = {
  hex: string;
  opacity?: number;
};

export type ToolcraftHalftoneDrawSettings = {
  columns: number;
  direction: ToolcraftHalftoneDirection;
  gap: number;
  jitter: number;
  loopProgress: number;
  mode: ToolcraftHalftonePatternMode;
  offColor: ToolcraftHalftoneColorOpacity;
  onColor: string;
  reverse: boolean;
  speed: number;
};

/**
 * Per-surface cache that lets consecutive frames repaint only the cells whose
 * on/off state actually changed. `key` fingerprints every input except the
 * loop progress; when it differs the whole canvas is redrawn from scratch.
 */
export type ToolcraftHalftoneDrawCache = {
  key: string;
  on: Uint8Array | null;
};

export function createToolcraftHalftoneDrawCache(): ToolcraftHalftoneDrawCache {
  return { key: "", on: null };
}

export type ToolcraftHalftoneDrawOptions = {
  cache?: ToolcraftHalftoneDrawCache;
  context: CanvasRenderingContext2D;
  cssHeight: number;
  cssWidth: number;
  includeBackground: boolean;
  backgroundColor: string;
  settings: ToolcraftHalftoneDrawSettings;
  surfaceKey?: string;
};

function toRgbaFromHexOpacity(hex: string, opacityPercent = 100): string {
  const normalized = hex.replace("#", "");
  const bigint = Number.parseInt(normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized, 16);

  if (!Number.isFinite(bigint)) {
    return hex;
  }

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const alpha = Math.max(0, Math.min(100, opacityPercent)) / 100;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getStaticDrawKey(options: ToolcraftHalftoneDrawOptions): string {
  const { backgroundColor, cssHeight, cssWidth, includeBackground, settings, surfaceKey } =
    options;

  return [
    surfaceKey ?? "",
    cssWidth,
    cssHeight,
    includeBackground ? 1 : 0,
    backgroundColor,
    settings.columns,
    settings.gap,
    settings.jitter,
    settings.mode,
    settings.direction,
    settings.reverse ? 1 : 0,
    settings.speed,
    settings.onColor,
    settings.offColor.hex,
    settings.offColor.opacity ?? 100,
  ].join("|");
}

function addCellToPaths(
  onPaths: { off: Path2D; on: Path2D },
  layout: ToolcraftHalftoneGridLayout,
  cellIndex: number,
  isOn: boolean,
  lineWidth: number,
): void {
  const cell = layout.cells[cellIndex];
  const half = layout.squareSize / 2;

  if (isOn) {
    onPaths.on.rect(cell.x - half, cell.y - half, layout.squareSize, layout.squareSize);
    return;
  }

  // Off cells are hollow rings filled with the even-odd rule (outer rect
  // minus an inset inner rect) instead of stroked: software rasterizers pay
  // per covered pixel for fills but per edge with joins for strokes, and the
  // rings cover almost no area.
  onPaths.off.rect(cell.x - half, cell.y - half, layout.squareSize, layout.squareSize);
  onPaths.off.rect(
    cell.x - half + lineWidth,
    cell.y - half + lineWidth,
    layout.squareSize - lineWidth * 2,
    layout.squareSize - lineWidth * 2,
  );
}

function paintPaths(
  context: CanvasRenderingContext2D,
  paths: { off: Path2D; on: Path2D },
  onColor: string,
  offStroke: string,
): void {
  context.fillStyle = onColor;
  context.fill(paths.on);
  context.fillStyle = offStroke;
  context.fill(paths.off, "evenodd");
}

/**
 * Draws the halftone square grid product output. This function is the
 * single source of truth for both live preview and export rendering so the
 * exported PNG/video always matches what the canvas shows.
 *
 * When a `cache` from a previous frame on the same surface is provided, only
 * cells whose on/off state changed since that frame are repainted (plus
 * their direct neighbors, so anti-aliased edges at zero gap stay clean).
 * A sweep step typically toggles a small band of cells, so incremental
 * frames touch a tiny fraction of the canvas instead of all of it.
 */
export function drawToolcraftHalftonePattern(options: ToolcraftHalftoneDrawOptions): void {
  const { backgroundColor, cache, context, cssHeight, cssWidth, includeBackground, settings } =
    options;

  const layout = buildToolcraftHalftoneGrid({
    columns: settings.columns,
    gap: settings.gap,
    height: cssHeight,
    jitter: settings.jitter,
    width: cssWidth,
  });
  const patternOptions = {
    direction: settings.direction,
    loopProgress: settings.loopProgress,
    mode: settings.mode,
    reverse: settings.reverse,
    speed: settings.speed,
  };
  const offStroke = toRgbaFromHexOpacity(settings.offColor.hex, settings.offColor.opacity ?? 100);
  const lineWidth = Math.max(1, layout.squareSize * 0.08);
  const staticKey = getStaticDrawKey(options);
  const cellCount = layout.cells.length;

  const canRepaintIncrementally =
    cache !== undefined && cache.key === staticKey && cache.on?.length === cellCount;

  if (canRepaintIncrementally && cache.on) {
    const changed: number[] = [];

    for (let index = 0; index < cellCount; index += 1) {
      const isOn = isToolcraftHalftoneCellOn(layout.cells[index], layout, patternOptions) ? 1 : 0;

      if (cache.on[index] !== isOn) {
        cache.on[index] = isOn;
        changed.push(index);
      }
    }

    if (changed.length === 0) {
      return;
    }

    // Repaint each changed cell plus its direct neighbors: at zero gap the
    // 1px-inflated clear region reaches into adjacent squares, so those
    // squares are redrawn too instead of being left with erased edges.
    const indexByGridPosition = new Map<number, number>();
    for (let index = 0; index < cellCount; index += 1) {
      const cell = layout.cells[index];
      indexByGridPosition.set(cell.row * layout.columns + cell.col, index);
    }

    const repaint = new Set<number>();
    for (const index of changed) {
      const cell = layout.cells[index];
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          const neighbor = indexByGridPosition.get(
            (cell.row + rowOffset) * layout.columns + (cell.col + colOffset),
          );
          if (neighbor !== undefined) {
            repaint.add(neighbor);
          }
        }
      }
    }

    const half = layout.squareSize / 2;
    const clearPad = 1;
    const paths = { off: new Path2D(), on: new Path2D() };

    for (const index of repaint) {
      const cell = layout.cells[index];
      const clearX = cell.x - half - clearPad;
      const clearY = cell.y - half - clearPad;
      const clearSize = layout.squareSize + clearPad * 2;

      if (includeBackground) {
        context.fillStyle = backgroundColor;
        context.fillRect(clearX, clearY, clearSize, clearSize);
      } else {
        context.clearRect(clearX, clearY, clearSize, clearSize);
      }

      addCellToPaths(paths, layout, index, cache.on[index] === 1, lineWidth);
    }

    paintPaths(context, paths, settings.onColor, offStroke);
    return;
  }

  if (includeBackground) {
    // An opaque background fill already covers every pixel, so a separate
    // clearRect pass would rasterize the full canvas twice per frame.
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, cssWidth, cssHeight);
  } else {
    context.clearRect(0, 0, cssWidth, cssHeight);
  }

  const onStates = cache ? new Uint8Array(cellCount) : null;
  const paths = { off: new Path2D(), on: new Path2D() };

  for (let index = 0; index < cellCount; index += 1) {
    const isOn = isToolcraftHalftoneCellOn(layout.cells[index], layout, patternOptions);

    if (onStates) {
      onStates[index] = isOn ? 1 : 0;
    }

    addCellToPaths(paths, layout, index, isOn, lineWidth);
  }

  paintPaths(context, paths, settings.onColor, offStroke);

  if (cache) {
    cache.key = staticKey;
    cache.on = onStates;
  }
}
