// sandbox.js: free build (section 5.12). The lab workspace with a Build panel in place of Tasks.
// The build lives in lab4net:v2:sandbox: devices, cables, notes, the view, a goal, and the commands typed.
(function (L4N) {
  'use strict';
  const { el, icon, clear } = L4N.dom;
  const ui = L4N.ui, V = L4N.validate, SB = () => L4N.sim.sandbox, K = L4N.KEYS;
  const MAX = 20, W = 1600, H = 660;
  const blank = () => ({ devs: [], links: [], notes: [], view: null, goal: null, goalDone: false, journal: [], sel: null });
  // gen goes up whenever the build is replaced, so a workspace that is closing cannot save its old commands over it
  let def = null, tool = 'select', pick = null, hist = [], redo = [], gen = 0;
  const load = () => { if (!def) def = V.sandbox(L4N.storage.read(K.sandbox)) || blank(); return def; };
  const snap = () => JSON.stringify({ devs: def.devs, links: def.links, notes: def.notes, goal: def.goal, goalDone: def.goalDone, journal: def.journal });
  function mark() { const s = snap(); if (hist[hist.length - 1] === s) return; hist.push(s); if (hist.length > 80) hist.shift(); redo = []; }
  function save() { L4N.storage.write(K.sandbox, def); }
  // a change to devices or cables rebuilds the network: the workspace remounts on the same address
  function rebuild(focusMap) { gen++; save(); mark(); L4N.shell.go('#/sandbox'); if (focusMap) setTimeout(() => { const w = L4N.workspace.current(); if (w) w.map.focus(); }, 0); }
  // after undo or redo, focus stays on the map (not the console, where Ctrl+Z means IOS end)
  function restore(s) { gen++; const p = JSON.parse(s); Object.assign(def, p); pick = null; save(); L4N.shell.go('#/sandbox'); setTimeout(() => { const w = L4N.workspace.current(); if (w) w.map.body.focus(); }, 0); }
  function undo() { if (hist.length < 2) { L4N.toast({ text: 'Nothing to undo.' }); return; } redo.push(hist.pop()); restore(hist[hist.length - 1]); }
  function redoIt() { if (!redo.length) { L4N.toast({ text: 'Nothing to redo.' }); return; } const s = redo.pop(); hist.push(s); restore(s); }
  const view = () => def.view || (def.view = { x: 0, y: 0, w: 800 });
  const viewFull = () => { const v = view(); return { x: v.x, y: v.y, w: v.w }; };
  function setView(v) { const w = Math.max(400, Math.min(W, v.w)); def.view = { x: Math.max(-200, Math.min(W - w, v.x)), y: Math.max(-200, Math.min(H - 100, v.y)), w }; save(); const ws = L4N.workspace.current(); if (ws) ws.map.layout(); }
  function zoom(f) { const v = view(), w = Math.max(400, Math.min(W, v.w * f)); setView({ x: v.x + (v.w - w) / 2, y: v.y + (v.w - w) * 0.2, w }); }
  // fit every device into the map, using the map's real shape
  function fit() {
    if (!def.devs.length) { setView({ x: 0, y: 0, w: 800 }); return; }
    const ws = L4N.workspace.current(), b = ws && ws.map.body, aspect = b && b.clientHeight ? b.clientWidth / b.clientHeight : 2.7;
    const xs = def.devs.map(d => d.x), ys = def.devs.map(d => d.y), x0 = Math.min(...xs) - 80, x1 = Math.max(...xs) + 80, y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 70;
    const w = Math.max(x1 - x0, (y1 - y0) * aspect, 400);
    setView({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - w / aspect / 2, w });
  }

  function addDevice(type) {
    if (def.devs.length >= MAX) { L4N.toast({ text: 'The sandbox holds up to 20 devices. Delete one to add another.', kind: 'warn' }); return; }
    const pre = SB().KIND[type][0], v = view(); let n = 1;
    while (def.devs.some(d => d.name === pre + n)) n++;
    let spot = null;
    for (let y = v.y + 80; !spot && y <= v.y + v.w * 0.4; y += 90) for (let x = v.x + 80; x <= v.x + v.w - 70; x += 100) if (!def.devs.some(d => Math.hypot(d.x - x, d.y - y) < 70)) { spot = [x, y]; break; }
    spot = spot || [v.x + 80, v.y + 80];
    def.devs.push({ name: pre + n, type, x: Math.round(spot[0]), y: Math.round(spot[1]) });
    def.sel = pre + n;
    rebuild();
  }
  function del(name) {
    def.devs = def.devs.filter(d => d.name !== name); def.links = def.links.filter(l => l.a !== name && l.b !== name);
    def.journal = def.journal.filter(e => e.device !== name); if (def.sel === name) def.sel = null;
    rebuild(true); L4N.toast({ text: name + ' deleted.' });
  }
  // cabling: pick a port on each end from a small menu
  function portMenu(ws, name, anchorEvt, then) {
    const ports = SB().ports(ws.st, name), free = ports.filter(p => !p.used);
    if (!free.length) { L4N.toast({ text: 'Every port on ' + name + ' is in use.', kind: 'warn' }); return; }
    if (ports.length === 1) { then(free[0].name); return; }
    const a = anchorEvt.currentTarget || anchorEvt.target;
    L4N.menu.open(a, ports.map(p => ({ label: p.short + (p.used ? ' · to ' + p.used : ''), icon: p.used ? 'lock' : 'cable', disabled: !!p.used, run: () => { if (!p.used) then(p.name); } })), { label: name + ': choose a port' });
  }
  function cableClick(ws, name, e) {
    if (!pick) { portMenu(ws, name, e, p => { pick = { dev: name, port: p }; L4N.toast({ text: name + ' ' + L4N.sim.shortName(p) + ' chosen. Now choose the device at the other end.' }); }); return; }
    if (pick.dev === name) { L4N.toast({ text: 'Choose a different device for the other end.', kind: 'warn' }); return; }
    portMenu(ws, name, e, p => { def.links.push({ a: pick.dev, ai: pick.port, b: name, bi: p }); const msg = 'Connected ' + pick.dev + ' ' + L4N.sim.shortName(pick.port) + ' to ' + name + ' ' + L4N.sim.shortName(p) + '.'; pick = null; rebuild(true); L4N.toast({ text: msg, kind: 'ok' }); });
  }
  async function addNote(x, y) {
    let text = '';
    const inp = ui.input({ label: 'Note text', maxlength: 60 });
    const ok = await new Promise(res => L4N.dialog.open({ title: 'Add a note', body: [inp], focus: 'input', actions: [{ label: 'Cancel' }, { label: 'Add note', kind: 'primary', run: () => { text = inp.value; res(true); } }], onClose: () => res(false) }));
    if (!ok || !text.trim()) return;
    def.notes.push({ text: text.trim().slice(0, 60), x: Math.round(x), y: Math.round(y) }); save(); mark();
    const ws = L4N.workspace.current(); if (ws) ws.map.redraw();
  }

  // ---- the Build panel (in place of Tasks) ----
  function buildPanel(ws) {
    const body = el('div', { class: 'tasks__body build' });
    const head = el('div', { class: 'pane__head' }, el('h2', { class: 'pane__title' }, icon('sandbox'), 'Build'), el('span', { class: 'spacer' }), el('span', { class: 'tasks__count num', text: def.devs.length + ' of ' + MAX + ' devices' }));
    const root = el('section', { class: 'pane tasks', 'aria-label': 'Build', id: 'ws-tasks' }, head, el('div', { class: 'pane__body', tabindex: '-1' }, body));
    const toolBtn = (id, label, ic) => el('button', { class: 'seg__opt', type: 'button', role: 'radio', 'aria-checked': String(tool === id), onClick: () => { tool = id; pick = null; draw(); } }, icon(ic), el('span', { text: label }));
    function draw() {
      clear(body);
      body.append(el('h3', { class: 'label-caps', text: 'Add a device' }),
        el('div', { class: 'build__devs' }, Object.keys(SB().KIND).map(t => ui.button({ label: SB().KIND[t][1], icon: 'plus', onClick: () => addDevice(t) }))),
        el('h3', { class: 'label-caps', text: 'Tool' }),
        el('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Tool' }, toolBtn('select', 'Select', 'arrow-right'), toolBtn('cable', 'Cable', 'cable'), toolBtn('note', 'Note', 'note'), toolBtn('delete', 'Delete', 'trash')),
        el('p', { class: 'hint', text: { select: 'Click a device to open its console. Drag it to move it. Drag the background to pan.', cable: pick ? 'Now choose the device at the other end.' : 'Click a device, choose a port, then the other device and its port.', note: 'Click the map where the note goes.', delete: 'Click a device, a cable or a note to delete it.' }[tool] }),
        el('div', { class: 'hstack' }, ui.button({ label: 'Undo', icon: 'undo', kbd: 'mod+z', disabled: hist.length < 2, onClick: undo }), ui.button({ label: 'Redo', icon: 'redo', disabled: !redo.length, onClick: redoIt })));
      // goals
      body.append(el('h3', { class: 'label-caps', text: 'Goals' }));
      if (def.goal == null) body.append(el('div', { class: 'stack' }, SB().GOALS.map((g, i) => el('div', { class: 'build__goal' }, el('div', {}, el('b', { text: g.title }), el('p', { class: 'hint', text: g.desc })), ui.button({ label: 'Start', onClick: () => startGoal(i) })))));
      else {
        const G = SB().GOALS[def.goal], state = SB().goalState(ws.st, def.goal);
        body.append(el('div', { class: 'stack' }, el('b', { text: G.title + (def.goalDone ? ' · met' : '') }), el('p', { class: 'hint', text: G.desc }),
          el('ul', { class: 'results__list' }, state.map(([t, ok]) => el('li', { class: ['check-row', ok ? 'is-ok' : 'is-bad'] }, icon(ok ? 'check' : 'circle'), el('span', { class: 'sr-only', text: ok ? 'Met: ' : 'Not yet: ' }), el('span', { text: t })))),
          ui.button({ label: 'Leave this goal', kind: 'ghost', onClick: () => { def.goal = null; def.goalDone = false; save(); mark(); draw(); } })));
      }
      // kits and files
      body.append(el('h3', { class: 'label-caps', text: 'Starter kits' }), el('div', { class: 'stack' }, SB().KITS.map(([t, d], i) => el('div', { class: 'build__goal' }, el('div', {}, el('b', { text: t }), el('p', { class: 'hint', text: d })), ui.button({ label: 'Load', onClick: () => loadKit(i) })))),
        el('h3', { class: 'label-caps', text: 'File' }),
        el('div', { class: 'hstack' }, ui.button({ label: 'Save to file', icon: 'download', onClick: saveFile }), ui.button({ label: 'Load from file', icon: 'upload', onClick: () => file.click() }), file,
          ui.button({ label: 'Clear all', kind: 'danger', icon: 'trash', onClick: async () => { if (await L4N.dialog.confirm({ title: 'Clear the sandbox?', body: 'Every device, cable, note and command goes. Undo can bring it back.', ok: 'Clear', danger: true })) { replace(blank()); } } })));
    }
    const file = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0]; file.value = '';
      if (!f) return;
      try {
        if (f.size > 2 * 1024 * 1024) throw Error('the file is larger than 2 MB');
        let p; try { p = JSON.parse(await f.text()); } catch (e) { throw Error('it is not a Lab4Net sandbox file'); }
        if (!V.isObj(p) || p.format !== 'lab4net-sandbox') throw Error('it is not a Lab4Net sandbox file');
        const c = V.sandbox(V.isObj(p.sandbox) ? p.sandbox : (V.isObj(p.def) ? Object.assign({}, p.def, { journal: p.journal }) : null));
        if (!c) throw Error('something in it does not fit a sandbox');
        // a build must also replay: ports must exist and commands must run
        const test = Object.assign(blank(), c);
        try { L4N.sim.open(entryFor(() => test), { journal: test.journal }); } catch (e) { throw Error('its network could not be built'); }
        replace(c); L4N.toast({ text: 'Sandbox loaded from ' + f.name + '.', kind: 'ok' });
      } catch (e) { L4N.toast({ text: 'That file could not be loaded: ' + e.message + '.', kind: 'bad' }); }
    });
    draw();
    return { el: root, rebuild: draw, renderResults: draw, refreshCommands() {}, setHelpTabs() {}, results: body, focus() { root.querySelector('.pane__body').focus(); } };
  }
  function replace(next) { Object.assign(def, blank(), next); fit(); rebuild(); }
  function loadKit(i) { const k = SB().KITS[i][2](); replace({ devs: k.devs, links: k.links, notes: [], goal: def.goal, goalDone: false }); }
  function startGoal(i) { const k = SB().KITS[SB().GOALS[i].kit][2](); replace({ devs: k.devs, links: k.links, notes: [], goal: i, goalDone: false }); }
  function saveFile() {
    const blob = new Blob([JSON.stringify({ format: 'lab4net-sandbox', version: 2, sandbox: def }, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = el('a', { href: url, download: 'lab4net-sandbox.json' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    L4N.toast({ text: 'Sandbox saved to lab4net-sandbox.json.', kind: 'ok' });
  }

  const entryFor = getDef => ({ slug: 'sandbox', title: 'Sandbox', short: 'Sandbox', kind: 'sandbox', idText: 'SBX', lab: Object.assign(L4N.sim.sandbox.lab(getDef), { pos: {} }) });

  function mount(root, r, ctx) {
    load();
    if (!hist.length) mark();
    const entry = entryFor(() => def), myGen = gen;
    entry.lab.start = def.sel;
    let drag = null;
    const ov = {
      entry, journal: def.journal, noGrade: true,
      save: journal => { if (myGen !== gen) return; def.journal = journal.slice(); save(); },
      count: () => { mark(); checkGoal(); },
      status: () => [], menu: () => [],
      grade: () => { checkGoal(true); return []; },
      left: ws => buildPanel(ws),
      mapOpts: ws => ({
        view: viewFull, label: 'Sandbox map', maxScale: 3,
        posOf: n => { const d = def.devs.find(x => x.name === n); return d ? [d.x, d.y] : [100, 100]; },
        notes: () => def.notes,
        onNodeClick: (n, e) => {
          if (drag && drag.moved) return true;
          if (tool === 'cable') { cableClick(ws, n, e); return true; }
          if (tool === 'delete') { del(n); return true; }
          def.sel = n; save(); return false;
        },
        onNodeDown: (n, e) => {
          if (tool !== 'select' || e.button !== 0) return;
          const d = def.devs.find(x => x.name === n), [x0, y0] = ws.map.toCanvas(e.clientX, e.clientY);
          drag = { d, dx: d.x - x0, dy: d.y - y0, moved: false };
          const move = ev => { const [x, y] = ws.map.toCanvas(ev.clientX, ev.clientY); const nx = Math.round(Math.max(34, Math.min(W - 34, x + drag.dx))), ny = Math.round(Math.max(34, Math.min(H - 40, y + drag.dy))); if (Math.abs(nx - d.x) + Math.abs(ny - d.y) > 2) drag.moved = true; d.x = nx; d.y = ny; ws.map.redraw(); };
          const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (drag.moved) { save(); mark(); } setTimeout(() => { drag = null; }, 0); };
          window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        },
        onBgDown: e => {
          if (tool === 'note') { const [x, y] = ws.map.toCanvas(e.clientX, e.clientY); addNote(x, y); return; }
          if (e.button !== 0) return;
          const v0 = viewFull(), s = ws.map.scale(), x0 = e.clientX, y0 = e.clientY;
          const move = ev => setView({ x: v0.x - (ev.clientX - x0) / s, y: v0.y - (ev.clientY - y0) / s, w: v0.w });
          const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        },
        onLinkClick: l => { if (tool !== 'delete') return; def.links = def.links.filter(x => !(x.a === l.a && x.ai === l.ai && x.b === l.b && x.bi === l.bi)); rebuild(true); L4N.toast({ text: 'Cable removed.' }); },
        onNoteClick: i => { if (tool !== 'delete') return; def.notes.splice(i, 1); save(); mark(); const ws2 = L4N.workspace.current(); if (ws2) ws2.map.redraw(); }
      })
    };
    function checkGoal(say) {
      const ws = L4N.workspace.current();
      if (!ws || def.goal == null) return;
      const st = SB().goalState(ws.st, def.goal);
      ws.tasksView.rebuild();
      if (!def.goalDone && st.length && st.every(x => x[1])) { def.goalDone = true; save(); ws.tasksView.rebuild(); L4N.toast({ text: 'Goal met: ' + SB().GOALS[def.goal].title + '.', kind: 'ok' }); }
      else if (say) L4N.toast({ text: st.filter(x => x[1]).length + ' of ' + st.length + ' goals met.' });
    }
    const cleanup = L4N.workspace.mount(root, r, ctx, ov);
    const ws = L4N.workspace.current();
    // the map: zoom and pan controls, and arrow keys pan while the map itself has focus
    const head = ws.map.body.parentElement.querySelector('.pane__head');
    head.insertBefore(el('div', { class: 'hstack zoom' }, ui.button({ icon: 'minus', aria: 'Zoom out', onClick: () => zoom(1.25) }), ui.button({ icon: 'plus', aria: 'Zoom in', onClick: () => zoom(0.8) }), ui.button({ label: 'Fit', kind: 'ghost', onClick: fit })), head.querySelector('.spacer').nextSibling);
    ws.map.body.setAttribute('tabindex', '0'); ws.map.body.setAttribute('aria-label', 'Sandbox map. Arrow keys pan.');
    ws.map.body.addEventListener('keydown', e => { if (e.target !== ws.map.body) return; const v = viewFull(), step = v.w / 10, d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]; if (!d) return; e.preventDefault(); setView({ x: v.x + d[0], y: v.y + d[1], w: v.w }); });
    return cleanup;
  }

  // Ctrl+Z: IOS end inside the console, undo everywhere else in the sandbox
  const inSbx = () => L4N.route && L4N.route.screen === 'sandbox';
  L4N.keys.add({ keys: 'mod+shift+z', label: 'Redo', group: 'Sandbox', when: inSbx, run: redoIt });
  L4N.keys.add({ keys: 'mod+z', label: 'Undo (outside the console)', group: 'Sandbox', when: inSbx, run: undo });
  L4N.keys.add({ keys: 'mod+y', label: 'Redo', hidden: true, when: inSbx, run: redoIt });
  L4N.commands.add(() => !inSbx() ? [] : [
    { id: 'sbx-undo', group: 'In the sandbox', title: 'Undo', icon: 'undo', kbd: 'mod+z', run: undo }, { id: 'sbx-redo', group: 'In the sandbox', title: 'Redo', icon: 'redo', run: redoIt },
    { id: 'sbx-fit', group: 'In the sandbox', title: 'Fit the map', icon: 'maximize', run: fit }, { id: 'sbx-save', group: 'In the sandbox', title: 'Save to file', icon: 'download', run: saveFile }]
    .concat(Object.keys(SB().KIND).map(t => ({ id: 'sbx-add-' + t, group: 'In the sandbox', title: 'Add ' + SB().KIND[t][1].toLowerCase(), icon: 'plus', run: () => addDevice(t) }))));
  L4N.screens.register('sandbox', { title: () => 'Sandbox', mount });
  L4N.sandbox = { def: () => load(), undo, redo: redoIt, hist: () => hist.length };
})(window.L4N = window.L4N || {});
