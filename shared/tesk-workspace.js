/* Presentation-only workspace helpers. Business data stays in the teacher page. */
(() => {
  'use strict';
  const paths = {
    home:'M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8',
    users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    check:'m8 11 3 3 6-7M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9M12 6v12',
    bank:'m3 9 9-6 9 6H3M5 10v8M10 10v8M14 10v8M19 10v8M3 21h18',
    room:'m3 10 9-7 9 7M5 10v11h14V10M9 21v-7h6v7',
    compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-6-3-2 5-5 2 2-5 5-2',
    pen:'m16 3 5 5-12 12-6 1 1-6L16 3m-3 3 5 5',
    file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6v6h6M8 13h8M8 17h5',
    chat:'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 0 1-1-5 9 9 0 0 1 18 0M8 10h8M8 14h5',
    heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',
    chart:'M3 3v18h18M7 16v-5M12 16V7M17 16v-8',
    book:'M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1v16',
    spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3M20 2v4M18 4h4',
    settings:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3',
    search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-2 5 6 6',
    menu:'M4 6h16M4 12h16M4 18h16',plus:'M12 5v14M5 12h14',
    logout:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.file}"/></svg>`;
  const paintIcons = root => root.querySelectorAll('[data-icon]').forEach(el => {el.innerHTML=icon(el.dataset.icon);});
  const menus=[];
  let group='';
  document.querySelectorAll('.sidebar-nav > *').forEach(el=>{
    if(el.classList.contains('nav-section-label')) group=el.textContent;
    else if(el.dataset.page) menus.push({id:el.dataset.page,label:el.children[1].textContent,group,icon:el.querySelector('[data-icon]')?.dataset.icon||'file'});
  });
  menus.push({id:'workspace',label:'설정 · 연동',group:'학급 설정',icon:'settings'});
  const keywords={adventure:'퀴즈 문제 출제 범위 보스 사냥 퀘스트',economy:'상점 구매 승인 직업 월급 은행 예금 주식 세금 국세청 거래 자산 경제 리포트',checklist:'출석 생활 습관 체크',myroom:'아바타 펫 꾸미기',workspace:'백업 복원 설정 동기화 위젯 exe 자료 계정',points:'메소 지급 보상 차감', 'ai-assist':'공문 문서 계획서 품의 가정통신문 AI'};
  let dialog, searchInput, searchReturnFocus;
  function toggleSidebar(force){
    const open=typeof force==='boolean'?force:!document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open',open);
    const trigger=document.querySelector('.sidebar-toggle');
    trigger.setAttribute('aria-expanded',String(open));
    if(open) document.querySelector('.sidebar .nav-item.active')?.focus();
  }
  function onNavigate(id){
    const menu=menus.find(m=>m.id===id);
    document.getElementById('topbar-section').textContent=menu?.group||'학급 운영';
    document.querySelectorAll('.nav-item[data-page]').forEach(el=>{
      if(el.dataset.page===id) el.setAttribute('aria-current','page');
      else el.removeAttribute('aria-current');
    });
    toggleSidebar(false);
    document.getElementById('main-content').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'instant'});
    document.querySelector('.content').scrollTop=0;
    wrapTables(document.querySelector('.page.active'));
  }
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  /* rows: [{page,icon,title,desc,count,unit}] — 교사 화면이 처리할 것이 있는 항목만 넘긴다 */
  function renderAttention({rows,unreadWritings=0,pendingCounsels=0,studentCount=0}){
    const box=document.getElementById('home-attention');
    if(!box)return;
    if(!studentCount) rows=[
      {page:'students',icon:'users',title:'우리 반 학생 등록하기',desc:'학생을 추가하고 학급 운영을 시작하세요.',count:null},
      {page:'workspace',icon:'settings',title:'학급 설정 확인하기',desc:'학급 정보와 데이터 연결을 확인하세요.',count:null}
    ];
    else if(!Array.isArray(rows)) rows=[
      {page:'writing',icon:'pen',title:'글쓰기 피드백',desc:'학생들이 남긴 글을 읽고 답해주세요.',count:unreadWritings},
      {page:'counsel',icon:'chat',title:'학생 상담 요청',desc:'새로운 상담 요청을 확인해 주세요.',count:pendingCounsels}
    ].filter(r=>r.count>0);
    const list=rows.length
      ? rows.map(r=>`<button class="attention-row" onclick="goPage('${esc(r.page)}')"><span class="attention-icon">${icon(r.icon)}</span><span class="attention-text"><strong>${esc(r.title)}</strong><small>${esc(r.desc)}</small></span>${r.count===null?'':`<span class="attention-count">${Number(r.count)||0}<small>${esc(r.unit||'건')}</small></span>`}<span class="attention-arrow" aria-hidden="true">↗</span></button>`).join('')
      : `<div class="attention-row attention-clear" role="status"><span class="attention-icon">${icon('check')}</span><span class="attention-text"><strong>지금 먼저 처리할 일이 없어요</strong><small>글쓰기 · 상담 · 승인 · 생기부 초안을 모두 확인했어요.</small></span></div>`;
    box.innerHTML=list+'<p class="attention-note">'+(studentCount?'불러온 학급 데이터 기준 · 처리할 것이 있는 항목만 보여요.':'학생 관리에서 여러 명을 한 번에 추가할 수 있어요.')+'</p>';
  }
  function studentResults(q,results){
    const hits=q&&typeof window.searchStudentsForMenu==='function'?window.searchStudentsForMenu(q):[];
    hits.forEach(s=>{
      const button=document.createElement('button');button.className='menu-search-result';
      const text=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');
      strong.textContent=`${s.num}번 ${s.name}`;small.textContent='학생 · 종합 보고서 열기';text.append(strong,small);
      const ic=document.createElement('span');ic.innerHTML=icon('users');
      const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';
      button.append(ic,text,arrow);
      button.addEventListener('click',()=>{dialog.close();window.openStudentFromSearch(s.num);});results.append(button);
    });
    return hits.length;
  }
  function renderSearch(){
    const q=searchInput.value.trim().toLocaleLowerCase().replace(/\s/g,'');
    const found=menus.filter(m=>(m.label+m.group+(keywords[m.id]||'')).toLocaleLowerCase().replace(/\s/g,'').includes(q));
    const results=dialog.querySelector('.menu-search-results');
    results.replaceChildren();
    const studentCount=studentResults(q,results);
    found.forEach(m=>{
      const button=document.createElement('button');button.className='menu-search-result';
      button.innerHTML=`<span>${icon(m.icon)}</span><span><strong>${m.label}</strong><small>${m.group}</small></span><span aria-hidden="true">↗</span>`;
      button.addEventListener('click',()=>{dialog.close();goPage(m.id);});results.append(button);
    });
    if(!found.length&&!studentCount){const empty=document.createElement('p');empty.className='search-empty';empty.textContent='일치하는 메뉴나 학생이 없어요. 다른 단어로 검색해 보세요.';results.append(empty);}
  }
  function openSearch(){
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='menu-search-dialog';dialog.setAttribute('aria-labelledby','menu-search-title');
      dialog.innerHTML=`<div class="menu-search-heading"><strong id="menu-search-title">어떤 일을 하시나요?</strong><button class="icon-button" aria-label="검색 닫기">×</button></div><label class="menu-search-input-wrap">${icon('search')}<input type="search" aria-label="메뉴·학생 검색" placeholder="메뉴, 기능 또는 학생 이름·번호 검색…" autocomplete="off"></label><div class="menu-search-results" aria-label="검색 결과"></div><div class="menu-search-footer">↑ ↓ 이동 &nbsp; · &nbsp; Enter 열기 &nbsp; · &nbsp; Esc 닫기</div>`;
      document.body.append(dialog);searchInput=dialog.querySelector('input');searchInput.addEventListener('input',renderSearch);
      dialog.querySelector('.icon-button').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
      dialog.addEventListener('close',()=>searchReturnFocus?.focus());
      dialog.addEventListener('keydown',e=>{
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dialog.close();return;}
        const buttons=[...dialog.querySelectorAll('.menu-search-result')], index=buttons.indexOf(document.activeElement);
        if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const next=e.key==='ArrowDown'?index+1:index-1;if(next<0)searchInput.focus();else buttons[Math.min(next,buttons.length-1)]?.focus();}
        if(e.key==='Enter'&&document.activeElement===searchInput){e.preventDefault();buttons[0]?.click();}
      });
    }
    searchReturnFocus=document.activeElement;searchInput.value='';renderSearch();dialog.showModal();searchInput.focus();
  }
  function wrapTables(root){
    root?.querySelectorAll('table.student-table').forEach(table=>{
      if(table.parentElement.classList.contains('table-scroll')||table.parentElement.style.overflowX==='auto')return;
      const wrapper=document.createElement('div');wrapper.className='table-scroll';wrapper.tabIndex=0;wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','표 가로 스크롤');table.before(wrapper);wrapper.append(table);
    });
  }
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}
    if(e.key==='Escape'&&document.body.classList.contains('sidebar-open')){toggleSidebar(false);document.querySelector('.sidebar-toggle').focus();}
    if(e.key==='Tab'&&document.body.classList.contains('sidebar-open')){
      const focusable=[...document.querySelectorAll('.sidebar button,.sidebar a')].filter(el=>el.getClientRects().length&&el.tabIndex>=0);
      const first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  });
  document.querySelectorAll('.home-shortcut-card').forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}}));
  // Give existing link-shaped controls native keyboard behavior without changing their actions.
  document.querySelectorAll('.sidebar a[onclick]').forEach(el=>{el.setAttribute('role','button');el.tabIndex=0;el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}});});
  const mobile=window.matchMedia('(max-width:760px)');
  mobile.addEventListener('change',()=>toggleSidebar(false));
  window.TeskUI={onNavigate,renderAttention,openSearch,toggleSidebar};
  paintIcons(document);wrapTables(document);
  // Dynamic renderers replace tables; decorate newly inserted tables only.
  new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(node=>{if(node.nodeType===1){if(node.matches('table.student-table'))wrapTables(node.parentElement);else if(node.querySelector('table.student-table'))wrapTables(node);}}))).observe(document.querySelector('.content'),{childList:true,subtree:true});
  renderHome();
  document.getElementById('topbar-title').textContent='오늘의 학급';
  document.querySelector('[data-page="home"]').setAttribute('aria-current','page');
})();
