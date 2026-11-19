// Step-by-step: five labs (one per kind, including an incident and a capstone) finished by clicking the step rows
// and pressing Enter. Then the grade table: scripted runs give the letters section 2 says they should.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

const settings = extra => ({ v: 2, settings: Object.assign({ pace: 'instant' }, extra), ui: { landingSeen: true, hints: { stepTip: true } } });
const LABS5 = ['basic-device-setup', 'vlans-and-access-ports', 'single-area-ospf', 'incident-01-one-sales-pc-is-isolated', 'capstone-branch-office-from-scratch'];

for (const slug of LABS5) {
  test('finish ' + slug + ' by clicking its steps', async ({ page }) => {
    await open(page, '#/labs/' + slug, { main: settings({ guideDefault: true }) });
    const sw = page.getByRole('switch', { name: 'Step-by-step' });
    if (slug.startsWith('capstone')) {
      await expect(sw).toHaveAttribute('aria-checked', 'false');   // capstones open with step-by-step off
      await sw.click();
    }
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    const steps = page.locator('#ws-tasks button.step');
    const n = await steps.count();
    expect(n).toBeGreaterThan(3);
    const input = page.locator('.con__input');
    for (let i = 0; i < n; i++) {
      const cmd = await steps.nth(i).getAttribute('data-cmd');
      await steps.nth(i).click();
      await expect(input).toHaveValue(cmd);
      await expect(input).toBeFocused();
      await input.press('Enter');
    }
    await page.getByRole('button', { name: 'Grade', exact: true }).click();
    await expect(page.locator('.results__sum')).toContainText('Lab complete');
    // the guide was on, so the grade can be at most A
    await expect(page.locator('.results__sum')).not.toContainText('Grade S');
  });
}

test('a capstone remembers step-by-step per capstone', async ({ page }) => {
  await open(page, '#/labs/capstone-campus-core', { main: settings({ guideDefault: true }) });
  const sw = page.getByRole('switch', { name: 'Step-by-step' });
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await page.goto('/#/labs/capstone-branch-office-from-scratch');
  await expect(page.getByRole('switch', { name: 'Step-by-step' })).toHaveAttribute('aria-checked', 'false');
  await page.goto('/#/labs/capstone-campus-core');
  await expect(page.getByRole('switch', { name: 'Step-by-step' })).toHaveAttribute('aria-checked', 'true');
});

// ---- the grade table ----
async function run(page, slug, script) {
  await open(page, '#/labs/' + slug, { main: settings() });
  await expect(page.locator('#gradeBtn')).toBeVisible();
  for (const step of script) {
    if (step === 'guide') await page.getByRole('switch', { name: 'Step-by-step' }).click();
    else if (step === 'walk') { await page.getByRole('button', { name: 'More lab actions' }).click(); await page.getByRole('menuitem', { name: 'Show walkthrough' }).click(); }
    else if (step === 'clue') await page.getByRole('button', { name: /^Reveal clue/ }).click();
    else if (step === 'solve') await page.evaluate(s => { const lab = LABS.find(l => L4N.slug(l.title) === s); for (const [d, c] of Object.entries(lab.solution)) for (const x of c) L4N.test.exec(d, x); }, slug);
    else await page.evaluate(([d, l]) => L4N.test.exec(d, l), step);
  }
  await page.locator('#gradeBtn').click();
  await expect(page.locator('.results__sum')).toContainText('Lab complete');
  return (await page.locator('.results__sum').textContent()).replace(/.*Grade /, '').trim();
}
const SHOW = ['R1', 'show running-config'];
const TYPO = ['R1', 'shw run'];
const TABLE = [
  ['a clean run with a check command of your own', 'basic-device-setup', ['solve', SHOW], 'S'],
  ['no check command tops out at A', 'basic-device-setup', ['solve'], 'A'],
  ['extra show and ping commands never lower a grade', 'basic-device-setup', [SHOW, ['R1', 'show ip interface brief'], 'solve', SHOW, SHOW, ['R1', 'ping 192.168.1.1']], 'S'],
  ['two typos are free', 'basic-device-setup', [TYPO, TYPO, 'solve', SHOW], 'S'],
  ['the guide costs 15', 'basic-device-setup', ['guide', 'solve', SHOW], 'A'],
  ['the walkthrough costs 25', 'basic-device-setup', ['walk', 'solve', SHOW], 'B'],
  ['guide and walkthrough', 'basic-device-setup', ['guide', 'walk', 'solve', SHOW], 'C'],
  ['typos cost 2 each after two, at most 10, with the walkthrough', 'basic-device-setup', ['walk', TYPO, TYPO, TYPO, TYPO, TYPO, TYPO, TYPO, TYPO, 'solve', SHOW], 'C'],
  ['one clue costs 5', 'incident-01-one-sales-pc-is-isolated', ['clue', 'solve', ['PC1', 'ipconfig']], 'S'],
  ['three clues cost 15', 'incident-01-one-sales-pc-is-isolated', ['clue', 'clue', 'clue', 'solve', ['PC1', 'ipconfig']], 'A']
];
for (const [what, slug, script, want] of TABLE) {
  test('grade: ' + what, async ({ page }) => {
    expect(await run(page, slug, script)).toBe(want);
  });
}

test('a reset clears the grade, the next run sets it, and the Commands tab puts a command in the console', async ({ page }) => {
  expect(await run(page, 'basic-device-setup', ['solve', SHOW])).toBe('S');
  // Reset lab is a full reset (reset.spec.js): the S goes, and the next run's grade (A here) is the one stored
  await page.getByRole('button', { name: 'More lab actions' }).click();
  await page.getByRole('menuitem', { name: 'Reset lab' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset lab' }).click();
  await expect(page.locator('#gradeBtn')).toBeVisible();
  await expect(page.locator('.topbar__status')).not.toContainText('S');
  await page.evaluate(() => { const lab = LABS.find(l => l.title === 'Basic device setup'); for (const [d, c] of Object.entries(lab.solution)) for (const x of c) L4N.test.exec(d, x); });
  await page.locator('#gradeBtn').click();
  await expect(page.locator('.topbar__status')).toContainText('A');
  expect(await page.evaluate(() => L4N.store.get().labs['basic-device-setup'].grade)).toBe('A');
  // Commands tab
  await page.getByRole('tab', { name: 'Commands' }).click();
  await page.getByRole('searchbox', { name: 'Search commands' }).fill('hostname');
  await page.getByRole('switch', { name: 'All modes' }).click();
  await page.locator('.cmdcard').filter({ has: page.locator('code', { hasText: /^hostname/ }) }).first().click();
  await expect(page.locator('.con__input')).toHaveValue(/^hostname/);
});
