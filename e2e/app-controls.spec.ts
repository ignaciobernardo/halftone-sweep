import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import {
  clickToolcraftSegmentedOption,
  editToolcraftTimelineDuration,
  selectToolcraftOption,
  selectToolcraftOptionInSection,
  setToolcraftColorHex,
  setToolcraftColorOpacity,
  toggleToolcraftSwitch,
} from "./pixel-sweep-helpers";
import {
  expectToolcraftDiscreteSliderDragSmoothness,
  expectToolcraftSegmentedControlCellsPreservePadding,
  getToolcraftFieldByLabel,
  waitForToolcraftAnimationFrames,
} from "./performance-helpers";
import {
  expectToolcraftProductObservableToChange,
  getToolcraftProductObservableSnapshot,
} from "./product-observable-helpers";

function decodePngDimensions(buffer: Buffer): { height: number; width: number } {
  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

async function decodeImageDimensionsInPage(
  page: import("@playwright/test").Page,
  buffer: Buffer,
  mimeType: string,
): Promise<{ height: number; width: number }> {
  const base64 = buffer.toString("base64");

  return page.evaluate(
    async ({ base64Data, type }) => {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      const blob = new Blob([bytes], { type });
      const bitmap = await createImageBitmap(blob);
      const dimensions = { height: bitmap.height, width: bitmap.width };
      bitmap.close();
      return dimensions;
    },
    { base64Data: base64, type: mimeType },
  );
}

async function loadVideoDurationMetadataInPage(
  page: import("@playwright/test").Page,
  buffer: Buffer,
  mimeType: string,
): Promise<{ duration: number; videoHeight: number; videoWidth: number }> {
  const base64 = buffer.toString("base64");

  return page.evaluate(
    async ({ base64Data, type }) => {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      const blob = new Blob([bytes], { type });
      const url = URL.createObjectURL(blob);
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.addEventListener("loadedmetadata", () => resolve());
        video.addEventListener("error", () => reject(new Error("video failed to load")));
      });

      const result = {
        duration: video.duration,
        videoHeight: video.videoHeight,
        videoWidth: video.videoWidth,
      };
      URL.revokeObjectURL(url);
      return result;
    },
    { base64Data: base64, type: mimeType },
  );
}

test("browser: pixel sweep opens with the product controls panel", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.getByRole("application", { name: "Canvas viewport" })).toBeVisible();
  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  await expect(
    page.locator('[data-slot="panel-title"]').filter({ hasText: "Pattern" }),
  ).toBeVisible();
});

test("browser: pattern select changes product output", async ({ page }) => {
  await page.goto("/");

  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Pattern", "Curtain");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Pattern", "Fan");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Pattern", "Fan 3");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Pattern", "Radial Pulse");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Pattern", "Random");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Pattern", "Wave");
  });
});

test("browser: direction segmented changes curtain axis and hides outside curtain mode", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("Direction", { exact: true })).toHaveCount(0);

  await selectToolcraftOption(page, "Pattern", "Curtain");
  await expect(page.getByText("Direction", { exact: true })).toBeVisible();

  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Direction");

  await clickToolcraftSegmentedOption(page, "Direction", "Horiz.");
  const before = await getToolcraftProductObservableSnapshot(page);
  await clickToolcraftSegmentedOption(page, "Direction", "Vert.");
  await waitForToolcraftAnimationFrames(page, 3);
  const after = await getToolcraftProductObservableSnapshot(page);
  expect(after).not.toBe(before);

  await selectToolcraftOption(page, "Pattern", "Wave");
  await expect(page.getByText("Direction", { exact: true })).toHaveCount(0);
});

test("browser: reverse switch flips curtain travel direction and hides outside curtain mode", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("Reverse", { exact: true })).toHaveCount(0);

  await selectToolcraftOption(page, "Pattern", "Curtain");
  await expect(page.getByText("Reverse", { exact: true })).toBeVisible();

  await expectToolcraftProductObservableToChange(page, async () => {
    await toggleToolcraftSwitch(page, "Reverse");
  });

  await selectToolcraftOption(page, "Pattern", "Wave");
  await expect(page.getByText("Reverse", { exact: true })).toHaveCount(0);
});

