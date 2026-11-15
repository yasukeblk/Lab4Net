// home.js: Home (section 5.2): Continue (or Start here), Recently, Next up, a line of totals, Practice.
(function (L4N) {
  'use strict';
  const { el, icon } = L4N.dom;
  const ui = L4N.ui;

  function row(l) {
    const st = L4N.stats.labStatus(l.slug), rec = L4N.store.get().labs[l.slug] || {};
    return el('a', { class: 'row', href: L4N.router.href('lab', l.slug) }, ui.statusIcon(st), el('span', { class: 'row__id', text: l.idText }),
      el('span', { class: 'row__title', text: l.short }), el('span', { class: 'row__meta' }, el('span', { text: l.lab.group }), rec.grade ? ui.gradeChip(rec.grade) : null));
  }

  function mount(root) {
    const S = L4N.store.get(), stats = L4N.stats;
    const labs = stats.labs(), lessons = stats.lessons(), quiz = stats.quiz();
    const order = stats.labsOrder();
    const page = el('div', { class: 'page home' }, el('h1', { class: 'sr-only', 'data-heading': '', tabindex: '-1', text: 'Home' }));

    // 1. Continue (an exam, the last lab) or Start here for a new user
    const exam = L4N.exam && L4N.exam.running && L4N.exam.running();
    const last = S.ui.lastLab && L4N.data.lab(S.ui.lastLab);
    if (exam && L4N.exam.card) page.append(L4N.exam.card());
    else if (!labs.done && !(last && L4N.work.get(last.slug))) {
      const first = order[0];
      page.append(el('section', { class: 'card home__card', 'aria-labelledby': 'home-start' },
        el('div', { class: 'home__card-body' },
          el('h2', { class: 'section__title', id: 'home-start', text: 'Start here' }),
          el('p', { class: 'muted', text: 'Your first lab: ' + first.title + '.' }),
          el('ol', { class: 'home__steps' }, el('li', { text: 'Read the tasks.' }), el('li', { text: 'Type commands in the console.' }), el('li', { text: 'Press Grade when the network works.' }))),
        ui.button({ label: 'Start lab', kind: 'primary', size: 'lg', icon: 'play', href: L4N.router.href('lab', first.slug) })));
    } else if (last) {
      const w = L4N.work.get(last.slug), ticked = w ? (w.tasks || []).filter(Boolean).length : 0;
      const done = stats.labStatus(last.slug) === 'done', grade = (L4N.store.get().labs[last.slug] || {}).grade;
      page.append(el('section', { class: 'card home__card', 'aria-labelledby': 'home-continue' },
        el('div', { class: 'home__card-body' },
          el('span', { class: 'label-caps', text: 'Continue' }),
          el('h2', { class: 'section__title', id: 'home-continue', text: last.title }),
          // A finished lab shows Done and its grade; one in progress shows how many tasks are ticked.
          el('p', { class: 'muted num' }, done ? last.lab.group + ' · ' : last.lab.group + ' · ' + ticked + ' of ' + last.lab.tasks.length + ' tasks · ',
            ui.statusChip(stats.labStatus(last.slug)), done && grade ? ' ' : null, done && grade ? ui.gradeChip(grade) : null)),
        ui.button({ label: 'Resume', kind: 'primary', size: 'lg', icon: 'play', href: L4N.router.href('lab', last.slug) })));
    }

    // 2. Recently: the last three labs finished or lessons read, with grades. Progress has the full picture.
    const recent = Object.keys(S.labs).filter(k => S.labs[k].done && S.labs[k].doneAt && L4N.data.lab(k))
      .map(k => ({ at: S.labs[k].doneAt, title: L4N.data.lab(k).short, href: L4N.router.href('lab', k), kind: 'Lab', grade: S.labs[k].grade }))
      .concat(Object.keys(S.lessons).filter(k => S.lessons[k].read && S.lessons[k].readAt && L4N.data.lesson(k))
        .map(k => ({ at: S.lessons[k].readAt, title: L4N.data.lesson(k).title, href: L4N.router.href('lesson', k), kind: 'Lesson' })))
      .sort((a, b) => b.at - a.at).slice(0, 3);
    if (recent.length) page.append(el('section', { class: 'section', 'aria-labelledby': 'home-recent' },
      el('h2', { class: 'section__title', id: 'home-recent', text: 'Recently' }),
      el('div', { class: 'list' }, recent.map(x => el('a', { class: 'row', href: x.href }, icon(x.kind === 'Lab' ? 'labs' : 'lessons'), el('span', { class: 'row__title', text: x.title }),
        el('span', { class: 'row__meta' }, el('span', { text: x.kind }), x.grade ? ui.gradeChip(x.grade) : null))))));

    // 3. Next up: the next three labs on the Path that are not done
    const next = order.filter(l => stats.labStatus(l.slug) !== 'done' && l.slug !== (last && last.slug)).slice(0, 3);
    if (next.length) page.append(el('section', { class: 'section', 'aria-labelledby': 'home-next' },
      el('h2', { class: 'section__title', id: 'home-next', text: 'Next up' }), el('div', { class: 'list' }, next.map(row))));

    // 4. One line of totals; the bars and the exam topics live on Progress
    page.append(el('p', { class: 'home__summary num' }, labs.done + ' of ' + labs.total + ' labs · ' + lessons.done + ' of ' + lessons.total + ' lessons · ' +
      quiz.correct + ' of ' + quiz.total + ' quiz questions right · ', el('a', { href: '#/progress', text: 'See your progress' })));

    // 5. Practice
    page.append(el('section', { class: 'section', 'aria-labelledby': 'home-practice' },
      el('h2', { class: 'section__title', id: 'home-practice', text: 'Practice' }),
      el('div', { class: 'hstack' },
        ui.button({ label: "Today's exam", kind: 'ghost', icon: 'clock', href: '#/practice/exam' }),
        ui.button({ label: 'Quiz', kind: 'ghost', icon: 'list-checks', href: '#/practice/quiz' }),
        ui.button({ label: 'Subnetting', kind: 'ghost', icon: 'practice', href: '#/practice/subnetting' }))));
    root.append(page);
  }

  L4N.screens.register('home', { title: () => 'Lab4Net', crumbs: () => [{ label: 'Home' }], mount });
})(window.L4N = window.L4N || {});
