// Lessons as files (FIXES-PLAN.md phase 9). One Markdown file per lesson in src/lessons/, named NNN-slug.md; the number
// keeps the order lessons were added in, which saved progress and the frozen slug list rely on. The format is in
// docs/LESSON-WRITING.md. Section bodies, exam notes, mistakes and quiz text are the lesson's HTML, exactly as written:
// this file only moves text between the file and the LESSONS object, it never rewrites it.
//   parse(text, file)  -> { key, lesson }
//   toMd(key, lesson)  -> text (the canonical form; parse(toMd(k, L)) gives back L)
//   load(dir)          -> [{ file, key, lesson }] in file order
//   compile(dir)       -> the JavaScript that fills LESSONS, for the build
'use strict';
const fs = require('fs'), path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'lessons');
const FIELDS = ['terms', 'exam', 'mistakes', 'quiz', 'story'];

function fail(file, line, msg) { throw new Error((file || 'lesson') + (line ? ':' + line : '') + ': ' + msg); }

function parse(text, file) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') fail(file, 1, 'must start with --- and a header');
  const end = lines.indexOf('---', 1);
  if (end < 0) fail(file, 1, 'the header has no closing ---');
  const head = {};
  for (let i = 1; i < end; i++) {
    const m = /^([a-z]+): (.*)$/.exec(lines[i]);
    if (!m) fail(file, i + 1, 'header lines are "name: value"');
    head[m[1]] = m[2];
  }
  for (const k of Object.keys(head)) if (!['title', 'name', 'topic', 'ccna', 'mins'].includes(k)) fail(file, 0, 'unknown header ' + k);
  if (!head.title) fail(file, 0, 'the header needs a title');
  const L = {};
  if (head.topic != null) { if (head.topic !== 'true') fail(file, 0, 'topic is true or left out'); L.topic = true; }
  if (head.ccna != null) L.ccna = head.ccna.split(',').map(s => s.trim()).filter(Boolean);
  if (head.name != null) L.name = head.name;
  if (head.mins != null) { if (!/^\d+$/.test(head.mins)) fail(file, 0, 'mins is a whole number'); L.mins = +head.mins; }
  L.sections = [];
  let field = null, q = null, json = null;
  for (let i = end + 1; i < lines.length; i++) {
    const line = lines[i], at = i + 1;
    if (json !== null) {
      if (line === '```') { try { L.story = JSON.parse(json.join('\n')); } catch (e) { fail(file, at, 'the story is not valid JSON: ' + e.message); } json = null; field = null; }
      else json.push(line);
      continue;
    }
    if (line === '') continue;
    let m;
    if ((m = /^## @([a-z]+)$/.exec(line))) {
      if (!FIELDS.includes(m[1])) fail(file, at, 'unknown field @' + m[1]);
      field = m[1]; q = null;
      if (field !== 'story') L[field] = [];
      continue;
    }
    if ((m = /^## (.+)$/.exec(line))) { field = 'section'; L.sections.push([m[1], null]); continue; }
    if (field === 'section') {
      const s = L.sections[L.sections.length - 1];
      if (s[1] !== null) fail(file, at, 'a section body is one line of HTML');
      s[1] = line; continue;
    }
    if (field === 'terms') {
      if (!(m = /^- (.+?) :: (.+)$/.exec(line))) fail(file, at, 'a term is "- term :: definition"');
      L.terms.push([m[1], m[2]]); continue;
    }
    if (field === 'exam' || field === 'mistakes') {
      if (!(m = /^- (.+)$/.exec(line))) fail(file, at, 'each item is "- text"');
      L[field].push(m[1]); continue;
    }
    if (field === 'quiz') {
      if ((m = /^### (.+)$/.exec(line))) { q = [m[1], [], null, null]; L.quiz.push(q); continue; }
      if (!q) fail(file, at, 'a quiz question starts with ###');
      if ((m = /^- \[x\] (.+)$/.exec(line))) { if (q[2] !== null) fail(file, at, 'only one right answer'); q[2] = q[1].length; q[1].push(m[1]); continue; }
      if ((m = /^- (.+)$/.exec(line))) { q[1].push(m[1]); continue; }
      if ((m = /^> (.+)$/.exec(line))) { q[3] = m[1]; continue; }
      fail(file, at, 'quiz lines are ###, "- option", "- [x] option" or "> why"');
    }
    if (field === 'story') { if (line !== '```json') fail(file, at, 'the story is a ```json block'); json = []; continue; }
    fail(file, at, 'text outside a section or field');
  }
  if (json !== null) fail(file, 0, 'the story block has no closing ```');
  for (const s of L.sections) if (s[1] === null) fail(file, 0, 'section "' + s[0] + '" has no body');
  for (const x of L.quiz || []) if (x[2] === null || x[3] === null) fail(file, 0, 'quiz question "' + x[0].slice(0, 40) + '" needs a [x] answer and a > why');
  return { key: head.title, lesson: L };
}

function toMd(key, L) {
  const out = ['---', 'title: ' + key];
  if (L.name != null) out.push('name: ' + L.name);
  if (L.topic) out.push('topic: true');
  if (L.ccna) out.push('ccna: ' + L.ccna.join(', '));
  if (L.mins != null) out.push('mins: ' + L.mins);
  out.push('---');
  for (const [h, b] of L.sections || []) out.push('', '## ' + h, b);
  if (L.terms) out.push('', '## @terms', ...L.terms.map(([t, d]) => '- ' + t + ' :: ' + d));
  for (const f of ['exam', 'mistakes']) if (L[f]) out.push('', '## @' + f, ...L[f].map(x => '- ' + x));
  if (L.quiz) { out.push('', '## @quiz'); for (const [qq, opts, ok, why] of L.quiz) out.push('', '### ' + qq, ...opts.map((o, i) => '- ' + (i === ok ? '[x] ' : '') + o), '> ' + why); }
  if (L.story) out.push('', '## @story', '```json', JSON.stringify(L.story, null, 1), '```');
  return out.join('\n') + '\n';
}

function load(dir) {
  dir = dir || DIR;
  return fs.readdirSync(dir).filter(f => /^\d{3}-[a-z0-9-]+\.md$/.test(f)).sort()
    .map(f => Object.assign({ file: f }, parse(fs.readFileSync(path.join(dir, f), 'utf8'), path.join('src/lessons', f))));
}

function compile(dir) {
  const all = load(dir), obj = {};
  for (const x of all) { if (Object.prototype.hasOwnProperty.call(obj, x.key)) throw new Error(x.file + ': a second lesson called ' + x.key); obj[x.key] = x.lesson; }
  return 'Object.assign(LESSONS,' + JSON.stringify(obj) + ');\n';
}

module.exports = { DIR, parse, toMd, load, compile };