test("browser: speed slider changes product output live while dragging", async ({ page }) => {
  await page.goto("/");

  const before = await getToolcraftProductObservableSnapshot(page);
  const field = await getToolcraftFieldByLabel(page, "Speed");
  const slider = field.locator('[data-slot="slider"], [role="slider"]').first();
  const box = await slider.boundingBox();
  if (!box) {
    throw new Error("Could not measure Speed slider.");
  }

  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height / 2, { steps: 10 });
  await waitForToolcraftAnimationFrames(page, 3);
  const duringDrag = await getToolcraftProductObservableSnapshot(page);
  await page.mouse.up();

  expect(duringDrag).not.toBe(before);
});

test("browser: columns slider changes product output live while dragging", async ({ page }) => {
  await page.goto("/");

  const before = await getToolcraftProductObservableSnapshot(page);
  const field = await getToolcraftFieldByLabel(page, "Columns");
  const slider = field.locator('[data-slot="slider"], [role="slider"]').first();
  const box = await slider.boundingBox();
  if (!box) {
    throw new Error("Could not measure Columns slider.");
  }

  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, { steps: 10 });
  await waitForToolcraftAnimationFrames(page, 3);
  const duringDrag = await getToolcraftProductObservableSnapshot(page);
  await page.mouse.up();

  expect(duringDrag).not.toBe(before);
});

test("browser: gap slider changes product output live while dragging", async ({ page }) => {
  await page.goto("/");

  const before = await getToolcraftProductObservableSnapshot(page);
  const field = await getToolcraftFieldByLabel(page, "Gap");
  const slider = field.locator('[data-slot="slider"][data-variant="discrete"]').first();
  await expect(slider).toBeVisible();
  await slider.hover();
  await expect(field.locator('[data-slot="slider-marker"]').first()).toBeVisible();
  const box = await slider.boundingBox();
  if (!box) {
    throw new Error("Could not measure Gap slider.");
  }

  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height / 2, { steps: 10 });
  await waitForToolcraftAnimationFrames(page, 3);
  const duringDrag = await getToolcraftProductObservableSnapshot(page);
  await page.mouse.up();

  expect(duringDrag).not.toBe(before);

  // Headless software rendering of the 2x-scale canvas backing plus parallel
  // test workers make total drag time highly variable; the frame-gap guard
  // stays at its default as the real freeze/jank check, and the total budget
  // only bounds runaway interactions.
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Gap", {
    maxFrameGapMs: 250,
    maxInteractionMs: 8000,
  });
});

test("browser: jitter slider changes product output live while dragging", async ({ page }) => {
  await page.goto("/");

  const before = await getToolcraftProductObservableSnapshot(page);
  const field = await getToolcraftFieldByLabel(page, "Jitter");
  const slider = field.locator('[data-slot="slider"], [role="slider"]').first();
  const box = await slider.boundingBox();
  if (!box) {
    throw new Error("Could not measure Jitter slider.");
  }

  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2, { steps: 10 });
  await waitForToolcraftAnimationFrames(page, 3);
  const duringDrag = await getToolcraftProductObservableSnapshot(page);
  await page.mouse.up();

  expect(duringDrag).not.toBe(before);
});

test("browser: resolution scale discrete slider renders the discrete variant with markers", async ({
  page,
}) => {
  await page.goto("/");

  const field = await getToolcraftFieldByLabel(page, "Resolution scale");
  const slider = field.locator('[data-slot="slider"][data-variant="discrete"]').first();
  await expect(slider).toBeVisible();
  await slider.hover();
  await expect(field.locator('[data-slot="slider-marker"]').first()).toBeVisible();

  const before = await getToolcraftProductObservableSnapshot(page);
  // Each discrete step reallocates the canvas backing store (up to 3x render
  // scale, ~17MP software-rendered in headless), so the frame-gap guard needs
  // headroom for one full-scale re-render; the total budget only bounds
  // runaway interactions under parallel-worker CPU contention.
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Resolution scale", {
    maxFrameGapMs: 250,
    maxInteractionMs: 8000,
  });
  await waitForToolcraftAnimationFrames(page, 3);
  const after = await getToolcraftProductObservableSnapshot(page);
  expect(after).not.toBe(before);
});

