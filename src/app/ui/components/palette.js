// palette.js: the command registry and the Ctrl/Cmd+K palette. Every row is filled with textContent.
(function (L4N) {
  'use strict';
  const { el, icon, id, clear } = L4N.dom;

  // ---- registry ----
  // A provider returns commands for the current moment: [{id, group, title, subtitle, icon, kbd, keywords, run}]
  // and leaves out the ones that do not apply.
  const providers = [];
  const GROUPS = ['Go to', 'In a lab', 'In the sandbox', 'Labs', 'Lessons', 'Practice', 'Appearance', 'Data', 'Help'];
  const commands = {
    add(fn) { providers.push(fn); },
    all() {
      const out = [];
      for (const p of providers) { try { for (const c of p() || []) if (c) out.push(c); } catch (e) { console.error(e); } }
      return out;
    },
    run(cmdId) { const c = commands.all().find(x => x.id === cmdId); if (c) { c.run(); return true; } return false; }
  };

  // ---- palette ----
  let current = null;
  const BROWSE = { Labs: 1, Lessons: 1 };

  function open() {
    if (current) { current.close(); return; }
    const all = commands.all();
    const lid = id('pal-list');
    const inp = el('input', {
      type: 'text', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': lid, 'aria-autocomplete': 'list',
      'aria-label': 'Search or jump to', placeholder: 'Search or jump to…', autocomplete: 'off', spellcheck: 'false', maxlength: '120'
    });
    const listEl = el('div', { class: 'pal__list', role: 'listbox', id: lid, 'aria-label': 'Results' });
    const foot = el('div', { class: 'pal__foot', 'aria-hidden': 'true' },
      el('span', {}, L4N.ui.kbd('up'), L4N.ui.kbd('down'), 'move'), el('span', {}, L4N.ui.kbd('enter'), 'run'), el('span', {}, L4N.ui.kbd('esc'), 'close'));
    const content = el('div', { class: 'pal' }, el('div', { class: 'pal__input' }, icon('search'), inp), listEl, foot);
    let shown = [], rowsEl = [], active = 0;

    function render() {
      const q = inp.value.trim();
      let items;
      if (!q) items = all.filter(c => !BROWSE[c.group]);
      else items = L4N.search.rank(q, all, c => [c.title, (c.keywords || '') + ' ' + (c.subtitle || '') + ' ' + c.group]).slice(0, 60);
      // group in a fixed order, keeping rank order inside each group
      const byGroup = new Map();
      for (const c of items) { if (!byGroup.has(c.group)) byGroup.set(c.group, []); byGroup.get(c.group).push(c); }
      const order = [...byGroup.keys()].sort((a, b) => q ? 0 : (GROUPS.indexOf(a) - GROUPS.indexOf(b)));
      clear(listEl); shown = []; rowsEl = [];
      for (const g of order) {
        const gid = id('pal-g');
        const box = el('div', { role: 'group', 'aria-labelledby': gid }, el('div', { class: 'pal__group label-caps', id: gid, text: g }));
        for (const c of byGroup.get(g)) {
          const rid = id('pal-o');
          const r = el('div', { class: 'pal__row', role: 'option', id: rid, 'aria-selected': 'false',
            onClick: () => runIt(c), onPointermove: () => { const i = shown.indexOf(c); if (i !== active) setActive(i, false); } },
          icon(c.icon || 'arrow-right'), el('span', { class: 'pal__title', text: c.title }), el('span', { class: 'pal__sub', text: c.subtitle || '' }), c.kbd && L4N.ui.kbd(c.kbd));
          shown.push(c); rowsEl.push(r); box.append(r);
        }
        listEl.append(box);
      }
      if (!shown.length) listEl.append(el('div', { class: 'pal__empty', text: 'No matches. Try a lab title, a lesson or an objective number such as 3.4.' }));
      setActive(0, true);
    }
    function setActive(i, scroll) {
      if (rowsEl[active]) rowsEl[active].setAttribute('aria-selected', 'false');
      active = Math.max(0, Math.min(i, rowsEl.length - 1));
      const r = rowsEl[active];
      if (r) { r.setAttribute('aria-selected', 'true'); inp.setAttribute('aria-activedescendant', r.id); if (scroll) r.scrollIntoView({ block: 'nearest' }); }
      else inp.removeAttribute('aria-activedescendant');
    }
    function runIt(c) { if (!c) return; dlg.close(); setTimeout(() => c.run(), 0); }

    inp.addEventListener('input', render);
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) { e.preventDefault(); setActive(active + 1, true); }
      else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) { e.preventDefault(); setActive(active - 1, true); }
      else if (e.key === 'PageDown') { e.preventDefault(); setActive(active + 8, true); }
      else if (e.key === 'PageUp') { e.preventDefault(); setActive(active - 8, true); }
      else if (e.key === 'Enter') { e.preventDefault(); runIt(shown[active]); }
    });

    const dlg = L4N.dialog.open({ className: 'dlg--palette', label: 'Command palette', content, onClose: () => { current = null; } });
    current = dlg;
    render();
    inp.focus();
  }

  L4N.commands = commands;
  L4N.palette = { open, isOpen: () => !!current, close: () => current && current.close() };
})(window.L4N = window.L4N || {});
