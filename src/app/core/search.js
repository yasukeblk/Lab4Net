// search.js: the fuzzy match used by the command palette and list filters. No DOM.
(function (L4N) {
  'use strict';
  const SEP = /[\s\-·:./()›,]/;

  // Score one query word against one text. 0 means no match.
  function word(q, t) {
    if (!q) return 1;
    const i = t.indexOf(q);
    if (i >= 0) return 60 + (i === 0 ? 40 : SEP.test(t[i - 1]) ? 25 : 0) + Math.min(q.length * 4, 20) - Math.min(t.length, 80) * 0.05;
    if (q.length < 2) return 0;
    let ti = 0, s = 0, prev = -2, gaps = 0;
    for (const ch of q) {
      const j = t.indexOf(ch, ti);
      if (j < 0) return 0;
      s += j === prev + 1 ? 3 : 1;
      if (j === 0 || SEP.test(t[j - 1])) s += 2;
      if (prev >= 0 && j > prev + 1) gaps++;
      prev = j; ti = j + 1;
    }
    if (gaps > q.length / 2 + 1) return 0;
    return s;
  }

  // Every word of the query must match the title or a keyword. Title matches count more.
  function score(query, title, keywords) {
    const words = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 1;
    const t = String(title || '').toLowerCase(), k = String(keywords || '').toLowerCase();
    let total = 0;
    for (const w of words) {
      const a = word(w, t) * 1.5, b = word(w, k);
      const best = Math.max(a, b);
      if (!best) return 0;
      total += best;
    }
    return total;
  }

  // rank(query, items, item => [title, keywords]) → the matching items, best first (stable).
  function rank(query, items, fields) {
    const out = [];
    items.forEach((it, i) => { const [t, k] = fields(it); const s = score(query, t, k); if (s > 0) out.push([s, i, it]); });
    out.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    return out.map(x => x[2]);
  }

  L4N.search = { score, rank };
})(window.L4N = window.L4N || {});
