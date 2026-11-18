/* 학급 자료 완전 삭제 — 교사 설정의 [학급 자료 모두 지우기].
   지우는 것: classrooms/{학급}/data/* 와 그 하위 문서(글·글 수정본·학생별 모험 기록), studentAuth, studentLogins(아이디로 계산),
             peer-support(사회성 평정·학생별 지원 기록), info/meta, classCodes/{코드}(규칙상 허용될 때).
   Firestore 는 하위 문서를 자동으로 지우지 않으므로 아는 경로를 하나씩 지운다.
   plan(...) 은 지울 경로 목록만 만드는 순수 함수(테스트용), run(...) 이 실제로 지운다. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ClassErase=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-18.1';
// data 아래 하위 컬렉션이 있는 문서
const SUBS={'pesk-writings':['items'],'pesk-quiz-progress':['students'],'arca-save':['students'],'arca-log':['students']};
async function run({fs, db, room, classCode, studentNums=[], loginKeys=[], onProgress}){
  const done=[],failed=[];
  const del=async parts=>{try{await fs.deleteDoc(fs.doc(db,...parts));done.push(parts.join('/'));}catch(e){failed.push({path:parts.join('/'),error:String(e&&e.message||e)});}};
  const list=async parts=>{try{const s=await fs.getDocs(fs.collection(db,...parts));return s.docs.map(d=>d.id);}catch(e){failed.push({path:parts.join('/'),error:'목록을 읽지 못함: '+String(e&&e.message||e)});return [];}};
  const step=t=>{try{onProgress&&onProgress(t,done.length);}catch(_e){}};
  // 1) data 문서와 하위 문서
  step('학급 자료 목록을 읽는 중');
  const keys=await list(['classrooms',room,'data']);
  for(const key of Object.keys(SUBS))if(!keys.includes(key))keys.push(key);
  for(const key of keys){
    for(const sub of SUBS[key]||[]){
      const ids=await list(['classrooms',room,'data',key,sub]);
      for(const id of ids){
        if(key==='pesk-writings'){for(const r of await list(['classrooms',room,'data',key,sub,id,'revisions']))await del(['classrooms',room,'data',key,sub,id,'revisions',r]);}
        await del(['classrooms',room,'data',key,sub,id]);
      }
    }
    step('지우는 중: '+key);
    await del(['classrooms',room,'data',key]);
  }
  // 2) 학생 인증
  step('학생 계정 연결을 지우는 중');
  for(const uid of await list(['classrooms',room,'studentAuth']))await del(['classrooms',room,'studentAuth',uid]);
  for(const k of loginKeys)await del(['classrooms',room,'studentLogins',k]);
  // 3) 교사만 보는 지원 기록
  for(const parent of ['social-skills',...studentNums.map(n=>'num-'+n)]){
    for(const id of await list(['classrooms',room,'peer-support',parent,'entries']))await del(['classrooms',room,'peer-support',parent,'entries',id]);
  }
  // 4) 학급 정보와 학급 코드
  await del(['classrooms',room,'info','meta']);
  if(classCode)await del(['classCodes',String(classCode)]);
  step('끝');
  return {done,failed};
}
function receipt({room,className,result,at}){
  return ['Tesk 학급 자료 삭제 기록','학급: '+(className||'')+' ('+room+')','시각: '+at,'지운 문서: '+result.done.length+'개',
    result.failed.length?'지우지 못한 것 '+result.failed.length+'개:\n'+result.failed.map(f=>'- '+f.path+' · '+f.error).join('\n'):'지우지 못한 것: 없음',
    '','학생 로그인 계정(Firebase 인증)은 브라우저에서 지울 수 없어 남지만, 학급 자료가 없어 어느 학급에도 들어갈 수 없습니다.'].join('\n');
}
return {version,run,receipt,SUBS};
});
