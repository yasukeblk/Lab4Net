// Lab and lesson slugs are unique and equal to the frozen list. Progress, deep links and the
// lesson pages are keyed by slug, so a slug must never change once published.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const want = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/slugs.json'), 'utf8'));

const slug = s => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ctx = vm.createContext({ console });
vm.runInContext(html.split('//ENGINE-START')[1].split('//ENGINE-END')[0] + ';globalThis.E={LABS};', ctx);
const lc = vm.createContext({ console });
vm.runInContext('const LESSONS={};' + html.slice(html.indexOf('//LESSONS-DATA-START'), html.indexOf('//LESSONS-DATA-END')) + ';globalThis.L=LESSONS;', lc);

// Array.from, so the arrays belong to this realm and not to the vm sandbox.
const labs = Array.from(ctx.E.LABS, l => slug(l.title));
const lessons = Array.from(Object.keys(lc.L), slug);
assert.strictEqual(new Set(labs).size, labs.length, 'lab slugs are unique');
assert.strictEqual(new Set(lessons).size, lessons.length, 'lesson slugs are unique');
assert.deepStrictEqual(labs, want.labs.map(x => x.slug), 'lab slugs match tests/fixtures/slugs.json');
assert.deepStrictEqual(lessons, want.lessons.map(x => x.slug), 'lesson slugs match tests/fixtures/slugs.json');
for (const l of want.lessons) if (!l.topic) assert.ok(labs.includes(l.slug), 'lab lesson ' + l.slug + ' has a lab');
console.log('PASS slugs: ' + labs.length + ' lab slugs and ' + lessons.length + ' lesson slugs, unique and frozen.');
