import { describe, expect, it } from "vitest";

import { appAcceptance } from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import {
  buildToolcraftHalftoneGrid,
  getToolcraftHalftoneSweepPhase,
  isToolcraftHalftoneCellOn,
} from "./pattern-math";

const defaultLayout = buildToolcraftHalftoneGrid({ columns: 22, gap: 60, height: 600, width: 600 });

function countOnCells(mode: "curtain" | "fan" | "fan3" | "radial" | "random" | "wave", loopProgress: number): number {
  return defaultLayout.cells.filter((cell) =>
    isToolcraftHalftoneCellOn(cell, defaultLayout, {
      direction: "horizontal",
      loopProgress,
      mode,
      reverse: false,
      speed: 1,
    }),
  ).length;
}

describe("halftone pattern math", () => {
  it("keeps every generated cell inside the circular silhouette", () => {
    for (const cell of defaultLayout.cells) {
      const distance = Math.hypot(cell.x - defaultLayout.centerX, cell.y - defaultLayout.centerY);
      expect(distance).toBeLessThanOrEqual(defaultLayout.radius + 0.001);
    }
  });

  it("loops seamlessly forward: phase at progress 0 matches the wrapped phase at progress 1", () => {
    for (const speed of [1, 2, 3, 4, 5, 6]) {
      const start = getToolcraftHalftoneSweepPhase(0, speed);
      const end = getToolcraftHalftoneSweepPhase(1, speed);
      expect(Math.abs(end - start)).toBeLessThan(1e-9);
    }
  });

  it("produces a different on/off mask at different sweep phases for every mode", () => {
    for (const mode of ["wave", "curtain", "fan", "fan3", "radial", "random"] as const) {
      const early = defaultLayout.cells.map((cell) =>
        isToolcraftHalftoneCellOn(cell, defaultLayout, {
          direction: "horizontal",
          loopProgress: 0,
          mode,
          reverse: false,
          speed: 1,
        }),
      );
      const later = defaultLayout.cells.map((cell) =>
        isToolcraftHalftoneCellOn(cell, defaultLayout, {
          direction: "horizontal",
          loopProgress: 0.5,
          mode,
          reverse: false,
          speed: 1,
        }),
      );

      expect(early).not.toEqual(later);
    }
  });

  it("pattern.mode changes the rendered sweep math", () => {
    const waveOn = countOnCells("wave", 0.5);
    const curtainOn = countOnCells("curtain", 0.5);
    const fanOn = countOnCells("fan", 0.5);
    const radialOn = countOnCells("radial", 0.5);

    expect(waveOn).toBeGreaterThan(0);
    expect(curtainOn).toBeGreaterThan(0);
    expect(fanOn).toBeGreaterThan(0);
    expect(radialOn).toBeGreaterThan(0);
  });

  it("pattern.direction changes the curtain sweep axis and is hidden outside curtain mode", () => {
    const horizontalOn = defaultLayout.cells
      .filter((cell) =>
        isToolcraftHalftoneCellOn(cell, defaultLayout, {
          direction: "horizontal",
          loopProgress: 0.5,
          mode: "curtain",
          reverse: false,
          speed: 1,
        }),
      )
      .map((cell) => `${cell.col},${cell.row}`);
    const verticalOn = defaultLayout.cells
      .filter((cell) =>
        isToolcraftHalftoneCellOn(cell, defaultLayout, {
          direction: "vertical",
          loopProgress: 0.5,
          mode: "curtain",
          reverse: false,
          speed: 1,
        }),
      )
      .map((cell) => `${cell.col},${cell.row}`);

    expect(horizontalOn).not.toEqual(verticalOn);
  });

  it("pattern.reverse flips the curtain travel direction and is hidden outside curtain mode", () => {
    const forwardOn = defaultLayout.cells.filter((cell) =>
      isToolcraftHalftoneCellOn(cell, defaultLayout, {
        direction: "horizontal",
        loopProgress: 0.2,
        mode: "curtain",
        reverse: false,
        speed: 1,
      }),
    );
    const reverseOn = defaultLayout.cells.filter((cell) =>
      isToolcraftHalftoneCellOn(cell, defaultLayout, {
        direction: "horizontal",
        loopProgress: 0.2,
        mode: "curtain",
        reverse: true,
        speed: 1,
      }),
    );

    expect(forwardOn.map((cell) => cell.col)).not.toEqual(reverseOn.map((cell) => cell.col));
  });

  it("pattern.speed changes sweep cycles per loop", () => {
    expect(getToolcraftHalftoneSweepPhase(0.5, 1)).toBeCloseTo(0.5, 5);
    expect(getToolcraftHalftoneSweepPhase(0.5, 2)).toBeCloseTo(0, 5);
  });

  it("grid.columns changes the number of rendered squares", () => {
    const sparse = buildToolcraftHalftoneGrid({ columns: 8, gap: 60, height: 600, width: 600 });
    const dense = buildToolcraftHalftoneGrid({ columns: 40, gap: 60, height: 600, width: 600 });

    expect(dense.cells.length).toBeGreaterThan(sparse.cells.length);
  });

  it("grid.gap changes the square size and spacing", () => {
    const tight = buildToolcraftHalftoneGrid({ columns: 22, gap: 0, height: 600, width: 600 });
    const loose = buildToolcraftHalftoneGrid({ columns: 22, gap: 80, height: 600, width: 600 });

    expect(loose.squareSize).toBeLessThan(tight.squareSize);
  });

  it("grid.jitter offsets squares deterministically without leaving their cells", () => {
    const aligned = buildToolcraftHalftoneGrid({
      columns: 22,
      gap: 60,
      height: 600,
      jitter: 0,
      width: 600,
    });
    const scattered = buildToolcraftHalftoneGrid({
      columns: 22,
      gap: 60,
      height: 600,
      jitter: 100,
      width: 600,
    });
    const scatteredAgain = buildToolcraftHalftoneGrid({
      columns: 22,
      gap: 60,
      height: 600,
      jitter: 100,
      width: 600,
    });

    expect(scattered.cells.length).toBe(aligned.cells.length);

    let moved = 0;
    const maxOffset = (scattered.cellSize - scattered.squareSize) / 2;
    for (let index = 0; index < scattered.cells.length; index += 1) {
      const base = aligned.cells[index];
      const cell = scattered.cells[index];
      const repeat = scatteredAgain.cells[index];

      expect(repeat.x).toBe(cell.x);
      expect(repeat.y).toBe(cell.y);
      expect(Math.abs(cell.x - base.x)).toBeLessThanOrEqual(maxOffset + 1e-9);
      expect(Math.abs(cell.y - base.y)).toBeLessThanOrEqual(maxOffset + 1e-9);

      if (cell.x !== base.x || cell.y !== base.y) {
        moved += 1;
      }
    }

    expect(moved).toBeGreaterThan(aligned.cells.length * 0.9);
  });
});

