// TASK_CHECKS (src/data/task-checks.js) stays in step with the labs: every build lab and capstone has one entry per
// task; each entry is a list of real check indices, 'run' or []; every check is used by some task; and 'run' only marks
// tasks whose step-by-step commands only look (show, ping, traceroute, ipconfig...), so running them changes nothing.
// Then, with each lab's solution applied, every linked task's checks pass (the links point at the right checks).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { L4N } = require('./app-core.cjs')();
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/data/task-checks.js'), 'utf8') + ';globalThis.T=TASK_CHECKS;', ctx);
const TC = ctx.T;
const LOOK = /^\s*(do\s+)?(sh(o(w)?)?|ping|traceroute|tracert|ipconfig|ipv6config|arp|netstat|telnet|ssh)\b/i;
// moving between modes changes nothing: not counted, and not a reason to refuse 'run'
const MOVE = /^\s*(end|exit|enable|disable|configure terminal|conf t|logout)\s*$/i;

const labs = L4N.data.labs.filter(l => l.kind !== 'incident');
let tasks = 0, linked = 0, run = 0;
for (const l of labs) {
  const t = TC[l.slug], lab = l.lab;
  assert.ok(Array.isArray(t), l.slug + ' has an entry in TASK_CHECKS');
  assert.strictEqual(t.length, lab.tasks.length, l.slug + ' has one entry per task (' + lab.tasks.length + ')');
  const used = new Set(), steps = L4N.sim.steps(lab);
  t.forEach((e, i) => {
    tasks++;
    if (e === 'run') {
      run++;
      // answers to a prompt (Password:) are neutral too
      const cmds = (steps[i] || []).flatMap(g => g.lines.filter(x => x.cmd && !/:\s*$/.test(x.prompt || '')).map(x => x.cmd)).filter(c => !MOVE.test(c));
      assert.ok(cmds.length, l.slug + ' task ' + (i + 1) + " is 'run' but has no step-by-step commands");
      for (const c of cmds) assert.ok(LOOK.test(c), l.slug + ' task ' + (i + 1) + " is 'run' but its command changes things: " + c);
      return;
    }
    assert.ok(Array.isArray(e), l.slug + ' task ' + (i + 1) + " is a list, 'run' or []");
    if (e.length) linked++;
    for (const j of e) { assert.ok(Number.isInteger(j) && j >= 0 && j < lab.checks.length, l.slug + ' task ' + (i + 1) + ': no check ' + j); used.add(j); }
  });
  lab.checks.forEach((c, j) => assert.ok(used.has(j), l.slug + ': check ' + j + ' ("' + c[0] + '") is not linked to any task'));
  // Work through the step-by-step one task at a time (labs.cjs proves it completes the lab): once a task's own steps
  // are done, the checks linked to it pass, so the task ticks when the learner finishes it, not later.
  const st = L4N.sim.open(l, null);
  t.forEach((e, i) => {
    for (const g of steps[i] || []) for (const x of g.lines) if (x.cmd) L4N.sim.exec(st, g.dev, x.cmd);
    if (!Array.isArray(e) || !e.length) return;
    const res = L4N.sim.grade(st);
    for (const j of e) assert.ok(res[j] && res[j][1], l.slug + ' task ' + (i + 1) + ': check ' + j + ' ("' + lab.checks[j][0] + '") still fails after the task\'s own steps');
  });
}
for (const k of Object.keys(TC)) assert.ok(labs.some(l => l.slug === k), k + ' in TASK_CHECKS is a build lab or capstone');

