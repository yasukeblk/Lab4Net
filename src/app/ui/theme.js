// theme.js: dark, light or system; console colours; reduce motion.
(function (L4N) {
  'use strict';
  const root = document.documentElement;
  const mqLight = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  const mqMotion = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let current = null;

  function resolve(theme) { return theme === 'system' ? (mqLight && mqLight.matches ? 'light' : 'dark') : theme === 'light' ? 'light' : 'dark'; }

  function apply(settings) {
    current = settings;
    const t = resolve(settings.theme);
    root.setAttribute('data-theme', t);
    if (settings.consoleTheme === 'dark') root.setAttribute('data-console', 'dark'); else root.removeAttribute('data-console');
    if (settings.motion === 'reduce') root.setAttribute('data-motion', 'reduce'); else root.removeAttribute('data-motion');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#F3F3F1' : '#0D0E10');
  }

  const reapply = () => { if (current && current.theme === 'system') apply(current); };
  if (mqLight) { if (mqLight.addEventListener) mqLight.addEventListener('change', reapply); else if (mqLight.addListener) mqLight.addListener(reapply); }

  L4N.theme = { apply, resolve, resolved: () => root.getAttribute('data-theme') || 'dark' };
  // Chrome motion uses the CSS durations; JavaScript animation (packets, console pacing) asks this.
  L4N.motion = { reduced: () => root.getAttribute('data-motion') === 'reduce' || !!(mqMotion && mqMotion.matches) };
})(window.L4N = window.L4N || {});
