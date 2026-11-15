// store.js: one in-memory store, and the only code that touches localStorage. No DOM.
(function (L4N) {
  'use strict';

  function createStore(initial) {
    let state = initial;
    const subs = new Set();
    return {
      get: () => state,
      // set({settings: {...}}) replaces those top-level keys; set(fn) gets the state and returns a patch.
      set(patch) {
        const prev = state;
        const p = typeof patch === 'function' ? patch(state) : patch;
        if (!p) return;
        state = Object.assign({}, state, p);
        for (const fn of Array.from(subs)) { try { fn(state, prev); } catch (e) { if (typeof console !== 'undefined') console.error(e); } }
      },
      subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
    };
  }

  const KEYS = { main: 'lab4net:v2', work: 'lab4net:v2:work', sandbox: 'lab4net:v2:sandbox', pending: 'lab4net:v2:pending' };

  // Every read is parsed defensively and checked by the caller (core/validate.js); every write is wrapped.
  const storage = {
    ok: true,
    listeners: new Set(),
    area() { try { return globalThis.localStorage || null; } catch (e) { return null; } },
    raw(key) { try { const a = storage.area(); return a ? a.getItem(key) : null; } catch (e) { return null; } },
    read(key) {
      const raw = storage.raw(key);
      if (raw == null) return null;
      if (raw.length > 6e6) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },
    write(key, value) {
      let ok = false;
      try { const a = storage.area(); if (a) { a.setItem(key, JSON.stringify(value)); ok = true; } } catch (e) { ok = false; }
      if (ok !== storage.ok) { storage.ok = ok; for (const fn of storage.listeners) fn(ok); }
      return ok;
    },
    remove(key) { try { const a = storage.area(); if (a) a.removeItem(key); } catch (e) {} },
    onStatus(fn) { storage.listeners.add(fn); return () => storage.listeners.delete(fn); }
  };

  // Saved lab work, in its own key: {[labSlug]: {journal: [{device, line, t}], tasks: [bool], reveal?: {hint, cmds}}}
  // (reveal: the tasks whose hint or commands were opened, only when there are any).
  // Read once (checked by validate.work), kept in memory, written a moment after each change.
  let workMap = null, workTimer = 0;
  const work = {
    all() { if (!workMap) workMap = L4N.validate.work(storage.read(KEYS.work)); return workMap; },
    get(slug) { return work.all()[slug] || null; },
    put(slug, entry) { work.all()[slug] = Object.assign({ journal: entry.journal, tasks: entry.tasks || [] }, entry.reveal ? { reveal: entry.reveal } : {}); work.schedule(); },
    remove(slug) { delete work.all()[slug]; work.schedule(); },
    schedule() { clearTimeout(workTimer); workTimer = setTimeout(work.flush, 150); },
    flush() {
      clearTimeout(workTimer); workTimer = 0;
      if (!workMap) return;
      const out = {};
      for (const k of Object.keys(workMap)) if (!workMap[k].corrupt && (workMap[k].journal.length || (workMap[k].tasks || []).some(Boolean))) out[k] = Object.assign({ journal: workMap[k].journal, tasks: workMap[k].tasks }, workMap[k].reveal ? { reveal: workMap[k].reveal } : {});
      storage.write(KEYS.work, out);
    },
    pending: () => !!workTimer,
    reset() { workMap = null; }
  };

  L4N.createStore = createStore;
  L4N.storage = storage;
  L4N.work = work;
  L4N.KEYS = KEYS;
})(window.L4N = window.L4N || {});
