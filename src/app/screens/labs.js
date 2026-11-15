// labs.js: the Labs list (section 5.3): grouped by Path, Type or Exam topic, filtered, with a detail pane.
(function (L4N) {
  'use strict';
  const { el, icon, clear, trusted } = L4N.dom;
  const ui = L4N.ui, stats = () => L4N.stats;
  const TYPE_NAME = { build: 'Build', incident: 'Incident', capstone: 'Capstone' };
  const objName = id => (typeof CCNA_OBJECTIVES !== 'undefined' && CCNA_OBJECTIVES[id]) || '';
  const text = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ');
  let filters = { q: '', group: 'path', status: 'all', type: 'all' }, lastSelected = null;

  function matches(l, q) {
    if (!q) return true;
    const lab = l.lab, objs = (lab.ccna || []).map(o => o + ' ' + objName(o)).join(' ');
    return L4N.search.score(q, l.title + ' ' + l.idText, text(lab.brief) + ' ' + lab.group + ' ' + objs) > 0;
  }
  const passes = l => (filters.status === 'all' || stats().labStatus(l.slug) === filters.status) && (filters.type === 'all' || l.kind === filters.type) && matches(l, filters.q);

  function rowOf(l) {
    const rec = L4N.store.get().labs[l.slug] || {}, objs = l.lab.ccna || [], w = L4N.work.get(l.slug);
    const meta = objs.slice(0, 2).map(o => ui.objChip(o, objName(o)));
    if (objs.length > 2) meta.push(ui.chip('+' + (objs.length - 2)));
    if (rec.grade) meta.push(ui.gradeChip(rec.grade));
    const st = stats().labStatus(l.slug);
    // A finished lab says so; only a lab in progress counts its ticked tasks.
    const ticked = w ? (w.tasks || []).filter(Boolean).length : 0;
    meta.push(el('span', { class: 'num', text: st === 'done' ? 'Done' : ticked + '/' + l.lab.tasks.length }));
    return { key: l.slug, status: st, idText: l.idText, title: l.short, meta, entry: l,
      aria: l.idText + ', ' + l.short + ', ' + { todo: 'to do', progress: 'in progress', done: 'done' }[st] + (rec.grade ? ', grade ' + rec.grade : '') };
  }

  function groups() {
    const all = L4N.data.labs.filter(passes);
    if (filters.group === 'type') {
      return ['build', 'incident', 'capstone'].map(k => { const rows = all.filter(l => l.kind === k).map(rowOf); return { label: { build: 'Build labs', incident: 'Incidents', capstone: 'Capstones' }[k], count: rows.length, rows }; });
    }
    if (filters.group === 'topic') {
      return stats().domains().map(d => { const rows = all.filter(l => stats().domainOf((l.lab.ccna || [])[0]) === d.id).map(rowOf);
        return { label: d.id + ' ' + d.name, count: rows.filter(r => r.status === 'done').length + '/' + rows.length, rows }; });
    }
    // Path: the eight stages in order, each ending with its stage check
    return stats().stages().map(s => {
      const rows = s.labs.filter(passes).map(rowOf);
      if (s.check && filters.type === 'all' && filters.status !== 'progress' && !filters.q) {
        const ck = s.check, st = ck.passed ? 'done' : 'todo';
        if (filters.status === 'all' || filters.status === st)
          rows.push({ key: 'stage:' + s.id, icon: ck.locked ? 'lock' : ck.passed ? 'check-circle' : 'flag', iconClass: ck.passed ? 'st--done' : '', idText: 'CHECK', title: 'Stage check',
            meta: [ck.locked ? el('span', { text: 'Finish ' + ck.need + ' labs to unlock' }) : el('span', { text: ck.mode === 'incident' ? 'Incident' : ck.minutes + ' min' })], stage: s,
            aria: 'Stage check for ' + s.title + (ck.locked ? ', locked' : ck.passed ? ', passed' : '') });
      }
      const bar = el('span', { class: 'list__bar' }, el('span', { class: 'bar__track' }, el('span', { class: 'bar__fill', style: { width: (s.total ? Math.round(s.done / s.total * 100) : 0) + '%' } })));
      return { label: s.title, count: s.done + '/' + s.total, rows, extra: bar };
    });
  }

  // ---- the detail pane ----
  function stillMap(entry) {
    const st = L4N.sim.open(entry, null);
    st.sel = null;
    const m = L4N.mapCore.create({ st, selectDevice() {} }, { interactive: false, label: 'Network map of ' + entry.title, maxScale: 1.2 });
    return m;
  }
  let mapInst = null;
  function detailLab(box, l) {
    clear(box);
    if (mapInst) { mapInst.destroy(); mapInst = null; }
    const lab = l.lab, rec = L4N.store.get().labs[l.slug] || {}, st = stats().labStatus(l.slug), lesson = L4N.data.lessonFor(l);
    const devs = Object.keys(lab.pos || {}).length;
    const actions = el('div', { class: 'hstack' }, ui.button({ label: 'Open lab', kind: 'primary', kbd: 'enter', href: L4N.router.href('lab', l.slug) }));
    if (L4N.work.get(l.slug)) actions.append(ui.button({ label: 'Reset', kind: 'danger', icon: 'reset', onClick: async () => {
      if (await L4N.dialog.confirm({ title: 'Reset this lab?', body: 'Your commands and ticks for this lab are deleted. Finished labs and grades are kept.', ok: 'Reset lab', danger: true })) { L4N.work.remove(l.slug); L4N.work.flush(); refresh(); }
    } }));
    box.append(
      el('div', { class: 'detail__head' }, el('span', { class: 'row__id', text: l.idText }), el('h2', { class: 'detail__title', text: l.title })),
      el('div', { class: 'hstack' }, ui.chip(TYPE_NAME[l.kind]), ui.statusChip(st), rec.grade ? ui.gradeChip(rec.grade) : null),
      trusted(lab.brief || '', 'p', { class: 'detail__brief' }),
      el('ul', { class: 'detail__objs' }, (lab.ccna || []).map(o => el('li', {}, ui.objChip(o, objName(o)), el('span', { text: objName(o) })))),
      el('p', { class: 'hint num', text: lab.tasks.length + ' tasks · ' + devs + ' devices' }));
    const mapBox = el('div', { class: 'detail__map' });
    box.append(mapBox);
    try { mapInst = stillMap(l); mapBox.append(mapInst.body); requestAnimationFrame(() => mapInst && mapInst.layout()); } catch (e) { console.error(e); }
    if (lesson) box.append(el('p', {}, el('a', { href: L4N.router.href('lesson', lesson.slug) }, icon('lessons'), ' Lesson: ' + lesson.title)));
    box.append(actions);
  }
  function detailStage(box, s) {
    clear(box);
    if (mapInst) { mapInst.destroy(); mapInst = null; }
    const ck = s.check;
    const what = ck.mode === 'incident' ? 'Fix ' + (ck.incident ? ck.incident.short : 'the incident') + '. The stage check is passed when that incident is done.'
      : ck.mode === 'boss' ? 'A fault-find exam with three hidden faults across this stage, ' + ck.minutes + ' minutes on the clock. No help.'
        : 'A fault-find exam on one of this stage\'s labs, with hidden faults and ' + ck.minutes + ' minutes on the clock. No help.';
    box.append(el('div', { class: 'detail__head' }, el('span', { class: 'row__id', text: s.group }), el('h2', { class: 'detail__title', text: s.title })),
      el('p', { class: 'detail__brief', text: s.complete && s.outro ? s.outro : s.story }),
      el('h3', { class: 'label-caps', text: 'Stage check' }), el('p', { text: what }));
    if (ck.locked) box.append(ui.callout({ icon: 'lock', body: ['Finish ' + ck.need + ' labs in this stage to unlock the stage check (' + s.done + ' done).'] }));
    else if (ck.passed) box.append(ui.callout({ icon: 'check-circle', body: ['Passed.'] }));
    if (!ck.locked) box.append(el('div', { class: 'hstack' }, ui.button({ label: ck.mode === 'incident' ? 'Open the incident' : 'Start stage check', kind: 'primary', onClick: () => startCheck(s) })));
  }
  function startCheck(s) {
    const ck = s.check;
    if (ck.locked) return;
    if (ck.mode === 'incident' && ck.incident) { L4N.shell.go(L4N.router.href('lab', ck.incident.slug)); return; }
    if (L4N.exam && L4N.exam.startStage) L4N.exam.startStage(s);
    else L4N.toast({ text: 'Stage checks open with the exam.', kind: 'info' });
  }

  let refresh = () => {};
  function mount(root, r, ctx) {
    const wide = () => window.innerWidth >= 1280;
    const filter = ui.searchInput({ placeholder: 'Filter labs', label: 'Filter labs', value: filters.q, onInput: v => { filters.q = v; render(); } });
    const inputEl = filter.querySelector('input');
    inputEl.setAttribute('data-kbd', '/'); inputEl.setAttribute('data-tip', 'Filter labs');
    inputEl.addEventListener('keydown', e => { if (e.key === 'Escape' && inputEl.value) { e.preventDefault(); inputEl.value = ''; filters.q = ''; render(); } else if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); list.focus(); if (e.key === 'Enter') list.open(); } });
    const sel = (label, key, opts) => ui.select({ label, value: filters[key], options: opts, onChange: v => { filters[key] = v; render(); } });
    ctx.topbar.setActions(el('div', { class: 'filters' }, filter,
      sel('Group by', 'group', [{ value: 'path', label: 'Group: Path' }, { value: 'type', label: 'Group: Type' }, { value: 'topic', label: 'Group: Exam topic' }]),
      sel('Status', 'status', [{ value: 'all', label: 'Status: All' }, { value: 'todo', label: 'To do' }, { value: 'progress', label: 'In progress' }, { value: 'done', label: 'Done' }]),
      sel('Type', 'type', [{ value: 'all', label: 'Type: All' }, { value: 'build', label: 'Build' }, { value: 'incident', label: 'Incident' }, { value: 'capstone', label: 'Capstone' }])));
    ctx.filter = inputEl;

    const detail = el('aside', { class: 'lst__detail', 'aria-label': 'Lab details', 'aria-live': 'polite' });
    const list = ui.list({
      label: 'Labs', class: 'lst__list', selected: lastSelected, groups: groups(),
      detail: () => wide(),
      onSelect: row => { lastSelected = row.key; if (wide()) row.stage ? detailStage(detail, row.stage) : detailLab(detail, row.entry); },
      onOpen: row => { if (row.stage) { if (wide()) detailStage(detail, row.stage); else startCheck(row.stage); return; } L4N.shell.go(L4N.router.href('lab', row.key)); },
      empty: () => ui.empty({ icon: 'filter', what: 'No labs match.', todo: 'Clear the filters.', action: { label: 'Clear filters', onClick: () => { filters = { q: '', group: filters.group, status: 'all', type: 'all' }; L4N.shell.go('#/labs'); } } })
    });
    ctx.list = list;
    const head = el('h1', { class: 'sr-only', 'data-heading': '', tabindex: '-1', text: 'Labs' });
    const layout = el('div', { class: 'lst' }, el('div', { class: 'lst__main' }, head, list.el), detail);
    root.append(layout);

    function render() {
      list.render(groups());
      const s = list.selected();
      detail.hidden = !wide();
      if (s && wide()) s.stage ? detailStage(detail, s.stage) : detailLab(detail, s.entry);
      else if (wide()) { clear(detail); detail.append(ui.empty({ icon: 'labs', what: 'No lab selected.', todo: 'Choose a lab to see its details.' })); }
    }
    refresh = render;
    render();
    const onResize = () => { const w = wide(); if (w !== detail.hidden) return; render(); };
    window.addEventListener('resize', onResize);
    const unsub = L4N.store.subscribe((s, p) => { if (s.labs !== p.labs) render(); });
    return () => { window.removeEventListener('resize', onResize); unsub(); if (mapInst) { mapInst.destroy(); mapInst = null; } };
  }

  // palette: "Open lab: <title>" for all 77, matching group, objective number and name
  L4N.commands.add(() => L4N.data.labs.map(l => ({
    id: 'open-' + l.slug, group: 'Labs', title: 'Open lab: ' + l.short, subtitle: l.idText + ' · ' + l.lab.group, icon: 'labs',
    keywords: l.title + ' ' + l.lab.group + ' ' + (l.lab.ccna || []).map(o => o + ' ' + objName(o)).join(' '),
    run: () => L4N.shell.go(L4N.router.href('lab', l.slug))
  })));

  L4N.screens.register('labs', { title: () => 'Labs', mount });
  L4N.labsScreen = { filters: () => filters, reset() { filters = { q: '', group: 'path', status: 'all', type: 'all' }; } };
})(window.L4N = window.L4N || {});
