# Pixel Sweep — Product Spec

## Product

A generative visual effect: a circular grid of small squares that
independently toggle between an "on" (filled, bright) state and an "off"
(hollow outline, dim) state as a user-selectable sweep pattern travels
across the grid, looping forward seamlessly. Squares outside the circular
silhouette are never generated.

## Animation Intent Inventory

- Classification: **timeline-playback**.
- Reason: the app exposes `Export Video`, so the top Toolcraft timeline is
  required. The sweep is user-driven decorative motion with play/pause,
  scrub, duration, and loop, which matches the playback timeline case
  exactly (not autonomous, not keyframes — no per-property keyframe
  editing is offered).
- `loopDuration`: 6 seconds, `source: "product-derived"`. Every pattern
  mode is expressed as an integer number of sweep cycles across the loop
  progress (`pattern.speed`, 1–6 cycles), so the loop length itself is a
  product decision, not a reference or explicit user-specified value. 6s
  was chosen as a comfortable default read length for the default Speed
  of 2 cycles.
- Loops are seamless and forward-only by construction: every pattern mode
  computes an "on" mask purely from `loopProgress * cycles mod 1`
  compared with a wrapped/periodic distance function, so the mask at
  progress 0 and progress 1 are identical and motion never reverses,
  mirrors, or ping-pongs. See `src/app/pattern-math.ts`.

## Control Selection Inventory

| Product need | Value model | Candidate built-ins checked | Best built-in | Why | Target |
| --- | --- | --- | --- | --- | --- |
| Pattern mode | one of 4 named modes | select, segmented | select | segmented is capped at 4 options with 9-char labels; "Radial Pulse" does not fit segmented label limits, so select is used | `pattern.mode` |
| Curtain direction | one of 2 axes | select, segmented | segmented | short, finite, 2-option mode choice inside the same entity as Pattern | `pattern.direction` |
| Curtain reverse | boolean | switch | switch | binary include/exclude toggle | `pattern.reverse` |
| Sweep speed | 1–6 integer cycles | slider | slider | continuous-feeling numeric range with a real semantic meaning ("speed") | `pattern.speed` |
| Grid density | 8–40 columns | slider | slider | large-range numeric value, not a small semantic discrete set | `grid.columns` |
| Square spacing | 0–6px | slider (discrete) | slider variant discrete | small semantic integer domain matching runtime discrete-slider classification | `grid.gap` |
| On-color | free hex | color | color | free hex color entry, no opacity ownership needed | `style.onColor` |
| Off-color + opacity | hex + opacity, one entity | colorOpacity | colorOpacity | color and opacity belong to the same "off square" entity per `control-selection.md` | `style.offColor` |
| Output background | color + include toggle | color + switch | color + switch (mandatory Background section) | required by `core/setup-export.md` | `scene.background`, `export.includeBackground` |
| Image/video export format & resolution | finite option pairs | select | select | required by `core/setup-export.md` Image Export / Video Export sections | `export.image.*`, `export.video.*` |
| Silhouette shape | single fixed option (circle) | none needed | none | only one shape is required for v1; a select/segmented with a single option would be a no-op control, so no shape control is exposed. The architecture (`buildToolcraftHalftoneGrid`) stays open to a future shape parameter without exposing dead UI now. | n/a |

## Renderer Technique Decision Matrix

- `sourceRepresentation`: `procedural-data` — the grid and sweep mask are
  computed procedurally from control values and timeline time; there is
  no uploaded/reference source.
- `productRepresentation`: `vector` — the output is a set of filled/
  stroked rectangles (vector shapes), not per-pixel image processing.
- `previewRenderer`: `canvas-2d`.
- `exportRenderer`: `canvas-2d` (PNG export renders through the same
  Canvas 2D draw function; video export captures that same canvas via
  `MediaRecorder`).
- `rendererWorkload`: `simple-composition` — up to ~1,600 rectangles per
  frame is a low/medium-count shape composite, not per-pixel image
  processing, noise, or shader work.
