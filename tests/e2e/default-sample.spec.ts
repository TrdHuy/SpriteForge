import { expect, test } from '@playwright/test';

test('default sample loads and plays in Scene Preview', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('./');

  await expect(page.locator('.mode-nav a.active')).toHaveText('Scene Preview');
  await expect(page.locator('#bundleCount')).toHaveText('1');
  await expect(page.locator('#sceneHierarchy .hierarchy-item')).toHaveCount(3);
  await expect(page.locator('#playScene')).toContainText('Pause');
  await expect(page.locator('#sceneStatus')).toContainText('1 bundle(s), 3 instance(s)');

  const firstTime = Number((await page.locator('#sceneTime').textContent())?.replace(/[^0-9.]/g, '') || 0);
  await page.waitForTimeout(350);
  const secondTime = Number((await page.locator('#sceneTime').textContent())?.replace(/[^0-9.]/g, '') || 0);
  expect(secondTime).toBeGreaterThan(firstTime);

  const canvas = page.locator('#sceneCanvas');
  await expect(canvas).toBeVisible();
  const hasRenderedPixels = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d');
    if (!context) return false;
    const data = context.getImageData(0, 0, (element as HTMLCanvasElement).width, (element as HTMLCanvasElement).height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
    return false;
  });
  expect(hasRenderedPixels).toBe(true);
  expect(runtimeErrors).toEqual([]);
});

test('Scene Preview canvas keeps its aspect ratio when the browser viewport changes', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#bundleCount')).toHaveText('1');

  const canvas = page.locator('#sceneCanvas');
  const expectedRatio = 1100 / 620;
  const viewports = [
    { width: 1600, height: 1000 },
    { width: 1280, height: 800 },
    { width: 1000, height: 760 },
    { width: 720, height: 900 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(50);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const ratio = box!.width / box!.height;
    expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.01);
  }

  await expect(page.locator('#sceneHierarchy .hierarchy-item')).toHaveCount(3);
  await expect(page.locator('#playScene')).toContainText('Pause');
});
