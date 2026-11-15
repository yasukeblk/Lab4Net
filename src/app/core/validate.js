// validate.js: everything read from storage, a backup file or another window is checked here before use.
// Each function builds a fresh object from known keys only, so odd values are dropped, never shown, and
// keys like "__proto__" can never reach Object.assign. No DOM.
(function (L4N) {
  'use strict';

  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const oneOf = (v, list, def) => list.indexOf(v) >= 0 ? v : def;
  const bool = (v, def) => typeof v === 'boolean' ? v : def;
  const num = (v, lo, hi, def) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? v : def;
  const int = (v, lo, hi, def) => Number.isInteger(v) && v >= lo && v <= hi ? v : def;
  const str = (v, max, def) => typeof v === 'string' && v.length <= max ? v : def;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const SAFE_KEY = k => typeof k === 'string' && k !== '__proto__' && k !== 'constructor' && k !== 'prototype';

  // Known slugs are filled in at boot from LABS and LESSONS.
  const known = { labs: new Set(), lessons: new Set() };

  const SETTINGS = { theme: 'dark', motion: 'auto', consoleTheme: 'match', pace: 'fast', guideDefault: false, sidebarInLabs: 'auto' };
  function settings(s) {
    s = isObj(s) ? s : {};
    return {
      theme: oneOf(s.theme, ['dark', 'light', 'system'], SETTINGS.theme),
      motion: oneOf(s.motion, ['auto', 'reduce'], SETTINGS.motion),
      consoleTheme: oneOf(s.consoleTheme, ['match', 'dark'], SETTINGS.consoleTheme),
      pace: oneOf(s.pace, ['real', 'fast', 'instant'], SETTINGS.pace),
      guideDefault: bool(s.guideDefault, SETTINGS.guideDefault),
      sidebarInLabs: oneOf(s.sidebarInLabs, ['auto', 'open'], SETTINGS.sidebarInLabs)
    };
  }

  const HINTS = ['stepTip', 'popTip'];
  function ui(u) {
    u = isObj(u) ? u : {};
    const panes = isObj(u.panes) ? u.panes : {};
    const out = {
      sidebar: oneOf(u.sidebar, ['open', 'rail'], 'open'),
      sidebarLab: oneOf(u.sidebarLab, ['open', 'rail', null], null),
      layout: oneOf(u.layout, ['stacked', 'side'], 'stacked'),
      panes: {},
      collapsed: {},
      lastLab: known.labs.has(u.lastLab) ? u.lastLab : null,
      recent: Array.isArray(u.recent) ? u.recent.filter(s => known.labs.has(s)).filter((s, i, a) => a.indexOf(s) === i).slice(0, 3) : [],
      landingSeen: bool(u.landingSeen, false),
      hints: {},
      seenLesson: {}
    };
    for (const lay of ['stacked', 'side']) {
      const p = isObj(panes[lay]) ? panes[lay] : {};
      out.panes[lay] = {};
      for (const k of ['tasks', 'map', 'console']) { const v = num(p[k], 0.05, 0.95, null); if (v != null) out.panes[lay][k] = v; }
    }
    const c = isObj(u.collapsed) ? u.collapsed : {};
    for (const k of ['tasks', 'map']) if (c[k] === true) out.collapsed[k] = true;
    const h = isObj(u.hints) ? u.hints : {};
    for (const k of HINTS) if (h[k] === true) out.hints[k] = true;
    const sl = isObj(u.seenLesson) ? u.seenLesson : {};
    for (const k of Object.keys(sl)) if (known.labs.has(k) && sl[k] === true) out.seenLesson[k] = true;
    return out;
  }

  // The whole lab4net:v2 document. Later phases add labs, lessons, quiz, subnet and exam checks here.
  function main(d) {
    d = isObj(d) ? d : {};
    const ext = L4N.validate.ext;
    return {
      v: 2,
      settings: settings(d.settings),
      labs: ext.labs ? ext.labs(d.labs) : {},
      lessons: ext.lessons ? ext.lessons(d.lessons) : {},
      quiz: ext.quiz ? ext.quiz(d.quiz) : { rev: 2, answers: {} },
      subnet: ext.subnet ? ext.subnet(d.subnet) : { right: 0, total: 0 },
      exam: ext.exam ? ext.exam(d.exam) : { current: null, history: [] },
      ui: ui(d.ui),
      migrated: ext.migrated ? ext.migrated(d.migrated) : null
    };
  }

  const GRADES = ['S', 'A', 'B', 'C', 'D'];
  const MAX_T = 1e14;

  function run(r) {
    if (!isObj(r)) return null;
    return { errs: int(r.errs, 0, 1e6, 0), checks: int(r.checks, 0, 1e6, 0), help: bool(r.help, false), walk: bool(r.walk, false),
      valid: bool(r.valid, true), done: bool(r.done, false), cmds: int(r.cmds, 0, 1e6, 0) };
  }

  // labs: {[slug]: {done, grade, doneAt, clues, guide, run}}
  function labs(m) {
    const out = {};
    if (!isObj(m)) return out;
    for (const k of Object.keys(m)) {
      if (!known.labs.has(k) || !isObj(m[k])) continue;
      const v = m[k];
      const e = { done: bool(v.done, false) };
      const g = oneOf(v.grade, GRADES, null); if (g) e.grade = g;
      const t = int(v.doneAt, 0, MAX_T, null); if (t != null) e.doneAt = t;
      const c = int(v.clues, 0, 3, 0); if (c) e.clues = c;
      if (typeof v.guide === 'boolean') e.guide = v.guide;
      const r = run(v.run); if (r) e.run = r;
      if (e.done || e.grade || e.clues || e.guide != null || e.run) out[k] = e;
    }
    return out;
  }

  const DEVICE = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
  const okLine = l => typeof l === 'string' && l.length <= 512 && !/[\r\n]/.test(l);
  // One lab's saved work. Anything odd marks it corrupt, so the lab opens fresh (with a toast) rather than half-replayed.
  function workEntry(w) {
    if (!isObj(w)) return null;
    const j = w.journal, tasks = Array.isArray(w.tasks) ? w.tasks.slice(0, 64).map(x => x === true) : [];
    if (!Array.isArray(j) || j.length > 5000) return { journal: [], tasks: [], corrupt: true };
    const journal = [];
    for (const e of j) {
      if (!isObj(e) || typeof e.device !== 'string' || !DEVICE.test(e.device) || !okLine(e.line)) return { journal: [], tasks: [], corrupt: true };
      const o = { device: e.device, line: e.line };
      if (typeof e.t === 'number' && isFinite(e.t) && e.t >= 0 && e.t < MAX_T) o.t = e.t;
      journal.push(o);
    }
    return { journal, tasks };
  }
  function work(m) {
    const out = {};
    if (!isObj(m)) return out;
    for (const k of Object.keys(m)) { if (!known.labs.has(k)) continue; const w = workEntry(m[k]); if (w) out[k] = w; }
    return out;
  }

  // lessons: {[slug]: {read, quiz: {index: bool}}}
  function lessons(m) {
    const out = {};
    if (!isObj(m)) return out;
    for (const k of Object.keys(m)) {
      if (!known.lessons.has(k) || !isObj(m[k])) continue;
      const v = m[k], e = { read: bool(v.read, false), quiz: {} };
      const at = int(v.readAt, 0, MAX_T, null); if (at != null && e.read) e.readAt = at;
      const max = known.lessonQuiz[k] || 0;
      if (isObj(v.quiz)) for (const i of Object.keys(v.quiz)) { const n = +i; if (Number.isInteger(n) && n >= 0 && n < max && typeof v.quiz[i] === 'boolean') e.quiz[n] = v.quiz[i]; }
      if (e.read || Object.keys(e.quiz).length) out[k] = e;
    }
    return out;
  }
  // quiz: {rev: 2, answers: {index: bool}} (answers are kept by question index; new questions only go at the end)
  function quiz(q) {
    const out = { rev: 2, answers: {} };
    if (!isObj(q) || !isObj(q.answers)) return out;
    for (const i of Object.keys(q.answers)) { const n = +i; if (Number.isInteger(n) && n >= 0 && n < known.quizCount && typeof q.answers[i] === 'boolean') out.answers[n] = q.answers[i]; }
    return out;
  }
  function subnet(s) {
    if (!isObj(s)) return { right: 0, total: 0 };
    const total = int(s.total, 0, 1e7, 0), right = int(s.right, 0, total, 0);
    return { right, total };
  }
  function migrated(m) {
    if (!isObj(m)) return null;
    return { from: oneOf(m.from, ['v1', 'none', 'reset'], 'v1'), at: int(m.at, 0, MAX_T, 0), labs: int(m.labs, 0, 1000, 0), lessons: int(m.lessons, 0, 1000, 0), told: bool(m.told, false) };
  }
  // A second line of defence for imported data: < and > are stripped from every string that is not a console command.
  function stripTags(v, depth) {
    depth = depth || 0;
    if (depth > 8) return null;
    if (typeof v === 'string') return v.replace(/[<>]/g, '');
    if (Array.isArray(v)) return v.map(x => stripTags(x, depth + 1));
    if (isObj(v)) { const o = {}; for (const k of Object.keys(v)) { if (!SAFE_KEY(k)) continue; o[k.replace(/[<>]/g, '')] = stripTags(v[k], depth + 1); } return o; }
    return v;
  }

  // the sandbox build: checked field by field; anything that does not fit is refused (null)
  const NAME = /^[A-Za-z][A-Za-z0-9-]{0,14}$/, SBX_TYPES = ['router', 'router5', 'switch', 'switch24', 'l3switch', 'pc', 'srv'];
  function sandbox(p) {
    if (!isObj(p) || !Array.isArray(p.devs) || !Array.isArray(p.links) || p.devs.length > 20 || p.links.length > 200) return null;
    const names = new Set(), devs = [], links = [], used = new Set();
    for (const d of p.devs) {
      if (!isObj(d) || typeof d.name !== 'string' || !NAME.test(d.name) || names.has(d.name) || !SBX_TYPES.includes(d.type)) return null;
      names.add(d.name);
      devs.push({ name: d.name, type: d.type, x: Math.max(34, Math.min(1566, Math.round(+d.x) || 100)), y: Math.max(34, Math.min(620, Math.round(+d.y) || 100)) });
    }
    const norm = n => (L4N.sim && L4N.sim.sandbox ? L4N.sim.sandbox.normIf(n) : null);
    for (const l of p.links) {
      if (!isObj(l) || !names.has(l.a) || !names.has(l.b) || l.a === l.b || typeof l.ai !== 'string' || typeof l.bi !== 'string' || l.ai.length > 40 || l.bi.length > 40) return null;
      const ai = norm(l.ai), bi = norm(l.bi);
      if (!ai || !bi || used.has(l.a + '|' + ai) || used.has(l.b + '|' + bi)) return null;
      used.add(l.a + '|' + ai); used.add(l.b + '|' + bi);
      links.push({ a: l.a, ai, b: l.b, bi });
    }
    const notes = (Array.isArray(p.notes) ? p.notes : []).filter(n => isObj(n) && typeof n.text === 'string' && n.text.trim()).slice(0, 30)
      .map(n => ({ text: n.text.slice(0, 60).replace(/[<>]/g, ''), x: Math.max(10, Math.min(1590, Math.round(+n.x) || 100)), y: Math.max(16, Math.min(654, Math.round(+n.y) || 40)) }));
    const vw = p.view, view = isObj(vw) && [vw.x, vw.y, vw.w].every(x => typeof x === 'number' && isFinite(x)) ? { x: Math.max(0, Math.min(1200, vw.x)), y: Math.max(0, Math.min(500, vw.y)), w: Math.max(400, Math.min(1600, vw.w)) } : null;
    const w = workEntry({ journal: Array.isArray(p.journal) ? p.journal : [], tasks: [] });
    const journal = w.corrupt ? [] : w.journal.filter(e => names.has(e.device));
    return { devs, links, notes, view, goal: int(p.goal, 0, 3, null), goalDone: bool(p.goalDone, false), journal, sel: names.has(p.sel) ? p.sel : null };
  }

  known.lessonQuiz = {};
  known.quizCount = 0;
  L4N.validate = { isObj, oneOf, bool, num, int, str, own, SAFE_KEY, known, settings, ui, main, ext: { labs, lessons, quiz, subnet, migrated }, lessons, quiz, subnet, migrated, stripTags, sandbox, SETTINGS, run, labs, work, workEntry, okLine, DEVICE, GRADES };
})(window.L4N = window.L4N || {});
