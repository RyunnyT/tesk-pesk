// Teacher writing review + anthology flow on the preview page with an in-memory store and fake AI. Fictional data only.
const ROOT=require('path').join(__dirname,'..');
const {chromium}=require('playwright'),path=require('path'),assert=require('assert/strict');
const shot=n=>path.join(ROOT,'output','writing-review',n+'.png');
require('fs').mkdirSync(path.join(ROOT,'output','writing-review'),{recursive:true});
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});const errors=[];
try{
const c=await b.newContext({viewport:{width:1440,height:1000}});const p=await c.newPage();
p.on('pageerror',e=>errors.push(e.message));
await p.route('**/*',r=>{const u=new URL(r.request().url());if(['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(u.hostname))return r.continue();return r.abort();});
await p.goto('http://127.0.0.1:8765/_teacher_ui_preview.html');const f=await p.locator('iframe').elementHandle().then(e=>e.contentFrame());
f.on?.('pageerror',e=>errors.push(e.message));
await f.waitForFunction(()=>window.TeskUI&&window.TeskWritingReview&&peskWritingsAll.length>=5,null,{timeout:15000});await p.waitForTimeout(800);
await f.evaluate(()=>{
  const texts=['오늘 친구랑 공원에 갔다. 너무 재미있엇다. 다음에 또 가고싶다.','우리 반 텃밭에 상추를 심었다. 물을 주니 쑥쑥 자랐다.','체육 시간에 피구를 했다. 공을 피할때 두근두근 했다.','도서관에서 공룡 책을 읽었다. 티라노사우루스가 제일 멋있다.','급식에 카레가 나왔다. 맛있어서 두 그릇 먹었다.'];
  peskWritingsAll=peskWritingsAll.map((w,i)=>({...w,content:texts[i]||w.content,title:['공원 나들이','텃밭','피구','공룡 책','카레'][i]||w.title}));
  window.__writes=[];
  writingStore=()=>({
    update:async(id,change)=>{const cur=peskWritingsAll.find(w=>w.id===id);const next=change({...cur});const saved={...next,id,updatedAt:new Date().toISOString()};window.__writes.push(saved);return saved;},
    remove:async id=>({id,deleted:true}),history:async()=>[]
  });
  callTeachAI=async()=>'{"edits":[{"from":"재미있엇다","to":"재미있었다","type":"맞춤법","reason":"받침 ㅆ"},{"from":"가고싶다","to":"가고 싶다","type":"띄어쓰기","reason":"띄어 써요"},{"from":"친구랑","to":"가족과 함께","reason":"내용 바꾸기(버려져야 함)"}]}';
  goPage('writing');
});
await p.waitForTimeout(400);
await p.screenshot({path:shot('wr-list')});
const listInfo=await f.evaluate(()=>({start:!!document.querySelector('[onclick="TeskWritingReview.start()"]'),settingsOpen:document.querySelector('.wr-settings')?.open,summary:document.querySelector('.wr-submit-summary summary')?.innerText,preview:document.querySelector('.wr-preview')?.innerText,deleteInList:!!document.querySelector('.wr-row [onclick*="deletePeskWriting"]')}));
console.log('LIST',JSON.stringify(listInfo));
assert.equal(listInfo.start,true);assert.equal(listInfo.settingsOpen,false);assert.equal(listInfo.deleteInList,false);
// 첨삭 시작
await f.locator('text=첨삭 시작').click();await p.waitForTimeout(300);
const d1=await f.evaluate(()=>({id:writingDetailId,queue:document.querySelectorAll('.wr-q-item').length,pos:document.querySelector('.wr-q-head span')?.innerText,meta:[...document.querySelectorAll('#writing-content span')].map(s=>s.textContent).find(t=>t.includes('·')&&t.includes('월')),undef:document.getElementById('writing-content').innerText.includes('undefined'),btns:[...document.querySelectorAll('[id^=pesk-feedback-form] button')].map(b=>b.textContent.trim())}));
console.log('DETAIL1',JSON.stringify(d1));
assert.equal(d1.undef,false);
await p.screenshot({path:shot('wr-detail')});
// 문구 칩 클릭 → 보내고 다음(Ctrl+Enter)
await f.locator('.wr-phrases .wr-chip').first().click();
const fb=await f.locator('#pesk-fb-text').inputValue();console.log('after chip:',fb);
await f.locator('#pesk-fb-text').press('Control+Enter');await p.waitForTimeout(500);
const d2=await f.evaluate(()=>({id:writingDetailId,writes:window.__writes.length,firstFb:window.__writes[0]?.feedback,pos:document.querySelector('.wr-q-head span')?.innerText}));
console.log('AFTER SEND',JSON.stringify(d2));
assert.equal(d2.writes,1);assert.notEqual(d2.id,d1.id);
// J 키로 다음 글
await f.locator('body').press('j');await p.waitForTimeout(200);
console.log('after J:',await f.evaluate(()=>writingDetailId));
// 첫 글로 돌아가 모음집 올리기 (학생 확인 모드)
await f.evaluate(()=>openPeskWritingFeedback('demo-w0'));await p.waitForTimeout(200);
await f.locator('[data-anth]').click();await p.waitForTimeout(200);
await p.screenshot({path:shot('wr-anth-modal')});
await f.locator('[data-ai]').click();await p.waitForTimeout(500);
const m1=await f.evaluate(()=>({edits:document.querySelectorAll('.wr-edit').length,note:document.querySelector('.wr-note')?.innerText}));
console.log('AI RESULT',JSON.stringify(m1));assert.equal(m1.edits,2);
await p.screenshot({path:shot('wr-anth-ai')});
await f.locator('.wr-opt:has-text("학생이 확인")').click();await p.waitForTimeout(100);
await f.locator('[data-publish]').click();await p.waitForTimeout(400);
const last=await f.evaluate(()=>({...window.__writes.at(-1),__orig:'오늘 친구랑 공원에 갔다. 너무 재미있엇다. 다음에 또 가고싶다.'}));
console.log('SAVED',JSON.stringify({status:last.anthology.status,edits:last.anthology.edits.length,contentSame:last.content===last.__orig}));
assert.equal(last.anthology.status,'student-review');assert.equal(last.anthology.edits.length,2);
// 다른 글은 선생님 확인으로 바로 게재 → 모음집 화면
await f.evaluate(()=>openPeskWritingFeedback('demo-w1'));await f.locator('[data-anth]').click();
await f.locator('.wr-opt:has-text("원문 그대로")').click();await f.locator('[data-publish]').click();await p.waitForTimeout(300);
await f.evaluate(()=>{writingDetailId=null;TeskWritingReview.openAnthology();});await p.waitForTimeout(300);
console.log('ANTH VIEW',await f.evaluate(()=>document.getElementById('writing-content').innerText.slice(0,200).replace(/\n/g,' / ')));
await p.screenshot({path:shot('wr-anth-view')});
// 모바일 폭
await p.setViewportSize({width:390,height:844});await f.evaluate(()=>openPeskWritingFeedback('demo-w2'));await p.waitForTimeout(300);
const sz=await f.evaluate(()=>({w:innerWidth,s:document.documentElement.scrollWidth}));console.log('mobile overflow',sz);
await p.screenshot({path:shot('wr-mobile')});
assert.ok(sz.s<=sz.w+1);assert.deepEqual(errors,[]);
console.log('PASS teacher writing review: queue, phrases, send-and-next, J key, AI proofread filter, student-review request, anthology view, mobile');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
