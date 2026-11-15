// tabs.js: role="tablist". Arrow keys move and select, Home and End jump.
(function (L4N) {
  'use strict';
  const { el, icon, id } = L4N.dom;

  // tabs({label, items: [{id, label, icon, extra: Node, panel: id}], selected, onSelect, class})
  function tabs(o) {
    const list = el('div', { class: ['tabs', o.class], role: 'tablist', 'aria-label': o.label || null });
    const btns = new Map();
    function render() {
      list.textContent = '';
      btns.clear();
      for (const it of o.items) {
        const b = el('button', {
          class: ['tab', it.class], type: 'button', role: 'tab', id: it.tabId || id('tab'),
          'aria-selected': String(it.id === o.selected), tabindex: it.id === o.selected ? '0' : '-1',
          'aria-controls': it.panel || null, 'data-tab': it.id, onClick: () => select(it.id, true)
        }, it.icon && icon(it.icon), it.node || el('span', { text: it.label }), it.extra || null);
        btns.set(it.id, b); list.append(b);
      }
    }
    function select(v, fire, focus) {
      o.selected = v;
      for (const [k, b] of btns) { const on = k === v; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); }
      if (fire && o.onSelect) o.onSelect(v);
    }
    list.addEventListener('keydown', e => {
      const keys = [...btns.keys()], i = keys.indexOf(o.selected);
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % keys.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + keys.length) % keys.length;
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = keys.length - 1;
      if (j == null) return;
      e.preventDefault(); select(keys[j], true, true);
    });
    render();
    return { el: list, select: (v, fire) => select(v, fire), tab: k => btns.get(k), setItems(items) { o.items = items; render(); } };
  }

  L4N.ui.tabs = tabs;
})(window.L4N = window.L4N || {});
