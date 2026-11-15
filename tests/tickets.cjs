// TICKETS and SERVICES (src/data/tickets.js) stay in step with the labs: every lab has one ticket from a named person,
// short enough to sit above the first task, with a reply; every lab has services, each linked to real checks; every
// check-linked service is up once the lab's solution is applied, and at least one is down when the lab opens (so the
// strip has something to turn green). Nothing in the data is left over from a lab that no longer exists.
'use strict';
const vm = require('vm'), assert = require('assert');
const { L4N, ctx } = require('./app-core.cjs')();
const T = vm.runInContext('TICKETS', ctx), S = vm.runInContext('SERVICES', ctx);
const labs = L4N.data.labs;
const up = (res, svc) => svc[1].every(j => res[j] && res[j][1]);
let services = 0;
for (const l of labs) {
  const t = T[l.slug];
  assert.ok(Array.isArray(t) && t.length === 5, l.slug + ' has a ticket [from, team, subject, body, reply]');
  t.forEach((x, i) => assert.ok(typeof x === 'string' && x.trim() === x && x.length, l.slug + ' ticket field ' + i + ' is plain text'));
  assert.ok(/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(t[0]), l.slug + ': the ticket is from a named person (' + t[0] + ')');
  assert.ok(t[2].length <= 60, l.slug + ': subject is at most 60 characters');
  assert.ok(t[3].length <= 280, l.slug + ': body is at most 280 characters, so the first task stays in view (' + t[3].length + ')');
  assert.ok(t[4].length <= 90, l.slug + ': reply is at most 90 characters');
  const s = S[l.slug], n = l.lab.checks.length;
  assert.ok(Array.isArray(s) && s.length >= 1 && s.length <= 4, l.slug + ' has 1 to 4 services');
  for (const v of s) {
    services++;
    assert.ok(typeof v[0] === 'string' && v[0].length && v[0].length <= 40, l.slug + ': service name ' + JSON.stringify(v[0]) + ' is 1 to 40 characters');
    assert.ok(Array.isArray(v[1]) && v[1].length, l.slug + ': ' + v[0] + ' is linked to checks');
    for (const j of v[1]) assert.ok(Number.isInteger(j) && j >= 0 && j < n, l.slug + ': ' + v[0] + ': no check ' + j);
  }
  assert.strictEqual(new Set(s.map(v => v[0])).size, s.length, l.slug + ': service names differ');
  // with the solution applied every service is up; when the lab opens, at least one is down
  const st0 = L4N.sim.open(l, null), r0 = L4N.sim.grade(st0);
  assert.ok(s.some(v => !up(r0, v)), l.slug + ': every service is already up when the lab opens');
  const st = L4N.sim.open(l, null);
  for (const [d, cmds] of Object.entries(l.lab.solution)) for (const c of cmds) L4N.sim.exec(st, d, c);
  const r = L4N.sim.grade(st);
  for (const v of s) assert.ok(up(r, v), l.slug + ': ' + v[0] + ' is still down after the solution');
}
for (const k of Object.keys(T)) assert.ok(labs.some(l => l.slug === k), k + ' in TICKETS is a lab');
for (const k of Object.keys(S)) assert.ok(labs.some(l => l.slug === k), k + ' in SERVICES is a lab');
const people = new Set(labs.map(l => T[l.slug][0]));
console.log('PASS tickets: ' + labs.length + ' labs each open as a ticket from one of ' + people.size + ' people, with a reply; ' + services + ' services, all up after the solution.');
