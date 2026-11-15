// toast.js: bottom right, at most three, 5 seconds, paused on hover or focus.
(function (L4N) {
  'use strict';
  const { el, icon } = L4N.dom;
  let box = null;
  const ICON = { info: 'info', ok: 'check-circle', bad: 'x-circle', warn: 'alert' };

  function container() {
    if (!box) { box = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(box); }
    return box;
  }

  // toast({text, kind: 'info'|'ok'|'bad'|'warn', icon, action: {label, run}, actions: [...], timeout})
  function toast(o) {
    if (typeof o === 'string') o = { text: o };
    const c = container();
    const kind = o.kind || 'info';
    let t = 0, left = o.timeout || 5000, started = 0;
    const close = () => { clearTimeout(t); if (node.isConnected) node.remove(); };
    const acts = (o.actions || (o.action ? [o.action] : [])).map(a => L4N.ui.button({
      label: a.label, kind: 'ghost', onClick: () => { close(); a.run(); }
    }));
    const node = el('div', { class: 'toast toast--' + kind, role: kind === 'bad' ? 'alert' : null },
      icon(o.icon || ICON[kind] || 'info'), el('div', { class: 'toast__text', text: o.text }),
      el('div', { class: 'toast__actions' }, acts, L4N.ui.button({ icon: 'x', aria: 'Dismiss', onClick: close })));
    const run = () => { started = Date.now(); t = setTimeout(close, left); };
    const pause = () => { clearTimeout(t); left = Math.max(1500, left - (Date.now() - started)); };
    node.addEventListener('pointerenter', pause);
    node.addEventListener('pointerleave', run);
    node.addEventListener('focusin', pause);
    node.addEventListener('focusout', e => { if (!node.contains(e.relatedTarget)) run(); });
    c.appendChild(node);
    while (c.children.length > 3) c.firstElementChild.remove();
    if (!o.sticky) run();
    return { close, el: node };
  }

  L4N.toast = toast;
})(window.L4N = window.L4N || {});