test("browser: on color control changes filled square color", async ({ page }) => {
  await page.goto("/");

  await expectToolcraftProductObservableToChange(page, async () => {
    await setToolcraftColorHex(page, "On Color", "#FF3366");
  });
});

test("browser: off color control changes hollow square outline color and opacity", async ({
  page,
}) => {
  await page.goto("/");

  await expectToolcraftProductObservableToChange(page, async () => {
    await setToolcraftColorHex(page, "Off Color", "#33CCFF");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await setToolcraftColorOpacity(page, "Off Color", 80);
  });
});

test("browser: include toggle hides preview background and PNG stays transparent", async ({
  page,
}) => {
  await page.goto("/");

  await expectToolcraftProductObservableToChange(page, async () => {
    await toggleToolcraftSwitch(page, "Include");
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) {
    throw new Error("Expected PNG export to produce a downloaded file.");
  }
  const buffer = readFileSync(path);
  // A transparent PNG's IHDR color type byte (offset 25) is 6 (RGBA) or 4 (grayscale+alpha).
  const colorType = buffer.readUInt8(25);
  expect([4, 6]).toContain(colorType);

  await toggleToolcraftSwitch(page, "Include");
});

test("browser: background color control changes canvas fill", async ({ page }) => {
  await page.goto("/");

  await expectToolcraftProductObservableToChange(page, async () => {
    await setToolcraftColorHex(page, "Background", "#123456");
  });
});

test("browser: image format select changes exported file type", async ({ page }) => {
  await page.goto("/");

  await selectToolcraftOptionInSection(page, "Image Export", "Format", "PNG");
  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toMatch(/\.png$/);

  await selectToolcraftOptionInSection(page, "Image Export", "Format", "JPG");
  const jpgDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const jpgDownload = await jpgDownloadPromise;
  expect(jpgDownload.suggestedFilename()).toMatch(/\.jpg$/);
});

test("browser: image resolution select changes exported pixel dimensions", async ({ page }) => {
  await page.goto("/");
  await selectToolcraftOptionInSection(page, "Image Export", "Format", "PNG");

  await selectToolcraftOptionInSection(page, "Image Export", "Resolution", "2K");
  const download2kPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download2k = await download2kPromise;
  const path2k = await download2k.path();
  if (!path2k) {
    throw new Error("Expected 2K PNG export to produce a downloaded file.");
  }
  const png2k = readFileSync(path2k);
  const dimensions2k = decodePngDimensions(png2k);
  expect(Math.max(dimensions2k.width, dimensions2k.height)).toBe(2048);
  const bitmap2k = await decodeImageDimensionsInPage(page, png2k, "image/png");
  expect(Math.max(bitmap2k.width, bitmap2k.height)).toBe(2048);

  await selectToolcraftOptionInSection(page, "Image Export", "Resolution", "8K");
  const download8kPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download8k = await download8kPromise;
  const path8k = await download8k.path();
  if (!path8k) {
    throw new Error("Expected 8K PNG export to produce a downloaded file.");
  }
  const png8k = readFileSync(path8k);
  const dimensions8k = decodePngDimensions(png8k);
  expect(Math.max(dimensions8k.width, dimensions8k.height)).toBe(8192);
  const bitmap8k = await decodeImageDimensionsInPage(page, png8k, "image/png");
  expect(Math.max(bitmap8k.width, bitmap8k.height)).toBe(8192);
});

test("browser: video format select changes exported container/mime", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");

  await selectToolcraftOptionInSection(page, "Video Export", "Format", "MP4");
  const mp4DownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Video" }).click();
  const mp4Download = await mp4DownloadPromise;
  expect(mp4Download.suggestedFilename()).toMatch(/\.(mp4|webm)$/);

  await selectToolcraftOptionInSection(page, "Video Export", "Format", "WebM");
  const webmDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Video" }).click();
  const webmDownload = await webmDownloadPromise;
  expect(webmDownload.suggestedFilename()).toMatch(/\.webm$/);
});

