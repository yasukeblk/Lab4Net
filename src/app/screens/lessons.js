// lessons.js: the Lessons list (5.7) and the lesson reader (5.8). Lesson HTML is repo content checked by
// tests/lessons.cjs and goes in through dom.trusted(); nothing else is ever inserted as HTML.
(function (L4N) {
  'use strict';
  const { el, icon, clear, trusted } = L4N.dom;
  const ui = L4N.ui;
  const objName = id => (typeof CCNA_OBJECTIVES !== 'undefined' && CCNA_OBJECTIVES[id]) || '';
  const objs = l => L4N.stats.lessonObjs(l);
  const rec = slug => L4N.store.get().lessons[slug] || { read: false, quiz: {} };
  const score = l => { const q = rec(l.slug).quiz; return Object.keys(q).filter(k => q[k] === true).length; };
  // the old app's stable shuffle per question, so the right answer is not always in the same place
  const order = (q, n) => { let h = 2166136261; for (const c of q) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; const o = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o; };
  function setLesson(slug, patch) { L4N.store.set(s => { const lessons = Object.assign({}, s.lessons); lessons[slug] = Object.assign({ read: false, quiz: {} }, lessons[slug], patch); return { lessons }; }); }

  // ---------------------------------------------------------------- list
  let group = 'topic', lastSel = null;
  function rowOf(l) {
    const r = rec(l.slug), n = (l.lesson.quiz || []).length, o = objs(l);
    const meta = [el('span', { class: 'num', text: l.mins + ' min' })].concat(o.slice(0, 2).map(x => ui.objChip(x, objName(x))));
    if (Object.keys(r.quiz).length) meta.push(el('span', { class: 'num', text: score(l) + '/' + n }));
    return { key: l.slug, icon: r.read ? 'check-circle' : 'circle', iconClass: r.read ? 'st--done' : 'st--todo', title: l.title, meta, entry: l, aria: l.title + (r.read ? ', read' : ', not read') };
  }
  function groups() {
    if (group === 'type') return [['Lab lessons', L4N.data.lessons.filter(l => !l.topic)], ['Topic lessons', L4N.data.lessons.filter(l => l.topic)]]
      .map(([label, ls]) => ({ label, count: ls.filter(l => rec(l.slug).read).length + '/' + ls.length, rows: ls.map(rowOf) }));
    return L4N.stats.domains().map(d => ({ label: d.id + ' ' + d.name, count: d.lessons.read + '/' + d.lessons.total, rows: d.lessonsIn.map(rowOf) }));
  }
  // The summary in the side panel: whole sentences from the lesson's first paragraph, up to about 300 characters.
  // A sentence ends at . ! or ? followed by a capital letter or the end, so 192.168.3.0 never counts as an end.
  function summary(l) {
    const first = (l.lesson.sections || [])[0];
    if (!first) return null;
    const html = trusted(first[1], 'div', {}), p = html.querySelector('p');
    const text = (p || html).textContent.replace(/\s+/g, ' ').trim();
    const sentences = text.match(/.+?[.!?](?=\s+["“(]?[A-Z]|\s*$)/g) || [text];
    let out = '';
    for (const s of sentences) { const next = (out + ' ' + s.trim()).trim(); if (out && next.length > 300) break; out = next; }
    return el('p', { class: 'detail__brief', text: out });
  }
  function detail(box, l) {
    clear(box);
    const r = rec(l.slug);
    box.append(el('h2', { class: 'detail__title', text: l.title }),
      el('div', { class: 'hstack' }, ui.chip(l.mins + ' min', '', 'clock'), r.read ? ui.chip('Read', 'chip--done', 'check-circle') : ui.chip('Not read yet', 'chip--todo', 'circle')),
      el('ul', { class: 'detail__objs' }, objs(l).map(o => el('li', {}, ui.objChip(o, objName(o)), el('span', { text: objName(o) })))),
      summary(l),
      el('div', { class: 'hstack' }, ui.button({ label: 'Read', kind: 'primary', kbd: 'enter', href: L4N.router.href('lesson', l.slug) }),
        l.lab ? ui.button({ label: 'Open the lab', href: L4N.router.href('lab', l.lab.slug) }) : null));
  }
  function mountList(root, r, ctx) {
    const wide = () => window.innerWidth >= 1280;
    ctx.topbar.setActions(el('a', { href: L4N.site.lessonsUrl, target: '_blank', rel: 'noopener noreferrer', class: 'linkbtn hstack' }, 'These lessons are also on the web', icon('external')),
      ui.select({ label: 'Group by', value: group, options: [{ value: 'topic', label: 'Group: Exam topic' }, { value: 'type', label: 'Group: Type' }], onChange: v => { group = v; list.render(groups()); } }));
    const box = el('aside', { class: 'lst__detail', 'aria-label': 'Lesson details', 'aria-live': 'polite' });
    const list = ui.list({ label: 'Lessons', class: 'lst__list', selected: lastSel, groups: groups(), detail: wide,
      onSelect: row => { lastSel = row.key; if (wide()) detail(box, row.entry); }, onOpen: row => L4N.shell.go(L4N.router.href('lesson', row.key)) });
    ctx.list = list;
    root.append(el('div', { class: 'lst' }, el('div', { class: 'lst__main' }, el('h1', { class: 'sr-only', 'data-heading': '', tabindex: '-1', text: 'Lessons' }), list.el), box));
    const sel = list.selected();
    box.hidden = !wide();
    if (sel && wide()) detail(box, sel.entry);
  }

  // ---------------------------------------------------------------- reader
  let story = null;
  function mountReader(root, r, ctx) {
    const l = L4N.data.lesson(r.slug);
    if (!l) { L4N.toast({ text: 'That link is out of date.', kind: 'warn' }); setTimeout(() => L4N.shell.go('#/lessons'), 0); return; }
    const L = l.lesson, all = L4N.data.lessons, i = all.indexOf(l);
    const readChip = el('span');
    const refresh = () => { clear(readChip).append(rec(l.slug).read ? ui.chip('Read', 'chip--done', 'check-circle') : ui.chip('Not read yet', 'chip--todo', 'circle')); };
    refresh();
    ctx.topbar.setStatus(ui.chip(l.mins + ' min', '', 'clock'), readChip);
    if (l.lab) ctx.topbar.setActions(ui.button({ label: 'Practise in the lab', kind: 'primary', icon: 'labs', href: L4N.router.href('lab', l.lab.slug) }));
    const markRead = () => { if (!rec(l.slug).read) { setLesson(l.slug, { read: true, readAt: Date.now() }); refresh(); markBtn.hidden = true; L4N.toast({ text: 'Lesson marked as read.', kind: 'ok' }); } };
    const markBtn = ui.button({ label: 'Mark as read', icon: 'check', onClick: markRead });
    markBtn.hidden = rec(l.slug).read;
    const toc = el('nav', { class: 'reader__toc', 'aria-label': 'On this page' }, el('h2', { class: 'label-caps', text: 'On this page' }));
    const tocList = el('ul');
    toc.append(tocList);
    const col = el('article', { class: 'reader__col' });
    const add = (id, title, ...kids) => { const h = el('h2', { id, class: 'reader__h', tabindex: '-1', text: title }); col.append(el('section', { class: 'reader__sect', 'aria-labelledby': id }, h, kids)); tocList.append(el('li', {}, el('a', { href: '#' + id, onClick: e => { e.preventDefault(); h.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true }); } }, title))); };
    col.append(el('h1', { class: 'reader__title', 'data-heading': '', tabindex: '-1', text: l.title }), el('div', { class: 'tasks__chips' }, objs(l).map(o => ui.objChip(o, objName(o)))));
    (L.sections || []).forEach(([h, html], k) => add('ls-' + k, h, trusted(html, 'div', { class: 'reader__html' })));
    const endOfSections = el('div', { class: 'reader__sentinel', 'aria-hidden': 'true' });
    col.append(endOfSections);
    // See it happen: the lab's map, stepping through the story
    if (l.lab && Array.isArray(L.story) && L.story.length) {
      const st = L4N.sim.open(l.lab, null); st.sel = null;
      story = { map: L4N.mapCore.create({ st, selectDevice() {} }, { interactive: false, label: 'Network map of ' + l.lab.title, maxScale: 1.3 }), k: -1 };
      const caption = el('div', { class: 'story__text', 'aria-live': 'polite' });
      const counter = el('span', { class: 'num hint' });
      const prev = ui.button({ label: 'Previous', icon: 'chevron-left', onClick: () => go(story.k - 1) });
      const next = ui.button({ label: 'Start', kind: 'primary', icon: 'play', onClick: () => go(story.k >= L.story.length - 1 ? 0 : story.k + 1) });
      const go = k => {
        story.k = Math.max(0, Math.min(L.story.length - 1, k));
        const s = L.story[story.k];
        counter.textContent = (story.k + 1) + ' of ' + L.story.length;
        clear(caption).append(el('b', { text: s.t || '' }), s.x ? trusted(s.x, 'p') : null);
        prev.setAttribute('aria-disabled', String(story.k === 0));
        clear(next).append(el('span', { text: story.k === L.story.length - 1 ? 'From the start' : 'Next' }), icon(story.k === L.story.length - 1 ? 'replay' : 'chevron-right'));
        story.map.step(s);
      };
      prev.setAttribute('aria-disabled', 'true');
      clear(caption).append(el('p', { text: 'Step through it on the network map. Each step shows where the traffic goes and why.' }));
      add('ls-story', 'See it happen', el('div', { class: 'story' }, el('div', { class: 'story__map' }, story.map.body), caption, el('div', { class: 'hstack' }, prev, next, counter)));
      requestAnimationFrame(() => story && story.map.layout());
    }
    if (L.terms && L.terms.length) add('ls-terms', 'Key terms', el('dl', { class: 'terms' }, L.terms.map(([t, d]) => [el('dt', { text: t }), el('dd', { text: d })])));
    if ((L.exam && L.exam.length) || (L.mistakes && L.mistakes.length)) add('ls-notes', 'Exam notes and common mistakes',
      L.exam && L.exam.length ? ui.callout({ title: 'For the exam', body: [el('ul', { class: 'reader__list' }, L.exam.map(x => trusted(x, 'li')))] }) : null,
      L.mistakes && L.mistakes.length ? ui.callout({ kind: 'warn', title: 'Common mistakes', body: [el('ul', { class: 'reader__list' }, L.mistakes.map(x => trusted(x, 'li')))] }) : null);
    // quick check: four options in the data's fixed shuffled order; the answer is saved by question index
    if (L.quiz && L.quiz.length) {
      const qs = el('ol', { class: 'qc' });
      L.quiz.forEach(([q, opts, ok, why], qi) => {
        const res = el('div', { class: 'qc__res', 'aria-live': 'polite' });
        const btns = [];
        const show = (picked, saved) => {
          for (const b of btns) { const j = +b.dataset.a; b.classList.toggle('is-right', j === ok && picked != null); b.classList.toggle('is-wrong', j === picked && j !== ok); b.setAttribute('aria-pressed', String(j === picked)); }
          clear(res);
          const right = picked != null ? picked === ok : saved;
          if (right == null) return;
          res.append(el('p', { class: right ? 'ok' : 'bad' }, icon(right ? 'check-circle' : 'x-circle'), el('b', { text: right ? 'Right. ' : 'Not quite. ' }), picked == null ? 'You answered this before.' : ''), trusted(why, 'p', { class: 'qc__why' }));
        };
        const opt = el('div', { class: 'qc__opts', role: 'group', 'aria-label': 'Answers' });
        order(q, opts.length).forEach((j, k) => {
          const b = el('button', { class: 'qc__opt', type: 'button', 'data-a': String(j), 'aria-pressed': 'false', onClick: () => { setLesson(l.slug, { quiz: Object.assign({}, rec(l.slug).quiz, { [qi]: j === ok }) }); show(j); } },
            el('span', { class: 'qc__key', text: String.fromCharCode(65 + k) }), trusted(opts[j], 'span'));
          btns.push(b); opt.append(b);
        });
        qs.append(el('li', { class: 'qc__q' }, trusted(q, 'p', { class: 'qc__text' }), opt, res));
        const saved = rec(l.slug).quiz[qi];
        if (typeof saved === 'boolean') show(null, saved);
      });
      add('ls-quiz', 'Quick check', qs);
    }
    const prevL = all[i - 1], nextL = all[i + 1];
    col.append(el('div', { class: 'reader__end' }, markBtn),
      el('nav', { class: 'reader__pn', 'aria-label': 'Previous and next lesson' },
        prevL ? el('a', { href: L4N.router.href('lesson', prevL.slug) }, icon('chevron-left'), el('span', {}, el('small', { text: 'Previous' }), prevL.title)) : el('span'),
        nextL ? el('a', { href: L4N.router.href('lesson', nextL.slug), class: 'is-next' }, el('span', {}, el('small', { text: 'Next' }), nextL.title), icon('chevron-right')) : el('span')));
    root.append(el('div', { class: 'reader' }, col, toc));
    // reaching the end of the sections marks the lesson read
    let io = null;
    if (typeof IntersectionObserver !== 'undefined') { io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { markRead(); io.disconnect(); } }, { root: null, threshold: 0 }); setTimeout(() => io && io.observe(endOfSections), 600); }
    return () => { if (io) io.disconnect(); if (story) { story.map.destroy(); story = null; } };
  }

  // N and P move between the lesson's sections
  const inReader = () => L4N.route && L4N.route.screen === 'lesson';
  function moveSection(dir) {
    const hs = [...document.querySelectorAll('#screen .reader__h')];
    if (!hs.length) return;
    let t;
    const cur = hs.indexOf(document.activeElement);
    if (cur >= 0) t = hs[Math.max(0, Math.min(hs.length - 1, cur + dir))];
    else {
      const top = document.getElementById('screen').getBoundingClientRect().top + 24;
      let i = hs.findIndex(h => h.getBoundingClientRect().top > top);
      if (i < 0) i = hs.length;
      t = dir > 0 ? hs[Math.min(hs.length - 1, i)] : hs[Math.max(0, i - 1)];
    }
    t.scrollIntoView({ block: 'start' }); t.focus({ preventScroll: true });
  }
  L4N.keys.add({ keys: 'n', label: 'Next lesson section', group: 'Lesson reader', when: inReader, run: () => moveSection(1) });
  L4N.keys.add({ keys: 'p', label: 'Previous lesson section', group: 'Lesson reader', when: inReader, run: () => moveSection(-1) });

  // the lesson banner in a build lab, the first time it opens
  (L4N.workspaceExtras = L4N.workspaceExtras || []).push(ws => {
    const lesson = ws.entry.kind === 'build' ? L4N.data.lessonFor(ws.entry) : null;
    // No banner once the lesson is read, the lab is done, or the learner has opened or skipped it before.
    const quiet = () => rec(lesson.slug).read || L4N.stats.labStatus(ws.slug) === 'done' || (L4N.store.get().ui.seenLesson || {})[ws.slug];
    if (!lesson || quiet()) return;
    const seen = () => L4N.store.set(s => ({ ui: Object.assign({}, s.ui, { seenLesson: Object.assign({}, s.ui.seenLesson, { [ws.slug]: true }) }) }));
    ws.topExtras = (ws.topExtras || []).concat(() => quiet() ? null :
      el('div', { class: 'banner', role: 'note' }, icon('lessons'), el('span', { text: 'Read the lesson first (' + lesson.mins + ' min)' }),
        ui.button({ label: 'Open lesson', kind: 'secondary', onClick: () => { seen(); L4N.shell.go(L4N.router.href('lesson', lesson.slug)); } }),
        ui.button({ label: 'Skip', kind: 'ghost', onClick: () => { seen(); ws.tasksView.rebuild(); } })));
    ws.tasksView.rebuild();
  });

  L4N.commands.add(() => L4N.data.lessons.map(l => ({ id: 'lesson-' + l.slug, group: 'Lessons', title: 'Open lesson: ' + l.title, subtitle: l.mins + ' min', icon: 'lessons',
    keywords: l.key + ' ' + objs(l).map(o => o + ' ' + objName(o)).join(' '), run: () => L4N.shell.go(L4N.router.href('lesson', l.slug)) })));

  L4N.screens.register('lessons', { title: () => 'Lessons', mount: mountList });
  L4N.screens.register('lesson', {
    nav: 'lessons', title: r => { const l = L4N.data.lesson(r.slug); return l ? l.title : 'Lesson'; },
    crumbs: r => { const l = L4N.data.lesson(r.slug); return [{ label: 'Lessons', href: '#/lessons' }, { label: l ? l.title : 'Lesson' }]; }, mount: mountReader
  });
  L4N.lessonsApi = { setLesson, order };
})(window.L4N = window.L4N || {});
