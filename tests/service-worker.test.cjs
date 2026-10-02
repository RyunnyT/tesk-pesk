const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const files=new Map(),other=new Map(),handlers={},deleted=[];let network=async()=>{throw Error('offline');};
 const key=r=>new URL(typeof r==='string'?r:r.url,'https://example.test/').href;
 const cache={match:async r=>files.get(key(r))?.clone(),put:async(r,v)=>files.set(key(r),v.clone()),addAll:async()=>{}};
 const c={URL,Response,console,fetch:req=>network(req),caches:{open:async()=>cache,keys:async()=>['pesk-shell-old','another-app'],delete:async k=>deleted.push(k)},
  self:{location:{origin:'https://example.test'},addEventListener:(k,fn)=>handlers[k]=fn,clients:{claim:async()=>{}},skipWaiting:async()=>{}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('pesk-service-worker.js','utf8'),c);
 return {files,deleted,network:fn=>network=fn,request:async(path,mode='navigate')=>{let response;const waits=[];handlers.fetch({request:{url:'https://example.test'+path,method:'GET',mode},respondWith:p=>response=p,waitUntil:p=>waits.push(p)});const r=await response;await Promise.all(waits);return r;},activate:async()=>{let p;handlers.activate({waitUntil:v=>p=v});await p;}};
}
test('offline logout navigation returns the login shell for clean URLs, never the student shell',async()=>{
 const f=fixture();f.files.set('https://example.test/landing.html',new Response('LOGIN'));f.files.set('https://example.test/pesk.html',new Response('STUDENT'));
 for(const url of ['/landing','/landing.html','/'])assert.equal(await (await f.request(url)).text(),'LOGIN');
 assert.equal(await (await f.request('/pesk')).text(),'STUDENT');assert.equal((await f.request('/teacher')).status,503);
});
test('a missing script never receives HTML as an offline fallback',async()=>{
 const f=fixture();f.files.set('https://example.test/pesk.html',new Response('STUDENT'));assert.equal((await f.request('/missing.js','cors')).type,'error');
});
test('failed HTTP responses cannot poison a previously cached page',async()=>{
 const f=fixture();f.files.set('https://example.test/landing',new Response('LOGIN'));f.network(async()=>new Response('unavailable',{status:503}));
 assert.equal((await f.request('/landing')).status,503);f.network(async()=>{throw Error('offline');});assert.equal(await (await f.request('/landing')).text(),'LOGIN');
});
test('service worker activation only removes its own obsolete caches',async()=>{
 const f=fixture();await f.activate();assert.deepEqual(f.deleted,['pesk-shell-old']);
});
