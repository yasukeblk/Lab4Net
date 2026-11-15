// button.js: buttons, form controls, chips, bars, callouts and empty states (section 4.6).
(function (L4N) {
  'use strict';
  const { el, icon } = L4N.dom;
  const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

  // 'mod+k' → ['Ctrl', 'K'] (or ['⌘', 'K'] on a Mac)
  function keyParts(combo) {
    const NAMES = { mod: MAC ? '⌘' : 'Ctrl', ctrl: 'Ctrl', alt: MAC ? '⌥' : 'Alt', shift: 'Shift', enter: '↵', esc: 'Esc', up: '↑', down: '↓',
      left: '←', right: '→', space: 'Space', tab: 'Tab' };
    return String(combo).split(' ').map(step => step.split('+').map(k => NAMES[k] || (k.length === 1 ? k.toUpperCase() : k)));
  }
  function kbd(combo) {
    const steps = keyParts(combo);
    const out = el('span', { class: 'kbds', 'aria-hidden': 'true' });
    steps.forEach((keys, i) => {
      if (i) out.append(el('span', { class: 'hint', text: 'then' }));
      for (const k of keys) out.append(el('kbd', { class: 'kbd', text: k }));
    });
    return out;
  }
  const kbdText = combo => keyParts(combo).map(s => s.join('+')).join(' then ');

  // button({label, icon, kind: 'primary'|'secondary'|'ghost'|'danger', kbd, tip, onClick, size: 'lg'})
  function button(o) {
    const iconOnly = !o.label;
    const b = el(o.href ? 'a' : 'button', {
      class: ['btn', 'btn--' + (iconOnly ? 'icon' : (o.kind || 'secondary')), o.size === 'lg' && 'btn--lg', o.class],
      type: o.href ? null : 'button', href: o.href || null, target: o.target || null, rel: o.rel || null,
      'aria-label': iconOnly ? o.aria || o.tip : o.aria || null,
      'data-tip': o.tip || (iconOnly ? o.aria : null), 'data-kbd': o.kbd && (iconOnly || o.tipKbd) ? o.kbd : null,
      id: o.id || null, onClick: o.onClick || null
    }, o.icon && icon(o.icon), o.label && el('span', { text: o.label }), o.kbd && !iconOnly && o.showKbd !== false && kbd(o.kbd));
    if (o.disabled) b.setAttribute('aria-disabled', 'true');
    return b;
  }

  // toggle({label, checked, onChange}) → a switch with a visible label
  function toggle(o) {
    const b = el('button', { class: 'toggle', type: 'button', role: 'switch', 'aria-checked': String(!!o.checked), id: o.id || null },
      el('span', { class: 'toggle__track', 'aria-hidden': 'true' }), o.label && el('span', { text: o.label }));
    if (o.labelledby) b.setAttribute('aria-labelledby', o.labelledby);
    b.addEventListener('click', () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); if (o.onChange) o.onChange(v); });
    b.set = v => b.setAttribute('aria-checked', String(!!v));
    return b;
  }

  function checkbox(o) {
    const inp = el('input', { type: 'checkbox', checked: !!o.checked, 'aria-label': o.aria || null });
    if (o.disabled) inp.disabled = true;
    if (o.onChange) inp.addEventListener('change', () => o.onChange(inp.checked));
    return el('label', { class: ['check', o.class, o.disabled && 'is-disabled'], 'data-tip': o.tip || null }, inp, el('span', { class: 'check__box', 'aria-hidden': 'true' }, icon('check')), o.label && el('span', { text: o.label }));
  }

  // segmented({label, options: [{value, label, icon}], value, onChange})
  function segmented(o) {
    const g = el('div', { class: 'seg', role: 'radiogroup', 'aria-label': o.label || null });
    if (o.labelledby) g.setAttribute('aria-labelledby', o.labelledby);
    const btns = o.options.map(opt => el('button', {
      class: 'seg__opt', type: 'button', role: 'radio', 'aria-checked': String(opt.value === o.value), tabindex: opt.value === o.value ? '0' : '-1',
      'data-value': opt.value, onClick: () => pick(opt.value, true)
    }, opt.icon && icon(opt.icon), el('span', { text: opt.label })));
    function pick(v, fire, focus) {
      for (const b of btns) { const on = b.getAttribute('data-value') === v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); }
      if (fire && o.onChange) o.onChange(v);
    }
    g.addEventListener('keydown', e => {
      const i = btns.indexOf(document.activeElement); if (i < 0) return;
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % btns.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = btns.length - 1;
      if (j == null) return;
      e.preventDefault(); pick(btns[j].getAttribute('data-value'), true, true);
    });
    g.append(...btns);
    g.set = v => pick(v, false);
    return g;
  }

  function select(o) {
    const s = el('select', { class: 'select', 'aria-label': o.label || null, id: o.id || null },
      o.options.map(opt => el('option', { value: opt.value, text: opt.label, selected: opt.value === o.value })));
    if (o.onChange) s.addEventListener('change', () => o.onChange(s.value));
    return s;
  }

  function input(o) {
    const i = el('input', { class: 'input', type: o.type || 'text', placeholder: o.placeholder || null, 'aria-label': o.label || null,
      value: o.value || '', id: o.id || null, autocomplete: 'off', spellcheck: 'false', maxlength: o.maxlength || null });
    if (o.onInput) i.addEventListener('input', () => o.onInput(i.value));
    return i;
  }

  function searchInput(o) {
    const i = input(Object.assign({ type: 'search' }, o));
    return el('div', { class: ['search', o.class] }, icon('search'), i);
  }

  const STATUS = {
    todo: ['circle', 'To do'], progress: ['circle-half', 'In progress'], done: ['check-circle', 'Done'], failed: ['x-circle', 'Failed']
  };
  function statusIcon(st) { const [ic] = STATUS[st] || STATUS.todo; const i = icon(ic); i.classList.add('st--' + (st || 'todo')); return i; }
  function statusChip(st) { const [ic, word] = STATUS[st] || STATUS.todo; return el('span', { class: 'chip chip--' + (st || 'todo') }, icon(ic), el('span', { text: word })); }
  function gradeChip(g) { return el('span', { class: 'chip chip--grade', 'data-grade': g, 'aria-label': 'Grade ' + g, 'data-tip': 'Grade ' + g, text: g }); }
  function objChip(id, name) { return el('span', { class: 'chip chip--obj', 'data-tip': name ? 'CCNA ' + id + ': ' + name : null, text: 'CCNA ' + id }); }
  function chip(text, cls, ic) { return el('span', { class: ['chip', cls] }, ic && icon(ic), el('span', { text })); }

  function bar(value, max, label) {
    const pct = max ? Math.max(0, Math.min(100, Math.round(value / max * 100))) : 0;
    return el('div', { class: 'bar' },
      el('div', { class: 'bar__track', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(value), 'aria-label': label || null },
        el('div', { class: 'bar__fill', style: { width: pct + '%' } })),
      el('span', { class: 'bar__num', text: value + '/' + max }));
  }

  // callout({kind: 'info'|'warn'|'bad', icon, title, body: [nodes|strings]})
  function callout(o) {
    return el('div', { class: ['callout', o.kind && o.kind !== 'info' && 'callout--' + o.kind, o.class], role: o.role || null },
      icon(o.icon || (o.kind === 'warn' ? 'alert' : o.kind === 'bad' ? 'x-circle' : 'info')),
      el('div', { class: 'callout__body' }, o.title && el('div', { class: 'callout__title', text: o.title }), o.body));
  }

  // empty({icon, what, todo, action: {label, onClick, href}})
  function empty(o) {
    return el('div', { class: 'empty' }, icon(o.icon || 'info'), el('p', { class: 'empty__what', text: o.what }), o.todo && el('p', { text: o.todo }),
      o.action && button(Object.assign({ kind: 'secondary' }, o.action)));
  }

  L4N.ui = Object.assign(L4N.ui || {}, { button, toggle, checkbox, segmented, select, input, searchInput, statusIcon, statusChip, gradeChip, objChip, chip, bar, callout, empty, kbd, kbdText, keyParts, MAC });
})(window.L4N = window.L4N || {});
