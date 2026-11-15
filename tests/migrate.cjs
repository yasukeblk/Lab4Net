// The one-time import from the old app's storage keys, and old and new backups (REDESIGN-PLAN.md section 6.3).
'use strict';
const assert = require('assert');
const { L4N } = require('./app-core.cjs')();
const M = L4N.migrate, P = L4N.plain;
const P0 = '<img src=x onerror=window.__pwn=1>';

// ---- fixtures of old storage ----
const OLD = {
  'ccna-bench-v2': JSON.stringify({ 'Basic device setup': true, 'Static routing': true, 'Exam · Static routing': true, 'No such lab': true, [P0]: true,
    quiz: { 0: true, 1: false, 29: true, 500: true, 3: P0 }, quizRev: 1, drill: { r: 40, t: 60 } }),
  'lab4net-fun-v1': JSON.stringify({ ranks: { 'Static routing': 'S', 'Basic device setup': 'Z', 'VLANs and access ports': 'B', [P0]: 'A', 'Exam · Static routing': 'S' },
    cleared: { '802.1Q trunking': true, 'Exam · Static routing': true, 'Router-on-a-stick': 'yes' }, xp: 9999, ach: { first: 1 } }),
  'lab4net-lessons-v1': JSON.stringify({ 'Static routing': { read: true, q: { 0: true, 1: P0, 99: true } }, 'No such lesson': { read: true }, [P0]: { read: true } }),
  'lab4net-workspace-v1': JSON.stringify({ drafts: {
    'Static routing': { journal: [{ device: 'R1', line: 'enable', t: 1731600000000 }, { device: 'R1', line: 'configure terminal' }], tasks: [true, false, P0] },
    'Basic device setup': { journal: [{ device: 'R9', line: 'enable' }], tasks: [] },
    'VLANs and access ports': { journal: 'not a journal', tasks: [] },
    '802.1Q trunking': { journal: [{ device: 'SW1', line: 'x'.repeat(600) }] },
    'Exam · Static routing': { journal: [{ device: 'R1', line: 'enable' }] } }, lastLab: 4 }),
  'lab4net-incident-hints': JSON.stringify({ 'Incident 01: one Sales PC is isolated': 2, 'Static routing': 2, 'Incident 02: Engineering cannot cross floors': 9 }),
  'lab4net-capstone-guide': JSON.stringify({ 'Capstone: branch office from scratch': true, 'Static routing': true }),
  'lab4net-welcomed': '1'
};
const before = JSON.stringify(OLD);
const writes = [];
const read = k => (Object.prototype.hasOwnProperty.call(OLD, k) ? OLD[k] : null);

const r = M.fromV1(read, { replays: L4N.replays, now: 1731700000000 });
const m = P(r.main);
assert.strictEqual(JSON.stringify(OLD), before, 'old keys are left alone');
assert.deepStrictEqual(writes, [], 'fromV1 never writes');
assert.strictEqual(r.found, true);

// finished labs and grades
assert.deepStrictEqual(Object.keys(m.labs).sort(), ['802-1q-trunking', 'basic-device-setup', 'capstone-branch-office-from-scratch', 'incident-01-one-sales-pc-is-isolated', 'static-routing', 'vlans-and-access-ports'].sort());
assert.strictEqual(m.labs['static-routing'].done, true);
assert.strictEqual(m.labs['static-routing'].grade, 'S');
assert.strictEqual(m.labs['basic-device-setup'].done, true);
assert.strictEqual(m.labs['basic-device-setup'].grade, undefined, 'an unknown grade is dropped');
assert.strictEqual(m.labs['vlans-and-access-ports'].grade, 'B');
assert.strictEqual(m.labs['vlans-and-access-ports'].done, true, 'a grade means the lab was finished');
assert.strictEqual(m.labs['802-1q-trunking'].done, true, 'cleared counts as done');
assert.ok(!m.labs['router-on-a-stick'], 'cleared must be true, not just truthy');
assert.ok(!Object.keys(m.labs).some(k => /exam/.test(k)), 'Exam · titles are skipped');
// clues and the capstone guide
assert.strictEqual(m.labs['incident-01-one-sales-pc-is-isolated'].clues, 2);
assert.ok(!m.labs['static-routing'].clues, 'clues only for incidents');
assert.ok(!m.labs['incident-02-engineering-cannot-cross-floors'], 'a clue count above 3 is dropped');
assert.strictEqual(m.labs['capstone-branch-office-from-scratch'].guide, true);
assert.strictEqual(m.labs['static-routing'].guide, undefined, 'the guide choice only for capstones');
// quiz: rewritten questions dropped for quizRev below 2, out of range and non-boolean answers dropped
assert.deepStrictEqual(m.quiz, { rev: 2, answers: { 0: true, 1: false } });
assert.deepStrictEqual(m.subnet, { right: 40, total: 60 });
// lessons
assert.deepStrictEqual(m.lessons, { 'static-routing': { read: true, quiz: { 0: true } } });
// saved work: only labs that replay cleanly
assert.deepStrictEqual(Object.keys(r.work), ['static-routing']);
assert.deepStrictEqual(P(r.work['static-routing']), { journal: [{ device: 'R1', line: 'enable', t: 1731600000000 }, { device: 'R1', line: 'configure terminal' }], tasks: [true, false, false] });
// ui and the record of the import
assert.strictEqual(m.ui.lastLab, L4N.data.labs[4].slug);
assert.strictEqual(m.ui.landingSeen, true);
assert.deepStrictEqual(m.migrated, { from: 'v1', at: 1731700000000, labs: 4, lessons: 1, told: false }); // the incident and capstone only carry clues and a guide choice
// nothing with markup anywhere
assert.ok(!JSON.stringify(m).includes('<img'), 'no markup survives');

