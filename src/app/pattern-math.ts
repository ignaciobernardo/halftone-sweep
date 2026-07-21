export type ToolcraftHalftonePatternMode =
  | "curtain"
  | "fan"
  | "fan3"
  | "radial"
  | "random"
  | "wave";

export type ToolcraftHalftoneDirection = "horizontal" | "vertical";

export type ToolcraftHalftoneCell = {
  col: number;
  row: number;
  x: number;
  y: number;
};

export type ToolcraftHalftoneGridOptions = {
  columns: number;
  /** Spacing between squares as a percentage of the cell size (0-80). */
  gap: number;
  height: number;
  /**
   * How far each square is pushed off its grid position, as a percentage
   * (0-100) of the free space inside its cell. Offsets are deterministic per
   * cell, so the scatter is stable across frames and exports.
   */
  jitter?: number;
  width: number;
};

export type ToolcraftHalftoneGridLayout = {
  cellSize: number;
  cells: readonly ToolcraftHalftoneCell[];
  centerX: number;
  centerY: number;
  columns: number;
  radius: number;
  rows: number;
  squareSize: number;
};

export type ToolcraftHalftonePatternOptions = {
  direction: ToolcraftHalftoneDirection;
  loopProgress: number;
  mode: ToolcraftHalftonePatternMode;
  reverse: boolean;
  speed: number;
};

const bandHalfWidth = 0.09;
const ringSpacing = 0.24;
const ringHalfWidth = 0.055;
/** Fraction of cells that never light up, so every pattern keeps organic holes. */
const dropoutRatio = 0.2;
/** Discrete flicker steps per sweep cycle for the random pattern. */
const randomFlickerSteps = 12;
/** Fraction of (non-dropout) cells lit during each random flicker step. */
const randomOnRatio = 0.35;

/**
 * Deterministic per-cell pseudo-random value in [0, 1). Depending only on the
 * grid position and a salt keeps the scatter identical across frames, live
 * preview, and export renders.
 */
function getCellHash01(col: number, row: number, salt: number): number {
  let hash = (col * 374761393 + row * 668265263 + salt * 69621) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash = hash ^ (hash >>> 16);
  return (hash >>> 0) / 4294967296;
}

/**
 * Lays out a square grid of cells clipped to a circular silhouette. Only
 * cells whose grid position falls within the circle radius are returned, so
 * squares outside the silhouette are never generated in the first place.
 * Jitter then pushes each square off its grid position by a deterministic
 * offset that never leaves the cell, so neighboring squares cannot overlap.
 */
export function buildToolcraftHalftoneGrid({
  columns,
  gap,
  height,
  jitter = 0,
  width,
}: ToolcraftHalftoneGridOptions): ToolcraftHalftoneGridLayout {
  const safeColumns = Math.max(1, Math.round(columns));
  const cellSize = width / safeColumns;
  const rows = Math.max(1, Math.floor(height / cellSize));
  const gapRatio = Math.max(0, Math.min(80, gap)) / 100;
  const squareSize = Math.max(1, cellSize * (1 - gapRatio));
  const jitterRatio = Math.max(0, Math.min(100, jitter)) / 100;
  const maxOffset = Math.max(0, (cellSize - squareSize) / 2) * jitterRatio;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - cellSize / 2;
  const cells: ToolcraftHalftoneCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < safeColumns; col += 1) {
      const baseX = (col + 0.5) * cellSize;
      const baseY = (row + 0.5) * cellSize;
      const distanceFromCenter = Math.hypot(baseX - centerX, baseY - centerY);

      if (distanceFromCenter <= radius) {
        const x = baseX + (getCellHash01(col, row, 1) * 2 - 1) * maxOffset;
        const y = baseY + (getCellHash01(col, row, 2) * 2 - 1) * maxOffset;
        cells.push({ col, row, x, y });
      }
    }
  }

  return { cellSize, cells, centerX, centerY, columns: safeColumns, radius, rows, squareSize };
}

function wrappedDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1 - diff);
}

function getPositiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}

/**
 * Returns the current sweep phase in [0, 1). Speed is an integer number of
 * full sweep cycles per timeline loop, so the phase always starts and ends
 * at the same fractional value and the animation loops seamlessly forward
 * no matter how the timeline duration changes.
 */
export function getToolcraftHalftoneSweepPhase(loopProgress: number, speed: number): number {
  const cycles = Math.max(1, Math.round(speed));
  return getPositiveModulo(loopProgress * cycles, 1);
}

/**
 * Determines whether a single grid cell is "on" (filled) or "off" (hollow)
 * for the given pattern mode and sweep phase. Every mode is expressed as a
 * normalized position in [0, 1) compared against the sweep phase with a
 * wrapped/periodic distance, which is what makes every pattern loop
 * seamlessly forward without a visible jump between the last and first
 * frame.
 */
export function isToolcraftHalftoneCellOn(
  cell: ToolcraftHalftoneCell,
  layout: ToolcraftHalftoneGridLayout,
  options: ToolcraftHalftonePatternOptions,
): boolean {
  // A deterministic subset of cells never lights up, so every pattern keeps
  // scattered "dead" squares like the reference instead of solid bands.
  if (getCellHash01(cell.col, cell.row, 7) < dropoutRatio) {
    return false;
  }

  const phase = getToolcraftHalftoneSweepPhase(options.loopProgress, options.speed);

  switch (options.mode) {
    case "wave": {
      const diagonal =
        (cell.col / Math.max(1, layout.columns - 1) + cell.row / Math.max(1, layout.rows - 1)) /
        2;
      return wrappedDistance(diagonal, phase) < bandHalfWidth;
    }
    case "curtain": {
      const axisNorm =
        options.direction === "horizontal"
          ? cell.col / Math.max(1, layout.columns - 1)
          : cell.row / Math.max(1, layout.rows - 1);
      const travel = options.reverse ? 1 - axisNorm : axisNorm;
      return wrappedDistance(travel, phase) < bandHalfWidth;
    }
    case "fan": {
      const angle = Math.atan2(cell.y - layout.centerY, cell.x - layout.centerX);
      const angleNorm = getPositiveModulo(angle / (Math.PI * 2), 1);
      return wrappedDistance(angleNorm, phase) < bandHalfWidth;
    }
    case "fan3": {
      // Three blades 120 degrees apart rotating together: distance to the
      // nearest blade center is measured within a third of the circle.
      const angle = Math.atan2(cell.y - layout.centerY, cell.x - layout.centerX);
      const angleNorm = getPositiveModulo(angle / (Math.PI * 2), 1);
      const bladeOffset = getPositiveModulo(angleNorm - phase, 1 / 3);
      return Math.min(bladeOffset, 1 / 3 - bladeOffset) < bandHalfWidth;
    }
    case "random": {
      // Discrete flicker: each step lights a fresh deterministic subset of
      // cells. The step index wraps with the phase, so the loop stays
      // seamless and forward-only.
      const step =
        Math.floor(getPositiveModulo(phase, 1) * randomFlickerSteps) % randomFlickerSteps;
      return getCellHash01(cell.col, cell.row, 100 + step) < randomOnRatio;
    }
    case "radial": {
      const distanceNorm =
        Math.hypot(cell.x - layout.centerX, cell.y - layout.centerY) /
        Math.max(1, layout.radius);
      const ringOffset = getPositiveModulo(distanceNorm - phase, ringSpacing);
      return ringOffset < ringHalfWidth || ringSpacing - ringOffset < ringHalfWidth;
    }
    default:
      return false;
  }
}