test("browser: video resolution select changes exported video pixel dimensions", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await selectToolcraftOptionInSection(page, "Video Export", "Format", "WebM");

  await selectToolcraftOptionInSection(page, "Video Export", "Resolution", "Current");
  const currentDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Video" }).click();
  const currentDownload = await currentDownloadPromise;
  const currentPath = await currentDownload.path();
  if (!currentPath) {
    throw new Error("Expected Current-resolution video export to produce a downloaded file.");
  }
  const currentMetadata = await loadVideoDurationMetadataInPage(
    page,
    readFileSync(currentPath),
    "video/webm",
  );
  expect(currentMetadata.videoWidth).toBeGreaterThan(0);
  expect(currentMetadata.videoHeight).toBeGreaterThan(0);

  await selectToolcraftOptionInSection(page, "Video Export", "Resolution", "4K");
  const fourKDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Video" }).click();
  const fourKDownload = await fourKDownloadPromise;
  const fourKPath = await fourKDownload.path();
  if (!fourKPath) {
    throw new Error("Expected 4K video export to produce a downloaded file.");
  }
  const fourKMetadata = await loadVideoDurationMetadataInPage(page, readFileSync(fourKPath), "video/webm");
  expect(Math.max(fourKMetadata.videoWidth, fourKMetadata.videoHeight)).toBeLessThanOrEqual(3840);
  expect(fourKMetadata.videoWidth).not.toBe(currentMetadata.videoWidth);
});

test("browser: sticky footer exports video and PNG with progress", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");

  const videoDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Video" }).click();
  const videoDownload = await videoDownloadPromise;
  expect(videoDownload.suggestedFilename()).toMatch(/\.(mp4|webm)$/);

  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toMatch(/\.(png|jpg)$/);
});

test("browser: exported video duration matches the edited timeline duration", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/");

  await toggleToolcraftSwitch(page, "Timeline");
  await page.getByRole("button", { name: "Edit timeline duration" }).click();
  const durationEditor = page.getByRole("textbox", { name: "timeline duration" });
  await durationEditor.fill("2");
  await durationEditor.press("Enter");
  await expect(page.getByRole("button", { name: "Edit timeline duration" })).toContainText("2");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Video" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) {
    throw new Error("Expected timeline-length video export to produce a downloaded file.");
  }
  const metadata = await loadVideoDurationMetadataInPage(page, readFileSync(path), "video/webm");
  expect(metadata.duration).toBeGreaterThanOrEqual(1.5);
  expect(metadata.duration).toBeLessThanOrEqual(3);
});

test("browser: timeline playback transport controls runtime time", async ({ page }) => {
  await page.goto("/");

  const before = await getToolcraftProductObservableSnapshot(page);

  await toggleToolcraftSwitch(page, "Timeline");

  const playPauseButton = page.getByRole("button", { name: /Play playback|Pause playback/ });
  await playPauseButton.click();
  await waitForToolcraftAnimationFrames(page, 10);
  await playPauseButton.click();

  await page.getByRole("button", { name: "Disable loop" }).click();
  await expect(page.getByRole("button", { name: "Enable loop" })).toBeVisible();
  await page.getByRole("button", { name: "Enable loop" }).click();
  await expect(page.getByRole("button", { name: "Disable loop" })).toBeVisible();

  await page.getByRole("button", { name: "Edit timeline duration" }).click();
  const durationEditor = page.getByRole("textbox", { name: "timeline duration" });
  await durationEditor.fill("4");
  await durationEditor.press("Enter");
  await expect(page.getByRole("button", { name: "Edit timeline duration" })).toContainText("4");

  const scrubber = page.getByRole("slider", { name: "Playback position" });
  const scrubberMax = await scrubber.getAttribute("aria-valuemax");
  expect(Number(scrubberMax)).toBeGreaterThan(0);

  // Scrub to 30% of the loop: the default center click would land on a sweep
  // phase identical to the load-time pattern (progress 0.5 at speed 2 wraps
  // back to phase 0), which would make the output legitimately unchanged.
  const scrubberBox = await scrubber.boundingBox();
  if (!scrubberBox) {
    throw new Error("Could not measure the playback scrubber.");
  }
  await scrubber.click({
    position: { x: scrubberBox.width * 0.3, y: scrubberBox.height / 2 },
  });
  await waitForToolcraftAnimationFrames(page, 3);
  const afterScrub = await getToolcraftProductObservableSnapshot(page);
  expect(afterScrub).not.toBe(before);
});
