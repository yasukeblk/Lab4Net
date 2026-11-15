// The automation drill (FIXES-PLAN.md phase 7): items of each kind answered right and wrong, the score, the saved
// answers, the Practice card, and exam topic 6 on Progress counting the drill instead of "0/0 labs".
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

test('answer JSON, REST and configuration items right and wrong; the score shows on Practice and Progress', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/practice/automation');
  const items = await page.evaluate(() => AUTOMATION.map(x => ({ kind: x[0], ok: x[5] })));
  const n = items.length;
  expect(n).toBeGreaterThanOrEqual(40);
  // one right and one wrong of each kind
  const firstOf = k => items.findIndex(x => x.kind === k);
  const wrong = new Set(['json', 'rest', 'config'].map(k => firstOf(k) + 1));
  const last = Math.max(...wrong);
  for (const k of ['json', 'rest', 'config']) expect(items[firstOf(k) + 1].kind, 'two ' + k + ' items in a row').toBe(k);
  let right = 0;
  for (let i = 0; i <= last; i++) {
    await expect(page.locator('.quiz__count')).toHaveText(`Item ${i + 1} of ${n}`);
    const pick = wrong.has(i) ? (items[i].ok + 1) % 4 : items[i].ok;
    await page.locator(`.qc__opt[data-a="${pick}"]`).click();
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.locator('.qc__res')).toContainText(wrong.has(i) ? 'Not quite.' : 'Right.');
    if (!wrong.has(i)) right++;
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await expect(page.locator('.page .muted.num').first()).toHaveText(`${right} of ${n} right`);
  const saved = await page.evaluate(() => L4N.store.get().automation.answers);
  for (const i of wrong) expect(saved[i]).toBe(false);
  expect(saved[0]).toBe(true);
  expect(Object.keys(saved).length).toBe(last + 1);

  await page.reload();
  await expect(page.locator('.page .muted.num').first()).toHaveText(`${right} of ${n} right`);

  await open(page, '#/practice');
  await expect(page.getByRole('region', { name: 'Automation', exact: true })).toContainText(`${right} of ${n} right`);

  await open(page, '#/progress');
  const topic6 = page.locator('.topic-d').nth(5).locator('summary');
  await expect(topic6).toContainText(`${right}/${n} drill`);
  await expect(topic6).not.toContainText('0/0 labs');
  expect(errors()).toEqual([]);
});

test('the drill takes 1 to 4 and Enter from the keyboard, like the quiz', async ({ page }) => {
  await open(page, '#/practice/automation');
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const slot = await page.evaluate(() => { const i = 0, ok = AUTOMATION[i][5]; return [0, 1, 2, 3].findIndex(k => (k + i) % 4 === ok); });
  await page.keyboard.press(String(slot + 1));
  await page.keyboard.press('Enter');
  await expect(page.locator('.qc__res')).toContainText('Right.');
  await page.keyboard.press('Enter');
  await expect(page.locator('.quiz__count')).toContainText('Item 2 of');
});
