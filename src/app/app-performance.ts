import {
  defineToolcraftPerformance,
  type ToolcraftPerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

type ControlChangeSpec = {
  automatedTestName: string;
  browserTestName: string;
  controlLabel: string;
  expectedObservable: string;
  fixture: string;
  id: string;
  target: string;
  workload?: {
    stressValue: unknown;
    values: { default: unknown; max: unknown; min: unknown };
  };
};

const controlChangeSpecs: readonly ControlChangeSpec[] = [
  {
    automatedTestName: "pattern.mode change stays responsive",
    browserTestName: "browser perf: pattern change stays responsive",
    controlLabel: "Pattern",
    expectedObservable: "Selecting a pattern swaps the sweep math without blocking the canvas.",
    fixture: "circle grid default state",
    id: "pattern-mode-change",
    target: "pattern.mode",
  },
  {
    automatedTestName: "pattern.direction change stays responsive",
    browserTestName: "browser perf: direction change stays responsive",
    controlLabel: "Direction",
    expectedObservable: "Switching curtain direction updates the sweep axis without blocking the canvas.",
    fixture: "curtain pattern default state",
    id: "direction-change",
    target: "pattern.direction",
  },
  {
    automatedTestName: "pattern.reverse change stays responsive",
    browserTestName: "browser perf: reverse toggle stays responsive",
    controlLabel: "Reverse",
    expectedObservable: "Toggling Reverse flips curtain travel direction without blocking the canvas.",
    fixture: "curtain pattern default state",
    id: "reverse-change",
    target: "pattern.reverse",
  },
  {
    automatedTestName: "style.onColor change stays responsive",
    browserTestName: "browser perf: on color change stays responsive",
    controlLabel: "On Color",
    expectedObservable: "Changing On Color updates filled squares without blocking the canvas.",
    fixture: "circle grid default state",
    id: "on-color-change",
    target: "style.onColor",
  },
  {
    automatedTestName: "style.offColor change stays responsive",
    browserTestName: "browser perf: off color change stays responsive",
    controlLabel: "Off Color",
    expectedObservable: "Changing Off Color updates hollow squares without blocking the canvas.",
    fixture: "circle grid default state",
    id: "off-color-change",
    target: "style.offColor",
  },
  {
    automatedTestName: "export.includeBackground change stays responsive",
    browserTestName: "browser perf: include background toggle stays responsive",
    controlLabel: "Include",
    expectedObservable: "Toggling Include shows or hides the product background without blocking the canvas.",
    fixture: "circle grid default state",
    id: "include-background-change",
    target: "export.includeBackground",
  },
  {
    automatedTestName: "scene.background change stays responsive",
    browserTestName: "browser perf: background color change stays responsive",
    controlLabel: "Background",
    expectedObservable: "Changing the background color updates the canvas fill without blocking the canvas.",
    fixture: "circle grid default state",
    id: "background-color-change",
    target: "scene.background",
  },
  {
    automatedTestName: "export.image.format change stays responsive",
    browserTestName: "browser perf: image format change stays responsive",
    controlLabel: "Format",
    expectedObservable: "Changing image format updates export settings without blocking the canvas.",
    fixture: "Image Export section default state",
    id: "image-format-change",
    target: "export.image.format",
  },
  {
    automatedTestName: "export.image.resolution change stays responsive",
    browserTestName: "browser perf: image resolution change stays responsive",
    controlLabel: "Resolution",
    expectedObservable: "Changing image resolution updates export settings without blocking the canvas.",
    fixture: "Image Export section at 8K",
    id: "image-resolution-change",
    target: "export.image.resolution",
    workload: {
      stressValue: "8k",
      values: { default: "4k", max: "8k", min: "2k" },
    },
  },
  {
    automatedTestName: "export.video.format change stays responsive",
    browserTestName: "browser perf: video format change stays responsive",
    controlLabel: "Format",
    expectedObservable: "Changing video format updates export settings without blocking the canvas.",
    fixture: "Video Export section default state",
    id: "video-format-change",
    target: "export.video.format",
  },
  {
    automatedTestName: "export.video.resolution change stays responsive",
    browserTestName: "browser perf: video resolution change stays responsive",
    controlLabel: "Resolution",
    expectedObservable: "Changing video resolution updates export settings without blocking the canvas.",
    fixture: "Video Export section at 4K",
    id: "video-resolution-change",
    target: "export.video.resolution",
    workload: {
      stressValue: "4k",
      values: { default: "current", max: "4k", min: "current" },
    },
  },
];

const controlChangeScenarios: ToolcraftPerformanceScenario[] = controlChangeSpecs.map((spec) => ({
  automated: true,
  automatedTestName: spec.automatedTestName,
  browser: true,
  browserTestName: spec.browserTestName,
  budget: { maxFrameGapMs: 120, maxInteractionMs: 2000 },
  controlLabel: spec.controlLabel,
  expectedObservable: spec.expectedObservable,
  fixture: spec.fixture,
  id: spec.id,
  interaction: "control-change",
  stressFixture: spec.workload
    ? {
        kind: "max-value",
        loadProfile: {
          hardLimit: spec.workload.values.max,
          metric: "custom",
          smoothTarget: spec.workload.stressValue,
          smoothTargetRatio: 1,
          target: spec.target,
          userFacingRange: "fully-guaranteed",
        },
        reason: `${spec.target} at its heaviest export tier is the representative worst case for this control.`,
        value: spec.workload.stressValue,
      }
    : undefined,
  target: spec.target,
  values: spec.workload?.values,
  workload: Boolean(spec.workload),
}));

const columnsDragScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "grid.columns drag stays responsive at the densest grid",
  browser: true,
  browserTestName: "browser perf: columns drag stays responsive",
  budget: { maxFrameGapMs: 120, maxInteractionMs: 2000 },
  controlLabel: "Columns",
  expectedObservable: "Dragging Columns to its max redraws the circle grid live without blocking the canvas.",
  fixture: "circle grid dragged to 40 columns",
  id: "columns-drag",
  interaction: "control-drag",
  stressFixture: {
    kind: "max-value",
    loadProfile: {
      hardLimit: 40,
      metric: "numeric-max",
      smoothTarget: 40,
      smoothTargetRatio: 1,
      target: "grid.columns",
      userFacingRange: "fully-guaranteed",
    },
    reason: "40 columns is the densest exposed grid and produces the most squares drawn per frame.",
    value: 40,
  },
  target: "grid.columns",
  values: { default: 22, max: 40, min: 8 },
  workload: true,
};

const gapDragScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "grid.gap drag stays responsive at the densest grid",
  browser: true,
  browserTestName: "browser perf: gap drag stays responsive",
  budget: { maxFrameGapMs: 120, maxInteractionMs: 2000 },
  controlLabel: "Gap",
  expectedObservable: "Dragging Gap redraws every square's size live without blocking the canvas.",
  fixture: "circle grid at 40 columns dragging Gap to 80%",
  id: "gap-drag",
  interaction: "control-drag",
  stressFixture: {
    kind: "max-value",
    loadProfile: {
      hardLimit: 80,
      metric: "numeric-max",
      smoothTarget: 80,
      smoothTargetRatio: 1,
      target: "grid.gap",
      userFacingRange: "fully-guaranteed",
    },
    reason: "80% gap at the densest 40-column grid is the heaviest square re-layout case.",
    value: 80,
  },
  target: "grid.gap",
  values: { default: 60, max: 80, min: 0 },
  workload: true,
};

const jitterDragScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "grid.jitter drag stays responsive",
  browser: true,
  browserTestName: "browser perf: jitter drag stays responsive",
  budget: { maxFrameGapMs: 120, maxInteractionMs: 2000 },
  controlLabel: "Jitter",
  expectedObservable:
    "Dragging Jitter re-scatters every square's offset live without blocking the canvas.",
  fixture: "circle grid at 40 columns dragging Jitter to 100%",
  id: "jitter-drag",
  interaction: "control-drag",
  stressFixture: {
    kind: "max-value",
    loadProfile: {
      hardLimit: 100,
      metric: "numeric-max",
      smoothTarget: 100,
      smoothTargetRatio: 1,
      target: "grid.jitter",
      userFacingRange: "fully-guaranteed",
    },
    reason:
      "100% jitter recomputes the largest per-cell offsets during the shared grid layout pass.",
    value: 100,
  },
  target: "grid.jitter",
  values: { default: 70, max: 100, min: 0 },
  workload: true,
};

const speedDragScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "pattern.speed drag stays responsive",
  browser: true,
  browserTestName: "browser perf: speed drag stays responsive",
  budget: { maxFrameGapMs: 120, maxInteractionMs: 2000 },
  controlLabel: "Speed",
  expectedObservable: "Dragging Speed updates the sweep cycle count live without blocking the canvas.",
  fixture: "circle grid default state",
  id: "speed-drag",
  interaction: "control-drag",
  target: "pattern.speed",
  values: { default: 2, max: 6, min: 1 },
  workload: false,
};

const previewRenderScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "renders the halftone preview within budget",
  browser: true,
  browserTestName: "browser perf: preview render stays under budget",
  budget: { maxPreviewMs: 400 },
  expectedObservable: "The circle grid renders without freezing the preview.",
  fixture: "circle grid at 40 columns, 1920x1080 canvas",
  id: "preview-render",
  interaction: "preview-render",
  workload: false,
};

const viewportStabilityScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "keeps canvas viewport stable while pattern controls change",
  browser: true,
  browserTestName: "browser perf: viewport stays stable",
  budget: { maxFrameGapMs: 120 },
  expectedObservable: "Canvas zoom and offset do not jump while pattern controls change.",
  fixture: "circle grid default state",
  id: "viewport-stability",
  interaction: "viewport-stability",
  workload: false,
};

const exportCopyScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "exports the PNG within budget",
  browser: true,
  browserTestName: "browser perf: export png stays under budget",
  budget: { maxExportMs: 4000 },
  expectedObservable: "Export PNG completes and returns image bytes without freezing the UI.",
  fixture: "circle grid PNG export at 4K resolution",
  id: "export-copy",
  interaction: "export-copy",
  workload: false,
};

