import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Smoke test for the unbreakable "Enter the experience" gate.
 * This is the #1 thing that must never break.
 *
 * It verifies:
 * - The artistic intro gate is present in the initial HTML.
 * - The vanilla safety script is embedded.
 * - Clicking the mark (or pressing Enter) successfully removes the gate.
 * - The site content becomes visible.
 * - URL bypass (?enter) works.
 */

const OUT_INDEX = path.join(process.cwd(), 'out', 'index.html');

test.describe('Nikxname Puzzle Art — Gate reliability', () => {
  test.beforeEach(async ({ page }) => {
    // Serve the static export. file:// works for most interactions.
    // We also inject a tiny server-like base if needed.
    await page.goto('file://' + OUT_INDEX, { waitUntil: 'domcontentloaded' });
  });

  test('initial HTML contains the artistic intro gate + safety script', async ({ page }) => {
    await expect(page.locator('.intro')).toBeVisible();
    await expect(page.locator('.pz-btn')).toBeVisible();

    // The critical vanilla safety net must be in the delivered HTML
    const html = await page.content();
    expect(html).toContain('gate-safety');
    expect(html).toContain('NIKX_FORCE_ENTER');
    expect(html).toContain('data-enter-gate');
  });

  test('clicking the Enter mark removes the gate (vanilla path)', async ({ page }) => {
    const intro = page.locator('.intro');
    const btn = page.locator('.pz-btn');

    await expect(intro).toBeVisible();
    await btn.click();

    // Gate should disappear quickly (vanilla script does the work)
    await expect(intro).toHaveCount(0, { timeout: 1500 });

    // Body should be marked as entered (used by React and CSS)
    await expect(page.locator('body')).toHaveClass(/site-entered/);
  });

  test('keyboard Enter also opens the experience', async ({ page }) => {
    const intro = page.locator('.intro');

    await page.keyboard.press('Enter');

    await expect(intro).toHaveCount(0, { timeout: 1500 });
    await expect(page.locator('body')).toHaveClass(/site-entered/);
  });

  test('?enter URL param bypasses the gate automatically', async ({ page }) => {
    // Reload with the bypass param
    await page.goto('file://' + OUT_INDEX + '?enter=1', { waitUntil: 'domcontentloaded' });

    // The vanilla script should have auto-removed the intro very fast
    await expect(page.locator('.intro')).toHaveCount(0, { timeout: 800 });
    await expect(page.locator('body')).toHaveClass(/site-entered/);
  });

  test('the gate is still interactive even before full React hydration (simulated)', async ({ page }) => {
    // This is the key regression test.
    // We block the main JS chunks to simulate a slow / partial load.
    await page.route('**/_next/static/**', route => {
      // Delay the heavy chunks significantly
      setTimeout(() => route.continue(), 8000);
    });

    await page.goto('file://' + OUT_INDEX, { waitUntil: 'domcontentloaded' });

    const btn = page.locator('.pz-btn');
    await expect(btn).toBeVisible();

    // Even with JS chunks blocked, the vanilla gate script (inline) should still work
    await btn.click({ timeout: 2000 });

    await expect(page.locator('.intro')).toHaveCount(0, { timeout: 1200 });
  });
});
