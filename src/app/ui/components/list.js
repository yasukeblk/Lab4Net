// list.js: grouped list rows with a roving tabindex. J/K or arrows move, Enter opens.
(function (L4N) {
  'use strict';
  const { el, icon, id } = L4N.dom;

  // list({label, groups: [{label, count, extra, rows: [row]}], selected, onSelect(row), onOpen(row), empty: Node})
  // row: {key, title, icon, iconClass, status, idText, meta: [Node], href}
  function list(o) {
    const root = el('div', { class: ['list', o.class], role: 'listbox', 'aria-label': o.label || null });
    let rows = [], nodes = [], sel = -1;

    function render(groups) {
      root.textContent = '';
      rows = []; nodes = [];
      const all = groups || o.groups;
      let any = false;
      for (const g of all) {
        if (!g.rows.length && !g.always) continue;
        any = true;
        const gid = id('grp');
        const box = el('div', { role: 'group', 'aria-labelledby': g.label ? gid : null });
        if (g.label) box.append(el('div', { class: 'list__group', id: gid },
          el('span', { class: 'label-caps', text: g.label }), g.count != null && el('span', { class: 'count', text: g.count }), g.extra || null));
        for (const r of g.rows) {
          const n = el('div', {
            class: ['row', r.class], role: 'option', tabindex: '-1', 'aria-selected': 'false', 'data-key': r.key,
            onClick: () => { setSel(rows.indexOf(r), true); if (o.onOpen && (!o.detail || !o.detail())) o.onOpen(r); },
            onDblclick: () => { if (o.onOpen) o.onOpen(r); }
          },
          r.status ? L4N.ui.statusIcon(r.status) : r.icon ? icon(r.icon, r.iconClass) : null,
          r.idText && el('span', { class: 'row__id', text: r.idText }),
          el('span', { class: 'row__title', text: r.title }),
          r.meta && r.meta.length ? el('span', { class: 'row__meta' }, r.meta) : null);
          if (r.aria) n.setAttribute('aria-label', r.aria);
          rows.push(r); nodes.push(n); box.append(n);
        }
        root.append(box);
      }
      if (!any && o.empty) root.append(o.empty());
      const k = o.selected;
      sel = -1;
      const i = rows.findIndex(r => r.key === k);
      setSel(i >= 0 ? i : (rows.length ? 0 : -1), false, false, true);
    }

    function setSel(i, fire, focus, quiet) {
      if (i < 0 || i >= nodes.length) { sel = -1; return; }
      if (sel >= 0 && nodes[sel]) { nodes[sel].setAttribute('aria-selected', 'false'); nodes[sel].tabIndex = -1; }
      sel = i;
      nodes[i].setAttribute('aria-selected', 'true'); nodes[i].tabIndex = 0;
      o.selected = rows[i].key;
      if (focus) nodes[i].focus();
      if (!quiet) nodes[i].scrollIntoView({ block: 'nearest' });
      if (fire && o.onSelect) o.onSelect(rows[i]);
    }

    function move(d) { if (!nodes.length) return; setSel(Math.max(0, Math.min(nodes.length - 1, (sel < 0 ? -1 : sel) + d)), true, true); }

    root.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') { e.preventDefault(); move(-1); }
      else if (e.key === 'Home') { e.preventDefault(); setSel(0, true, true); }
      else if (e.key === 'End') { e.preventDefault(); setSel(nodes.length - 1, true, true); }
      else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); if (o.onOpen) o.onOpen(rows[sel]); }
    });

    render();
    return {
      el: root, render, move, focus() { if (sel >= 0) nodes[sel].focus(); else if (nodes[0]) setSel(0, true, true); },
      selected: () => (sel >= 0 ? rows[sel] : null), open() { if (sel >= 0 && o.onOpen) o.onOpen(rows[sel]); }, count: () => rows.length
    };
  }

  L4N.ui.list = list;
})(window.L4N = window.L4N || {});
