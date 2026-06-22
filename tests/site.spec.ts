import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Smoke test — site loads directly (no intro gate).
 * Run after build: npm run build && npm run smoke
 */
const OUT_INDEX = resolve(process.cwd(), 'out/index.html');

test.describe('Nikxart site (direct load)', () => {
  test.beforeAll(() => {
    if (!existsSync(OUT_INDEX)) {
      throw new Error('Missing out/index.html — run npm run build first');
    }
  });

  test('loads the main site content immediately', async ({ page }) => {
    await page.goto('file://' + OUT_INDEX, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.intro')).toHaveCount(0);
    await expect(page.locator('.pz-btn')).toHaveCount(0);
    await expect(page.locator('.site')).toBeVisible();
    await expect(page.locator('.hero-title')).toContainText('Together It Blooms');
    await expect(page.locator('.nav-mark')).toContainText('Nikxname');
  });

  test('built HTML has no gate safety script', async ({ page }) => {
    await page.goto('file://' + OUT_INDEX, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    expect(html).not.toContain('gate-safety');
    expect(html).not.toContain('data-enter-gate');
  });

  test('hero banner and countdown are present', async ({ page }) => {
    await page.goto('file://' + OUT_INDEX, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.banner-inner img')).toBeVisible();
    await expect(page.locator('.cd-wrap')).toBeVisible();
  });
});