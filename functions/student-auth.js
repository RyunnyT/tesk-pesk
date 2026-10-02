'use strict';
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const {canManageRoom}=require('./teacher-access');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const accountUid=()=>`stu_${crypto.randomUUID()}`;
const revision=()=>crypto.randomBytes(24).toString('hex');
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);};
async function hashPassword(password){
  const salt=crypto.randomBytes(16).toString('hex');
  const hash=await scrypt(password,salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return `scrypt1$${salt}$${hash.toString('hex')}`;
}
async function matchesPassword(account,password){
  // An explicit teacher reset takes precedence over the old hash until migrated.
  if(typeof account.pw==='string')return equal(account.pw,password);
  const parts=String(account.passwordHash||'').split('$');
  if(parts.length!==3||parts[0]!=='scrypt1'||!/^[a-f0-9]{32}$/.test(parts[1])||!/^[a-f0-9]{64}$/.test(parts[2]))return false;
  const hash=await scrypt(password,parts[1],32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return equal(hash.toString('hex'),parts[2]);
}
function createStudentAuth({db,auth,HttpsError,now=Date.now}){
  const fail=(code,message)=>{throw new HttpsError(code,message);};
  const room=value=>{if(typeof value!=='string'||value.length<1||value.length>180||/[\x00-\x1f/]/.test(value)||['.','..'].includes(value))fail('invalid-argument','학급 정보가 올바르지 않아요.');return value;};
  const text=(value,max,label)=>{if(typeof value!=='string'||!value.length||value.length>max)fail('invalid-argument',label+'을 확인해주세요.');return value;};
  const ref=id=>db.doc(`classrooms/${id}/data/tesk-accounts`);
  const iso=()=>new Date(now()).toISOString();
  const changedAt=snap=>new Date(Math.max(now(),(Date.parse(snap.exists?snap.get('updatedAt'):'')||0)+1)).toISOString();
  const values=snap=>snap.exists?(snap.get('value')||{}):{};
  const uidFor=(id,acc)=>'student_'+digest(id+'\0'+acc.accountUid);
  const publicAccount=(id,num,acc,name)=>({roomId:id,studentNum:num,name:name||acc.id,id:acc.id,accountUid:acc.accountUid,sessionVersion:acc.sessionVersion,mustChangePassword:acc.mustChangePassword===true,pwChanged:acc.pwChanged===true});
  const claims=(id,num,acc)=>({role:'student',roomId:id,studentNum:num,accountUid:acc.accountUid,sessionVersion:acc.sessionVersion,loginId:acc.id,authRevision:acc.authRevision});
  async function issue(id,num,acc,name){
    const token=await auth.createCustomToken(uidFor(id,acc),claims(id,num,acc));
    return {...publicAccount(id,num,acc,name),token};
  }
  async function limit(request,id,loginId){
    // Only server-derived IP is used; neither IP nor username/password is stored in the limiter.
    const ip=request.rawRequest?.ip||'unknown';
    const keys=[[`ip:${ip}`,120],[`account:${id}:${loginId}`,12]];
    const refs=keys.map(([key])=>db.doc('_studentAuthLimits/'+digest(key)));
    const at=now(),windowMs=10*60*1000;
    await db.runTransaction(async txn=>{
      const snaps=await Promise.all(refs.map(r=>txn.get(r)));
      const counts=snaps.map(s=>s.exists&&Number(s.get('until'))>at?Number(s.get('count')||0):0);
      if(counts.some((count,i)=>count>=keys[i][1]))fail('resource-exhausted','로그인 시도가 많아요. 10분 뒤 다시 시도해주세요.');
      refs.forEach((r,i)=>txn.set(r,{count:counts[i]+1,until:counts[i]?snaps[i].get('until'):at+windowMs}));
    });
  }
  function validateSession(request,id,accounts,{allowPasswordChange=false}={}){
    const t=request.auth?.token;
    if(!t||t.role!=='student'||t.roomId!==id||!Number.isSafeInteger(t.studentNum)||t.studentNum<1)fail('unauthenticated','학생 계정으로 다시 로그인해주세요.');
    const acc=accounts[String(t.studentNum)];
    if(!acc||acc.disabled===true||typeof acc.pw==='string'||!acc.passwordHash||!acc.authRevision||
      t.accountUid!==acc.accountUid||t.sessionVersion!==acc.sessionVersion||t.loginId!==acc.id||t.authRevision!==acc.authRevision||request.auth.uid!==uidFor(id,acc))fail('unauthenticated','계정이 변경되었어요. 다시 로그인해주세요.');
    if(acc.mustChangePassword===true&&!allowPasswordChange)fail('failed-precondition','비밀번호를 변경한 뒤 입장해주세요.');
    return {num:t.studentNum,acc};
  }
  async function requireStudent(request,id,options){
    id=room(id);const snap=await ref(id).get();return validateSession(request,id,values(snap),options);
  }
  async function studentLogin(request){
    const data=request.data||{},id=room(data.roomId),loginId=text(data.id,100,'아이디'),password=text(data.pw,256,'비밀번호');
    await limit(request,id,loginId);
    // Hash outside the retrying transaction. The credential is rechecked on every retry.
    const nextHash=await hashPassword(password);
    const result=await db.runTransaction(async txn=>{
      const accountRef=ref(id),snap=await txn.get(accountRef),accounts=values(snap);
      const matches=Object.entries(accounts).filter(([,a])=>a&&a.id===loginId);
      if(matches.length!==1)fail('permission-denied','아이디 또는 비밀번호가 올바르지 않아요.');
      const [key,old]=matches[0],num=Number(key);
      if(!Number.isSafeInteger(num)||num<1||old.disabled===true||!await matchesPassword(old,password))fail('permission-denied','아이디 또는 비밀번호가 올바르지 않아요.');
      const acc={...old,accountUid:old.accountUid||accountUid(),sessionVersion:Number.isSafeInteger(old.sessionVersion)&&old.sessionVersion>0?old.sessionVersion:1,roomId:id,studentNum:num};
      acc.firebaseUid=uidFor(id,acc);
      if(typeof old.pw==='string'||!old.authRevision){acc.passwordHash=nextHash;acc.authRevision=revision();delete acc.pw;}
      acc.mustChangePassword=old.mustChangePassword===true;
      if(JSON.stringify(acc)!==JSON.stringify(old))txn.set(accountRef,{value:{...accounts,[key]:acc},updatedAt:changedAt(snap)});
      return {num,acc};
    });
    const roster=await db.doc(`classrooms/${id}/data/tesk-students`).get();
    const name=(roster.exists&&Array.isArray(roster.get('value'))?roster.get('value'):[]).find(s=>Number(s.num)===result.num)?.name;
    return issue(id,result.num,result.acc,name);
  }
  async function studentSession(request){
    const id=room(request.data?.roomId),{num,acc}=await requireStudent(request,id,{allowPasswordChange:true});
    return publicAccount(id,num,acc);
  }
  async function studentChangePassword(request){
    const id=room(request.data?.roomId),pw=text(request.data?.newPassword,256,'새 비밀번호');
    if(pw.length<4||pw==='123456')fail('invalid-argument','초기 비밀번호와 다른 4자 이상의 비밀번호를 입력해주세요.');
    await requireStudent(request,id,{allowPasswordChange:true});
    const passwordHash=await hashPassword(pw);
    const result=await db.runTransaction(async txn=>{
      const accountRef=ref(id),snap=await txn.get(accountRef),accounts=values(snap);
      const {num,acc}=validateSession(request,id,accounts,{allowPasswordChange:true});
      if(await matchesPassword(acc,pw))fail('invalid-argument','기존 비밀번호와 다른 비밀번호를 입력해주세요.');
      const next={...acc,passwordHash,authRevision:revision(),sessionVersion:acc.sessionVersion+1,pwChanged:true,mustChangePassword:false,passwordUpdatedAt:iso()};
      delete next.pw;
      txn.set(accountRef,{value:{...accounts,[String(num)]:next},updatedAt:changedAt(snap)});
      return {num,acc:next};
    });
    // Rules compare the live account revision, so old ID AND refresh-token sessions are rejected immediately.
    return issue(id,result.num,result.acc);
  }
  async function saveStudentAccounts(request){
    const id=room(request.data?.roomId),who=request.auth;
    if(!who)fail('unauthenticated','교사 로그인이 필요해요.');
    const next=request.data?.accounts,expected=request.data?.expectedUpdatedAt;
    if(!next||typeof next!=='object'||Array.isArray(next)||Object.keys(next).length>300||typeof expected!=='string')fail('invalid-argument','계정 목록을 다시 불러와주세요.');
    const [initialProfile,initialMeta]=await Promise.all([db.doc(`users/${who.uid}`).get(),db.doc(`classrooms/${id}/info/meta`).get()]);
    if(!canManageRoom(who,initialProfile.exists?initialProfile.data():{},initialMeta.exists?initialMeta.get('ownerUid'):null))fail('permission-denied','이 학급을 관리할 권한이 없어요.');
    const prepared={};
    for(const [key,a]of Object.entries(next)){
      if(!/^[1-9]\d{0,5}$/.test(key)||!a||typeof a!=='object')fail('invalid-argument','학생 번호를 확인해주세요.');
      text(a.id,100,'아이디');
      if(typeof a.pw==='string'){text(a.pw,256,'비밀번호');prepared[key]=await hashPassword(a.pw);}
    }
    if(new Set(Object.values(next).map(a=>a.id)).size!==Object.keys(next).length)fail('invalid-argument','같은 아이디를 중복 사용할 수 없어요.');
    return db.runTransaction(async txn=>{
      const accountRef=ref(id);
      const [profile,meta,snap]=await Promise.all([txn.get(db.doc(`users/${who.uid}`)),txn.get(db.doc(`classrooms/${id}/info/meta`)),txn.get(accountRef)]);
      if(!canManageRoom(who,profile.exists?profile.data():{},meta.exists?meta.get('ownerUid'):null))fail('permission-denied','이 학급을 관리할 권한이 없어요.');
      if((snap.exists?snap.get('updatedAt')||'':'')!==expected)fail('aborted','다른 기기에서 계정이 변경됐어요. 최신 계정 목록을 불러온 뒤 다시 저장해주세요.');
      const old=values(snap),saved={};
      for(const [key,input]of Object.entries(next)){
        const prev=old[key];
        if(!prev&&!prepared[key])fail('invalid-argument','새 계정의 비밀번호를 입력해주세요.');
        const changed=!prev||!!prepared[key]||input.id!==prev.id||!!input.disabled!==!!prev.disabled||!!input.mustChangePassword!==!!prev.mustChangePassword;
        saved[key]={id:input.id,accountUid:prev?.accountUid||input.accountUid||accountUid(),roomId:id,studentNum:Number(key),
          passwordHash:prepared[key]||prev?.passwordHash,authRevision:changed||!prev?.authRevision?revision():prev.authRevision,
          sessionVersion:changed?Number(prev?.sessionVersion||0)+1:(prev.sessionVersion||1),
          mustChangePassword:input.mustChangePassword===true,pwChanged:input.pwChanged===true,disabled:input.disabled===true,
          createdAt:prev?.createdAt||iso(),passwordUpdatedAt:prepared[key]?iso():(prev?.passwordUpdatedAt||'')};
        saved[key].firebaseUid=uidFor(id,saved[key]);
        if(!saved[key].passwordHash){if(typeof prev?.pw!=='string')fail('failed-precondition','계정 비밀번호를 다시 설정해주세요.');saved[key].pw=prev.pw;delete saved[key].passwordHash;}
      }
      const updatedAt=changedAt(snap);txn.set(accountRef,{value:saved,updatedAt});return {accounts:saved,updatedAt};
    });
  }
  async function migrateStudentWriting(request){
    const id=room(request.data?.roomId),writingId=text(request.data?.writingId,200,'글 번호');
    if(writingId.includes('/'))fail('invalid-argument','글 번호를 확인해주세요.');
    return db.runTransaction(async txn=>{
      const legacyRef=db.doc(`classrooms/${id}/data/pesk-writings`),target=db.doc(`${legacyRef.path}/items/${writingId}`);
      const [accountSnap,legacy,current]=await Promise.all([txn.get(ref(id)),txn.get(legacyRef),txn.get(target)]);
      const {num,acc}=validateSession(request,id,values(accountSnap));
      const rows=legacy.exists&&Array.isArray(legacy.get('value'))?legacy.get('value'):[];
      const entry=current.exists?current.data():rows.find(w=>w.id===writingId);
      if(!entry||Number(entry.studentNum)!==num||(entry.accountUid&&entry.accountUid!==acc.accountUid)||entry.deleted)fail('permission-denied','본인의 글만 수정할 수 있어요.');
      if(current.exists&&entry.accountUid===acc.accountUid&&entry.studentNum===num)return {migrated:false};
      txn.set(target,{...entry,studentNum:num,accountUid:acc.accountUid});return {migrated:true};
    });
  }
  return {studentLogin,studentSession,studentChangePassword,saveStudentAccounts,migrateStudentWriting,requireStudent,validateSession};
}
module.exports={createStudentAuth,hashPassword,matchesPassword};
