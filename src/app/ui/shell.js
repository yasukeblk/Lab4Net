// shell.js: sidebar, top bar, screen mounting and the app-wide commands and shortcuts.
(function (L4N) {
  'use strict';
  const { el, icon, clear } = L4N.dom;
  const ui = L4N.ui;

  // ---- screens ----
  // register(name, {title(params), crumbs(params), nav, mount(root, params, ctx) → cleanup fn})
  const defs = {};
  L4N.screens = { register(name, def) { defs[name] = def; }, get: n => defs[n] };

  const NAV = [
    { id: 'home', label: 'Home', icon: 'home', href: '#/', keys: 'g h' },
    { id: 'labs', label: 'Labs', icon: 'labs', href: '#/labs', keys: 'g l', count: () => L4N.stats && L4N.stats.labs() },
    { id: 'lessons', label: 'Lessons', icon: 'lessons', href: '#/lessons', keys: 'g e', count: () => L4N.stats && L4N.stats.lessons() },
    { id: 'practice', label: 'Practice', icon: 'practice', href: '#/practice', keys: 'g p' },
    { id: 'sandbox', label: 'Sandbox', icon: 'sandbox', href: '#/sandbox', keys: 'g b' },
    { id: 'progress', label: 'Progress', icon: 'progress', href: '#/progress', keys: 'g r' }
  ];

  let app, sidebar, topbar, crumbsEl, statusEl, actionsEl, warnEl, screenEl, announcer, navNodes = {}, recentBox, scrim;
  let route = null, cleanup = null, lastRoute = null;

  function store() { return L4N.store; }
  function state() { return L4N.store.get(); }

  // ---- sidebar ----
  function logo() {
    return L4N.dom.svg('svg', { class: 'logo', viewBox: '0 0 32 32', 'aria-hidden': 'true', focusable: 'false' },
      L4N.dom.svg('rect', { width: '32', height: '32', rx: '7', style: 'fill:var(--accent-solid)' }),
      L4N.dom.svg('path', { d: 'M10 9v9.5a4.5 4.5 0 0 0 4.5 4.5H22', fill: 'none', stroke: '#fff', 'stroke-width': '3', 'stroke-linecap': 'round' }),
      L4N.dom.svg('circle', { cx: '10', cy: '9', r: '3.25', fill: '#fff' }),
      L4N.dom.svg('circle', { cx: '22.5', cy: '23', r: '3.25', fill: '#fff' }),
      L4N.dom.svg('circle', { cx: '16.5', cy: '23', r: '2.4', fill: '#fff' }));
  }
  L4N.logo = logo;

  function navItem(n) {
    const a = el('a', { class: 'sb__item', href: n.href, 'data-nav': n.id, 'data-tip': n.label, 'data-kbd': n.keys },
      icon(n.icon), el('span', { text: n.label }), n.count ? el('span', { class: 'sb__count num' }) : null);
    a.addEventListener('click', closeDrawer);
    navNodes[n.id] = a;
    return a;
  }

  function buildSidebar() {
    const search = el('button', { class: 'sb__search', type: 'button', 'aria-label': 'Search or jump to', 'data-tip': 'Search or jump to', 'data-kbd': 'mod+k',
      onClick: () => { closeDrawer(); L4N.palette.open(); } }, icon('search'), el('span', { text: 'Search or jump to…' }), el('span', { class: 'kbds', 'aria-hidden': 'true' }, el('kbd', { class: 'kbd', text: ui.keyParts('mod+k')[0].join(' ') })));
    recentBox = el('div', { class: 'sb__recentbox' });
    const themeBtn = el('button', { class: 'sb__item', type: 'button', 'aria-label': 'Theme', 'data-tip': 'Theme', onClick: e => themeMenu(e.currentTarget) },
      icon('moon'), el('span', { text: 'Theme' }));
    themeBtn.dataset.themeBtn = '1';
    sidebar = el('nav', { class: 'sidebar', 'aria-label': 'Main', id: 'sidebar' },
      el('div', { class: 'sb__top' },
        el('a', { class: 'sb__brand', href: '#/', 'aria-label': 'Lab4Net home', 'data-tip': 'Home', onClick: closeDrawer }, logo(), el('span', { class: 'wordmark', text: 'Lab4Net' })),
        search),
      el('div', { class: 'sb__nav' }, NAV.map(navItem), recentBox),
      el('div', { class: 'sb__bottom' },
        navItem({ id: 'settings', label: 'Settings', icon: 'settings', href: '#/settings', keys: 'g ,' }),
        themeBtn,
        el('a', { class: 'sb__item', href: L4N.site.donate, target: '_blank', rel: 'noopener noreferrer', 'data-tip': 'Support Lab4Net (opens in a new tab)' },
          icon('heart'), el('span', { text: 'Support Lab4Net' }))));
    return sidebar;
  }

  function refreshSidebar() {
    for (const n of NAV) {
      const node = navNodes[n.id];
      if (!node) continue;
      const c = n.count && n.count();
      const span = node.querySelector('.sb__count');
      if (span && c) { span.textContent = c.done + '/' + c.total; node.setAttribute('aria-label', n.label + ', ' + c.done + ' of ' + c.total + ' done'); }
    }
    // Continue: the last three labs touched
    clear(recentBox);
    const recent = (state().ui.recent || []).map(s => L4N.data && L4N.data.lab(s)).filter(Boolean);
    if (recent.length) {
      recentBox.append(el('div', { class: 'sb__sep' }), el('div', { class: 'sb__label label-caps', text: 'Continue' }),
        ...recent.map(l => el('a', { class: 'sb__item sb__recent', href: L4N.router.href('lab', l.slug), 'data-tip': l.title, onClick: closeDrawer },
          ui.statusIcon(L4N.stats ? L4N.stats.labStatus(l.slug) : 'todo'), el('span', { text: l.short || l.title }))));
    }
  }

  function themeMenu(anchor) {
    const t = state().settings.theme;
    L4N.menu.open(anchor, [
      { label: 'Dark', icon: 'moon', checked: t === 'dark', run: () => setSetting({ theme: 'dark' }) },
      { label: 'Light', icon: 'sun', checked: t === 'light', run: () => setSetting({ theme: 'light' }) },
      { label: 'System', icon: 'monitor', checked: t === 'system', run: () => setSetting({ theme: 'system' }) }
    ], { label: 'Theme', focusChecked: true });
  }

  function setSetting(patch) { store().set(s => ({ settings: Object.assign({}, s.settings, patch) })); }
  function setUi(patch) { store().set(s => ({ ui: Object.assign({}, s.ui, patch) })); }
  L4N.setSetting = setSetting; L4N.setUi = setUi;

  // ---- sidebar collapse: [ toggles; inside a lab the choice is remembered separately ----
  function sidebarMode() {
    const s = state();
    if (route && route.screen === 'lab') {
      if (s.ui.sidebarLab) return s.ui.sidebarLab;
      if (s.settings.sidebarInLabs === 'open') return s.ui.sidebar;
      return window.innerWidth < 1600 ? 'rail' : s.ui.sidebar;
    }
    return s.ui.sidebar;
  }
  function applySidebar() { app.setAttribute('data-sidebar', sidebarMode()); }
  function toggleSidebar() {
    if (window.innerWidth < 768) { toggleDrawer(); return; }
    const next = sidebarMode() === 'rail' ? 'open' : 'rail';
    if (route && route.screen === 'lab') setUi({ sidebarLab: next }); else setUi({ sidebar: next });
  }

  // ---- phone drawer ----
  function toggleDrawer(force) {
    const open = force != null ? force : app.getAttribute('data-drawer') !== 'open';
    app.setAttribute('data-drawer', open ? 'open' : 'closed');
    scrim.hidden = !open;
    const btn = topbar.querySelector('.topbar__menu');
    if (btn) btn.setAttribute('aria-expanded', String(open));
    if (open) { const f = sidebar.querySelector('.sb__search'); if (f) f.focus(); }
  }
  function closeDrawer() { if (app && app.getAttribute('data-drawer') === 'open') toggleDrawer(false); }

  // ---- top bar ----
  function buildTopbar() {
    crumbsEl = el('div', { class: 'crumbs' });
    statusEl = el('div', { class: 'topbar__status' });
    warnEl = el('div', { class: 'topbar__warn', role: 'alert', hidden: true }, icon('alert'), el('span', { text: 'Not saved. Export a backup to keep your work.' }));
    actionsEl = el('div', { class: 'topbar__actions' });
    topbar = el('header', { class: 'topbar' },
      ui.button({ icon: 'menu', aria: 'Open navigation', class: 'topbar__menu', onClick: () => toggleDrawer() }),
      el('nav', { 'aria-label': 'Breadcrumb', class: 'crumbs-nav', style: 'min-width:0;display:flex' }, crumbsEl), statusEl, warnEl, actionsEl);
    topbar.querySelector('.topbar__menu').setAttribute('aria-controls', 'sidebar');
    topbar.querySelector('.topbar__menu').setAttribute('aria-expanded', 'false');
    return topbar;
  }

  function setCrumbs(parts) {
    clear(crumbsEl);
    const ol = el('ol', { style: 'display:flex;align-items:center;gap:4px;min-width:0' });
    parts.forEach((p, i) => {
      const last = i === parts.length - 1;
      ol.append(el('li', { style: 'display:flex;align-items:center;gap:4px;min-width:0' },
        i ? icon('chevron-right') : null,
        last || !p.href ? el('span', { text: p.label, 'aria-current': last ? 'page' : null }) : el('a', { href: p.href, text: p.label })));
    });
    crumbsEl.append(ol);
  }

  const topbarApi = {
    setCrumbs,
    setStatus(...nodes) { clear(statusEl); statusEl.append(...nodes.flat().filter(Boolean)); },
    setActions(...nodes) { clear(actionsEl); actionsEl.append(...nodes.flat().filter(Boolean)); }
  };

  // ---- routing ----
  function announce(text) { announcer.textContent = ''; setTimeout(() => { announcer.textContent = text; }, 30); }

  function show(r, first) {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    L4N.toast.leave();
    route = r;
    L4N.route = r;
    const def = defs[r.screen] || defs.home;
    clear(screenEl);
    topbarApi.setStatus(); topbarApi.setActions();
    const title = def.title ? def.title(r) : 'Lab4Net';
    setCrumbs(def.crumbs ? def.crumbs(r) : [{ label: title }]);
    document.title = title && title !== 'Lab4Net' ? title + ' · Lab4Net' : 'Lab4Net · Free CCNA lab simulator in your browser';
    for (const k in navNodes) navNodes[k].removeAttribute('aria-current');
    const nav = navNodes[def.nav || r.screen];
    if (nav) nav.setAttribute('aria-current', 'page');
    screenEl.setAttribute('data-screen', r.screen);
    applySidebar();
    L4N.ctx = { route: r, topbar: topbarApi, filter: null, list: null };
    try { cleanup = def.mount(screenEl, r, L4N.ctx) || null; }
    catch (e) { console.error(e); clear(screenEl).append(ui.empty({ icon: 'alert', what: 'This screen could not be shown.', todo: 'Go back Home and try again.', action: { label: 'Home', href: '#/' } })); }
    if (!first) {
      const h = screenEl.querySelector('[data-heading]') || screenEl.querySelector('h1');
      if (h) { if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      screenEl.scrollTop = 0;
      announce(title);
    }
    lastRoute = r;
  }

  function onHash() {
    const r = L4N.router.parse(location.hash);
    if (r.badSlug) L4N.toast({ text: 'That link is out of date.', kind: 'warn' });
    if (r.unknown && location.hash && location.hash !== '#' && location.hash !== '#/') history.replaceState(null, '', '#/');
    // a screen can refuse to be left (for example while an exam runs)
    if (L4N.guard) { const g = L4N.guard(r, lastRoute); if (g === false) { if (lastRoute) history.replaceState(null, '', hrefOf(lastRoute)); return; } }
    show(r);
  }
  const hrefOf = r => L4N.router.href(r.screen, r.slug);
  function go(href) { if (location.hash === href) onHash(); else location.hash = href; }

  // ---- commands ----
  function commandsBase() {
    const s = state();
    const out = [];
    for (const n of NAV.concat([{ id: 'settings', label: 'Settings', icon: 'settings', href: '#/settings', keys: 'g ,' }])) {
      out.push({ id: 'go-' + n.id, group: 'Go to', title: n.label, icon: n.icon, kbd: n.keys, keywords: 'go open', run: () => go(n.href) });
    }
    const T = s.settings.theme, C = s.settings.consoleTheme;
    out.push(
      { id: 'theme-dark', group: 'Appearance', title: 'Theme: dark', icon: 'moon', subtitle: T === 'dark' ? 'Current' : '', run: () => setSetting({ theme: 'dark' }) },
      { id: 'theme-light', group: 'Appearance', title: 'Theme: light', icon: 'sun', subtitle: T === 'light' ? 'Current' : '', run: () => setSetting({ theme: 'light' }) },
      { id: 'theme-system', group: 'Appearance', title: 'Theme: system', icon: 'monitor', subtitle: T === 'system' ? 'Current' : 'Follow your computer', run: () => setSetting({ theme: 'system' }) },
      { id: 'sidebar', group: 'Appearance', title: 'Toggle sidebar', icon: 'sidebar', kbd: '[', run: toggleSidebar },
      { id: 'console-match', group: 'Appearance', title: 'Console: match theme', icon: 'labs', subtitle: C === 'match' ? 'Current' : '', run: () => setSetting({ consoleTheme: 'match' }) },
      { id: 'console-dark', group: 'Appearance', title: 'Console: always dark', icon: 'labs', subtitle: C === 'dark' ? 'Current' : '', run: () => setSetting({ consoleTheme: 'dark' }) });
    if (!(L4N.exam && L4N.exam.running && L4N.exam.running())) {
      out.push(
        { id: 'help-keys', group: 'Help', title: 'Keyboard shortcuts', icon: 'keyboard', kbd: '?', run: L4N.keys.showList },
        { id: 'help-about', group: 'Help', title: 'About Lab4Net', icon: 'info', run: () => { go('#/settings'); setTimeout(() => { const a = document.getElementById('about'); if (a) { a.scrollIntoView(); a.focus(); } }, 0); } },
        { id: 'help-lessons', group: 'Help', title: 'Free lessons on the web', icon: 'external', subtitle: 'Opens in a new tab', run: () => window.open(L4N.site.lessonsUrl, '_blank', 'noopener,noreferrer') },
        { id: 'help-github', group: 'Help', title: 'Source on GitHub', icon: 'external', subtitle: 'Opens in a new tab', run: () => window.open(L4N.site.github, '_blank', 'noopener,noreferrer') },
        { id: 'help-support', group: 'Help', title: 'Support Lab4Net', icon: 'heart', subtitle: 'Buy Me a Coffee, opens in a new tab', run: () => window.open(L4N.site.donate, '_blank', 'noopener,noreferrer') });
    }
    return out;
  }

  function shortcutsBase() {
    const K = L4N.keys;
    K.add({ keys: 'mod+k', label: 'Command palette', group: 'Everywhere', input: true, inDialog: true, run: () => {
      if (L4N.palette.isOpen()) { L4N.palette.close(); return; }
      if (document.querySelector('dialog[open]')) return false;
      L4N.palette.open();
    } });
    K.add({ keys: '?', label: 'Shortcut list', group: 'Everywhere', run: () => K.showList() });
    for (const n of NAV.concat([{ label: 'Settings', href: '#/settings', keys: 'g ,' }])) K.add({ keys: n.keys, label: n.label, group: 'Go to', run: () => go(n.href) });
    K.add({ keys: '[', label: 'Collapse or expand the sidebar', group: 'Everywhere', run: toggleSidebar });
    K.add({ keys: '/', label: 'Focus the list filter', group: 'Lists', run: () => { const f = L4N.ctx && L4N.ctx.filter; if (!f) return false; f.focus(); f.select(); } });
    K.add({ keys: 'j', label: 'Next row', group: 'Lists', hidden: true, run: () => { const l = L4N.ctx && L4N.ctx.list; if (!l) return false; l.move(1); } });
    K.add({ keys: 'k', label: 'Previous row', group: 'Lists', hidden: true, run: () => { const l = L4N.ctx && L4N.ctx.list; if (!l) return false; l.move(-1); } });
    K.extra.push({ keys: 'j', label: 'Next row (or ↓)', group: 'Lists' }, { keys: 'k', label: 'Previous row (or ↑)', group: 'Lists' },
      { keys: 'enter', label: 'Open the selected row', group: 'Lists' }, { keys: 'esc', label: 'Close a dialog, menu or tooltip', group: 'Everywhere' });
  }

  // ---- boot ----
  function mount(root) {
    app = root;
    announcer = el('div', { id: 'announcer', class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    screenEl = el('main', { class: 'screen', id: 'screen', tabindex: '-1' });
    scrim = el('div', { class: 'drawer-scrim', hidden: true, onClick: () => toggleDrawer(false) });
    app.append(buildSidebar(), el('div', { class: 'main' }, buildTopbar(), screenEl), scrim);
    document.body.append(announcer);
    app.addEventListener('keydown', e => { if (e.key === 'Escape' && app.getAttribute('data-drawer') === 'open') { toggleDrawer(false); topbar.querySelector('.topbar__menu').focus(); } });
    L4N.commands.add(commandsBase);
    shortcutsBase();
    store().subscribe((s, prev) => {
      if (s.settings !== prev.settings) L4N.theme.apply(s.settings);
      if (s.ui !== prev.ui || s.settings !== prev.settings) applySidebar();
      if (s.ui !== prev.ui || s.labs !== prev.labs || s.lessons !== prev.lessons) refreshSidebar();
    });
    L4N.storage.onStatus(ok => { warnEl.hidden = ok; });
    window.addEventListener('hashchange', onHash);
    let wasLab = null;
    window.addEventListener('resize', () => { if (route && route.screen === 'lab' && wasLab !== (window.innerWidth < 1600)) { wasLab = window.innerWidth < 1600; applySidebar(); } if (window.innerWidth >= 768) closeDrawer(); });
    refreshSidebar();
    const r = L4N.router.parse(location.hash);
    if (r.badSlug) L4N.toast({ text: 'That link is out of date.', kind: 'warn' });
    show(r, true);
  }

  L4N.shell = { mount, go, toggleSidebar, refreshSidebar, announce, topbar: topbarApi, route: () => route, setCrumbs };
})(window.L4N = window.L4N || {});
