// The lesson files (src/lessons/*.md, FIXES-PLAN.md phase 9) round-trip exactly: each file is in its canonical form
// (writing back what it parses to gives the same text), the files compile to the LESSONS built into index.html with the
// same keys in the same order, and a broken file fails with its name and line.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { DIR, parse, toMd, load } = require('../tools/lessons-md.cjs');

const files = load();
for (const f of files) {
  const text = fs.readFileSync(path.join(DIR, f.file), 'utf8').replace(/\r\n/g, '\n');
  assert.strictEqual(toMd(f.key, f.lesson), text, f.file + ' is in canonical form (write it with tools/lessons-md.cjs toMd, or match its layout)');
}
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const c = vm.createContext({});
vm.runInContext('const LESSONS={};' + html.slice(html.indexOf('//LESSONS-DATA-START'), html.indexOf('//LESSONS-DATA-END')) + ';globalThis.L=LESSONS;', c);
const built = JSON.parse(JSON.stringify(c.L));
assert.deepStrictEqual(Object.keys(built), files.map(f => f.key), 'index.html has the files\' lessons in file order (run node tools/build.cjs)');
for (const f of files) assert.deepStrictEqual(built[f.key], JSON.parse(JSON.stringify(f.lesson)), f.file + ' matches index.html');

// broken files fail with the file and the line
const bad = (text, msg) => assert.throws(() => parse(text, 'x.md'), e => e.message.startsWith('x.md') && e.message.includes(msg), msg);
bad('title: no header\n', 'must start with ---');
bad('---\ntitle: T\nmins: eight\n---\n', 'mins is a whole number');
bad('---\ntitle: T\n---\n\n## @quiz\n\n### Q?\n- a\n- b\n- c\n- d\n> why\n', 'needs a [x] answer');
bad('---\ntitle: T\n---\n\n## Section\n<p>one</p>\n<p>two</p>\n', 'one line of HTML');
bad('---\ntitle: T\n---\n\n## @terms\n- no separator here\n', 'term :: definition');
console.log('PASS lessons-files: ' + files.length + ' lesson files in canonical form, compiled into index.html in order; broken files name the file and line.');
