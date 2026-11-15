#!/usr/bin/env node
// One-time conversion (FIXES-PLAN.md phase 9): writes src/lessons/NNN-slug.md from the lessons in src/data/lessons.js,
// in the order they were added, and proves the round trip before anything is deleted: every file parses back to the
// same lesson, and all the files together compile to a LESSONS object deep-equal to today's, keys in the same order.
//   node tools/lessons-to-md.cjs
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { DIR, parse, toMd, compile } = require('./lessons-md.cjs');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'lessons.js'), 'utf8');
const ctx = vm.createContext({}); vm.runInContext(src + ';globalThis.L=LESSONS;', ctx);
const LESSONS = JSON.parse(JSON.stringify(ctx.L));
const keys = Object.keys(LESSONS);
if (!keys.length) { console.error('src/data/lessons.js holds no lessons: already converted?'); process.exit(1); }
const slug = s => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

fs.mkdirSync(DIR, { recursive: true });
keys.forEach((k, i) => {
  const text = toMd(k, LESSONS[k]), back = parse(text, k);
  assert.strictEqual(back.key, k);
  assert.deepStrictEqual(back.lesson, LESSONS[k], 'round trip of ' + k);
  fs.writeFileSync(path.join(DIR, String(i + 1).padStart(3, '0') + '-' + slug(k) + '.md'), text);
});
const c = vm.createContext({}); vm.runInContext('const LESSONS={};' + compile() + ';globalThis.L=LESSONS;', c);
const again = JSON.parse(JSON.stringify(c.L));
assert.deepStrictEqual(Object.keys(again), keys, 'same keys in the same order');
assert.deepStrictEqual(again, LESSONS, 'the files compile to the same LESSONS');
console.log('wrote ' + keys.length + ' lesson files to src/lessons/; the round trip gives the same ' + keys.length + ' lessons, keys in the same order.');
