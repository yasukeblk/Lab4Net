// exam.js (screen): the exam page (setup, a running exam, history), the running exam in the workspace, the clock,
// and the lock: other labs, lessons, practice and the sandbox wait while an exam runs.
(function (L4N) {
  'use strict';
  const { el, icon, clear } = L4N.dom;
  const ui = L4N.ui, E = () => L4N.exam;
  const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const left = c => Math.max(0, Math.ceil((c.deadline - Date.now()) / 1000));
  const cur = () => L4N.store.get().exam.current;
  const go = h => L4N.shell.go(h);

  function giveUp() {
    const c = cur(); if (!c) return;
    L4N.dialog.confirm({ title: 'Give up this exam?', body: 'It is recorded as not passed. Your labs are not affected.', ok: 'Give up', danger: true }).then(ok => {
      if (!ok) return;
      const ws = L4N.workspace.current();
      const results = ws && ws.exam ? L4N.sim.grade(ws.st) : (() => { const e = E().entry(c); try { return L4N.sim.grade(L4N.sim.open(e, { journal: c.journal })); } catch (x) { return []; } })();
      E().finish(results, { gaveUp: true });
      go('#/practice/exam');
      L4N.toast({ text: 'Exam given up: ' + results.filter(x => x[1]).length + ' of ' + results.length + ' checks passed.', kind: 'warn' });
    });
  }
  function start(mode, minutes, opts) {
    const r = E().begin(mode, minutes, opts);
    if (r.error) { L4N.toast({ text: r.error, kind: 'warn', action: E().running() ? { label: 'Resume exam', run: () => go('#/practice/exam/run') } : null }); return; }
    go('#/practice/exam/run');
  }
  E().startStage = s => start(s.check.mode === 'boss' ? 'boss' : 'sabotage', s.check.minutes || 15, { tag: 'stage:' + s.id });

  // ---- the lock ----
  L4N.guard = (r) => {
    if (!E().running() || !['lab', 'lesson', 'quiz', 'subnet', 'sandbox'].includes(r.screen)) return true;
    L4N.toast({ text: 'An exam is running. Finish it first.', kind: 'warn', actions: [{ label: 'Resume exam', run: () => go('#/practice/exam/run') }, { label: 'Give up', run: giveUp }] });
    return false;
  };

  // ---- the clock: a running exam ends when time runs out, open or not ----
  let clockEls = new Set();
  function clockChip() {
    const c = cur(), n = el('span', { class: 'chip chip--clock num', role: 'timer', 'aria-label': 'Time left' });
    const upd = () => { const cc = cur(); if (!cc) return; const s = left(cc); n.textContent = ''; n.classList.toggle('chip--warn', s < 120); if (s < 120) n.append(icon('clock')); n.append(mmss(s)); };
    n._upd = upd; upd(); clockEls.add(n);
    return n;
  }
  setInterval(() => {
    if (!L4N.store) return;   // the pop-out window has no store and no exams
    for (const n of clockEls) { if (!n.isConnected) clockEls.delete(n); else n._upd(); }
    const c = cur();
    if (!c || Date.now() < c.deadline) return;
    const ws = L4N.workspace.current();
    if (ws && ws.exam) { ws.timeUp(); return; }
    const h = E().settle();
    if (h) L4N.toast({ text: 'Your exam on ' + h.entry.base.short + ' ended while you were away: ' + h.passed + ' of ' + h.total + ' checks passed.', kind: h.cleared ? 'ok' : 'warn' });
  }, 1000);
  (L4N.afterBoot = L4N.afterBoot || []).push(() => {
    const h = E().settle();
    if (h) L4N.toast({ text: 'Your exam on ' + h.entry.base.short + ' ended while you were away: ' + h.passed + ' of ' + h.total + ' checks passed.', kind: h.cleared ? 'ok' : 'warn' });
  });

  // ---- the running exam, in the workspace ----
  function mountRun(root, r, ctx) {
    const c = cur();
    if (!c) { setTimeout(() => go('#/practice/exam'), 0); return; }
    const entry = E().entry(c);
    if (!entry) { E().set({ current: null }); L4N.toast({ text: 'That exam could not be rebuilt.', kind: 'bad' }); setTimeout(() => go('#/practice/exam'), 0); return; }
    let ended = false;
    const ov = {
      entry, journal: c.journal, exam: true,
      save: journal => { if (!ended && cur()) E().set({ current: Object.assign({}, cur(), { journal: journal.slice() }) }); },
      count: (res, line) => { const cc = cur(); if (!cc || ended || !line.trim()) return; const run = Object.assign({}, cc.run); run.cmds++; L4N.grade.count(run, line, res.lines); E().set({ current: Object.assign({}, cc, { run }) }); },
      status: () => [ui.chip(E().NAME[c.mode]), clockChip()],
      menu: () => ended ? [] : [{ label: 'Give up', icon: 'x-circle', danger: true, run: giveUp }],
      grade: ws => {
        const results = L4N.sim.grade(ws.st), pass = results.filter(x => x[1]).length, all = pass === results.length;
        if (ended) { ws.graded = Object.assign({}, ws.graded, { results, stale: false }); ws.tasksView.renderResults(); return results; }
        if (!all) {
          ws.graded = { results, stale: false, hideList: true, noNext: true, summary: pass + ' of ' + results.length + ' checks pass' };
          ws.tasksView.renderResults();
          L4N.toast({ text: pass + ' of ' + results.length + ' checks pass', kind: 'warn' });
          return results;
        }
        end(ws, results, 'Exam passed');
        return results;
      }
    };
    function end(ws, results, word) {
      ended = true;
      const h = E().finish(results);
      const pass = results.filter(x => x[1]).length;
      ws.graded = { results, stale: false, noNext: true, grade: h && h.grade, summary: (h && h.cleared ? 'Exam passed' + (h.grade ? ' · Grade ' + h.grade : '') : word + ' · ' + pass + ' of ' + results.length + ' checks pass'), exam: h };
      ws.tasksView.renderResults();
      L4N.shell.topbar.setStatus(ui.chip(h && h.cleared ? 'Passed' : 'Not passed', h && h.cleared ? 'chip--done' : 'chip--failed', h && h.cleared ? 'check-circle' : 'x-circle'));
      L4N.toast({ text: ws.graded.summary, kind: h && h.cleared ? 'ok' : 'warn', action: { label: 'New exam', run: () => go('#/practice/exam') } });
    }
    const cleanup = L4N.workspace.mount(root, r, ctx, ov);
    const ws = L4N.workspace.current();
    ws.timeUp = () => { if (!ended) end(ws, L4N.sim.grade(ws.st), "Time's up"); };
    // the end shows passed or not, the grade, time used, every check, and the faults that were hidden
    ws.resultExtras = [g => {
      if (!g.exam) return null;
      const h = g.exam;
      return el('div', { class: 'stack' }, el('p', { class: 'muted num', text: 'Time used ' + mmss(h.secs) + ' of ' + h.minutes + ':00' }),
        ui.callout({ title: 'What was wrong', body: [h.faults && h.faults.length ? el('ul', { class: 'reader__list' }, h.faults.map(f => el('li', { text: String(f.desc).replace(/^./, x => x.toUpperCase()) }))) : el('p', { text: h.entry && h.entry.lab.kind === 'incident' ? 'See the root cause above.' : 'Nothing was broken: this exam was a build from scratch.' })] }),
        ui.button({ label: 'New exam', kind: 'primary', href: '#/practice/exam' }));
    }];
    ws.tasksView.rebuild();
    return cleanup;
  }

  // ---- the exam page ----
  function historyTable(rows) {
    if (!rows.length) return ui.empty({ icon: 'clock', what: 'No exams yet.', todo: 'Your last 40 results show here.' });
    return el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
      el('thead', {}, el('tr', {}, ['Date', 'Mode', 'Lab', 'Result', 'Grade', 'Time'].map(t => el('th', { scope: 'col', text: t })))),
      el('tbody', {}, rows.slice().reverse().map(h => { const l = L4N.data.lab(h.base); return el('tr', {},
        el('td', { text: h.at ? new Date(h.at).toLocaleDateString() : '' }), el('td', { text: h.tag ? 'Stage check' : E().NAME[h.mode] }), el('td', { text: l ? l.short : h.base }),
        el('td', {}, h.cleared ? ui.chip('Passed', 'chip--done', 'check-circle') : ui.chip(h.passed + '/' + h.total, 'chip--failed', 'x-circle')),
        el('td', {}, h.grade ? ui.gradeChip(h.grade) : '–'), el('td', { class: 'num', text: mmss(h.secs) })); }))));
  }
  L4N.examHistory = historyTable;
  function mountPage(root) {
    const page = el('div', { class: 'page' }, el('h1', { class: 'page__title', 'data-heading': '', tabindex: '-1', text: 'Exam' }),
      el('p', { class: 'page__lead', text: 'Timed fault-finding with no help: no step-by-step, no why, no walkthrough, no clues and no command list. An exam never changes your labs.' }));
    const c = cur();
    if (c) {
      const e = E().entry(c);
      page.append(el('section', { class: 'card home__card' }, el('div', { class: 'home__card-body' }, el('span', { class: 'label-caps', text: 'Running' }),
        el('h2', { class: 'section__title', text: (E().NAME[c.mode]) + ': ' + (e ? e.base.short : '') }), el('div', { class: 'hstack' }, clockChip())),
        el('div', { class: 'hstack' }, ui.button({ label: 'Resume', kind: 'primary', size: 'lg', icon: 'play', href: '#/practice/exam/run' }), ui.button({ label: 'Give up', kind: 'danger', onClick: giveUp }))));
    } else {
      let mode = 'sabotage', minutes = 20;
      const modeSeg = ui.segmented({ label: 'Mode', value: mode, onChange: v => { mode = v; timeSeg.hidden = v === 'daily'; },
        options: [{ value: 'sabotage', label: 'Fault-find' }, { value: 'lab', label: 'Build' }, { value: 'incident', label: 'Incident' }, { value: 'daily', label: "Today's" }] });
      const timeSeg = ui.segmented({ label: 'Time', value: '20', onChange: v => { minutes = +v; }, options: [{ value: '10', label: '10 min' }, { value: '20', label: '20 min' }, { value: '30', label: '30 min' }] });
      page.append(el('section', { class: 'card setup', 'aria-label': 'Start an exam' },
        el('div', { class: 'setrow' }, el('div', { class: 'setrow__label' }, el('b', { text: 'Mode' }), el('span', { text: 'Fault-find: a finished lab with one or two hidden faults. Build: a lab from scratch. Incident: a broken network. Today\'s: the same two-fault exam for everyone today.' })), modeSeg),
        el('div', { class: 'setrow' }, el('div', { class: 'setrow__label' }, el('b', { text: 'Time' }), el('span', { text: "Today's exam always has 20 minutes." })), timeSeg),
        el('div', { class: 'hstack', style: 'margin-top:12px' }, ui.button({ label: 'Start exam', kind: 'primary', size: 'lg', icon: 'play', onClick: () => start(mode, mode === 'daily' ? 20 : minutes) }))));
    }
    page.append(el('section', { class: 'section' }, el('h2', { class: 'section__title', text: 'History' }), historyTable(L4N.store.get().exam.history)));
    root.append(page);
  }

  E().card = () => {
    const c = cur(), e = E().entry(c);
    return el('section', { class: 'card home__card' }, el('div', { class: 'home__card-body' }, el('span', { class: 'label-caps', text: 'Exam running' }),
      el('h2', { class: 'section__title', text: E().NAME[c.mode] + ': ' + (e ? e.base.short : '') }), clockChip()),
      ui.button({ label: 'Resume exam', kind: 'primary', size: 'lg', icon: 'play', href: '#/practice/exam/run' }));
  };

  L4N.commands.add(() => {
    const out = [{ id: 'ex-start', group: 'Practice', title: 'Start exam…', icon: 'clock', run: () => go('#/practice/exam') },
      { id: 'ex-today', group: 'Practice', title: "Today's exam", icon: 'clock', run: () => start('daily', 20) }];
    if (E().running()) out.push({ id: 'ex-resume', group: 'Practice', title: 'Resume exam', icon: 'play', run: () => go('#/practice/exam/run') });
    return out;
  });
  L4N.screens.register('exam', { nav: 'practice', title: () => 'Exam', crumbs: () => [{ label: 'Practice', href: '#/practice' }, { label: 'Exam' }], mount: mountPage });
  L4N.screens.register('examrun', { nav: 'practice', title: () => 'Exam running',
    crumbs: () => { const c = cur(), e = c && E().entry(c); return [{ label: 'Practice', href: '#/practice' }, { label: 'Exam', href: '#/practice/exam' }, { label: e ? e.base.short : 'Exam' }]; }, mount: mountRun });
  E().start = start; E().giveUp = giveUp;
})(window.L4N = window.L4N || {});
