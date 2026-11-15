// trace.js: the one-line trace strip under the map (section 5.5): result, path, Details and Replay.
// aria-live, so the result of a ping is read out. Everything is text.
(function (L4N) {
  'use strict';
  const { el, icon, clear } = L4N.dom;
  const ui = L4N.ui;

  function result(T) {
    if (T.ok) return 'Reply received';
    if (T.refused) return 'Destination port closed';
    if (!T.f.ok) return T.f.hops.storm ? 'Broadcast storm' : (T.f.reason || 'No route from here');
    if (T.r) return 'Reply failed: ' + (T.r.reason || 'did not return to source');
    return 'No reply';
  }
  function advice(T) {
    if (T.ok) return 'Both directions succeeded. A request reaching the destination alone is not enough.';
    if (T.refused) return 'The network path works, but the destination is not listening on that port.';
    if (T.f.blocked || (T.r && T.r.blocked)) return 'Read the ACL in order. The first matching rule wins; unmatched traffic is denied.';
    return 'Check interface state and addressing first, then the next hop and the return route.';
  }

  // createTrace(ws): ws.st, ws.map.replay()
  function createTrace(ws) {
    const st = ws.st;
    let open = false, T = null;
    const line = el('div', { class: 'trace__line' });
    const more = el('div', { class: 'trace__more', id: L4N.dom.id('trace-more'), hidden: true });
    const root = el('div', { class: 'trace', id: 'ws-trace' }, el('div', { class: 'trace__live', 'aria-live': 'polite', 'aria-atomic': 'true' }, line), more);
    const who = n => { const d = st.net.devs[n]; return d ? (d.type === 'pc' ? n : d.hostname) : String(n); };

    function idle() {
      clear(line);
      line.append(icon('route'), el('span', { class: 'trace__msg', text: 'Ping, traceroute, Telnet or SSH from a console shows the path here.' }));
      more.hidden = true;
    }

    function render(trace) {
      T = trace;
      if (!T) { idle(); return; }
      clear(line);
      const path = T.f.hops.path.map(who), stopped = !T.f.ok ? who(T.f.hops.path[T.f.hops.path.length - 1]) : null;
      const okRes = !!T.ok;
      line.append(icon(okRes ? 'check-circle' : 'x-circle', okRes ? 'ok' : 'bad'),
        el('b', { class: 'trace__res ' + (okRes ? 'ok' : 'bad'), text: result(T) }),
        el('span', { class: 'trace__path', title: path.join(' → ') }, path.join(' → '), stopped ? el('span', { class: 'bad', text: ' · stopped at ' + stopped }) : null),
        el('span', { class: 'spacer' }));
      const detailsBtn = ui.button({ label: open ? 'Hide details' : 'Details', kind: 'ghost', onClick: () => { open = !open; render(T); } });
      detailsBtn.setAttribute('aria-expanded', String(open)); detailsBtn.setAttribute('aria-controls', more.id);
      line.append(detailsBtn, ui.button({ label: 'Replay', kind: 'ghost', icon: 'replay', onClick: () => ws.map.replay() }));
      // details: request and reply paths, a plain explanation, then what each switch did
      clear(more);
      more.hidden = !open;
      more.append(el('div', { class: 'trace__row' }, el('b', { text: 'Request ' }), path.join(' → '), stopped ? el('span', { class: 'bad', text: ' · stopped at ' + stopped }) : null));
      if (T.r) more.append(el('div', { class: 'trace__row' }, el('b', { text: 'Reply ' }), T.r.hops.path.map(who).join(' → ')));
      more.append(el('p', { class: 'trace__advice', text: advice(T) }));
      const sw = switching(T);
      if (sw.length) more.append(el('div', { class: 'trace__sw' }, el('div', { class: 'label-caps', text: 'Switching' }), sw));
    }

    // One line per switch per direction, and a show mac address-table tip after a flood (the old switching wrapper).
    function switching(T) {
      const L = [];
      let flooded = null;
      const short = n => L4N.sim.shortName(n || '?');
      if (T.f.hops.storm) {
        const s = T.f.hops.storm;
        L.push(el('div', { class: 'trace__row' }, el('b', { text: 'Storm ' }), 'VLAN ' + s.vlan + ' · ' + s.sws.map(who).join(' → ') + ' → ' + who(s.sws[0]) +
          ' · no spanning tree, so the frame circles for ever. Every switch logs %SW_MATM-4-MACFLAP_NOTIF. Put spanning tree back (spanning-tree vlan ' + s.vlan + ') or break the loop.'));
      }
      for (const [res, dir] of [[T.f, 'Request'], [T.r, 'Reply']]) {
        if (!res || !res.hops.l2) continue;
        for (const ev of res.hops.l2) for (const x of ev.sw) {
          let what;
          const nh = ev.nhText || (ev.nh != null ? n2ipSafe(ev.nh) : '');
          if (ev.arp && ev.lost) what = who(ev.from) + "'s ARP broadcast for " + nh + ' flooded every port · nobody answered · learned ' + who(ev.from) + ' on ' + short(x.inp);
          else if (ev.arp) what = who(ev.from) + "'s " + (ev.nd ? 'neighbor solicitation' : 'ARP broadcast') + ' for ' + nh + ' flooded every port · ' + who(ev.to) + "'s reply learned on " + short(x.out);
          else if (x.known) what = x.out === 'CPU' ? 'for the switch itself (' + ev.dstMac + ')' : ev.dstMac + ' known · out ' + short(x.out);
          else { what = ev.dstMac + ' unknown · flooded out every port'; flooded = flooded || x.sw; }
          L.push(el('div', { class: 'trace__row' }, el('b', { text: dir + ' ' }), who(x.sw) + ' · VLAN ' + x.vlan + ' · ' + what));
        }
      }
      if (flooded) L.push(el('div', { class: 'trace__tip' }, 'Run ', el('code', { text: 'show mac address-table' }), ' on ' + who(flooded) + ': it has learned the addresses now, so the next frame goes out one port.'));
      return L;
    }
    function n2ipSafe(n) { try { return L4N.sim.ip(n); } catch (e) { return ''; } }

    idle();
    return { el: root, render, last: () => T };
  }

  L4N.traceView = { create: createTrace, result };
})(window.L4N = window.L4N || {});
