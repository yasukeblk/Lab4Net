// dom.js: the only way elements are made. Text always goes in as text; the one exception is dom.trusted(),
// for repo content (lab tasks, lesson HTML, "why" text) and nothing else.
(function (L4N) {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const PROPS = { value: 1, checked: 1, disabled: 1, hidden: 1, tabIndex: 1, indeterminate: 1, selected: 1, open: 1 };

  function setProps(n, props) {
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.setAttribute('class', Array.isArray(v) ? v.filter(Boolean).join(' ') : v);
      else if (k === 'text') n.textContent = String(v);
      else if (k === 'style') { if (typeof v === 'string') n.setAttribute('style', v); else for (const s in v) n.style.setProperty(s, v[s]); }
      else if (k === 'dataset') { for (const d in v) if (v[d] != null) n.dataset[d] = v[d]; }
      else if (k.length > 2 && k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
      else if (PROPS[k] && !(n instanceof SVGElement)) n[k] = v;
      else n.setAttribute(k, v === true ? '' : String(v));
    }
  }

  function append(n, kids) {
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false || c === true) continue;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return n;
  }

  // el('button', {class: 'btn', onClick: fn, 'aria-label': 'Close'}, icon('x'), 'Close')
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) setProps(n, props);
    return append(n, kids);
  }

  function svg(tag, props, ...kids) {
    const n = document.createElementNS(SVGNS, tag);
    if (props) setProps(n, props);
    return append(n, kids);
  }

  function icon(name, cls) {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    const u = document.createElementNS(SVGNS, 'use');
    u.setAttribute('href', '#i-' + name);
    s.appendChild(u);
    return s;
  }

  // Repo content only (lab tasks, lesson HTML, "why" text). Never user input, storage, URLs or messages.
  function trusted(html, tag, props) {
    const n = el(tag || 'div', props);
    n.innerHTML = String(html);
    return n;
  }

  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }

  function text(s) { return document.createTextNode(String(s)); }

  let uid = 0;
  const id = prefix => (prefix || 'l4n') + '-' + (++uid);

  const isTyping = t => !!(t && t.closest && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));

  L4N.dom = { el, svg, icon, trusted, clear, append, text, id, isTyping, SVGNS };
})(window.L4N = window.L4N || {});
