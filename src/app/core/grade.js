// grade.js: the grade rules (section 2), copied exactly from the old rank rules. No DOM.
//  - A lab is done when every check passes.
//  - Score starts at 100. Minus 25 for the walkthrough, 15 for the guide (step-by-step for every task), 5 per clue,
//    and 2 per rejected command after the first two (at most 10). Help for one task: 2 per hint and 5 per task whose
//    commands were shown, at most 15 together, never more than the guide (and nothing more if the guide was on).
//  - A run with no check command of your own tops out at A.
//  - S is 95 or more, A is 85, B is 70, C is 55, D is anything lower. The best grade is kept.
//  - Time and command count are never scored.
(function (L4N) {
  'use strict';
  const ORDER = ['D', 'C', 'B', 'A', 'S'];
  // A command that checks the network (free, and needed for an S).
  const CHECKCMD = /^\s*(do\s+)?(sh(o(w)?)?|ping|traceroute|tracert|telnet|ssh|ipconfig|arp|debug|netstat)\b/i;
  // Output that means the command was rejected.
  const REJECTED = /^% (Invalid|Incomplete|Ambiguous|Unrecognized|Unknown|Bad|Please|Login invalid|Password too short)|^%Inconsistent|^Command rejected|^Bad mask|is not recognized as an internal|^Error: unrecognized|^Bad option|^Usage: |^Permission denied/;

  // run: {errs, checks, help, walk, clues, hints, shown}
  function score(run) {
    const r = run || {};
    let s = 100 - (r.walk ? 25 : 0) - (r.help ? 15 : Math.min(15, (r.hints || 0) * 2 + (r.shown || 0) * 5)) - (r.clues || 0) * 5 - Math.min(10, Math.max(0, (r.errs || 0) - 2) * 2);
    if (!r.checks) s = Math.min(s, 94);
    return s;
  }
  function letter(s) { return s >= 95 ? 'S' : s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 55 ? 'C' : 'D'; }
  function better(a, b) { if (!a) return b || null; if (!b) return a; return ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b; }
  const rejected = lines => (lines || []).some(l => REJECTED.test(l));
  const isCheck = line => CHECKCMD.test(line || '');

  // Count one command into a run (the old rules: a rejected command is an error, a check command is a check).
  function count(run, line, lines) {
    if (!run || run.done || !String(line).trim()) return run;
    if (rejected(lines)) run.errs = (run.errs || 0) + 1;
    else if (isCheck(line)) run.checks = (run.checks || 0) + 1;
    return run;
  }

  L4N.grade = { score, letter, better, rejected, isCheck, count, ORDER, CHECKCMD, REJECTED };
})(window.L4N = window.L4N || {});
