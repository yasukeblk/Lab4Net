// Every stored shape: good input passes, each kind of bad input is dropped (REDESIGN-PLAN.md section 6.3).
'use strict';
const assert = require('assert');
const { L4N } = require('./app-core.cjs')();
const V = L4N.validate, P = L4N.plain;
const X = '<img src=x onerror=window.__pwn=1>';
let n = 0;
const eq = (a, b, msg) => { assert.deepStrictEqual(P(a), P(b), msg); n++; };

// settings
eq(V.settings({ theme: 'light', motion: 'reduce', consoleTheme: 'dark', pace: 'real', guideDefault: true, sidebarInLabs: 'open' }),
  { theme: 'light', motion: 'reduce', consoleTheme: 'dark', pace: 'real', guideDefault: true, sidebarInLabs: 'open' }, 'good settings pass');
eq(V.settings({ theme: X, motion: 1, consoleTheme: null, pace: 'warp', guideDefault: 'yes', sidebarInLabs: [], extra: X }), V.SETTINGS, 'bad settings fall back to defaults');
eq(V.settings(null), V.SETTINGS); eq(V.settings([1, 2]), V.SETTINGS);

// ui
const u = V.ui({ sidebar: 'rail', layout: 'side', panes: { stacked: { tasks: 0.3, map: 0.4 }, side: { tasks: 2, map: -1 } }, collapsed: { tasks: true, map: 'yes', x: true },
  lastLab: 'static-routing', recent: ['static-routing', X, 'static-routing', 'basic-device-setup', 'vlans-and-access-ports', '802-1q-trunking'], landingSeen: true, hints: { stepTip: true, other: true }, seenLesson: { 'static-routing': true, [X]: true } });
eq(u.panes, { stacked: { tasks: 0.3, map: 0.4 }, side: {} }, 'pane fractions out of range are dropped');
eq(u.collapsed, { tasks: true });
eq(u.recent, ['static-routing', 'basic-device-setup', 'vlans-and-access-ports'], 'recent: known, unique, three at most');
eq(u.hints, { stepTip: true }); eq(u.seenLesson, { 'static-routing': true });
eq(V.ui({ lastLab: X, sidebar: X }).lastLab, null);
eq(V.ui({ sidebar: X }).sidebar, 'open');

// labs
eq(V.labs({ 'static-routing': { done: true, grade: 'S', doneAt: 1731600000000, clues: 2, guide: false, run: { errs: 3, checks: 1, help: true, walk: false, valid: true, done: true, cmds: 12 } } }),
  { 'static-routing': { done: true, grade: 'S', doneAt: 1731600000000, clues: 2, guide: false, run: { errs: 3, checks: 1, help: true, walk: false, valid: true, done: true, cmds: 12 } } }, 'a good lab record passes');
eq(V.labs({ [X]: { done: true }, 'no-such-lab': { done: true }, 'static-routing': { done: 'yes', grade: 'Z', clues: 9, doneAt: -5, guide: X, run: X } }), {}, 'bad lab values are dropped');
eq(V.labs({ __proto__: { done: true }, constructor: { done: true } }), {});
assert.strictEqual(({}).done, undefined, 'no prototype pollution'); n++;

// lessons, quiz, subnet
eq(V.lessons({ 'static-routing': { read: true, quiz: { 0: true, 1: false, 2: X, 99: true, '-1': true } } }), { 'static-routing': { read: true, quiz: { 0: true, 1: false } } });
eq(V.lessons({ [X]: { read: true }, 'static-routing': X }), {});
eq(V.quiz({ answers: { 0: true, 5: false, 109: true, 110: true, a: true, 3: X } }), { rev: 2, answers: { 0: true, 5: false, 109: true } });
eq(V.quiz(X), { rev: 2, answers: {} });
// the automation drill (phase 7): answers by item index, booleans only, inside the item count
eq(V.automation({ answers: { 0: true, 7: false, 41: true, 42: true, '-1': true, a: true, 3: X } }), { answers: { 0: true, 7: false, 41: true } });
eq(V.automation(X), { answers: {} }); eq(V.automation({ answers: [true] }), { answers: {} }, 'an array is not the stored shape');
eq(V.main({ v: 2 }).automation, { answers: {} }, 'a profile saved before the drill existed loads with an empty drill score');
eq(V.main({ v: 2, automation: { answers: { 1: true } } }).automation, { answers: { 1: true } });
eq(V.subnet({ right: 10, total: 12 }), { right: 10, total: 12 });
eq(V.subnet({ right: 13, total: 12 }), { right: 0, total: 12 }, 'more right than asked is dropped');
eq(V.subnet({ right: X, total: -1 }), { right: 0, total: 0 });

// saved work
eq(V.workEntry({ journal: [{ device: 'R1', line: 'enable', t: 5 }, { device: 'PC1', line: 'ping 10.0.0.1' }], tasks: [true, 'x', false] }),
  { journal: [{ device: 'R1', line: 'enable', t: 5 }, { device: 'PC1', line: 'ping 10.0.0.1' }], tasks: [true, false, false] });
for (const bad of [{ journal: 'x' }, { journal: [{ device: X, line: 'x' }] }, { journal: [{ device: 'R1', line: 'a\nb' }] }, { journal: [{ device: 'R1', line: 'x'.repeat(513) }] },
  { journal: new Array(5001).fill({ device: 'R1', line: 'x' }) }, { journal: [null] }])
  eq(V.workEntry(bad), { journal: [], tasks: [], corrupt: true }, 'corrupt work is marked, never half-kept');
eq(V.work({ [X]: { journal: [] }, 'no-such-lab': { journal: [] } }), {});

// the main document and the migration record
const main = V.main({ v: 2, settings: { theme: X }, labs: { [X]: {} }, ui: { lastLab: X }, migrated: { from: X, at: 'x', labs: -1 } });
eq(main.settings.theme, 'dark'); eq(main.labs, {}); eq(main.ui.lastLab, null);
eq(main.migrated, { from: 'v1', at: 0, labs: 0, lessons: 0, told: false });
eq(V.main(null).v, 2);

// stripTags: the second line of defence for imported strings
eq(V.stripTags({ a: X, b: [X], [X]: 1, __proto__: { p: 1 } }), { a: 'img src=x onerror=window.__pwn=1', b: ['img src=x onerror=window.__pwn=1'], 'img src=x onerror=window.__pwn=1': 1 });

// the router: the hash is data
eq(L4N.router.parse('#/labs/static-routing'), { screen: 'lab', slug: 'static-routing' });
eq(L4N.router.parse('#/labs/' + encodeURIComponent(X)), { screen: 'labs', badSlug: true });
eq(L4N.router.parse('#/nowhere'), { screen: 'home', unknown: true });
eq(L4N.router.parse('#/' + 'x'.repeat(400)), { screen: 'home', unknown: true });

console.log('PASS validate: ' + n + ' checks on settings, ui, labs, lessons, quiz, subnet, saved work, the main document, imports and routes.');
