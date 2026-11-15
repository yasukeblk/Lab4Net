// Runs every Node test (no browser needed), in the same order as GitHub Actions.
//   node tests/run-node.cjs
'use strict';
const { spawnSync } = require('child_process'), path = require('path');
const TESTS = ['labs', 'forwarding', 'curriculum', 'lessons', 'lessons-markdown', 'lessons-order', 'counts', 'ping', 'console', 'switching', 'prompts', 'exam',
  'quiz', 'duplex', 'ping6', 'campaign', 'ospfarea', 'sitepages', 'build', 'slugs', 'migrate', 'grade', 'validate'];
const fs = require('fs');
let failed = 0;
for (const t of TESTS) {
  const file = path.join(__dirname, t + '.cjs');
  if (!fs.existsSync(file)) continue;
  const r = spawnSync(process.execPath, [file], { encoding: 'utf8' });
  const last = (r.stdout + r.stderr).trim().split('\n').pop();
  if (r.status === 0) console.log('ok    ' + t.padEnd(11) + ' ' + last.slice(0, 110));
  else { failed++; console.log('FAIL  ' + t + '\n' + (r.stdout + r.stderr).trim().split('\n').slice(-15).join('\n')); }
}
if (failed) { console.log(failed + ' test file(s) failed'); process.exit(1); }
console.log('All Node tests passed.');
