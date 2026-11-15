// site.js: SITE settings, the visit counter and the donate link. The only place that makes network requests.
// tools/build-site.cjs reads the SITE line below, so keep its exact shape.
(function (L4N) {
  'use strict';
  const SITE={host:'yasukeblk.github.io',donate:'https://buymeacoffee.com/yasukeblk',counter:'lab4net'};
  const isPublic = () => location.protocol === 'https:' && location.hostname === SITE.host;
  const dnt = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1';
  const counting = () => !!SITE.counter && isPublic() && !dnt();

  // One cookieless page view (and a "start" event) to GoatCounter, only on the public site, never with Do Not Track.
  function count(event) {
    if (!counting()) return;
    const p = event ? { p: event, t: event, e: 'true' } : { p: location.pathname, r: document.referrer || '' };
    const q = Object.keys(p).map(k => k + '=' + encodeURIComponent(p[k])).join('&') + '&rnd=' + Math.random().toString(36).slice(2);
    const url = 'https://' + SITE.counter + '.goatcounter.com/count?' + q;
    try { const i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = url; } catch (e) {}
  }

  L4N.site = {
    SITE, isPublic, counting, count,
    donate: SITE.donate,
    lessonsUrl: 'https://' + SITE.host + '/Lab4Net/lessons/',
    github: 'https://github.com/yasukeblk/Lab4Net',
    licence: 'https://github.com/yasukeblk/Lab4Net/blob/main/LICENSE'
  };
})(window.L4N = window.L4N || {});
