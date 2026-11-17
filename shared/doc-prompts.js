/* 교사 도우미 문서(공문·계획서·품의·가정통신문) 프롬프트. 화면 값을 읽지 않고 인자로만 받습니다.
   (tesk_teacher_v2.html 에서 옮김) */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DocPrompts=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const version='2026-11-17.1';

/* ctx = {school, className, teacher, date} */
function contract(kind, ctx){
  return `당신은 대한민국 초·중등학교 교무실과 행정실에서 바로 결재·배포 가능한 문서를 작성하는 베테랑 교사 행정 전문가입니다.

[공통 품질 계약]
1. 사용자가 준 메모를 학교 문서 문장으로 다듬습니다. 사실·숫자·날짜를 임의로 과장하지 않습니다.
2. 다음 항목은 사용자가 주지 않았다면 절대 지어내지 않고 [확인 필요: 항목명]으로 남깁니다: 법령·지침·계획 이름과 조항, 문서번호, 날짜와 시간, 장소, 인원, 금액, 연락처, 담당자 이름, 기관 이름.
   다음 항목은 일반적인 내용으로 보강할 수 있습니다: 목적, 기대 효과, 일반적인 안전·유의 사항, 협조 요청 문장.
   요일은 직접 계산하지 않습니다. 아래 [날짜와 요일] 목록에 있는 날짜만 요일을 붙여 씁니다.
3. 행정 문서는 항목 계층을 1. → 가. → 1) → 가) 순서로 쓰고, 들여쓰기는 2칸 단위로 맞춥니다.
4. 문장은 군더더기 없이 구체적으로 씁니다. 목적·대상·일시·장소·방법·협조사항·안전/유의사항 항목이 필요한 문서에는 항목을 만들되, 2번에서 지어내지 말라고 한 값은 [확인 필요]로 둡니다.
5. 마크다운(#, *, \`, ---), 코드블록, 설명문, 사과문, 작성 과정은 출력하지 않습니다.
6. 출력은 ${kind} 본문만 그대로 제공합니다.

[현재 작성 맥락]
- 학교: ${ctx.school}
- 학급: ${ctx.className}
- 교사: ${ctx.teacher}
- 작성일: ${ctx.date}${ctx.dates && ctx.dates.length ? '\n\n[날짜와 요일 — 계산된 값, 그대로 쓸 것]\n'+ctx.dates.map(d=>'- '+d.raw+' → '+d.label).join('\n') : ''}`;
}

/* 입력 글에서 날짜를 찾아 요일을 붙인다. 연도가 없으면 오늘(ctx.today) 이후 가장 가까운 그 날짜의 해로 본다.
   → [{raw:'12월 4일', iso:'2026-12-04', label:'2026. 12. 4.(금)'}] */
