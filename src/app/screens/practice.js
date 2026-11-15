// practice.js: the Practice hub, the Quiz and the Subnetting drill (section 5.9). Quiz text is repo content.
(function (L4N) {
  'use strict';
  const { el, icon, clear, trusted } = L4N.dom;
  const ui = L4N.ui;
  const S = () => L4N.store.get();

  // ---------------------------------------------------------------- hub
  // Each card: what it is, the last result, and buttons to start (and, for the quiz, to review what was missed).
  // Below the cards, the last five exams.
  function hub(root) {
    const ex = S().exam.history, last = ex[ex.length - 1], q = L4N.stats.quiz(), sn = S().subnet;
    const review = q.total - q.correct;
    const card = (title, line, stat, ic, actions) => el('section', { class: 'card pcard', 'aria-label': title }, el('div', { class: 'hstack' }, icon(ic), el('h2', { class: 'section__title', text: title })),
      el('p', { class: 'muted', text: line }), el('p', { class: 'num', text: stat }), el('div', { class: 'hstack pcard__actions' }, actions));
    const lastExam = last ? 'Last: ' + (last.grade ? 'grade ' + last.grade + ', ' : '') + last.passed + ' of ' + last.total + ' checks · ' + new Date(last.at).toLocaleDateString() : 'No exams yet';
    root.append(el('div', { class: 'page' }, el('h1', { class: 'page__title', 'data-heading': '', tabindex: '-1', text: 'Practice' }),
      el('div', { class: 'pcards' },
        card('Exam', 'Timed fault-finding with no help.', lastExam + ' · ' + ex.filter(h => h.cleared).length + ' passed', 'clock',
          [ui.button({ label: 'Start', kind: 'primary', href: '#/practice/exam', aria: 'Start an exam' })]),
        card('Quiz', q.total + ' theory questions.', q.correct + ' of ' + q.total + ' correct · ' + review + ' to review', 'list-checks',
          [ui.button({ label: 'Start', kind: 'primary', aria: 'Start the quiz', onClick: () => { qMissed = false; qPos = 0; L4N.shell.go('#/practice/quiz'); } }),
            review ? ui.button({ label: 'Review ' + review, kind: 'secondary', aria: 'Review ' + review + ' missed or unanswered questions', onClick: () => { qMissed = true; qPos = 0; L4N.shell.go('#/practice/quiz'); } }) : null]),
        card('Subnetting', 'Find the network, broadcast and host range.', sn.total ? sn.right + ' of ' + sn.total + ' fields right on the first try' : 'Not tried yet', 'practice',
          [ui.button({ label: 'Start', kind: 'primary', href: '#/practice/subnetting', aria: 'Start the subnetting drill' })])),
      el('section', { class: 'section', 'aria-labelledby': 'pr-last' }, el('h2', { class: 'section__title', id: 'pr-last', text: 'Last five exams' }), L4N.examHistory(ex.slice(-5)))));
  }

  // ---------------------------------------------------------------- quiz
  let qTopic = 'all', qMissed = false, qPos = 0, qPick = null, qChecked = false;
  const DOMAINS = () => [...new Set(QUIZ.map(q => q[0]))];
  const answers = () => S().quiz.answers;
  function set() { return QUIZ.map((q, i) => i).filter(i => (qTopic === 'all' || QUIZ[i][0] === qTopic) && (!qMissed || answers()[i] !== true)); }
  function quiz(root, r, ctx) {
    const box = el('div', { class: 'quiz' }), side = el('aside', { class: 'quiz__side', 'aria-label': 'Score by topic' });
    const topic = ui.select({ label: 'Topic', value: qTopic, options: [{ value: 'all', label: 'All topics' }].concat(DOMAINS().map(d => ({ value: d, label: d }))), onChange: v => { qTopic = v; qPos = 0; draw(); } });
    const missed = ui.toggle({ label: 'Only missed or unanswered', checked: qMissed, onChange: v => { qMissed = v; qPos = 0; draw(); } });
    ctx.topbar.setActions(topic, missed);
    root.append(el('div', { class: 'page page--wide quiz__page' }, el('h1', { class: 'page__title', 'data-heading': '', tabindex: '-1', text: 'Quiz' }), el('div', { class: 'quiz__grid' }, box, side)));
    function draw() {
      const ids = set(); clear(box);
      qPos = Math.min(qPos, Math.max(0, ids.length - 1));
      if (!ids.length) { box.append(ui.empty({ icon: 'check-circle', what: qMissed ? 'Nothing missed here.' : 'No questions.', todo: 'Choose another topic or turn off the filter.' })); drawSide(); return; }
      const i = ids[qPos], [dom, text, opts, ok, why] = QUIZ[i];
      // the old order: options rotated by the question's index
      const order = [0, 1, 2, 3].map((_, k) => (k + i % 4) % 4);
      const btns = order.map((j, k) => el('button', { class: 'qc__opt', type: 'button', 'data-a': String(j), 'aria-pressed': String(qPick === j), onClick: () => { if (!qChecked) { qPick = j; draw(); } } },
        el('span', { class: 'qc__key', text: String(k + 1) }), trusted(opts[j], 'span')));
      if (qChecked) for (const b of btns) { const j = +b.dataset.a; b.classList.toggle('is-right', j === ok); b.classList.toggle('is-wrong', j === qPick && j !== ok); }
      // where you are in the set, in words (a bar here read like a score)
      box.append(el('p', { class: 'quiz__count num muted', text: 'Question ' + (qPos + 1) + ' of ' + ids.length }),
        el('p', { class: 'label-caps', text: dom + (answers()[i] === true ? ' · answered right before' : answers()[i] === false ? ' · missed before' : '') }),
        trusted(text, 'p', { class: 'quiz__q', id: 'quiz-q' }), el('div', { class: 'qc__opts', role: 'group', 'aria-labelledby': 'quiz-q' }, btns));
      const res = el('div', { class: 'qc__res', 'aria-live': 'polite' });
      if (qChecked) res.append(el('p', { class: qPick === ok ? 'ok' : 'bad' }, icon(qPick === ok ? 'check-circle' : 'x-circle'), el('b', { text: qPick === ok ? 'Right.' : 'Not quite.' })), trusted(why, 'p', { class: 'qc__why' }));
      // reviewing: how many missed or unanswered questions are left (a right answer drops out of the set)
      if (qChecked && qMissed) res.append(el('p', { class: 'quiz__left muted num', text: set().length + ' left to review' }));
      box.append(res, el('div', { class: 'hstack' }, qChecked ? ui.button({ label: 'Next', kind: 'primary', kbd: 'enter', onClick: next }) : ui.button({ label: 'Check', kind: 'primary', kbd: 'enter', disabled: qPick == null, onClick: check })));
      drawSide();
    }
    function check() {
      if (qPick == null) return;
      const ids = set(), i = ids[qPos];
      qChecked = true;
      L4N.store.set(s => ({ quiz: { rev: 2, answers: Object.assign({}, s.quiz.answers, { [i]: qPick === QUIZ[i][3] }) } }));
      draw();
    }
    function next() { qPick = null; qChecked = false; const n = set().length; qPos = qMissed ? Math.min(qPos, n - 1) : (qPos + 1) % Math.max(1, n); if (qMissed && answers()[set()[qPos]] === true) qPos = 0; draw(); }
    function drawSide() {
      clear(side).append(el('h2', { class: 'label-caps', text: 'Score by topic' }));
      for (const d of DOMAINS()) { const ids = QUIZ.map((q, i) => i).filter(i => QUIZ[i][0] === d); side.append(el('div', { class: 'stat__row' }, el('span', { text: d }), ui.bar(ids.filter(i => answers()[i] === true).length, ids.length, d))); }
    }
    ctx.quizKeys = e => { if (/^[1-4]$/.test(e.key) && !qChecked) { const b = box.querySelectorAll('.qc__opt')[+e.key - 1]; if (b) b.click(); return true; } if (e.key === 'Enter') { qChecked ? next() : check(); return true; } return false; };
    draw();
  }
  const inQuiz = () => L4N.route && L4N.route.screen === 'quiz';
  L4N.keys.add({ keys: '1', label: 'Pick an answer (1 to 4)', group: 'Quiz', when: inQuiz, run: e => L4N.ctx.quizKeys(e) || false });
  for (const k of ['2', '3', '4']) L4N.keys.add({ keys: k, label: '', hidden: true, when: inQuiz, run: e => L4N.ctx.quizKeys(e) || false });
  L4N.keys.add({ keys: 'enter', label: 'Check, then next', group: 'Quiz and subnetting', when: () => inQuiz() && !(document.activeElement && document.activeElement.tagName === 'BUTTON'), run: e => L4N.ctx.quizKeys(e) || false });

  // ---------------------------------------------------------------- subnetting
  let range = 'all', q = null, done = null;
  const FIELDS = ['Network address', 'Broadcast address', 'First host', 'Last host', 'Subnet mask', 'Usable hosts'];
  function subnet(root, r, ctx) {
    const box = el('div', { class: 'stack' });
    ctx.topbar.setActions(ui.select({ label: 'Range', value: range, options: [{ value: 'all', label: 'Mixed /8 to /30' }, { value: 'warm', label: 'Warm-up /24 to /26' }, { value: 'small', label: 'Small networks /27 to /30' }], onChange: v => { range = v; fresh(); } }));
    const score = el('p', { class: 'muted num' });
    root.append(el('div', { class: 'page' }, el('h1', { class: 'page__title', 'data-heading': '', tabindex: '-1', text: 'Subnetting' }), score, box));
    function fresh() { q = L4N.sim.subnet.make(range); done = null; draw(); }
    function draw() {
      const sn = S().subnet; score.textContent = sn.right + ' of ' + sn.total + ' fields right on the first try';
      clear(box);
      const ans = L4N.sim.subnet.answers(q);
      const inputs = FIELDS.map((f, k) => ui.input({ label: f, value: done ? done[k].v : '', maxlength: 20 }));
      inputs.forEach((inp, k) => { inp.setAttribute('inputmode', 'decimal'); if (done) { inp.readOnly = true; inp.setAttribute('aria-invalid', String(!done[k].ok)); } });
      box.append(el('p', { class: 'subnet__q num', text: L4N.sim.subnet.text(q) }),
        el('div', { class: 'subnet__grid' }, FIELDS.map((f, k) => el('label', { class: 'field' }, el('span', { class: 'field__label', text: f }), inputs[k],
          done ? el('span', { class: 'field__res ' + (done[k].ok ? 'ok' : 'bad') }, icon(done[k].ok ? 'check' : 'x'), done[k].ok ? 'Right' : 'Answer: ' + ans[k]) : null))));
      if (done) box.append(ui.callout({ title: 'How to work it out', body: [el('p', { text: L4N.sim.subnet.why(q) })] }));
      box.append(el('div', { class: 'hstack' }, done ? ui.button({ label: 'Next', kind: 'primary', kbd: 'enter', onClick: fresh }) : ui.button({ label: 'Check', kind: 'primary', kbd: 'enter', onClick: () => {
        const first = !done;
        done = inputs.map((inp, k) => ({ v: inp.value.trim(), ok: inp.value.trim() === ans[k] }));
        // only the first check of each question counts
        if (first) L4N.store.set(s => ({ subnet: { right: s.subnet.right + done.filter(x => x.ok).length, total: s.subnet.total + FIELDS.length } }));
        draw();
      } })));
      if (!done) inputs[0].focus({ preventScroll: true });
    }
    box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); box.querySelector('.btn--primary').click(); } });
    if (!q) q = L4N.sim.subnet.make(range);
    draw();
  }

  L4N.commands.add(() => [{ id: 'pr-quiz', group: 'Practice', title: 'Start quiz', icon: 'list-checks', run: () => L4N.shell.go('#/practice/quiz') },
    { id: 'pr-subnet', group: 'Practice', title: 'Subnetting drill', icon: 'practice', run: () => L4N.shell.go('#/practice/subnetting') }]);
  L4N.screens.register('practice', { title: () => 'Practice', mount: hub });
  L4N.screens.register('quiz', { nav: 'practice', title: () => 'Quiz', crumbs: () => [{ label: 'Practice', href: '#/practice' }, { label: 'Quiz' }], mount: quiz });
  L4N.screens.register('subnet', { nav: 'practice', title: () => 'Subnetting', crumbs: () => [{ label: 'Practice', href: '#/practice' }, { label: 'Subnetting' }], mount: subnet });
})(window.L4N = window.L4N || {});
