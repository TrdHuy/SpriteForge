import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { width: 1600, height: 1000 },
  { width: 1280, height: 800 },
  { width: 1100, height: 760 }
];

async function expectUniformCanvasScale(page: import('@playwright/test').Page, selector: string): Promise<void> {
  const scale = await page.locator(selector).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.width / canvas.width,
      y: rect.height / canvas.height,
      width: rect.width,
      height: rect.height
    };
  });
  expect(scale.width).toBeGreaterThan(0);
  expect(scale.height).toBeGreaterThan(0);
  expect(Math.abs(scale.x - scale.y)).toBeLessThan(0.002);
}

test('Animation Editor canvases preserve aspect ratio while viewport size changes', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('./?mode=animation');
  await expect(page.locator('.mode-nav a.active')).toHaveText('Animation Editor');

  await page.locator('#imageInput').setInputFiles('public/samples/demo-beast/demo-beast.png');
  await page.locator('#metadataInput').setInputFiles('public/samples/demo-beast/demo-beast.animation.json');

  await expect(page.locator('#imageInfo')).toContainText('demo-beast.png');
  await expect(page.locator('#clipList .clip-item')).toHaveCount(4);
  await expect(page.locator('#previewCanvas')).toBeVisible();
  await expect(page.locator('#sheetCanvas')).toBeVisible();

  await page.locator('#playPause').click();
  await expect(page.locator('#playPause')).toContainText('Pause');

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    await expectUniformCanvasScale(page, '#sheetCanvas');
    await expectUniformCanvasScale(page, '#previewCanvas');
    await expect(page.locator('#playPause')).toContainText('Pause');
  }

  const hasPreviewPixels = await page.locator('#previewCanvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return false;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
    return false;
  });
  expect(hasPreviewPixels).toBe(true);
  expect(runtimeErrors).toEqual([]);
});

test('one Animation clip can play global frames across a 2x4 sprite sheet', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });

  await page.goto('./?mode=animation');
  await page.locator('#imageInput').setInputFiles('public/samples/demo-beast/demo-beast.png');
  await page.locator('#metadataInput').setInputFiles('public/samples/demo-beast/demo-multi-row.animation.json');

  await expect(page.locator('#rows')).toHaveValue('2');
  await expect(page.locator('#columns')).toHaveValue('4');
  await expect(page.locator('#clipList .clip-item')).toHaveCount(1);
  await expect(page.locator('#frameSequence')).toHaveValue('0,1,2,3,4,5,6,7');
  await expect(page.locator('#clipRow')).toHaveCount(0);
  await expect(page.locator('#timeline .timeline-frame')).toHaveCount(8);

  await page.locator('#timeline .timeline-frame').nth(3).locator('.frame-main').click();
  await expect(page.locator('#frameReadout')).toContainText('Frame 3');
  await page.locator('#nextFrame').click();
  await expect(page.locator('#frameReadout')).toContainText('Frame 4');

  await page.locator('#playPause').click();
  await expect(page.locator('#playPause')).toContainText('Pause');
  await page.waitForTimeout(300);
  await expect(page.locator('#previewCanvas')).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
