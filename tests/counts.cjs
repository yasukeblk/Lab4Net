// The totals written in the docs (README.md, docs/DEVELOPING.md, docs/LESSON-WRITING.md) match the data, counted
// from src/ the way the build counts them (FIXES-PLAN.md phase 8). Each pattern needs a number and the word that says
// what it counts, so unrelated numbers can't match. A count written in a new way needs a pattern here.
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const C = require('../tools/build.cjs').srcCounts();
const ROOT = path.join(__dirname, '..');

const RULES = [
  [/\b(\d+) labs\b/g, 'LABS', 'labs'],
  [/\b(\d+) build labs\b/g, 'BUILD_LABS', 'build labs'],
  [/\((\d+) build,/g, 'BUILD_LABS', 'build labs'],
  [/\b(\d+) (?:troubleshooting )?incidents\b/g, 'INCIDENTS', 'incidents'],
  [/\b(\d+) capstones\b/g, 'CAPSTONES', 'capstones'],
  [/\b(\d+) lessons\b/g, 'LESSONS', 'lessons'],
  [/\((\d+) lab, \d+ topic\)/g, 'LAB_LESSONS', 'lab lessons'],
  [/\(\d+ lab, (\d+) topic\)/g, 'TOPIC_LESSONS', 'topic lessons'],
  [/\b(\d+)-question quiz\b/g, 'QUIZ', 'quiz questions'],
  [/\b(\d+) quiz questions\b/g, 'QUIZ', 'quiz questions']
];

let checked = 0;
for (const file of ['README.md', 'docs/DEVELOPING.md', 'docs/LESSON-WRITING.md']) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);
  let found = 0;
  lines.forEach((line, i) => {
    for (const [re, key, what] of RULES) for (const m of line.matchAll(re)) {
      found++; checked++;
      assert.strictEqual(+m[1], C[key], file + ':' + (i + 1) + ' says ' + m[1] + ' ' + what + ' but the data has ' + C[key] + ': "' + line.trim().slice(0, 100) + '"');
    }
  });
  assert.ok(found > 0, file + ' states at least one count (or this test no longer looks at it)');
}
console.log('PASS counts: ' + checked + ' totals in README.md, docs/DEVELOPING.md and docs/LESSON-WRITING.md match the data (' +
  C.LABS + ' labs, ' + C.LESSONS + ' lessons, ' + C.QUIZ + ' quiz questions).');