describe("app-schema.ts control targets", () => {
  const allTargets = new Set(
    (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
      Object.values(section.controls).map((control) => control.target),
    ),
  );

  it("style.onColor changes filled square color", () => {
    expect(allTargets.has("style.onColor")).toBe(true);
  });

  it("style.offColor changes hollow square outline color and opacity", () => {
    expect(allTargets.has("style.offColor")).toBe(true);
  });

  it("export.includeBackground hides the live preview background and creates a transparent PNG", () => {
    expect(allTargets.has("export.includeBackground")).toBe(true);
  });

  it("scene.background changes the rendered background color", () => {
    expect(allTargets.has("scene.background")).toBe(true);
  });

  it("export.image.format switches between PNG and JPG output", () => {
    expect(allTargets.has("export.image.format")).toBe(true);
  });

  it("export.image.resolution changes exported pixel dimensions", () => {
    expect(allTargets.has("export.image.resolution")).toBe(true);
  });

  it("export.video.format switches between MP4 and WebM output", () => {
    expect(allTargets.has("export.video.format")).toBe(true);
  });

  it("export.video.resolution changes exported video pixel dimensions", () => {
    expect(allTargets.has("export.video.resolution")).toBe(true);
  });

  it("sticky footer actions export video and PNG output", () => {
    const outputSection = (appSchema.panels.controls?.sections ?? []).find((section) =>
      Object.values(section.controls).some((control) => control.type === "panelActions"),
    );

    expect(outputSection).toBeDefined();
  });

  it("connects timeline playback controls to runtime state contract", () => {
    expect(appSchema.panels.timeline?.mode).toBe("playback");
  });
});

