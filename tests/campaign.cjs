// The campaign: eight stages that cover every lab group exactly once, with bosses that exist.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.split('//ENGINE-START')[1].split('//ENGINE-END')[0];
const i=html.indexOf('const CAMPAIGN=[');assert.ok(i>0,'CAMPAIGN must exist');
const j=html.indexOf('\n];',i);
const context=vm.createContext({assert,console});
vm.runInContext(engine+html.slice(i,j+3)+`
const groups=[...new Set(LABS.map(l=>l.group))];
assert.equal(CAMPAIGN.length,8);
assert.equal(new Set(CAMPAIGN.map(c=>c.id)).size,8,'ids unique');
assert.deepEqual(CAMPAIGN.map(c=>c.group).sort(),groups.sort(),'every lab group is one stage');
for(const c of CAMPAIGN){
  assert.ok(c.title&&c.story.length>80&&c.outro.length>80,c.id+': story and outro');
  const ms=LABS.filter(l=>l.group===c.group);assert.ok(ms.length>=2,c.id+': missions');
  if(c.need)assert.ok(c.need<=ms.length,c.id+': need within reach');
  if(c.boss){assert.ok(['sabotage','incident','boss'].includes(c.boss.mode),c.id+': boss mode');
    if(c.boss.mode==='incident')assert.ok(LABS.some(l=>l.title===c.boss.title&&l.kind==='incident'),c.id+': boss incident exists');
    else assert.ok(c.boss.minutes>=10,c.id+': boss clock');
    if(c.boss.mode==='sabotage'){const pool=ms.map(l=>l.title);let found=false;for(const b of ms){if(b.kind!=='build'||b.capstone)continue;if(examFault(b,'campaign-test-'+c.id+'|'+b.title,1)){found=true;break;}}assert.ok(found,c.id+': at least one mission can be sabotaged');}}
}
`,context);
console.log('PASS campaign: 8 stages, every lab group once, stories, reachable mission counts, boss incidents exist, sabotage bosses have a lab to break.');
