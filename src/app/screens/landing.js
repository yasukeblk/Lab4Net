// landing.js: the landing section (section 5.1). The markup is static in the page so search engines and link
// previews can read it; this fills in the live counts and handles Start.
(function (L4N) {
  'use strict';
  const root = document.documentElement;
  const visible = () => root.getAttribute('data-landing') === 'show';

  function fill() {
    const n = { labs: L4N.data.labs.length, build: L4N.data.labs.filter(l => l.kind === 'build').length, incidents: L4N.data.labs.filter(l => l.kind === 'incident').length,
      capstones: L4N.data.labs.filter(l => l.kind === 'capstone').length, lessons: L4N.data.lessons.length };
    for (const s of document.querySelectorAll('#landing [data-w]')) { const k = s.getAttribute('data-w'); if (n[k] != null) s.textContent = String(n[k]); }
    const c = document.getElementById('landingCounter');
    if (c) c.hidden = !L4N.site.counting();
  }

  // Start stores that the landing was seen and goes Home. Esc does the same.
  function start() {
    if (!visible()) return;
    L4N.setUi({ landingSeen: true });
    L4N.site.count('start');
    root.setAttribute('data-landing', 'hide');
    if (location.hash && location.hash !== '#/') L4N.shell.go('#/');
    const h = document.querySelector('#screen [data-heading], #screen h1');
    setTimeout(() => { const s = document.querySelector('.sb__search'); (h || s) && (h || s).focus({ preventScroll: true }); }, 0);
  }
  function show() {
    root.setAttribute('data-landing', 'show');
    window.scrollTo(0, 0);
    const t = document.getElementById('landing-title');
    if (t) t.focus({ preventScroll: true });
  }

  (L4N.afterBoot = L4N.afterBoot || []).push(() => {
    fill();
    const b = document.getElementById('landingStart');
    if (b) b.addEventListener('click', start);
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && visible() && !document.querySelector('dialog[open]')) { e.preventDefault(); start(); } });
    if (visible()) { const t = document.getElementById('landing-title'); if (t) t.focus({ preventScroll: true }); }
  });

  L4N.landing = { show, start, visible };
})(window.L4N = window.L4N || {});