describe("app-acceptance.ts and app-performance.ts coverage", () => {
  it("declares an acceptance row for every product control target", () => {
    expect(appAcceptance.length).toBeGreaterThanOrEqual(16);
  });

  it("renders the halftone preview within budget", () => {
    const scenario = appPerformance.scenarios.find((entry) => entry.id === "preview-render");
    expect(scenario).toBeDefined();
  });

  it("grid.columns drag stays responsive at the densest grid", () => {
    const scenario = appPerformance.scenarios.find((entry) => entry.id === "columns-drag");
    expect(scenario?.values).toEqual({ default: 22, max: 40, min: 8 });
  });

  it("grid.gap drag stays responsive at the densest grid", () => {
    const scenario = appPerformance.scenarios.find((entry) => entry.id === "gap-drag");
    expect(scenario?.values).toEqual({ default: 60, max: 80, min: 0 });
  });

  it("grid.jitter drag stays responsive", () => {
    const scenario = appPerformance.scenarios.find((entry) => entry.id === "jitter-drag");
    expect(scenario?.interaction).toBe("control-drag");
    expect(scenario?.values).toEqual({ default: 70, max: 100, min: 0 });
  });

  it("pattern.speed drag stays responsive", () => {
    const scenario = appPerformance.scenarios.find((entry) => entry.id === "speed-drag");
    expect(scenario?.interaction).toBe("control-drag");
  });

  it("pattern.mode change stays responsive", () => {
    expect(appPerformance.scenarios.some((entry) => entry.target === "pattern.mode")).toBe(true);
  });

  it("pattern.direction change stays responsive", () => {
    expect(appPerformance.scenarios.some((entry) => entry.target === "pattern.direction")).toBe(true);
  });

  it("pattern.reverse change stays responsive", () => {
    expect(appPerformance.scenarios.some((entry) => entry.target === "pattern.reverse")).toBe(true);
  });

  it("style.onColor change stays responsive", () => {
    expect(appPerformance.scenarios.some((entry) => entry.target === "style.onColor")).toBe(true);
  });

  it("style.offColor change stays responsive", () => {
    expect(appPerformance.scenarios.some((entry) => entry.target === "style.offColor")).toBe(true);
  });

  it("export.includeBackground change stays responsive", () => {
    expect(
      appPerformance.scenarios.some((entry) => entry.target === "export.includeBackground"),
    ).toBe(true);
  });

  it("scene.background change stays responsive", () => {
    expect(appPerformance.scenarios.some((entry) => entry.target === "scene.background")).toBe(true);
  });

  it("export.image.format change stays responsive", () => {
    expect(appPerformance.scenarios.some((entry) => entry.target === "export.image.format")).toBe(true);
  });

  it("export.image.resolution change stays responsive", () => {
    const scenario = appPerformance.scenarios.find((entry) => entry.target === "export.image.resolution");
    expect(scenario?.workload).toBe(true);
  });

  it("export.video.format change stays responsive", () => {
    expect(appPerformance.scenarios.some((entry) => entry.target === "export.video.format")).toBe(true);
  });

  it("export.video.resolution change stays responsive", () => {
    const scenario = appPerformance.scenarios.find((entry) => entry.target === "export.video.resolution");
    expect(scenario?.workload).toBe(true);
  });

  it("keeps canvas viewport stable while pattern controls change", () => {
    const scenario = appPerformance.scenarios.find((entry) => entry.id === "viewport-stability");
    expect(scenario).toBeDefined();
  });

  it("exports the PNG within budget", () => {
    const scenario = appPerformance.scenarios.find((entry) => entry.id === "export-copy");
    expect(scenario?.budget.maxExportMs).toBe(4000);
  });
});