export const appPerformance: ToolcraftPerformanceConfig = defineToolcraftPerformance({
  browserCheckPolicy: {
    fallbackRunner: "playwright",
    fallbackWhen: ["agent-browser-unavailable", "ci"],
    preferredRunner: "agent-browser",
  },
  rendererPipeline: {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["grid-layout", "pattern-mask"],
        targets: ["grid.columns", "grid.gap", "grid.jitter"],
      },
      {
        interaction: "control-drag",
        invalidates: ["pattern-mask"],
        targets: ["pattern.speed"],
      },
      {
        interaction: "control-change",
        invalidates: ["pattern-mask"],
        targets: [
          "pattern.mode",
          "pattern.direction",
          "pattern.reverse",
          "style.onColor",
          "style.offColor",
          "export.includeBackground",
          "scene.background",
        ],
      },
      {
        interaction: "control-change",
        invalidates: ["export-render"],
        targets: [
          "export.image.format",
          "export.image.resolution",
          "export.video.format",
          "export.video.resolution",
        ],
      },
      {
        interaction: "export",
        invalidates: ["export-render"],
        targets: [
          "export.image.format",
          "export.image.resolution",
          "export.video.format",
          "export.video.resolution",
        ],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        targets: ["canvas.zoom"],
      },
    ],
    passes: [
      {
        cacheKey: ["grid.columns", "grid.gap", "canvas.size.width", "canvas.size.height"],
        id: "grid-layout",
        inputs: ["grid.columns", "grid.gap", "canvas.size.width", "canvas.size.height"],
        invalidatedBy: ["grid.columns", "grid.gap", "canvas.size.width", "canvas.size.height"],
        kind: "vector-build",
        output: "intermediate",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: [
          "pattern.mode",
          "pattern.direction",
          "pattern.reverse",
          "pattern.speed",
          "timeline.currentTimeSeconds",
          "style.onColor",
          "style.offColor",
          "scene.background",
          "export.includeBackground",
        ],
        id: "pattern-mask",
        inputs: [
          "grid-layout",
          "pattern.mode",
          "pattern.direction",
          "pattern.reverse",
          "pattern.speed",
          "timeline.currentTimeSeconds",
          "style.onColor",
          "style.offColor",
          "scene.background",
          "export.includeBackground",
        ],
        invalidatedBy: [
          "pattern.mode",
          "pattern.direction",
          "pattern.reverse",
          "pattern.speed",
          "timeline.currentTimeSeconds",
          "style.onColor",
          "style.offColor",
          "scene.background",
          "export.includeBackground",
        ],
        kind: "composite",
        output: "preview",
        quality: "full",
        runsOn: "main",
      },
      {
        id: "export-render",
        inputs: [
          "grid-layout",
          "pattern-mask",
          "export.image.format",
          "export.image.resolution",
          "export.video.format",
          "export.video.resolution",
        ],
        invalidatedBy: [
          "export.image.format",
          "export.image.resolution",
          "export.video.format",
          "export.video.resolution",
        ],
        kind: "export",
        output: "export",
        quality: "export",
        runsOn: "export-only",
      },
    ],
  },
  rendererStrategy: "canvas-2d",
  rendererTechnique: {
    exportRenderer: "canvas-2d",
    fidelityRisks: [
      "Canvas 2D rectangle edges are slightly softer than crisp SVG strokes at high zoom, but the halftone reference does not need pixel-perfect vector edges.",
    ],
    intentionalRasterizationReason:
      "The product is a dense field of up to ~1,600 independently toggling squares that must recomposite every animation frame; drawing them as one Canvas 2D raster pass is cheaper per frame than diffing that many individual DOM/SVG nodes.",
    layers: [
      {
        content: ["composite"],
        exportMode: "included",
        id: "background",
        kind: "background",
        primitiveCount: "low",
        renderer: "canvas-2d",
      },
      {
        content: ["geometry"],
        exportMode: "included",
        id: "grid",
        kind: "product-foreground",
        intentionalRasterizationReason:
          "Up to ~1,600 squares toggle on/off every animation frame; Canvas 2D fillRect/strokeRect draws the whole grid in one pass instead of mutating that many DOM/SVG elements per frame.",
        primitiveCount: "medium",
        renderer: "canvas-2d",
        uiSelector: '[data-testid="pattern-canvas"]',
      },
    ],
    performanceRisks: [
      "Raising Columns toward its 40 maximum increases per-frame draw calls; the columns-drag control-drag performance scenario measures this at the declared hard limit.",
    ],
    previewRenderer: "canvas-2d",
    productRepresentation: "vector",
    rendererStrategy: "canvas-2d",
    rendererWorkload: "simple-composition",
    sourceRepresentation: "procedural-data",
    whyNotAlternativeStrategies: [
      "DOM/SVG were considered for the squares, but per-element updates at up to ~1,600 nodes every animation frame would create far more style/layout recalculation than one Canvas 2D fillRect/strokeRect pass over a plain 2D context.",
      "WebGL/WebGPU were considered and rejected for v1 because the workload is a low/medium-count shape composite (max 1,600 rectangles), not per-pixel image processing, noise, or shader work; Canvas 2D redraws this comfortably every frame without GPU pipeline setup overhead.",
    ],
  },
  rendererWorkload: "simple-composition",
  scenarios: [
    previewRenderScenario,
    columnsDragScenario,
    gapDragScenario,
    jitterDragScenario,
    speedDragScenario,
    ...controlChangeScenarios,
    viewportStabilityScenario,
    exportCopyScenario,
  ],
  usesCustomRenderer: true,
  workloadTargets: ["grid.columns", "grid.gap", "grid.jitter", "export.image.resolution", "export.video.resolution"],
});
