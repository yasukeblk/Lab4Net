// sim.js: the bridge to the simulator. Screens never call engine globals directly; everything goes through here.
// This file has no DOM.
(function (L4N) {
  'use strict';
  const slug = L4N.slug;

  // ---- catalogue: labs and lessons by slug, with display IDs ----
  function catalogue() {
    let b = 0, inc = 0, cap = 0;
    const labs = LABS.map((l, i) => {
      const kind = l.capstone ? 'capstone' : l.kind === 'incident' ? 'incident' : 'build';
      const idText = kind === 'capstone' ? 'CAP-' + String(++cap).padStart(2, '0') : kind === 'incident' ? 'INC-' + String(++inc).padStart(2, '0') : 'LAB-' + String(++b).padStart(2, '0');
      const short = kind === 'incident' ? l.title.replace(/^Incident \d+:\s*/, '') : l.title;
      return { slug: slug(l.title), title: l.title, short, idText, kind, group: l.group, index: i, lab: l };
    });
    const bySlug = new Map(labs.map(x => [x.slug, x]));
    const byTitle = new Map(labs.map(x => [x.title, x]));
    const lessons = Object.keys(LESSONS).map((k, i) => {
      const L = LESSONS[k];
      return { slug: slug(k), key: k, title: L.name || k, topic: !!L.topic, mins: L.mins || 5, index: i, lesson: L, lab: L.topic ? null : bySlug.get(slug(k)) || null };
    });
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
  L4N.sim = Object.assign(L4N.sim || {}, { catalogue, open, exec, prompt, help, complete, canEnd, grade, drain, push, lineClass, devKind, devices, links, describe, linkKey, shortName, ip, steps, why, commands, CRLINE, MODE, KIND_NAME, MAX_LINE, MAX_JOURNAL });
})(window.L4N = window.L4N || {});
