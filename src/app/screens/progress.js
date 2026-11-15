// progress.js: the Progress screen (section 5.10). No streaks, no points, no badges.
(function (L4N) {
  'use strict';
  const { el, icon } = L4N.dom;
  const ui = L4N.ui;

  function mount(root) {
    const S = L4N.store.get(), st = L4N.stats;
    const labs = st.labs(), lessons = st.lessons(), quiz = st.quiz(), exams = S.exam.history;
    const page = el('div', { class: 'page' }, el('h1', { class: 'page__title', 'data-heading': '', tabindex: '-1', text: 'Progress' }));
    const stat = (label, done, total) => el('div', { class: 'stat' }, el('span', { class: 'stat__label', text: label }), ui.bar(done, total, label));
    // 1. summary
    page.append(el('section', { class: 'section', 'aria-labelledby': 'pg-sum' }, el('h2', { class: 'section__title', id: 'pg-sum', text: 'Summary' }),
      el('div', { class: 'stats stats--4' }, stat('Labs done', labs.done, labs.total), stat('Lessons read', lessons.done, lessons.total), stat('Quiz correct', quiz.correct, quiz.total),
        el('div', { class: 'stat' }, el('span', { class: 'stat__label', text: 'Exams passed' }), el('span', { class: 'stat__big num', text: String(exams.filter(h => h.cleared).length) })))));
    // 2. exam topics: each domain expands to its objectives, each with its labs and lessons as links
    const link = (href, title, done) => el('a', { class: 'objlink', href }, icon(done ? 'check-circle' : 'circle', done ? 'st--done' : 'st--todo'), el('span', { text: title }), el('span', { class: 'sr-only', text: done ? ', done' : ', not done' }));
    const topics = el('div', { class: 'topics' });
    for (const d of st.domains()) {
      const objs = st.objectives(d.id).filter(o => o.labs.length || o.lessons.length);
      topics.append(el('details', { class: 'topic-d' },
        el('summary', { class: 'row topic' }, icon('chevron-right', 'topic__chev'), el('span', { class: 'row__id', text: d.id }), el('span', { class: 'row__title', text: d.name }),
          el('span', { class: 'row__meta' }, el('span', { class: 'num', text: d.weight + '%' }), el('span', { class: 'num', text: d.labs.done + '/' + d.labs.total + ' labs' }),
            el('span', { class: 'num', text: d.lessons.read + '/' + d.lessons.total + ' lessons' }), el('span', { class: 'topic__bar' }, ui.bar(d.done, d.total, d.name + ' coverage')))),
        el('div', { class: 'topic__objs' }, objs.map(o => el('div', { class: 'obj' }, el('p', {}, ui.objChip(o.id, o.name), ' ', el('span', { text: o.name })),
          el('div', { class: 'obj__links' }, o.labs.map(l => link(L4N.router.href('lab', l.slug), l.short, st.labStatus(l.slug) === 'done')),
            o.lessons.map(l => link(L4N.router.href('lesson', l.slug), 'Lesson: ' + l.title, st.lessonRead(l.slug)))))))));
    }
    page.append(el('section', { class: 'section', 'aria-labelledby': 'pg-topics' }, el('h2', { class: 'section__title', id: 'pg-topics', text: 'Exam topics' }), topics));
    // 3. the Path
    page.append(el('section', { class: 'section', 'aria-labelledby': 'pg-path' }, el('h2', { class: 'section__title', id: 'pg-path', text: 'Path' }),
      el('div', { class: 'list' }, st.stages().map((s, i) => el('a', { class: 'row', href: '#/labs' }, el('span', { class: 'row__id', text: String(i + 1) }), el('span', { class: 'row__title', text: s.title }),
        el('span', { class: 'row__meta' }, s.check ? (s.check.passed ? ui.chip('Stage check passed', 'chip--done', 'check-circle') : ui.chip(s.check.locked ? 'Stage check locked' : 'Stage check to do', 'chip--todo', s.check.locked ? 'lock' : 'circle')) : null,
          el('span', { class: 'topic__bar' }, ui.bar(s.done, s.total, s.title))))))));
    // 4. grades: five small numbers
    const g = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    for (const k of Object.keys(S.labs)) if (S.labs[k].grade) g[S.labs[k].grade]++;
    page.append(el('section', { class: 'section', 'aria-labelledby': 'pg-grades' }, el('h2', { class: 'section__title', id: 'pg-grades', text: 'Grades' }),
      el('ul', { class: 'grades' }, Object.keys(g).map(k => el('li', {}, ui.gradeChip(k), el('span', { class: 'num', text: String(g[k]) }), el('span', { class: 'sr-only', text: ' labs' }))))));
    // 5. exam history
    page.append(el('section', { class: 'section', 'aria-labelledby': 'pg-exams' }, el('h2', { class: 'section__title', id: 'pg-exams', text: 'Exam history' }), L4N.examHistory(exams)));
    // 6. recently finished: the last ten labs and lessons with dates
    const recent = Object.keys(S.labs).filter(k => S.labs[k].done && S.labs[k].doneAt).map(k => ({ at: S.labs[k].doneAt, title: (L4N.data.lab(k) || {}).short || k, href: L4N.router.href('lab', k), kind: 'Lab' }))
      .concat(Object.keys(S.lessons).filter(k => S.lessons[k].read && S.lessons[k].readAt).map(k => ({ at: S.lessons[k].readAt, title: (L4N.data.lesson(k) || {}).title || k, href: L4N.router.href('lesson', k), kind: 'Lesson' })))
      .sort((a, b) => b.at - a.at).slice(0, 10);
    page.append(el('section', { class: 'section', 'aria-labelledby': 'pg-recent' }, el('h2', { class: 'section__title', id: 'pg-recent', text: 'Recently finished' }),
      recent.length ? el('div', { class: 'list' }, recent.map(x => el('a', { class: 'row', href: x.href }, icon(x.kind === 'Lab' ? 'labs' : 'lessons'), el('span', { class: 'row__title', text: x.title }),
        el('span', { class: 'row__meta' }, el('span', { text: x.kind }), el('time', { text: new Date(x.at).toLocaleDateString() })))))
        : ui.empty({ icon: 'progress', what: 'Nothing finished yet.', todo: 'Finish a lab or read a lesson and it shows here.', action: { label: 'Labs', href: '#/labs' } })));
    root.append(page);
  }

  L4N.screens.register('progress', { title: () => 'Progress', mount });
})(window.L4N = window.L4N || {});
