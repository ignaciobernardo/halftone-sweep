import { describe, expect, it } from "vitest";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("appSchema", () => {
  it("publishes the Halftone Sweep product app contract", () => {
    expect(appSchema.canvas.draggable).toBe(true);
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.upload).toBe(false);
    expect(appSchema.canvas.renderScale.enabled).toBe(true);
    expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline?.enabled).toBe(true);
    expect(appSchema.panels.timeline?.mode).toBe("playback");
    expect(appSchema.panels.timeline?.defaultDurationSeconds).toBe(6);
    expect(appSchema.toolbar).toEqual({
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    });
    expect(appSchema.assembly.capabilities).toEqual(
      expect.arrayContaining([
        "canvas.draggable",
        "canvas.editableSize",
        "canvas.renderScale",
        "controls.defaults",
        "controls.panel",
        "timeline.playback",
        "toolbar.history",
        "toolbar.radar",
        "toolbar.theme",
        "toolbar.zoom",
      ]),
    );
    expect(appSchema.assembly.capabilities).not.toContain("canvas.upload");
    expect(appSchema.assembly.capabilities).not.toContain("timeline.keyframes");
  });

  it("declares every product control section with a meaningful title", () => {
    const productSections =
      appSchema.panels.controls?.sections.filter((section) => section.title !== "Setup") ?? [];
    const titles = productSections.map((section) => section.title);

    expect(titles).toEqual([
      "Pattern",
      "Grid",
      "Squares",
      "Background",
      "Image Export",
      "Video Export",
      "Export",
    ]);
  });

  it("keeps Direction and Reverse hidden outside Curtain mode", () => {
    const patternSection = appSchema.panels.controls?.sections.find(
      (section) => section.title === "Pattern",
    );

    expect(patternSection?.controls.direction?.visibleWhen).toEqual({
      equals: "curtain",
      target: "pattern.mode",
    });
    expect(patternSection?.controls.reverse?.visibleWhen).toEqual({
      equals: "curtain",
      target: "pattern.mode",
    });
  });

  it("declares performance workload targets for the render-cost controls", () => {
    expect(appPerformance.workloadTargets).toEqual(
      expect.arrayContaining([
        "grid.columns",
        "grid.gap",
        "export.image.resolution",
        "export.video.resolution",
      ]),
    );
    expect(appPerformance.usesCustomRenderer).toBe(true);
    expect(appPerformance.rendererStrategy).toBe("canvas-2d");
  });
});
