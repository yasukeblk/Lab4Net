// shortcuts.js: one keydown handler for the whole app (section 3.4). Single keys only fire when focus is not
// in an input. Alt shortcuts match on the physical key (e.code) so they work with any layout and on a Mac.
(function (L4N) {
  'use strict';
  const { el } = L4N.dom;
  const MAC = L4N.ui.MAC;
  const list = [];
  let pending = null, pendingAt = 0;

  // add({keys: 'mod+k' | 'g h' | 'alt+.', label, group, run(e), when() → bool, input: true, hidden: true})
  function add(s) { list.push(s); return s; }

  const NAMED = { enter: 'enter', esc: 'escape', up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', space: ' ', tab: 'tab', f6: 'f6' };
  const CODE = { '.': 'Period', ',': 'Comma', '/': 'Slash', '[': 'BracketLeft', ']': 'BracketRight' };

  function parse(step) {
    const parts = step.split('+');
    const key = parts.pop();
    const m = { ctrl: false, meta: false, alt: false, shift: false };
    for (const p of parts) {
      if (p === 'mod') { if (MAC) m.meta = true; else m.ctrl = true; }
      else m[p] = true;
    }
    return { key, m };
  }

  function matches(e, step) {
    const { key, m } = parse(step);
    if (e.ctrlKey !== m.ctrl || e.metaKey !== m.meta || e.altKey !== m.alt) return false;
    const named = NAMED[key];
    if (named) { if (e.shiftKey !== m.shift) return false; return e.key.toLowerCase() === named; }
    if (m.alt) {
      const code = /^[a-z]$/.test(key) ? 'Key' + key.toUpperCase() : /^\d$/.test(key) ? 'Digit' + key : CODE[key];
      return e.code === code && e.shiftKey === m.shift;
    }
    if (m.shift && !e.shiftKey) return false;
    return e.key.toLowerCase() === key || (CODE[key] && e.code === CODE[key] && !e.shiftKey && key !== '/' && key !== '?');
  }

  function onKey(e) {
    if (e.defaultPrevented || e.isComposing) return;
    if (document.documentElement.getAttribute('data-landing') === 'show') return;   // the landing section has only Start and Esc
    const typing = L4N.dom.isTyping(e.target);
    const modal = document.querySelector('dialog[open]');
    const now = Date.now();
    for (const s of list) {
      if (!s.run) continue;
      if (modal && !s.inDialog) continue;
      if (typing && !s.input) continue;
      if (s.when && !s.when(e)) continue;
      const steps = s.keys.split(' ');
      if (steps.length === 2) {
        if (pending === steps[0] && now - pendingAt < 1500 && matches(e, steps[1])) {
          pending = null; e.preventDefault(); s.run(e); return;
        }
        continue;
      }
      if (matches(e, steps[0])) { pending = null; if (s.run(e) !== false) e.preventDefault(); return; }
    }
    // remember the first key of a sequence
    if (!typing && !modal && !e.ctrlKey && !e.metaKey && !e.altKey && list.some(s => s.keys.split(' ').length === 2 && s.keys.split(' ')[0] === e.key.toLowerCase())) {
      pending = e.key.toLowerCase(); pendingAt = now;
    } else if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) pending = null;
  }
  window.addEventListener('keydown', onKey);

  // The "?" shortcut list, grouped as in section 3.4.
  function showList() {
    const groups = new Map();
    for (const s of list) {
      if (s.hidden || (s.when && s.showWhen === false)) continue;
      const g = s.group || 'Everywhere';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(s);
    }
    for (const extra of L4N.keys.extra) { if (!groups.has(extra.group)) groups.set(extra.group, []); groups.get(extra.group).push(extra); }
    const body = el('div', { class: 'keys' });
    for (const [g, items] of groups) {
      body.append(el('div', { class: 'keys__group' }, el('h3', { class: 'label-caps', text: g, style: 'margin-bottom:4px' }),
        items.map(s => el('div', { class: 'keys__row' }, el('span', { text: s.label }),
          el('span', { class: 'sr-only', text: L4N.ui.kbdText(s.keys) }), L4N.ui.kbd(s.keys)))));
    }
    L4N.dialog.open({ title: 'Keyboard shortcuts', className: 'dlg--wide', body });
  }

  L4N.keys = { add, showList, extra: [], matches };
})(window.L4N = window.L4N || {});
