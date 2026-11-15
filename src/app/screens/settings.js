// settings.js: Appearance, Console, Data and About (section 5.11).
(function (L4N) {
  'use strict';
  const { el, icon } = L4N.dom;
  const ui = L4N.ui;

  function row(label, sub, control, labelId) {
    return el('div', { class: 'setrow' }, el('div', { class: 'setrow__label' }, el('b', { text: label, id: labelId || null }), sub && el('span', { text: sub })), control);
  }

  function mount(root) {
    const s = L4N.store.get().settings;
    const set = L4N.setSetting;
    const id = L4N.dom.id;
    const ids = { theme: id('set'), motion: id('set'), side: id('set'), cons: id('set'), pace: id('set'), guide: id('set') };
    const page = el('div', { class: 'page' },
      el('h1', { class: 'page__title', 'data-heading': '', tabindex: '-1', text: 'Settings' }),
      el('section', { class: 'section', 'aria-labelledby': 'set-appearance' },
        el('h2', { class: 'section__title', id: 'set-appearance', text: 'Appearance' }),
        el('div', { class: 'setrows' },
          row('Theme', 'System follows your computer’s setting.', ui.segmented({ labelledby: ids.theme, value: s.theme, onChange: v => set({ theme: v }),
            options: [{ value: 'dark', label: 'Dark', icon: 'moon' }, { value: 'light', label: 'Light', icon: 'sun' }, { value: 'system', label: 'System', icon: 'monitor' }] }), ids.theme),
          row('Reduce motion', 'No sliding or fading, and packets on the map jump straight to the result. Your computer’s setting also turns this on.',
            ui.toggle({ labelledby: ids.motion, checked: s.motion === 'reduce', onChange: v => set({ motion: v ? 'reduce' : 'auto' }) }), ids.motion),
          row('Sidebar starts collapsed in labs', 'Below 1600 px wide, so the lab gets the room.',
            ui.toggle({ labelledby: ids.side, checked: s.sidebarInLabs === 'auto', onChange: v => set({ sidebarInLabs: v ? 'auto' : 'open' }) }), ids.side))),
      el('section', { class: 'section', 'aria-labelledby': 'set-console' },
        el('h2', { class: 'section__title', id: 'set-console', text: 'Console' }),
        el('div', { class: 'setrows' },
          row('Console colours', null, ui.segmented({ labelledby: ids.cons, value: s.consoleTheme, onChange: v => set({ consoleTheme: v }),
            options: [{ value: 'match', label: 'Match theme' }, { value: 'dark', label: 'Always dark' }] }), ids.cons),
          row('Output speed', 'How fast ping and traceroute output plays. Reduce motion makes it instant.', ui.segmented({ labelledby: ids.pace, value: s.pace, onChange: v => set({ pace: v }),
            options: [{ value: 'real', label: 'Real time' }, { value: 'fast', label: 'Fast' }, { value: 'instant', label: 'Instant' }] }), ids.pace),
          row('Start labs with step-by-step on', 'Shows the commands for each task. Capstones always start with it off.',
            ui.toggle({ labelledby: ids.guide, checked: s.guideDefault, onChange: v => set({ guideDefault: v }) }), ids.guide))),
      L4N.settingsData ? L4N.settingsData() : null,
      about());
    root.append(page);
  }

  function about() {
    const app = document.getElementById('app');
    const ver = app && app.dataset.version, date = app && app.dataset.date;
    const site = L4N.site;
    return el('section', { class: 'section', 'aria-labelledby': 'set-about', id: 'about', tabindex: '-1' },
      el('h2', { class: 'section__title', id: 'set-about', text: 'About' }),
      el('div', { class: 'prose' },
        el('p', {}, el('b', { text: 'Lab4Net ' + (ver || '') }), date ? ' · built ' + date : ''),
        el('p', { text: 'A free CCNA 200-301 lab simulator in one file. Configure routers, switches and PCs from IOS-style consoles, watch packets cross the network map, and get graded on whether the network works.' }),
        el('p', { text: 'Lab4Net is an independent study tool. It is not affiliated with, endorsed by or sponsored by Cisco Systems, Inc. Cisco, Cisco IOS, CCNA and Catalyst are trademarks or registered trademarks of Cisco Systems, Inc.' }),
        el('p', { text: site.counting()
          ? 'Your progress is stored only in this browser. This public site counts visits anonymously with GoatCounter: no cookies and no personal data, and nothing at all with Do Not Track on.'
          : 'Your progress is stored only in this browser. This copy makes no network requests.' }),
        el('p', { text: 'Fonts: Inter (The Inter Project Authors) and JetBrains Mono (The JetBrains Mono Project Authors), both under the SIL Open Font License 1.1.' })),
      el('div', { class: 'links' },
        el('a', { href: site.lessonsUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Lessons on the web', icon('external')),
        el('a', { href: site.github, target: '_blank', rel: 'noopener noreferrer' }, 'Source on GitHub', icon('external')),
        el('a', { href: site.licence, target: '_blank', rel: 'noopener noreferrer' }, 'MIT licence', icon('external')),
        el('a', { href: site.donate, target: '_blank', rel: 'noopener noreferrer' }, 'Support Lab4Net', icon('heart'))),
      el('div', { class: 'hstack', style: 'margin-top:16px' },
        ui.button({ label: 'Keyboard shortcuts', icon: 'keyboard', kbd: '?', onClick: () => L4N.keys.showList() }),
        L4N.landing ? ui.button({ label: 'Show the landing page again', kind: 'ghost', onClick: () => L4N.landing.show() }) : null));
  }

  L4N.screens.register('settings', { title: () => 'Settings', mount });
})(window.L4N = window.L4N || {});
