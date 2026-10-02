/* HWPX is a ZIP container. Only body paragraphs are editable; styles/media stay intact.
   Format reference: https://tech.hancom.com/hwpxformat/ */
(() => {
  'use strict';
  const HP='http://www.hancom.co.kr/hwpml/2011/paragraph';
  const LIMIT=80*1024*1024;
  const elements=(root,name)=>[...root.getElementsByTagNameNS(HP,name)];
  const ancestor=(node,name)=>{for(let p=node.parentElement;p;p=p.parentElement)if(p.namespaceURI===HP&&p.localName===name)return p;return null;};
  const own=(p,name)=>elements(p,name).filter(n=>ancestor(n,'p')===p);
  function parse(xml){
    if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('외부 엔티티가 포함된 XML은 지원하지 않습니다.');
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.getElementsByTagName('parsererror').length)throw new Error('HWPX 내부 XML이 손상되어 읽을 수 없어요.');
    return doc;
  }
  function textOf(node){
    if(node.nodeType===3||node.nodeType===4)return node.nodeValue;
    if(node.localName==='lineBreak')return '\n';
    if(node.localName==='tab')return '\t';
    return [...node.childNodes].map(textOf).join('');
  }
  const paragraphText=p=>own(p,'t').map(textOf).join('');
  const labelPattern=/^(?:[○●·\d.()\s]*)(?:성명|이름|학교|학년|반|번호|제목|행사명|일시|날짜|기간|장소|대상|목적|내용|비고|주소|연락처|준비물|문의|담당자|금액|예산|사유|신청인|소속|직위|부서|작성자|참가자|활동명|추진계획|세부내용)\s*[:：]?$/;
  const placeholderPattern=/\{\{[^}]+\}\}|\[[^\]]*(?:작성|입력|내용|제목|일시|장소|대상)[^\]]*\]|_{3,}|＿{3,}|○{2,}|□{2,}|\b(?:OOO|XXX)\b|\(\s{2,}\)/;
  async function open(input){
    if(!window.JSZip)throw new Error('HWPX 읽기 모듈을 불러오지 못했어요. 연결을 확인하고 다시 시도하세요.');
    if((input.size||input.byteLength||0)>30*1024*1024)throw new Error('양식 파일은 30MB 이하로 올려주세요.');
    const zip=await JSZip.loadAsync(input instanceof Blob?await input.arrayBuffer():input);
    const all=Object.values(zip.files);
    if(all.length>5000||all.reduce((sum,f)=>sum+(f._data?.uncompressedSize||0),0)>LIMIT)throw new Error('압축을 푼 문서 크기가 너무 큽니다. 이미지 수를 줄여주세요.');
    if(!zip.file('mimetype')||(await zip.file('mimetype').async('string')).trim()!=='application/hwp+zip')throw new Error('올바른 HWPX 파일이 아니에요. 한글에서 HWPX로 다시 저장해주세요.');
    if(!zip.file('Contents/header.xml'))throw new Error('글꼴·서식 정보가 없는 HWPX 파일입니다.');
    const manifest=zip.file('META-INF/manifest.xml');
    if(manifest&&/encryption-data|EncryptedData/i.test(await manifest.async('string')))throw new Error('암호화된 HWPX는 먼저 한글에서 암호를 해제해주세요.');
    let paths=Object.keys(zip.files).filter(p=>/^Contents\/section\d+\.xml$/i.test(p)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    // Respect the package spine when present, rather than relying on filename order.
    if(zip.file('Contents/content.hpf')){
      const hpf=parse(await zip.file('Contents/content.hpf').async('string'));
      const items=new Map([...hpf.getElementsByTagNameNS('*','item')].map(n=>[n.getAttribute('id'),n.getAttribute('href')]));
      const spine=[...hpf.getElementsByTagNameNS('*','itemref')].map(n=>items.get(n.getAttribute('idref'))).filter(Boolean).map(p=>p.startsWith('Contents/')?p:'Contents/'+p.replace(/^\.\//,''));
      if(spine.length)paths=[...new Set([...spine.filter(p=>paths.includes(p)),...paths])];
    }
    if(!paths.length)throw new Error('HWPX 본문 구역을 찾지 못했어요.');
    const sections=[],fields=[];
    let length=0;
    for(const path of paths){
      const xml=await zip.file(path).async('string');length+=xml.length;
      if(length>LIMIT)throw new Error('본문이 너무 커서 처리할 수 없어요. 양식을 나눠주세요.');
      const doc=parse(xml), paragraphs=elements(doc,'p'),tables=elements(doc,'tbl');
      const section={path,xml,doc,paragraphs};sections.push(section);
      paragraphs.forEach((p,paragraphIndex)=>{
        const nodes=own(p,'t'),runs=own(p,'run');
        // Structural container paragraphs around a table/image must never be replaced.
        if(!nodes.length&&(elements(p,'p').length||own(p,'tbl').length||own(p,'pic').length))return;
        if(own(p,'fieldBegin').length||own(p,'fieldEnd').length)return;
        const text=paragraphText(p),cell=ancestor(p,'tc'),table=cell?ancestor(cell,'tbl'):null;
        let location=`${sections.length}구역 · 문단 ${paragraphIndex+1}`,label='';
        if(cell&&table){
          const addr=elements(cell,'cellAddr')[0],row=Number(addr?.getAttribute('rowAddr')||0),col=Number(addr?.getAttribute('colAddr')||0);
          location=`${sections.length}구역 · 표 ${tables.indexOf(table)+1} · ${row+1}행 ${col+1}열`;
          const cells=elements(table,'tc').filter(c=>ancestor(c,'tbl')===table);
          const before=cells.filter(c=>{const a=elements(c,'cellAddr')[0];return Number(a?.getAttribute('rowAddr'))===row&&Number(a?.getAttribute('colAddr'))<col;}).sort((a,b)=>Number(elements(b,'cellAddr')[0]?.getAttribute('colAddr'))-Number(elements(a,'cellAddr')[0]?.getAttribute('colAddr')))[0];
          if(before)label=elements(before,'p').map(paragraphText).join(' ').trim().slice(0,70);
        }
        const isLabel=labelPattern.test(text.trim());
        const candidate=!text.trim()||placeholderPattern.test(text)||/[:：]\s*$/.test(text)||!!label;
        fields.push({id:`s${sections.length-1}p${paragraphIndex}`,path,paragraphIndex,text,label:label||(text.trim().slice(0,65)||'빈 문단'),location,candidate:candidate&&!isLabel,locked:isLabel,hasMixedStyle:new Set(runs.map(r=>r.getAttribute('charPrIDRef'))).size>1});
      });
    }
    if(!fields.length)throw new Error('채울 수 있는 텍스트나 빈 문단이 없습니다. 이미지로 된 양식은 지원하지 않습니다.');
    const text=fields.map(f=>f.text).join('\n');
    return {zip,sections,fields,text};
  }
  function setText(t,text){
    t.replaceChildren();
    const prefix=t.prefix?t.prefix+':':'';
    String(text).replace(/\r\n?/g,'\n').split('\n').forEach((line,i)=>{
      if(i)t.appendChild(t.ownerDocument.createElementNS(HP,prefix+'lineBreak'));
      const parts=line.split('\t');
      parts.forEach((part,j)=>{if(j)t.appendChild(t.ownerDocument.createElementNS(HP,prefix+'tab'));t.appendChild(t.ownerDocument.createTextNode(part));});
    });
  }
  function replaceParagraph(p,value){
    const texts=own(p,'t');
    if(!texts.length){
      let run=own(p,'run')[0];
      const prefix=p.prefix?p.prefix+':':'';
      if(!run){run=p.ownerDocument.createElementNS(HP,prefix+'run');run.setAttribute('charPrIDRef','0');p.insertBefore(run,p.firstChild);}
      const t=p.ownerDocument.createElementNS(HP,prefix+'t');run.appendChild(t);setText(t,value);
    }else{
      const old=texts.map(textOf).join('');
      // Preserve unchanged text runs (e.g. a bold label before a normal placeholder).
      let first=0,last=0;
      while(first<old.length&&first<value.length&&old[first]===value[first])first++;
      while(last<old.length-first&&last<value.length-first&&old[old.length-last-1]===value[value.length-last-1])last++;
      const end=old.length-last,insert=value.slice(first,value.length-last);
      let offset=0,inserted=false;
      texts.forEach((t,i)=>{
        const text=textOf(t),start=offset;offset+=text.length;
        const overlap=offset>first&&start<end;
        const insertion=first===end&&!inserted&&first>=start&&(first<offset||i===texts.length-1);
        if(overlap||insertion){
          const left=text.slice(0,Math.max(0,first-start)),right=text.slice(Math.max(0,end-start));
          setText(t,left+(inserted?'':insert)+right);inserted=true;
        }
      });
      if(!inserted)setText(texts.at(-1),textOf(texts.at(-1))+insert);
    }
    // These are layout caches; the Hancom editor recalculates them on opening.
    own(p,'linesegarray').forEach(n=>n.remove());
  }
  function validatePatches(model,patches){
    if(!Array.isArray(patches))throw new Error('AI 결과에 항목 목록이 없습니다.');
    const fields=new Map(model.fields.map(f=>[f.id,f])),seen=new Set();
    return patches.map(p=>{
      if(!p||typeof p.id!=='string'||!fields.has(p.id)||seen.has(p.id))throw new Error('양식에 없는 항목 또는 중복 항목이 반환됐어요. 다시 분석해주세요.');
      if(typeof p.value!=='string'||p.value.length>12000||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(p.value))throw new Error('항목 값이 잘못되었거나 너무 길어요.');
      if(fields.get(p.id).locked&&p.value!==fields.get(p.id).text)throw new Error('양식의 항목 제목을 변경하려는 결과가 있어 적용하지 않았어요.');
      seen.add(p.id);return {id:p.id,value:p.value.replace(/\r\n?/g,'\n')};
    });
  }
  async function build(model,patches,type='blob'){
    const checked=validatePatches(model,patches),patchMap=new Map(checked.map(p=>[p.id,p.value]));
    const zip=new JSZip();
    zip.file('mimetype','application/hwp+zip',{compression:'STORE'});
    for(const [name,entry] of Object.entries(model.zip.files)){
      if(name==='mimetype')continue;
      if(entry.dir)zip.folder(name);else zip.file(name,await entry.async('uint8array'),{binary:true,compression:'DEFLATE'});
    }
    for(const section of model.sections){
      const changed=model.fields.filter(f=>f.path===section.path&&patchMap.has(f.id)&&patchMap.get(f.id)!==f.text);
      if(!changed.length)continue;
      const doc=parse(section.xml),paragraphs=elements(doc,'p');
      changed.forEach(f=>replaceParagraph(paragraphs[f.paragraphIndex],patchMap.get(f.id)));
      const xml=new XMLSerializer().serializeToString(doc);parse(xml);zip.file(section.path,xml);
    }
    zip.file('Preview/PrvText.txt',model.fields.map(f=>patchMap.has(f.id)?patchMap.get(f.id):f.text).join('\n'));
    return zip.generateAsync({type,mimeType:'application/hwp+zip',compression:'DEFLATE'});
  }
  window.TeskHwpx={open,build,validatePatches,parse,paragraphText};
})();
