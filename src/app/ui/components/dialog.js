// dialog.js: native <dialog> with showModal(). Opens only when the user asks. Esc or a click on the scrim
// closes it, and focus returns to whatever opened it.
(function (L4N) {
  'use strict';
  const { el, id } = L4N.dom;

  // open({title, body: Node|[Node]|string, actions: [{label, kind, run(close) → false keeps it open}], className, onClose})
  function open(o) {
    const opener = document.activeElement;
    const tid = id('dlg-title');
    const d = el('dialog', { class: ['dlg', o.className], 'aria-labelledby': o.title ? tid : null, 'aria-label': o.title ? null : o.label || null });
    let closed = false;
    const close = (value) => {
      if (closed) return; closed = true;
      if (d.open) d.close();
      d.remove();
      if (o.onClose) o.onClose(value);
      if (opener && opener.isConnected && typeof opener.focus === 'function' && !o.noReturn) opener.focus();
    };
    if (o.title) d.append(el('div', { class: 'dlg__head' }, el('h2', { class: 'dlg__title', id: tid, text: o.title }),
      L4N.ui.button({ icon: 'x', aria: 'Close', onClick: () => close() })));
    if (o.content) d.append(o.content);
    else d.append(el('div', { class: 'dlg__body' }, typeof o.body === 'string' ? el('p', { text: o.body }) : o.body));
    if (o.actions && o.actions.length) {
      d.append(el('div', { class: 'dlg__actions' }, o.actions.map(a => L4N.ui.button({
        label: a.label, kind: a.kind || 'secondary', id: a.id || null,
        onClick: () => { if (!a.run || a.run(close) !== false) close(a.value); }
      }))));
    }
    d.addEventListener('cancel', e => { e.preventDefault(); close(); });
    d.addEventListener('click', e => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    });
    document.body.appendChild(d);
    d.showModal();
    const first = o.focus ? d.querySelector(o.focus) : null;
    if (first) first.focus();
    return { el: d, close };
  }

  // confirm({title, body, ok, danger}) → Promise<boolean>
  function confirm(o) {
    return new Promise(resolve => {
      let answer = false;
      open({
        title: o.title, body: o.body,
        actions: [{ label: o.cancel || 'Cancel', kind: 'secondary' }, { label: o.ok || 'OK', kind: o.danger ? 'danger' : 'primary', run: () => { answer = true; } }],
        onClose: () => resolve(answer)
      });
    });
  }

  L4N.dialog = { open, confirm };
})(window.L4N = window.L4N || {});
