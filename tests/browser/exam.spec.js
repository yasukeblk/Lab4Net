// The exam (Phase 7 acceptance).
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const MAIN = { v: 2, settings: { pace: 'instant', guideDefault: true }, ui: { landingSeen: true, hints: { stepTip: true } } };
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

async function startExam(page, mode, minutes) {
  await page.goto('/#/practice/exam');
  const names = { sabotage: 'Fault-find', lab: 'Build', incident: 'Incident', daily: "Today's" };
  await page.getByRole('radiogroup', { name: 'Mode' }).getByRole('radio', { name: names[mode] }).click();
  if (minutes && mode !== 'daily') await page.getByRole('radiogroup', { name: 'Time' }).getByRole('radio', { name: minutes + ' min' }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page).toHaveURL(/#\/practice\/exam\/run$/);
  await expect(page.locator('#gradeBtn')).toBeVisible();
}
async function giveUp(page) {
  await page.getByRole('button', { name: 'More lab actions' }).click();
  await page.getByRole('menuitem', { name: 'Give up' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Give up' }).click();
  await expect(page).toHaveURL(/#\/practice\/exam$/);
}

for (const mode of ['sabotage', 'lab', 'incident', 'daily']) {
  test('start a ' + mode + ' exam: a clock, and no help in the page', async ({ page }) => {
    const errors = watch(page);
    await open(page, '#/', { main: MAIN });
    await startExam(page, mode, 10);
    await expect(page.locator('.chip--clock')).toHaveText(/^(09:5\d|10:00|19:5\d|20:00)$/);
    // help is truly absent: no steps, why, walkthrough, clues, Commands tab or lesson link
    for (const sel of ['button.step', '.why', '.walk', '.clues', '[role="switch"][aria-label], .toggle', '.banner']) expect(await page.locator('#ws-tasks ' + sel).count(), sel).toBe(0);
    await expect(page.getByRole('tab', { name: 'Commands' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Lesson', exact: true })).toHaveCount(0);
    await page.evaluate(() => L4N.test.exec(null, 'enable'));
    await expect(page.locator('.con__why')).not.toContainText('What it does:');
    await page.getByRole('button', { name: 'More lab actions' }).click();
    await expect(page.getByRole('menuitem', { name: /walkthrough|Pop out/i })).toHaveCount(0);
    await page.keyboard.press('Escape');
    // Grade shows a count only, no per-check list, until the exam ends
    await page.locator('#gradeBtn').click();
    await expect(page.locator('.results__sum')).toContainText('checks pass');
    await expect(page.locator('.check-row')).toHaveCount(0);
    await giveUp(page);
    expect(errors()).toEqual([]);
  });
}

test('the same seed gives the same faults; Today\'s exam is the same on two fresh profiles', async ({ browser }) => {
  const make = async () => {
    const ctx = await browser.newContext(), page = await ctx.newPage();
    await open(page, '#/', { main: MAIN });
    const r = await page.evaluate(() => {
      const a = L4N.exam.entry({ mode: 'sabotage', seed: 'repeat-me', minutes: 20, started: 0 });
      L4N.exam.begin('daily', 20);
      const d = L4N.exam.entry(L4N.store.get().exam.current);
      return { a: [a.base.slug, a.faults.map(f => f.desc)], d: [d.base.slug, d.faults.map(f => f.desc)] };
    });
    await ctx.close();
    return r;
  };
  const one = await make(), two = await make();
  expect(one.a).toEqual(two.a);
  expect(one.d).toEqual(two.d);
  expect(one.d[1].length).toBe(2);
});

test('fixing the faults passes, the end shows what was wrong, and the base lab is untouched', async ({ page }) => {
  await open(page, '#/', { main: MAIN });
  // find a seed whose faults the base lab's own solution repairs
  const seed = await page.evaluate(() => {
    for (let i = 0; i < 40; i++) {
      const s = 'fix-' + i, e = L4N.exam.entry({ mode: 'sabotage', seed: s, minutes: 20, started: 0 });
      const st = L4N.sim.open(e, null);
      for (const [d, c] of Object.entries(e.base.lab.solution)) for (const x of c) L4N.sim.exec(st, d, x);
      if (L4N.sim.grade(st).every(r => r[1])) return s;
    }
    return null;
  });
  expect(seed).not.toBeNull();
  await page.evaluate(s => { L4N.exam.begin('sabotage', 20, { seed: s }); L4N.shell.go('#/practice/exam/run'); }, seed);
  await expect(page.locator('#gradeBtn')).toBeVisible();
  const base = await page.evaluate(() => { const ws = L4N.workspace.current(); for (const [d, c] of Object.entries(L4N.exam.entry(L4N.store.get().exam.current).base.lab.solution)) for (const x of c) L4N.test.exec(d, x); L4N.test.exec('R1', 'show running-config'); return L4N.exam.entry(L4N.store.get().exam.current).base.slug; });
  await page.locator('#gradeBtn').click();
  await expect(page.locator('.results__sum')).toContainText('Exam passed');
  await expect(page.locator('.check-row.is-ok').first()).toBeVisible();
  await expect(page.getByText('What was wrong')).toBeVisible();
  await expect(page.getByText(/Time used/)).toBeVisible();
  const st = await page.evaluate(b => ({ lab: L4N.store.get().labs[b] || null, work: L4N.work.get(b), hist: L4N.store.get().exam.history.slice(-1)[0], cur: L4N.store.get().exam.current }), base);
  expect(st.lab && st.lab.done).toBeFalsy();
  expect(st.work).toBeNull();
  expect(st.hist.cleared).toBe(true);
  expect(st.cur).toBeNull();
});

test('a reload resumes; a second exam cannot start; other labs are locked with a toast', async ({ page }) => {
  await open(page, '#/', { main: MAIN });
  // A fixed exam, so the lab is the same every run. A random one sometimes picked a lab with an enable password,
  // where "enable" stops at "Password:" (starting from the screen is covered by the test above).
  await page.evaluate(() => { L4N.exam.begin('lab', 20, { seed: 'resume' }); L4N.shell.go('#/practice/exam/run'); });
  await expect(page.locator('#gradeBtn')).toBeVisible();
  await page.evaluate(() => { L4N.test.exec(null, 'enable'); L4N.test.exec(null, 'configure terminal'); });
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('.con__prompt')).toHaveText(/\(config\)#$/);
  // a second exam cannot start
  await page.keyboard.press(MOD + '+k'); await page.keyboard.type("today's exam"); await page.keyboard.press('Enter');
  await expect(page.getByText('An exam is already running. Resume it, or give it up first.')).toBeVisible();
  // other labs, lessons and practice are locked with a toast, not a dialog
  for (const r of ['#/labs/static-routing', '#/lessons/static-routing', '#/practice/quiz', '#/sandbox']) {
    await page.goto('/' + r);
    await expect(page.getByText('An exam is running. Finish it first.').first()).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Resume exam' }).first().click();
  await expect(page).toHaveURL(/#\/practice\/exam\/run$/);
  await expect(page.locator('#ws-console')).toBeVisible();
});

test('time running out grades and records the exam, open or not', async ({ page }) => {
  await open(page, '#/', { main: MAIN });
  await startExam(page, 'sabotage', 10);
  await page.evaluate(() => { const c = L4N.store.get().exam.current; L4N.exam.set({ current: Object.assign({}, c, { started: Date.now() - 600500, deadline: Date.now() - 500 }) }); });
  await expect(page.locator('.results__sum')).toContainText("Time's up", { timeout: 4000 });
  expect(await page.evaluate(() => [L4N.store.get().exam.current, L4N.store.get().exam.history.length])).toEqual([null, 1]);
  // and while away: a running exam whose time ran out is graded from its commands
  await startExam(page, 'incident', 10);
  await page.goto('/#/');
  await page.evaluate(() => { const c = L4N.store.get().exam.current; L4N.exam.set({ current: Object.assign({}, c, { started: Date.now() - 600500, deadline: Date.now() - 500 }) }); });
  await expect(page.getByText(/ended while you were away/)).toBeVisible({ timeout: 4000 });
  expect(await page.evaluate(() => L4N.store.get().exam.history.length)).toBe(2);
  await page.goto('/#/practice/exam');
  await expect(page.locator('table tbody tr')).toHaveCount(2);
});

test('a stage check starts from the Labs list and, when passed, shows as passed', async ({ page }) => {
  await open(page, '#/labs', { main: MAIN });
  await page.locator('.row[data-key="stage:start"]').click();
  await expect(page.locator('.lst__detail')).toContainText('Harbor Street Logistics');
  await page.getByRole('button', { name: 'Start stage check' }).click();
  await expect(page).toHaveURL(/#\/practice\/exam\/run$/);
  const tag = await page.evaluate(() => L4N.store.get().exam.current.tag);
  expect(tag).toBe('stage:start');
  // pass it by recording a cleared result for this stage, as finishing it does
  await page.evaluate(() => { const ws = L4N.workspace.current(); L4N.exam.finish(ws.st.lab.checks.map(([t]) => [t, true])); });
  await page.goto('/#/progress');
  await expect(page.locator('#pg-path + .list .row').first()).toContainText('Stage check passed');
});
