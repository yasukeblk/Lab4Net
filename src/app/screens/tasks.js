// tasks.js: the Tasks panel (section 5.4). Lab task text, briefs and "why" text are repo content (dom.trusted);
// everything else is text.
(function (L4N) {
  'use strict';
  const { el, icon, clear, trusted, id } = L4N.dom;
  const ui = L4N.ui;

  function objChips(lab) {
    return (lab.ccna || []).slice(0, 4).map(o => ui.objChip(o, (typeof CCNA_OBJECTIVES !== 'undefined' && CCNA_OBJECTIVES[o]) || ''));
  }

  // createTasks(ws): ws = {st, entry, tasks: [bool], onTick(i, v), graded, gradeNow(), extras}
  function createTasks(ws) {
    const st = ws.st, lab = st.lab, entry = st.entry;
    const body = el('div', { class: 'tasks__body' });
    const countEl = el('span', { class: 'tasks__count num' });
    const head = el('div', { class: 'pane__head' }, el('h2', { class: 'pane__title' }, icon('list-checks'), 'Tasks'), el('span', { class: 'spacer' }), countEl);
    const root = el('section', { class: 'pane tasks', 'aria-label': 'Tasks', id: 'ws-tasks' }, head, el('div', { class: 'pane__body', tabindex: '-1' }, body));
    const results = el('section', { class: 'results', 'aria-label': 'Results', 'aria-live': 'polite', id: id('results') });
    const taskNodes = [];

    function updateCount() {
      const n = ws.tasks.filter(Boolean).length;
      countEl.textContent = n + ' of ' + lab.tasks.length + ' done';
    }

    function build() {
      clear(body);
      // 1. the brief, with objective chips
      body.append(el('div', {}, trusted(lab.brief || '', 'p', { class: 'tasks__brief' }), el('div', { class: 'tasks__chips' }, objChips(lab))));
      // 2. incidents
      if (entry.kind === 'incident') body.append(ui.callout({ kind: 'warn', icon: 'alert', body: ['This network worked until something changed. Find it, make the smallest repair, keep everything else working.'] }));
      if (ws.extras && ws.extras.top) body.append(ws.extras.top());
      // 3. address plan
      if (lab.addr && lab.addr.length) {
        body.append(el('details', { class: 'sect', open: true },
          el('summary', {}, icon('chevron-down', 'icon--chev'), el('span', { class: 'label-caps', text: 'Address plan' })),
          el('div', { class: 'table-wrap' }, el('table', { class: 'table addr' },
            el('thead', {}, el('tr', {}, el('th', { text: 'Device', scope: 'col' }), el('th', { text: 'Interface', scope: 'col' }), el('th', { text: 'Address', scope: 'col' }))),
            el('tbody', {}, lab.addr.map(r => el('tr', {}, el('td', { text: String(r[0]) }), el('td', { text: String(r[1]) }), el('td', { text: String(r[2]) }))))))));
      }
      // 4. step-by-step row (Phase 4 adds the switch)
      if (ws.extras && ws.extras.stepRow) body.append(ws.extras.stepRow());
      // 5. the tasks
      const list = el('ol', { class: 'tasklist', 'aria-label': 'Tasks' });
      taskNodes.length = 0;
      lab.tasks.forEach((t, i) => {
        const textId = id('task');
        const cb = ui.checkbox({ checked: !!ws.tasks[i], aria: 'Task ' + (i + 1) + ' done', onChange: v => { ws.tasks[i] = v; li.classList.toggle('is-ticked', v); updateCount(); if (ws.onTick) ws.onTick(i, v); } });
        const more = el('div', { class: 'task__more' });
        if (lab.why && lab.why[i] && !(ws.hideHelp && ws.hideHelp())) {
          more.append(el('details', { class: 'why' }, el('summary', {}, icon('chevron-right'), 'Why'), trusted(lab.why[i], 'div', { class: 'why__text' })));
        }
        if (ws.extras && ws.extras.taskExtra) { const x = ws.extras.taskExtra(i); if (x) more.append(x); }
        const li = el('li', { class: ['task', ws.tasks[i] && 'is-ticked'] }, cb, trusted(t, 'div', { class: 'task__text', id: textId }), more);
        cb.querySelector('input').setAttribute('aria-describedby', textId);
        taskNodes.push(li); list.append(li);
      });
      body.append(list);
      if (ws.extras && ws.extras.afterTasks) body.append(ws.extras.afterTasks());
      // 7. results
      body.append(results);
      if (ws.extras && ws.extras.bottom) body.append(ws.extras.bottom());
      renderResults();
      updateCount();
    }

    function renderResults() {
      clear(results);
      const g = ws.graded;
      if (!g) { results.hidden = true; return; }
      results.hidden = false;
      const pass = g.results.filter(x => x[1]).length, all = g.results.length, done = pass === all;
      results.classList.toggle('is-stale', !!g.stale);
      results.append(el('h3', { class: 'label-caps', text: 'Results' }));
      if (g.stale) results.append(el('p', { class: 'results__stale' }, icon('alert'), 'Commands run since grading. Grade again.'));
      const sum = done ? 'Lab complete' + (g.grade ? ' · Grade ' + g.grade : '') : pass + ' of ' + all + ' checks pass';
      results.append(el('p', { class: ['results__sum', done ? 'is-ok' : 'is-bad'] }, icon(done ? 'check-circle' : 'x-circle'), sum));
      if (!g.hideList) {
        results.append(el('ul', { class: 'results__list' }, g.results.map(([t, ok]) => el('li', { class: ['check-row', ok ? 'is-ok' : 'is-bad'] },
          icon(ok ? 'check' : 'x'), el('span', { class: 'sr-only', text: ok ? 'Passes: ' : 'Fails: ' }), el('span', { text: t })))));
      }
      if (done && entry.kind === 'incident' && lab.lesson && !g.hideList) results.append(ui.callout({ title: 'Root cause', body: [trusted(lab.lesson, 'div')] }));
      if (done && ws.next && ws.next()) {
        const n = ws.next();
        results.append(el('div', {}, ui.button({ label: 'Next lab: ' + n.short, icon: 'arrow-right', kind: 'secondary', href: L4N.router.href('lab', n.slug) })));
      }
    }

    build();
    return { el: root, rebuild: build, renderResults, focus() { root.querySelector('.pane__body').focus(); }, results };
  }

  L4N.tasksView = { create: createTasks };
})(window.L4N = window.L4N || {});
