/* Shared survey schema and observation prompts. No clinical scoring. */
(function(root){
  'use strict';
  const keys=['study','play','support','leader','aspire','discomfort'];
  const scales=[
    {key:'belonging',label:'나는 우리 반의 한 사람으로 받아들여진다고 느껴요.'},
    {key:'voice',label:'친구들과 의견이 달라도 내 생각을 편하게 말할 수 있어요.'},
    {key:'help',label:'어려운 일이 생기면 도움을 요청할 친구나 어른이 있어요.',legacy:true},
    {key:'friendHelp',label:'어려운 일이 생기면 도움을 요청할 친구가 있어요.'},
    {key:'adultHelp',label:'학교에서 어려운 일이 생기면 편하게 찾아갈 어른이 있어요.'},
    {key:'boundaries',label:'내가 싫다고 말하면 친구가 내 뜻을 존중해 줘요.'},
    {key:'repair',label:'친구와 다툰 뒤 서로 이야기하며 풀 수 있어요.'},
    {key:'leftOut',label:'함께하고 싶은데 끼지 못하거나 혼자 남는 일이 있어요.'}
  ];
  const frequency=['전혀 없었어요','가끔 있었어요','자주 있었어요','거의 늘 그랬어요'];
  const solitude=['혼자 있고 싶어서 혼자 있었어요','함께하고 싶었지만 참여하기 어려웠어요','두 가지 경우가 모두 있었어요','혼자 있었던 일이 없어요'];
  const contexts=['쉬는 시간','모둠 활동','점심시간','체육·놀이','온라인 대화','기타'];
  const requests=['지금은 괜찮아요','선생님과 따로 이야기하고 싶어요','친구와 대화할 때 도와주세요','새 친구와 활동할 기회가 필요해요'];
  const texts=[
    {key:'goodMoment',label:'최근 친구와 편안하거나 도움을 주고받았던 순간은 언제였나요?'},
    {key:'hardMoment',label:'어려웠던 일이 있다면 어떤 상황이었고, 얼마나 자주 있었나요? 그때 바랐던 것은 무엇인가요?'},
    {key:'nextStep',label:'앞으로 친구들과 어떻게 지내고 싶나요? 선생님이 무엇을 도와주면 좋을까요?'}
  ];
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function emptyPicks(){return Object.fromEntries(keys.map(k=>[k,[]]));}
  function reflection(raw={}){
    raw=raw&&typeof raw==='object'?raw:{};
    const out={};
    scales.forEach(q=>{out[q.key]=Number.isInteger(raw[q.key])&&raw[q.key]>=1&&raw[q.key]<=4?raw[q.key]:null;});
    out.notApplicable=scales.filter(q=>Array.isArray(raw.notApplicable)&&raw.notApplicable.includes(q.key)).map(q=>q.key);
    out.notApplicable.forEach(key=>{out[key]=null;});
    out.solitude=solitude.includes(raw.solitude)?raw.solitude:'';
    out.contexts=contexts.filter(c=>Array.isArray(raw.contexts)&&raw.contexts.includes(c));
    out.request=requests.includes(raw.request)?raw.request:'';
    texts.forEach(q=>{out[q.key]=typeof raw[q.key]==='string'?raw[q.key].trim().slice(0,500):'';});
    return out;
  }
  function hasReflection(raw){const r=reflection(raw);return scales.some(q=>r[q.key]!=null)||r.notApplicable.length>0||!!r.solitude||r.contexts.length>0||!!r.request||texts.some(q=>r[q.key]);}
  function current(doc={},num,uid){
    const roundId=doc.activeRoundId||'round-1', roundLabel=doc.rounds?.[roundId]?.label||(roundId==='round-1'?'1회차':'현재 회차');
    const data=doc.value||{};
    const own=r=>r&&Number(r.studentNum??num)===Number(num)&&(!r.accountUid||(!!uid&&r.accountUid===uid));
    const explicit=data[roundId+':'+num];
    const legacy=data[String(num)];
    let response=own(explicit)&&(!explicit.roundId||explicit.roundId===roundId)?explicit:null;
    // Unversioned records belong to the original round only, never the newly opened one.
    if(!response&&own(legacy)&&(legacy.roundId===roundId||(!legacy.roundId&&roundId==='round-1')))response=legacy;
    return {roundId,roundLabel,response};
  }
  function form(raw){
    const r=reflection(raw);
    return `<section class="survey-cat-section" oninput="surveyReflection=PeerSurvey.readForm(document)"><h3 style="font-size:15px">내가 느끼는 관계 · 최근 2주</h3><p style="font-size:12px;line-height:1.6">친구 수만으로 알 수 없는 내 경험을 들려주세요. 모든 문항은 선택 사항이고, 답하기 어려우면 건너뛰어도 괜찮아요.</p>${scales.filter(q=>!q.legacy).map(q=>`<label style="display:block;margin:14px 0;font-size:13px">${q.label}<select data-peer-scale="${q.key}" style="display:block;width:100%;padding:10px;margin-top:6px"><option value="">답하지 않을래요 / 잘 모르겠어요</option><option value="na" ${r.notApplicable.includes(q.key)?'selected':''}>그런 상황이 없었어요</option>${frequency.map((v,i)=>`<option value="${i+1}" ${r[q.key]===i+1?'selected':''}>${v}</option>`).join('')}</select></label>`).join('')}<label style="display:block;font-size:13px;margin:14px 0">혼자 있었던 때를 떠올려 주세요<select data-peer-solitude style="display:block;width:100%;padding:10px;margin-top:6px"><option value="">답하지 않을래요 / 잘 모르겠어요</option>${solitude.map(v=>`<option ${r.solitude===v?'selected':''}>${v}</option>`).join('')}</select></label><fieldset style="border:0;padding:0;margin:16px 0"><legend>관계에서 도움이 필요한 상황 (여러 개 선택 가능)</legend>${contexts.map(c=>`<label style="display:inline-block;margin:8px 12px 0 0;font-size:13px"><input type="checkbox" data-peer-context value="${c}" ${r.contexts.includes(c)?'checked':''}> ${c}</label>`).join('')}</fieldset>${texts.map(q=>`<label style="display:block;font-size:13px;margin:14px 0">${q.label}<textarea data-peer-text="${q.key}" maxlength="500" rows="3" style="display:block;box-sizing:border-box;width:100%;padding:10px;margin-top:6px" placeholder="선택 입력 · 500자 이내">${escape(r[q.key])}</textarea></label>`).join('')}<label style="display:block;font-size:13px">원하는 도움<select data-peer-request style="display:block;width:100%;padding:10px;margin-top:6px"><option value="">답하지 않을래요</option>${requests.map(v=>`<option ${r.request===v?'selected':''}>${v}</option>`).join('')}</select></label><p style="font-size:12px;line-height:1.6">지금 바로 도움이 필요하면 설문 답변을 기다리지 말고 선생님께 직접 알려주세요.</p></section>`;
  }
  function readForm(doc){
    const r={contexts:[]};
    r.notApplicable=[];
    doc.querySelectorAll('[data-peer-scale]').forEach(el=>{if(el.value==='na')r.notApplicable.push(el.dataset.peerScale);r[el.dataset.peerScale]=el.value&&el.value!=='na'?Number(el.value):null;});
    doc.querySelectorAll('[data-peer-context]:checked').forEach(el=>r.contexts.push(el.value));
    doc.querySelectorAll('[data-peer-text]').forEach(el=>{r[el.dataset.peerText]=el.value;});
    r.request=doc.querySelector('[data-peer-request]')?.value||'';
    r.solitude=doc.querySelector('[data-peer-solitude]')?.value||'';
    return reflection(r);
  }
  function evidence(raw){
    if(!hasReflection(raw))return '심층 문항 응답 없음 (기존 설문 또는 선택하지 않음)';
    const r=reflection(raw);
    return [...scales.filter(q=>!q.legacy||r[q.key]!=null).map(q=>`${q.label} ${r.notApplicable.includes(q.key)?'그런 상황이 없었어요':r[q.key]==null?'미응답':frequency[r[q.key]-1]}`),`혼자 있었던 이유: ${r.solitude||'미응답'}`,`도움이 필요한 상황: ${r.contexts.join(', ')||'미응답'}`, ...texts.map(q=>`${q.label} ${r[q.key]||'미응답'}`),`원하는 도움: ${r.request||'미응답'}`].join('\n');
  }
  function interpret(raw,stat){
    const r=reflection(raw),lines=[];
    if(!hasReflection(raw))return ['심층 문항 자료가 없어 학생이 느끼는 소속감이나 관계 만족도를 판단할 수 없습니다.'];
    if(r.request&&r.request!==requests[0])lines.push('학생의 도움 요청: '+r.request+'. 먼저 개별적으로 원하는 방식과 시기를 확인하세요.');
    if(r.belonging!=null&&r.belonging<=2)lines.push('받아들여진다고 느끼는 경험이 적다고 답했습니다. 편안했던 시간과 함께하고 싶었던 활동을 따로 물어보세요.');
    if(r.leftOut>=3)lines.push('함께하지 못한 경험이 잦다고 답했습니다. 혼자 있고 싶었던 때와 참여하고 싶었지만 어려웠던 때를 구분해 들어보세요.');
    if(r.help!=null&&r.help<=2)lines.push('도움을 요청할 대상이 충분한지 확인하고, 학생이 편하게 찾을 수 있는 어른을 함께 정하세요.');
    if(r.friendHelp!=null&&r.friendHelp<=2)lines.push('도움을 요청할 친구가 충분한지 확인하세요. “어떤 도움을 누구에게 부탁하면 편할까?”');
    if(r.adultHelp!=null&&r.adultHelp<=2)lines.push('학교에서 편하게 찾아갈 어른과 도움을 요청하는 방법을 학생과 함께 정하세요.');
    if(r.boundaries!=null&&r.boundaries<=2)lines.push('거절 의사가 존중되지 않았던 구체적인 상황을 개별적으로 듣고 반복 여부와 안전을 확인하세요.');
    if(r.solitude===solitude[0])lines.push('혼자 있는 시간을 원했다고 답했습니다. 혼자 있다는 이유만으로 관계 지원이 필요하다고 단정하지 마세요.');
    if(r.solitude===solitude[1]||r.solitude===solitude[2])lines.push('함께하고 싶지만 참여하기 어려웠던 경험을 답했습니다. 원하는 활동과 참여 방식을 먼저 물어보세요.');
    if(r.voice!=null&&r.voice<=2)lines.push('의견을 말하기 어려운 상황을 확인하고, 짝 대화나 순서대로 말하기처럼 부담이 작은 참여 방법을 마련하세요.');
    if(r.repair!=null&&r.repair<=2)lines.push('갈등 뒤 풀어가는 과정에 도움이 필요한지 확인하세요. 바로 화해를 요구하기보다 각자의 이야기를 먼저 들으세요.');
    if(stat?.posIn>0&&(r.belonging<=2&&r.belonging!=null||r.leftOut>=3))lines.push('또래의 긍정 지명과 학생의 체감이 다릅니다. 지명 수가 있다는 이유로 어려움을 지나치지 마세요.');
    if(stat?.submitted&&stat.posIn===0&&r.belonging>=3)lines.push('긍정 지명은 없지만 소속감은 있다고 답했습니다. 다른 반 관계와 응답 범위를 확인하고 고립으로 단정하지 마세요.');
    if(!lines.length)lines.push('현재 답변에서 구체적인 지원 필요성을 단정하기 어렵습니다. 편안했던 관계 경험과 유지하고 싶은 활동을 확인하세요.');
    lines.push('다음 면담: “그때 어떤 일이 있었니?”, “어떻게 달라지면 좋겠니?” → 작은 활동 한 가지를 함께 정하고 2주 뒤 같은 상황을 확인하세요.');
    return lines;
  }
  const api={keys,scales,frequency,solitude,contexts,requests,texts,emptyPicks,reflection,hasReflection,current,form,readForm,evidence,interpret,escape};
  root.PeerSurvey=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
