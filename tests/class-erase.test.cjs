// 학급 자료 완전 삭제 (shared/class-erase.js) — 가짜 저장소로 지우는 경로를 확인한다
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../shared/class-erase.js');
function fakeFs(paths){
  const store=new Set(paths),deleted=[];
  const join=(...p)=>p.slice(1).join('/');
  return {store,deleted,api:{
    doc:(db,...p)=>({path:p.join('/')}),collection:(db,...p)=>({path:p.join('/')}),
    getDocs:async c=>({docs:[...store].filter(x=>x.startsWith(c.path+'/')&&!x.slice(c.path.length+1).includes('/')).map(x=>({id:x.split('/').at(-1)}))}),
    deleteDoc:async r=>{if(r.path.startsWith('classCodes/'))throw new Error('permission-denied');store.delete(r.path);deleted.push(r.path);}
  }};
}
test('학급의 모든 문서와 하위 문서를 지우고, 못 지운 것은 기록한다',async()=>{
  const R='classrooms/r1/';
  const f=fakeFs([R+'data/tesk-students',R+'data/pesk-writings',R+'data/pesk-writings/items/w1',R+'data/pesk-writings/items/w1/revisions/1',
    R+'data/pesk-quiz-progress/students/3',R+'studentAuth/u1',R+'studentLogins/k1',R+'peer-support/num-3/entries/e1',R+'peer-support/social-skills/entries/3',R+'info/meta','classCodes/123456','classrooms/r2/data/tesk-students']);
  const out=await E.run({fs:f.api,db:{},room:'r1',classCode:'123456',studentNums:[3],loginKeys:['k1']});
  assert.deepEqual([...f.store].sort(),['classCodes/123456','classrooms/r2/data/tesk-students'],'다른 학급은 그대로');
  assert.ok(f.deleted.indexOf(R+'data/pesk-writings/items/w1/revisions/1')<f.deleted.indexOf(R+'data/pesk-writings/items/w1'),'하위 문서부터');
  assert.equal(out.failed.length,1);assert.match(out.failed[0].path,/classCodes/);
  assert.match(E.receipt({room:'r1',className:'4학년 2반',result:out,at:'2026-11-17'}),/지우지 못한 것 1개/);
});
