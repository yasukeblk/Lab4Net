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
  P('practice', 'Practice', { icon: 'practice', what: 'Practice is being rebuilt.', todo: 'The exam, quiz and subnetting drill come back here.', action: { label: 'Home', href: '#/' } });
  P('exam', 'Exam', { icon: 'clock', what: 'The exam is being rebuilt.', todo: 'Go back to Practice.', action: { label: 'Practice', href: '#/practice' } },
    { nav: 'practice', crumbs: () => [{ label: 'Practice', href: '#/practice' }, { label: 'Exam' }] });
  P('quiz', 'Quiz', { icon: 'list-checks', what: 'The quiz is being rebuilt.', todo: 'Go back to Practice.', action: { label: 'Practice', href: '#/practice' } },
    { nav: 'practice', crumbs: () => [{ label: 'Practice', href: '#/practice' }, { label: 'Quiz' }] });
  P('subnet', 'Subnetting', { icon: 'practice', what: 'The subnetting drill is being rebuilt.', todo: 'Go back to Practice.', action: { label: 'Practice', href: '#/practice' } },
    { nav: 'practice', crumbs: () => [{ label: 'Practice', href: '#/practice' }, { label: 'Subnetting' }] });
  P('sandbox', 'Sandbox', { icon: 'sandbox', what: 'The sandbox is being rebuilt.', todo: 'It comes back last, in the same workspace as the labs.', action: { label: 'Home', href: '#/' } });
  P('progress', 'Progress', { icon: 'progress', what: 'Nothing to show yet.', todo: 'Finish a lab and it shows here.', action: { label: 'Labs', href: '#/labs' } });

})(window.L4N = window.L4N || {});