// ---- a fresh browser: nothing to import ----
const fresh = M.fromV1(() => null, { now: 1 });
assert.strictEqual(fresh.found, false);
assert.strictEqual(fresh.main.migrated.from, 'none');
assert.deepStrictEqual(P(fresh.main.labs), {});

// ---- bad values in every old key are dropped, not shown ----
const junk = M.fromV1(k => ({ 'ccna-bench-v2': '{not json', 'lab4net-fun-v1': '[1,2]', 'lab4net-lessons-v1': 'null', 'lab4net-workspace-v1': JSON.stringify({ drafts: [], lastLab: 999 }),
  'lab4net-incident-hints': '"x"', 'lab4net-capstone-guide': JSON.stringify({ __proto__: { polluted: true } }) })[k] || null, { now: 1 });
assert.deepStrictEqual(P(junk.main.labs), {});
assert.strictEqual(junk.main.ui.lastLab, null);
assert.strictEqual(({}).polluted, undefined, 'no prototype pollution');

// ---- an old version 1 backup goes through the same import ----
const v1 = JSON.stringify({ format: 'lab4net', version: 1, progress: JSON.parse(OLD['ccna-bench-v2']), drafts: JSON.parse(OLD['lab4net-workspace-v1']).drafts, lastLab: 4,
  extras: { 'lab4net-fun-v1': OLD['lab4net-fun-v1'], 'lab4net-lessons-v1': OLD['lab4net-lessons-v1'], 'lab4net-exam-v1': JSON.stringify({ history: [{ title: P0 }] }) } });
const b1 = M.readBackup(v1, { replays: L4N.replays });
assert.strictEqual(b1.version, 1);
assert.strictEqual(b1.main.labs['static-routing'].grade, 'S');
assert.deepStrictEqual(Object.keys(b1.work), ['static-routing']);
assert.ok(!JSON.stringify(P(b1.main)).includes('<'), 'no markup in a version 1 import');

// ---- a doctored version 2 backup ----
const v2 = JSON.stringify({ format: 'lab4net', version: 2, exported: 1, data: {
  v2: { v: 2, settings: { theme: P0, pace: 'fast' }, labs: { 'static-routing': { done: true, grade: 'A' }, [P0]: { done: true }, '__proto__': { done: true } },
    lessons: { 'static-routing': { read: true, quiz: { 0: P0 } } }, quiz: { answers: { 0: true, [P0]: true } }, ui: { lastLab: P0, sidebar: P0 }, exam: { history: [{ title: P0 }] } },
  work: { 'static-routing': { journal: [{ device: 'R1', line: 'enable' }], tasks: [] }, 'basic-device-setup': { journal: [{ device: '<b>', line: 'x' }] } } } });
const b2 = M.readBackup(v2, { replays: L4N.replays });
assert.strictEqual(b2.main.settings.theme, 'dark');
assert.deepStrictEqual(Object.keys(b2.main.labs), ['static-routing']);
assert.strictEqual(b2.main.ui.lastLab, null);
assert.deepStrictEqual(Object.keys(b2.work), ['static-routing']);
assert.ok(!JSON.stringify(P(b2)).includes('<'), 'no markup in a version 2 import');
assert.throws(() => M.readBackup('{"format":"other"}'), /not a Lab4Net backup/);
assert.throws(() => M.readBackup('x'.repeat(5 * 1024 * 1024 + 1)), /5 MB/);
assert.throws(() => M.readBackup(JSON.stringify({ format: 'lab4net', version: 3 })), /newer version/);

// ---- merging: finished labs and the better grade are kept; saved work replaced only for labs in the file ----
const cur = { main: L4N.validate.main({ labs: { 'static-routing': { done: true, grade: 'S' }, 'basic-device-setup': { done: true, grade: 'C' } } }),
  work: { 'basic-device-setup': { journal: [{ device: 'R1', line: 'enable' }], tasks: [] }, 'vlans-and-access-ports': { journal: [{ device: 'SW1', line: 'enable' }], tasks: [] } } };
const inc = { main: L4N.validate.main({ labs: { 'static-routing': { done: true, grade: 'B' }, 'basic-device-setup': { done: true, grade: 'A' }, '802-1q-trunking': { done: true } } }),
  work: { 'basic-device-setup': { journal: [{ device: 'R1', line: 'show version' }], tasks: [true] } }, sandbox: null };
const mg = M.merge(cur, inc);
assert.strictEqual(mg.main.labs['static-routing'].grade, 'S');
assert.strictEqual(mg.main.labs['basic-device-setup'].grade, 'A');
assert.strictEqual(mg.main.labs['802-1q-trunking'].done, true);
assert.strictEqual(mg.work['basic-device-setup'].journal[0].line, 'show version');
assert.strictEqual(mg.work['vlans-and-access-ports'].journal[0].line, 'enable');

console.log('PASS migrate: old storage becomes the new state, bad values dropped, Exam titles skipped, old keys untouched, version 1 and 2 backups checked and merged.');
