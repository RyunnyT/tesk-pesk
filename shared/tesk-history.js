/* Keep app navigation in the browser history, including the prior scroll position. */
(() => {
  const key='teskWorkspaceNavigation';
  let restoring=false;
  const current=()=>document.querySelector('.page.active')?.id.replace('page-','')||'home';
  const valid=id=>typeof id==='string'&&!!document.getElementById('page-'+id);
  const capture=()=>({page:current(),scroll:window.scrollY,contentScroll:document.querySelector('.content').scrollTop});
  const button=document.createElement('button');
  button.type='button';button.className='workspace-back';button.setAttribute('aria-label','이전 화면으로');
  button.innerHTML='<span aria-hidden="true">←</span><span class="back-label">뒤로</span>';
  document.querySelector('.topbar-context').before(button);
  const update=()=>{button.disabled=!(history.state?.[key]?.index>0);button.title=button.disabled?'첫 화면입니다':'이전 화면으로 돌아가기';};
  const replace=value=>history.replaceState({...history.state,[key]:value},'');
  const previous=history.state?.[key];
  replace(previous&&valid(previous.page)?previous:{...capture(),index:0});
  function beforeNavigate(id){
    if(restoring||id===current())return;
    const old=history.state?.[key]||{index:0};
    replace({...old,...capture()});
    history.pushState({...history.state,[key]:{page:id,index:old.index+1,scroll:0,contentScroll:0}},'');
  }
  function restore(state){
    if(!state||!valid(state.page))return;
    restoring=true;
    try{goPage(state.page);}finally{restoring=false;}
    requestAnimationFrame(()=>{window.scrollTo(0,state.scroll||0);document.querySelector('.content').scrollTop=state.contentScroll||0;});
    update();
  }
  window.TeskHistory={beforeNavigate,afterNavigate:update,back:()=>{if(history.state?.[key]?.index>0)history.back();}};
  button.addEventListener('click',window.TeskHistory.back);
  window.addEventListener('popstate',event=>restore(event.state?.[key]));
  if(previous&&valid(previous.page))restore(previous);
  update();
})();
