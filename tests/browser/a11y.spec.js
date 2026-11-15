// Automated accessibility scan (axe) on every route in both themes: zero violations.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { ROUTES, open } = require('./helpers');

for (const theme of ['dark', 'light']) {
  test.describe(theme + ' theme', () => {
    for (const route of ROUTES) {
      test('axe: ' + route, async ({ page }) => {
        await open(page, route, { theme });
        await expect(page.locator('#screen h1')).toBeVisible();
        await page.waitForFunction(() => document.getAnimations().every(x => x.playState !== 'running'));
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const summary = r.violations.map(v => v.id + ': ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | '));
        expect(summary).toEqual([]);
      });
    }

    test('axe: landing section', async ({ page }) => {
      await open(page, '?welcome', { theme });
      await expect(page.locator('#landing')).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.map(v => v.id + ': ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | '))).toEqual([]);
    });

    test('axe: an exam running', async ({ page }) => {
      await open(page, '#/practice/exam', { theme, main: { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true, hints: { stepTip: true } } } });
      await page.evaluate(() => { L4N.exam.begin('sabotage', 20, { seed: 7 }); L4N.shell.go('#/practice/exam/run'); });
      await expect(page.locator('#gradeBtn')).toBeVisible();
      await page.waitForFunction(() => document.getAnimations().every(x => x.playState !== 'running'));
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations.map(v => v.id + ': ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | '))).toEqual([]);
    });

    test('axe: command palette open', async ({ page }) => {
      await open(page, '#/', { theme });
      await page.locator('.sb__search').click();
      await expect(page.getByRole('combobox')).toBeFocused();
      await page.waitForFunction(() => document.getAnimations().every(x => x.playState !== 'running'));
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(r.violations.map(v => v.id + ": " + v.nodes.slice(0, 4).map(n => n.target.join(" ") + " " + (n.any[0] && n.any[0].message || "")).join(" | "))).toEqual([]);
    });
  });
}

test('live region announces the screen name', async ({ page }) => {
  await open(page, '#/');
  await page.locator('.sidebar').getByRole('link', { name: 'Settings' }).click();
  await expect(page.locator('#announcer')).toHaveText('Settings');
});

// A whole session with the keyboard only (plan 8.2): palette, find a lab, finish it, grade, read the lesson, answer the quiz, change theme.
test('keyboard only: palette, a lab finished and graded, its lesson, the quiz, the theme', async ({ page }) => {
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await open(page, '#/', { main: { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true, hints: { stepTip: true } } } });
  const lab = await page.evaluate(() => {
    const best = L4N.data.labs.filter(l => l.lab.solution && L4N.data.lessonFor(l)).map(l => ({ l, n: Object.values(l.lab.solution).flat().length })).sort((a, b) => a.n - b.n)[0].l;
    return { slug: best.slug, short: best.short, sol: Object.entries(best.lab.solution) };
  });
  const palette = async text => {
    await page.keyboard.press(mod + '+k');
    await expect(page.getByRole('combobox', { name: 'Search or jump to' })).toBeFocused();
    await page.keyboard.type(text);
    await expect(page.getByRole('listbox').getByRole('option').first()).toContainText(text);
    await page.keyboard.press('Enter');
  };
  // find the lab
  await palette('Open lab: ' + lab.short);
  await expect(page).toHaveURL(new RegExp('#/labs/' + lab.slug + '$'));
  await expect(page.locator('#announcer')).not.toHaveText('');
  // finish it: each device from the palette, then type into the console
  for (const [dev, cmds] of lab.sol) {
    const host = await page.locator(`.con__tab[data-dev="${dev}"] span`).first().textContent();
    await palette('Switch to device ' + host);
    await expect(page.locator('.con__input')).toBeFocused();
    for (const c of cmds) { await page.keyboard.type(c); await page.keyboard.press('Enter'); }
  }
  // the console's log region carries the output for screen readers
  expect(await page.locator('#ws-console [role="log"]').textContent()).not.toBe('');
  await page.keyboard.press(mod + '+Enter');
  await expect(page.getByRole('region', { name: 'Results' }).locator('.results__sum')).toContainText('Lab complete');
  // its lesson: N moves between sections, Mark as read with Tab and Enter
  await palette("Open this lab's lesson");
  await expect(page.locator('.reader__title')).toBeVisible();
  await page.keyboard.press('n');
  await page.getByRole('button', { name: 'Mark as read' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.topbar__status')).toContainText('Read');
  // the quiz with number keys
  await palette('Start quiz');
  await expect(page.locator('.quiz')).toBeVisible();
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('1');
  await page.keyboard.press('Enter');
  await expect(page.locator('.qc__res')).toContainText(/Right\.|Not quite\./);
  // and the theme
  await palette('Theme: light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => L4N.store.get().labs)).toHaveProperty(lab.slug + '.done', true);
});

test('live regions: the trace line reads out a ping result', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true, hints: { stepTip: true } } } });
  await page.locator('.con__tab', { hasText: 'PC1' }).click();
  await page.locator('.con__input').fill('ping 192.168.1.1');
  await page.locator('.con__input').press('Enter');
  await expect(page.locator('#ws-trace [aria-live]')).toContainText('Reply received');
  await expect(page.locator('#ws-console [role="log"]')).toContainText('Ping statistics');
});

test('keyboard patterns: the pane divider moves with arrows, tabs with arrows, dialogs trap focus and Esc closes', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true, hints: { stepTip: true } } } });
  const div = page.getByRole('separator').first();
  await div.focus();
  const before = await div.getAttribute('aria-valuenow');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  expect(await div.getAttribute('aria-valuenow')).not.toBe(before);
  // tabs: arrows move between Tasks and Commands
  const tab = page.getByRole('tab', { name: 'Tasks' });
  await tab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Commands' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Commands' })).toHaveAttribute('aria-selected', 'true');
  // a menu: arrows and Esc return focus to its button
  const more = page.getByRole('button', { name: 'More lab actions' });
  await more.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem').nth(1)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(more).toBeFocused();
  // a dialog: Tab stays inside, Esc closes and returns focus
  await page.keyboard.press('?');
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  // native showModal(): the page behind is inert, so Tab never reaches it (after the last control it may go to the browser itself)
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); expect(await dlg.evaluate(d => d.contains(document.activeElement) || document.activeElement === document.body)).toBe(true); }
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
});
