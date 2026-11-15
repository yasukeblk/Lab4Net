// main.js: boot. Reads storage once (checked), builds the store, applies the theme, mounts the shell.
(function (L4N) {
  'use strict';
  const V = L4N.validate, K = L4N.KEYS, S = L4N.storage;

  // The catalogue of labs and lessons, and the slugs storage is allowed to name.
  L4N.data = L4N.sim.catalogue();
  for (const l of L4N.data.labs) V.known.labs.add(l.slug);
  for (const l of L4N.data.lessons) { V.known.lessons.add(l.slug); V.known.lessonQuiz[l.slug] = Array.isArray(l.lesson.quiz) ? l.lesson.quiz.length : 0; }
  V.known.quizCount = typeof QUIZ !== 'undefined' ? QUIZ.length : 0;
  V.known.automationCount = typeof AUTOMATION !== 'undefined' ? AUTOMATION.length : 0;

  // index.html?panel=tasks is the pop-out Tasks window: it never touches storage and never runs the app.
  if (L4N.popout && L4N.popout.isPopout()) { L4N.popout.boot(); return; }

  const replays = (slug, w) => { const e = L4N.data.lab(slug); if (!e) return false; try { L4N.sim.open(e, w); return true; } catch (x) { return false; } };
  const notes = [];

  // A backup checked in Settings › Data waits in lab4net:v2:pending until this load ("Reload now").
  const pending = S.read(K.pending);
  if (pending != null) {
    S.remove(K.pending);
    if (V.isObj(pending) && V.isObj(pending.main)) {
      const main = V.main(pending.main);
      main.migrated = V.migrated(pending.main.migrated) || { from: 'none', at: Date.now(), labs: 0, lessons: 0, told: true };
      const work = {}, wm = V.work(pending.work);
      for (const k of Object.keys(wm)) if (!wm[k].corrupt && replays(k, wm[k])) work[k] = wm[k];
      S.write(K.main, main); S.write(K.work, work);
      if (pending.sandbox != null && V.sandbox) { const sb = V.sandbox(pending.sandbox); if (sb) S.write(K.sandbox, sb); }
      notes.push({ text: 'Backup imported.', kind: 'ok' });
    }
  }

  // One-time import from the old app's keys, when lab4net:v2 does not exist yet. The old keys are left alone.
  if (S.raw(K.main) == null) {
    try {
      const r = L4N.migrate.fromV1(k => S.raw(k), { replays });
      S.write(K.main, r.main);
      if (Object.keys(r.work).length) S.write(K.work, r.work);
    } catch (e) { console.error(e); }
  }

  const doc = V.main(S.read(K.main));
  L4N.store = L4N.createStore(doc);
  L4N.theme.apply(doc.settings);

  // Save the main document a moment after any change, and when the page is hidden.
  const SAVED = ['settings', 'labs', 'lessons', 'quiz', 'automation', 'subnet', 'exam', 'ui', 'migrated'];
  let timer = 0;
  function save() {
    clearTimeout(timer); timer = 0;
    const s = L4N.store.get(), out = { v: 2 };
    for (const k of SAVED) out[k] = s[k];
    S.write(K.main, out);
  }
  L4N.saveNow = save;
  L4N.store.subscribe((s, prev) => { if (SAVED.some(k => s[k] !== prev[k])) { clearTimeout(timer); timer = setTimeout(save, 120); } });
  window.addEventListener('pagehide', () => { if (timer) save(); if (L4N.work.pending()) L4N.work.flush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'hidden') return; if (timer) save(); if (L4N.work.pending()) L4N.work.flush(); });

  // Old links: ?lab=<slug> and ?lesson=<slug> become hash routes (skipping the landing), then the query is removed.
  const qs = new URLSearchParams(location.search);
  if (qs.has('lab') || qs.has('lesson') || qs.has('welcome')) {
    let hash = location.hash;
    if (qs.has('lab') || qs.has('lesson')) {
      const kind = qs.has('lab') ? 'lab' : 'lesson', s = String(qs.get(kind) || '').toLowerCase().slice(0, 120);
      const ok = L4N.isSlug(s) && (kind === 'lab' ? L4N.data.lab(s) : L4N.data.lesson(s));
      hash = ok ? L4N.router.href(kind, s) : (kind === 'lab' ? '#/labs' : '#/lessons');
      if (!ok) notes.push({ text: 'That link is out of date.', kind: 'warn' });
    }
    history.replaceState(null, '', location.pathname + (hash || ''));
  }

  L4N.shell.mount(document.getElementById('app'));
  if (L4N.afterBoot) for (const fn of L4N.afterBoot) { try { fn(); } catch (e) { console.error(e); } }

  // One toast if old progress was carried over (once).
  const mig = L4N.store.get().migrated;
  if (mig && mig.from === 'v1' && !mig.told) {
    notes.push({ text: 'Your progress was carried over: ' + mig.labs + ' lab' + (mig.labs === 1 ? '' : 's') + ' and ' + mig.lessons + ' lesson' + (mig.lessons === 1 ? '' : 's') + '.', kind: 'ok' });
    L4N.store.set(s => ({ migrated: Object.assign({}, s.migrated, { told: true }) }));
  }
  for (const n of notes) L4N.toast(n);

  // One cookieless page view on the public site only (never with Do Not Track).
  L4N.site.count();
})(window.L4N = window.L4N || {});
