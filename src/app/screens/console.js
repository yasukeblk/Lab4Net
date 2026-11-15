// console.js: the device console (section 5.6). Every line is a span filled with textContent.
(function (L4N) {
  'use strict';
  const { el, icon, svg, clear, id } = L4N.dom;
  const sim = L4N.sim, ui = L4N.ui;
  const PACE = { real: 1, fast: 0.4 };

  function devIcon(kind) { return svg('svg', { class: 'dev-ic', viewBox: '0 0 40 40', 'aria-hidden': 'true', focusable: 'false' }, svg('use', { href: '#d-' + kind })); }

  // createConsole(ws): ws = {st, onCommand(res, line, dev), onSelect(dev), onFinished(dev, lines), maximise()}
  function createConsole(ws) {
    const st = ws.st;
    const outId = id('con-out'), hintId = id('con-hint');
    let stream = null, announcedEsc = false, tabs = {}, shown = null;

    const tabsEl = el('div', { class: 'con__tabs', role: 'tablist', 'aria-label': 'Devices' });
    const modeChip = el('span', { class: 'chip con__mode' });
    const maxBtn = ui.button({ icon: 'maximize', aria: 'Maximise the console', onClick: () => ws.maximise && ws.maximise() });
    const tools = el('div', { class: 'con__tools' }, modeChip, el('span', { class: 'spacer' }),
      ui.button({ label: 'Clear', kind: 'ghost', tip: 'Clear the screen', kbd: 'ctrl+l', tipKbd: true, showKbd: false, onClick: () => { clearScreen(); input.focus(); } }), maxBtn);
    const out = el('div', { class: 'con__out', id: outId, role: 'tabpanel', tabindex: '-1' });
    const jump = ui.button({ label: 'Jump to latest', icon: 'chevron-down', kind: 'secondary', class: 'con__jump', onClick: () => { toBottom(); input.focus(); } });
    jump.hidden = true;
    const promptEl = el('span', { class: 'con__prompt', 'aria-hidden': 'true' });
    const input = el('input', { class: 'con__input', type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
      maxlength: '512', 'aria-describedby': hintId, enterkeyhint: 'send' });
    const why = el('div', { class: 'con__why', id: hintId });
    const log = el('div', { class: 'sr-only', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    // phones: a one-line ping result above the input, and helper keys under it
    const resultBar = el('div', { class: 'con__result', hidden: true });
    const helpers = el('div', { class: 'con__helpers', role: 'toolbar', 'aria-label': 'Console keys' },
      [['Tab', 'tab', 'Complete the word'], ['?', 'help', 'Help'], ['↑', 'up', 'Previous command'], ['↓', 'down', 'Next command'], ['Ctrl+C', 'stop', 'Stop the output'], ['Ctrl+Z', 'end', 'End configuration']]
        .map(([t, k, a]) => el('button', { class: 'btn btn--secondary', type: 'button', 'aria-label': a, onPointerdown: e => e.preventDefault(), onClick: () => helperKey(k) }, t)));
    const root = el('section', { class: 'pane console', 'aria-label': 'Console', id: 'ws-console' },
      tabsEl, tools, el('div', { class: 'con__view' }, out, jump), resultBar, el('div', { class: 'con__line' }, promptEl, input), helpers, why, log);
    function helperKey(k) {
      if (k === 'tab') { const c = sim.complete(st, st.sel, input.value); if (c) input.value = c; }
      else if (k === 'help') { input.value += '?'; input.dispatchEvent(new Event('input')); }
      else if (k === 'up') history(-1);
      else if (k === 'down') history(1);
      else if (k === 'stop') { if (stream) stop(true); }
      else if (k === 'end') { if (sim.canEnd(st, st.sel)) run('end'); }
      input.focus({ preventScroll: true });
    }
    function showResult(T, onView) {
      clear(resultBar);
      if (!T) { resultBar.hidden = true; return; }
      resultBar.hidden = false;
      const ok = !!T.ok;
      resultBar.append(icon(ok ? 'check-circle' : 'x-circle', ok ? 'ok' : 'bad'), el('span', { class: 'con__result-text', text: L4N.traceView.result(T) }),
        ui.button({ label: 'View on map', kind: 'ghost', onClick: onView }));
    }

    function keyHints() {
      clear(why);
      why.append(el('span', { class: 'con__keys' },
        el('span', {}, el('kbd', { class: 'kbd', text: '?' }), 'help'), el('span', {}, el('kbd', { class: 'kbd', text: 'Tab' }), 'complete'),
        el('span', {}, el('kbd', { class: 'kbd', text: '↑' }), el('kbd', { class: 'kbd', text: '↓' }), 'history'),
        el('span', {}, el('kbd', { class: 'kbd', text: 'Ctrl' }), el('kbd', { class: 'kbd', text: 'Z' }), 'end'),
        el('span', {}, el('kbd', { class: 'kbd', text: 'Esc' }), 'leave the console')));
    }
    function setWhy(text) {
      if (!text) { keyHints(); return; }
      clear(why); why.append(el('span', {}, el('b', { text: 'Why: ' }), text));
    }

    // ---- output ----
    const atBottom = () => out.scrollHeight - out.scrollTop - out.clientHeight < 24;
    function toBottom() { out.scrollTop = out.scrollHeight; jump.hidden = true; }
    out.addEventListener('scroll', () => { if (atBottom()) jump.hidden = true; });
    const span = l => el('span', { class: 'cl' + (l.c ? ' cl--' + l.c : ''), text: l.t || '​' });

    function renderAll() {
      const con = st.con[st.sel];
      clear(out);
      const frag = document.createDocumentFragment();
      for (const l of con.lines) frag.append(span(l));
      out.append(frag);
      shown = st.sel;
      toBottom();
    }
    function addLines(dev, texts, cls) {
      const con = st.con[dev];
      const before = con.lines.length;
      sim.push(con, texts, cls);
      if (dev !== shown) return;
      const stick = atBottom();
      const added = Math.min(texts.length, con.lines.length);
      const frag = document.createDocumentFragment();
      for (let i = con.lines.length - added; i < con.lines.length; i++) frag.append(span(con.lines[i]));
      out.append(frag);
      while (out.children.length > con.lines.length) out.firstChild.remove();
      if (before + texts.length !== con.lines.length && out.children.length !== con.lines.length) renderAll();
      if (stick) toBottom(); else jump.hidden = false;
    }
    function appendToLast(dev, text) {
      const con = st.con[dev];
      if (!con.lines.length) { addLines(dev, [text]); return; }
      const l = con.lines[con.lines.length - 1];
      l.t += text; l.c = sim.lineClass(l.t);
      if (dev !== shown) return;
      const stick = atBottom();
      const node = out.lastChild;
      if (node) { node.textContent = l.t; node.className = 'cl' + (l.c ? ' cl--' + l.c : ''); }
      if (stick) toBottom();
    }
    function clearScreen() { const con = st.con[st.sel]; con.lines = []; renderAll(); }

    // A finished command's output is read out once, cut to 20 lines.
    function announce(lines) {
      const L = lines.filter(x => x.trim());
      if (!L.length) return;
      const text = L.slice(0, 20).join('\n') + (L.length > 20 ? '\nand ' + (L.length - 20) + ' more lines' : '');
      while (log.children.length > 4) log.firstChild.remove();
      log.append(el('div', { text }));
    }

    // ---- paced output (ping, traceroute) ----
    function paceScale() {
      if (L4N.motion.reduced()) return 0;
      const p = L4N.store.get().settings.pace;
      return p === 'instant' ? 0 : PACE[p] || 0.4;
    }
    function streamStart(dev, lines, pace) {
      const scale = paceScale(), units = [];
      lines.forEach((line, i) => {
        const p = pace.t[i];
        let parts;
        if (p && p.chars) parts = [...line].map((c, k) => [p.chars[k] || 0, c, true]);
        else if (p && p.parts) parts = p.parts.map(([ms, txt]) => [ms, txt, false]);
        else parts = [[typeof p === 'number' ? p : p && p.d || 0, line, !!(p && p.pkt)]];
        parts.forEach(([ms, txt, pkt], k) => units.push({ ms: Math.round(ms * scale), txt, pkt, first: k === 0 }));
      });
      stream = { dev, units, pos: 0, pkts: 0, abort: pace.abort, full: lines, timer: 0 };
      refreshPrompt();
      tick(true);
    }
    function unit(S, u) { if (u.first) addLines(S.dev, [u.txt]); else appendToLast(S.dev, u.txt); if (u.pkt) S.pkts++; }
    function tick(first) {
      const S = stream;
      if (!S) return;
      S.timer = 0;
      let k = 0;
      while (S.pos < S.units.length && (S.units[S.pos].ms === 0 || (!first && k === 0))) { unit(S, S.units[S.pos++]); k++; }
      if (S.pos >= S.units.length) { stop(false); return; }
      S.timer = setTimeout(() => tick(false), S.units[S.pos].ms);
    }
    // stop(true) is Ctrl+C: print the engine's abort summary. stop(false) finishes the output at once.
    function stop(abort) {
      const S = stream;
      if (!S) return;
      if (S.timer) clearTimeout(S.timer);
      stream = null;
      let lines = S.full;
      if (abort) { const sum = S.abort ? S.abort(S.pkts) : []; addLines(S.dev, sum); lines = sum; }
      else while (S.pos < S.units.length) unit(S, S.units[S.pos++]);
      for (const d of sim.drain(st, null)) if (d === shown) renderAll();
      refreshPrompt();
      announce(lines);
      if (ws.onFinished) ws.onFinished(S.dev);
    }

    // ---- prompt, mode, tabs ----
    function refreshPrompt() {
      const p = sim.prompt(st, st.sel);
      const playing = stream && stream.dev === st.sel;
      promptEl.textContent = playing ? '' : p.text;
      input.placeholder = playing ? 'Running… Ctrl+C to stop' : '';
      const type = p.masked ? 'password' : 'text';
      if (input.type !== type) input.type = type;
      modeChip.textContent = p.modeName;
      const d = st.net.devs[st.sel];
      input.setAttribute('aria-label', 'Console for ' + d.hostname + ', ' + p.modeName.toLowerCase());
    }
    function renderTabs() {
      clear(tabsEl); tabs = {};
      for (const dv of sim.devices(st)) {
        const t = el('button', {
          class: 'con__tab', type: 'button', role: 'tab', id: id('con-tab'), 'aria-selected': String(dv.name === st.sel), tabindex: dv.name === st.sel ? '0' : '-1',
          'aria-controls': outId, 'data-dev': dv.name, onClick: () => { select(dv.name); input.focus(); }
        }, devIcon(dv.kind), el('span', { text: dv.hostname }),
        el('span', { class: 'dot ' + (dv.linked ? (dv.up ? 'dot--up' : 'dot--down') : 'dot--none'), 'aria-hidden': 'true' }),
        el('span', { class: 'sr-only', text: dv.linked ? ', ' + dv.up + ' of ' + dv.linked + ' links up' : '' }));
        tabs[dv.name] = t; tabsEl.append(t);
      }
      const cur = tabs[st.sel];
      if (cur) out.setAttribute('aria-labelledby', cur.id);
    }
    function refreshTabs() {
      for (const dv of sim.devices(st)) {
        const t = tabs[dv.name]; if (!t) continue;
        t.childNodes[1].textContent = dv.hostname;
        t.childNodes[2].className = 'dot ' + (dv.linked ? (dv.up ? 'dot--up' : 'dot--down') : 'dot--none');
        t.childNodes[3].textContent = dv.linked ? ', ' + dv.up + ' of ' + dv.linked + ' links up' : '';
      }
    }
    tabsEl.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const names = st.devs, i = names.indexOf(st.sel);
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? names.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + names.length) % names.length;
      select(names[j]); tabs[names[j]].focus();
    });

    function select(dev) {
      if (!st.net.devs[dev]) return;
      st.sel = dev;
      for (const n in tabs) { const on = n === dev; tabs[n].setAttribute('aria-selected', String(on)); tabs[n].tabIndex = on ? 0 : -1; if (on) out.setAttribute('aria-labelledby', tabs[n].id); }
      input.value = '';
      renderAll(); refreshPrompt();
      if (ws.onSelect) ws.onSelect(dev);
    }

    // ---- running commands ----
    function run(line) {
      stop(false);
      const dev = st.sel;
      const r = sim.exec(st, dev, line);
      if (r.error) { L4N.toast({ text: r.error, kind: 'warn' }); return null; }
      addLines(dev, [r.echo], 'cmd');
      const playing = r.lines.length && r.pace && paceScale() > 0;
      if (r.lines.length) { if (playing) streamStart(dev, r.lines, r.pace); else { addLines(dev, r.lines); announce(r.lines); } }
      for (const d of sim.drain(st, playing ? dev : null)) if (d === shown && !playing) renderAll();
      setWhy(r.why);
      refreshPrompt(); refreshTabs();
      if (ws.onCommand) ws.onCommand(r, line, dev);
      return r;
    }

    function history(dir) {
      const con = st.con[st.sel];
      if (dir < 0) { if (con.hi > 0) input.value = con.hist[--con.hi]; }
      else input.value = con.hi < con.hist.length - 1 ? con.hist[++con.hi] : (con.hi = con.hist.length, '');
      const n = input.value.length; input.setSelectionRange(n, n);
    }

    input.addEventListener('focus', () => {
      if (announcedEsc) return; announcedEsc = true;
      L4N.shell.announce('Console. Tab completes commands. Press Escape to leave the console, then Tab moves on.');
    });
    input.addEventListener('input', () => {
      if (!input.value.includes('?')) return;
      const line = input.value.replace(/\?/g, '');
      const rows = sim.help(st, st.sel, line);
      if (!rows) return; // during a question, ? is a normal character
      addLines(st.sel, [rows[0]], 'cmd'); addLines(st.sel, rows.slice(1)); announce(rows.slice(1));
      input.value = line;
    });
    input.addEventListener('keydown', e => {
      const ctrl = e.ctrlKey && !e.metaKey && !e.altKey;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (stream && ctrl && ((k === 'c' && input.selectionStart === input.selectionEnd) || (e.shiftKey && (e.code === 'Digit6' || k === '^' || k === '6')))) { e.preventDefault(); stop(true); return; }
      if (ctrl && e.shiftKey && (e.code === 'Digit6' || k === '^')) { e.preventDefault(); return; }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) { e.preventDefault(); const line = input.value; input.value = ''; run(line); return; }
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); if (e.shiftKey) return; const c = sim.complete(st, st.sel, input.value); if (c) input.value = c; return; }
      if (e.key === 'Escape') { e.preventDefault(); out.focus(); return; }
      if (e.key === 'ArrowUp' || (ctrl && k === 'p')) { e.preventDefault(); history(-1); return; }
      if (e.key === 'ArrowDown' || (ctrl && k === 'n')) { e.preventDefault(); history(1); return; }
      if (!ctrl || e.shiftKey) return;
      if (k === 'a') { e.preventDefault(); input.setSelectionRange(0, 0); }
      else if (k === 'e') { e.preventDefault(); const n = input.value.length; input.setSelectionRange(n, n); }
      else if (k === 'u') { e.preventDefault(); input.value = ''; }
      else if (k === 'l') { e.preventDefault(); clearScreen(); }
      else if (k === 'z') { e.preventDefault(); if (sim.canEnd(st, st.sel)) run('end'); }
    });
    // Pasting several lines runs them one at a time, in order (up to 200), like pasting a config.
    input.addEventListener('paste', e => {
      const cd = e.clipboardData || window.clipboardData;
      const text = cd ? (cd.getData('text/plain') || cd.getData('text') || '') : '';
      if (!/[\r\n]/.test(text)) return;
      e.preventDefault();
      const lines = text.split(/\r?\n|\r/).filter(x => x.trim());
      if (!lines.length) return;
      if (lines.length > 200) { L4N.toast({ text: 'Paste up to 200 commands at a time.', kind: 'warn' }); return; }
      if (lines.some(x => x.length > 512)) { L4N.toast({ text: 'Keep each pasted command under 512 characters.', kind: 'warn' }); return; }
      lines[0] = input.value + lines[0];
      input.value = '';
      for (const l of lines) if (!run(l)) break;
    });
    out.addEventListener('click', () => { const s = window.getSelection(); if (s && String(s).length) return; input.focus({ preventScroll: true }); });

    renderTabs(); renderAll(); refreshPrompt(); keyHints();
    return {
      el: root, input, out, run, select, stop, showResult, refreshPrompt, refreshTabs, renderAll, clearScreen,
      focus() { input.focus({ preventScroll: true }); },
      playing: () => !!stream,
      setMaximised(on) { maxBtn.setAttribute('aria-label', on ? 'Restore the map' : 'Maximise the console'); maxBtn.setAttribute('data-tip', on ? 'Restore the map' : 'Maximise the console'); clear(maxBtn).append(icon(on ? 'minimize' : 'maximize')); },
      destroy() { if (stream && stream.timer) clearTimeout(stream.timer); stream = null; }
    };
  }

  L4N.consoleView = { create: createConsole, devIcon };
})(window.L4N = window.L4N || {});