- `rendererStrategy`: `canvas-2d`.
- `whyNotAlternativeStrategies`:
  - DOM/SVG were evaluated for the squares. Per-element DOM/SVG updates at
    up to ~1,600 nodes every animation frame would create far more style/
    layout recalculation per frame than one Canvas 2D `fillRect`/
    `strokeRect` pass over a plain 2D context.
  - WebGL/WebGPU were evaluated and rejected for v1 because the workload
    is a low/medium-count shape composite (max 1,600 rectangles), not
    per-pixel image processing, noise, or shader work; Canvas 2D redraws
    this comfortably every frame without GPU pipeline setup overhead.
    `productRepresentation` is intentionally `vector`, not `pixel`, so
    `rendererWorkload` stays `simple-composition` rather than
    `pixel-output`; the `intentionalRasterizationReason` on the technique
    and on the `grid` layer explains why the vector shapes are still
    drawn into a single Canvas 2D raster surface instead of individual
    DOM/SVG nodes.
- `fidelityRisks`: Canvas 2D rectangle edges are slightly softer than
  crisp SVG strokes at high zoom, but the halftone reference does not
  require pixel-perfect vector edges.
- `performanceRisks`: raising `Columns` toward its 40 maximum increases
  per-frame draw calls; the `columns-drag` control-drag performance
  scenario measures this at the declared hard limit (see
  `app-performance.ts`).

## Renderer Layer Inventory

Mirrored in `app-performance.ts` `rendererTechnique.layers`.

- `backgroundLayer` (`id: "background"`, `kind: "background"`): a single
  solid fill (`content: ["composite"]`), Canvas 2D, low primitive count,
  export mode `included`.
- `productForegroundLayer` (`id: "grid"`, `kind: "product-foreground"`):
  the halftone grid of squares (`content: ["geometry"]`), Canvas 2D,
  medium primitive count (max ~1,600 rectangles), `uiSelector:
  '[data-testid="pattern-canvas"]'`, export mode `included`. This is the
  layer with `intentionalRasterizationReason` because it is
  semantic vector geometry (squares) drawn on a raster Canvas 2D surface
  instead of DOM/SVG, justified by the per-frame animated toggle count.
- There is no `editingHandlesLayer` or separate `exportComposite` layer:
  export reuses the same draw function as preview (see
  `src/app/draw-pattern.ts`), and there are no on-canvas drag handles for
  this product.

## Render Pipeline Inventory

Mirrored in `app-performance.ts` `rendererPipeline`.

- Pass `grid-layout` (`kind: "vector-build"`, `runsOn: "main"`): lays out
  the circular grid of square centers from `grid.columns`, `grid.gap`,
  and `canvas.size`. `cacheKey`: `grid.columns`, `grid.gap`,
  `canvas.size.width`, `canvas.size.height`.
- Pass `pattern-mask` (`kind: "composite"`, `runsOn: "main"`): computes
  the on/off mask and draws every square for the current frame from
  `pattern.mode`, `pattern.direction`, `pattern.reverse`, `pattern.speed`,
  `timeline.currentTimeSeconds`, `style.onColor`, `style.offColor`,
  `scene.background`, and `export.includeBackground`. `cacheKey` lists
  every one of those inputs.
- Pass `export-render` (`kind: "export"`, `runsOn: "export-only"`):
  re-renders the same draw function at the selected `export.image.*` /
  `export.video.*` resolution for PNG/video export.
- `interactionInvalidation` declares `control-drag` (Columns/Gap
  invalidate `grid-layout` + `pattern-mask`; Speed invalidates only
  `pattern-mask`), `control-change` (pattern/color/background controls
  invalidate `pattern-mask`; export format/resolution controls invalidate
  `export-render`), `export` (export format/resolution invalidate
  `export-render`), and `viewport-zoom` (canvas zoom invalidates nothing
  — zoom/pan never recomputes the grid or mask, matching the interaction
  performance rule that viewport work must not invalidate expensive
  upstream passes).

## Export

- Still output: `Export PNG` via `createToolcraftPngExportCanvas`, honoring
  `export.image.format`/`export.image.resolution` and
  `shouldIncludeToolcraftExportBackground`/`export.includeBackground`.
- Animated output: `Export Video` renders frames offline at a fixed 30fps
  through the same draw function, paces real time to the frame duration so
  exported duration always matches `state.timeline.durationSeconds`
  regardless of how fast drawing itself is, and uses
  `getToolcraftVideoExportSize` for Current/4K sizing. MediaRecorder
  capability is checked with `MediaRecorder.isTypeSupported` before
  choosing the MIME/container, falling back to a supported WebM codec
  when MP4 is unavailable.
