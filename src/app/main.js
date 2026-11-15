// main.js: boot. Reads storage once (checked), builds the store, applies the theme, mounts the shell.
(function (L4N) {
  'use strict';
  const V = L4N.validate;

  // The catalogue of labs and lessons, and the slugs storage is allowed to name.
  L4N.data = L4N.sim.catalogue();
  for (const l of L4N.data.labs) V.known.labs.add(l.slug);
  for (const l of L4N.data.lessons) V.known.lessons.add(l.slug);

  // index.html?panel=tasks is the pop-out Tasks window: it never touches storage and never runs the app.
  if (L4N.popout && L4N.popout.isPopout()) { L4N.popout.boot(); return; }

  // One-time import from the old keys runs before the first read (core/migrate.js, Phase 5).
  if (L4N.migrate && L4N.migrate.boot) { try { L4N.migrate.boot(); } catch (e) { console.error(e); } }

  const doc = V.main(L4N.storage.read(L4N.KEYS.main));
  L4N.store = L4N.createStore(doc);
  L4N.theme.apply(doc.settings);

  // Save the main document a moment after any change, and when the page is hidden.
  const SAVED = ['settings', 'labs', 'lessons', 'quiz', 'subnet', 'exam', 'ui', 'migrated'];
  let timer = 0;
  function save() {
    clearTimeout(timer); timer = 0;
    const s = L4N.store.get(), out = { v: 2 };
    for (const k of SAVED) out[k] = s[k];
    L4N.storage.write(L4N.KEYS.main, out);
  }
  L4N.saveNow = save;
  L4N.store.subscribe((s, prev) => { if (SAVED.some(k => s[k] !== prev[k])) { clearTimeout(timer); timer = setTimeout(save, 120); } });
  window.addEventListener('pagehide', () => { if (timer) save(); if (L4N.work.pending()) L4N.work.flush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'hidden') return; if (timer) save(); if (L4N.work.pending()) L4N.work.flush(); });

  // Progress numbers for the sidebar and the lists. Later phases fill these in from the store.
  L4N.stats = L4N.stats || {
    labs: () => ({ done: Object.keys(L4N.store.get().labs).filter(k => L4N.store.get().labs[k].done).length, total: L4N.data.labs.length }),
    lessons: () => ({ done: Object.keys(L4N.store.get().lessons).filter(k => L4N.store.get().lessons[k].read).length, total: L4N.data.lessons.length }),
    labStatus: slug => (L4N.labStatus ? L4N.labStatus(slug) : 'todo')
  };

  L4N.shell.mount(document.getElementById('app'));
  if (L4N.afterBoot) for (const fn of L4N.afterBoot) { try { fn(); } catch (e) { console.error(e); } }
})(window.L4N = window.L4N || {});
