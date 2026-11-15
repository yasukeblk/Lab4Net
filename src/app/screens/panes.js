// panes.js: the workspace layout (section 5.4): fixed panes with draggable dividers, collapse, maximise,
// stacked or side by side, sizes saved as fractions per layout, and one pane at a time on phones.
(function (L4N) {
  'use strict';
  const { el, icon, clear } = L4N.dom;
  const ui = L4N.ui;
  const LIM = { tasksMin: 280, tasksMax: 520, mapMin: 160, consoleMin: 200, mapWMin: 260 };
  const DEF = { stacked: { tasks: null, map: null }, side: { tasks: null, map: null } };
  const PHONE = 768;

  // createPanes(ws, parts: {tasks, map, trace, console, strip}) → {el, apply(), ...}
  function createPanes(ws, parts) {
    const frame = el('div', { class: 'ws' });
    const h1 = el('div', { class: 'handle handle--v ws__h1', role: 'separator', tabindex: '0', 'aria-orientation': 'vertical', 'aria-label': 'Resize the Tasks panel', 'aria-controls': 'ws-tasks', 'data-tip': 'Drag, or use the arrow keys. Double-click resets.' });
    const h2 = el('div', { class: 'handle ws__h2', role: 'separator', tabindex: '0', 'aria-controls': 'ws-map' });
    const bar = el('nav', { class: 'ws__phonebar', 'aria-label': 'Workspace panes' });
    frame.append(parts.tasks, parts.strip, h1, parts.map, parts.trace, h2, parts.console, bar);
    let phonePane = 'tasks', charW = 0;
    const phoneBtns = {};
    for (const [k, label, ic] of [['tasks', 'Tasks', 'list-checks'], ['map', 'Map', 'route'], ['console', 'Console', 'labs']]) {
      phoneBtns[k] = el('button', { class: 'ws__pb', type: 'button', 'aria-pressed': 'false', onClick: () => showPhone(k) }, icon(ic), el('span', { text: label }));
      bar.append(phoneBtns[k]);
    }

    const S = () => L4N.store.get().ui;
    const layout = () => (window.innerWidth >= 1600 && S().layout === 'side' ? 'side' : 'stacked');
    const isPhone = () => window.innerWidth < PHONE;
    const collapsed = () => S().collapsed || {};
    function saveUi(patch) { L4N.store.set(s => ({ ui: Object.assign({}, s.ui, typeof patch === 'function' ? patch(s.ui) : patch) })); }

    // the console must fit 80 monospace characters at every desktop size
    function consoleMinW() {
      if (!charW) { const m = el('span', { class: 'con__measure', text: '0'.repeat(80) }); parts.console.append(m); charW = m.getBoundingClientRect().width / 80 || 7.8; m.remove(); }
      return Math.ceil(charW * 80) + 24 + 12;
    }

    function sizes() {
      const W = frame.clientWidth, H = frame.clientHeight, lay = layout(), saved = (S().panes || {})[lay] || {};
      const c = collapsed();
      // Tasks width
      const consoleW = consoleMinW();
      let tasksMax = LIM.tasksMax;
      if (lay === 'stacked') tasksMax = Math.min(tasksMax, W - consoleW - 1);
      else tasksMax = Math.min(tasksMax, W - consoleW - LIM.mapWMin - 2);
      tasksMax = Math.max(LIM.tasksMin, tasksMax);
      let tasks = saved.tasks != null ? Math.round(saved.tasks * W) : 340;
      tasks = Math.max(LIM.tasksMin, Math.min(tasks, tasksMax));
      const tasksShown = c.tasks || ws.tasksOut ? 36 : tasks;
      // Map height (stacked) or width (side)
      let map, mapMin, mapMax;
      const traceH = parts.trace.offsetHeight || 33;
      if (lay === 'stacked') {
        mapMin = LIM.mapMin; mapMax = Math.max(mapMin, H - traceH - LIM.consoleMin - 1);
        map = saved.map != null ? Math.round(saved.map * H) : Math.round(Math.min(290, Math.max(mapMin, H * 0.4)));
      } else {
        const rest = W - tasksShown - 2;
        mapMin = LIM.mapWMin; mapMax = Math.max(mapMin, rest - consoleW);
        map = saved.map != null ? Math.round(saved.map * W) : Math.round(rest * 0.45);
      }
      map = Math.max(mapMin, Math.min(map, mapMax));
      return { W, H, lay, tasks, tasksShown, tasksMax, map, mapMin, mapMax, c };
    }

    function apply() {
      if (!frame.isConnected) return;
      const phone = isPhone();
      frame.setAttribute('data-phone', String(phone));
      if (phone) {
        frame.setAttribute('data-layout', 'phone');
        frame.setAttribute('data-pane', phonePane);
        for (const k in phoneBtns) phoneBtns[k].setAttribute('aria-pressed', String(k === phonePane));
        if (ws.map) ws.map.layout();
        return;
      }
      const z = sizes();
      frame.setAttribute('data-layout', z.lay);
      frame.removeAttribute('data-pane');
      frame.classList.toggle('is-tasks-collapsed', !!(z.c.tasks || ws.tasksOut));
      frame.classList.toggle('is-map-collapsed', !!z.c.map);
      frame.style.setProperty('--tasks-w', z.tasksShown + 'px');
      if (z.lay === 'stacked') { frame.style.setProperty('--map-h', (z.c.map ? 32 : z.map) + 'px'); frame.style.removeProperty('--map-w'); }
      else { frame.style.setProperty('--map-w', (z.c.map ? 36 : z.map) + 'px'); frame.style.removeProperty('--map-h'); }
      // separators
      h1.hidden = !!(z.c.tasks || ws.tasksOut);
      h1.setAttribute('aria-valuemin', String(LIM.tasksMin)); h1.setAttribute('aria-valuemax', String(z.tasksMax)); h1.setAttribute('aria-valuenow', String(z.tasks));
      h1.setAttribute('aria-valuetext', z.tasks + ' pixels wide');
      h2.hidden = !!z.c.map;
      h2.className = 'handle ws__h2 ' + (z.lay === 'stacked' ? 'handle--h' : 'handle--v');
      h2.setAttribute('aria-orientation', z.lay === 'stacked' ? 'horizontal' : 'vertical');
      h2.setAttribute('aria-label', z.lay === 'stacked' ? 'Resize the map and the console' : 'Resize the map');
      h2.setAttribute('aria-valuemin', String(z.mapMin)); h2.setAttribute('aria-valuemax', String(z.mapMax)); h2.setAttribute('aria-valuenow', String(z.map));
      h2.setAttribute('aria-valuetext', z.map + (z.lay === 'stacked' ? ' pixels tall' : ' pixels wide'));
      h2.setAttribute('data-tip', 'Drag, or use the arrow keys. Double-click resets.');
      if (ws.console) ws.console.setMaximised(!!z.c.map);
      if (ws.onLayout) ws.onLayout();
    }

    function store(which, px) {
      const z = sizes(), lay = z.lay;
      const frac = which === 'tasks' ? px / z.W : (lay === 'stacked' ? px / z.H : px / z.W);
      saveUi(u => { const panes = Object.assign({}, u.panes); panes[lay] = Object.assign({}, panes[lay], { [which]: Math.round(frac * 100000) / 100000 }); return { panes }; });
    }
    function setSize(which, px) {
      const z = sizes();
      const v = which === 'tasks' ? Math.max(LIM.tasksMin, Math.min(px, z.tasksMax)) : Math.max(z.mapMin, Math.min(px, z.mapMax));
      store(which, v);
      apply();
    }
    function resetSizes(which) {
      saveUi(u => { const panes = Object.assign({}, u.panes); const p = Object.assign({}, panes[layout()]); if (which) delete p[which]; else { delete p.tasks; delete p.map; } panes[layout()] = p; return { panes }; });
      apply();
    }

    function drag(handle, which) {
      handle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        handle.classList.add('is-dragging');
        const z = sizes(), r = frame.getBoundingClientRect();
        const vertical = which === 'tasks' || z.lay === 'side';
        const move = ev => {
          let px;
          if (which === 'tasks') px = ev.clientX - r.left;
          else if (vertical) px = ev.clientX - r.left - z.tasksShown - 1;
          else px = ev.clientY - r.top;
          const v = which === 'tasks' ? Math.max(LIM.tasksMin, Math.min(px, z.tasksMax)) : Math.max(z.mapMin, Math.min(px, z.mapMax));
          if (which === 'tasks') frame.style.setProperty('--tasks-w', v + 'px');
          else frame.style.setProperty(z.lay === 'stacked' ? '--map-h' : '--map-w', v + 'px');
          handle.setAttribute('aria-valuenow', String(Math.round(v)));
          handle._v = v;
          if (ws.map) ws.map.layout();
        };
        const up = () => {
          handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up);
          handle.classList.remove('is-dragging');
          if (handle._v != null) { store(which, handle._v); handle._v = null; }
          apply();
        };
        handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
      });
      handle.addEventListener('dblclick', () => resetSizes(which));
      handle.addEventListener('keydown', e => {
        const z = sizes(), cur = which === 'tasks' ? z.tasks : z.map;
        const vertical = which === 'tasks' || z.lay === 'side';
        const dec = vertical ? 'ArrowLeft' : 'ArrowUp', inc = vertical ? 'ArrowRight' : 'ArrowDown';
        let v = null;
        if (e.key === dec) v = cur - 16; else if (e.key === inc) v = cur + 16;
        else if (e.key === 'Home') v = which === 'tasks' ? LIM.tasksMin : z.mapMin;
        else if (e.key === 'End') v = which === 'tasks' ? z.tasksMax : z.mapMax;
        else if (e.key === 'Enter') { e.preventDefault(); resetSizes(which); return; }
        if (v == null) return;
        e.preventDefault();
        setSize(which, v);
      });
    }
    drag(h1, 'tasks');
    drag(h2, 'map');

    function toggle(which, force) {
      saveUi(u => { const c = Object.assign({}, u.collapsed); const v = force != null ? force : !c[which]; if (v) c[which] = true; else delete c[which]; return { collapsed: c }; });
      apply();
    }
    function showPhone(k) {
      phonePane = k; apply();
      if (k === 'console' && ws.console) ws.console.focus();
      else if (k === 'map' && ws.map) ws.map.layout();
    }

    const onResize = () => apply();
    window.addEventListener('resize', onResize);
    const unsub = L4N.store.subscribe((s, p) => { if (s.ui.layout !== p.ui.layout) apply(); });
    requestAnimationFrame(apply);

    return {
      el: frame, apply, toggle, resetSizes, showPhone, setSize,
      layout, isPhone, phonePane: () => phonePane,
      setLayout(l) { saveUi({ layout: l }); apply(); },
      collapsed: k => !!collapsed()[k],
      destroy() { window.removeEventListener('resize', onResize); unsub(); }
    };
  }

  L4N.panes = { create: createPanes, LIM };
})(window.L4N = window.L4N || {});
