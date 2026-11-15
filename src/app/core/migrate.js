// migrate.js: the one-time import from the old app's storage keys (section 6.3), and backups.
// fromV1(read) is pure: it only reads through `read(key)` and never writes. Old data is untrusted and goes through
// the same checks as a backup file. The old keys are never deleted, so a rollback still finds them. No DOM.
(function (L4N) {
  'use strict';
  const V = L4N.validate;
  const OLD = ['ccna-bench-v2', 'lab4net-fun-v1', 'lab4net-lessons-v1', 'lab4net-workspace-v1', 'lab4net-incident-hints', 'lab4net-capstone-guide', 'lab4net-welcomed'];
  // Theory questions 29, 69, 70, 90, 97, 98, 99, 101 and 104 were rewritten; old answers to them no longer apply.
  const REWRITTEN = [29, 69, 70, 90, 97, 98, 99, 101, 104];
  const GRADES = ['S', 'A', 'B', 'C', 'D'];
  const isObj = V.isObj;

  function parse(v) {
    if (v == null) return null;
    if (typeof v !== 'string') return v;
    if (v.length > 6e6) return null;
    try { return JSON.parse(v); } catch (e) { return null; }
  }

  // fromV1(read, opts) → {main, work, labs: n, lessons: n, found: bool}
  // read(key) gives the old value (a string as stored, or an already-parsed object). opts.replays(slug, draft) → bool.
  function fromV1(read, opts) {
    opts = opts || {};
    const data = L4N.data, slug = L4N.slug;
    const labByTitle = t => (typeof t === 'string' && !/^Exam · /.test(t) ? data.labByTitle(t) : null);
    const raw = {};
    for (const k of OLD) { let v = null; try { v = read(k); } catch (e) { v = null; } raw[k] = k === 'lab4net-welcomed' ? v : parse(v); }
    const found = OLD.some(k => raw[k] != null);
    const labs = {}, lessons = {}, ui = {}, work = {};
    const rec = s => labs[s] || (labs[s] = { done: false });
    let quiz = { rev: 2, answers: {} }, subnet = { right: 0, total: 0 };

    // ccna-bench-v2: finished labs, quiz answers, the subnetting score
    const P = raw['ccna-bench-v2'];
    if (isObj(P)) {
      for (const t of Object.keys(P)) { const e = labByTitle(t); if (e && P[t] === true) rec(e.slug).done = true; }
      if (isObj(P.quiz)) {
        const ans = {};
        for (const i of Object.keys(P.quiz)) { const n = +i; if (Number.isInteger(n) && typeof P.quiz[i] === 'boolean') ans[n] = P.quiz[i]; }
        if (!(Number.isInteger(P.quizRev) && P.quizRev >= 2)) for (const n of REWRITTEN) delete ans[n];
        quiz = V.quiz({ answers: ans });
      }
      if (isObj(P.drill)) subnet = V.subnet({ right: P.drill.r, total: P.drill.t });
    }
    // lab4net-fun-v1: grades, and cleared labs also count as done
    const F = raw['lab4net-fun-v1'];
    if (isObj(F)) {
      if (isObj(F.ranks)) for (const t of Object.keys(F.ranks)) { const e = labByTitle(t); if (e && GRADES.includes(F.ranks[t])) rec(e.slug).grade = F.ranks[t]; }
      if (isObj(F.cleared)) for (const t of Object.keys(F.cleared)) { const e = labByTitle(t); if (e && F.cleared[t] === true) rec(e.slug).done = true; }
    }
    // a grade means the lab was finished
    for (const s of Object.keys(labs)) if (labs[s].grade) labs[s].done = true;
    // lab4net-lessons-v1: {title: {read, q: {index: bool}}}
    const Ls = raw['lab4net-lessons-v1'];
    if (isObj(Ls)) for (const k of Object.keys(Ls)) {
      const s = slug(k);
      if (!V.known.lessons.has(s) || !isObj(Ls[k])) continue;
      lessons[s] = { read: Ls[k].read === true, quiz: isObj(Ls[k].q) ? Ls[k].q : {} };
    }
    // lab4net-workspace-v1: saved work (kept only if it replays cleanly) and the last lab
    const W = raw['lab4net-workspace-v1'];
    if (isObj(W)) {
      if (isObj(W.drafts)) for (const t of Object.keys(W.drafts)) {
        const e = labByTitle(t);
        if (!e) continue;
        const w = V.workEntry(W.drafts[t]);
        if (!w || w.corrupt) continue;
        w.tasks = w.tasks.slice(0, e.lab.tasks.length);
        if (opts.replays && !opts.replays(e.slug, w)) continue;
        if (w.journal.length || w.tasks.some(Boolean)) work[e.slug] = w;
      }
      if (Number.isInteger(W.lastLab) && W.lastLab >= 0 && W.lastLab < data.labs.length) { ui.lastLab = data.labs[W.lastLab].slug; ui.recent = [ui.lastLab]; }
    }
    // clues already revealed, and the capstone guide choice
    const H = raw['lab4net-incident-hints'];
    if (isObj(H)) for (const t of Object.keys(H)) { const e = labByTitle(t); if (e && e.kind === 'incident' && Number.isInteger(H[t]) && H[t] > 0 && H[t] <= 3) rec(e.slug).clues = H[t]; }
    const C = raw['lab4net-capstone-guide'];
    if (isObj(C)) for (const t of Object.keys(C)) { const e = labByTitle(t); if (e && e.kind === 'capstone' && typeof C[t] === 'boolean') rec(e.slug).guide = C[t]; }
    if (raw['lab4net-welcomed'] != null) ui.landingSeen = true;

    const doneCount = Object.keys(labs).filter(s => labs[s].done).length;
    const main = V.main({ v: 2, labs, lessons: V.stripTags(lessons), quiz, subnet, ui });
    const readCount = Object.keys(main.lessons).filter(s => main.lessons[s].read).length;
    main.migrated = { from: found ? 'v1' : 'none', at: opts.now || Date.now(), labs: Object.keys(main.labs).filter(s => main.labs[s].done).length, lessons: readCount, told: !found };
    return { main, work, labs: doneCount, lessons: readCount, found };
  }

  // ---- backups ----
  const MAX_FILE = 5 * 1024 * 1024;
  function exportBackup(state, workMap, sandbox) {
    return { format: 'lab4net', version: 2, exported: Date.now(), data: { v2: state, work: workMap, sandbox: sandbox || null } };
  }

  // readBackup(text) → {main, work, sandbox, summary} for a version 2 file or an old version 1 file. Throws on anything else.
  function readBackup(text, opts) {
    if (typeof text !== 'string' || text.length > MAX_FILE) throw Error('That file is larger than 5 MB.');
    let p;
    try { p = JSON.parse(text); } catch (e) { throw Error('That file is not a Lab4Net backup.'); }
    if (!isObj(p) || p.format !== 'lab4net') throw Error('That file is not a Lab4Net backup.');
    if (p.version === 2) {
      const d = isObj(p.data) ? p.data : {};
      const main = V.main(V.stripTags(isObj(d.v2) ? d.v2 : {}));
      const work = {};
      const wm = V.work(d.work);
      for (const s of Object.keys(wm)) { const w = wm[s]; if (w.corrupt) continue; if (opts && opts.replays && !opts.replays(s, w)) continue; work[s] = w; }
      const sandbox = L4N.validate.sandbox ? L4N.validate.sandbox(d.sandbox) : null;
      return { main, work, sandbox, version: 2 };
    }
    if (p.version === 1) {
      if (!isObj(p.progress)) throw Error('That file is not a Lab4Net backup.');
      const extras = isObj(p.extras) ? p.extras : {};
      const read = k => {
        if (k === 'ccna-bench-v2') return p.progress;
        if (k === 'lab4net-workspace-v1') return { drafts: isObj(p.drafts) ? p.drafts : {}, lastLab: p.lastLab };
        const v = extras[k];
        return typeof v === 'string' && v.length <= 2e6 ? v : null;
      };
      const r = fromV1(read, opts);
      r.main.migrated = null;
      return { main: r.main, work: r.work, sandbox: null, version: 1 };
    }
    throw Error('This backup is from a newer version of Lab4Net.');
  }

  // merge(current, incoming): finished labs and the better grade are kept; saved work is replaced only for labs in the file.
  function merge(cur, inc) {
    const out = JSON.parse(JSON.stringify(cur.main));
    for (const s of Object.keys(inc.main.labs)) {
      const a = out.labs[s] || { done: false }, b = inc.main.labs[s];
      const m = Object.assign({}, a);
      m.done = !!(a.done || b.done);
      const g = L4N.grade.better(a.grade, b.grade); if (g) m.grade = g;
      if (b.doneAt && (!a.doneAt || b.doneAt < a.doneAt)) m.doneAt = b.doneAt;
      if (b.clues && !a.clues) m.clues = b.clues;
      if (typeof b.guide === 'boolean' && typeof a.guide !== 'boolean') m.guide = b.guide;
      out.labs[s] = m;
    }
    for (const s of Object.keys(inc.main.lessons)) {
      const a = out.lessons[s] || { read: false, quiz: {} }, b = inc.main.lessons[s];
      out.lessons[s] = { read: a.read || b.read, quiz: Object.assign({}, a.quiz, b.quiz) };
    }
    out.quiz = { rev: 2, answers: Object.assign({}, out.quiz.answers, inc.main.quiz.answers) };
    if (inc.main.subnet.total > out.subnet.total) out.subnet = inc.main.subnet;
    if (L4N.exam && L4N.exam.mergeHistory) out.exam = L4N.exam.mergeHistory(out.exam, inc.main.exam);
    const work = Object.assign({}, cur.work);
    for (const s of Object.keys(inc.work)) work[s] = inc.work[s];
    return { main: V.main(out), work, sandbox: inc.sandbox || cur.sandbox || null };
  }

  function summary(inc) {
    const labs = Object.keys(inc.main.labs).filter(s => inc.main.labs[s].done).length;
    const lessons = Object.keys(inc.main.lessons).filter(s => inc.main.lessons[s].read).length;
    const work = Object.keys(inc.work).length, quiz = Object.keys(inc.main.quiz.answers).length;
    const exams = (inc.main.exam && inc.main.exam.history || []).length;
    return { labs, lessons, work, quiz, exams, sandbox: !!inc.sandbox };
  }

  L4N.migrate = { fromV1, OLD, REWRITTEN, readBackup, exportBackup, merge, summary, MAX_FILE };
})(window.L4N = window.L4N || {});
