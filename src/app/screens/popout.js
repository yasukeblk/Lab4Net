// popout.js: the Tasks panel in its own window (section 5.4, "Pop out").
// The main window owns all state and storage. The pop-out (index.html?panel=tasks) stores nothing and only draws
// what it is sent. The two talk over a BroadcastChannel. Every message is checked: same origin, known type, the
// right shape. Messages carry data only; the pop-out renders lab text from its own copy of the lab data, by slug.
(function (L4N) {
  'use strict';
  const { el, icon, clear, trusted } = L4N.dom;
  const CHANNEL = 'lab4net-tasks';
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const okStr = (v, max) => typeof v === 'string' && v.length <= max;
  const boolArr = (v, max) => Array.isArray(v) && v.length <= max && v.every(x => typeof x === 'boolean');
  const offered = () => location.protocol !== 'file:' && typeof BroadcastChannel !== 'undefined' && window.innerWidth >= 768;

  // ---------------------------------------------------------------- main window side
  let chan = null, win = null, alive = 0, watch = 0;
  const ws = () => (L4N.workspace && L4N.workspace.current()) || null;

  function send(msg) { if (chan) try { chan.postMessage(msg); } catch (e) {} }
  function stateMsg() {
    const w = ws();
    if (!w) return { type: 'state', slug: null, theme: L4N.theme.resolved() };
    const g = w.graded;
    return {
      type: 'state', slug: w.slug, theme: L4N.theme.resolved(), tasks: Array.from({ length: w.st.lab.tasks.length }, (_, i) => !!w.tasks[i]),
      guide: !!w.guide, clues: w.clues || 0, walk: !!w.walk, exam: !!(w.hideHelp && w.hideHelp()),
      graded: g ? { pass: g.results.map(r => !!r[1]), stale: !!g.stale, grade: g.grade || null, hideList: !!g.hideList } : null
    };
  }
  function onMain(e) {
    if (e.origin && e.origin !== location.origin) return;
    const m = e.data;
    if (!isObj(m) || !okStr(m.type, 16)) return;
    const w = ws();
    if (m.type === 'hello') {
      alive = Date.now();
      if (w && !w.tasksOut && !(w.hideHelp && w.hideHelp())) { w.tasksOut = true; w.panes.apply(); }
      if (w && w.hideHelp && w.hideHelp()) { send({ type: 'close' }); return; }
      send(stateMsg());
      return;
    }
    if (m.type === 'bye' || m.type === 'dock') { dock(m.type === 'dock'); return; }
    if (!w || !w.tasksOut) return;
    alive = Date.now();
    if (m.type === 'step' && okStr(m.device, 32) && okStr(m.command, 512)) {
      // only a command that really is one of this lab's steps for that device
      const ok = L4N.sim.steps(w.st.lab).some(task => task.some(g => g.dev === m.device && g.lines.some(x => x.cmd === m.command)));
      if (ok && w.guide && !(w.hideHelp && w.hideHelp())) w.stepTo(m.device, m.command);
    } else if (m.type === 'tick' && Number.isInteger(m.i) && m.i >= 0 && m.i < w.st.lab.tasks.length && typeof m.v === 'boolean') {
      w.tasks[m.i] = m.v; w.tasksView.rebuild(); w.onTick(m.i, m.v);
    } else if (m.type === 'guide' && typeof m.on === 'boolean') { if (!(w.hideHelp && w.hideHelp())) w.setGuide(m.on); }
    else if (m.type === 'clue') { if (!(w.hideHelp && w.hideHelp())) w.revealClue(); }
  }
  function ensureChannel() {
    if (chan || typeof BroadcastChannel === 'undefined') return;
    chan = new BroadcastChannel(CHANNEL);
    chan.addEventListener('message', onMain);
    watch = setInterval(() => { const w = ws(); if (w && w.tasksOut && Date.now() - alive > 9000) dock(true); }, 1000);
  }
  function open() {
    const w = ws();
    if (!w || !offered() || (w.hideHelp && w.hideHelp())) return;
    ensureChannel();
    alive = Date.now();
    w.tasksOut = true; w.panes.apply();
    const url = location.pathname + '?panel=tasks';
    win = window.open(url, 'lab4net-tasks', 'popup,width=420,height=760');
    if (!win) { w.tasksOut = false; w.panes.apply(); L4N.toast({ text: 'The window could not open. Allow pop-ups for this site and try again.', kind: 'warn' }); }
  }
  function dock(closeIt) {
    const w = ws();
    if (closeIt !== false) send({ type: 'close' });
    try { if (win && !win.closed && closeIt !== false) win.close(); } catch (e) {}
    win = null;
    if (w && w.tasksOut) { w.tasksOut = false; w.panes.apply(); }
  }

  // Hook into every workspace: the menu item, the strip, and sending state when it changes.
  (L4N.workspaceExtras = L4N.workspaceExtras || []).push(w => {
    ensureChannel();
    w.syncHooks = (w.syncHooks || []).concat(() => { if (w.tasksOut) send(stateMsg()); });
    w.hooks.push(() => { if (w.tasksOut) send(stateMsg()); });
    w.menuHooks = (w.menuHooks || []).concat(() => offered() && !(w.hideHelp && w.hideHelp()) ? [w.tasksOut ? { label: 'Dock tasks', icon: 'panel-left', run: () => dock(true) } : { label: 'Pop out tasks', icon: 'pop-out', run: open }] : []);
    w.commandHooks = (w.commandHooks || []).concat(() => offered() && !(w.hideHelp && w.hideHelp()) ? [w.tasksOut ? { id: 'lab-dock', group: 'In a lab', title: 'Dock tasks', icon: 'panel-left', run: () => dock(true) } : { id: 'lab-pop', group: 'In a lab', title: 'Pop out tasks', icon: 'pop-out', subtitle: 'A second window, for two monitors', run: open }] : []);
    // the strip says where the tasks are, with a Dock button
    const strip = w.panes.el.querySelector('.tasks-strip');
    const out = el('div', { class: 'tasks-strip__out' }, el('span', { class: 'tasks-strip__text', text: 'Open in the other window' }),
      L4N.ui.button({ icon: 'panel-left', aria: 'Dock the Tasks panel', onClick: () => dock(true) }));
    strip.append(out);
    const prevLayout = w.onLayout;
    w.onLayout = () => { if (prevLayout) prevLayout(); strip.classList.toggle('is-out', !!w.tasksOut); };
    // a pop-out that is already open (for example after a reload of this window) reconnects on its next hello
    if (Date.now() - alive < 9000) { w.tasksOut = true; send(stateMsg()); }
    else send(stateMsg());
    w.cleanup = (w.cleanup || []).concat(() => { setTimeout(() => send(stateMsg()), 0); });
  });

  // ---------------------------------------------------------------- pop-out window side
  function boot() {
    document.title = 'Tasks · Lab4Net';
    const root = document.getElementById('app');
    root.className = 'popout';
    const title = el('h1', { class: 'popout__title', text: 'Tasks' });
    const body = el('div', { class: 'tasks__body' });
    const ch = new BroadcastChannel(CHANNEL);
    const post = m => { try { ch.postMessage(m); } catch (e) {} };
    root.append(el('header', { class: 'popout__head' }, L4N.logo(), title, el('span', { class: 'spacer' }),
      L4N.ui.button({ label: 'Dock', icon: 'panel-left', onClick: () => { post({ type: 'dock' }); window.close(); } })), el('main', { class: 'popout__body' }, body));
    let lastSlug, data = L4N.sim.catalogue();

    function waiting(text) { clear(body); body.append(L4N.ui.empty({ icon: 'labs', what: text, todo: 'This window shows the tasks of the lab open in the main window.' })); }
    function render(m) {
      document.documentElement.setAttribute('data-theme', m.theme === 'light' ? 'light' : 'dark');
      if (!m.slug) { title.textContent = 'Tasks'; waiting('No lab is open.'); return; }
      const entry = data.lab(m.slug);
      if (!entry) { waiting('No lab is open.'); return; }
      const lab = entry.lab;
      title.textContent = entry.short;
      document.title = entry.short + ' · Tasks · Lab4Net';
      const keep = lastSlug === m.slug ? document.querySelector('.popout__body').scrollTop : 0;
      lastSlug = m.slug;
      clear(body);
      body.append(trusted(lab.brief || '', 'p', { class: 'tasks__brief' }));
      if (lab.addr && lab.addr.length) body.append(el('details', { class: 'sect', open: true }, el('summary', {}, icon('chevron-down', 'icon--chev'), el('span', { class: 'label-caps', text: 'Address plan' })),
        el('div', { class: 'table-wrap' }, el('table', { class: 'table addr' }, el('tbody', {}, lab.addr.map(r => el('tr', {}, el('td', { text: String(r[0]) }), el('td', { text: String(r[1]) }), el('td', { text: String(r[2]) }))))))));
      if (!m.exam) body.append(el('div', { class: 'tasks__row' }, L4N.ui.toggle({ label: 'Step-by-step', checked: !!m.guide, onChange: v => post({ type: 'guide', on: v }) })));
      const steps = m.guide && !m.exam ? L4N.sim.steps(lab) : [];
      const list = el('ol', { class: 'tasklist', 'aria-label': 'Tasks' });
      lab.tasks.forEach((t, i) => {
        const more = el('div', { class: 'task__more' });
        if (lab.why && lab.why[i] && !m.exam) more.append(el('details', { class: 'why' }, el('summary', {}, icon('chevron-right'), 'Why'), trusted(lab.why[i], 'div', { class: 'why__text' })));
        if (steps[i] && steps[i].length) {
          const box = el('div', { class: 'steps' });
          for (const g of steps[i]) {
            box.append(el('div', { class: 'steps__dev label-caps', text: 'On ' + g.dev }));
            for (const x of g.lines) box.append(x.note ? el('div', { class: 'steps__note', text: x.note }) :
              el('button', { class: 'cmd step', type: 'button', onClick: () => post({ type: 'step', device: g.dev, command: x.cmd }) }, el('span', { class: 'step__prompt', text: x.prompt || '' }), el('span', { text: x.cmd === L4N.sim.CRLINE ? '↵ Enter' : x.cmd })));
          }
          more.append(box);
        }
        const cb = L4N.ui.checkbox({ checked: !!(m.tasks && m.tasks[i]), aria: 'Task ' + (i + 1) + ' done', onChange: v => post({ type: 'tick', i, v }) });
        list.append(el('li', { class: ['task', m.tasks && m.tasks[i] && 'is-ticked'] }, cb, trusted(t, 'div', { class: 'task__text' }), more));
      });
      body.append(list);
      if (entry.kind === 'incident' && Array.isArray(lab.hints) && !m.exam) {
        const n = Math.max(0, Math.min(3, m.clues | 0));
        const box = el('section', { class: 'sect clues' }, el('h2', { class: 'label-caps', text: 'Clues' }));
        lab.hints.slice(0, n).forEach((c, i) => box.append(L4N.ui.callout({ icon: 'bulb', title: ['Direction', 'Evidence', 'Repair'][i], body: [el('span', { text: c })] })));
        if (n < 3) box.append(L4N.ui.button({ label: 'Reveal clue ' + (n + 1) + ' of 3', icon: 'bulb', onClick: () => post({ type: 'clue' }) }));
        body.append(box);
      }
      const g = m.graded;
      if (g && Array.isArray(g.pass) && g.pass.length === lab.checks.length) {
        const pass = g.pass.filter(Boolean).length, done = pass === g.pass.length;
        const res = el('section', { class: ['results', g.stale && 'is-stale'], 'aria-label': 'Results' }, el('h2', { class: 'label-caps', text: 'Results' }));
        if (g.stale) res.append(el('p', { class: 'results__stale' }, icon('alert'), 'Commands run since grading. Grade again.'));
        res.append(el('p', { class: ['results__sum', done ? 'is-ok' : 'is-bad'] }, icon(done ? 'check-circle' : 'x-circle'),
          done ? 'Lab complete' + (g.grade && /^[SABCD]$/.test(g.grade) ? ' · Grade ' + g.grade : '') : pass + ' of ' + g.pass.length + ' checks pass'));
        if (!g.hideList) res.append(el('ul', { class: 'results__list' }, lab.checks.map(([t], i) => el('li', { class: ['check-row', g.pass[i] ? 'is-ok' : 'is-bad'] }, icon(g.pass[i] ? 'check' : 'x'), el('span', { text: t })))));
        body.append(res);
      }
      document.querySelector('.popout__body').scrollTop = keep;
    }

    ch.addEventListener('message', e => {
      if (e.origin && e.origin !== location.origin) return;
      const m = e.data;
      if (!isObj(m) || !okStr(m.type, 16)) return;
      if (m.type === 'close') { window.close(); return; }
      if (m.type !== 'state') return;
      if (m.slug !== null && !L4N.isSlug(m.slug)) return;
      if (m.tasks != null && !boolArr(m.tasks, 64)) return;
      if (m.graded != null && !(isObj(m.graded) && boolArr(m.graded.pass, 200))) return;
      render({ slug: m.slug, theme: m.theme, tasks: m.tasks || [], guide: m.guide === true, clues: Number.isInteger(m.clues) ? m.clues : 0, exam: m.exam === true,
        graded: m.graded ? { pass: m.graded.pass, stale: m.graded.stale === true, grade: typeof m.graded.grade === 'string' ? m.graded.grade : null, hideList: m.graded.hideList === true } : null });
    });
    waiting('Connecting to the main window…');
    post({ type: 'hello' });
    setInterval(() => post({ type: 'hello' }), 3000);
    window.addEventListener('pagehide', () => post({ type: 'bye' }));
  }

  L4N.popout = { boot, open, dock, offered, isPopout: () => new URLSearchParams(location.search).get('panel') === 'tasks' };
})(window.L4N = window.L4N || {});
