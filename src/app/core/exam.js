// exam.js: the exam's state, history and checks (section 5.9). An exam is rebuilt from its seed, so storage only keeps
// the mode, seed, clock and the commands typed, never fault commands. An exam never changes a lab's own progress. No DOM.
(function (L4N) {
  'use strict';
  const V = L4N.validate;
  const MODES = ['sabotage', 'lab', 'incident', 'daily', 'boss'];
  const NAME = { sabotage: 'Fault-find', lab: 'Build', incident: 'Incident', daily: "Today's exam", boss: 'Stage check' };
  const TAG = /^stage:[a-z0-9-]{1,40}$/, SEED = /^[A-Za-z0-9|:._-]{1,80}$/;
  const S = () => L4N.store.get().exam;
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const set = patch => L4N.store.set(s => ({ exam: Object.assign({}, s.exam, patch) }));

  // storage checks
  function current(c) {
    if (!V.isObj(c) || !MODES.includes(c.mode) || typeof c.seed !== 'string' || !SEED.test(c.seed)) return null;
    const minutes = [10, 15, 20, 30].includes(c.minutes) ? c.minutes : null, started = V.int(c.started, 0, 1e14, null);
    if (!minutes || started == null) return null;
    const w = V.workEntry({ journal: Array.isArray(c.journal) ? c.journal : [], tasks: [] });
    if (w.corrupt) return null;
    const r = V.isObj(c.run) ? c.run : {};
    return { mode: c.mode, seed: c.seed, minutes, tag: typeof c.tag === 'string' && TAG.test(c.tag) ? c.tag : null, started, deadline: started + minutes * 60000,
      journal: w.journal, run: { errs: V.int(r.errs, 0, 1e6, 0), checks: V.int(r.checks, 0, 1e6, 0), cmds: V.int(r.cmds, 0, 1e6, 0) } };
  }
  function item(h) {
    if (!V.isObj(h) || !MODES.includes(h.mode) || !V.known.labs.has(h.base)) return null;
    const total = V.int(h.total, 0, 500, 0);
    return { at: V.int(h.at, 0, 1e14, 0), mode: h.mode, base: h.base, tag: typeof h.tag === 'string' && TAG.test(h.tag) ? h.tag : null, cleared: h.cleared === true,
      passed: V.int(h.passed, 0, total, 0), total, grade: V.GRADES.includes(h.grade) ? h.grade : null, secs: V.int(h.secs, 0, 1e7, 0), minutes: V.int(h.minutes, 0, 60, 0) };
  }
  function doc(e) {
    e = V.isObj(e) ? e : {};
    return { current: current(e.current), history: (Array.isArray(e.history) ? e.history : []).map(item).filter(Boolean).slice(-40) };
  }
  V.ext.exam = doc;
  function mergeHistory(a, b) {
    const seen = new Set(), all = [];
    for (const h of (a.history || []).concat(b.history || [])) { const k = h.at + '|' + h.base; if (seen.has(k)) continue; seen.add(k); all.push(h); }
    all.sort((x, y) => x.at - y.at);
    return { current: a.current, history: all.slice(-40) };
  }

  // the labs a stage check draws from
  const poolOf = tag => { if (!tag) return null; const st = L4N.stats.stages().find(s => 'stage:' + s.id === tag); return st ? st.labs.map(l => l.slug) : null; };
  const cache = new Map();
  // the exam's lab entry, built once per exam
  function entry(c) {
    if (!c) return null;
    const key = c.mode + '|' + c.seed + '|' + (c.tag || '');
    if (!cache.has(key)) {
      let m = null;
      try { m = L4N.sim.examMake(c.mode, c.seed, poolOf(c.tag)); } catch (e) { console.error(e); }
      cache.set(key, m ? { slug: m.base.slug, title: m.lab.title, short: m.base.short, kind: 'exam', idText: 'EXAM', lab: m.lab, base: m.base, faults: m.faults, mode: c.mode } : null);
    }
    return cache.get(key);
  }

  const running = () => !!S().current;
  function begin(mode, minutes, opts) {
    opts = opts || {};
    if (running()) return { error: 'An exam is already running. Resume it, or give it up first.' };
    const seed = opts.seed || (mode === 'daily' ? 'daily|' + today() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
    const c = { mode, seed, minutes, tag: opts.tag || null, started: Date.now(), journal: [], run: { errs: 0, checks: 0, cmds: 0 } };
    c.deadline = c.started + minutes * 60000;
    if (!entry(c)) return { error: 'Could not build that exam. Try another mode.' };
    set({ current: c });
    return { ok: true, current: c };
  }
  // end the exam and record it (never touching the base lab's progress)
  function finish(results, opts) {
    const c = S().current, e = entry(c);
    if (!c || !e) { set({ current: null }); return null; }
    const passed = results.filter(x => x[1]).length, cleared = results.length > 0 && passed === results.length;
    const grade = cleared ? L4N.grade.letter(L4N.grade.score(Object.assign({}, c.run, { help: false, walk: false, clues: 0 }))) : null;
    const h = { at: Date.now(), mode: c.mode, base: e.base.slug, tag: c.tag, cleared, passed, total: results.length, grade,
      secs: Math.round((Math.min(Date.now(), c.deadline) - c.started) / 1000), minutes: c.minutes, gaveUp: !!(opts && opts.gaveUp) };
    const history = S().history.concat([item(h)]).slice(-40);
    set({ current: null, history });
    return Object.assign(h, { faults: e.faults, entry: e });
  }
  // an exam whose time ran out while it was not open is graded from its saved commands
  function settle() {
    const c = S().current;
    if (!c || Date.now() < c.deadline) return null;
    const e = entry(c);
    let results = [];
    if (e) { try { const st = L4N.sim.open(e, { journal: c.journal }); results = L4N.sim.grade(st); } catch (x) { results = e.lab.checks.map(([t]) => [t, false]); } }
    return finish(results);
  }
  const stagePassed = id => S().history.some(h => h.tag === 'stage:' + id && h.cleared);

  L4N.exam = Object.assign(L4N.exam || {}, { MODES, NAME, running, begin, finish, settle, entry, stagePassed, mergeHistory, today, set, doc, poolOf });
})(window.L4N = window.L4N || {});
