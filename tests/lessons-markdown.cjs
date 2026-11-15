// Self-test for tests/lessons.cjs: a lesson draft with Markdown in it must fail, naming the field and the reason.
// The draft is the DNS lesson as it was first pasted (with two Markdown links), plus Markdown bold and a backtick.
// A clean copy of the same lesson must pass, so the failures come from the Markdown and nothing else.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os'), assert = require('assert');
const { spawnSync } = require('child_process');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext('const LESSONS={};' + html.slice(html.indexOf('//LESSONS-DATA-START'), html.indexOf('//LESSONS-DATA-END')) + ';globalThis.L=LESSONS;', ctx);
const dns = JSON.parse(JSON.stringify(ctx.L['DNS: names to addresses']));
assert.ok(dns, 'the DNS lesson exists');

const KEY = 'DNS draft for the Markdown self-test';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l4n-lessons-'));
const check = lesson => {
  const file = path.join(dir, 'draft.js');
  fs.writeFileSync(file, 'Object.assign(LESSONS,' + JSON.stringify({ [KEY]: lesson }) + ');\n');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'lessons.cjs'), file], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
};

try {
  const clean = check(dns);
  assert.strictEqual(clean.code, 0, 'a clean copy of the DNS lesson passes:\n' + clean.out);

  const link = '[www.example.com](https://www.example.com)';
  const bad = JSON.parse(JSON.stringify(dns));
  const s0 = bad.sections.findIndex(([, b]) => b.includes('such as www.example.com'));
  const s6 = bad.sections.findIndex(([, b]) => b.includes('nslookup www.example.com'));
  assert.ok(s0 >= 0 && s6 >= 0, 'the DNS lesson still has both www.example.com sentences');
  bad.sections[s0][1] = bad.sections[s0][1].replace('such as www.example.com', 'such as ' + link);
  bad.sections[s6][1] = bad.sections[s6][1].replace('nslookup www.example.com', 'nslookup ' + link);
  bad.exam[1] = bad.exam[1].replace('port 53', '**port 53**');
  bad.terms[0][1] = bad.terms[0][1].replace('IP addresses', '`IP addresses`');

  const r = check(bad);
  assert.strictEqual(r.code, 1, 'the Markdown draft fails');
  const want = [
    `ERROR ${KEY}: section ${s0} has a Markdown link [text](url); use plain text`,
    `ERROR ${KEY}: section ${s6} has a Markdown link [text](url); use plain text`,
    `ERROR ${KEY}: exam 1 has Markdown bold **; use <b>`,
    `ERROR ${KEY}: term ${bad.terms[0][0]} has a backtick; use <code>`
  ];
  for (const line of want) assert.ok(r.out.includes(line), 'the checker says: ' + line + '\n--- it printed:\n' + r.out);
  assert.ok(r.out.includes('4 lesson errors'), 'exactly four errors, one per Markdown mistake:\n' + r.out);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log('PASS lessons-markdown: Markdown links, bold and backticks in a lesson draft fail with the field and the reason; a clean draft passes.');
