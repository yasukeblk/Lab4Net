// workspace.js: the lab workspace (section 5.4): Tasks, Map and Console, the top bar, grading and saved work.
(function (L4N) {
  'use strict';
  const { el, icon, clear } = L4N.dom;
  const ui = L4N.ui, sim = L4N.sim, G = L4N.grade;
  let current = null;
  const waiters = [];

  // ---- progress helpers ----
  const labRec = slug => L4N.store.get().labs[slug] || null;
  function setLab(slug, patch) {
    L4N.store.set(s => { const labs = Object.assign({}, s.labs); labs[slug] = Object.assign({ done: false }, labs[slug], patch); return { labs }; });
  }
  function status(slug) {
    const L = labRec(slug);
    if (L && L.done) return 'done';
    const w = L4N.work.get(slug);
    return w && w.journal && w.journal.length ? 'progress' : 'todo';
  }
  L4N.labStatus = status;
  L4N.setLab = setLab;

  function touch(slug) {
    L4N.store.set(s => {
      const recent = [slug].concat((s.ui.recent || []).filter(x => x !== slug)).slice(0, 3);
      return { ui: Object.assign({}, s.ui, { recent, lastLab: slug }) };
    });
  }

  function nextLab(entry) {
    const order = L4N.labsOrder ? L4N.labsOrder() : L4N.data.labs;
    const i = order.indexOf(entry);
    for (let k = 1; k <= order.length; k++) { const n = order[(i + k) % order.length]; if (status(n.slug) !== 'done') return n; }
    return null;
  }

  // ---- mounting ----
  // ov (an exam): {entry, journal, save(journal), count(res, line), grade(ws), status(), menu()}
  function mount(root, r, ctx, ov) {
    const entry = ov ? ov.entry : L4N.data.lab(r.slug);
    if (!entry) { L4N.toast({ text: 'That link is out of date.', kind: 'warn' }); setTimeout(() => L4N.shell.go('#/labs'), 0); return; }
    let saved = ov ? { journal: ov.journal, tasks: [] } : L4N.work.get(entry.slug), st;
    const restoreFailed = () => { L4N.toast({ text: 'Could not restore this lab. A fresh topology is ready.', kind: 'warn' }); if (!ov) L4N.work.remove(entry.slug); saved = null; };
    if (saved && saved.corrupt) restoreFailed();
    try { st = sim.open(entry, saved); }
    catch (e) { console.error(e); restoreFailed(); st = sim.open(entry, null); }

    const ws = {
      st, entry, slug: entry.slug,
      tasks: saved ? saved.tasks.slice(0, entry.lab.tasks.length) : [],
      // the tasks whose hint or commands were opened (each costs points once; see grade.js)
      reveal: { hint: (saved && saved.reveal && saved.reveal.hint) || [], cmds: (saved && saved.reveal && saved.reveal.cmds) || [] },
      graded: null, exam: !!(ov && ov.exam),
      hooks: [],
      next: () => nextLab(entry),
      isDone: () => !ov && !!(labRec(entry.slug) || {}).done
    };
    // A lab finished before grading ticked the tasks shows them ticked. Worked out for display only: nothing is
    // written until the learner works in the lab again.
    if (!ov && (labRec(entry.slug) || {}).done && !ws.tasks.some(Boolean)) ws.tasks = entry.lab.tasks.map(() => true);
    // The map height this network needs at width w, fitted the way the map fits it (side padding 56, top 34,
    // bottom 44, scale at most 2), plus room for the labels. The sandbox sizes its own map.
    if (!(ov && ov.mapOpts)) ws.mapWant = w => {
      const pos = st.lab.pos || {}, pts = st.devs.map(n => pos[n]).filter(Boolean);
      if (!pts.length) return null;
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const bw = Math.max(1, Math.max(...xs) - Math.min(...xs)), bh = Math.max(...ys) - Math.min(...ys);
      const s = Math.max(0.25, Math.min((w - 112) / bw, 2));
      return Math.round(bh * s + 34 + 44 + 24);
    };
    current = ws;

    // a run counts toward a grade only if it started from a fresh lab (the old rule)
    const L = labRec(entry.slug);
    if (!ov && (!st.journal.length || !(L && L.run))) setLab(entry.slug, { run: { errs: 0, checks: 0, help: false, walk: false, valid: !st.journal.length, done: false, cmds: 0 } });
    if (!ov) touch(entry.slug);

    ws.save = ov ? () => ov.save(st.journal) : () => L4N.work.put(entry.slug, Object.assign({ journal: st.journal, tasks: ws.tasks },
      ws.reveal.hint.length || ws.reveal.cmds.length ? { reveal: ws.reveal } : {}));

    // ---- help: step-by-step, walkthrough, clues (each one marks the run, as the old rank rules did) ----
    const capstone = entry.kind === 'capstone';
    const rec0 = labRec(entry.slug) || {};
    ws.guide = ov ? false : capstone ? rec0.guide === true : !!L4N.store.get().settings.guideDefault;
    ws.walk = false;
    ws.clues = rec0.clues || 0;
    ws.hints = Object.assign({}, L4N.store.get().ui.hints);
    ws.hideHelp = () => !!(ws.exam);
    function markRun(patch) {
      const rec = labRec(entry.slug), run = rec && rec.run ? Object.assign({}, rec.run) : null;
      if (!run || !run.valid || run.done) return;
      let changed = false;
      for (const k in patch) if (!run[k]) { run[k] = patch[k]; changed = true; }
      if (changed) setLab(entry.slug, { run });
    }
    ws.markRun = markRun;
    // help for one task: its hint ('hint') or its commands ('cmds'). Shown from then on, and counted once in the run.
    ws.reveal1 = (kind, i) => {
      const list = ws.reveal[kind];
      if (!list || list.includes(i)) return;
      list.push(i); ws.save();
      const rec = labRec(entry.slug), run = rec && rec.run ? Object.assign({}, rec.run) : null;
      if (run && run.valid && !run.done) { const k = kind === 'hint' ? 'hints' : 'shown'; run[k] = (run[k] || 0) + 1; setLab(entry.slug, { run }); }
      ws.tasksView.rebuild(); ws.sync();
    };
    ws.setGuide = v => {
      ws.guide = !!v;
      if (capstone) setLab(entry.slug, { guide: ws.guide });
      else L4N.setSetting({ guideDefault: ws.guide });
      if (ws.guide) markRun({ help: true });
      // Once step-by-step has been used, the tip that points to it has done its job.
      if (ws.guide && ws.hints && !ws.hints.stepTip) ws.dismissHint('stepTip');
      ws.tasksView.rebuild();
      ws.sync();
    };
    ws.setWalk = v => {
      ws.walk = !!v;
      if (ws.walk) markRun({ walk: true });
      ws.tasksView.rebuild();
      ws.sync();
      if (ws.walk) { const w = ws.tasksView.el.querySelector('.walk'); if (w) w.scrollIntoView({ block: 'start' }); }
    };
    ws.revealClue = () => {
      if (entry.kind !== 'incident' || ws.clues >= 3) return;
      ws.clues++;
      setLab(entry.slug, { clues: ws.clues });
      ws.tasksView.rebuild();
      ws.sync();
    };
    ws.stepTo = (dev, cmd) => {
      if (!st.net.devs[dev]) return;
      if (dev !== st.sel) ws.console.select(dev);
      ws.console.input.value = cmd;
      if (ws.panes && ws.panes.isPhone()) ws.panes.showPhone('console');
      ws.console.focus();
      const n = ws.console.input.value.length; ws.console.input.setSelectionRange(n, n);
    };
    ws.dismissHint = k => { ws.hints[k] = true; L4N.store.set(s => ({ ui: Object.assign({}, s.ui, { hints: Object.assign({}, s.ui.hints, { [k]: true }) }) })); };
    ws.sync = () => { for (const f of ws.syncHooks || []) f(); };
    if (ws.guide) markRun({ help: true });
    ws.onTick = () => { ws.save(); if (ws.onLayout) ws.onLayout(); ws.sync(); };
    ws.selectDevice = (dev, focus) => { ws.console.select(dev); if (focus) ws.console.focus(); };
    ws.onSelect = () => { if (ws.map) ws.map.redraw(); if (ws.tasksView) ws.tasksView.refreshCommands(); };
    ws.onCommand = (res, line, dev) => {
      if (ov) { if (res.ran) ov.count(res, line); }
      else if (res.ran) {
        const rec = labRec(entry.slug), run = rec && rec.run ? Object.assign({}, rec.run) : null;
        if (run && run.valid && !run.done && line.trim()) { run.cmds = (run.cmds || 0) + 1; G.count(run, line, res.lines); setLab(entry.slug, { run }); }
      }
      if (ws.guide) markRun({ help: true });
      if (ws.graded && !ws.graded.stale) { ws.graded.stale = true; ws.tasksView.renderResults(); ws.sync(); }
      ws.tasksView.refreshCommands();
      autoTick(true);
      ws.save();
      refreshStatus();
      if (ws.map) ws.map.update(res, dev);
      if (res.trace) { ws.trace.render(res.trace); if (ws.panes && ws.panes.isPhone()) ws.console.showResult(res.trace, () => ws.panes.showPhone('map')); }
      else if (res.ran) ws.console.showResult(null);
      for (const h of ws.hooks) h(res, line, dev);
    };

    ws.grade = () => {
      if (ov) return ov.grade(ws);
      const results = sim.grade(st);
      const done = results.every(x => x[1]);
      let letter = null;
      if (done) {
        const rec = labRec(entry.slug) || {};
        const run = rec.run ? Object.assign({}, rec.run) : null;
        const patch = { done: true, doneAt: rec.doneAt || Date.now() };
        if (run && run.valid && !run.done && run.cmds > 0) {
          run.done = true; run.clues = rec.clues || 0;
          letter = G.letter(G.score(run));
          patch.grade = G.better(rec.grade, letter);
          patch.run = run;
        }
        setLab(entry.slug, patch);
        letter = letter || (labRec(entry.slug) || {}).grade || null;
        // Every check passed, so every task is done: tick them all and keep it.
        ws.tasks = entry.lab.tasks.map(() => true);
        ws.save();
      }
      ws.graded = { results, stale: false, grade: letter };
      if (done) ws.tasksView.rebuild(); else ws.tasksView.renderResults();
      if (ws.onLayout) ws.onLayout();
      refreshStatus();
      ws.sync();
      const pass = results.filter(x => x[1]).length;
      const n = done && ws.next();
      if (done) L4N.toast({ text: 'Lab complete' + (letter ? ' · Grade ' + letter : ''), kind: 'ok', action: n ? { label: 'Next lab', run: () => L4N.shell.go(L4N.router.href('lab', n.slug)) } : null });
      else L4N.toast({ text: pass + ' of ' + results.length + ' checks pass', kind: 'warn' });
      ws.tasksView.results.scrollIntoView({ block: 'nearest' });
      return results;
    };

    ws.reset = async () => {
      const ok = await L4N.dialog.confirm({ title: 'Reset this lab?', body: 'Your commands and ticks for this lab are deleted and the network goes back to the start. Finished labs and grades are kept.', ok: 'Reset lab', danger: true });
      if (!ok) return;
      L4N.work.remove(entry.slug);
      const rec = labRec(entry.slug) || {};
      setLab(entry.slug, { run: { errs: 0, checks: 0, help: false, walk: false, valid: true, done: false, cmds: 0 }, clues: 0, done: !!rec.done });
      L4N.shell.go(L4N.router.href('lab', entry.slug));
    };

    // ---- the frame ----
    ws.maximise = () => ws.panes.toggle('map');
    ws.console = L4N.consoleView.create(ws);
    // Tasks that tick themselves (sim.taskStatus, src/data/task-checks.js): checked when the lab opens and after every
    // command. Once done, a task stays ticked, like a checklist, even when a later task breaks something on purpose
    // (a failover test); Grade still checks the whole network. Not in exams, which give no help.
    ws.auto = [];
    // The business services this lab keeps running, as lights in the map head that go green as their checks pass.
    // Updated in place, so a service that comes up as you type pulses once (is-new) even while you keep typing;
    // ones already up when the lab opens don't.
    const svcs = el('ul', { class: 'svcs', 'aria-label': 'Business services' });
    let lights = null;
    function autoTick(redraw) {
      if (ov || ws.exam) return;
      const res = sim.grade(st), now = sim.services(entry, res), first = !lights;
      if (first) lights = now.map(([n]) => { const sr = el('span', { class: 'sr-only' }), li = el('li', { class: 'svc' }, el('span', { class: 'svc__dot', 'aria-hidden': 'true' }), el('span', { class: 'svc__name', text: n }), sr);
        li.addEventListener('animationend', () => li.classList.remove('is-new')); svcs.append(li); return { li, sr }; });
      now.forEach(([n, up], i) => {
        const { li, sr } = lights[i];
        if (up && !first && !li.classList.contains('is-up')) li.classList.add('is-new');
        li.classList.toggle('is-up', up); if (!up) li.classList.remove('is-new');
        sr.textContent = up ? ', working' : ', not working yet'; li.setAttribute('data-tip', n + (up ? ': working' : ': not working yet'));
      });
      if (entry.kind === 'incident' && ws.fixedAt == null && res.every(r => r[1])) ws.fixedAt = st.journal.length;
      const s = sim.taskStatus(st, entry, ws.fixedAt);
      ws.auto = s.map(v => v !== null);
      let changed = false;
      s.forEach((v, i) => { if (v === true && !ws.tasks[i]) { ws.tasks[i] = true; changed = true; } });
      if (changed && redraw) { ws.tasksView.rebuild(); if (ws.onLayout) ws.onLayout(); ws.sync(); }
    }
    ws.autoTick = autoTick;
    autoTick(false);
    ws.tasksView = ov && ov.left ? ov.left(ws) : L4N.tasksView.create(ws);
    ws.map = L4N.mapCore.create(ws, ov && ov.mapOpts ? ov.mapOpts(ws) : undefined);
    ws.trace = L4N.traceView.create(ws);
    const mapToggle = ui.button({ icon: 'chevron-up', aria: 'Collapse the map', onClick: () => ws.panes.toggle('map') });
    const mapPane = el('section', { class: 'pane map', id: 'ws-map', 'aria-label': 'Network map' },
      el('div', { class: 'pane__head' }, el('h2', { class: 'pane__title' }, icon('route'), el('span', { text: 'Network map' })), svcs, el('span', { class: 'spacer' }), mapToggle),
      ws.map.body);
    const tasksToggle = ui.button({ icon: 'panel-left', aria: 'Collapse the Tasks panel', onClick: () => ws.panes.toggle('tasks', true) });
    ws.tasksView.el.querySelector('.pane__head').append(tasksToggle);
    const stripCount = el('span', { class: 'num' });
    const stripBtn = ui.button({ icon: 'list-checks', aria: 'Expand the Tasks panel', onClick: () => { if (ws.tasksOut) return; ws.panes.toggle('tasks', false); ws.tasksView.focus(); } });
    stripBtn.append(stripCount);
    const strip = el('div', { class: 'tasks-strip' }, stripBtn);
    ws.panes = L4N.panes.create(ws, { tasks: ws.tasksView.el, strip, map: mapPane, trace: ws.trace.el, console: ws.console.el });
    ws.onLayout = () => {
      const mc = ws.panes.collapsed('map');
      mapToggle.setAttribute('aria-label', mc ? 'Expand the map' : 'Collapse the map'); mapToggle.setAttribute('data-tip', mc ? 'Expand the map' : 'Collapse the map');
      mapToggle.setAttribute('aria-expanded', String(!mc));
      clear(mapToggle).append(icon(mc ? 'chevron-down' : 'chevron-up'));
      const n = ws.tasks.filter(Boolean).length;
      stripCount.textContent = n + '/' + entry.lab.tasks.length;
      stripBtn.setAttribute('aria-label', (ws.tasksOut ? 'Tasks are open in the other window, ' : 'Expand the Tasks panel, ') + n + ' of ' + entry.lab.tasks.length + ' done');
      if (ws.map) ws.map.layout();
    };
    const frame = ws.panes.el;
    ws.frame = frame;
    root.append(el('h1', { class: 'sr-only', 'data-heading': '', tabindex: '-1', text: entry.title }), frame);

    // ---- top bar ----
    const statusBox = el('span', { class: 'hstack' });
    function refreshStatus() {
      if (ov) return;
      clear(statusBox);
      const s = status(entry.slug), rec = labRec(entry.slug);
      statusBox.append(ui.statusChip(s));
      if (rec && rec.grade) statusBox.append(ui.gradeChip(rec.grade));
    }
    ws.refreshStatus = refreshStatus;
    if (!ov) { refreshStatus(); L4N.shell.topbar.setStatus(statusBox); }
    const lesson = !ov && L4N.data.lessonFor(entry);
    const moreBtn = ui.button({ icon: 'more', aria: 'More lab actions', onClick: e => L4N.menu.open(e.currentTarget, moreItems(), { align: 'end', label: 'Lab actions' }) });
    const gradeBtn = ui.button({ label: 'Grade', kind: 'primary', kbd: 'mod+enter', id: 'gradeBtn', onClick: () => ws.grade() });
    gradeBtn.setAttribute('data-tip', 'Grade the lab'); gradeBtn.setAttribute('data-kbd', 'mod+enter');
    if (ov) { L4N.shell.topbar.setStatus(ov.status()); ws.tasksView.setHelpTabs(false); }
    if (ov && ov.noGrade) gradeBtn.hidden = true;
    L4N.shell.topbar.setActions(lesson ? ui.button({ label: 'Lesson', kind: 'ghost', icon: 'lessons', href: L4N.router.href('lesson', lesson.slug) }) : null, gradeBtn, moreBtn);
    ws.gradeBtn = gradeBtn;
    function moreItems() {
      const items = [];
      for (const h of ws.menuHooks || []) items.push(...h());
      if (window.innerWidth >= 1600) items.push({ label: ws.panes.layout() === 'side' ? 'Layout: stacked' : 'Layout: side by side', icon: ws.panes.layout() === 'side' ? 'panel-bottom' : 'sidebar', run: () => ws.panes.setLayout(ws.panes.layout() === 'side' ? 'stacked' : 'side') });
      items.push({ label: 'Reset panel sizes', icon: 'maximize', run: () => ws.panes.resetSizes() });
      if (!ws.hideHelp()) items.unshift({ label: ws.walk ? 'Hide walkthrough' : 'Show walkthrough (−25)', icon: 'eye', run: () => ws.setWalk(!ws.walk) });
      if (ov) items.push(...ov.menu());
      else items.push({ label: 'Reset lab', icon: 'reset', danger: true, run: () => ws.reset() });
      return items;
    }

    if (L4N.workspaceExtras) for (const fn of L4N.workspaceExtras) { try { fn(ws); } catch (e) { console.error(e); } }

    // focus the console so typing starts at once (not on phones, where the keyboard would cover the page)
    if (window.innerWidth >= 768) setTimeout(() => { if (current === ws && !document.querySelector('dialog[open]')) ws.console.focus(); }, 0);
    while (waiters.length) waiters.shift()(ws);

    return () => {
      ws.console.stop(false);
      ws.save(); L4N.work.flush();
      ws.console.destroy(); ws.map.destroy(); ws.panes.destroy();
      if (ws.cleanup) for (const f of ws.cleanup) f();
      if (current === ws) current = null;
    };
  }

  // ---- shortcuts and palette commands while a lab is open ----
  const inLab = () => !!current;
  const panes = () => current ? [['tasks', () => { if (current.panes.collapsed('tasks')) current.panes.toggle('tasks', false); current.tasksView.focus(); }],
    ['map', () => { if (current.panes.collapsed('map')) current.panes.toggle('map', false); current.map.focus(); }], ['console', () => current.console.focus()]] : [];
  function cyclePane(dir) {
    const P = panes(); if (!P.length) return;
    const a = document.activeElement;
    let i = P.findIndex(([k]) => { const n = document.getElementById('ws-' + k); return n && n.contains(a); });
    i = (i + dir + P.length) % P.length;
    P[i][1]();
  }
  function cycleDevice(dir) {
    if (!current) return;
    const names = current.st.devs, i = names.indexOf(current.st.sel);
    current.selectDevice(names[(i + dir + names.length) % names.length], true);
  }
  const K = L4N.keys;
  K.add({ keys: 'mod+enter', label: 'Grade the lab', group: 'Lab', input: true, when: inLab, run: () => current.grade() });
  K.add({ keys: 'alt+.', label: 'Next device console', group: 'Lab', input: true, when: inLab, run: () => cycleDevice(1) });
  K.add({ keys: 'alt+,', label: 'Previous device console', group: 'Lab', input: true, when: inLab, run: () => cycleDevice(-1) });
  K.add({ keys: 'f6', label: 'Next pane', group: 'Lab', input: true, when: inLab, run: () => cyclePane(1) });
  K.add({ keys: 'shift+f6', label: 'Previous pane', group: 'Lab', input: true, when: inLab, run: () => cyclePane(-1) });

  L4N.commands.add(() => {
    if (!current) return [];
    const ws = current, out = [
      { id: 'lab-grade', group: 'In a lab', title: 'Grade lab', icon: 'check-circle', kbd: 'mod+enter', run: () => ws.grade() },
      ws.exam ? null : { id: 'lab-reset', group: 'In a lab', title: 'Reset lab', icon: 'reset', run: () => ws.reset() },
      { id: 'lab-focus-console', group: 'In a lab', title: 'Focus console', icon: 'labs', kbd: 'f6', run: () => ws.console.focus() },
      { id: 'lab-focus-map', group: 'In a lab', title: 'Focus map', icon: 'route', run: () => ws.map.focus() },
      { id: 'lab-focus-tasks', group: 'In a lab', title: 'Focus tasks', icon: 'list-checks', run: () => ws.tasksView.focus() },
      { id: 'lab-clear', group: 'In a lab', title: 'Clear console', icon: 'x', run: () => { ws.console.clearScreen(); ws.console.focus(); } }
    ];
    const lesson = L4N.data.lessonFor(ws.entry);
    if (lesson && !(ws.hideHelp && ws.hideHelp())) out.push({ id: 'lab-lesson', group: 'In a lab', title: "Open this lab's lesson", icon: 'lessons', subtitle: lesson.title, run: () => L4N.shell.go(L4N.router.href('lesson', lesson.slug)) });
    for (const dv of sim.devices(ws.st)) out.push({ id: 'lab-dev-' + dv.name, group: 'In a lab', title: 'Switch to device ' + dv.hostname, icon: 'labs', subtitle: dv.kindName, keywords: dv.name, run: () => ws.selectDevice(dv.name, true) });
    if (!(ws.hideHelp && ws.hideHelp())) {
      out.push({ id: 'lab-guide', group: 'In a lab', title: 'Toggle step-by-step', icon: 'list-checks', subtitle: ws.guide ? 'On' : 'Off', run: () => ws.setGuide(!ws.guide) },
        { id: 'lab-walk', group: 'In a lab', title: ws.walk ? 'Hide walkthrough' : 'Show walkthrough', icon: 'eye', subtitle: 'Costs 25 points', run: () => ws.setWalk(!ws.walk) });
      if (ws.entry.kind === 'incident' && ws.clues < 3) out.push({ id: 'lab-clue', group: 'In a lab', title: 'Reveal next clue', icon: 'bulb', subtitle: 'Clue ' + (ws.clues + 1) + ' of 3 · costs 5 points', run: () => ws.revealClue() });
    }
    out.push(
      { id: 'lab-replay', group: 'In a lab', title: 'Replay last packet', icon: 'replay', run: () => ws.map.replay() },
      { id: 'lab-tasks-panel', group: 'In a lab', title: ws.panes.collapsed('tasks') ? 'Expand the Tasks panel' : 'Collapse the Tasks panel', icon: 'panel-left', run: () => ws.panes.toggle('tasks') },
      { id: 'lab-map-panel', group: 'In a lab', title: ws.panes.collapsed('map') ? 'Expand the map' : 'Collapse the map', icon: 'route', run: () => ws.panes.toggle('map') },
      { id: 'lab-max', group: 'In a lab', title: ws.panes.collapsed('map') ? 'Restore the map' : 'Maximise the console', icon: 'maximize', run: () => ws.panes.toggle('map') },
      { id: 'lab-reset-panes', group: 'In a lab', title: 'Reset panel sizes', icon: 'maximize', run: () => ws.panes.resetSizes() });
    if (window.innerWidth >= 1600) out.push({ id: 'lab-layout', group: 'In a lab', title: ws.panes.layout() === 'side' ? 'Layout: stacked' : 'Layout: side by side', icon: 'sidebar', run: () => ws.panes.setLayout(ws.panes.layout() === 'side' ? 'stacked' : 'side') });
    for (const h of ws.commandHooks || []) out.push(...h());
    return out;
  });

  // ---- the test hook (section 8.3): the same code paths a person uses ----
  L4N.test = {
    openLab(slug) {
      return new Promise(resolve => {
        waiters.push(ws => resolve(!!ws));
        const href = L4N.router.href('lab', slug);
        if (location.hash === href && current && current.slug === slug) { waiters.length = 0; resolve(true); return; }
        L4N.shell.go(href);
      });
    },
    exec(device, line) {
      if (!current) throw Error('No lab is open');
      if (device && device !== current.st.sel) current.console.select(device);
      const r = current.console.run(line);
      current.console.stop(false);
      return r ? r.lines : null;
    },
    grade() { if (!current) throw Error('No lab is open'); current.gradeBtn.click(); return current.graded && current.graded.results; },
    state() {
      if (!current) return null;
      const c = current, rec = labRec(c.slug) || {};
      return { slug: c.slug, sel: c.st.sel, journal: c.st.journal.length, graded: c.graded, done: !!rec.done, grade: rec.grade || null, run: rec.run || null,
        lines: c.st.con[c.st.sel].lines.slice(-60).map(l => l.t), prompt: sim.prompt(c.st, c.st.sel) };
    }
  };

  L4N.workspace = { current: () => current, status, nextLab, mount };
  L4N.screens.register('lab', {
    nav: 'labs',
    title: r => { const l = L4N.data.lab(r.slug); return l ? l.title : 'Lab'; },
    crumbs: r => { const l = L4N.data.lab(r.slug); return l ? [{ label: 'Labs', href: '#/labs' }, { label: l.lab.group, href: '#/labs' }, { label: l.short }] : [{ label: 'Labs', href: '#/labs' }]; },
    mount
  });
})(window.L4N = window.L4N || {});
