// Run with node tests/labs.cjs. No packages or browser required.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const engine = html.split('//ENGINE-START')[1]?.split('//ENGINE-END')[0];
assert.ok(engine, 'Engine markers must exist');
const context = vm.createContext({ console });
vm.runInContext(engine + '\nthis.api = { LABS, execLine };', context);
const { LABS, execLine } = context.api;
let checks = 0;
for (const lab of LABS) {
  const net = lab.build();
  assert.equal(lab.why.length, lab.tasks.length, `${lab.title}: every task needs a why`);
  for (const [name, commands] of Object.entries(lab.solution)) {
    const device = net.devs[name];
    assert.ok(device, `${lab.title}: unknown solution device ${name}`);
    const session = { mode: device.type === 'pc' ? 'pc' : 'user' };
    for (const command of commands) {
      const output = execLine(net, device, session, command);
      assert.ok(!output.some(line => /^% (Invalid|Incomplete|Ambiguous|Unrecognized)/i.test(line)),
        `${lab.title} / ${name}: rejected ${command}: ${output.join('\n')}`);
    }
  }
  for (const [description, check] of lab.checks) {
    assert.ok(check(net), `${lab.title}: ${description}`);
    checks++;
  }
  console.log(`PASS ${lab.title} (${lab.checks.length} checks)`);
}
console.log(`\n${LABS.length} labs, ${checks} checks passed.`);
// The step-by-step instructions must also produce a passing network when followed in order.
let stepCommands = 0;
for (const lab of LABS) {
  assert.equal(lab.steps.length, lab.tasks.length, `${lab.title}: every task needs instructions`);
  const net = lab.build(), sessions = {};
  for (const task of lab.steps) {
    assert.ok(task.length, `${lab.title}: a task has no instructions`);
    for (const group of task) {
      const device = net.devs[group.dev];
      assert.ok(device, `${lab.title}: unknown instruction device ${group.dev}`);
      const session = sessions[group.dev] || (sessions[group.dev] = { mode: device.type === 'pc' ? 'pc' : 'user' });
      for (const command of group.cmds) {
        if (command[0] === '#') continue;
        const output = execLine(net, device, session, command);
        assert.ok(!output.some(line => /^% (Invalid|Incomplete|Ambiguous|Unrecognized)/i.test(line)),
          `${lab.title} / ${group.dev}: instructions rejected ${command}: ${output.join('\n')}`);
        stepCommands++;
      }
    }
  }
  for (const [description, check] of lab.checks) assert.ok(check(net), `${lab.title} (instructions): ${description}`);
}
console.log(`Instructions: ${stepCommands} commands across ${LABS.length} labs reach a passing grade.`);

