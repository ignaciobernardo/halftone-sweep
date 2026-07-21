"use client";

import * as React from "react";

import { useToolcraft } from "@/toolcraft/runtime/react";
import {
  getToolcraftTimelineLoopProgress,
  shouldIncludeToolcraftPreviewBackground,
} from "@/toolcraft/runtime";

import { createToolcraftHalftoneDrawCache, drawToolcraftHalftonePattern } from "./draw-pattern";
import type { ToolcraftHalftoneDirection, ToolcraftHalftonePatternMode } from "./pattern-math";

export function ToolcraftPatternCanvas(): React.JSX.Element {
  const { state } = useToolcraft();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const drawCacheRef = React.useRef(createToolcraftHalftoneDrawCache());

  const mode = (state.values["pattern.mode"] as ToolcraftHalftonePatternMode) ?? "wave";
  const direction = (state.values["pattern.direction"] as ToolcraftHalftoneDirection) ?? "horizontal";
  const reverse = Boolean(state.values["pattern.reverse"]);
  const speed = Number(state.values["pattern.speed"] ?? 2);
  const columns = Number(state.values["grid.columns"] ?? 22);
  const gap = Number(state.values["grid.gap"] ?? 60);
  const jitter = Number(state.values["grid.jitter"] ?? 70);
  const onColor = String(state.values["style.onColor"] ?? "#FFFFFF");
  const offColorValue = state.values["style.offColor"] as
    | { hex?: string; opacity?: number }
    | undefined;
  const offColor = {
    hex: offColorValue?.hex ?? "#7C8591",
    opacity: offColorValue?.opacity ?? 22,
  };
  const backgroundColor = String(state.values["scene.background"] ?? "#000000");
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });
  const cssWidth = state.canvas.size.width;
  const cssHeight = state.canvas.size.height;
  const renderScale = Number(state.values["canvas.renderScale"] ?? 2);

  // The pattern is a step effect (cells are either on or off), so redrawing
  // faster than 24 updates per second changes nothing visible. Quantizing the
  // loop progress lets most timeline ticks skip the canvas redraw entirely,
  // keeping the main thread responsive while playback runs.
  const rawLoopProgress = getToolcraftTimelineLoopProgress(state.timeline);
  const loopSteps = Math.max(24, Math.round(state.timeline.durationSeconds * 24));
  const loopProgress = Math.round(rawLoopProgress * loopSteps) / loopSteps;

  React.useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const devicePixelRatio =
      typeof window !== "undefined" && Number.isFinite(window.devicePixelRatio)
        ? window.devicePixelRatio
        : 1;
    const pixelRatio = Math.max(1, devicePixelRatio) * Math.max(1, renderScale);
    const backingWidth = Math.max(1, Math.round(cssWidth * pixelRatio));
    const backingHeight = Math.max(1, Math.round(cssHeight * pixelRatio));

    if (canvas.width !== backingWidth) {
      canvas.width = backingWidth;
    }

    if (canvas.height !== backingHeight) {
      canvas.height = backingHeight;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawToolcraftHalftonePattern({
      backgroundColor,
      cache: drawCacheRef.current,
      context,
      cssHeight,
      cssWidth,
      includeBackground,
      settings: {
        columns,
        direction,
        gap,
        jitter,
        loopProgress,
        mode,
        offColor,
        onColor,
        reverse,
        speed,
      },
      // Resizing the backing store clears the canvas, so the backing
      // dimensions are part of the cache key to force a full redraw then.
      surfaceKey: `${backingWidth}x${backingHeight}`,
    });
  }, [
    backgroundColor,
    columns,
    cssHeight,
    cssWidth,
    direction,
    gap,
    includeBackground,
    jitter,
    loopProgress,
    mode,
    offColor.hex,
    offColor.opacity,
    onColor,
    renderScale,
    reverse,
    speed,
  ]);

  return (
    <canvas
      className="block size-full"
      data-testid="pattern-canvas"
      ref={canvasRef}
      style={{ height: "100%", width: "100%" }}
    />
  );
}
