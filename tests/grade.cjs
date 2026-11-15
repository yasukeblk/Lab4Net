// The grade rules (REDESIGN-PLAN.md section 2) for a table of runs. Reads core/grade.js out of the built app.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { stripJs } = require('../tools/build.cjs');
const src = stripJs(fs.readFileSync(path.join(__dirname, '../src/app/core/grade.js'), 'utf8'));
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert.ok(html.includes(src), 'index.html carries src/app/core/grade.js (run node tools/build.cjs)');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(src, ctx);
const G = ctx.L4N.grade;

const rows = [
  // [run, score, letter, what]
  [{ checks: 1 }, 100, 'S', 'a clean run with a check command of your own'],
  [{ checks: 0 }, 94, 'A', 'no check command tops out at A'],
  [{ checks: 3, errs: 2 }, 100, 'S', 'the first two rejected commands are free'],
  [{ checks: 3, errs: 3 }, 98, 'S', 'the third costs 2'],
  [{ checks: 3, errs: 5 }, 94, 'A', 'two points each after the first two'],
  [{ checks: 3, errs: 40 }, 90, 'A', 'typos cost at most 10'],
  [{ checks: 1, help: true }, 85, 'A', 'the guide costs 15'],
  [{ checks: 1, walk: true }, 75, 'B', 'the walkthrough costs 25'],
  [{ checks: 1, clues: 1 }, 95, 'S', 'one clue costs 5'],
  [{ checks: 1, clues: 3 }, 85, 'A', 'three clues cost 15'],
  [{ checks: 1, help: true, walk: true }, 60, 'C', 'guide and walkthrough'],
  [{ checks: 0, help: true, walk: true, clues: 3, errs: 20 }, 35, 'D', 'everything'],
  [{ checks: 1, help: true, walk: true, clues: 1 }, 55, 'C', 'C starts at 55'],
  [{ checks: 1, help: true, errs: 7 }, 75, 'B', 'B is 70 to 84'],
  // help for one task at a time (the Tasks panel's Hint and Show commands)
  [{ checks: 1, hints: 1 }, 98, 'S', 'a hint costs 2'],
  [{ checks: 1, shown: 1 }, 95, 'S', "one task's commands cost 5"],
  [{ checks: 1, hints: 2, shown: 1 }, 91, 'A', 'two hints and one task shown'],
  [{ checks: 1, hints: 5, shown: 5 }, 85, 'A', 'per-task help costs at most 15, never more than the guide'],
  [{ checks: 1, help: true, hints: 3, shown: 2 }, 85, 'A', 'with the guide on, per-task help costs nothing more']
];
for (const [run, score, letter, what] of rows) {
  assert.strictEqual(G.score(run), score, what + ': score');
  assert.strictEqual(G.letter(G.score(run)), letter, what + ': letter');
}
// the best grade is kept
assert.strictEqual(G.better('A', 'S'), 'S'); assert.strictEqual(G.better('S', 'B'), 'S'); assert.strictEqual(G.better(null, 'C'), 'C');
// counting: rejected commands are errors; show, ping and friends are checks and never lower a grade
const run = { cmds: 0 };
G.count(run, 'show ip route', ['Codes: L - local']);
G.count(run, 'do sh run', ['Building configuration...']);
G.count(run, 'ping 10.0.0.1', ['!!!!!']);
G.count(run, 'shw ip route', ['        ^', "% Invalid input detected at '^' marker."]);
G.count(run, 'ip route', ['% Incomplete command.']);
G.count(run, 'hostname R1', []);
assert.deepStrictEqual({ errs: run.errs, checks: run.checks }, { errs: 2, checks: 3 });
assert.strictEqual(G.letter(G.score({ checks: 50, errs: 0 })), 'S', 'extra show and ping commands never lower a grade');
// time and command count are never scored
assert.strictEqual(G.score({ checks: 1, cmds: 9999, sec: 99999 }), 100);
console.log('PASS grade: ' + rows.length + ' scripted runs, best grade kept, rejected commands and check commands counted.');
