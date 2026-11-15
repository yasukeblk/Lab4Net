// Labs arrive as tickets from named people at Harbor Street Logistics, and the map head shows the business services
// the lab keeps running, going green as their checks pass. Neither appears in the sandbox.
const { test, expect } = require('@playwright/test');
const { open, watch } = require('./helpers');

const NEW = { v: 2, settings: { pace: 'instant' }, ui: { landingSeen: true, hints: { stepTip: true } } };
const run = (page, dev, lines) => page.evaluate(([d, ls]) => { for (const l of ls) L4N.test.exec(d, l); }, [dev, lines]);

test('a build lab: the ticket, services that go green as the network works, and the reply when it is done', async ({ page }) => {
  const errors = watch(page);
  await open(page, '#/labs/vlans-and-access-ports', { main: JSON.parse(JSON.stringify(NEW)) });
  const ticket = page.getByRole('article', { name: 'Ticket from Maya Chen' });
  await expect(ticket.locator('.ticket__subj')).toHaveText('Engineering can see our printers');
  await expect(ticket.locator('.ticket__state')).toHaveText('Open');
  const svcs = page.getByRole('list', { name: 'Business services' }).locator('.svc');
  await expect(svcs).toHaveText(['Sales network, not working yet', 'Engineering network, not working yet']);

  // each service goes green on its own: Sales once VLAN 10 and its ports are in, Engineering still waiting
  await run(page, 'SW1', ['enable', 'conf t', 'vlan 10', 'name SALES', 'exit', 'interface range f0/1 - 2', 'switchport mode access', 'switchport access vlan 10', 'end']);
  await expect(svcs).toHaveText(['Sales network, working', 'Engineering network, not working yet']);
  await expect(page.locator('.svc.is-new')).toHaveText(['Sales network, working']);       // it pulses as it comes up
  const l = await page.evaluate(() => L4N.data.lab('vlans-and-access-ports').lab.solution);
  for (const [d, c] of Object.entries(l)) await run(page, d, c);
  await expect(page.locator('.svc.is-up')).toHaveCount(2);
  await expect(svcs).toHaveText(['Sales network, working', 'Engineering network, working']);

  await page.locator('[data-tip="Grade the lab"]').click();
  await expect(page.locator('.ticket__reply')).toHaveText('Maya Chen replied: Much tidier. We only see our own things now.');
  await expect(ticket.locator('.ticket__state')).toHaveText('Resolved');
  expect(errors()).toEqual([]);
});

test('an incident opens as a fault report, with its service down until the repair', async ({ page }) => {
  const slug = 'incident-07-one-branch-fell-off-the-map';
  await open(page, '#/labs/' + slug, { main: JSON.parse(JSON.stringify(NEW)) });
  await expect(page.getByRole('article', { name: 'Ticket from Lee Santos' })).toContainText('nothing behind the third site answers');
  await expect(page.locator('.svc')).toHaveText(['Every site reachable, not working yet']);
  await page.evaluate(s => { for (const [d, c] of Object.entries(L4N.data.lab(s).lab.solution)) for (const x of c) L4N.test.exec(d, x); }, slug);
  await expect(page.locator('.svc')).toHaveText(['Every site reachable, working']);
});

test('the sandbox has no ticket and no services', async ({ page }) => {
  await open(page, '#/sandbox', { main: JSON.parse(JSON.stringify(NEW)) });
  await expect(page.locator('#ws-map')).toBeVisible();
  await expect(page.locator('.ticket')).toHaveCount(0);
  await expect(page.locator('.svc')).toHaveCount(0);
});
