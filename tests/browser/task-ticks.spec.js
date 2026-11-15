// The Tasks panel: tasks that tick themselves as the network does what they ask, and help one task at a time.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const NEW = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true, hints: { stepTip: true } } };
const task = (page, i) => page.locator('#ws-tasks .tasklist > .task').nth(i);
const run = (page, dev, lines) => page.evaluate(([d, ls]) => { for (const l of ls) L4N.test.exec(d, l); }, [dev, lines]);
const record = page => page.evaluate(() => L4N.store.get().labs['static-routing'] || {});

test('Static routing: each task ticks itself when the network does it, and a look task when its commands were run', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/labs/static-routing', { main: JSON.parse(JSON.stringify(NEW)) });
  await expect(page.locator('#ws-tasks .task.is-ticked')).toHaveCount(0);
  // a self-ticking box can't be ticked by hand, and says why
  const box = task(page, 0).locator('input[type="checkbox"]');
  await expect(box).toBeDisabled();
  await expect(task(page, 0).locator('.check')).toHaveAttribute('data-tip', 'Ticks itself when the network does this');

  await run(page, 'R1', ['enable', 'configure terminal', 'ip route 192.168.3.0 255.255.255.0 10.0.12.2']);
  await expect(task(page, 0)).not.toHaveClass(/is-ticked/);          // one of its two routes
  await run(page, 'R1', ['ip route 10.0.23.0 255.255.255.252 10.0.12.2', 'end']);
  await expect(task(page, 0)).toHaveClass(/is-ticked/);
  await expect(page.locator('#ws-tasks .pane__head .tasks__count')).toHaveText('1 of 5 done');

  await run(page, 'R2', ['enable', 'conf t', 'ip route 192.168.1.0 255.255.255.0 10.0.12.1', 'ip route 192.168.3.0 255.255.255.0 10.0.23.2', 'end']);
  await run(page, 'R3', ['enable', 'conf t', 'ip route 0.0.0.0 0.0.0.0 10.0.23.1', 'end']);
  await expect(task(page, 1)).toHaveClass(/is-ticked/);
  await expect(task(page, 2)).toHaveClass(/is-ticked/);
  // the routes work now, but "Ping PC2 from PC1" waits for the ping, and "Check each table" for the show commands
  await expect(task(page, 3)).not.toHaveClass(/is-ticked/);
  await expect(task(page, 4)).not.toHaveClass(/is-ticked/);
  for (const r of ['R1', 'R2']) await run(page, r, ['sh ip ro']);              // shortened, as IOS allows
  await expect(task(page, 3)).not.toHaveClass(/is-ticked/);
  await run(page, 'R3', ['show ip route']);
  await expect(task(page, 3)).toHaveClass(/is-ticked/);
  await run(page, 'PC1', ['ping 192.168.3.10', 'tracert 192.168.3.10']);
  await expect(task(page, 4)).toHaveClass(/is-ticked/);
  await expect(page.locator('#ws-tasks .pane__head .tasks__count')).toHaveText('5 of 5 done');

  // once done, a task stays ticked, even when something later breaks it
  await run(page, 'R1', ['enable', 'conf t', 'no ip route 10.0.23.0 255.255.255.252 10.0.12.2', 'end']);
  await expect(task(page, 0)).toHaveClass(/is-ticked/);
  await page.reload();
  await expect(page.locator('#ws-tasks .task.is-ticked')).toHaveCount(5);
  expect(errors()).toEqual([]);
});

test('a task ticks when done as its words ask, without commands it never asked for', async ({ page }) => {
  // Switch management access, task 3: "Create interface vlan 99, give it 192.168.99.2/24 and bring it up."
  // The step-by-step then suggests show ip interface brief, but the task doesn't ask for it.
  await open(page, '#/labs/switch-management-access', { main: JSON.parse(JSON.stringify(NEW)) });
  await run(page, 'SW1', ['enable', 'configure terminal', 'vlan 99', 'name MGMT', 'exit', 'interface vlan 99']);
  await expect(task(page, 2)).not.toHaveClass(/is-ticked/);          // no address yet
  await run(page, 'SW1', ['ip address 192.168.99.2 255.255.255.0', 'no shutdown']);
  await expect(task(page, 2)).toHaveClass(/is-ticked/);               // and no show command was needed
});

test('help for one task: a hint, then its commands, each charged once and shown from then on', async ({ page }) => {
  await open(page, '#/labs/static-routing', { main: JSON.parse(JSON.stringify(NEW)) });
  await run(page, 'R1', ['enable']);                       // starts the run, so the help is counted
  await expect(page.getByRole('switch', { name: 'Step-by-step for every task (−15)' })).toHaveCount(1);
  const t1 = task(page, 0);
  await t1.getByRole('button', { name: 'Hint for task 1, costs 2 points' }).click();
  await expect(t1.locator('.task__hint')).toHaveText('Hint: Work on R1 (global configuration), 2 commands.');
  expect((await record(page)).run.hints).toBe(1);
  await expect(t1.locator('button.step')).toHaveCount(0);
  await t1.getByRole('button', { name: 'Show the commands for task 1, costs 5 points' }).click();
  await expect(t1.locator('button.step')).not.toHaveCount(0);
  await expect(task(page, 1).locator('button.step')).toHaveCount(0);   // only that task
  expect((await record(page)).run.shown).toBe(1);
  // a reload keeps them open and charges nothing more
  await page.reload();
  await expect(task(page, 0).locator('.task__hint')).toBeVisible();
  await expect(task(page, 0).locator('button.step')).not.toHaveCount(0);
  await expect(task(page, 0).getByRole('button', { name: /costs/ })).toHaveCount(0);
  const r = (await record(page)).run;
  expect([r.hints, r.shown]).toEqual([1, 1]);
});

test('an incident ticks: reproduce with a test, evidence with a show, restore with the repair, retest after it', async ({ page }) => {
  const slug = 'incident-07-one-branch-fell-off-the-map';
  await open(page, '#/labs/' + slug, { main: JSON.parse(JSON.stringify(NEW)) });
  const ticked = () => page.evaluate(() => [...document.querySelectorAll('#ws-tasks .tasklist > .task')].map(t => t.classList.contains('is-ticked')));
  await expect.poll(ticked).toEqual([false, false, false, false]);
  await run(page, 'PC1', ['ping 192.168.3.10']);
  await expect.poll(ticked).toEqual([true, false, false, false]);
  await run(page, 'R3', ['enable', 'show ip ospf interface brief']);
  await expect.poll(ticked).toEqual([true, true, false, false]);
  await page.evaluate(s => { const l = L4N.data.lab(s).lab; for (const [d, c] of Object.entries(l.solution)) for (const x of c) L4N.test.exec(d, x); }, slug);
  // restore ticks with the repair; retest needs a test after it (this lab's solution ends with one, so a ping
  // after the repair is checked on a fresh copy below)
  await expect.poll(async () => (await ticked()).slice(0, 3)).toEqual([true, true, true]);
  await run(page, 'PC1', ['ping 192.168.3.10']);
  await expect.poll(ticked).toEqual([true, true, true, true]);
});
