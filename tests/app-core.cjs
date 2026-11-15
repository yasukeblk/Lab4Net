// Loads the engine and data from the built index.html, then the app's DOM-free core modules from src/, into one
// Node vm context (shared globals, like script tags). Used by migrate.cjs and validate.cjs. Not a test itself.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const CORE = ['slug', 'store', 'validate', 'router', 'search', 'sim', 'grade', 'progress', 'migrate'];

module.exports = function load() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ctx = { console, Date, setTimeout, clearTimeout };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(html.split('//ENGINE-START')[1].split('//ENGINE-END')[0], ctx, { filename: 'engine' });
  for (const f of ['quiz', 'automation', 'campaign', 'lessons', 'lesson-order', 'objectives', 'sandbox']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data', f + '.js'), 'utf8'), ctx, { filename: f });
  for (const f of CORE) {
    const src = require('../tools/build.cjs').stripJs(fs.readFileSync(path.join(ROOT, 'src/app/core', f + '.js'), 'utf8'));
    if (!html.includes(src)) throw Error('index.html does not carry src/app/core/' + f + '.js: run node tools/build.cjs');
    vm.runInContext(src, ctx, { filename: f + '.js' });
  }
  const L4N = ctx.L4N, V = L4N.validate;
  L4N.data = L4N.sim.catalogue();
  for (const l of L4N.data.labs) V.known.labs.add(l.slug);
  for (const l of L4N.data.lessons) { V.known.lessons.add(l.slug); V.known.lessonQuiz[l.slug] = (l.lesson.quiz || []).length; }
  V.known.quizCount = vm.runInContext('QUIZ.length', ctx);
  V.known.automationCount = vm.runInContext('AUTOMATION.length', ctx);
  L4N.replays = (slug, w) => { const e = L4N.data.lab(slug); if (!e) return false; try { L4N.sim.open(e, w); return true; } catch (x) { return false; } };
  // plain-object copies, so assert.deepStrictEqual compares values, not realms
  L4N.plain = v => JSON.parse(JSON.stringify(v));
  return { L4N, ctx };
};
