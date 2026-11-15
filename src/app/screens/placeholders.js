// placeholders.js: a proper empty state for every route that a later build phase fills in.
// Each real screen registers itself after this file and replaces its placeholder.
(function (L4N) {
  'use strict';
  const { el } = L4N.dom;
  const ui = L4N.ui;

  function page(title, o) {
    return function mount(root) {
      root.append(el('div', { class: 'page' }, el('h1', { class: 'page__title', 'data-heading': '', tabindex: '-1', text: title }),
        el('div', { class: 'placeholder' }, ui.empty(o))));
    };
  }

  const P = (name, title, o, extra) => L4N.screens.register(name, Object.assign({ title: () => title, mount: page(title, o) }, extra || {}));
  P('home', 'Home', { icon: 'home', what: 'Home is being rebuilt.', todo: 'Open the command palette to find a lab or a lesson.', action: { label: 'Search or jump to', icon: 'search', onClick: () => L4N.palette.open() } },
    { title: () => 'Lab4Net', crumbs: () => [{ label: 'Home' }] });
  P('labs', 'Labs', { icon: 'labs', what: 'The labs list is being rebuilt.', todo: 'Labs open from the command palette for now.', action: { label: 'Search labs', icon: 'search', onClick: () => L4N.palette.open() } });
  P('lessons', 'Lessons', { icon: 'lessons', what: 'The lessons list is being rebuilt.', todo: 'The lessons are also on the web.', action: { label: 'Lessons on the web', href: L4N.site.lessonsUrl, target: '_blank', rel: 'noopener noreferrer', icon: 'external' } });
  P('practice', 'Practice', { icon: 'practice', what: 'Practice is being rebuilt.', todo: 'The exam, quiz and subnetting drill come back here.', action: { label: 'Home', href: '#/' } });
  P('exam', 'Exam', { icon: 'clock', what: 'The exam is being rebuilt.', todo: 'Go back to Practice.', action: { label: 'Practice', href: '#/practice' } },
    { nav: 'practice', crumbs: () => [{ label: 'Practice', href: '#/practice' }, { label: 'Exam' }] });
  P('quiz', 'Quiz', { icon: 'list-checks', what: 'The quiz is being rebuilt.', todo: 'Go back to Practice.', action: { label: 'Practice', href: '#/practice' } },
    { nav: 'practice', crumbs: () => [{ label: 'Practice', href: '#/practice' }, { label: 'Quiz' }] });
  P('subnet', 'Subnetting', { icon: 'practice', what: 'The subnetting drill is being rebuilt.', todo: 'Go back to Practice.', action: { label: 'Practice', href: '#/practice' } },
    { nav: 'practice', crumbs: () => [{ label: 'Practice', href: '#/practice' }, { label: 'Subnetting' }] });
  P('sandbox', 'Sandbox', { icon: 'sandbox', what: 'The sandbox is being rebuilt.', todo: 'It comes back last, in the same workspace as the labs.', action: { label: 'Home', href: '#/' } });
  P('progress', 'Progress', { icon: 'progress', what: 'Nothing to show yet.', todo: 'Finish a lab and it shows here.', action: { label: 'Labs', href: '#/labs' } });

  const labTitle = r => { const l = L4N.data.lab(r.slug); return l ? l.title : 'Lab'; };
  L4N.screens.register('lab', {
    nav: 'labs', title: labTitle,
    crumbs: r => { const l = L4N.data.lab(r.slug); return [{ label: 'Labs', href: '#/labs' }, l ? { label: l.lab.group, href: '#/labs' } : null, { label: labTitle(r) }].filter(Boolean); },
    mount(root, r) {
      const l = L4N.data.lab(r.slug);
      if (!l) { L4N.toast({ text: 'That link is out of date.', kind: 'warn' }); setTimeout(() => L4N.shell.go('#/labs'), 0); return; }
      page(l.title, { icon: 'labs', what: 'The lab workspace is being rebuilt.', todo: 'It comes back in the next build phase.', action: { label: 'Labs', href: '#/labs' } })(root);
    }
  });
  const lessonTitle = r => { const l = L4N.data.lesson(r.slug); return l ? l.title : 'Lesson'; };
  L4N.screens.register('lesson', {
    nav: 'lessons', title: lessonTitle,
    crumbs: r => [{ label: 'Lessons', href: '#/lessons' }, { label: lessonTitle(r) }],
    mount(root, r) {
      const l = L4N.data.lesson(r.slug);
      if (!l) { L4N.toast({ text: 'That link is out of date.', kind: 'warn' }); setTimeout(() => L4N.shell.go('#/lessons'), 0); return; }
      page(l.title, { icon: 'lessons', what: 'The lesson reader is being rebuilt.', todo: 'This lesson is also on the web.', action: { label: 'Read it on the web', href: L4N.site.lessonsUrl + l.slug + '.html', target: '_blank', rel: 'noopener noreferrer', icon: 'external' } })(root);
    }
  });
})(window.L4N = window.L4N || {});
