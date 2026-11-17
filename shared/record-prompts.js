/* 생활기록부 초안·누가 기록 종합·영역 다듬기 프롬프트. 화면 값을 읽지 않고 인자로만 받습니다.
   (tesk_teacher_v2.html 에서 옮김) */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RecordPrompts=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';

// 영역별 한도 줄 — 영역 목록에서 만들어 한도·개수가 한 곳에서만 정해지게 합니다.
function limitLines(fields){
  return fields.map(f=>`- ${f.key} (${f.label}): ${f.limitChars}자 / ${f.limitBytes}byte`).join('\n');
}

/* ctx = {gradeText, bandLabel, fields, contextText} */
function draft(ctx){
  const contextText = ctx.contextText;
  const fieldList = ctx.fields.map(f => `  "${f.key}": "...(${f.label}, 한도 ${f.limitChars}자/${f.limitBytes}byte)..."`).join(',\n');

  return `당신은 한국 초등학교 ${ctx.gradeText} 담임교사이자 NEIS 학교생활기록부 작성 전문가입니다. 교사가 제공한 관찰 자료와 학교의 작성 기준을 바탕으로 검토용 초안을 만듭니다.

[엄수 규칙]
1. 출력은 **JSON 객체 하나만**. 설명·머리말·꼬리말·코드블록(\`\`\`) 절대 금지.
2. 각 영역의 글자/바이트 한도를 초과하지 마세요. 한글 1자=3byte, 영문/숫자/공백=1byte, 줄바꿈=2byte.
3. 종결은 **"~함", "~음", "~보임"** 등 명사형으로 통일. 서술형("~합니다", "~다") 금지.
4. **학생 본인을 호칭하지 마세요** ("○○ 학생", "지원이는" 같은 표현 금지). 주어 없이 동사 위주로 기술.
5. 금기 표현 금지: "엄마/아빠"(→어머님/아버님), "착함/활발함/열심" 같은 추상 평가(→구체 행동·맥락으로). 부정적 평가·낙인 금지.
6. 마크다운 기호(#, *, \`, ---) 일절 사용 금지. 줄바꿈은 의미 단위에서만 최소.
7. **데이터에 없는 활동을 사실처럼 날조하지 마세요.** 관찰·평가·글쓰기 근거가 없는 영역은 반드시 빈 문자열로 반환. 예시 문장을 해당 학생의 실제 활동으로 복사하지 말 것.
8. 같은 어구·접속어 반복 자제. 영역마다 결이 다르게.
9. 자율·자치+동아리는 **통합** 서술 (초등은 분리하지 않음). 진로활동은 별도.

[영역별 한도 — ${ctx.bandLabel} 영역 ${ctx.fields.length}개]
${limitLines(ctx.fields)}

[문장 짜임 — 예시 문장을 베끼지 말고 이 짜임만 쓴다]
한 문장은 「〈장면·활동〉에서 〈학생이 실제로 한 행동〉을 하여(하며) 〈드러난 변화나 결과〉함.」의 짜임으로 쓴다.
〈 〉 안은 반드시 아래 [학생 정보]에 있는 내용으로 채운다. 자료에 없는 장면·역할·활동 이름(동아리 이름, 직책, 대회 등)을 쓰지 않는다.
평가 낱말만으로 된 문장(예: 책임감이 강함. 성실함. 의사소통 능력이 뛰어남.)은 쓰지 않는다. 그런 평가는 행동 문장 뒤에 짧게 붙일 때만 쓴다.
${ctx.usedEndings && ctx.usedEndings.length ? '\n[이 반 다른 학생 기록에서 이미 여러 번 쓴 맺음말 — 되도록 피할 것]\n'+ctx.usedEndings.map(e=>'- '+e).join('\n')+'\n' : ''}
[학생 정보 — 이 데이터를 최대한 자연스럽게 반영]
${contextText}

[출력 — 정확히 이 JSON 형식 그대로]
{
${fieldList}
}

JSON만 출력하세요. 설명 절대 금지.`;
}

