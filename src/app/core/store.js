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

  L4N.createStore = createStore;
  L4N.storage = storage;
  L4N.KEYS = KEYS;
})(window.L4N = window.L4N || {});