const WEEK=['일','월','화','수','목','금','토'];
function dates(text, today){
  const t0 = today ? new Date(today+'T00:00:00') : new Date();
  const base = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
  const out = [], seen = new Set(), src = String(text||'');
  const push = (raw, y, m, d) => {
    if(!(m>=1&&m<=12&&d>=1&&d<=31)) return;
    if(!y){ y = base.getFullYear(); if(new Date(y, m-1, d) < base) y++; }
    const dt = new Date(y, m-1, d);
    if(dt.getMonth()!==m-1) return;   // 2월 30일 같은 날짜
    const iso = y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    if(seen.has(iso)) return; seen.add(iso);
    out.push({raw, iso, label: y+'. '+m+'. '+d+'.('+WEEK[dt.getDay()]+')'});
  };
  let m;
  const full = /(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?\.?/g;
  while((m = full.exec(src))) push(m[0].trim(), +m[1], +m[2], +m[3]);
  const short = /(?<![\d.])(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;
  while((m = short.exec(src))) push(m[0], null, +m[1], +m[2]);
  return out.slice(0, 20);
}
function withDates(ctx, ...texts){ return {...ctx, dates: dates(texts.join('\n'), ctx.today)}; }

function wrap(kind, body, ctx){
  return `${contract(kind, ctx)}

${body}`.trim();
}

function _formatAiList(label, arr){
  return arr && arr.length ? `[${label}]\n` + arr.map((v,i)=>`${i+1}. ${v}`).join('\n') : '';
}

function _moneyText(n){
  if(!n) return '세부 산출내역 참조';
  return `금${n.toLocaleString()}원(금${_numToKorean(n)}원)`;
}

function _numToKorean(n){
  if(n===0) return '영';
  const units = ['','만','억','조'];
  const nums = ['','일','이','삼','사','오','육','칠','팔','구'];
  const places = ['','십','백','천'];
  let result = '';
  let unitIdx = 0;
  let num = n;
  while(num > 0){
    const chunk = num % 10000;
    if(chunk > 0){
      let chunkStr = '';
      let cn = chunk;
      let pi = 0;
      while(cn > 0){
        const d = cn % 10;
        if(d > 0){
          chunkStr = nums[d] + places[pi] + chunkStr;
        }
        cn = Math.floor(cn/10);
        pi++;
      }
      result = chunkStr + units[unitIdx] + result;
    }
    num = Math.floor(num/10000);
    unitIdx++;
  }
  return result.replace(/일십/g,'십').replace(/일백/g,'백').replace(/일천/g,'천');
}

/* input = {title, content, detail, rels:[], atts:[]} */
function gongmun(input, ctx){
  const {title, content, detail} = input, rels = input.rels || [], atts = input.atts || [];
  ctx = withDates(ctx, title, content, detail);
  return wrap('공문서(기안문)', `
[문서 유형]
학교 내부결재 또는 발송용 공문서 본문

[작성 규칙]
- 첫 줄은 제목만 씁니다.
- 관련 문서가 있으면 "1. 관련:"으로 시작하고, 문서가 여러 개이면 줄을 나누어 정리합니다.
- 관련 문서가 없으면 "1. 관련:" 항목을 생략하고 본문 번호를 자연스럽게 시작합니다.
- 본문은 "~을/를 다음과 같이 실시하고자 합니다.", "~을/를 아래와 같이 제출합니다.", "~을/를 다음과 같이 안내합니다." 중 문맥에 맞게 씁니다.
- 세부 항목은 가./나./다.로 정리하고, 필요한 경우 대상·기간·장소·방법·제출자료·협조사항을 보강합니다.
- 붙임 1개는 "붙임  파일명 1부.  끝.", 2개 이상은 붙임 목록을 줄맞춤하여 작성합니다.
- 붙임이 없으면 마지막에 "끝."만 씁니다.
- 날짜는 "2026. 4. 9.(목)" 형식으로 쓰고, 요일은 [날짜와 요일] 목록의 값만 씁니다.

[좋은 출력 예시]
2026학년도 학생 자치회 임원 선거 실시

1. 관련: ○○교육청 ○○과-0000(2026. 3. 5.)

2. 2026학년도 학생 자치회 임원 선거를 다음과 같이 실시하고자 합니다.

  가. 일시: 2026. 4. 10.(금) 13:30 ~ 14:30
  나. 장소: 본교 다목적실
  다. 대상: 4 ~ 6학년 학생
  라. 추진 내용
    1) 후보자 정견 발표
    2) 투표 및 개표
    3) 선거 결과 안내
  마. 협조 사항: 각 학급 담임교사는 학생 인솔 및 투표 질서 유지 협조

붙임  선거 운영 계획 1부.  끝.

[작성할 정보]
[제목]
${title}

${_formatAiList('관련 문서', rels)}

[요청 내용]
${content}

${detail ? '[세부 사항]\n'+detail : ''}

${_formatAiList('붙임 목록', atts)}
`, ctx);
}

/* input = {title, content} */
function plan(input, ctx){
  const {title, content} = input;
  ctx = withDates(ctx, title, content);
  return wrap('학교 운영 계획서', `
[문서 유형]
학교 행사·교육활동·프로젝트 운영 계획서

[작성 규칙]
- 제목 다음에 바로 본문을 씁니다.
- 문체는 계획서답게 한다체 또는 명사형 개조식으로 씁니다.
- 사용자가 적은 메모가 짧아도 목적, 방침, 세부 추진, 안전·행정 사항의 문장은 보강합니다. 일정·예산·인원·장소처럼 사실이 필요한 값은 주어지지 않았다면 [확인 필요]로 둡니다.
- "추진 근거"는 사용자가 관련 계획·지침을 주지 않았다면 "추진 근거: [확인 필요: 관련 계획·지침]"만 쓰고, 필요성 문장은 써도 됩니다.
- 표가 필요한 내용은 텍스트 표처럼 "구분 / 내용 / 비고" 형식으로 정리합니다.
- 예산 정보가 없으면 예산 항목은 "비예산" 또는 "추후 확정" 중 문맥에 맞게 처리합니다.
- 마지막은 "끝."으로 마무리합니다.

[권장 구조]
1. 추진 근거 및 필요성
2. 목적
3. 운영 개요
  가. 기간
  나. 대상
  다. 장소
  라. 운영 방법
4. 세부 추진 계획
5. 추진 일정
6. 소요 예산
7. 기대 효과
8. 행정 및 안전 사항

[작성할 정보]
[제목]
${title}

[사용자 메모]
${content || '제목에 맞는 학교 운영 계획서 초안을 작성'}
`, ctx);
}

/* input = {title, type, related, budget, purpose, extra, items:[{name,spec,unit,qty,price,ceiledPrice,sum}]} */
function pumi(input, ctx){
  const {title, type, related, budget, purpose, extra} = input, items = input.items || [];
  const total = items.reduce((s,i)=>s+i.sum,0);
  // 상세 산출내역
  const itemDetail = items.map((i,idx)=>{
    const ceilNote = (i.price !== i.ceiledPrice) ? ` [${i.price.toLocaleString()}원→${i.ceiledPrice.toLocaleString()}원 올림]` : '';
    return `${idx+1}) ${i.name}${i.spec?'('+i.spec+')':''}: ${i.ceiledPrice.toLocaleString()}원 × ${i.qty}${i.unit} = ${i.sum.toLocaleString()}원${ceilNote}`;
  }).join('\n');

  const itemSummary = items.length > 1
    ? `${items[0].name} 외 ${items.length-1}종`
    : (items[0]?.name || '품목');

  const endLine = type==='물품' ? '붙임  지출(지급)품의서 1부.  끝.'
                : type==='수당' ? '붙임  산출내역서 1부.  끝.'
                : type==='식비' ? '붙임  식비지급명세서 1부.  끝.'
                : '붙임  관련 서류 1부.  끝.';
  ctx = withDates(ctx, title, purpose, extra, related);
  return wrap('학교 회계 품의서', `
[문서 유형]
학교 내부결재용 지출 품의서

[작성 규칙]
- 첫 줄은 품의 제목만 씁니다.
- 제목 아래는 빈 줄 2개를 둡니다.
- "1. 관련:"은 관련 계획서가 있으면 구체적으로 쓰고, 없으면 문맥상 적절한 운영 계획 또는 학급/학교 교육활동 계획으로 자연스럽게 작성합니다.
- "2. ..." 본문은 유형에 맞게 "구입하고자 합니다.", "지급하고자 합니다.", "실시하고자 합니다."로 씁니다.
- 산출내역은 표가 아니라 텍스트 한 줄 또는 목록으로 씁니다.
- 소요예산은 가능한 경우 ${_moneyText(total)} 형식으로 쓰고, 합계가 없으면 추가정보를 근거로 자연스럽게 산출합니다.
- 단가 10,000원 이상 품목은 이미 10,000원 단위 올림이 적용된 값을 사용합니다.
- 마지막 줄은 반드시 "${endLine}"입니다.

[기본 형식]
${title}


1. 관련: ${related || '관련 교육활동 운영 계획'}

2. ${title.replace(/\s*\([^)]*\)$/,'')}을/를 아래와 같이 ${type==='수당'?'지급':type==='식비'?'지급':'구입'}하고자 합니다.

  가. 내역: ${itemSummary}
${items.map(i=>`    - ${i.name}${i.spec?'('+i.spec+')':''}: ${i.ceiledPrice.toLocaleString()}원 × ${i.qty}${i.unit} = ${i.sum.toLocaleString()}원`).join('\n') || '    - 추가정보를 근거로 내역 작성'}
  나. 용도: ${purpose}
  다. 소요예산: ${_moneyText(total)}
  라. 예산과목: ${budget || '학교회계 해당 예산과목'}
  마. 산출내역: 품의명세서 참조

${endLine}

[입력 데이터]
제목: ${title}
유형: ${type}
관련 계획서: ${related || '없음'}
예산 과목: ${budget || '없음'}
용도: ${purpose}
품목 상세:
${itemDetail || '구조화된 품목 없음. 추가정보에서 산출내역을 추론하세요.'}
합계: ${total ? total.toLocaleString()+'원' : '추가정보 기준'}
추가정보:
${extra || '없음'}
`, ctx);
}

/* input = {school, title, content} */
function letter(input, ctx){
  const {title, content} = input, schoolName = input.school || ctx.school;
  ctx = withDates(ctx, title, content);
  return wrap('가정통신문', `
[문서 유형]
학부모 배포용 가정통신문

[작성 규칙]
- 정중하고 따뜻한 담임교사 어조로 씁니다.
- 학부모가 바로 이해할 수 있도록 핵심 정보를 먼저 구조화합니다.
- 학생 안전, 준비물, 비용, 문의, 우천·변경 시 처리 등 필요한 항목을 문맥에 맞게 두되, 비용·문의 연락처·일시·장소처럼 사실이 필요한 값은 주어지지 않았다면 [확인 필요]로 둡니다.
- 과도한 미사여구는 줄이고, 배포 가능한 완성 문장으로 씁니다.
- 날짜는 작성일 또는 사용자가 준 발송일을 사용합니다.

[권장 형식]
${schoolName}
━━━━━━━━━━━━━━━━━━━━
      ${title}
━━━━━━━━━━━━━━━━━━━━

안녕하십니까. 학부모님의 가정에 늘 건강과 평안이 함께하시기를 바랍니다.

(안내 취지와 교육적 의미)

○ 일시:
○ 장소:
○ 대상:
○ 준비물:
○ 비용:
○ 유의사항:
○ 문의:

(마무리 인사)

${ctx.date}

${schoolName} 담임교사 올림

[작성할 정보]
[학교]
${schoolName}

[제목]
${title}

[내용]
${content}
`, ctx);
}

return {version,dates,WEEK,contract,wrap,gongmun,plan,pumi,letter,moneyText:_moneyText,numToKorean:_numToKorean,formatList:_formatAiList};
});
