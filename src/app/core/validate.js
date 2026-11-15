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

  L4N.validate = { isObj, oneOf, bool, num, int, str, own, SAFE_KEY, known, settings, ui, main, ext: {}, SETTINGS };
})(window.L4N = window.L4N || {});
