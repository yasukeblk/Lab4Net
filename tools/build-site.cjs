// Builds the public lesson pages from the lessons inside index.html, so the site and the app never drift apart.
//   node tools/build-site.cjs           write lessons/ and sitemap.xml
//   node tools/build-site.cjs --check   exit 1 if anything written would differ (used by tests/sitepages.cjs)
// Output: lessons/index.html, lessons/<slug>.html (one per lesson), lessons/site.css, lessons/fonts/*.woff2
// (the same fonts the app embeds, SIL Open Font License 1.1, see THIRD-PARTY-NOTICES.md) and sitemap.xml. The colours are
// the app's design tokens (src/styles/tokens.css); the theme follows the visitor's system setting.
// The pages are plain HTML and CSS with no scripts except the visit counter, which follows the app's rules:
// public site only, cookieless, and nothing when Do Not Track is on.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://yasukeblk.github.io/Lab4Net/';
const CHECK = process.argv.includes('--check');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- read the app's data ----
const ctx = vm.createContext({ console });
vm.runInContext(html.split('//ENGINE-START')[1].split('//ENGINE-END')[0] + ';globalThis.E={LABS,CCNA_OBJECTIVES,CCNA_DOMAINS};', ctx);
const { LABS, CCNA_OBJECTIVES, CCNA_DOMAINS } = ctx.E;
const lc = vm.createContext({ console });
vm.runInContext('const LESSONS={};' + html.slice(html.indexOf('//LESSONS-DATA-START'), html.indexOf('//LESSONS-DATA-END')) + ';globalThis.L=LESSONS;', lc);
const LESSONS = lc.L;
const site = /const SITE=\{host:'([^']*)',donate:'([^']*)',counter:'([^']*)'\}/.exec(html);
const HOST = site ? site[1] : 'yasukeblk.github.io', DONATE = site ? site[2] : '', COUNTER = site ? site[3] : '';

const slug = s => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = h => String(h).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s, n) => s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)).replace(/[,;:.]$/, '') + '…';

// ---- the lessons, in teaching order: LESSON_ORDER from the app (by exam topic), then any not listed in data order ----
const labOf = k => LABS.find(l => l.title === k);
const keys = Object.keys(LESSONS);
const lo = /const LESSON_ORDER=(\{[\s\S]*?\n\});/.exec(html);
if (!lo) throw Error('LESSON_ORDER is missing from index.html');
const LESSON_ORDER = vm.runInNewContext('(' + lo[1] + ')');
const ORDER = Object.keys(LESSON_ORDER).sort().flatMap(d => LESSON_ORDER[d]);
const rank = k => { const r = ORDER.indexOf(slug(k)); return r < 0 ? Infinity : r; };
const ordered = keys.slice().sort((a, b) => (rank(a) - rank(b)) || keys.indexOf(a) - keys.indexOf(b));
const pages = ordered.map(k => {
  const L = LESSONS[k], lab = L.topic ? null : labOf(k);
  return { k, L, lab, slug: slug(k), ccna: (L.topic ? L.ccna : lab.ccna) || [], group: L.topic ? 'Exam topic' : lab.group };
});
const bySlug = new Set();
for (const p of pages) { if (bySlug.has(p.slug)) throw Error('Duplicate lesson slug ' + p.slug); bySlug.add(p.slug); }

// ---- fonts: the app's own embedded fonts, written as files ----
// The app's fonts (src/fonts, listed in src/manifest.json) and colours (src/styles/tokens.css, dark theme).
const SRC = path.join(ROOT, 'src');
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const fonts = manifest.fonts.map(f => ({ fam: f.family, w: String(f.weight), st: f.style, file: path.basename(f.file), data: fs.readFileSync(path.join(SRC, f.file)) }));
const tokensCss = fs.readFileSync(path.join(SRC, 'styles/tokens.css'), 'utf8');
const darkBlock = /:root, \[data-theme="dark"\] \{([^}]+)\}/.exec(tokensCss)[1];
const lightBlock = /\[data-theme="light"\] \{([^}]+)\}/.exec(tokensCss)[1];
const tok = n => { const m = new RegExp('--' + n + ':\\s*([^;]+);').exec(darkBlock); if (!m) throw Error('token --' + n + ' missing from tokens.css'); return m[1].trim(); };


