// menu.js: role="menu" popups. Arrow keys move, type-ahead works, Esc closes and returns focus.
(function (L4N) {
  'use strict';
  const { el, icon } = L4N.dom;
  let openMenu = null;

  function close(returnFocus) {
    if (!openMenu) return;
    const m = openMenu; openMenu = null;
    m.node.remove();
    document.removeEventListener('pointerdown', m.outside, true);
    window.removeEventListener('resize', m.closeAll);
    if (m.anchor) m.anchor.setAttribute('aria-expanded', 'false');
    if (returnFocus !== false && m.anchor && m.anchor.isConnected) m.anchor.focus();
  }

  // open(anchor, items: [{label, icon, kbd, run, checked, danger} | 'sep'], {align: 'start'|'end', label})
  function open(anchor, items, opts) {
    opts = opts || {};
    if (openMenu && openMenu.anchor === anchor) { close(); return; }
    close(false);
    const node = el('div', { class: 'menu', role: 'menu', 'aria-label': opts.label || (anchor && anchor.getAttribute('aria-label')) || null });
    const buttons = [];
    for (const it of items) {
      if (!it) continue;
      if (it === 'sep') { node.append(el('div', { class: 'menu__sep', role: 'separator' })); continue; }
      const b = el('button', {
        class: ['menu__item', it.danger && 'menu__item--danger'], type: 'button',
        role: it.checked != null ? 'menuitemradio' : 'menuitem', 'aria-checked': it.checked != null ? String(!!it.checked) : null, tabindex: '-1',
        onClick: () => { close(it.keepFocus === false ? false : true); it.run(); }
      }, it.icon ? icon(it.icon) : null, el('span', { text: it.label }), it.kbd && L4N.ui.kbd(it.kbd), it.checked ? icon('check') : null);
      buttons.push(b); node.append(b);
    }
    document.body.appendChild(node);
    // place below the anchor, flip above if needed, keep on screen
    const r = anchor.getBoundingClientRect(), m = node.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    let top = r.bottom + 4; if (top + m.height > vh - 8) top = Math.max(8, r.top - m.height - 4);
    let left = opts.align === 'end' ? r.right - m.width : r.left;
    left = Math.max(8, Math.min(left, vw - m.width - 8));
    node.style.top = Math.round(top) + 'px'; node.style.left = Math.round(left) + 'px';

    let typed = '', typedAt = 0;
    node.addEventListener('keydown', e => {
      const i = buttons.indexOf(document.activeElement);
      let j = null;
      if (e.key === 'ArrowDown') j = (i + 1) % buttons.length;
      else if (e.key === 'ArrowUp') j = (i - 1 + buttons.length) % buttons.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = buttons.length - 1;
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      else if (e.key === 'Tab') { e.preventDefault(); close(); return; }
      else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const now = Date.now(); typed = now - typedAt > 700 ? e.key.toLowerCase() : typed + e.key.toLowerCase(); typedAt = now;
        const k = buttons.findIndex((b, x) => x !== i && b.textContent.trim().toLowerCase().startsWith(typed));
        const k2 = k >= 0 ? k : buttons.findIndex(b => b.textContent.trim().toLowerCase().startsWith(typed));
        if (k2 >= 0) j = k2;
      }
      if (j != null) { e.preventDefault(); e.stopPropagation(); buttons[j].focus(); }
    });
    const outside = e => { if (!node.contains(e.target) && !anchor.contains(e.target)) close(false); };
    const closeAll = () => close(false);
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', closeAll);
    anchor.setAttribute('aria-haspopup', 'menu');
    anchor.setAttribute('aria-expanded', 'true');
    openMenu = { node, anchor, outside, closeAll };
    if (buttons[0]) buttons[opts.focusChecked ? Math.max(0, items.filter(x => x && x !== 'sep').findIndex(x => x.checked)) : 0].focus();
  }

  L4N.menu = { open, close, isOpen: () => !!openMenu };
})(window.L4N = window.L4N || {});
