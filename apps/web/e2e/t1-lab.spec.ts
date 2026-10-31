import { expect, test } from '@playwright/test';

test('mounts the Phaser stage and accepts keyboard input', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'WordQuest 技术与学习核心验收台' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  const actionCount = page.getByTestId('lab-action-count');
  await expect(actionCount).toHaveText('0');

  await page.keyboard.press('ArrowRight');
  await expect(actionCount).toHaveText('1');
  await expect(page.getByTestId('lab-position')).toContainText('X: 516');
});

test('accepts pointer input on the Phaser canvas', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Phaser canvas has no measurable bounding box.');

  await canvas.click({
    position: {
      x: bounds.width * 0.72,
      y: bounds.height * 0.56
    }
  });

  await expect(page.getByTestId('lab-action-count')).toHaveText('1');
});

test('keeps the game stage and controls usable on common phone viewports', async ({ page }) => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 360, height: 640 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();

    const pageWidths = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(pageWidths.scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(pageWidths.clientWidth).toBe(viewport.width);

    await page.getByRole('button', { name: '向右移动' }).click();
    await expect(page.getByTestId('lab-action-count')).toHaveText('1');
  }
});

test('saves, resets and restores state through IndexedDB', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '向右移动' }).click();

  const position = page.getByTestId('lab-position');
  const savedPosition = await position.innerText();

  await page.getByRole('button', { name: '保存进度' }).click();
  await expect(page.getByRole('status').filter({ hasText: '进度已保存' })).toContainText('进度已保存');

  await page.reload();
  await expect(position).toHaveText(savedPosition);

  await page.getByRole('button', { name: '重置位置' }).click();
  await expect(position).not.toHaveText(savedPosition);

  await page.getByRole('button', { name: '恢复进度' }).click();
  await expect(position).toHaveText(savedPosition);
});

test('serves a manifest and reopens the cached app shell offline', async ({ page, context }) => {
  await page.goto('/');

  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toContain('WordQuest');

  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration?.active);
  });

  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'WordQuest 技术与学习核心验收台' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});