const counterJs = COUNTER ? `<script>(function(){if(location.hostname!==${JSON.stringify(HOST)}||navigator.doNotTrack==='1'||window.doNotTrack==='1')return;try{var i=new Image();i.src='https://${COUNTER}.goatcounter.com/count?p='+encodeURIComponent(location.pathname.replace(/^\\/Lab4Net/,''))+'&t='+encodeURIComponent(document.title)+(document.referrer?'&r='+encodeURIComponent(document.referrer):'')+'&rnd='+Math.random().toString(36).slice(2);}catch(e){}})();</script>` : '';
// ---- topology diagram for a lab, drawn from its real build and map positions, with the app's device icons ----
const deviceSvg = fs.readFileSync(path.join(SRC, 'icons/devices.svg'), 'utf8');
const symbolOf = kind => { const m = new RegExp('<symbol id="d-' + kind + '"[\\s\\S]*?</symbol>').exec(deviceSvg); return m ? m[0] : ''; };
const kindOf = d => d.type === 'router' ? 'router' : d.type === 'switch' ? (d.l3 ? 'l3' : 'switch') : d.phone ? 'phone' : /^AP\d*$/i.test(d.name) ? 'ap' : (Array.isArray(d.services) && d.services.length) ? 'server' : 'pc';
function diagram(lab) {
  const net = lab.build(), P = lab.pos || {}, devs = Object.values(net.devs).filter(d => P[d.name]);
  if (!devs.length) return '';
  const xs = devs.map(d => P[d.name][0]), ys = devs.map(d => P[d.name][1]);
  const x0 = Math.min(...xs) - 50, x1 = Math.max(...xs) + 50, y0 = Math.min(...ys) - 34, y1 = Math.max(...ys) + 44;
  const kinds = [...new Set(devs.map(kindOf))];
  const node = d => { const [x, y] = P[d.name]; return `<g class="dev"><use href="#d-${kindOf(d)}" x="${x - 18}" y="${y - 18}" width="36" height="36"/><text x="${x}" y="${y + 33}">${esc(d.hostname || d.name)}</text></g>`; };
  const wires = net.links.filter(l => P[l.a] && P[l.b]).map(l => `<line x1="${P[l.a][0]}" y1="${P[l.a][1]}" x2="${P[l.b][0]}" y2="${P[l.b][1]}"/>`).join('');
  return `<figure class="topo"><svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" role="img" aria-label="Network diagram for the ${esc(lab.title)} lab: ${devs.map(d => esc(d.name)).join(', ')}"><defs>${kinds.map(symbolOf).join('')}</defs><g class="wires">${wires}</g>${devs.map(node).join('')}</svg><figcaption>The ${esc(lab.title)} lab's network</figcaption></figure>`;
}

