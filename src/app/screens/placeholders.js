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
  P('sandbox', 'Sandbox', { icon: 'sandbox', what: 'The sandbox is being rebuilt.', todo: 'It comes back last, in the same workspace as the labs.', action: { label: 'Home', href: '#/' } });

})(window.L4N = window.L4N || {});
