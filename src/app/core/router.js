// router.js: the URL hash is data. It is parsed into {screen, slug}; a slug is only ever looked up in a table,
// never written into the page. No DOM.
(function (L4N) {
  'use strict';
  const ROUTES = [
    [/^$/, 'home'],
    [/^labs$/, 'labs'],
    [/^labs\/([^/]+)$/, 'lab'],
    [/^lessons$/, 'lessons'],
    [/^lessons\/([^/]+)$/, 'lesson'],
    [/^practice$/, 'practice'],
    [/^practice\/exam$/, 'exam'],
    [/^practice\/exam\/run$/, 'examrun'],
    [/^practice\/quiz$/, 'quiz'],
    [/^practice\/subnetting$/, 'subnet'],
    [/^sandbox$/, 'sandbox'],
    [/^progress$/, 'progress'],
    [/^settings$/, 'settings'],
    [/^dev\/components$/, 'gallery']
  ];
  const LIST_OF = { lab: 'labs', lesson: 'lessons' };

  function parse(hash) {
    let p = String(hash == null ? '' : hash);
    if (p.length > 300) return { screen: 'home', unknown: true };
    p = p.replace(/^#/, '').replace(/^\/+|\/+$/g, '');
    for (const [rx, screen] of ROUTES) {
      const m = rx.exec(p);
      if (!m) continue;
      if (m[1] === undefined) return { screen };
      let s = m[1];
      try { s = decodeURIComponent(s); } catch (e) { s = ''; }
      s = s.toLowerCase();
      if (!L4N.isSlug(s)) return { screen: LIST_OF[screen], badSlug: true };
      return { screen, slug: s };
    }
    return { screen: 'home', unknown: true };
  }

  const PATHS = { home: '', labs: 'labs', lab: 'labs/', lessons: 'lessons', lesson: 'lessons/', practice: 'practice', exam: 'practice/exam', examrun: 'practice/exam/run',
    quiz: 'practice/quiz', subnet: 'practice/subnetting', sandbox: 'sandbox', progress: 'progress', settings: 'settings', gallery: 'dev/components' };
  function href(screen, slug) {
    const p = PATHS[screen];
    if (p == null) return '#/';
    return '#/' + p + (slug && L4N.isSlug(slug) ? slug : '');
  }

  L4N.router = { parse, href };
})(window.L4N = window.L4N || {});
