// sim.js: the bridge to the simulator. Screens never call engine globals directly; everything goes through here.
// This file has no DOM.
(function (L4N) {
  'use strict';
  const slug = L4N.slug;
  const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);

  // ---- catalogue: labs and lessons by slug, with display IDs ----
  function catalogue() {
    const kindOf = l => l.capstone ? 'capstone' : l.kind === 'incident' ? 'incident' : 'build';
    // Display IDs (LAB-01, INC-01, CAP-01) count in Path order: the stages in CAMPAIGN order, the labs of each stage
    // in LABS order, then any lab in no stage. They are display only; nothing stores them.
    const stage = new Map((typeof CAMPAIGN !== 'undefined' ? CAMPAIGN : []).map((c, i) => [c.group, i]));
    const rank = l => stage.has(l.group) ? stage.get(l.group) : Infinity;
    const ids = new Map(), next = { build: 0, incident: 0, capstone: 0 }, PRE = { build: 'LAB-', incident: 'INC-', capstone: 'CAP-' };
    LABS.map((l, i) => i).sort((a, c) => (rank(LABS[a]) - rank(LABS[c])) || a - c)
      .forEach(i => { const k = kindOf(LABS[i]); ids.set(i, PRE[k] + String(++next[k]).padStart(2, '0')); });
    const labs = LABS.map((l, i) => {
      const kind = kindOf(l), idText = ids.get(i);
      // An incident shown on its own drops "Incident NN: " and starts with a capital, as a title should.
      // Display only: the title itself feeds the frozen slug and never changes.
      const short = kind === 'incident' ? capFirst(l.title.replace(/^Incident \d+:\s*/, '')) : l.title;
      return { slug: slug(l.title), title: l.title, short, idText, kind, group: l.group, index: i, lab: l };
    });
    const bySlug = new Map(labs.map(x => [x.slug, x]));
    const byTitle = new Map(labs.map(x => [x.title, x]));
    // Lessons in teaching order (LESSON_ORDER, by exam topic); any lesson not listed goes last, in data order.
    const ORDER = typeof LESSON_ORDER !== 'undefined' ? Object.keys(LESSON_ORDER).sort().flatMap(d => LESSON_ORDER[d]) : [];
    const lessonRank = s => { const r = ORDER.indexOf(s); return r < 0 ? Infinity : r; };
    const lessons = Object.keys(LESSONS).map((k, i) => {
      const L = LESSONS[k];
      // One heading everywhere: the lesson's title (the key, as on its web page), with its name as the line under it.
      return { slug: slug(k), key: k, title: k, name: L.name || '', topic: !!L.topic, mins: L.mins || 5, index: i, lesson: L, lab: L.topic ? null : bySlug.get(slug(k)) || null };
    }).sort((a, c) => (lessonRank(a.slug) - lessonRank(c.slug)) || a.index - c.index);
    const lessonBySlug = new Map(lessons.map(x => [x.slug, x]));
    return {
      labs, lessons,
      lab: s => bySlug.get(s) || null,
      labByTitle: t => byTitle.get(t) || null,
      lesson: s => lessonBySlug.get(s) || null,
      // the lesson that goes with a lab (an incident uses its base lab's lesson; capstones have none)
      lessonFor(entry) {
        if (!entry || entry.kind === 'capstone') return null;
        const key = entry.kind === 'incident' ? entry.lab.baseTitle : entry.title;
        return key ? lessonBySlug.get(slug(key)) || null : null;
      }
    };
  }

  // ---- running a lab ----
  const MAX_LINES = 2000, MAX_JOURNAL = 5000, MAX_LINE = 512;
  const MODE = { user: 'User EXEC', priv: 'Privileged EXEC', config: 'Global configuration', if: 'Interface configuration', vlan: 'VLAN configuration',
    line: 'Line configuration', ospf: 'OSPF configuration', acl: 'ACL configuration', dhcp: 'DHCP pool configuration', pc: 'Host console', answer: 'Answer' };

  // Which kind of device this is, for icons and tooltips.
  function devKind(d) {
    if (d.type === 'router') return 'router';
    if (d.type === 'switch') return d.l3 ? 'l3' : 'switch';
    if (d.phone) return 'phone';
    if (/^AP\d*$/i.test(d.name || '')) return 'ap';
    if (Array.isArray(d.services) && d.services.length) return 'server';
    return 'pc';
  }
  const KIND_NAME = { router: 'router', switch: 'switch', l3: 'Layer 3 switch', pc: 'PC', server: 'server', phone: 'IP phone', ap: 'access point' };

  // The colour of a console line: the old lineClass rules, plus syslog messages shown dim.
  const SYSLOG = /^(\*?[A-Z][a-z]{2} +\d+ [\d:.]+: )?%[A-Z0-9_]+-\d-[A-Z0-9_]+:/;
  function lineClass(l) {
    if (/^ *\^$/.test(l) || /is not recognized as an internal|^operable program or batch file\.$|^Error: unrecognized/.test(l)) return 'bad';
    if (/: ICMP: /.test(l)) return 'warn';
    if (/^[!.U]+$/.test(l) && l.length <= 70) return /^!+$/.test(l) ? 'ok' : /!/.test(l) ? 'warn' : 'bad';
    { const m = /^Success rate is (\d+) percent/.exec(l); if (m) return m[1] === '100' ? 'ok' : m[1] === '0' ? 'bad' : 'warn'; }
    if (/unreachable|General failure|!H|!A|could not find host/.test(l)) return 'bad';
    if (/^ {0,2}\d+ \*  \*/.test(l)) return 'warn';
    if (/changed state to up/.test(l)) return 'ok';
    if (/changed state to down/.test(l)) return 'warn';
    if (SYSLOG.test(l)) return 'log';
    if (/^%|refused|timed out|failed|^\.{5}$|rejected/i.test(l)) return 'bad';
    if (/^!{5}$|^Reply from|\[OK\]|works\.|^Open$|^Lease obtained|Trace complete/.test(l)) return 'ok';
    return '';
  }

  // A simulator bug must never leave the page half-updated or throw saved work away.
  function safeExec(net, d, s, line) {
    try { return execLine(net, d, s, line); }
    catch (e) {
      if (typeof console !== 'undefined') console.error('Lab4Net engine error on "' + line + '":', e);
      s.pace = null; if (s.prompt) s.prompt = null;
      return ['% Lab4Net internal error: ' + String(e && e.message || e).slice(0, 160), '% The command did not complete. The rest of the lab still works.'];
    }
  }

  function push(con, lines, cls) {
    for (const t of lines) con.lines.push({ t, c: cls != null ? cls : lineClass(t) });
    if (con.lines.length > MAX_LINES) con.lines.splice(0, con.lines.length - MAX_LINES);
  }

  function freshState(entry) {
    const lab = entry.lab, net = lab.build(), sess = {}, con = {};
    for (const n of Object.keys(net.devs)) {
      const d = net.devs[n];
      sess[n] = { mode: d.type === 'pc' ? 'pc' : 'user', ctx: null };
      con[n] = { lines: [], hist: [], hi: 0 };
      push(con[n], [d.type === 'pc' ? 'Host console · ipconfig, ping, tracert, telnet, ssh' : d.hostname + ' console ready', ''], 'dim');
    }
    const devs = Object.keys(net.devs);
    return { entry, lab, net, sess, con, journal: [], sel: net.devs[lab.start] ? lab.start : devs[0], devs };
  }

  // Run one line on one device: the same path for live commands and for replay.
  function step(st, dev, line) {
    const d = st.net.devs[dev], s = st.sess[dev], con = st.con[dev];
    TRACE = null;
    const pr = effPrompt(s), masked = !!(pr && pr.mask);
    const echo = promptOf(d, s) + (masked ? '' : line);
    const res = { echo, lines: [], pace: null, why: null, masked, ran: false, trace: null };
    if (line.trim() || pr) {
      res.ran = true;
      s.last = null; s.pace = null;
      const out = safeExec(st.net, d, s, line);
      if (out.length) { res.lines = out.join('\n').split('\n'); if (s.pace && res.lines.length === out.length) res.pace = s.pace; }
      s.pace = null;
      res.why = (s.last && typeof WHYC !== 'undefined' && WHYC[s.last]) || null;
    }
    res.trace = TRACE; TRACE = null;
    if (line.trim() && !masked) con.hist.push(line);
    if (con.hist.length > 200) con.hist.splice(0, con.hist.length - 200);
    con.hi = con.hist.length;
    return res;
  }

  // Move each device's own console messages (debug output) into its tab. `except` keeps one device's for later.
  function drain(st, except) {
    const changed = [];
    for (const n of st.devs) {
      const d = st.net.devs[n];
      if (!d.conq || !d.conq.length || n === except) continue;
      push(st.con[n], d.conq); d.conq = []; changed.push(n);
    }
    return changed;
  }

  // open(entry, saved) → state. Saved work is the command journal, replayed onto a fresh build() at the times it was typed.
  // Throws if the journal does not fit this lab; the caller then opens the lab fresh.
  function open(entry, saved) {
    const st = freshState(entry);
    const journal = saved && saved.journal ? saved.journal : [];
    if (!Array.isArray(journal) || journal.length > MAX_JOURNAL) throw Error('Invalid command history');
    try {
      for (const e of journal) {
        if (!e || !Object.prototype.hasOwnProperty.call(st.net.devs, e.device) || !L4N.validate.okLine(e.line)) throw Error('Invalid saved command');
        if (typeof e.t === 'number' && isFinite(e.t)) SIM_NOW = e.t;
        const r = step(st, e.device, e.line);
        push(st.con[e.device], [r.echo], 'cmd');
        push(st.con[e.device], r.lines);
        drain(st, null);
        st.journal.push(typeof e.t === 'number' ? { device: e.device, line: e.line, t: e.t } : { device: e.device, line: e.line });
      }
    } finally { SIM_NOW = null; }
    TRACE = null;
    return st;
  }

  // exec(st, device, line) → {echo, lines, pace, why, masked, ran, trace}. The caller shows the lines (or plays them).
  function exec(st, dev, line) {
    if (typeof line !== 'string' || line.length > MAX_LINE || /[\r\n]/.test(line)) return { error: 'Keep each command on one line, under 512 characters.' };
    if (st.journal.length >= MAX_JOURNAL) return { error: 'This lab has reached its saved command limit. Export a backup, then reset the lab.' };
    const r = step(st, dev, line);
    if (r.ran) st.journal.push({ device: dev, line, t: Date.now() });
    return r;
  }

  function prompt(st, dev) {
    const d = st.net.devs[dev], s = st.sess[dev], pr = effPrompt(s), es = effSess(s);
    const mode = pr ? 'answer' : es.mode;
    return { text: promptOf(d, s), masked: !!(pr && pr.mask), mode, modeName: MODE[mode] || mode, asking: !!pr };
  }

  // `?` help: the lines IOS prints (the prompt and line with ?, then keyword and description). null during a question.
  function help(st, dev, line) {
    const s0 = st.sess[dev];
    if (effPrompt(s0)) return null;
    const [d, s] = effPair(st.net.devs[dev], s0);
    const c = candidates(d, s.mode, line), w = Math.max(0, ...c.map(x => x.length));
    return [promptOf(d, s) + line + '?'].concat(c.length ? c.map(x => ('  ' + x.padEnd(w + 2) + (s.mode === 'pc' ? '' : (typeof KWHELP !== 'undefined' && KWHELP[x]) || '')).trimEnd()) : ['% Unrecognized command']);
  }

  // Tab: complete the word when exactly one keyword fits; otherwise null (nothing changes, as on IOS).
  function complete(st, dev, line) {
    const s0 = st.sess[dev];
    if (effPrompt(s0)) return null;
    const [d, s] = effPair(st.net.devs[dev], s0);
    if (/\s$/.test(line)) return null;
    const c = candidates(d, s.mode, line).filter(x => /^[a-z\/-]/.test(x));
    return c.length === 1 ? line.replace(/\S*$/, c[0] + ' ') : null;
  }

  // Ctrl+Z is IOS `end`: only in a configuration mode, never during a question or on a host.
  function canEnd(st, dev) {
    const s0 = st.sess[dev];
    if (effPrompt(s0)) return false;
    const [d, s] = effPair(st.net.devs[dev], s0);
    return d.type !== 'pc' && s.mode !== 'user' && s.mode !== 'priv' && s.mode !== 'pc';
  }

  function grade(st) {
    return st.lab.checks.map(([t, f]) => { let ok = false; try { ok = !!f(st.net); } catch (e) { ok = false; } return [t, ok]; });
  }

  function devices(st) {
    return st.devs.map(n => {
      const d = st.net.devs[n], ifs = Object.values(d.ifs);
      let up = 0; for (const i of ifs) { try { if (i.link && ifUp(st.net, d, i)) up++; } catch (e) {} }
      return { name: n, hostname: d.hostname, kind: devKind(d), kindName: KIND_NAME[devKind(d)], up, linked: ifs.filter(i => i.link).length };
    });
  }

  // ---- what the map needs ----
  const shortName = n => (typeof shortIf === 'function' ? shortIf(n) : n);
  const linkKey = l => l.a + '|' + l.ai + '|' + l.b + '|' + l.bi;
  function up(net, d, i) { try { return !!(i && ifUp(net, d, i)); } catch (e) { return false; } }

  // Spanning tree: every switch port blocked in some VLAN → [vlans]
  function blockedPorts(net) {
    const out = new Map();
    try {
      const vl = new Set();
      for (const d of Object.values(net.devs)) if (d.type === 'switch' && d.vlans) for (const v of Object.keys(d.vlans)) vl.add(+v);
      for (const v of vl) for (const k of stpBlocked(net, v)) { if (!out.has(k)) out.set(k, []); out.get(k).push(v); }
    } catch (e) {}
    return out;
  }

  // links(net) → [{key, a, ai, b, bi, up, ends: [{dev, ifn, short, errdis, blocked: [vlans] | null}]}]
  function links(net) {
    const blocked = blockedPorts(net);
    return net.links.map(l => {
      const A = net.devs[l.a], B = net.devs[l.b], u = up(net, A, A.ifs[l.ai]) && up(net, B, B.ifs[l.bi]);
      const end = (dev, ifn) => { const I = net.devs[dev].ifs[ifn]; return { dev, ifn, short: shortName(ifn), errdis: !!(I && I.errdis), blocked: blocked.get(dev + '|' + ifn) || null, host: net.devs[dev].type === 'pc' }; };
      return { key: linkKey(l), a: l.a, ai: l.ai, b: l.b, bi: l.bi, up: u, ends: [end(l.a, l.ai), end(l.b, l.bi)] };
    });
  }

  // describe(net, dev) → the device tooltip: hostname and kind, interfaces with state and address, one extra line
  function describe(net, dev) {
    const d = net.devs[dev];
    if (!d) return null;
    const kind = devKind(d);
    const ifs = Object.values(d.ifs).filter(i => i.link || i.ip != null).slice(0, 10).map(i => {
      const u = up(net, d, i);
      return { name: i.name, short: shortName(i.name), up: u, linked: !!i.link, addr: i.ip != null ? n2ip(i.ip) + '/' + i.len : '' };
    });
    let extra = '';
    try {
      if (isL3(d)) { const r = routes(net, d); extra = r.length + ' route' + (r.length === 1 ? '' : 's'); }
      else if (d.type === 'switch') { const v = Object.keys(d.vlans || {}).length; extra = v + ' VLAN' + (v === 1 ? '' : 's'); }
      else extra = 'Default gateway ' + (d.gw != null ? n2ip(d.gw) : 'not set');
    } catch (e) {}
    const linked = ifs.filter(i => i.linked);
    return { name: dev, hostname: d.hostname, kind, kindName: KIND_NAME[kind], ifs, extra, up: linked.filter(i => i.up).length, linked: linked.length, host: d.type === 'pc' };
  }

  const ip = n => n2ip(n);

  // ---- help content: steps, explanations, the command list ----
  const stepCache = new Map();
  // steps(lab) → per task: [{dev, lines: [{prompt, cmd} | {note}]}], with the prompt each command runs at
  function steps(lab) {
    if (!lab || !Array.isArray(lab.steps)) return [];
    if (!stepCache.has(lab)) {
      const keep = TRACE;
      let out;
      try { out = guideFor(lab); } catch (e) { out = lab.steps.map(t => t.map(g => ({ dev: g.dev, lines: g.cmds.map(c => c[0] === '#' ? { note: c.slice(1).trim() } : { prompt: '', cmd: c }) }))); }
      TRACE = keep;
      stepCache.set(lab, out);
    }
    return stepCache.get(lab);
  }
  // the explanation for one command (repo content; may hold <code>)
  function why(cmd) { try { return whyOf(String(cmd)) || ''; } catch (e) { return ''; } }

  // ---- tasks that tick themselves (TASK_CHECKS, src/data/task-checks.js) ----
  // A command that only looks; a move between modes; an answer to a prompt. Only looking commands are asked for.
  const LOOKS = /^\s*(do\s+)?(sh(o(w)?)?|ping|traceroute|tracert|ipconfig|ipv6config|arp|netstat|telnet|ssh|syslog)\b/i;
  const TESTS = /^\s*(do\s+)?(ping|traceroute|tracert|telnet|ssh)\b/i, SHOWS = /^\s*(do\s+)?sh(o(w)?)?\b/i;
  const MOVES = /^\s*(end|exit|enable|disable|conf(igure)?(\s+t(erminal)?)?|logout)\s*$/i;
  // Did the learner type this command? Each word may be shortened the way IOS allows ("sh ip ro"); more words are fine.
  function typed(line, want) {
    const a = String(line).trim().toLowerCase().split(/\s+/), b = String(want).trim().toLowerCase().split(/\s+/);
    if (a[0] === 'do') a.shift(); if (b[0] === 'do') b.shift();
    return a.length >= b.length && b.every((w, k) => a[k] === w || (a[k].length >= 2 && w.startsWith(a[k])));
  }
  // taskStatus(st, entry, fixedAt) → one value per task: true (done now), false (not yet), or null (ticked by hand).
  //  - a task linked to checks is done when they pass and, if its steps include looking commands (a ping, a show),
  //    those were run too, so "Ping PC2 from PC1" waits for the ping;
  //  - a 'run' task is done once its looking commands were run, each on its own device;
  //  - incidents: reproduce = a test was run; evidence = a show was run; restore = every check passes;
  //    retest = a test was run after the repair (fixedAt: the journal length when every check first passed).
  function taskStatus(st, entry, fixedAt) {
    const lab = entry.lab, J = st.journal || [];
    if (entry.kind === 'incident') {
      if (lab.tasks.length !== 4) return lab.tasks.map(() => null);
      const fixed = grade(st).every(r => r[1]), after = fixedAt == null ? -1 : fixedAt;
      return [J.some(e => TESTS.test(e.line)), J.some(e => SHOWS.test(e.line)), fixed, fixed && after >= 0 && J.slice(after).some(e => TESTS.test(e.line))];
    }
    const links = typeof TASK_CHECKS !== 'undefined' && TASK_CHECKS[entry.slug];
    if (!links || links.length !== lab.tasks.length) return lab.tasks.map(() => null);
    const res = links.some(e => Array.isArray(e) && e.length) ? grade(st) : [], all = steps(lab);
    const looksOf = i => (all[i] || []).flatMap(g => g.lines.filter(x => x.cmd && !/:\s*$/.test(x.prompt || '') && !MOVES.test(x.cmd) && LOOKS.test(x.cmd)).map(x => [g.dev, x.cmd]));
    // a command asked for again ("run show spanning-tree again") must be run again: as many times as the steps ask
    // for it up to this task
    const times = (dev, cmd) => J.filter(e => e.device === dev && typed(e.line, cmd)).length;
    const need = (i, dev, cmd) => { let n = 0; for (let k = 0; k <= i; k++) n += looksOf(k).filter(([d, c]) => d === dev && c === cmd).length; return n; };
    return links.map((e, i) => {
      const looks = looksOf(i);
      const looked = looks.every(([d, c]) => times(d, c) >= need(i, d, c));
      if (e === 'run') return looks.length ? looked : null;
      if (!Array.isArray(e) || !e.length) return null;
      return e.every(j => res[j] && res[j][1]) && looked;
    });
  }
  // the commands a device supports, in its current mode (or all modes), each with its explanation
  function commands(st, dev, allModes) {
    const [d, s] = effPair(st.net.devs[dev], st.sess[dev]);
    const out = [], seen = new Set();
    for (const c of CMDS) {
      if (c.types && !c.types.includes(d.type)) continue;
      if (!allModes && !c.modes.includes(s.mode)) continue;
      const pat = c.pat.join(' ');
      if (seen.has(pat)) continue; seen.add(pat);
      out.push({ pat, modes: c.modes.map(m => MODE[m] || m), why: (typeof WHYC !== 'undefined' && WHYC[pat]) || '' });
    }
    return out;
  }
  const CRLINE = typeof CR !== 'undefined' ? CR : '<cr>';

  // ---- the sandbox: device models, starter kits and goals (from the old sandbox) ----
  const SBX_KIND = { router: ['R', 'Router'], router5: ['R', 'Router, 5 ports'], switch: ['SW', 'Switch'], switch24: ['SW', 'Switch, 24 ports'], l3switch: ['DSW', 'Layer 3 switch'], pc: ['PC', 'PC'], srv: ['SRV', 'Server'] };
  function sbxDevice(d) {
    if (d.type === 'router' || d.type === 'router5') { const r = mkRouter(d.name); if (d.type === 'router5') { addIf(r, 'GigabitEthernet0/3', { shutdown: true }); addIf(r, 'GigabitEthernet0/4', { shutdown: true }); } return r; }
    if (d.type === 'l3switch') return mkL3Switch(d.name);
    if (d.type === 'switch' || d.type === 'switch24') { const w = mkSwitch(d.name); if (d.type === 'switch24') for (let i = 9; i <= 24; i++) addIf(w, 'FastEthernet0/' + i); return w; }
    const p = mkPC(d.name, null, 24); if (d.type === 'srv') p.services = [80]; return p;
  }
  // the sandbox as a lab, built from its definition
  function sandboxLab(def) {
    return { title: 'Sandbox', group: 'Sandbox', brief: '', addr: [], tasks: [], why: [], checks: [], solution: {}, steps: [], pos: {}, start: null, sandbox: true,
      build() { const net = mkNet(def().devs.map(sbxDevice)); for (const l of def().links) link(net, l.a, l.ai, l.b, l.bi); return net; } };
  }
  const PORT = /^(Fast|Gigabit)Ethernet[\d/]+$/;
  const portsOf = (st, dev) => { const d = st.net.devs[dev]; return d ? Object.values(d.ifs).filter(i => PORT.test(i.name)).sort((x, y) => x.name.localeCompare(y.name, 'en', { numeric: true })).map(i => ({ name: i.name, short: shortName(i.name), used: i.link ? i.link.dev + ' ' + shortName(i.link.ifn) : '' })) : []; };
  const normIf = n => { try { return parseIf(String(n)) || null; } catch (e) { return null; } };
  const SBX_KITS = SANDBOX.kits, SBX_GOALS = SANDBOX.goals;
  const goalState = (st, g) => SBX_GOALS[g] ? SBX_GOALS[g].goals.map(([t, f]) => { let ok = false; try { ok = !!f(st.net); } catch (e) {} return [t, ok]; }) : [];
  const sandbox = { KIND: SBX_KIND, KITS: SBX_KITS, GOALS: SBX_GOALS, lab: sandboxLab, ports: portsOf, normIf, goalState };


  // ---- the subnetting drill ----
  const subnet = {
    make(range) {
      const r = Math.random, len = range === 'warm' ? [24, 25, 26][Math.floor(r() * 3)] : range === 'small' ? [27, 28, 29, 30][Math.floor(r() * 4)] : 8 + Math.floor(r() * 23);
      let a = 1 + Math.floor(r() * 223); if (a === 127) a = 172;
      return { ip: (a * 16777216 + Math.floor(r() * 16777216)) >>> 0, len };
    },
    text: q => n2ip(q.ip) + '/' + q.len,
    // the six answers, in order: network, broadcast, first host, last host, mask, usable hosts
    answers(q) { const net = netOf(q.ip, q.len), bc = (net | ~lenMask(q.len)) >>> 0; return [n2ip(net), n2ip(bc), n2ip(net + 1), n2ip(bc - 1), n2ip(lenMask(q.len)), String(2 ** (32 - q.len) - 2)]; },
    // the worked reason: the block method (the old drill's words)
    why(q) {
      const m = lenMask(q.len), mask = n2ip(m);
      if (q.len % 8 === 0) return '/' + q.len + ' = ' + mask + '. The first ' + q.len / 8 + ' octets are network bits. Set all host bits to 0 for the network and to 1 for the broadcast. The usable hosts sit between them.';
      const k = Math.floor(q.len / 8), sh = 24 - 8 * k, oct = (m >>> sh) & 255, blk = 256 - oct, val = (q.ip >>> sh) & 255, start = Math.floor(val / blk) * blk;
      return '/' + q.len + ' = ' + mask + '. In octet ' + (k + 1) + ', block size = 256 − ' + oct + ' = ' + blk + '. ' + val + ' lies in the block starting at ' + start + '. Set later octets to 0 for the network. The broadcast is one address below the next block. Usable hosts = 2^' + (32 - q.len) + ' − 2 = ' + (2 ** (32 - q.len) - 2) + '.';
    }
  };

  // ---- the exam: the old makeExam rules (fault-find, build, incident, today's, a stage's three-fault check) ----
  function examMake(mode, seed, pool) {
    const rnd = seedRng(seed), inPool = e => !pool || pool.includes(e.slug);
    const builds = L4N.data.labs.filter(e => e.kind === 'build' && inPool(e)), incs = L4N.data.labs.filter(e => e.kind === 'incident' && inPool(e));
    let base = null, faults = null;
    if (mode === 'incident') base = rpick(rnd, incs) || null;
    else if (mode === 'lab') base = rpick(rnd, builds) || null;
    else if (mode === 'boss') {
      const order = shuffled(rnd, builds);
      for (const need of [3, 2]) { for (const b of order) { const f = examFault(b.lab, seed + '|' + b.lab.title, 3); if (f && f.length >= need) { base = b; faults = f; break; } } if (base) break; }
    } else for (const b of shuffled(rnd, builds)) { const want = mode === 'daily' ? 2 : (rnd() < 0.3 ? 2 : 1); const f = examFault(b.lab, seed + '|' + b.lab.title, want); if (f) { base = b; faults = f; break; } }
    if (!base) return null;
    const title = 'Exam · ' + base.title;
    const lab = faults ? examLab(base.lab, faults, title) : Object.assign({}, base.lab, { title, group: 'Exam', kind: 'exam', exam: true, baseTitle: base.title, why: [], steps: [] });
    return { base, faults: faults || [], lab };
  }
  L4N.sim = Object.assign(L4N.sim || {}, { catalogue, open, exec, prompt, help, complete, canEnd, grade, taskStatus, typedCommand: typed, drain, push, lineClass, devKind, devices, links, describe, linkKey, shortName, ip, steps, why, commands, CRLINE, subnet, examMake, sandbox, MODE, KIND_NAME, MAX_LINE, MAX_JOURNAL });
})(window.L4N = window.L4N || {});
