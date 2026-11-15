// sim.js: the bridge to the simulator. Screens never call engine globals directly; everything goes through here.
// This file has no DOM.
(function (L4N) {
  'use strict';
  const slug = L4N.slug;

  // ---- catalogue: labs and lessons by slug, with display IDs ----
  function catalogue() {
    let b = 0, inc = 0, cap = 0;
    const labs = LABS.map((l, i) => {
      const kind = l.capstone ? 'capstone' : l.kind === 'incident' ? 'incident' : 'build';
      const idText = kind === 'capstone' ? 'CAP-' + String(++cap).padStart(2, '0') : kind === 'incident' ? 'INC-' + String(++inc).padStart(2, '0') : 'LAB-' + String(++b).padStart(2, '0');
      const short = kind === 'incident' ? l.title.replace(/^Incident \d+:\s*/, '') : l.title;
      return { slug: slug(l.title), title: l.title, short, idText, kind, group: l.group, index: i, lab: l };
    });
    const bySlug = new Map(labs.map(x => [x.slug, x]));
    const byTitle = new Map(labs.map(x => [x.title, x]));
    const lessons = Object.keys(LESSONS).map((k, i) => {
      const L = LESSONS[k];
      return { slug: slug(k), key: k, title: L.name || k, topic: !!L.topic, mins: L.mins || 5, index: i, lesson: L, lab: L.topic ? null : bySlug.get(slug(k)) || null };
    });
    const lessonBySlug = new Map(lessons.map(x => [x.slug, x]));
    return {
      labs, lessons,
      lab: s => bySlug.get(s) || null,
      labByTitle: t => byTitle.get(t) || null,
      lesson: s => lessonBySlug.get(s) || null,
      // the lesson that goes with a lab (an incident uses its base lab's lesson; capstones have none)
      lessonFor(entry) {
        if (!entry || entry.kind === 'capstone') return null;
        const key = entry.kind === 'incident' ? entry.lab.baseTitle : entry.title;
        return key ? lessonBySlug.get(slug(key)) || null : null;
      }
    };
  }

  L4N.sim = Object.assign(L4N.sim || {}, { catalogue });
})(window.L4N = window.L4N || {});
