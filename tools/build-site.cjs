// Builds the public lesson pages from the lessons inside index.html, so the site and the app never drift apart.
//   node tools/build-site.cjs           write lessons/ and sitemap.xml
//   node tools/build-site.cjs --check   exit 1 if anything written would differ (used by tests/sitepages.cjs)
// Output: lessons/index.html, lessons/<slug>.html (one per lesson), lessons/site.css, lessons/fonts/*.woff2
// (the same fonts the app embeds, SIL Open Font License 1.1, see THIRD-PARTY-NOTICES.md) and sitemap.xml.
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

// ---- the lessons, in a stable order: lab lessons in lab order, then topic lessons in data order ----
const labOf = k => LABS.find(l => l.title === k);
const keys = Object.keys(LESSONS);
const ordered = [...keys.filter(k => !LESSONS[k].topic && labOf(k)).sort((a, b) => LABS.indexOf(labOf(a)) - LABS.indexOf(labOf(b))), ...keys.filter(k => LESSONS[k].topic)];
const pages = ordered.map(k => {
  const L = LESSONS[k], lab = L.topic ? null : labOf(k);
  return { k, L, lab, slug: slug(k), ccna: (L.topic ? L.ccna : lab.ccna) || [], group: L.topic ? 'Exam topic' : lab.group };
});
const bySlug = new Set();
for (const p of pages) { if (bySlug.has(p.slug)) throw Error('Duplicate lesson slug ' + p.slug); bySlug.add(p.slug); }

// ---- fonts: the app's own embedded fonts, written as files ----
const fonts = [];
for (const m of html.matchAll(/@font-face\{font-family:"([^"]+)";font-weight:(\d+);font-style:(\w+);[^}]*?base64,([A-Za-z0-9+/=]+)\)/g)) {
  const [, fam, w, st, b64] = m;
  fonts.push({ fam, w, st, file: slug(fam) + '-' + w + (st === 'italic' ? 'i' : '') + '.woff2', data: Buffer.from(b64, 'base64') });
}
const rootVars = /:root\{[^}]+\}/.exec(html)[0].replace(/\s*box-sizing:[^;]+;[^}]*/, '');

// ---- topology diagram for a lab, drawn from its real build and map positions ----
function diagram(lab) {
  const net = lab.build(), P = lab.pos || {}, devs = Object.values(net.devs).filter(d => P[d.name]);
  if (!devs.length) return '';
  const xs = devs.map(d => P[d.name][0]), ys = devs.map(d => P[d.name][1]);
  const x0 = Math.min(...xs) - 50, x1 = Math.max(...xs) + 50, y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 46;
  const icon = d => {
    const [x, y] = P[d.name], n = esc(d.hostname || d.name);
    const kind = d.type === 'router' ? 'router' : d.type === 'switch' ? (d.l3 ? 'l3' : 'switch') : d.services ? 'server' : d.phone ? 'phone' : 'pc';
    const shape = {
      router: `<rect x="${x - 22}" y="${y - 13}" width="44" height="26" rx="13" class="t-router"/>`,
      switch: `<rect x="${x - 24}" y="${y - 11}" width="48" height="22" rx="5" class="t-switch"/>`,
      l3: `<rect x="${x - 24}" y="${y - 11}" width="48" height="22" rx="5" class="t-l3"/>`,
      server: `<rect x="${x - 13}" y="${y - 18}" width="26" height="36" rx="4" class="t-server"/>`,
      phone: `<rect x="${x - 15}" y="${y - 12}" width="30" height="24" rx="6" class="t-phone"/>`,
      pc: `<rect x="${x - 18}" y="${y - 14}" width="36" height="26" rx="4" class="t-pc"/><rect x="${x - 8}" y="${y + 13}" width="16" height="4" class="t-pc"/>`
    }[kind];
    return `<g>${shape}<text x="${x}" y="${y + 34}">${n}</text></g>`;
  };
  const wires = net.links.filter(l => P[l.a] && P[l.b]).map(l => `<line x1="${P[l.a][0]}" y1="${P[l.a][1]}" x2="${P[l.b][0]}" y2="${P[l.b][1]}"/>`).join('');
  return `<figure class="topo"><svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" role="img" aria-label="Network diagram for the ${esc(lab.title)} lab: ${devs.map(d => esc(d.name)).join(', ')}"><g class="wires">${wires}</g>${devs.map(icon).join('')}</svg><figcaption>The ${esc(lab.title)} lab's network</figcaption></figure>`;
}

