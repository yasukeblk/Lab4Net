// data.js: Settings › Data (section 5.11): export a backup, import one (version 2, or version 1 from the old app),
// reset everything. An import says what it will add first, and never reloads by itself.
(function (L4N) {
  'use strict';
  const { el, icon, clear } = L4N.dom;
  const ui = L4N.ui, V = L4N.validate, K = L4N.KEYS;

  const replays = (slug, w) => { const e = L4N.data.lab(slug); if (!e) return false; try { L4N.sim.open(e, w); return true; } catch (x) { return false; } };
  L4N.replays = replays;

  function current() {
    const s = L4N.store.get(), main = { v: 2 };
    for (const k of ['settings', 'labs', 'lessons', 'quiz', 'automation', 'subnet', 'exam', 'ui', 'migrated']) main[k] = s[k];
    const work = {};
    const all = L4N.work.all();
    for (const k of Object.keys(all)) if (!all[k].corrupt) work[k] = { journal: all[k].journal, tasks: all[k].tasks };
    return { main, work, sandbox: L4N.storage.read(K.sandbox) };
  }

  function exportBackup() {
    if (L4N.saveNow) L4N.saveNow();
    L4N.work.flush();
    const c = current();
    const blob = new Blob([JSON.stringify(L4N.migrate.exportBackup(c.main, c.work, c.sandbox), null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = el('a', { href: url, download: 'lab4net-backup.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  function section() {
    const status = el('div', { class: 'data__status', role: 'status' });
    const file = el('input', { type: 'file', accept: 'application/json,.json', hidden: true, id: 'importFile' });
    function say(kind, text, extra) {
      clear(status);
      status.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
      status.append(el('p', { class: 'data__msg ' + kind }, icon(kind === 'bad' ? 'x-circle' : kind === 'ok' ? 'check-circle' : 'info'), el('span', { text })), extra || null);
    }
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      file.value = '';
      if (!f) return;
      try {
        if (f.size > L4N.migrate.MAX_FILE) throw Error('That file is larger than 5 MB.');
        const inc = L4N.migrate.readBackup(await f.text(), { replays });
        const s = L4N.migrate.summary(inc);
        const parts = [s.labs + ' finished lab' + (s.labs === 1 ? '' : 's'), s.lessons + ' lesson' + (s.lessons === 1 ? '' : 's') + ' read', 'saved work for ' + s.work + ' lab' + (s.work === 1 ? '' : 's'), s.quiz + ' quiz answer' + (s.quiz === 1 ? '' : 's')];
        if (s.exams) parts.push(s.exams + ' exam result' + (s.exams === 1 ? '' : 's'));
        if (s.sandbox) parts.push('a sandbox build');
        const ok = await L4N.dialog.confirm({ title: 'Import this backup?', body: [el('p', { text: 'It adds ' + parts.join(', ') + '.' }),
          el('p', { text: 'Finished labs and the better grade are kept. Saved work is replaced only for labs in the file.' })], ok: 'Import' });
        if (!ok) return;
        const merged = L4N.migrate.merge(current(), inc);
        if (!L4N.storage.write(K.pending, merged)) throw Error('This browser would not save the backup.');
        say('ok', 'Backup checked. Reload to use it.', ui.button({ label: 'Reload now', kind: 'primary', onClick: () => location.reload() }));
      } catch (e) { say('bad', 'Import failed: ' + (e && e.message || 'that file could not be read.')); }
    });
    return el('section', { class: 'section', 'aria-labelledby': 'set-data', id: 'data' },
      el('h2', { class: 'section__title', id: 'set-data', text: 'Data' }),
      el('div', { class: 'setrows' },
        el('div', { class: 'setrow' }, el('div', { class: 'setrow__label' }, el('b', { text: 'Export backup' }), el('span', { text: 'Downloads lab4net-backup.json with your finished labs, grades, saved work and answers.' })),
          ui.button({ label: 'Export backup', icon: 'download', onClick: () => { exportBackup(); say('ok', 'Backup exported. Import it on your other device.'); } })),
        el('div', { class: 'setrow' }, el('div', { class: 'setrow__label' }, el('b', { text: 'Import backup' }), el('span', { text: 'A backup from this version or from the old Lab4Net. You see what it adds before anything changes.' })),
          ui.button({ label: 'Import backup', icon: 'upload', id: 'importBtn', onClick: () => file.click() }), file),
        el('div', { class: 'setrow' }, el('div', { class: 'setrow__label' }, el('b', { text: 'Reset everything' }), el('span', { text: 'Deletes every lab, grade, answer and setting in this browser.' })),
          ui.button({ label: 'Reset everything', kind: 'danger', icon: 'trash', onClick: resetAll }))),
      status,
      el('p', { class: 'hint', style: 'margin-top:12px', text: 'Your progress is stored only in this browser.' }));
  }

  async function resetAll() {
    const ok = await L4N.dialog.confirm({ title: 'Reset everything?', body: 'Every finished lab, grade, saved command, answer and setting in this browser is deleted. This cannot be undone. Export a backup first if you might want it back.', ok: 'Reset everything', danger: true });
    if (!ok) return;
    for (const k of [K.main, K.work, K.sandbox, K.pending]) L4N.storage.remove(k);
    L4N.work.reset();
    const fresh = V.main({ ui: { landingSeen: true } });
    fresh.migrated = { from: 'reset', at: Date.now(), labs: 0, lessons: 0, told: true };
    L4N.storage.write(K.main, fresh);
    L4N.store.set(fresh);
    L4N.shell.go('#/');
    L4N.toast({ text: 'Everything was reset.', kind: 'ok' });
  }

  L4N.settingsData = section;
  L4N.backup = { exportBackup, current };
  L4N.commands.add(() => [
    { id: 'data-export', group: 'Data', title: 'Export backup', icon: 'download', run: exportBackup },
    { id: 'data-import', group: 'Data', title: 'Import backup', icon: 'upload', run: () => { L4N.shell.go('#/settings'); setTimeout(() => { const b = document.getElementById('importBtn'); if (b) { b.scrollIntoView({ block: 'center' }); b.focus(); } }, 0); } }
  ]);
})(window.L4N = window.L4N || {});
