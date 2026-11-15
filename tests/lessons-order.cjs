// LESSON_ORDER (src/data/lesson-order.js, built into index.html) lists every lesson exactly once, only real lessons,
// each in the group of its first exam objective (the group the Lessons list shows it in). FIXES-PLAN.md phase 7.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(html.split('//ENGINE-START')[1].split('//ENGINE-END')[0] + ';globalThis.E={LABS};', ctx);
const lc = vm.createContext({});
vm.runInContext('const LESSONS={};' + html.slice(html.indexOf('//LESSONS-DATA-START'), html.indexOf('//LESSONS-DATA-END')) + ';globalThis.L=LESSONS;', lc);
const lo = /const LESSON_ORDER=(\{[\s\S]*?\n\});/.exec(html);
assert.ok(lo, 'LESSON_ORDER is built into index.html');
const ORDER = vm.runInNewContext('(' + lo[1] + ')');

const slug = s => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const labs = Array.from(ctx.E.LABS), lessons = lc.L;
const domainOf = k => { const L = lessons[k], lab = labs.find(l => l.title === k); return String(((L.topic ? L.ccna : lab && lab.ccna) || [])[0] || '').split('.')[0]; };
const bySlug = new Map(Object.keys(lessons).map(k => [slug(k), k]));

const seen = new Map();
for (const [group, list] of Object.entries(ORDER)) {
  assert.ok(Array.isArray(list) && list.length, 'group ' + group + ' is a non-empty list');
  for (const s of list) {
    assert.ok(bySlug.has(s), s + ' (group ' + group + ') is a real lesson');
    assert.ok(!seen.has(s), s + ' is listed once, not in groups ' + seen.get(s) + ' and ' + group);
    seen.set(s, group);
    assert.strictEqual(domainOf(bySlug.get(s)), group, s + ' belongs in group ' + domainOf(bySlug.get(s)) + ', the domain of its first objective');
  }
}
for (const s of bySlug.keys()) assert.ok(seen.has(s), s + ' is in LESSON_ORDER');
console.log('PASS lessons-order: ' + seen.size + ' lessons in ' + Object.keys(ORDER).length + ' groups, each listed once, in the group of its first objective.');
