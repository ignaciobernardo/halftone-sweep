import { expect, test } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";
import {
  getToolcraftFieldInSection,
  selectToolcraftOption,
  selectToolcraftOptionInSection,
} from "./pixel-sweep-helpers";
import {
  dragToolcraftSliderByLabel,
  dragToolcraftSliderToPerformanceStressValue,
  expectToolcraftCanvasViewportStable,
  expectToolcraftDiscreteSliderDragSmoothness,
  expectToolcraftScenarioPerformanceBudget,
  getToolcraftPerformanceStressValue,
  getToolcraftFieldByLabel,
  measureToolcraftInteraction,
} from "./performance-helpers";

test("browser perf: preview render stays under budget", async ({ page }) => {
  await page.goto("/");
  await selectToolcraftOptionInSection(page, "Image Export", "Format", "PNG");

  const result = await measureToolcraftInteraction(page, async () => {
    await page.waitForTimeout(50);
  });

  expect(page.locator('[data-testid="pattern-canvas"]')).toBeTruthy();
  expectToolcraftScenarioPerformanceBudget(
    { previewMs: result.durationMs, ...result },
    appPerformance,
    "preview-render",
  );
});

test("browser perf: columns drag stays responsive", async ({ page }) => {
  await page.goto("/");

  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "columns-drag");
  expect(stressValue).toBe(40);
  await dragToolcraftSliderToPerformanceStressValue(page, "Columns", appPerformance, "columns-drag");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Columns", 1);
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "columns-drag");
});

test("browser perf: gap drag stays responsive", async ({ page }) => {
  await page.goto("/");
  await dragToolcraftSliderToPerformanceStressValue(page, "Columns", appPerformance, "columns-drag");

  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "gap-drag");
  expect(stressValue).toBe(80);
  await dragToolcraftSliderToPerformanceStressValue(page, "Gap", appPerformance, "gap-drag");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Gap", 1);
  });

  await expectToolcraftDiscreteSliderDragSmoothness(page, "Gap", {
    maxFrameGapMs: 120,
    maxInteractionMs: 2000,
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "gap-drag");
});

test("browser perf: jitter drag stays responsive", async ({ page }) => {
  await page.goto("/");

  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "jitter-drag");
  expect(stressValue).toBe(100);
  await dragToolcraftSliderToPerformanceStressValue(page, "Jitter", appPerformance, "jitter-drag");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Jitter", 1);
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "jitter-drag");
});

test("browser perf: speed drag stays responsive", async ({ page }) => {
  await page.goto("/");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Speed", 0.85);
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "speed-drag");
});

test("browser perf: pattern change stays responsive", async ({ page }) => {
  await page.goto("/");

  const result = await measureToolcraftInteraction(page, async () => {
    const field = await getToolcraftFieldByLabel(page, "Pattern");
    await field.getByRole("combobox").click();
    await page
      .locator('[role="listbox"] [data-slot="select-item"]')
      .filter({ hasText: /^Fan$/ })
      .first()
      .click();
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "pattern-mode-change");
});

test("browser perf: direction change stays responsive", async ({ page }) => {
  await page.goto("/");
  await selectToolcraftOption(page, "Pattern", "Curtain");

  const result = await measureToolcraftInteraction(page, async () => {
    const field = await getToolcraftFieldByLabel(page, "Direction");
    await field.getByRole("button", { name: "Vert." }).click();
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "direction-change");
});

test("browser perf: reverse toggle stays responsive", async ({ page }) => {
  await page.goto("/");
  await selectToolcraftOption(page, "Pattern", "Curtain");

  const result = await measureToolcraftInteraction(page, async () => {
    const field = await getToolcraftFieldByLabel(page, "Reverse");
    await field.getByRole("switch").click();
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "reverse-change");
});

test("browser perf: on color change stays responsive", async ({ page }) => {
  await page.goto("/");

  const result = await measureToolcraftInteraction(page, async () => {
    const hexInput = page.getByRole("textbox", { name: "On Color hex" });
    await hexInput.fill("#00FF00");
    await hexInput.press("Enter");
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "on-color-change");
});

test("browser perf: off color change stays responsive", async ({ page }) => {
  await page.goto("/");

  const result = await measureToolcraftInteraction(page, async () => {
    const hexInput = page.getByRole("textbox", { name: "Off Color hex" });
    await hexInput.fill("#0000FF");
    await hexInput.press("Enter");
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "off-color-change");
});

test("browser perf: include background toggle stays responsive", async ({ page }) => {
  await page.goto("/");

  const result = await measureToolcraftInteraction(page, async () => {
    const field = await getToolcraftFieldByLabel(page, "Include");
    await field.getByRole("switch").click();
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "include-background-change");
});

test("browser perf: background color change stays responsive", async ({ page }) => {
  await page.goto("/");

  const result = await measureToolcraftInteraction(page, async () => {
    const hexInput = page.getByRole("textbox", { name: "Background hex" });
    await hexInput.fill("#222222");
    await hexInput.press("Enter");
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "background-color-change");
});

test("browser perf: image format change stays responsive", async ({ page }) => {
  await page.goto("/");

  const result = await measureToolcraftInteraction(page, async () => {
    const field = getToolcraftFieldInSection(page, "Image Export", "Format");
    await field.getByRole("combobox").click();
    await page
      .locator('[role="listbox"] [data-slot="select-item"]')
      .filter({ hasText: /^JPG$/ })
      .first()
      .click();
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-format-change");
});

test("browser perf: image resolution change stays responsive", async ({ page }) => {
  await page.goto("/");

  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "image-resolution-change");
  expect(stressValue).toBe("8k");

  const result = await measureToolcraftInteraction(page, async () => {
    const field = getToolcraftFieldInSection(page, "Image Export", "Resolution");
    await field.getByRole("combobox").click();
    await page
      .locator('[role="listbox"] [data-slot="select-item"]')
      .filter({ hasText: /^8K$/ })
      .first()
      .click();
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-resolution-change");
});

test("browser perf: video format change stays responsive", async ({ page }) => {
  await page.goto("/");

  const result = await measureToolcraftInteraction(page, async () => {
    const field = getToolcraftFieldInSection(page, "Video Export", "Format");
    await field.getByRole("combobox").click();
    await page
      .locator('[role="listbox"] [data-slot="select-item"]')
      .filter({ hasText: /^WebM$/ })
      .first()
      .click();
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "video-format-change");
});

test("browser perf: video resolution change stays responsive", async ({ page }) => {
  await page.goto("/");

  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "video-resolution-change");
  expect(stressValue).toBe("4k");

  const result = await measureToolcraftInteraction(page, async () => {
    const field = getToolcraftFieldInSection(page, "Video Export", "Resolution");
    await field.getByRole("combobox").click();
    await page
      .locator('[role="listbox"] [data-slot="select-item"]')
      .filter({ hasText: /^4K$/ })
      .first()
      .click();
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "video-resolution-change");
});

test("browser perf: viewport stays stable", async ({ page }) => {
  await page.goto("/");

  const result = await expectToolcraftCanvasViewportStable(page, async () => {
    await selectToolcraftOption(page, "Pattern", "Radial Pulse");
  });

  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "viewport-stability");
});

test("browser perf: export png stays under budget", async ({ page }) => {
  await page.goto("/");

  const downloadPromise = page.waitForEvent("download");
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Export PNG" }).click();
    await downloadPromise;
  });

  expect((await downloadPromise).suggestedFilename()).toMatch(/\.(png|jpg)$/);
  expectToolcraftScenarioPerformanceBudget(
    { exportMs: result.durationMs, ...result },
    appPerformance,
    "export-copy",
  );
});
