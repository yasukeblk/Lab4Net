// gallery.js: #/dev/components. Every component in both themes, side by side. Not linked; used by the
// screenshot, contrast and accessibility tests.
(function (L4N) {
  'use strict';
  const { el, icon, svg } = L4N.dom;
  const ui = L4N.ui;

  const UI_ICONS = ['home', 'labs', 'lessons', 'practice', 'sandbox', 'progress', 'settings', 'search', 'menu', 'circle', 'circle-half', 'check-circle', 'x-circle',
    'alert', 'info', 'clock', 'lock', 'check', 'x', 'plus', 'minus', 'play', 'replay', 'reset', 'undo', 'redo', 'copy', 'download', 'upload', 'trash', 'filter',
    'more', 'external', 'pop-out', 'eye', 'bulb', 'list-checks', 'route', 'cable', 'note', 'keyboard', 'heart', 'sidebar', 'panel-left', 'panel-bottom',
    'maximize', 'minimize', 'chevron-right', 'chevron-down', 'chevron-left', 'chevron-up', 'grip', 'sun', 'moon', 'monitor', 'arrow-right', 'flag'];
  const DEVICES = [['router', 'Router'], ['switch', 'Switch'], ['l3', 'Layer 3 switch'], ['pc', 'PC'], ['server', 'Server'], ['phone', 'IP phone'], ['ap', 'Access point']];

  function block(title, ...kids) {
    return el('section', { class: 'gal__block' }, el('h3', { class: 'label-caps', text: title }), el('div', { class: 'gal__body' }, kids));
  }

  function column(theme) {
    const t = theme === 'dark' ? 'Dark' : 'Light';
    const tabs = ui.tabs({ label: 'Example tabs (' + t + ')', selected: 'tasks', items: [{ id: 'tasks', label: 'Tasks' }, { id: 'commands', label: 'Commands' }, { id: 'clues', label: 'Clues' }] });
    const lst = ui.list({ label: 'Example list (' + t + ')', selected: 'b', groups: [
      { label: 'Switching', count: '2/3', rows: [
        { key: 'a', status: 'done', idText: 'LAB-02', title: 'VLANs and access ports', meta: [ui.objChip('2.1', 'VLANs'), ui.gradeChip('S'), el('span', { text: '6/6' })] },
        { key: 'b', status: 'progress', idText: 'LAB-03', title: '802.1Q trunking', meta: [ui.objChip('2.2', 'Interswitch connectivity'), el('span', { text: '3/7' })] },
        { key: 'c', status: 'todo', idText: 'INC-04', title: 'The trunk that carries nothing', meta: [ui.chip('Incident')] }] }] });
    return el('div', { class: 'gal__col', 'data-theme': theme },
      el('h2', { class: 'section__title', text: t + ' theme' }),
      block('Buttons',
        el('div', { class: 'hstack' }, ui.button({ label: 'Grade', kind: 'primary', kbd: 'mod+enter' }), ui.button({ label: 'Open lesson' }), ui.button({ label: 'Show walkthrough', kind: 'ghost' }),
          ui.button({ label: 'Reset lab', kind: 'danger', icon: 'reset' })),
        el('div', { class: 'hstack' }, ui.button({ icon: 'more', aria: 'More actions' }), ui.button({ icon: 'pop-out', aria: 'Pop out tasks' }),
          ui.button({ label: 'Disabled', disabled: true }), ui.button({ label: 'Start lab', kind: 'primary', size: 'lg', icon: 'play' }))),
      block('Inputs',
        el('div', { class: 'stack' },
          el('label', { class: 'field' }, el('span', { class: 'field__label', text: 'Hostname' }), ui.input({ value: 'R1', label: null })),
          (() => { const eid = L4N.dom.id('err'); const i = ui.input({ value: '10.0.0.300' }); i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', eid);
            return el('label', { class: 'field' }, el('span', { class: 'field__label', text: 'Network address' }), i, el('span', { class: 'field__error', id: eid }, icon('alert'), 'Each part must be 0 to 255.')); })(),
          ui.searchInput({ placeholder: 'Filter labs', label: 'Filter labs (' + t + ')' }),
          el('div', { class: 'hstack' }, ui.select({ label: 'Group by (' + t + ')', value: 'path', options: [{ value: 'path', label: 'Path' }, { value: 'type', label: 'Type' }, { value: 'topic', label: 'Exam topic' }] }),
            ui.segmented({ label: 'Status (' + t + ')', value: 'all', options: [{ value: 'all', label: 'All' }, { value: 'todo', label: 'To do' }, { value: 'progress', label: 'In progress' }, { value: 'done', label: 'Done' }] })),
          el('div', { class: 'hstack' }, ui.checkbox({ label: 'Task ticked', checked: true }), ui.checkbox({ label: 'Task not ticked' })),
          el('div', { class: 'hstack' }, ui.toggle({ label: 'Step-by-step', checked: true }), ui.toggle({ label: 'Reduce motion' })))),
      block('Chips',
        el('div', { class: 'hstack' }, ui.statusChip('todo'), ui.statusChip('progress'), ui.statusChip('done'), ui.statusChip('failed')),
        el('div', { class: 'hstack' }, ui.objChip('3.4', 'Single-area OSPFv2'), ui.gradeChip('S'), ui.gradeChip('A'), ui.gradeChip('C'), ui.kbd('mod+k'), ui.kbd('g l'),
          ui.chip('Build'), ui.chip('Incident'), ui.chip('Capstone'), ui.chip('Topic'))),
      block('Tabs', tabs.el),
      block('List', lst.el),
      block('Table',
        el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
          el('thead', {}, el('tr', {}, el('th', { text: 'Device' }), el('th', { text: 'Interface' }), el('th', { text: 'Address' }))),
          el('tbody', {}, [['R1', 'G0/0', '192.168.1.1/24'], ['R1', 'S0/0/0', '10.0.12.1/30'], ['PC1', 'NIC', '192.168.1.10/24']].map(r =>
            el('tr', {}, el('td', { text: r[0] }), el('td', { class: 'mono', text: r[1] }), el('td', { class: 'mono', text: r[2] }))))))),
      block('Overlays',
        el('div', { class: 'hstack' },
          ui.button({ label: 'Open dialog', onClick: () => L4N.dialog.open({ title: 'Reset this lab?', body: 'Your commands for this lab are deleted. Finished labs and grades are kept.',
            actions: [{ label: 'Cancel' }, { label: 'Reset lab', kind: 'danger' }] }) }),
          ui.button({ label: 'Menu', icon: 'more', onClick: e => L4N.menu.open(e.currentTarget, [
            { label: 'Show walkthrough', icon: 'eye', run() {} }, { label: 'Pop out tasks', icon: 'pop-out', run() {} }, 'sep',
            { label: 'Reset lab', icon: 'reset', danger: true, run() {} }]) }),
          ui.button({ label: 'Toast', kind: 'ghost', onClick: () => L4N.toast({ text: 'Lab complete · Grade A', kind: 'ok', action: { label: 'Next lab', run() {} } }) }),
          ui.button({ label: 'Error toast', kind: 'ghost', onClick: () => L4N.toast({ text: 'Import failed: that file is not a Lab4Net backup.', kind: 'bad' }) }),
          el('button', { class: 'btn btn--secondary', type: 'button', 'data-tip': 'Tooltips wait 400 ms on hover', 'data-kbd': 'mod+k' }, 'Hover me'))),
      block('Empty state', ui.empty({ icon: 'filter', what: 'No labs match.', todo: 'Clear the filters.', action: { label: 'Clear filters' } })),
      block('Progress and dividers',
        el('div', { class: 'stack' }, ui.bar(23, 77, 'Labs done'), ui.bar(0, 66, 'Lessons read'),
          el('div', { class: 'hstack', style: 'height:48px;gap:24px' }, el('div', { class: 'handle handle--v', style: 'height:48px', tabindex: '0', role: 'separator', 'aria-orientation': 'vertical', 'aria-label': 'Example divider', 'aria-valuenow': '50' }),
            el('div', { class: 'handle handle--h', style: 'width:120px', tabindex: '0', role: 'separator', 'aria-orientation': 'horizontal', 'aria-label': 'Example divider', 'aria-valuenow': '50' })))),
      block('Callouts and code',
        el('div', { class: 'stack' },
          ui.callout({ title: 'Exam note', body: ['Only the first matching ACL line is used.'] }),
          ui.callout({ kind: 'warn', title: 'Common mistake', body: [el('span', {}, 'Forgetting ', el('code', { text: 'no shutdown' }), ' on the router interface.')] }),
          ui.callout({ kind: 'bad', body: ['Blocked by ACL on R2 G0/1 inbound.'] }),
          el('div', {}, el('button', { class: 'cmd', type: 'button' }, 'R1(config)# ip route 192.168.3.0 255.255.255.0 10.0.12.2'),
            el('div', { class: 'cmd' }, '# A step that is a note, not a command')))),
      block('Icons',
        el('div', { class: 'gal__icons' }, UI_ICONS.map(n => el('div', { class: 'gal__icon', 'data-tip': n }, icon(n), el('span', { text: n })))),
        el('div', { class: 'gal__icons gal__devs' }, DEVICES.map(([k, n]) => el('div', { class: 'gal__icon' },
          svg('svg', { class: 'gal__dev', viewBox: '0 0 40 40', 'aria-hidden': 'true' }, svg('use', { href: '#d-' + k })), el('span', { text: n })))),
        el('div', { class: 'hstack' }, L4N.logo(), el('span', { class: 'wordmark', text: 'Lab4Net' }))));
  }

  function mount(root) {
    root.append(el('div', { class: 'page page--wide' },
      el('h1', { class: 'page__title', 'data-heading': '', tabindex: '-1', text: 'Components' }),
      el('p', { class: 'page__lead', text: 'Every component, in both themes. This page is for development and the screenshot tests.' }),
      el('div', { class: 'gal' }, column('dark'), column('light'))));
  }

  L4N.screens.register('gallery', { title: () => 'Components', crumbs: () => [{ label: 'Components' }], mount });
})(window.L4N = window.L4N || {});
