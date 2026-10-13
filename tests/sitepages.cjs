// The public lesson pages (lessons/*.html) are generated from the lessons in index.html by tools/build-site.cjs.
// This checks they are up to date, that every page has the tags search engines and share previews need, that every
// link between pages resolves, that every "open in the lab" link reaches a real lab or lesson, and that the sitemap
// lists every page. If it fails after a lesson change, run: node tools/build-site.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://yasukeblk.github.io/Lab4Net/';

try { execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.cjs'), '--check'], { stdio: 'pipe' }); }
catch (e) { console.error(String(e.stderr || e.stdout || e)); process.exit(1); }
const { slug, pages, LABS } = require('../tools/build-site.cjs');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const app = read('index.html');
const labSlugs = new Set(LABS.map(l => slug(l.title)));
const sitemap = read('sitemap.xml');
const files = fs.readdirSync(path.join(ROOT, 'lessons')).filter(f => f.endsWith('.html'));
assert.equal(files.length, pages.length + 1, 'one page per lesson plus the index');
assert.ok(pages.length >= 56, 'every lesson has a page');

const titles = new Set(), descs = new Set();
for (const f of files) {
  const h = read('lessons/' + f), url = SITE + 'lessons/' + (f === 'index.html' ? '' : f);
  const title = /<title>([^<]+)<\/title>/.exec(h)?.[1], desc = /<meta name="description" content="([^"]+)">/.exec(h)?.[1];
  assert.ok(title && title.length <= 90, f + ': title');
  assert.ok(desc && desc.length >= 60 && desc.length <= 170, f + ': description length ' + (desc || '').length);
  assert.ok(!titles.has(title) && !descs.has(desc), f + ': title and description are unique'); titles.add(title); descs.add(desc);
  assert.ok(h.includes(`<link rel="canonical" href="${url}">`), f + ': canonical');
  assert.ok(h.includes(`<meta property="og:url" content="${url}">`) && h.includes(`content="${SITE}og.png"`), f + ': share tags');
  assert.equal((h.match(/<h1>/g) || []).length, 1, f + ': one h1');
  JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(h)[1]);
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), f + ': in the sitemap');
  assert.ok(!/<script>(?![^<]*goatcounter)/.test(h), f + ': the only inline script is the visit counter');
  assert.ok(h.includes(`location.hostname!=="yasukeblk.github.io"`) && h.includes(`navigator.doNotTrack==='1'`), f + ': counter only on the public site and honours Do Not Track');
  for (const [, href] of h.matchAll(/href="([^"#]+)"/g)) {
    if (/^https?:|^data:/.test(href)) continue;
    const m = /^\.\.\/\?(lab|lesson)=([a-z0-9-]+)$/.exec(href);
    if (m) { assert.ok(m[1] === 'lab' ? labSlugs.has(m[2]) : pages.some(p => p.slug === m[2]), f + ': deep link ' + href); continue; }
    const target = path.join(ROOT, 'lessons', href.endsWith('/') ? href + 'index.html' : href);
    assert.ok(fs.existsSync(target), f + ': link ' + href);
  }
}
for (const p of pages) assert.ok(read('lessons/index.html').includes(`href="${p.slug}.html"`), p.slug + ' is listed on the lessons index');
assert.ok(sitemap.includes(`<loc>${SITE}</loc>`), 'the app is in the sitemap');
// the app's deep-link slug is the generator's slug
assert.ok(app.includes(`const slug=s=>String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');`), 'the app slugs links the same way');
console.log(`PASS site pages: ${pages.length} lesson pages up to date, unique titles and descriptions, canonical and share tags, structured data, sitemap, links and deep links resolve.`);
