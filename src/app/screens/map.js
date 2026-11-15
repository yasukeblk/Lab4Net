// map.js: the network map (section 5.5). One SVG; every device and link element is created once and kept by key.
// Updates only change attributes and classes, so hover and focus are never lost. All text goes in as text.
(function (L4N) {
  'use strict';
  const { el, svg, icon, clear } = L4N.dom;
  const sim = L4N.sim;
  const SPEED = 0.42, MIN_HOP = 180, ICON = 36;

  const reduced = () => L4N.motion.reduced();

  // createMap(ws, {posOf(name) → [x, y], interactive: true, still: false, label})
  function createMap(ws, opts) {
    opts = opts || {};
    const st = ws.st;
    const posOf = opts.posOf || (n => (st.lab.pos && st.lab.pos[n]) || [300, 120]);
    const svgEl = svg('svg', { class: 'topo', role: 'group', 'aria-roledescription': 'network map', width: '100%', height: '100%' });
    const gLinks = svg('g', { class: 'l-links' }), gHi = svg('g', { class: 'l-hi', 'aria-hidden': 'true' }), gPorts = svg('g', { class: 'l-ports', 'aria-hidden': 'true' });
    const gNodes = svg('g', { class: 'l-nodes' }), gFx = svg('g', { class: 'l-fx', 'aria-hidden': 'true' });
    const gNotes = svg('g', { class: 'l-notes' });
    svgEl.append(gNotes, gLinks, gHi, gPorts, gNodes, gFx);
    if (opts.onBgDown) svgEl.addEventListener('pointerdown', e => { if (!e.target.closest('.node, .link, .note')) opts.onBgDown(e); });
    const tip = el('div', { class: 'maptip', 'aria-hidden': 'true', hidden: true });
    const chip = el('div', { class: 'mapchip', 'aria-hidden': 'true', hidden: true });
    const srList = el('ul', { class: 'sr-only', 'aria-label': 'Links' });
    const body = el('div', { class: 'map__body' }, svgEl, tip, chip, srList);
    const nodes = new Map(), links = new Map();
    let W = 0, H = 0, fit = { s: 1, ox: 0, oy: 0, minX: 0, minY: 0 };
    let token = 0, fadeTimer = 0, tipTimer = 0, tipFor = null, lastTrace = null, markers = [];

    // ---- geometry: lab coordinates fitted into the pane, icons always 36 px ----
    function computeFit() {
      if (opts.view) { const v = opts.view(), s = W / v.w; fit = { s, minX: v.x, minY: v.y, ox: 0, oy: 0 }; return; }
      const names = st.devs;
      if (!names.length) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of names) { const [x, y] = posOf(n); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      const padX = 56, padT = 34, padB = 44;
      const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
      let s = Math.min((W - 2 * padX) / bw, (H - padT - padB) / bh);
      if (!isFinite(s) || s <= 0) s = 1;
      s = Math.max(0.25, Math.min(s, opts.maxScale || 2));
      fit = { s, minX, minY, ox: (W - bw * s) / 2, oy: padT + (H - padT - padB - bh * s) / 2 };
    }
    const P = n => { const [x, y] = posOf(n); return [fit.ox + (x - fit.minX) * fit.s, fit.oy + (y - fit.minY) * fit.s]; };

    // ---- devices ----
    function makeNode(name) {
      const d = st.net.devs[name], kind = sim.devKind(d);
      const g = svg('g', { class: 'node node--' + kind, 'data-dev': name });
      const hit = svg('rect', { class: 'node__hit' });
      const ring = svg('rect', { class: 'node__ring', x: -23, y: -23, width: 46, height: 46, rx: 10 });
      const use = svg('use', { class: 'node__icon', href: '#d-' + kind, x: -ICON / 2, y: -ICON / 2, width: ICON, height: ICON });
      const label = svg('text', { class: 'node__label', y: 33, 'text-anchor': 'middle' });
      const badge = svg('g', { class: 'node__badge', transform: 'translate(15,-20)' });
      g.append(hit, ring, use, label, badge);
      if (opts.interactive !== false) {
        g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
        g.addEventListener('click', e => { if (opts.onNodeClick && opts.onNodeClick(name, e)) return; ws.selectDevice(name, true); });
        if (opts.onNodeDown) g.addEventListener('pointerdown', e => opts.onNodeDown(name, e));
        g.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ws.selectDevice(name, true); }
          else if (e.key === 'Escape') { if (tipFor) { e.stopPropagation(); hideTip(true); } }
          else if (/^Arrow/.test(e.key)) { e.preventDefault(); const n = neighbour(name, e.key); if (n) nodes.get(n).g.focus(); }
        });
        // pointerenter/pointerleave on the whole group: moving between icon and label never fires them
        g.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') wantTip(name, 120); });
        g.addEventListener('pointerleave', () => leaveTip(name));
        g.addEventListener('focus', () => { if (g.matches(':focus-visible')) showTip(name); });
        g.addEventListener('blur', () => leaveTip(name, 0));
      } else g.setAttribute('aria-hidden', 'true');
      const n = { g, hit, ring, use, label, badge, kind };
      nodes.set(name, n);
      gNodes.append(g);
      return n;
    }

    function neighbour(from, key) {
      const [x0, y0] = P(from), dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[key];
      let best = null, bs = Infinity;
      for (const n of st.devs) {
        if (n === from) continue;
        const [x, y] = P(n), dx = x - x0, dy = y - y0, along = dx * dir[0] + dy * dir[1];
        if (along <= 4) continue;
        const across = Math.abs(dx * dir[1] - dy * dir[0]), sc = along + across * 2;
        if (sc < bs) { bs = sc; best = n; }
      }
      return best;
    }

    // ---- links ----
    let L0 = null;
    function makeLink(l) {
      L0 = null;
      const g = svg('g', { class: 'link' });
      const line = svg('line', { class: 'link__line' });
      const ends = [0, 1].map(() => ({ mark: svg('circle', { class: 'link__mark', r: 2.5 }), block: svg('line', { class: 'link__block' }), err: svg('use', { class: 'link__err', href: '#i-alert', width: 12, height: 12 }), port: svg('text', { class: 'link__port' }), bt: svg('title') }));
      g.append(line);
      for (const e of ends) { e.block.append(e.bt); g.append(e.mark, e.block, e.err); gPorts.append(e.port); }
      if (opts.onLinkClick) { const hit = svg('line', { class: 'link__hit' }); g.prepend(hit); g.addEventListener('click', () => opts.onLinkClick(L.l)); L0 = hit; }
      gLinks.append(g);
      const L = { l, g, line, ends, up: null, hit: L0 };
      links.set(l.key, L);
      return L;
    }

    // ---- draw: create what is missing (kept by key), then set attributes ----
    function sync(recs) {
      for (const n of st.devs) if (!nodes.has(n)) makeNode(n);
      for (const [n, x] of nodes) if (!st.net.devs[n]) { x.g.remove(); nodes.delete(n); }
      const want = new Set(recs.map(l => l.key));
      for (const l of recs) if (!links.has(l.key)) makeLink(l);
      for (const [k, L] of links) if (!want.has(k)) { L.g.remove(); for (const e of L.ends) e.port.remove(); links.delete(k); }
    }

    function layout() {
      const r = body.getBoundingClientRect();
      if (!r.width || !r.height) return;
      W = r.width; H = r.height;
      svgEl.setAttribute('viewBox', '0 0 ' + Math.round(W) + ' ' + Math.round(H));
      computeFit();
      draw(false);
      if (lastTrace && markers.length) placeMarkers();
    }

    function draw(animate) {
      const recs = sim.links(st.net);
      sync(recs);
      const hide = !!st.lab.hidePorts;
      const sel = st.sel;
      for (const [n, x] of nodes) {
        const d = st.net.devs[n], [px, py] = P(n);
        x.g.setAttribute('transform', 'translate(' + px.toFixed(1) + ',' + py.toFixed(1) + ')');
        const name = d.hostname;
        if (x.label.textContent !== name) x.label.textContent = name;
        let tw = 0; try { tw = x.label.getComputedTextLength(); } catch (e) {}
        const w = Math.max(48, (tw || name.length * 7) + 12);
        x.w = w;
        x.hit.setAttribute('x', -w / 2); x.hit.setAttribute('width', w); x.hit.setAttribute('y', -24); x.hit.setAttribute('height', 66);
        const on = n === sel;
        x.g.classList.toggle('is-selected', on);
        if (opts.interactive !== false) {
          x.g.setAttribute('aria-pressed', String(on));
          const D = sim.describe(st.net, n);
          x.g.setAttribute('aria-label', name + ', ' + D.kindName + (D.linked ? ', ' + D.up + ' of ' + D.linked + ' interfaces up' : '') + '. Open console.');
        }
      }
      // parallel links between the same two devices are drawn 12 px apart
      const pairs = {}, seen = {};
      const pk = l => [l.a, l.b].sort().join('|');
      for (const l of recs) pairs[pk(l)] = (pairs[pk(l)] || 0) + 1;
      const srItems = [];
      for (const l of recs) {
        const L = links.get(l.key), k = pk(l), idx = seen[k] = (seen[k] == null ? -1 : seen[k]) + 1;
        const off = (idx - (pairs[k] - 1) / 2) * 12;
        let [ax, ay] = P(l.a), [bx, by] = P(l.b);
        const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
        ax += nx * off; ay += ny * off; bx += nx * off; by += ny * off;
        L.geom = { ax, ay, bx, by, ux, uy, nx, ny, len };
        const up = l.up;
        L.l = l;
        if (L.up !== null && L.up !== up && animate && !reduced()) { L.g.classList.add('is-flash'); setTimeout(() => L.g.classList.remove('is-flash'), 150); }
        L.up = up;
        L.g.classList.toggle('is-down', !up);
        set(L.line, { x1: ax, y1: ay, x2: bx, y2: by });
        if (L.hit) set(L.hit, { x1: ax, y1: ay, x2: bx, y2: by });
        const sides = [[ax, ay, 1], [bx, by, -1]];
        sides.forEach(([x, y, s], i) => {
          const e = L.ends[i], E = l.ends[i];
          // how far along the link a point must be to clear this device's icon and label
          const nd = nodes.get(E.dev), hw = Math.max(22, ((nd && nd.w) || 48) / 2 + 3);
          const clear = (d, px, top, bottom) => { for (; d < 140; d += 2) { const qx = ux * s * d + nx * px, qy = uy * s * d + ny * px; if (Math.abs(qx) > hw || qy < top || qy > bottom) return d; } return d; };
          const dMark = Math.max(26, clear(22, 0, -23, 41) + 4);
          const mx = x + ux * dMark * s, my = y + uy * dMark * s;
          set(e.mark, { cx: mx, cy: my });
          e.mark.setAttribute('class', 'link__mark ' + (up ? 'is-up' : 'is-down'));
          const bv = E.blocked;
          e.block.style.display = bv ? '' : 'none';
          if (bv) { const bx2 = x + ux * (dMark + 8) * s, by2 = y + uy * (dMark + 8) * s; set(e.block, { x1: bx2 + nx * 6, y1: by2 + ny * 6, x2: bx2 - nx * 6, y2: by2 - ny * 6 }); e.bt.textContent = 'Blocked by spanning tree' + (bv.length ? ' (VLAN ' + bv.join(', ') + ')' : ''); }
          e.err.style.display = E.errdis ? '' : 'none';
          if (E.errdis) set(e.err, { x: mx + nx * 8 - 6, y: my + ny * 8 - 6 });
          const showPort = !hide && !E.host;
          e.port.style.display = showPort ? '' : 'none';
          if (showPort) {
            const t = E.short;
            if (e.port.textContent !== t) e.port.textContent = t;
            const side = off < 0 ? -1 : 1;
            const dPort = Math.max(dMark + 16, clear(dMark + 10, 9 * side * s, -30, 48) + 14);
            set(e.port, { x: x + ux * dPort * s + nx * 9 * side, y: y + uy * dPort * s + ny * 9 * side + 3.5, 'text-anchor': 'middle' });
          }
        });
        const A = st.net.devs[l.a], B = st.net.devs[l.b];
        srItems.push(A.hostname + ' ' + l.ends[0].short + ' to ' + B.hostname + ' ' + l.ends[1].short + ', ' + (up ? 'up' : 'down') + '.');
      }
      if (opts.notes) { clear(gNotes); opts.notes().forEach((n, i) => { const [x, y] = [fit.ox + (n.x - fit.minX) * fit.s, fit.oy + (n.y - fit.minY) * fit.s]; const t = svg('text', { class: 'note', x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle' }); t.textContent = n.text; if (opts.onNoteClick) t.addEventListener('click', () => opts.onNoteClick(i)); gNotes.append(t); }); }
      // screen-reader text: one line per link, updated when a link changes
      const nDev = st.devs.length, nLink = recs.length;
      svgEl.setAttribute('aria-label', (opts.label || 'Network map') + ': ' + nDev + ' device' + (nDev === 1 ? '' : 's') + ', ' + nLink + ' link' + (nLink === 1 ? '' : 's'));
      if (srList.childNodes.length !== srItems.length || srItems.some((t, i) => srList.childNodes[i].textContent !== t)) { clear(srList); for (const t of srItems) srList.append(el('li', { text: t })); }
      if (tipFor) fillTip(tipFor);
    }
    function set(n, a) { for (const k in a) n.setAttribute(k, typeof a[k] === 'number' ? a[k].toFixed(1) : a[k]); }

    // ---- tooltip: HTML outside the SVG, pointer-events none, never over its device ----
    function wantTip(name, ms) {
      clearTimeout(tipTimer);
      if (tipFor && tipFor !== name) { showTip(name); return; }
      if (tipFor === name) return;
      tipTimer = setTimeout(() => showTip(name), ms);
    }
    function leaveTip(name, ms) {
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => { if (tipFor === name || !tipFor) hideTip(); }, ms == null ? 80 : ms);
    }
    function hideTip() { clearTimeout(tipTimer); tip.hidden = true; tipFor = null; }
    function fillTip(name) {
      const D = sim.describe(st.net, name);
      if (!D) return;
      clear(tip);
      tip.append(el('div', { class: 'maptip__head' }, el('b', { text: D.hostname }), el('span', { text: D.kindName })));
      if (D.ifs.length) {
        const t = el('div', { class: 'maptip__ifs' });
        for (const i of D.ifs) t.append(el('span', { class: 'dot ' + (i.up ? 'dot--up' : 'dot--down') }), el('span', { class: 'mono', text: i.short }),
          el('span', { class: 'mono', text: i.addr || (i.linked ? (i.up ? 'up' : 'down') : '') }));
        tip.append(t);
      }
      if (D.extra) tip.append(el('div', { class: 'maptip__extra', text: D.extra }));
    }
    function showTip(name) {
      clearTimeout(tipTimer);
      if (!nodes.has(name)) return;
      fillTip(name);
      tip.hidden = false;
      tipFor = name;
      const [x, y] = P(name), tw = tip.offsetWidth, th = tip.offsetHeight;
      let top = y - 26 - th - 6;                      // above the icon
      if (top < 4) top = y + 44;                      // below the label when there is no room
      if (top + th > H - 4) top = Math.max(4, H - th - 4);
      let left = Math.max(4, Math.min(x - tw / 2, W - tw - 4));
      // never cover the device it describes
      if (top < y + 44 && top + th > y - 26 && left < x + 30 && left + tw > x - 30) left = x + 34 + tw < W ? x + 34 : Math.max(4, x - 34 - tw);
      tip.style.left = Math.round(left) + 'px'; tip.style.top = Math.round(top) + 'px';
    }

    // ---- packets ----
    function linkBetween(a, b) {
      let best = null;
      for (const L of links.values()) if ((L.l.a === a && L.l.b === b) || (L.l.a === b && L.l.b === a)) { if (!best || (L.up && !best.up)) best = L; }
      return best;
    }
    function seg(a, b) {
      const L = linkBetween(a, b);
      if (!L || !L.geom) { const [ax, ay] = P(a), [bx, by] = P(b); return [ax, ay, bx, by]; }
      const g = L.geom, fwd = L.l.a === a;
      return fwd ? [g.ax, g.ay, g.bx, g.by] : [g.bx, g.by, g.ax, g.ay];
    }
    function highlight(a, b, cls) {
      const [x1, y1, x2, y2] = seg(a, b);
      gHi.append(svg('line', { class: 'hi ' + (cls || ''), x1, y1, x2, y2 }));
    }
    function clearFx() {
      token++; clearTimeout(fadeTimer);
      clear(gFx); clear(gHi); gHi.classList.remove('is-fading');
      for (const n of nodes.values()) clear(n.badge);
      chip.hidden = true; chip.classList.remove('is-ok'); markers = [];
    }
    const wait = ms => new Promise(r => setTimeout(r, ms));
    function moveDot(path, hollow, tok) {
      return new Promise(res => {
        if (path.length < 2) return res();
        if (reduced()) { for (let i = 0; i < path.length - 1; i++) highlight(path[i], path[i + 1]); return res(); }
        const dot = svg('circle', { class: 'pkt' + (hollow ? ' pkt--reply' : ''), r: hollow ? 3 : 2.5 });
        gFx.append(dot);
        let i = 0, t0 = null;
        const stepFn = ts => {
          if (tok !== token) { dot.remove(); return res(); }
          if (t0 === null) t0 = ts;
          const [x1, y1, x2, y2] = seg(path[i], path[i + 1]);
          const dur = Math.max(MIN_HOP, Math.hypot(x2 - x1, y2 - y1) / SPEED), k = Math.min(1, (ts - t0) / dur);
          dot.setAttribute('cx', (x1 + (x2 - x1) * k).toFixed(1)); dot.setAttribute('cy', (y1 + (y2 - y1) * k).toFixed(1));
          if (k >= 1) { highlight(path[i], path[i + 1]); i++; t0 = null; if (i >= path.length - 1) { dot.remove(); return res(); } }
          requestAnimationFrame(stepFn);
        };
        requestAnimationFrame(stepFn);
      });
    }
    // ARP broadcasts and unknown-unicast floods: small dots fan out along every edge; a blocked edge stops at a bar
    function flood(edges, tok) {
      if (!edges || !edges.length) return Promise.resolve();
      if (reduced()) { for (const [a, b, blk] of edges) if (!blk) highlight(a, b, 'hi--flood'); return Promise.resolve(); }
      return Promise.all(edges.map(([a, b, blk]) => new Promise(res => {
        const [x1, y1, x2, y2] = seg(a, b), stop = blk ? 0.55 : 1;
        const dot = svg('circle', { class: 'pkt pkt--flood', r: 2 }); gFx.append(dot);
        let t0 = null; const dur = Math.max(MIN_HOP, Math.hypot(x2 - x1, y2 - y1) / SPEED);
        const f = ts => {
          if (tok !== token) { dot.remove(); return res(); }
          if (t0 === null) t0 = ts;
          const k = Math.min(stop, (ts - t0) / dur);
          dot.setAttribute('cx', (x1 + (x2 - x1) * k).toFixed(1)); dot.setAttribute('cy', (y1 + (y2 - y1) * k).toFixed(1));
          if (k >= stop) {
            if (blk) { const mx = x1 + (x2 - x1) * stop, my = y1 + (y2 - y1) * stop, len = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / len * 6, ny = (x2 - x1) / len * 6;
              gFx.append(svg('line', { class: 'pkt-stop', x1: mx + nx, y1: my + ny, x2: mx - nx, y2: my - ny })); }
            else highlight(a, b, 'hi--flood');
            setTimeout(() => dot.remove(), 120); return res();
          }
          requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      })));
    }
    async function way(res, hollow, tok) {
      const path = res.hops.path, evs = res.hops.l2;
      if (!evs || !evs.length) return moveDot(path, hollow, tok);
      let pos = 0;
      for (const ev of evs) {
        if (tok !== token) return;
        if (ev.at > pos) await moveDot(path.slice(pos, ev.at + 1), hollow, tok);
        const s = ev.seg;
        if (ev.arp) { await flood(ev.edges, tok); if (tok !== token) return; await moveDot(s.slice().reverse(), true, tok); if (tok !== token) return; await moveDot(s, hollow, tok); }
        else if (ev.flood) { const k = Math.max(0, s.indexOf(ev.flood)); if (k > 0) await moveDot(s.slice(0, k + 1), hollow, tok); if (tok !== token) return; await flood(ev.edges, tok); if (tok !== token) return; if (k < s.length - 1) await moveDot(s.slice(k), hollow, tok); }
        else await moveDot(s, hollow, tok);
        pos = ev.at + s.length - 1;
      }
      if (pos < path.length - 1) await moveDot(path.slice(pos), hollow, tok);
    }

    // ---- markers: stay until the next command ----
    function badge(name, ok) {
      const n = nodes.get(name); if (!n) return;
      clear(n.badge);
      n.badge.append(svg('circle', { class: 'badge__bg', r: 8 }), svg('use', { class: 'badge__icon ' + (ok ? 'is-ok' : 'is-bad'), href: ok ? '#i-check-circle' : '#i-x-circle', x: -8, y: -8, width: 16, height: 16 }));
    }
    function placeMarkers() {
      for (const m of markers) {
        if (m.kind !== 'chip') continue;
        chip.hidden = false; chip.textContent = m.text;
        const [x, y] = P(m.at), cw = chip.offsetWidth, ch = chip.offsetHeight;
        const others = st.devs.filter(n => n !== m.at).map(P);
        const cand = [[x + 30, y - 32], [x - 30 - cw, y - 32], [x + 30, y + 8], [x - 30 - cw, y + 8], [x - cw / 2, y + 46], [x - cw / 2, y - 60 - ch]];
        let best = cand[0], bs = Infinity;
        for (const [cx, cy] of cand) {
          const lx = Math.max(4, Math.min(cx, W - cw - 4)), ly = Math.max(4, Math.min(cy, H - ch - 4));
          let pen = Math.abs(lx - cx) + Math.abs(ly - cy);
          for (const [ox, oy] of others) if (lx < ox + 26 && lx + cw > ox - 26 && ly < oy + 42 && ly + ch > oy - 24) pen += 1000;
          if (lx < x + 24 && lx + cw > x - 24 && ly < y + 40 && ly + ch > y - 24) pen += 500;
          if (pen < bs) { bs = pen; best = [lx, ly]; }
        }
        chip.style.left = Math.round(best[0]) + 'px'; chip.style.top = Math.round(best[1]) + 'px';
      }
    }
    function reason(T) {
      if (!T.f.ok) return T.f.blocked ? 'Blocked by ACL' : 'No route from here';
      if (T.refused) return 'Port closed';
      if (T.r && !T.ok) return T.r.blocked ? 'Reply blocked by ACL' : 'Reply has no route back';
      return '';
    }
    function mark(T) {
      const fp = T.f.hops.path, src = fp[0];
      if (T.f.hops.storm) { for (const n of T.f.hops.storm.sws) badge(n, false); markers.push({ kind: 'chip', at: T.f.hops.storm.sws[0], text: 'Broadcast storm' }); }
      else if (T.ok || (!T.r && T.f.ok && !T.refused)) badge(src, true);
      else {
        const at = !T.f.ok || T.refused ? fp[fp.length - 1] : (T.r.hops.path[T.r.hops.path.length - 1]);
        badge(at, false);
        markers.push({ kind: 'chip', at, text: reason(T) });
      }
      placeMarkers();
    }

    // Play a trace: request, then reply. A new command cancels it at once. Reduced motion: no moving dots.
    async function play(T) {
      clearFx();
      if (!T) return;
      lastTrace = T;
      const tok = token;
      if (T.f.hops.storm && !reduced()) { const loop = T.f.hops.storm.sws.concat(T.f.hops.storm.sws[0]); await moveDot(loop, false, tok); }
      else await way(T.f, false, tok);
      if (tok !== token) return;
      if (T.f.ok && !T.refused && T.r) { await way(T.r, true, tok); if (tok !== token) return; }
      mark(T);
      fadeTimer = setTimeout(() => { if (tok === token) gHi.classList.add('is-fading'); }, 1500);
    }

    // a lesson story step: the path (a reply as a hollow dot), then a marker and label at s.at
    async function step(st0) {
      clearFx();
      if (!st0 || !Array.isArray(st0.path)) return;
      const tok = token;
      const path = st0.path.filter(n => nodes.has(n));
      await moveDot(path, st0.cls === 'rep', tok);
      if (tok !== token) return;
      if (reduced()) for (let i = 0; i < path.length - 1; i++) highlight(path[i], path[i + 1]);
      const at = nodes.has(st0.at) ? st0.at : path[path.length - 1];
      if (at) { badge(at, !st0.bad); if (st0.label) { markers.push({ kind: 'chip', at, text: String(st0.label) }); chip.classList.toggle('is-ok', !st0.bad); placeMarkers(); } }
    }

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => layout()); ro.observe(body); }
    requestAnimationFrame(layout);

    return {
      body, svg: svgEl, play, step, clearFx, layout, nodes, links,
      toCanvas(cx, cy) { const r = svgEl.getBoundingClientRect(); return [(cx - r.left - fit.ox) / fit.s + fit.minX, (cy - r.top - fit.oy) / fit.s + fit.minY]; }, scale: () => fit.s,
      update(res) {
        if (res && res.ran) clearFx();      // markers stay until the next command
        if (W) draw(true);
        if (res && res.trace) play(res.trace);
      },
      redraw: () => { if (W) draw(false); },
      replay: () => { if (lastTrace) play(lastTrace); },
      lastTrace: () => lastTrace,
      focus() { const n = nodes.get(st.sel) || nodes.values().next().value; if (n) n.g.focus(); },
      hideTip,
      destroy() { token++; clearTimeout(fadeTimer); clearTimeout(tipTimer); if (ro) ro.disconnect(); }
    };
  }

  L4N.mapCore = { create: createMap };
})(window.L4N = window.L4N || {});
