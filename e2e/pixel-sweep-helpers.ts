import { expect, type Page } from "@playwright/test";

import { getToolcraftFieldByLabel } from "./performance-helpers";

export function getToolcraftSection(page: Page, sectionHeading: string) {
  return page.locator("section").filter({ hasText: sectionHeading }).first();
}

export function getToolcraftFieldInSection(
  page: Page,
  sectionHeading: string,
  fieldLabel: string,
) {
  return getToolcraftSection(page, sectionHeading)
    .locator('[data-slot="field"]')
    .filter({ hasText: new RegExp(`^${fieldLabel}`) })
    .first();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function clickToolcraftSelectItem(page: Page, optionLabel: string): Promise<void> {
  await page
    .locator('[role="listbox"] [data-slot="select-item"]')
    .filter({ hasText: new RegExp(`^${escapeRegExp(optionLabel)}$`) })
    .first()
    .click();
}

export async function selectToolcraftOption(
  page: Page,
  fieldLabel: string,
  optionLabel: string,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, fieldLabel);
  await field.locator('[data-slot="select-trigger"]').first().click();
  await clickToolcraftSelectItem(page, optionLabel);
}

export async function selectToolcraftOptionInSection(
  page: Page,
  sectionHeading: string,
  fieldLabel: string,
  optionLabel: string,
): Promise<void> {
  const field = getToolcraftFieldInSection(page, sectionHeading, fieldLabel);
  await field.locator('[data-slot="select-trigger"]').first().click();
  await clickToolcraftSelectItem(page, optionLabel);
}

export async function clickToolcraftSegmentedOption(
  page: Page,
  fieldLabel: string,
  optionLabel: string,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, fieldLabel);
  await field
    .locator('[data-slot="toggle-group-item"]')
    .filter({ hasText: optionLabel })
    .first()
    .click();
}

export async function toggleToolcraftSwitch(page: Page, fieldLabel: string): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, fieldLabel);
  await field.locator('[data-slot="switch"]').first().click();
}

export async function setToolcraftColorHex(
  page: Page,
  colorLabel: string,
  hex: string,
): Promise<void> {
  const input = page.getByRole("textbox", { name: `${colorLabel} hex` });
  await input.fill(hex);
  await input.press("Enter");
}

export async function setToolcraftColorOpacity(
  page: Page,
  colorLabel: string,
  opacity: number,
): Promise<void> {
  const input = page.getByRole("textbox", { name: `${colorLabel} opacity` });
  await input.fill(String(opacity));
  await input.press("Enter");
}

export async function editToolcraftTimelineDuration(
  page: Page,
  seconds: number,
): Promise<void> {
  await page.getByRole("button", { name: "Edit timeline duration" }).click();
  const editor = page.getByRole("textbox").filter({ hasText: "" }).last();
  await editor.fill(String(seconds));
  await editor.press("Enter");
}

export async function getToolcraftPatternCanvas(page: Page) {
  return page.locator('[data-testid="pattern-canvas"]');
}

export async function expectPatternCanvasVisible(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="pattern-canvas"]')).toBeVisible();
}