// ---- shared page parts ----
const counterJs = COUNTER ? `<script>(function(){if(location.hostname!==${JSON.stringify(HOST)}||navigator.doNotTrack==='1'||window.doNotTrack==='1')return;try{var i=new Image();i.src='https://${COUNTER}.goatcounter.com/count?p='+encodeURIComponent(location.pathname.replace(/^\\/Lab4Net/,''))+'&t='+encodeURIComponent(document.title)+(document.referrer?'&r='+encodeURIComponent(document.referrer):'')+'&rnd='+Math.random().toString(36).slice(2);}catch(e){}})();</script>` : '';
const logo = `<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path class="w" d="M7 5h2v3H7zM3 8h10v1H3zM3 9h1v2H3zM12 9h1v2h-1zM6 2h4v3H6zM2 11h3v3H2zM11 11h3v3h-3z"/><path class="l" d="M7 3h2v1H7z"/></svg>`;
const icon = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Crect width='16' height='16' rx='3' fill='%230b0919'/%3E%3Cpath fill='%23ffd23f' d='M7 5h2v3H7zM3 8h10v1H3zM3 9h1v2H3zM12 9h1v2h-1zM6 2h4v3H6zM2 11h3v3H2zM11 11h3v3h-3z'/%3E%3Cpath fill='%23ff3d81' d='M7 3h2v1H7z'/%3E%3C/svg%3E">`;
function head({ title, desc, url, jsonld }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0b0919">
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
<header class="bar"><a class="brand" href="../">${logo}Lab4Net</a><nav><a href="./">All lessons</a><a class="go" href="../">Open the lab ▶</a></nav></header>
`;
}
const foot = `<footer class="foot"><p><a href="../">Lab4Net</a> is a free, open-source CCNA lab simulator that runs in your browser: 77 hands-on labs with IOS-style consoles, live packet animations, troubleshooting incidents, an exam simulator and a campaign.${DONATE ? ` If it helps you, you can <a href="${esc(DONATE)}" rel="noopener">support it here</a>.` : ''} Source on <a href="https://github.com/yasukeblk/Lab4Net">GitHub</a>, MIT licence.</p><p>Lab4Net is an independent study tool and is not affiliated with, endorsed by or sponsored by Cisco Systems, Inc. Cisco, Cisco IOS and CCNA are trademarks of Cisco Systems, Inc. Lessons describe the CCNA 200-301 v1.1 exam topics as the simulator teaches them; when in doubt, trust Cisco's documentation and real equipment.</p></footer>
</body>
</html>
`;
const tags = ids => ids.length ? `<ul class="tags" aria-label="CCNA 200-301 v1.1 objectives">${ids.map(id => `<li><b>${esc(id)}</b>${esc(CCNA_OBJECTIVES[id] || '')}</li>`).join('')}</ul>` : '';

// ---- one lesson page ----
function lessonPage(p, i) {
  const { k, L, lab } = p, url = `${SITE}lessons/${p.slug}.html`;
  const first = text(L.sections[0][1]);
  const desc = clip(`${k}: ${first}`, 158);
  const title = `${k} · free CCNA lesson | Lab4Net`;
  const prev = pages[i - 1], next = pages[i + 1];
  const deep = lab ? `../?lab=${p.slug}` : `../?lesson=${p.slug}`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'LearningResource', name: k, headline: `${k}: ${L.name}`, description: desc, url, inLanguage: 'en', educationalLevel: 'Beginner', learningResourceType: 'Lesson', timeRequired: `PT${L.mins || 8}M`, isAccessibleForFree: true, license: 'https://opensource.org/licenses/MIT', teaches: p.ccna.map(id => `CCNA 200-301 ${id}: ${CCNA_OBJECTIVES[id] || ''}`), isPartOf: { '@type': 'WebSite', name: 'Lab4Net', url: SITE }, provider: { '@type': 'Organization', name: 'Lab4Net', url: SITE } };
  let b = head({ title, desc, url, jsonld });
  b += `<main class="lesson">
<p class="crumbs"><a href="./">CCNA lessons</a> › ${esc(p.group)}</p>
<p class="eyebrow">${L.topic ? 'Exam topic lesson' : 'Lab lesson'} <span>${L.mins || 8} min read</span></p>
<h1>${esc(k)}</h1>
<p class="sub">${esc(L.name)}</p>
${tags(p.ccna)}
${lab ? diagram(lab) : ''}
${L.sections.map(([h, body]) => `<section><h2>${esc(h)}</h2>${body}</section>`).join('\n')}
${L.story && L.story.length ? `<section class="story"><h2>See it happen</h2><p>In the app, these steps play out as packets moving across the lab's map.</p><ol>${L.story.map(s => `<li><b>${esc(s.t)}</b> ${s.x}</li>`).join('')}</ol></section>` : ''}
<section class="cta"><h2>${lab ? 'Practise it' : 'Try it in the lab'}</h2><p>${lab ? `Build it yourself in the <b>${esc(k)}</b> lab: an IOS-style console on every device, a "why" for every step, and grading that checks whether your network actually works.` : 'Open this lesson inside Lab4Net, then put it into practice in the hands-on labs.'}</p><p><a class="btn" href="${deep}">${lab ? `Open the ${esc(k)} lab ▶` : 'Open in Lab4Net ▶'}</a></p></section>
${L.terms && L.terms.length ? `<section><h2>Key terms</h2><dl class="terms">${L.terms.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl></section>` : ''}
${L.exam && L.exam.length ? `<section><h2>For the exam</h2><ul>${L.exam.map(x => `<li>${x}</li>`).join('')}</ul></section>` : ''}
${L.mistakes && L.mistakes.length ? `<section><h2>Common mistakes</h2><ul>${L.mistakes.map(x => `<li>${x}</li>`).join('')}</ul></section>` : ''}
${L.quiz && L.quiz.length ? `<section class="quiz"><h2>Quick check</h2>${L.quiz.map(([q, opts, ok, why], n) => `<div class="q"><p><b>${n + 1}.</b> ${q}</p><ol type="A">${opts.map(o => `<li>${o}</li>`).join('')}</ol><details><summary>Show the answer</summary><p><b>${String.fromCharCode(65 + ok)}. ${opts[ok]}</b></p><p>${why}</p></details></div>`).join('')}</section>` : ''}
<nav class="pn">${prev ? `<a href="${prev.slug}.html">‹ ${esc(prev.k)}</a>` : '<span></span>'}${next ? `<a href="${next.slug}.html">${esc(next.k)} ›</a>` : '<span></span>'}</nav>
</main>
`;
  return b + foot;
}

// ---- the lessons index ----
function indexPage() {
  const url = `${SITE}lessons/`;
  const desc = `${pages.length} free CCNA 200-301 lessons in plain language: VLANs, OSPF, ACLs, NAT, DHCP, IPv6, STP, wireless and more, with exam notes and a quick check.`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Free CCNA lessons', description: desc, url, isPartOf: { '@type': 'WebSite', name: 'Lab4Net', url: SITE }, hasPart: pages.map(p => ({ '@type': 'LearningResource', name: p.k, url: `${SITE}lessons/${p.slug}.html` })) };
  let b = head({ title: 'Free CCNA lessons: every exam topic in plain language | Lab4Net', desc, url, jsonld });
  const card = p => `<li><a href="${p.slug}.html"><b>${esc(p.k)}</b><i>${esc(p.L.name)}</i><span>${p.L.topic ? 'Exam topic' : 'Lab lesson'} · ${p.L.mins || 8} min · CCNA ${p.ccna.map(esc).join(', ')}</span></a></li>`;
  b += `<main class="index">
<p class="eyebrow">Free · no sign-up</p>
<h1>CCNA lessons</h1>
<p class="lede">${pages.length} lessons that teach each CCNA 200-301 topic in plain language: what problem it solves, how it works, and how to configure and verify it. Every lesson ends with exam notes, common mistakes and a quick check. Lab lessons link to a hands-on lab in <a href="../">Lab4Net</a>, where you type the commands on simulated routers and switches and get graded on whether the network works.</p>
${CCNA_DOMAINS.map(([id, name]) => { const ps = pages.filter(p => p.ccna.some(c => c.split('.')[0] === id)); return ps.length ? `<section><h2>${esc(id)}. ${esc(name)}</h2><ul class="cards">${ps.map(card).join('')}</ul></section>` : ''; }).join('\n')}
</main>
`;
  return b + foot;
}

// ---- styles ----
const css = `${fonts.map(f => `@font-face{font-family:"${f.fam}";font-weight:${f.w};font-style:${f.st};font-display:swap;src:url(fonts/${f.file}) format("woff2")}`).join('\n')}
${rootVars}
*,*::before,*::after{box-sizing:border-box}
html{background:var(--night)}
body{margin:0;color:var(--ink);font:400 17px/1.65 var(--ui);background:radial-gradient(ellipse 70% 40% at 80% 0%,rgba(162,59,255,.22),transparent 70%),var(--night)}
a{color:var(--cy);text-underline-offset:3px}a:hover{color:#fff}
:focus-visible{outline:3px solid var(--cy);outline-offset:2px}
.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 20px;background:linear-gradient(#241b52,#140f30);border-bottom:3px solid var(--line);box-shadow:0 2px 0 var(--mag)}
.brand{display:flex;align-items:center;gap:8px;font:italic 800 26px/1 var(--px);text-transform:uppercase;color:var(--yel);text-decoration:none}
.brand svg{width:24px;height:24px}.brand .w{fill:var(--yel)}.brand .l{fill:var(--mag)}
.bar nav{display:flex;gap:16px;align-items:center;font:italic 800 17px var(--px);text-transform:uppercase;letter-spacing:.04em}
.bar nav a{color:var(--ink);text-decoration:none}.bar nav a:hover{color:var(--yel)}
.bar .go,.btn{display:inline-block;color:#1a1000;background:linear-gradient(#ffe27a,var(--yel) 45%,var(--org));border:3px solid var(--line);border-radius:9px;padding:6px 16px;font:italic 800 18px/1.1 var(--px);text-transform:uppercase;letter-spacing:.04em;text-decoration:none;box-shadow:0 3px 0 #7a3b00,0 6px 14px rgba(0,0,0,.4)}
.bar .go:hover,.btn:hover{color:#1a1000;filter:brightness(1.08)}
main{max-width:820px;margin:0 auto;padding:28px 20px 10px}
main.index{max-width:1100px}
.crumbs{font-size:14px;color:var(--muted);margin:0 0 10px}
.eyebrow{font:italic 800 17px var(--px);letter-spacing:.08em;text-transform:uppercase;color:var(--yel);margin:0}
.eyebrow span{margin-left:10px;color:var(--cy)}
h1{font:italic 800 clamp(34px,5vw,52px)/1.02 var(--px);text-transform:uppercase;letter-spacing:.02em;margin:6px 0 8px;color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.5)}
.sub{font-size:20px;color:var(--ink);margin:0 0 16px}
h2{font:italic 800 26px/1.1 var(--px);text-transform:uppercase;letter-spacing:.03em;color:var(--cy);margin:34px 0 10px}
p,li,dd{color:#e2ddf8}
code{font:400 19px var(--mono);color:var(--ph);background:#120e2b;border:1px solid #2b2260;border-radius:4px;padding:0 5px}
b{color:#fff}
.tags{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0 0 18px}
.tags li{font-size:13px;font-weight:600;color:#d9d3f5;background:#120e2b;border:2px solid var(--line);border-radius:6px;padding:3px 8px 3px 3px;box-shadow:0 0 0 1px rgba(46,230,255,.35)}
.tags b{font:italic 800 13px/1 var(--px);color:var(--night);background:var(--cy);border-radius:4px;padding:3px 5px;margin-right:6px}
.topo{margin:18px 0 6px;background:radial-gradient(ellipse 80% 70% at 50% 120%,rgba(255,61,129,.25),transparent 70%),#100c26;border:3px solid var(--line);border-radius:12px;padding:10px}
.topo svg{display:block;width:100%;height:auto;max-height:280px}
.topo figcaption{font-size:13px;color:var(--muted);text-align:center}
.topo .wires line{stroke:var(--go);stroke-width:3;stroke-dasharray:8 6}
.topo rect{stroke:var(--line);stroke-width:2.5}.t-router{fill:#2e7dff}.t-switch{fill:#c35dff}.t-l3{fill:#ff8a1f}.t-server{fill:#9aa4c7}.t-pc{fill:#5fd2ff}.t-phone{fill:#5cf08a}
.topo text{font:italic 800 15px var(--px);fill:#fff;text-anchor:middle}
.story ol,.quiz ol{padding-left:24px}.story li{margin-bottom:8px}
.cta{margin:30px 0;padding:6px 20px 16px;background:linear-gradient(var(--panel3),#231c52);border:3px solid var(--line);border-radius:12px;box-shadow:0 0 0 1px var(--yel),0 0 18px rgba(255,210,63,.2)}
.cta h2{color:var(--yel)}
.terms dt{font-weight:600;color:#fff;margin-top:10px}.terms dd{margin:2px 0 0 0}
.q{background:rgba(0,0,0,.22);border:2px solid #2b2260;border-radius:10px;padding:4px 16px 10px;margin:12px 0}
details summary{cursor:pointer;color:var(--cy);font-weight:600}
.pn{display:flex;justify-content:space-between;gap:16px;margin:36px 0 10px;flex-wrap:wrap}
.pn a{font:italic 800 18px var(--px);text-transform:uppercase;letter-spacing:.03em;text-decoration:none}
.lede{font-size:18px;max-width:820px}
.cards{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.cards a{display:block;height:100%;text-decoration:none;background:linear-gradient(var(--panel2),var(--panel));border:3px solid var(--line);border-radius:12px;padding:12px 14px;box-shadow:var(--lift)}
.cards a:hover{box-shadow:0 0 0 2px var(--yel),var(--lift)}
.cards b{display:block;font:italic 800 19px/1.15 var(--px);text-transform:uppercase;letter-spacing:.02em;color:var(--yel)}
.cards i{display:block;font-style:normal;font-size:14px;line-height:1.4;color:#e2ddf8;margin:4px 0}
.cards span{display:block;font-size:13px;line-height:1.45;color:var(--muted)}
.foot{max-width:1100px;margin:30px auto 0;padding:20px;border-top:2px solid #2b2260;font-size:13px;color:var(--muted)}
.foot p{color:var(--muted)}
@media(max-width:560px){body{font-size:16px}.bar{padding:8px 16px}.brand{font-size:22px}.bar nav{gap:12px;font-size:15px}.bar .go{font-size:15px;padding:4px 10px}main{padding:20px 16px}.topo text{font-size:20px}}
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