// The ticks as a learner sees them (sim.taskStatus): nothing is ticked when a lab opens; working through the
// step-by-step, each task ticks once its own steps are done, and no later task ticks before its own steps.
let walked = 0;
for (const l of labs) {
  const lab = l.lab, steps = L4N.sim.steps(lab), st = L4N.sim.open(l, null);
  const s0 = L4N.sim.taskStatus(st, l);
  s0.forEach((v, i) => assert.ok(v !== true, l.slug + ' task ' + (i + 1) + ' is ticked before anything is typed'));
  lab.tasks.forEach((_, i) => {
    for (const g of steps[i] || []) for (const x of g.lines) if (x.cmd) L4N.sim.exec(st, g.dev, x.cmd);
    const s = L4N.sim.taskStatus(st, l);
    if (s[i] !== null) assert.strictEqual(s[i], true, l.slug + ' task ' + (i + 1) + ' is not ticked after its own steps');
    for (let k = i + 1; k < s.length; k++) assert.ok(s[k] !== true, l.slug + ' task ' + (k + 1) + ' ticks after task ' + (i + 1) + ', before its own steps');
  });
  walked++;
}
// Only what a task asks for: work each lab again, leaving out every looking command (show, ping…) a task's own words
// don't ask for. Each task must still tick once its own asked-for steps are done ("bring it up" ticks when it is up).
let asOnly = 0;
// only commands that purely look are left out (ipconfig and ipv6config can set an address or renew a lease)
const LOOKCMD = /^\s*(do\s+)?(sh(o(w)?)?|ping|traceroute|tracert|arp|netstat|telnet|ssh)\b/i;
for (const l of labs) {
  const lab = l.lab, steps = L4N.sim.steps(lab), st = L4N.sim.open(l, null), asked = L4N.sim.taskAsks(l);
  lab.tasks.forEach((_, i) => {
    for (const g of steps[i] || []) for (const x of g.lines) {
      if (!x.cmd) continue;
      if (LOOKCMD.test(x.cmd) && !asked[i].some(([d, c]) => d === g.dev && c === x.cmd)) continue;   // not asked for: skipped
      L4N.sim.exec(st, g.dev, x.cmd);
    }
    const s = L4N.sim.taskStatus(st, l);
    if (s[i] !== null) { assert.strictEqual(s[i], true, l.slug + ' task ' + (i + 1) + ' does not tick when done as its words ask'); asOnly++; }
  });
}
// the case that found this: Switch management access, task 3, up and addressed with no show command
{
  const l = L4N.data.lab('switch-management-access'), st = L4N.sim.open(l, null);
  for (const c of ['enable', 'configure terminal', 'vlan 99', 'name MGMT', 'exit', 'interface vlan 99', 'ip address 192.168.99.2 255.255.255.0', 'no shutdown']) L4N.sim.exec(st, 'SW1', c);
  assert.strictEqual(L4N.sim.taskStatus(st, l)[2], true, 'switch-management-access task 3 ticks when VLAN 99 is up and addressed, with no show command');
}
console.log('PASS as asked: ' + asOnly + ' tasks tick when done exactly as their words ask, without unasked show or ping commands.');

// Incidents: reproduce needs a test, evidence a show, restore every check, and retest a test after the repair.
const incidents = L4N.data.labs.filter(l => l.kind === 'incident');
for (const l of incidents) {
  const st = L4N.sim.open(l, null), dev = Object.keys(l.lab.solution)[0];
  assert.deepStrictEqual(Array.from(L4N.sim.taskStatus(st, l)), [false, false, false, false], l.slug + ' starts with nothing ticked');
  const host = L4N.sim.devices(st).find(d => /^pc|^srv|^server|^client|^admin/i.test(d.name)) || L4N.sim.devices(st)[0];
  L4N.sim.exec(st, host.name, 'ping 192.0.2.1');
  L4N.sim.exec(st, dev, 'enable'); L4N.sim.exec(st, dev, 'show ip interface brief');
  const s1 = L4N.sim.taskStatus(st, l);
  assert.ok(s1[0] && s1[1] && !s1[2] && !s1[3], l.slug + ': a ping and a show tick reproduce and evidence only');
  for (const [d, cmds] of Object.entries(l.lab.solution)) for (const c of cmds) L4N.sim.exec(st, d, c);
  const fixedAt = st.journal.length, s2 = L4N.sim.taskStatus(st, l, fixedAt);
  assert.ok(s2[2] && !s2[3], l.slug + ': the repair ticks restore, not retest');
  L4N.sim.exec(st, host.name, 'ping 192.0.2.1');
  assert.ok(L4N.sim.taskStatus(st, l, fixedAt)[3], l.slug + ': a test after the repair ticks retest');
}
console.log('PASS task ticks: ' + walked + ' labs worked task by task (nothing early, each task on its own steps); ' + incidents.length + ' incidents through their four rules.');
console.log('PASS task-checks: ' + labs.length + ' labs, ' + tasks + ' tasks: ' + linked + ' tick from checks, ' + run + ' from running their commands, ' + (tasks - linked - run) + ' by hand; every check is used.');
