import {
  createToolcraftPngExportCanvas,
  getToolcraftVideoExportSize,
  shouldIncludeToolcraftExportBackground,
} from "@/toolcraft/runtime";
import type { ToolcraftState } from "@/toolcraft/runtime";

import { createToolcraftHalftoneDrawCache, drawToolcraftHalftonePattern } from "./draw-pattern";
import type { ToolcraftHalftoneDirection, ToolcraftHalftonePatternMode } from "./pattern-math";

function getPatternSettingsFromState(state: ToolcraftState, loopProgress: number) {
  const offColorValue = state.values["style.offColor"] as
    | { hex?: string; opacity?: number }
    | undefined;

  return {
    columns: Number(state.values["grid.columns"] ?? 22),
    direction: (state.values["pattern.direction"] as ToolcraftHalftoneDirection) ?? "horizontal",
    gap: Number(state.values["grid.gap"] ?? 60),
    jitter: Number(state.values["grid.jitter"] ?? 70),
    loopProgress,
    mode: (state.values["pattern.mode"] as ToolcraftHalftonePatternMode) ?? "wave",
    offColor: {
      hex: offColorValue?.hex ?? "#7C8591",
      opacity: offColorValue?.opacity ?? 22,
    },
    onColor: String(state.values["style.onColor"] ?? "#FFFFFF"),
    reverse: Boolean(state.values["pattern.reverse"]),
    speed: Number(state.values["pattern.speed"] ?? 2),
  };
}

export type ToolcraftImageExportResult = {
  canvas: HTMLCanvasElement;
  extension: "jpg" | "png";
  mimeType: "image/jpeg" | "image/png";
};

export function exportToolcraftPatternPng(state: ToolcraftState): ToolcraftImageExportResult {
  const includeBackground = shouldIncludeToolcraftExportBackground({
    format: "png",
    schema: state.schema,
  });
  const backgroundColor = String(state.values["scene.background"] ?? "#000000");
  const loopProgress = 0;
  const requestedFormat = String(state.values["export.image.format"] ?? "png").toLowerCase();
  const isJpg = requestedFormat === "jpg" || requestedFormat === "jpeg";

  const canvas = createToolcraftPngExportCanvas({
    background: backgroundColor,
    includeBackground:
      includeBackground && Boolean(state.values["export.includeBackground"] ?? true),
    render: ({ context, cssHeight, cssWidth, includeBackground: renderIncludeBackground }) => {
      drawToolcraftHalftonePattern({
        backgroundColor,
        context,
        // JPG has no alpha channel, so it always keeps the background.
        cssHeight,
        cssWidth,
        includeBackground: isJpg ? true : renderIncludeBackground,
        settings: getPatternSettingsFromState(state, loopProgress),
      });
    },
    resolution: state.values["export.image.resolution"] as string | undefined,
    state,
  });

  return {
    canvas,
    extension: isJpg ? "jpg" : "png",
    mimeType: isJpg ? "image/jpeg" : "image/png",
  };
}

const preferredVideoMimeTypesByFormat: Record<string, readonly string[]> = {
  mp4: [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ],
  webm: ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"],
};

export function getToolcraftSupportedVideoMimeType(format: string): string {
  const candidates = preferredVideoMimeTypesByFormat[format] ?? preferredVideoMimeTypesByFormat.webm!;

  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "video/webm";
}

const videoExportFrameRate = 30;

export type ToolcraftVideoExportResult = {
  blob: Blob;
  mimeType: string;
};

export async function exportToolcraftPatternVideo(
  state: ToolcraftState,
  onProgress?: (progress: number) => void,
): Promise<ToolcraftVideoExportResult> {
  const backgroundColor = String(state.values["scene.background"] ?? "#000000");
  const { height, width } = getToolcraftVideoExportSize({
    resolution: state.values["export.video.resolution"] as string | undefined,
    state,
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Toolcraft video export requires a 2D canvas context.");
  }

  const scaleX = width / state.canvas.size.width;
  const scaleY = height / state.canvas.size.height;
  const format = String(state.values["export.video.format"] ?? "mp4");
  const mimeType = getToolcraftSupportedVideoMimeType(format);
  const durationSeconds = Math.max(0.1, state.timeline.durationSeconds);
  const totalFrames = Math.max(1, Math.round(durationSeconds * videoExportFrameRate));
  const frameDurationMs = 1000 / videoExportFrameRate;

  const stream = canvas.captureStream(0);
  const [videoTrack] = stream.getVideoTracks();

  if (!videoTrack || typeof (videoTrack as unknown as { requestFrame?: () => void }).requestFrame !== "function") {
    throw new Error("Toolcraft video export requires a canvas video track that supports requestFrame.");
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = (event) => {
      reject(
        event instanceof ErrorEvent
          ? event.error
          : new Error("Toolcraft video export recorder failed."),
      );
    };
    recorder.onstop = () => {
      if (chunks.length === 0) {
        reject(new Error("Toolcraft video export produced no encoded video data."));
        return;
      }

      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start();
  const recordingStartedAt = performance.now();

  const drawCache = createToolcraftHalftoneDrawCache();

  try {
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
      const timeSeconds = (frameIndex / totalFrames) * durationSeconds;
      const loopProgress = durationSeconds > 0 ? timeSeconds / durationSeconds : 0;

      context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      drawToolcraftHalftonePattern({
        backgroundColor,
        cache: drawCache,
        context,
        cssHeight: state.canvas.size.height,
        cssWidth: state.canvas.size.width,
        includeBackground: true,
        settings: getPatternSettingsFromState(state, loopProgress),
      });

      (videoTrack as unknown as { requestFrame: () => void }).requestFrame();
      onProgress?.(frameIndex / totalFrames);

      // The recorder captures wall-clock time, so pace against an absolute
      // schedule: drawing time is absorbed into each frame's budget instead
      // of stacking on top of it and stretching the exported duration.
      const nextFrameAt = recordingStartedAt + (frameIndex + 1) * frameDurationMs;
      const waitMs = nextFrameAt - performance.now();
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  } finally {
    recorder.stop();
  }

  const blob = await recordingDone;
  onProgress?.(1);

  return { blob, mimeType };
}
