const test=require('node:test'),assert=require('node:assert/strict'),TA=require('../shared/tesk-ai-assist.js');

test('check markers are counted and highlighted without changing text', ()=>{
 const t='가. 일시: [확인 필요: 날짜]\n나. 장소: [확인필요]\n<b>본문</b>';
 assert.equal(TA.checkCount(t),2);
 const html=TA.highlightHtml(t);
 assert.equal((html.match(/<mark class="ai-check">/g)||[]).length,2);
 assert.ok(html.includes('&lt;b&gt;본문&lt;/b&gt;'));
 assert.equal(html.replace(/<\/?mark[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'),t);
});

test('item CSV keeps entered and rounded prices apart and escapes quotes', ()=>{
 const csv=TA.itemsCsv([{name:'27" 모니터',spec:'IPS, 75Hz',unit:'대',qty:2,price:185000,ceiledPrice:190000,sum:380000},{name:'풀',spec:'',unit:'개',qty:3,price:900,ceiledPrice:900,sum:2700}]);
 const lines=csv.replace(/^﻿/,'').split('\r\n');
 assert.equal(lines[0],'"품목명","규격","단위","수량","입력 단가","적용 단가(올림)","금액"');
 assert.equal(lines[1],'"27"" 모니터","IPS, 75Hz","대","2","185000","190000","380000"');
 assert.equal(lines.at(-1),'"합계","","","","","","382700"');
});

test('placeholders are recognised', ()=>{
 assert.ok(TA.isPlaceholder('← 내용 입력 후 [생성하기]를 눌러주세요'));
 assert.ok(TA.isPlaceholder('⏳ AI가 작성 중입니다...'));
 assert.ok(TA.isPlaceholder('  '));
 assert.ok(!TA.isPlaceholder('2026학년도 학생 자치회'));
});
