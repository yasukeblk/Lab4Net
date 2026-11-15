// tooltip.js: one tooltip for every element with data-tip (and an optional data-kbd shortcut).
// 400 ms on hover, none on keyboard focus, Esc hides. pointer-events: none, so it can never sit under the cursor.
(function (L4N) {
  'use strict';
  const { el, clear } = L4N.dom;
  let tip = null, current = null, timer = 0;

  function ensure() {
    if (!tip) { tip = el('div', { class: 'tooltip', role: 'tooltip', id: 'l4n-tooltip', 'aria-hidden': 'true' }); document.body.appendChild(tip); }
    return tip;
  }

  function place(target) {
    const r = target.getBoundingClientRect(), t = tip.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    let top = r.top - t.height - 6;
    if (top < 4) top = r.bottom + 6;
    if (top + t.height > vh - 4) top = Math.max(4, vh - t.height - 4);
    let left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(4, Math.min(left, vw - t.width - 4));
    tip.style.top = Math.round(top) + 'px';
    tip.style.left = Math.round(left) + 'px';
  }

  function show(target) {
    clearTimeout(timer);
    const text = target.getAttribute('data-tip');
    if (!text || !target.isConnected) return;
    ensure(); clear(tip);
    tip.append(el('span', { text }));
    const k = target.getAttribute('data-kbd');
    if (k) tip.append(L4N.ui.kbd(k));
    tip.style.top = '-999px'; tip.style.left = '-999px';
    tip.classList.add('is-on');
    place(target);
    current = target;
  }

  function hide() {
    clearTimeout(timer);
    if (tip) tip.classList.remove('is-on');
    current = null;
  }

  function later(target, ms) { clearTimeout(timer); timer = setTimeout(() => show(target), ms); }

  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) return;
    if (t === current) { clearTimeout(timer); return; }
    if (current) show(t); else later(t, 400);
  });
  document.addEventListener('pointerout', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) return;
    if (e.relatedTarget && t.contains(e.relatedTarget)) return;
    if (t === current || !current) { clearTimeout(timer); timer = setTimeout(hide, 80); }
  });
  document.addEventListener('focusin', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t && t.matches(':focus-visible')) show(t); else if (current) hide();
  });
  document.addEventListener('focusout', () => { if (current) hide(); });
  document.addEventListener('pointerdown', hide, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) hide(); }, true);
  window.addEventListener('scroll', hide, true);
  window.addEventListener('blur', hide);

  L4N.tooltip = { show, hide, current: () => current };
})(window.L4N = window.L4N || {});
