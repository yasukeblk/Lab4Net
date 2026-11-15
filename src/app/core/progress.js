// progress.js: the numbers every screen shows (counts, statuses, exam topics, the Path), read from the store.
// No DOM.
(function (L4N) {
  'use strict';
  const S = () => L4N.store.get();
  const domainOf = id => String(id || '').split('.')[0];

  function labStatus(slug) {
    const L = S().labs[slug];
    if (L && L.done) return 'done';
    const w = L4N.work.get(slug);
    return w && ((w.journal && w.journal.length) || (w.tasks || []).some(Boolean)) ? 'progress' : 'todo';
  }
  const lessonRead = slug => !!(S().lessons[slug] && S().lessons[slug].read);

  function labs() { const all = L4N.data.labs; return { done: all.filter(l => labStatus(l.slug) === 'done').length, total: all.length }; }
  function lessons() { const all = L4N.data.lessons; return { done: all.filter(l => lessonRead(l.slug)).length, total: all.length }; }
  function quiz() { const a = S().quiz.answers; return { correct: Object.keys(a).filter(k => a[k] === true).length, answered: Object.keys(a).length, total: typeof QUIZ !== 'undefined' ? QUIZ.length : 0 }; }

  // the objectives a lesson covers: a topic lesson's own, or its lab's
  const lessonObjs = l => (l.lesson.ccna && l.lesson.ccna.length ? l.lesson.ccna : l.lab && l.lab.lab.ccna) || [];

  // six exam domains: weight, labs done, lessons read, coverage (labs and lessons by their first objective)
  function domains() {
    const D = typeof CCNA_DOMAINS !== 'undefined' ? CCNA_DOMAINS : [];
    return D.map(([id, name, weight]) => {
      const labsIn = L4N.data.labs.filter(l => domainOf((l.lab.ccna || [])[0]) === id);
      const lessonsIn = L4N.data.lessons.filter(l => domainOf(lessonObjs(l)[0]) === id);
      const ld = labsIn.filter(l => labStatus(l.slug) === 'done').length, lr = lessonsIn.filter(l => lessonRead(l.slug)).length;
      const total = labsIn.length + lessonsIn.length;
      return { id, name, weight, labs: { done: ld, total: labsIn.length }, lessons: { read: lr, total: lessonsIn.length }, done: ld + lr, total, labsIn, lessonsIn };
    });
  }
  function objectives(domainId) {
    const O = typeof CCNA_OBJECTIVES !== 'undefined' ? CCNA_OBJECTIVES : {};
    return Object.keys(O).filter(k => domainOf(k) === domainId).sort((a, b) => a.split('.').map(Number)[1] - b.split('.').map(Number)[1] || a.localeCompare(b))
      .map(k => ({ id: k, name: O[k], labs: L4N.data.labs.filter(l => (l.lab.ccna || []).includes(k)), lessons: L4N.data.lessons.filter(l => lessonObjs(l).includes(k)) }));
  }

  // The Path: the eight stages from CAMPAIGN, in order, each with its labs and its stage check.
  function stages() {
    const C = typeof CAMPAIGN !== 'undefined' ? CAMPAIGN : [];
    return C.map((c, i) => {
      const labsIn = L4N.data.labs.filter(l => l.lab.group === c.group);
      const done = labsIn.filter(l => labStatus(l.slug) === 'done').length;
      let check = null;
      if (c.boss) {
        const need = Number.isInteger(c.need) ? c.need : 0;
        const locked = need > 0 && done < need;
        let passed = false, incident = null;
        if (c.boss.mode === 'incident') { incident = L4N.data.labByTitle(c.boss.title); passed = !!(incident && labStatus(incident.slug) === 'done'); }
        else passed = !!(L4N.exam && L4N.exam.stagePassed && L4N.exam.stagePassed(c.id));
        check = { mode: c.boss.mode, minutes: c.boss.minutes || 0, need, locked, passed, incident };
      }
      return { id: c.id, index: i, group: c.group, title: c.title, story: c.story, outro: c.outro, labs: labsIn, done, total: labsIn.length, check, complete: done === labsIn.length && (!check || check.passed) };
    });
  }
  // every lab in Path order
  function labsOrder() { return stages().flatMap(s => s.labs); }

  L4N.stats = { labStatus, lessonRead, labs, lessons, quiz, domains, objectives, stages, labsOrder, domainOf, lessonObjs };
  L4N.labsOrder = labsOrder;
})(window.L4N = window.L4N || {});
