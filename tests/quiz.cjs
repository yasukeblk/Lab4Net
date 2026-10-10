// The theory question bank: every question has four distinct options, a valid answer index, an explanation,
// a known domain, and no duplicate question text. The bank lives in the interface, so it is read out of the page text.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const i=html.indexOf('const QUIZ=[');assert.ok(i>0,'QUIZ must exist');
const j=html.indexOf('\n];',i);
const QUIZ=vm.runInNewContext(html.slice(i+'const QUIZ='.length,j+2));
const DOMAINS=new Set(['Network fundamentals','Switching','Routing','IP services','Security','Wireless','Automation','IPv6']);
const seen=new Set();
QUIZ.forEach((q,k)=>{
  assert.equal(q.length,5,'question '+k+': five fields');
  const [dom,text,opts,ans,why]=q;
  assert.ok(DOMAINS.has(dom),'question '+k+': unknown domain '+dom);
  assert.ok(typeof text==='string'&&text.length>=12,'question '+k+': question text');
  assert.ok(Array.isArray(opts)&&opts.length===4&&new Set(opts).size===4&&opts.every(o=>typeof o==='string'&&o.length),'question '+k+': four distinct options');
  assert.ok(Number.isInteger(ans)&&ans>=0&&ans<4,'question '+k+': answer index');
  assert.ok(typeof why==='string'&&why.length>=40,'question '+k+': explanation');
  const key=text.toLowerCase().replace(/\W+/g,' ').trim();assert.ok(!seen.has(key),'question '+k+': duplicate question');seen.add(key);
});
assert.ok(QUIZ.length>=100,'the bank should hold at least 100 questions, has '+QUIZ.length);
// REVIEW-FIXES polish (quiz): the near-duplicate pairs now test different things, and #75 explains the hang
{const pairs=[[13,29],[4,90],[17,98],[7,69],[8,70],[16,97],[11,104],[3,99],[18,101]],ans=q=>q[2][q[3]];
  for(const [a,b] of pairs)assert.notEqual(ans(QUIZ[a]),ans(QUIZ[b]),'questions '+a+' and '+b+' still test the same answer: '+QUIZ[a][1]+' / '+QUIZ[b][1]);
  assert.match(QUIZ[75][4],/ip domain-lookup is on by default, so with no reachable name server/);}
// REVIEW-FIXES 27: the PortFast protection question asks for one feature, BPDU guard, and never offers BPDU filter as protection.
{const q=QUIZ.find(x=>/PortFast access port/.test(x[1]));assert.ok(q,'the PortFast question exists');
  assert.equal(q[2][q[3]],'BPDU guard');assert.ok(!q[2].some(o=>/BPDU guard and BPDU filter/.test(o)));assert.match(q[4],/BPDU filter does the opposite/);}
// REVIEW-FIXES 7: the FastEthernet OSPF cost is 1 (100 Mbps / 100 Mbps), not 10, and the explanation says so.
{const q=QUIZ.find(x=>/default OSPF cost of a FastEthernet interface/.test(x[1]));assert.ok(q,'the FastEthernet cost question exists');
  assert.equal(q[2][q[3]],'1','FastEthernet OSPF cost answer');assert.ok(q[4].includes('100/100 = 1.'),q[4]);assert.ok(!q[4].includes('100/100 = 10'),q[4]);}
const byDom={};for(const q of QUIZ)byDom[q[0]]=(byDom[q[0]]||0)+1;
for(const d of DOMAINS)assert.ok((byDom[d]||0)>=4,d+' needs at least four questions');
// answers are not all in the same slot (the display rotates them, but a lopsided bank is still a tell)
const slots=[0,0,0,0];for(const q of QUIZ)slots[q[3]]++;assert.ok(slots.every(n=>n>=QUIZ.length*0.12),'answer slots too lopsided: '+slots.join('/'));
console.log('PASS quiz: '+QUIZ.length+' theory questions, '+Object.entries(byDom).map(([d,n])=>d+' '+n).join(', ')+'; structure, domains, uniqueness and answer spread checked.');
