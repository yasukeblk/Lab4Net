// map.js: the network map pane. Phase 2 placeholder: the devices as buttons, so a console can be chosen.
(function (L4N) {
  'use strict';
  const { el, icon, clear } = L4N.dom;

  function createMap(ws) {
    const st = ws.st;
    const list = el('div', { class: 'devlist', role: 'group', 'aria-label': 'Devices' });
    const root = el('section', { class: 'pane map', 'aria-label': 'Network map', id: 'ws-map' },
      el('div', { class: 'pane__head' }, el('h2', { class: 'pane__title' }, icon('route'), 'Network map')),
      el('div', { class: 'pane__body', tabindex: '-1' }, list));
    function render() {
      clear(list);
      for (const dv of L4N.sim.devices(st)) {
        list.append(el('button', {
          class: 'btn btn--secondary devbtn', type: 'button', 'aria-pressed': String(dv.name === st.sel), 'data-dev': dv.name,
          'aria-label': dv.hostname + ', ' + dv.kindName + (dv.linked ? ', ' + dv.up + ' of ' + dv.linked + ' links up' : '') + '. Open console.',
          onClick: () => ws.selectDevice(dv.name, true)
        }, L4N.consoleView.devIcon(dv.kind), el('span', { text: dv.hostname })));
      }
    }
    render();
    return { el: root, render, update: render, focus() { const b = list.querySelector('[aria-pressed="true"]') || list.firstChild; if (b) b.focus(); }, destroy() {} };
  }

  L4N.mapView = { create: createMap };
})(window.L4N = window.L4N || {});