/* ctx = {gradeText, bandLabel, fields, byArea, contextText} */
function fromNotes(ctx){
  const byArea = ctx.byArea || {}, contextText = ctx.contextText;
  // 영역별 누가 기록 텍스트 블록
  const noteBlocks = ctx.fields.map(f => {
    const notesArr = byArea[f.key] || [];
    if(notesArr.length === 0) return null;
    return `▶ ${f.label}\n${notesArr.map(t=>'  - '+t).join('\n')}`;
  }).filter(Boolean).join('\n\n');

  const allFieldsKey = ctx.fields.map(f => `  "${f.key}": "...(${f.label}, 한도 ${f.limitChars}자/${f.limitBytes}byte)..."`).join(',\n');

  return `당신은 한국 초등학교 ${ctx.gradeText} 담임교사이자 NEIS 학교생활기록부 작성 전문가입니다.
교사가 학기 중에 작성한 **누가 기록(일상 관찰 메모)**을 영역별로 종합하여 정식 NEIS 문장으로 변환합니다.

[엄수 규칙]
1. 출력은 JSON 객체 하나만. 설명·머리말·꼬리말·코드블록(\`\`\`) 절대 금지.
2. 각 영역의 글자/바이트 한도 준수. 한글=3byte, 영문/숫자/공백=1byte, 줄바꿈=2byte.
3. 종결은 "~함/~음/~보임" 명사형. 서술형("~합니다") 금지.
4. 학생 본인 호칭 금지. 주어 없이 동사 위주.
5. 금기 표현 금지: 엄마/아빠 → 어머님/아버님. "착함/활발함" 같은 추상 평가 → 구체 행동·맥락으로.
6. **누가 기록의 사실을 그대로 반영**하되 NEIS 어법으로 다듬기. 사실 날조 금지.
7. 같은 영역의 여러 메모는 자연스럽게 통합. 단순 나열 금지.
8. 누가 기록이 없는 영역은 빈 문자열("")로 두기. (학생 컨텍스트로 무리하게 채우지 말 것)
9. 마크다운 기호(#, *, \`, ---) 금지.

[영역별 한도 — ${ctx.bandLabel} 영역 ${ctx.fields.length}개]
${limitLines(ctx.fields)}

[누가 기록 — 영역별로 묶음]
${noteBlocks || '(누가 기록 없음)'}

[학생 보조 컨텍스트 — 참고만, 사실 날조 금지]
${contextText}

[출력 — 정확히 이 JSON 형식 그대로]
{
${allFieldsKey}
}

JSON만 출력. 누가 기록이 비어있는 영역은 ""로 두세요.`;
}

/* ctx = {gradeText, field:{label,limitChars,limitBytes}, current, instruction, context} — current·instruction·context 는 이름을 가린 글 */
function refine(ctx){
  return `당신은 한국 초등학교 ${ctx.gradeText} NEIS 생활기록부 작성 전문가입니다.
사용자가 특정 영역의 문장을 다듬어 달라고 요청합니다.

[엄수 규칙]
1. 사용자의 다듬기 지시만 정확히 반영. 다른 의미 변경 금지.
2. 종결은 "~함/~음/~보임" 명사형. 서술형("~합니다") 금지.
3. 학생 본인 호칭 금지. 주어 없이 동사 위주.
4. 금기 표현(엄마/아빠, 착함/활발함 같은 추상어) 금지.
5. 한도 ${ctx.field.limitChars}자 / ${ctx.field.limitBytes}byte 이내. 한글=3byte, 영문/숫자/공백=1byte, 줄바꿈=2byte.
6. 마크다운 기호·코드블록·설명 금지. **다듬어진 본문 텍스트만 출력**.

[영역]: ${ctx.field.label}
[현재 문장]
${ctx.current}

[다듬기 지시]
${ctx.instruction}

[학생 컨텍스트(참고만)]
${ctx.context}

[다듬어진 문장만 출력]`;
}

return {version,limitLines,draft,fromNotes,refine};
});
