// tasks.js: the Tasks panel (section 5.4): Tasks and Commands tabs. Lab task text, briefs, "why" text and command
// explanations are repo content (dom.trusted); everything else is text.
(function (L4N) {
  'use strict';
  const { el, icon, clear, trusted, id } = L4N.dom;
  const ui = L4N.ui, sim = L4N.sim;
  const CLUE_NAMES = ['Direction', 'Evidence', 'Repair'];

  function objChips(lab) {
    return (lab.ccna || []).slice(0, 4).map(o => ui.objChip(o, (typeof CCNA_OBJECTIVES !== 'undefined' && CCNA_OBJECTIVES[o]) || ''));
  }
  const cmdText = c => (c === sim.CRLINE ? '↵ Enter' : c);

  // ws: {st, entry, tasks, graded, guide, walk, clues, hideHelp(), onTick, setGuide(v), revealClue(), stepTo(dev, cmd), hints}
  function createTasks(ws) {
    const st = ws.st, lab = st.lab, entry = st.entry;
    const help = () => !(ws.hideHelp && ws.hideHelp());
    const tasksBody = el('div', { class: 'tasks__body' });
    const cmdsBody = el('div', { class: 'tasks__body cmds' });
    const countEl = el('span', { class: 'tasks__count num' });
    const panelTasks = el('div', { class: 'pane__body', tabindex: '-1', role: 'tabpanel', id: id('tp') }, tasksBody);
    const panelCmds = el('div', { class: 'pane__body', tabindex: '-1', role: 'tabpanel', id: id('tp'), hidden: true }, cmdsBody);
    let tab = 'tasks';
    const tabs = ui.tabs({ label: 'Tasks panel', selected: 'tasks', items: [{ id: 'tasks', label: 'Tasks', panel: panelTasks.id }, { id: 'commands', label: 'Commands', panel: panelCmds.id }],
      onSelect: v => { tab = v; panelTasks.hidden = v !== 'tasks'; panelCmds.hidden = v !== 'commands'; if (v === 'commands') renderCommands(); } });
    panelTasks.setAttribute('aria-labelledby', tabs.tab('tasks').id); panelCmds.setAttribute('aria-labelledby', tabs.tab('commands').id);
    const head = el('div', { class: 'pane__head' }, tabs.el, el('span', { class: 'spacer' }), countEl);
    const root = el('section', { class: 'pane tasks', 'aria-label': 'Tasks', id: 'ws-tasks' }, head, panelTasks, panelCmds);
    const results = el('section', { class: 'results', 'aria-label': 'Results', 'aria-live': 'polite', id: id('results') });

    // Before a grade the header counts ticked tasks; after one it counts the checks that passed, the real measure.
    function updateCount() {
      const g = ws.graded && ws.graded.results;
      if (g) { countEl.textContent = g.filter(x => x[1]).length + ' of ' + g.length + ' checks'; return; }
      countEl.textContent = ws.tasks.filter(Boolean).length + ' of ' + lab.tasks.length + ' done';
    }

    // ---- steps for one task: command rows grouped by device ----
    function stepRows(i) {
      const groups = sim.steps(lab)[i] || [];
      if (!groups.length) return null;
      const box = el('div', { class: 'steps', role: 'group', 'aria-label': 'Steps for task ' + (i + 1) });
      for (const g of groups) {
        const dev = st.net.devs[g.dev];
        box.append(el('div', { class: 'steps__dev label-caps', text: 'On ' + (dev ? dev.hostname : g.dev) }));
        for (const x of g.lines) {
          if (x.note) { box.append(el('div', { class: 'steps__note', text: x.note })); continue; }
          box.append(el('button', { class: 'cmd step', type: 'button', 'data-dev': g.dev, 'data-cmd': x.cmd, 'data-tip': 'Put this command in the ' + (dev ? dev.hostname : g.dev) + ' console',
            onClick: () => ws.stepTo(g.dev, x.cmd) }, el('span', { class: 'step__prompt', text: x.prompt || '' }), el('span', { text: cmdText(x.cmd) })));
        }
      }
      return box;
    }

    function stepRow() {
      // every task's commands at once: the same cost as using all the per-task help (grade.js)
      const sw = ui.toggle({ label: 'Step-by-step for every task (−15)', checked: !!ws.guide, onChange: v => ws.setGuide(v) });
      return el('div', { class: 'tasks__row' }, sw, el('span', { class: 'tasks__count num', text: ws.tasks.filter(Boolean).length + ' of ' + lab.tasks.length + ' done' }));
    }

    function clues() {
      if (entry.kind !== 'incident' || !Array.isArray(lab.hints) || !help()) return null;
      const n = Math.max(0, Math.min(3, ws.clues || 0));
      const box = el('section', { class: 'sect clues', 'aria-label': 'Clues' }, el('h3', { class: 'label-caps', text: 'Clues' }));
      lab.hints.slice(0, n).forEach((c, i) => box.append(ui.callout({ icon: 'bulb', title: CLUE_NAMES[i] || 'Clue', body: [el('span', { text: c })] })));
      if (n < 3) box.append(el('div', { class: 'hstack' }, ui.button({ label: 'Reveal clue ' + (n + 1) + ' of 3', icon: 'bulb', onClick: () => ws.revealClue() }),
        el('span', { class: 'hint', text: 'Each clue costs 5 points.' })));
      else box.append(el('p', { class: 'hint', text: 'All three clues revealed.' }));
      return box;
    }

    function walkthrough() {
      if (!ws.walk || !help()) return null;
      const box = el('section', { class: 'sect walk', 'aria-label': 'Walkthrough' },
        el('div', { class: 'hstack' }, el('h3', { class: 'label-caps', text: 'Walkthrough' }), el('span', { class: 'spacer' }), ui.button({ label: 'Hide', kind: 'ghost', onClick: () => ws.setWalk(false) })),
        el('p', { class: 'hint', text: 'One working answer. Read one device at a time, predict what each command changes, then type it yourself.' }));
      for (const [dev, cmds] of Object.entries(lab.solution || {})) {
        const d = st.net.devs[dev];
        box.append(el('div', { class: 'steps__dev label-caps', text: 'On ' + (d ? d.hostname : dev) }));
        for (const c of cmds) {
          const w = sim.why(c);
          box.append(el('div', { class: 'walk__row' }, el('code', { class: 'walk__cmd', text: cmdText(c) }), w ? trusted(w, 'div', { class: 'walk__why' }) : null));
        }
      }
      return box;
    }

    // ---- help for one task: a hint, then its commands. Each costs points once (grade.js), and says so first. ----
    // The hint says where to work without saying what to type: the device, the mode, how many commands.
    const MOVE = /^\s*(end|exit|enable|disable|conf(igure)?(\s+t(erminal)?)?|logout)\s*$/i;
    const MODES = [[/\(config\)#$/, 'global configuration'], [/\(config-if\)#$/, 'interface configuration'], [/\(config-subif\)#$/, 'subinterface configuration'],
      [/\(config-router\)#$/, 'routing configuration'], [/\(config-line\)#$/, 'line configuration'], [/\(config-vlan\)#$/, 'VLAN configuration'],
      [/\(dhcp-config\)#$/, 'DHCP pool configuration'], [/\(config-(std|ext)-nacl\)#$/, 'ACL configuration'], [/\(config-[a-z0-9-]+\)#$/, 'configuration mode'],
      [/^[A-Z]:\\>$/, 'the command prompt'], [/#$/, 'privileged EXEC'], [/>$/, 'user EXEC']];
    const modeOf = p => { const m = MODES.find(([re]) => re.test(String(p || '').trim())); return m ? m[1] : ''; };
    function hintFor(i) {
      const parts = (sim.steps(lab)[i] || []).map(g => {
        const cmds = g.lines.filter(x => x.cmd && !/:\s*$/.test(x.prompt || '') && !MOVE.test(x.cmd));
        if (!cmds.length) return null;
        const dev = st.net.devs[g.dev], modes = [...new Set(cmds.map(x => modeOf(x.prompt)).filter(Boolean))];
        return (dev ? dev.hostname : g.dev) + (modes.length ? ' (' + modes.join(', ') + ')' : '') + ', ' + cmds.length + (cmds.length > 1 ? ' commands' : ' command');
      }).filter(Boolean);
      return parts.length ? 'Work on ' + parts.join('; then ') + '.' : null;
    }
    function taskHelp(i) {
      const steps = stepRows(i);
      if (!steps) return [];
      // order: the hint (once opened), the buttons still on offer, then the commands (once opened). A finished task
      // offers no more help; what was already opened stays.
      const out = [], R = ws.reveal || { hint: [], cmds: [] }, hint = hintFor(i), done = !!ws.tasks[i];
      const row = el('div', { class: 'task__help' });
      if (hint && R.hint.includes(i)) out.push(el('p', { class: 'task__hint' }, el('b', { text: 'Hint: ' }), hint));
      else if (hint && !R.cmds.includes(i) && !done) row.append(ui.button({ label: 'Hint (−2)', kind: 'ghost', icon: 'bulb', aria: 'Hint for task ' + (i + 1) + ', costs 2 points', onClick: () => ws.reveal1('hint', i) }));
      if (!R.cmds.includes(i) && !done) row.append(ui.button({ label: 'Show commands (−5)', kind: 'ghost', icon: 'eye', aria: 'Show the commands for task ' + (i + 1) + ', costs 5 points', onClick: () => ws.reveal1('cmds', i) }));
      if (row.childNodes.length) out.push(row);
      if (R.cmds.includes(i)) out.push(steps);
      return out;
    }

    // One line with a close button, so the tasks stay near the top.
    function firstRunTip() {
      if (!help() || ws.guide || (ws.hints && ws.hints.stepTip)) return null;
      const box = el('div', { class: 'banner banner--line', role: 'note' }, icon('info'),
        el('span', { text: 'New here? Each task has a Hint and its commands, and Step-by-step shows every task\'s commands.' }),
        ui.button({ icon: 'x', aria: 'Got it, hide this tip', kind: 'ghost', onClick: () => { ws.dismissHint('stepTip'); box.remove(); } }));
      return box;
    }
    function addressPlan() {
      if (!lab.addr || !lab.addr.length) return null;
      return el('details', { class: 'sect addr-plan', open: entry.kind === 'capstone' },
        el('summary', {}, icon('chevron-down', 'icon--chev'), el('span', { class: 'label-caps', text: 'Addresses' })),
        el('div', { class: 'table-wrap' }, el('table', { class: 'table addr' },
          el('thead', {}, el('tr', {}, el('th', { text: 'Device', scope: 'col' }), el('th', { text: 'Interface', scope: 'col' }), el('th', { text: 'Address', scope: 'col' }))),
          el('tbody', {}, lab.addr.map(r => el('tr', {}, el('td', { text: String(r[0]) }), el('td', { text: String(r[1]) }), el('td', { text: String(r[2]) })))))));
    }

    function build() {
      const keepScroll = panelTasks.scrollTop;
      clear(tasksBody);
      // 1. the brief, with objective chips
      tasksBody.append(el('div', {}, trusted(lab.brief || '', 'p', { class: 'tasks__brief' }), el('div', { class: 'tasks__chips' }, objChips(lab))));
      // 2. incidents
      if (entry.kind === 'incident') tasksBody.append(ui.callout({ kind: 'warn', icon: 'alert', body: ['This network worked until something changed. Find it, make the smallest repair, keep everything else working.'] }));
      for (const fn of ws.topExtras || []) { const x = fn(); if (x) tasksBody.append(x); }
      const tip = firstRunTip(); if (tip) tasksBody.append(tip);
      // 3. step-by-step switch and the count (the address plan now comes after the tasks)
      if (help()) tasksBody.append(stepRow());
      // 5. the tasks
      const list = el('ol', { class: 'tasklist', 'aria-label': 'Tasks' });
      lab.tasks.forEach((t, i) => {
        const textId = id('task');
        const li = el('li', { class: ['task', ws.tasks[i] && 'is-ticked'] });
        // a task that ticks itself (ws.auto) can't be ticked by hand; the others can, as before
        const self = !!(ws.auto && ws.auto[i]);
        const cb = ui.checkbox({ checked: !!ws.tasks[i], aria: 'Task ' + (i + 1) + ' done' + (self ? ', ticks itself when the network does this' : ''), disabled: self,
          tip: self ? 'Ticks itself when the network does this' : null,
          onChange: v => { ws.tasks[i] = v; li.classList.toggle('is-ticked', v); updateCount(); if (ws.onTick) ws.onTick(i, v); } });
        const more = el('div', { class: 'task__more' });
        if (lab.why && lab.why[i] && help()) more.append(el('details', { class: 'why' }, el('summary', {}, icon('chevron-right'), 'Why'), trusted(lab.why[i], 'div', { class: 'why__text' })));
        if (ws.guide && help()) { const s = stepRows(i); if (s) more.append(s); }
        else if (help()) more.append(...taskHelp(i));
        li.append(cb, trusted(t, 'div', { class: 'task__text', id: textId }), more);
        cb.querySelector('input').setAttribute('aria-describedby', textId);
        list.append(li);
      });
      tasksBody.append(list);
      // 5. the address plan, folded away except in capstones, where it is the brief
      const plan = addressPlan(); if (plan) tasksBody.append(plan);
      // 6. clues
      const c = clues(); if (c) tasksBody.append(c);
      // 7. results
      tasksBody.append(results);
      renderResults();
      // 8. walkthrough
      const w = walkthrough(); if (w) tasksBody.append(w);
      updateCount();
      panelTasks.scrollTop = keepScroll;
    }

    function renderResults() {
      clear(results);
      const g = ws.graded;
      if (!g) { results.hidden = true; return; }
      results.hidden = false;
      const pass = g.results.filter(x => x[1]).length, all = g.results.length, done = pass === all;
      results.classList.toggle('is-stale', !!g.stale);
      results.append(el('h3', { class: 'label-caps', text: 'Results' }));
      if (g.stale) results.append(el('p', { class: 'results__stale' }, icon('alert'), 'Commands run since grading. Grade again.'));
      const sum = g.summary || (done ? 'Lab complete' + (g.grade ? ' · Grade ' + g.grade : '') : pass + ' of ' + all + ' checks pass');
      results.append(el('p', { class: ['results__sum', done ? 'is-ok' : 'is-bad'] }, icon(done ? 'check-circle' : 'x-circle'), sum));
      if (!g.hideList) {
        results.append(el('ul', { class: 'results__list' }, g.results.map(([t, ok]) => el('li', { class: ['check-row', ok ? 'is-ok' : 'is-bad'] },
          icon(ok ? 'check' : 'x'), el('span', { class: 'sr-only', text: ok ? 'Passes: ' : 'Fails: ' }), el('span', { text: t })))));
      }
      if (done && entry.kind === 'incident' && lab.lesson && !g.hideList) results.append(ui.callout({ title: 'Root cause', body: [trusted(lab.lesson, 'div')] }));
      for (const fn of ws.resultExtras || []) { const x = fn(g); if (x) results.append(x); }
      if (done && ws.next && ws.next() && !g.noNext) {
        const n = ws.next();
        results.append(el('div', {}, ui.button({ label: 'Next lab: ' + n.short, icon: 'arrow-right', kind: 'secondary', href: L4N.router.href('lab', n.slug) })));
      }
    }

    // ---- Commands tab: what the selected device supports in its current mode ----
    let cmdQuery = '', cmdAll = false;
    const cmdSearch = ui.searchInput({ placeholder: 'Search commands or explanations', label: 'Search commands', onInput: v => { cmdQuery = v; renderCmdList(); } });
    const cmdList = el('div', { class: 'cmdlist', role: 'list' });
    const cmdNote = el('p', { class: 'hint' });
    function renderCommands() {
      if (cmdsBody.childNodes.length === 0) {
        cmdsBody.append(cmdNote, el('div', { class: 'hstack' }, cmdSearch, ui.toggle({ label: 'All modes', checked: cmdAll, onChange: v => { cmdAll = v; renderCmdList(); } })), cmdList);
      }
      renderCmdList();
    }
    function renderCmdList() {
      if (tab !== 'commands') return;
      const d = st.net.devs[st.sel], p = sim.prompt(st, st.sel);
      cmdNote.textContent = 'Commands for ' + d.hostname + (cmdAll ? ' in every mode.' : ' in ' + p.modeName + '.') + ' Choose one to put it in the console, then fill in the parts in angle brackets.';
      const q = cmdQuery.trim().toLowerCase();
      const items = sim.commands(st, st.sel, cmdAll).filter(c => !q || (c.pat + ' ' + c.why.replace(/<[^>]+>/g, '')).toLowerCase().includes(q));
      clear(cmdList);
      if (!items.length) { cmdList.append(ui.empty({ icon: 'search', what: 'No commands match.', todo: cmdAll ? 'Try another word.' : 'Try “All modes”.' })); return; }
      for (const c of items.slice(0, 200)) {
        cmdList.append(el('button', { class: 'cmdcard', type: 'button', role: 'listitem', onClick: () => ws.stepTo(st.sel, c.pat) },
          el('code', { text: c.pat }), el('span', { class: 'cmdcard__modes', text: c.modes.join(' · ') }),
          c.why ? trusted(c.why, 'span', { class: 'cmdcard__why' }) : el('span', { class: 'cmdcard__why', text: 'Use ? in the console to explore its arguments.' })));
      }
    }

    build();
    return {
      el: root, rebuild: build, renderResults, results, refreshCommands: renderCmdList,
      // during an exam the Commands tab is not hidden but removed: help is absent from the page
      setHelpTabs(on) { if (on) return; if (tab === 'commands') tabs.select('tasks', true); const b = tabs.tab('commands'); if (b) b.remove(); panelCmds.remove(); },
      focus() { (tab === 'tasks' ? panelTasks : panelCmds).focus(); }
    };
  }

  L4N.tasksView = { create: createTasks };
})(window.L4N = window.L4N || {});