// ---- shared page parts ----
const logo = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" class="mark__tile"/><path d="M10 9v9.5a4.5 4.5 0 0 0 4.5 4.5H22" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="10" cy="9" r="3.25" fill="#fff"/><circle cx="22.5" cy="23" r="3.25" fill="#fff"/><circle cx="16.5" cy="23" r="2.4" fill="#fff"/></svg>`;
const icon = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%232F6BEB'/%3E%3Cpath d='M10 9v9.5a4.5 4.5 0 0 0 4.5 4.5H22' fill='none' stroke='%23fff' stroke-width='3' stroke-linecap='round'/%3E%3Ccircle cx='10' cy='9' r='3.25' fill='%23fff'/%3E%3Ccircle cx='22.5' cy='23' r='3.25' fill='%23fff'/%3E%3Ccircle cx='16.5' cy='23' r='2.4' fill='%23fff'/%3E%3C/svg%3E">`;
function head({ title, desc, url, jsonld }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="${tok('bg-app')}" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="${tokLight('bg-app')}" media="(prefers-color-scheme: light)">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Lab4Net">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${icon}
<link rel="stylesheet" href="site.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
${counterJs}
</head>
<body>
<header class="bar"><a class="brand" href="../">${logo}<span>Lab4Net</span></a><nav aria-label="Site"><a href="./">Lessons</a><a class="btn btn--primary" href="../">Open the app</a></nav></header>
`;
}
const foot = `<footer class="foot"><p><a href="../">Lab4Net</a> is a free, open-source CCNA lab simulator that runs in your browser: 77 hands-on labs with IOS-style consoles, live packet animations, troubleshooting incidents, practice exams and a sandbox.${DONATE ? ` If it helps you, you can <a href="${esc(DONATE)}" rel="noopener">support it here</a>.` : ''} Source on <a href="https://github.com/yasukeblk/Lab4Net" rel="noopener">GitHub</a>.</p><p>Lab4Net is an independent study tool. It is not affiliated with, endorsed by or sponsored by Cisco Systems, Inc. Cisco, Cisco IOS, CCNA and Catalyst are trademarks or registered trademarks of Cisco Systems, Inc.</p></footer>
</body>
</html>
`;
const tags = ids => ids.length ? `<ul class="tags" aria-label="CCNA 200-301 v1.1 objectives">${ids.map(id => `<li><b>CCNA ${esc(id)}</b>${esc(CCNA_OBJECTIVES[id] || '')}</li>`).join('')}</ul>` : '';

// ---- one lesson page ----
function lessonPage(p, i) {
  const { k, L, lab } = p, url = `${SITE}lessons/${p.slug}.html`;
  const first = text(L.sections[0][1]);
  const desc = clip(`${k}: ${first}`, 158);
  const title = `${k} · free CCNA lesson | Lab4Net`;
  const prev = pages[i - 1], next = pages[i + 1];
  const deep = lab ? `../?lab=${p.slug}` : `../?lesson=${p.slug}`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'LearningResource', name: k, headline: `${k}: ${L.name}`, description: desc, url, inLanguage: 'en', educationalLevel: 'Beginner', learningResourceType: 'Lesson', timeRequired: `PT${L.mins || 8}M`, isAccessibleForFree: true, license: 'https://opensource.org/licenses/MIT', teaches: p.ccna.map(id => `CCNA 200-301 ${id}: ${CCNA_OBJECTIVES[id] || ''}`), isPartOf: { '@type': 'WebSite', name: 'Lab4Net', url: SITE } };
  let b = head({ title, desc, url, jsonld });
  b += `<main class="lesson">
<p class="crumbs"><a href="./">CCNA lessons</a> › ${esc(p.group)}</p>
<p class="meta">${L.topic ? 'Exam topic lesson' : 'Lab lesson'} · ${L.mins || 8} min read</p>
<h1>${esc(k)}</h1>
<p class="sub">${esc(L.name)}</p>
${tags(p.ccna)}
${lab ? diagram(lab) : ''}
${L.sections.map(([h, body]) => `<section><h2>${esc(h)}</h2>${body}</section>`).join('\n')}
${L.story && L.story.length ? `<section class="story"><h2>See it happen</h2><p>In the app, these steps play out as packets moving across the lab's map.</p><ol>${L.story.map(s => `<li><b>${esc(s.t)}</b> ${s.x}</li>`).join('')}</ol></section>` : ''}
${L.terms && L.terms.length ? `<section><h2>Key terms</h2><dl class="terms">${L.terms.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl></section>` : ''}
${L.exam && L.exam.length ? `<section class="note"><h2>For the exam</h2><ul>${L.exam.map(x => `<li>${x}</li>`).join('')}</ul></section>` : ''}
${L.mistakes && L.mistakes.length ? `<section class="note note--warn"><h2>Common mistakes</h2><ul>${L.mistakes.map(x => `<li>${x}</li>`).join('')}</ul></section>` : ''}
${L.quiz && L.quiz.length ? `<section class="quiz"><h2>Quick check</h2>${L.quiz.map(([q, opts, ok, why], n) => `<div class="q"><p><b>${n + 1}.</b> ${q}</p><ol type="A">${opts.map(o => `<li>${o}</li>`).join('')}</ol><details><summary>Show the answer</summary><p><b>${String.fromCharCode(65 + ok)}. ${opts[ok]}</b></p><p>${why}</p></details></div>`).join('')}</section>` : ''}
<section class="cta"><h2>Practise it</h2><p>${lab ? `Build it yourself in the <b>${esc(k)}</b> lab: an IOS-style console on every device, a "why" for every step, and grading that checks whether your network actually works.` : 'Open this lesson inside Lab4Net, then put it into practice in the hands-on labs.'}</p><p><a class="btn btn--primary" href="${deep}">${lab ? `Open the ${esc(k)} lab` : 'Open this lesson in Lab4Net'}</a></p></section>
<nav class="pn" aria-label="Previous and next lesson">${prev ? `<a href="${prev.slug}.html"><small>Previous</small>${esc(prev.k)}</a>` : '<span></span>'}${next ? `<a class="next" href="${next.slug}.html"><small>Next</small>${esc(next.k)}</a>` : '<span></span>'}</nav>
</main>
`;
  return b + foot;
}

// ---- the lessons index: grouped by CCNA domain, as list rows ----
function indexPage() {
  const url = `${SITE}lessons/`;
  const desc = `${pages.length} free CCNA 200-301 lessons in plain language: VLANs, OSPF, ACLs, NAT, DHCP, IPv6, STP, wireless and more, with exam notes and a quick check.`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Free CCNA lessons', description: desc, url, isPartOf: { '@type': 'WebSite', name: 'Lab4Net', url: SITE }, hasPart: pages.map(p => ({ '@type': 'LearningResource', name: p.k, url: `${SITE}lessons/${p.slug}.html` })) };
  let b = head({ title: 'Free CCNA lessons: every exam topic in plain language | Lab4Net', desc, url, jsonld });
  const row = p => `<li><a href="${p.slug}.html"><b>${esc(p.k)}</b><span>${esc(p.L.name)}</span><small>${p.L.topic ? 'Exam topic' : 'Lab lesson'} · ${p.L.mins || 8} min · CCNA ${p.ccna.map(esc).join(', ')}</small></a></li>`;
  b += `<main class="index">
<p class="meta">Free · no sign-up</p>
<h1>CCNA lessons</h1>
<p class="lede">${pages.length} lessons that teach each CCNA 200-301 topic in plain language: what problem it solves, how it works, and how to configure and verify it. Every lesson ends with exam notes, common mistakes and a quick check. Lab lessons link to a hands-on lab in <a href="../">Lab4Net</a>, where you type the commands on simulated routers and switches and get graded on whether the network works.</p>
${CCNA_DOMAINS.map(([id, name]) => { const ps = pages.filter(p => p.ccna.some(c => c.split('.')[0] === id)); return ps.length ? `<section><h2>${esc(id)}. ${esc(name)}</h2><ul class="rows">${ps.map(row).join('')}</ul></section>` : ''; }).join('\n')}
</main>
`;
  return b + foot;
}

// ---- styles: the app's tokens; the theme follows the visitor's system setting ----
const tokLight = n => { const m = new RegExp('--' + n + ':\\s*([^;]+);').exec(lightBlock); return m ? m[1].trim() : tok(n); };
const COLORS = ['bg-app', 'bg-surface', 'bg-raised', 'bg-hover', 'bg-console', 'border-subtle', 'border', 'border-control', 'text', 'text-2', 'text-3', 'text-console', 'accent', 'accent-solid', 'accent-on', 'accent-soft', 'ok', 'bad', 'warn'];
const vars = get => COLORS.map(n => `--${n}:${get(n)};`).join('');
const css = `${fonts.map(f => `@font-face{font-family:"${f.fam}";font-weight:${f.w};font-style:${f.st};font-display:swap;src:url(fonts/${f.file}) format("woff2")}`).join('\n')}
:root{${vars(tok)}color-scheme:dark;--ui:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"JetBrains Mono",ui-monospace,Consolas,Menlo,monospace}
@media (prefers-color-scheme:light){:root{${vars(tokLight)}color-scheme:light}}
*,*::before,*::after{box-sizing:border-box}
html{background:var(--bg-app);-webkit-text-size-adjust:100%}
body{margin:0;color:var(--text);background:var(--bg-surface);font:400 16px/26px var(--ui);-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-underline-offset:2px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 20px;border-bottom:1px solid var(--border-subtle);background:var(--bg-app)}
.brand{display:flex;align-items:center;gap:8px;font-weight:600;font-size:16px;letter-spacing:-.02em;color:var(--text);text-decoration:none}
.mark{width:22px;height:22px}.mark__tile{fill:var(--accent-solid)}
.bar nav{display:flex;gap:16px;align-items:center;font-size:14px;font-weight:500}
.bar nav a{color:var(--text-2);text-decoration:none}.bar nav a:hover{color:var(--text)}
.btn{display:inline-flex;align-items:center;height:32px;padding:0 14px;border-radius:6px;font:500 14px/1 var(--ui);text-decoration:none;border:1px solid var(--border-control);color:var(--text)}
.btn--primary,.bar nav a.btn--primary{background:var(--accent-solid);border-color:var(--accent-solid);color:var(--accent-on)}
.btn--primary:hover{filter:brightness(1.08)}
main{max-width:680px;margin:0 auto;padding:32px 20px 16px}
main.index{max-width:760px}
.crumbs,.meta{font-size:13px;line-height:20px;color:var(--text-2);margin:0 0 8px}
h1{font-size:28px;line-height:36px;letter-spacing:-.012em;font-weight:600;margin:4px 0 6px}
.sub,.lede{font-size:18px;line-height:28px;color:var(--text-2);margin:0 0 16px}
h2{font-size:18px;line-height:26px;letter-spacing:-.012em;font-weight:600;margin:36px 0 10px}
p,li,dd{color:var(--text)}
code{font:400 13px var(--mono);background:var(--bg-hover);border-radius:4px;padding:1px 4px}
pre{font:400 13px/20px var(--mono);background:var(--bg-console);color:var(--text-console);padding:12px;border-radius:6px;overflow-x:auto}
pre code{background:none;padding:0}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:4px 8px;border-bottom:1px solid var(--border-subtle)}
.tags{display:flex;flex-wrap:wrap;gap:6px;list-style:none;padding:0;margin:0 0 8px}
.tags li{font-size:12px;line-height:18px;color:var(--text-2);border:1px solid var(--border);border-radius:4px;padding:1px 8px}
.tags b{font:500 11px var(--mono);color:var(--text-2);margin-right:6px}
.topo{margin:20px 0 4px;border:1px solid var(--border-subtle);border-radius:8px;padding:12px;background:var(--bg-surface)}
.topo svg{display:block;width:100%;height:auto;max-height:260px}
.topo .wires line{stroke:var(--text-3);stroke-width:1.5}
.topo .dev use{fill:none;stroke:var(--text-2);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;--node-fill:var(--bg-raised)}
.topo text{font:500 12px var(--ui);fill:var(--text-2);text-anchor:middle}
.topo figcaption{font-size:13px;color:var(--text-2);text-align:center;margin-top:4px}
.story ol{padding-left:22px}.story li+li{margin-top:6px}
.terms dt{font-weight:600;margin-top:10px}.terms dd{margin:2px 0 0;color:var(--text-2)}
.note{border:1px solid var(--border);border-left:2px solid var(--accent);border-radius:6px;padding:2px 16px 8px;margin-top:24px}
.note--warn{border-left-color:var(--warn)}.note h2{margin-top:12px;font-size:16px}
.q{border:1px solid var(--border-subtle);border-radius:8px;padding:4px 16px 10px;margin:12px 0}
details summary{cursor:pointer;color:var(--accent);font-weight:500;font-size:14px}
.cta{margin:36px 0 8px;padding:4px 20px 16px;border:1px solid var(--border);border-radius:8px;background:var(--bg-raised)}
.pn{display:flex;justify-content:space-between;gap:16px;margin:32px 0 0;padding-top:20px;border-top:1px solid var(--border-subtle)}
.pn a{font-size:14px;text-decoration:none;max-width:48%}.pn a.next{text-align:right;margin-left:auto}
.pn small{display:block;font-size:12px;color:var(--text-2)}
.rows{list-style:none;padding:0;margin:0}
.rows a{display:flex;flex-direction:column;gap:2px;padding:8px 12px;border-radius:6px;text-decoration:none;color:var(--text)}
.rows a:hover{background:var(--bg-hover)}
.rows b{font-weight:500}.rows span{font-size:14px;color:var(--text-2)}.rows small{font-size:12px;color:var(--text-2)}
.foot{max-width:760px;margin:32px auto 0;padding:20px;border-top:1px solid var(--border-subtle);font-size:13px;line-height:20px;color:var(--text-2)}
.foot p{color:var(--text-2)}
@media(max-width:560px){.bar{padding:8px 16px}.bar nav{gap:12px}main{padding:20px 16px}h1{font-size:24px;line-height:32px}.sub,.lede{font-size:16px;line-height:24px}}
`;

// ---- sitemap: the app plus every lesson page; lastmod from the lesson content so it only changes when a page does ----
const today = new Date().toISOString().slice(0, 10);
const prevMap = fs.existsSync(path.join(ROOT, 'sitemap.xml')) ? fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8') : '';
const prevLast = {}; for (const m of prevMap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) prevLast[m[1]] = m[2];
const prevPage = rel => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return null; } };

// ---- write (or check) everything ----
module.exports = { slug, pages, LABS, LESSONS };
if (require.main === module) {
const out = new Map();
out.set('lessons/site.css', css);
for (const f of fonts) out.set('lessons/fonts/' + f.file, f.data);
out.set('lessons/index.html', indexPage());
pages.forEach((p, i) => out.set(`lessons/${p.slug}.html`, lessonPage(p, i)));
const urls = [[SITE, null], [`${SITE}lessons/`, 'lessons/index.html'], ...pages.map(p => [`${SITE}lessons/${p.slug}.html`, `lessons/${p.slug}.html`])];
const lastmod = (u, rel) => { if (!rel) return prevLast[u] || today; const now = out.get(rel), was = prevPage(rel); return was === now && prevLast[u] ? prevLast[u] : (CHECK ? (prevLast[u] || today) : today); };
out.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, rel]) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${lastmod(u, rel)}</lastmod>\n  </url>`).join('\n')}\n</urlset>\n`);

let stale = [];
const want = new Set(out.keys());
const existing = fs.existsSync(path.join(ROOT, 'lessons')) ? fs.readdirSync(path.join(ROOT, 'lessons'), { recursive: true }).map(f => 'lessons/' + String(f).split(path.sep).join('/')).filter(f => fs.statSync(path.join(ROOT, f)).isFile()) : [];
const extra = existing.filter(f => !want.has(f));
for (const [rel, data] of out) {
  const file = path.join(ROOT, rel), cur = fs.existsSync(file) ? fs.readFileSync(file) : null;
  const same = cur && Buffer.compare(cur, Buffer.isBuffer(data) ? data : Buffer.from(data)) === 0;
  if (same) continue;
  if (rel === 'sitemap.xml' && CHECK && cur && cur.toString().replace(/<lastmod>[^<]+<\/lastmod>/g, '') === data.replace(/<lastmod>[^<]+<\/lastmod>/g, '')) continue;
  stale.push(rel);
  if (!CHECK) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); }
}
if (!CHECK) for (const f of extra) fs.unlinkSync(path.join(ROOT, f));
if (CHECK) {
  const bad = [...stale, ...extra.map(f => f + ' (should not exist)')];
  if (bad.length) { console.error('Lesson pages are out of date. Run: node tools/build-site.cjs\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log(`lesson pages up to date: ${pages.length} lessons`);
} else console.log(`wrote ${stale.length} file(s), removed ${extra.length}; ${pages.length} lesson pages`);
}
