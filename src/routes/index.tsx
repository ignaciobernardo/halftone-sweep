import { ToolcraftApp } from "@/toolcraft/runtime/react";

import { exportToolcraftPatternPng, exportToolcraftPatternVideo } from "../app/export";
import { appSchema } from "../app/app-schema";
import { ToolcraftPatternCanvas } from "../app/product-renderer";

function downloadCanvasAsImage(
  canvas: HTMLCanvasElement,
  mimeType: "image/jpeg" | "image/png",
  fileName: string,
): void {
  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }, mimeType);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function AppHome(): React.JSX.Element {
  return (
    <ToolcraftApp
      canvasContent={<ToolcraftPatternCanvas />}
      className="h-dvh min-h-dvh"
      onPanelAction={async ({ action, reportProgress, state }) => {
        const value = typeof action === "string" ? action : action.value;

        if (value === "export.png") {
          const { canvas, extension, mimeType } = exportToolcraftPatternPng(state);
          downloadCanvasAsImage(canvas, mimeType, `pixel-sweep.${extension}`);
          return;
        }

        if (value === "export.video") {
          const { blob, mimeType } = await exportToolcraftPatternVideo(state, reportProgress);
          const extension = mimeType.includes("mp4") ? "mp4" : "webm";
          downloadBlob(blob, `pixel-sweep.${extension}`);
        }
      }}
      renderDefaultCanvasMedia={false}
      schema={appSchema}
    />
  );
}
