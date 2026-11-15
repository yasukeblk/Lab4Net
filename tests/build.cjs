// The built index.html is up to date, keeps every marker the other tests and tools rely on,
// carries the unchanged engine, and stays inside the size budget.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
const { build, BUDGET } = require('../tools/build.cjs');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const r = build();
assert.ok(r.html === html, 'index.html is out of date: run node tools/build.cjs');

const count = s => html.split(s).length - 1;
for (const m of ['//ENGINE-START', '//ENGINE-END', 'const QUIZ=[', 'const CAMPAIGN=[', '//LESSONS-DATA-START', '//LESSONS-DATA-END'])
  assert.strictEqual(count(m), 1, m + ' must appear exactly once');
assert.ok(html.indexOf('//ENGINE-START') < html.indexOf('//ENGINE-END'), 'engine markers are in order');
assert.ok(html.includes('const LESSONS={};\n//LESSONS-DATA-START'), 'const LESSONS={}; is declared just before //LESSONS-DATA-START');
assert.ok(html.includes("const slug=s=>String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');"), 'the exact slug line is in the app');
assert.strictEqual(count("const SITE={host:'yasukeblk.github.io',donate:'https://buymeacoffee.com/yasukeblk',counter:'lab4net'};"), 1, 'SITE keeps its exact shape');

// The engine runs on its own and is unchanged.
const engine = html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const ctx = vm.createContext({ console });
vm.runInContext(engine + ';globalThis.E={n:LABS.length};', ctx);
assert.ok(ctx.E.n > 0, 'engine builds LABS');
const want = fs.readFileSync(path.join(__dirname, 'fixtures/engine.sha256'), 'utf8').trim();
const got = crypto.createHash('sha256').update(engine, 'utf8').digest('hex');
assert.strictEqual(got, want, 'engine block changed (see REDESIGN-PLAN.md section 6.2)');

// The quiz and the stages are readable the way quiz.cjs and campaign.cjs read them.
for (const name of ['QUIZ', 'CAMPAIGN']) {
  const i = html.indexOf('const ' + name + '=['), j = html.indexOf('\n];', i);
  const arr = vm.runInNewContext(html.slice(i + ('const ' + name + '=').length, j + 3).replace(/;$/, ''));
  assert.ok(Array.isArray(arr) && arr.length > 0, name + ' reads as an array');
}

// No old font, colour or class name from the arcade design remains in the app.
for (const old of ['VT323', 'Barlow', 'Plex', '--yel', '--mag', 'skewX'])
  assert.ok(!html.includes(old), 'index.html still contains the old name ' + old);

// Size budget.
assert.deepStrictEqual(r.over, [], 'size budget broken: ' + r.over.join(', '));
const kb = n => Math.round(n / 1000) + ' KB';
console.log('PASS build: up to date, markers present once, engine hash matches, size ' + kb(r.sizes.total) + ' of ' + kb(BUDGET.total) + ' (' + kb(r.sizes.gzip) + ' gzipped of ' + kb(BUDGET.gzip) + ').');
