import { expect, test } from '@playwright/test';
import starterPack from '../../../content-packs/high-frequency-starter/0.1.0/content-pack.json';

test('validates a selected pack and records a provisional first-answer event', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '词库与学习核心验收台' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '结构与引用检查通过' })).toBeVisible();
  await page.getByRole('button', { name: '开始本地验证会话' }).click();

  const lemma = await page.locator('.p1-task h3').innerText();
  const word = starterPack.words.find((entry) => entry.lemma === lemma);
  if (!word) throw new Error(`No word record found for displayed lemma: ${lemma}`);
  const sense = starterPack.senses.find((entry) => entry.senseId === word.senseIds[0]);
  if (!sense) throw new Error(`No sense record found for word: ${lemma}`);
  const answer = sense.glossZh.split(/[；;、，,\/]/)[0];

  await page.getByLabel('请输入中文释义').fill(answer);
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByTestId('p1-last-evidence')).toContainText('E2');
  await expect(page.getByTestId('p1-event-count')).toHaveText('1');
});
