#!/usr/bin/env node
// Builds index.html from src/. Node only, no packages.
//   node tools/build.cjs          write index.html and print the size table
//   node tools/build.cjs --check  exit 1 if the committed index.html is not what src/ builds
// The output depends only on the files in src/ (and package.json): no timestamps, no random values.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'index.html');
const KB = 1000;

// Size budget (REDESIGN-PLAN.md section 6.2). Engine and data have no budget.
const BUDGET = {
  appJs: 300 * KB,
  css: 70 * KB,
  fonts: 170 * KB,
  markup: 30 * KB,
  total: 1550 * KB,
  gzip: 570 * KB
};

const read = rel => fs.readFileSync(path.join(SRC, rel), 'utf8');
const bytes = s => Buffer.byteLength(s, 'utf8');

function fontFace(f) {
  const b64 = fs.readFileSync(path.join(SRC, f.file)).toString('base64');
  return '@font-face{font-family:"' + f.family + '";font-weight:' + f.weight + ';font-style:' + f.style +
    ';font-display:swap;src:url(data:font/woff2;base64,' + b64 + ') format("woff2")}\n';
}

function replaceOnce(text, marker, value, required) {
  const at = text.indexOf(marker);
  if (at < 0) { if (required) throw new Error('template is missing ' + JSON.stringify(marker)); return text; }
  if (text.indexOf(marker, at + 1) >= 0) throw new Error('template has ' + JSON.stringify(marker) + ' more than once');
  return text.slice(0, at) + value + text.slice(at + marker.length);
}

function build() {
  const manifest = JSON.parse(read('manifest.json'));
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const template = read(manifest.template);

  const fonts = (manifest.fonts || []).map(fontFace).join('');
  const css = (manifest.css || []).map(read).join('');
  const icons = (manifest.icons || []).map(read).join('');
  const engineFiles = manifest.engine.map(read);
  for (const [k, t] of engineFiles.entries())
    if (/\/\/ENGINE-(START|END)/.test(t)) throw new Error(manifest.engine[k] + ' contains an engine marker');
  const engine = '//ENGINE-START\n' + engineFiles.join('') + '//ENGINE-END\n';
  const jsFiles = manifest.js.map(f => [f, read(f)]);
  for (const [f, t] of jsFiles)
    if (/\/\/ENGINE-(START|END)/.test(t)) throw new Error(f + ' contains an engine marker');
  const data = jsFiles.filter(([f]) => f.startsWith('data/')).map(([, t]) => t).join('');
  const app = jsFiles.filter(([f]) => !f.startsWith('data/')).map(([, t]) => t).join('');

  let html = template;
  // Simple values first, so a value can never be mistaken for a marker.
  html = html.split('/*@version*/').join(String(pkg.version || ''));
  html = html.split('/*@date*/').join(String((pkg.lab4net && pkg.lab4net.date) || ''));
  html = replaceOnce(html, '/*@fonts*/\n', fonts, true);
  html = replaceOnce(html, '/*@css*/\n', css, true);
  html = replaceOnce(html, '<!--@icons-->\n', icons, icons.length > 0);
  html = replaceOnce(html, '//@js\n', engine + jsFiles.map(([, t]) => t).join(''), true);

  const markup = bytes(template) - '/*@fonts*/\n/*@css*/\n//@js\n'.length - (template.includes('<!--@icons-->\n') ? '<!--@icons-->\n'.length : 0);
  const sizes = {
    engineData: bytes(engine) + bytes(data),
    appJs: bytes(app),
    css: bytes(css),
    fonts: bytes(fonts),
    markup: markup + bytes(icons),
    total: bytes(html),
    gzip: zlib.gzipSync(Buffer.from(html, 'utf8'), { level: 9 }).length
  };
  const over = Object.keys(BUDGET).filter(k => sizes[k] > BUDGET[k]);
  return { html, sizes, over };
}

function table(sizes, over) {
  const rows = [
    ['Engine and data', 'engineData'], ['App JavaScript', 'appJs'], ['CSS without fonts', 'css'],
    ['Fonts as base64', 'fonts'], ['Icons, markup, landing', 'markup'], ['index.html total', 'total'], ['gzipped', 'gzip']
  ];
  const kb = n => (n / KB).toFixed(1).padStart(8) + ' KB';
  return rows.map(([label, k]) => label.padEnd(24) + kb(sizes[k]) + (BUDGET[k] ? '  / ' + (BUDGET[k] / KB) + ' KB' : '  (no budget)') +
    (over.includes(k) ? '  OVER BUDGET' : '')).join('\n');
}

module.exports = { build, BUDGET };

if (require.main === module) {
  const check = process.argv.includes('--check');
  let r;
  try { r = build(); } catch (e) { console.error('build failed: ' + e.message); process.exit(1); }
  if (check) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT) : null;
    if (!cur || !cur.equals(Buffer.from(r.html, 'utf8'))) {
      console.error('index.html is out of date. Run: node tools/build.cjs');
      process.exit(1);
    }
    if (r.over.length) { console.error(table(r.sizes, r.over)); process.exit(1); }
    console.log('index.html is up to date.');
  } else {
    fs.writeFileSync(OUT, r.html);
    console.log(table(r.sizes, r.over));
    if (r.over.length) { console.error('Size budget broken: ' + r.over.join(', ')); process.exit(1); }
  }
}
