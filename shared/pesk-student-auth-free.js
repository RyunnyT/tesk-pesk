// ─────────────────────────────────────────────────────────────
// 학생 인증 — 무료(Spark) 요금제용
//
// Cloud Functions(서버 인증, pesk-student-auth.js)는 Blaze 결제가 필요하다.
// 이 모듈은 결제 없이 쓸 수 있는 Firebase 이메일/비밀번호 인증으로 같은 일을 한다.
//  - 학생 화면은 그대로: 학급 코드 + 아이디 + 비밀번호.
//  - 학생마다 Firebase 계정을 하나 만든다. 주소는 메일이 가지 않는 로그인 전용 주소다.
//  - 비밀번호는 Firebase Auth만 알고, 학급 문서(tesk-accounts)에는 남기지 않는다.
//  - 권한은 Firestore 규칙이 classrooms/{학급}/studentAuth/{Firebase uid} 문서로 판단한다.
//    교사가 비밀번호를 초기화하면 새 Firebase 계정을 만들고 옛 uid 문서를 지운다.
//    그래서 옛 기기에 남은 로그인은 즉시 아무것도 읽거나 쓸 수 없다.
//
// 학급마다 전환한다: classrooms/{학급}/info/meta.studentAuth === 'firebase' 인 학급만
// 이 방식을 쓰고, 아직 전환하지 않은 학급은 기존 방식 그대로 동작한다.
//
// pesk-student-auth.js(서버 방식)와 같은 함수 이름·반환 모양을 쓴다.
// ─────────────────────────────────────────────────────────────
import {getApp, getApps, initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {getAuth, initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updatePassword, onAuthStateChanged, signOut} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {getFirestore, doc, getDoc, getDocs, collection, writeBatch, runTransaction} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import './student-auth-free-core.js?v=20260930free1';
import {firebaseConfig} from './firebase-config.js';
const {STUDENT_EMAIL_DOMAIN, authPassword, loginKey, newAuthEmail, validNewPassword, planAccountSave} = globalThis.PeskStudentAuthCore;

export {STUDENT_EMAIL_DOMAIN};
// 교사 화면(계정 저장·전환)은 기본 앱 = 교사 Google 로그인을 쓴다.
const db = () => getFirestore(getApp());
// 학생 로그인은 별도 앱에 둔다. 기본 앱을 같이 쓰면 같은 브라우저에서 교사·학생 로그인이 서로를 덮어써
// 학생 글 제출이 'Missing or insufficient permissions' 로 막히고, 교사 화면이 학생 계정으로 바뀐다.
// pesk.html 도 같은 이름의 앱으로 Firestore 를 연다(아래 이름과 같아야 한다).
export const STUDENT_APP = 'pesk-student';
function studentApp(){ return getApps().find(a => a.name === STUDENT_APP) || initializeApp(firebaseConfig, STUDENT_APP); }
const studentAuth = () => getAuth(studentApp());
const studentDb = () => getFirestore(studentApp());
const fail = (message, code = 'functions/unauthenticated') => { throw Object.assign(new Error(message), {code}); };
const BAD_LOGIN = '아이디 또는 비밀번호가 올바르지 않아요.';

function ready(){
  return new Promise((resolve, reject) => { let stop = () => {}; stop = onAuthStateChanged(studentAuth(), u => { stop(); resolve(u); }, reject); });
}

const securedCache = new Map();
// 이 학급이 무료 인증으로 전환됐는지 (info/meta 는 누구나 읽을 수 있다)
export async function isRoomSecured(roomId, {fresh = false} = {}){
  if(!roomId) return false;
  if(!fresh && securedCache.has(roomId)) return securedCache.get(roomId);
  const snap = await getDoc(doc(studentDb(), 'classrooms', roomId, 'info', 'meta'));
  const on = snap.exists() && snap.data().studentAuth === 'firebase';
  securedCache.set(roomId, on);
  return on;
}

// 페이지가 쓸 인증 모듈을 고른다.
//  서버 인증 플래그(Blaze) → 서버 모듈, 전환된 학급 → 이 모듈, 아니면 null(기존 방식).
export async function resolveStudentAuth(roomId){
  if(window.TESK_USE_SERVER_STUDENT_AUTH || window.TESK_USE_SERVER_ECONOMY) return import('./pesk-student-auth.js');
  // import.meta.url 그대로 불러야 ?v= 가 붙은 지금 이 모듈(같은 캐시)을 돌려받는다.
  return (await isRoomSecured(roomId)) ? import(import.meta.url) : null;
}

function publicAccount(roomId, member, name){
  return {roomId, studentNum:Number(member.studentNum), name:name || member.loginId, id:member.loginId, accountUid:member.accountUid,
    sessionVersion:Number(member.sessionVersion || 1), mustChangePassword:member.mustChangePassword === true, pwChanged:member.pwChanged === true};
}
async function memberOf(roomId, uid, store = studentDb()){
  const snap = await getDoc(doc(store, 'classrooms', roomId, 'studentAuth', uid));
  return snap.exists() ? snap.data() : null;
}

// ── 학생 로그인 ──
export async function studentSignIn(roomId, id, pw){
  const key = await loginKey(id);
  const login = await getDoc(doc(studentDb(), 'classrooms', roomId, 'studentLogins', key));
  if(!login.exists() || !login.data().email) fail(BAD_LOGIN, 'functions/permission-denied');
  let cred;
  try{
    cred = await signInWithEmailAndPassword(studentAuth(), login.data().email, authPassword(pw));
  }catch(e){
    if(e?.code === 'auth/too-many-requests') fail('로그인 시도가 많아요. 잠시 뒤 다시 시도해주세요.', 'functions/resource-exhausted');
    if(e?.code === 'auth/network-request-failed') throw e;
    fail(BAD_LOGIN, 'functions/permission-denied');
  }
  const member = await memberOf(roomId, cred.user.uid).catch(() => null);
  if(!member || member.disabled === true || member.loginId !== id){
    await signOut(studentAuth()).catch(() => {});
    fail('계정이 변경되었어요. 선생님께 확인해주세요.', 'functions/permission-denied');
  }
  let name = '';
  try{
    const roster = await getDoc(doc(studentDb(), 'classrooms', roomId, 'data', 'tesk-students'));
    name = (roster.exists() && Array.isArray(roster.data().value) ? roster.data().value : []).find(s => Number(s.num) === Number(member.studentNum))?.name || '';
  }catch(_e){}
  return publicAccount(roomId, member, name);
}

// ── 학생 비밀번호 변경 ── (Firebase가 다른 기기의 로그인도 끊는다)
export async function changePassword(roomId, newPassword){
  const problem = validNewPassword(newPassword);
  if(problem) fail(problem, 'functions/invalid-argument');
  const user = studentAuth().currentUser || await ready();
  if(!user) fail('학생 계정으로 다시 로그인해주세요.');
  try{
    await updatePassword(user, authPassword(newPassword));
  }catch(e){
    if(e?.code === 'auth/requires-recent-login') fail('보안을 위해 다시 로그인한 뒤 비밀번호를 바꿔주세요.');
    throw e;
  }
  const ref = doc(studentDb(), 'classrooms', roomId, 'studentAuth', user.uid);
  const member = await runTransaction(studentDb(), async txn => {
    const snap = await txn.get(ref);
    if(!snap.exists()) fail('계정이 변경되었어요. 다시 로그인해주세요.');
    const cur = snap.data();
    const next = {...cur, sessionVersion:Number(cur.sessionVersion || 1) + 1, mustChangePassword:false, pwChanged:true, passwordUpdatedAt:new Date().toISOString()};
    txn.update(ref, {sessionVersion:next.sessionVersion, mustChangePassword:false, pwChanged:true, passwordUpdatedAt:next.passwordUpdatedAt});
    return next;
  });
  return publicAccount(roomId, member);
}

// ── 세션 확인 ── (교사가 계정을 지우거나 초기화·정지하면 여기서 걸린다)
export async function verifySession(expected){
  const user = await ready();
  if(!user) fail('학생 계정으로 다시 로그인해주세요.');
  const member = await memberOf(expected.roomId, user.uid).catch(e => {
    if(e?.code === 'permission-denied') return null;
    throw e;
  });
  if(!member || member.disabled === true
    || Number(member.studentNum) !== Number(expected.studentNum)
    || member.accountUid !== expected.accountUid
    || Number(member.sessionVersion || 1) !== Number(expected.sessionVersion)) fail('계정이 변경되었어요. 다시 로그인해주세요.');
  return publicAccount(expected.roomId, member);
}

// 서버 방식의 옛 글 이전 기능 — 무료 방식은 학생이 규칙 안에서 직접 쓰므로 할 일이 없다.
export async function migrateWriting(){ return {migrated:false}; }

// ── 교사: 계정 저장 ──
// 새 비밀번호(pw)가 들어 있는 계정마다 새 Firebase 계정을 만든다. 교사 로그인이 풀리지 않게
// 기기에 저장하지 않는 별도 앱 인스턴스로 만든다. 저장되는 계정 목록에는 비밀번호를 남기지 않는다.
let makerAuth = null;
function studentMaker(){
  if(makerAuth) return makerAuth;
  const existing = getApps().find(a => a.name === 'pesk-student-maker');
  const app = existing || initializeApp(getApp().options, 'pesk-student-maker');
  makerAuth = existing ? getAuth(app) : initializeAuth(app, {persistence:inMemoryPersistence});
  return makerAuth;
}
async function createStudentUser(roomId, num, pw){
  const maker = studentMaker();
  const email = newAuthEmail(roomId, num);
  try{
    const cred = await createUserWithEmailAndPassword(maker, email, authPassword(pw));
    return {uid:cred.user.uid, email};
  }catch(e){
    if(e?.code === 'auth/operation-not-allowed') throw new Error('Firebase 콘솔에서 이메일/비밀번호 로그인을 켜야 해요. (Authentication → 로그인 방법)');
    if(e?.code === 'auth/too-many-requests') throw new Error('한 번에 너무 많은 계정을 만들었어요. 1시간쯤 뒤 이어서 저장해주세요.');
    throw e;
  }finally{
    await signOut(maker).catch(() => {});
  }
}

export async function saveAccounts(roomId, accounts, expectedUpdatedAt, {secureRoom = false} = {}){
  const accountsRef = doc(db(), 'classrooms', roomId, 'data', 'tesk-accounts');
  const firstSnap = await getDoc(accountsRef);
  const oldAccounts = firstSnap.exists() ? (firstSnap.data().value || {}) : {};
  const plan = await planAccountSave(oldAccounts, accounts, loginKey);   // 검증 + 바뀐 점 계산 (아직 아무것도 안 씀)
  const created = {};
  for(const num of plan.needsUser){
    created[num] = await createStudentUser(roomId, num, accounts[num].pw);
  }
  const now = new Date().toISOString();
  const result = await runTransaction(db(), async txn => {
    const snap = await txn.get(accountsRef);
    const current = snap.exists() ? (snap.data().value || {}) : {};
    const currentAt = snap.exists() ? (snap.data().updatedAt || '') : '';
    if(expectedUpdatedAt != null && currentAt !== expectedUpdatedAt) throw new Error('다른 기기에서 계정이 변경됐어요. 새로고침한 뒤 다시 저장해주세요.');
    if(JSON.stringify(current) !== JSON.stringify(oldAccounts)) throw new Error('계정 목록이 방금 바뀌었어요. 다시 저장해주세요.');
    // 학생이 바꾼 세션 번호를 덮어쓰지 않도록, 건드릴 학생의 현재 인증 문서를 먼저 읽는다.
    const memberSnaps = {};
    for(const num of plan.touched){
      const uid = current[num]?.firebaseUid;
      if(uid) memberSnaps[num] = await txn.get(doc(db(), 'classrooms', roomId, 'studentAuth', uid));
    }
    const saved = {};
    for(const [num, input] of Object.entries(accounts)){
      const prev = current[num];
      const made = created[num];
      const member = memberSnaps[num]?.exists() ? memberSnaps[num].data() : null;
      const baseVersion = Math.max(Number(prev?.sessionVersion || 0), Number(member?.sessionVersion || 0));
      const touched = plan.touched.includes(num);
      const next = {
        id:input.id, accountUid:prev?.accountUid || input.accountUid, roomId, studentNum:Number(num),
        firebaseUid:made ? made.uid : (prev?.firebaseUid || input.firebaseUid), authEmail:made ? made.email : (prev?.authEmail || input.authEmail),
        sessionVersion:touched ? baseVersion + 1 : (baseVersion || 1),
        mustChangePassword:input.mustChangePassword === true,
        pwChanged:made ? input.pwChanged === true : (member ? member.pwChanged === true : input.pwChanged === true),
        disabled:input.disabled === true,
        createdAt:prev?.createdAt || input.createdAt || now,
        passwordUpdatedAt:made ? now : (prev?.passwordUpdatedAt || input.passwordUpdatedAt || '')
      };
      if(!made && member && !touched) next.mustChangePassword = member.mustChangePassword === true;
      saved[num] = next;
      if(touched){
        if(prev?.firebaseUid && prev.firebaseUid !== next.firebaseUid) txn.delete(doc(db(), 'classrooms', roomId, 'studentAuth', prev.firebaseUid));
        txn.set(doc(db(), 'classrooms', roomId, 'studentAuth', next.firebaseUid), {
          studentNum:Number(num), accountUid:next.accountUid, loginId:next.id, sessionVersion:next.sessionVersion,
          mustChangePassword:next.mustChangePassword, pwChanged:next.pwChanged, disabled:next.disabled, updatedAt:now
        });
        txn.set(doc(db(), 'classrooms', roomId, 'studentLogins', plan.keys[next.id]), {email:next.authEmail, studentNum:Number(num)});
      }
    }
    for(const key of plan.dropLoginKeys) txn.delete(doc(db(), 'classrooms', roomId, 'studentLogins', key));
    for(const uid of plan.dropMembers) txn.delete(doc(db(), 'classrooms', roomId, 'studentAuth', uid));
    txn.set(accountsRef, {value:saved, updatedAt:now});
    // 전환: 비밀번호를 뺀 계정 목록과 "이 학급은 Firebase 로그인" 표시를 한 번에 쓴다.
    // 따로 쓰면 그 사이에 옛 로그인(비밀번호 비교)도 새 로그인도 안 되는 순간이 생긴다.
    if(secureRoom) txn.update(doc(db(), 'classrooms', roomId, 'info', 'meta'), {studentAuth:'firebase', studentAuthAt:now});
    return {accounts:saved, updatedAt:now};
  });
  const issued = {};
  for(const [num, made] of Object.entries(created)) issued[num] = {pw:accounts[num].pw, uid:made.uid};
  return {...result, issued};
}

// ── 교사: 학급 전환 ── 지금 계정의 아이디·비밀번호 그대로 Firebase 계정을 만들고 학급을 전환한다.
// 학생은 전에 쓰던 아이디/비밀번호로 그대로 로그인한다.
// 이미 전환한 학급에서 다시 부르면 옛 글 옮기기만 한다(여러 번 불러도 안전).
export async function convertRoom(roomId){
  const accountsRef = doc(db(), 'classrooms', roomId, 'data', 'tesk-accounts');
  const snap = await getDoc(accountsRef);
  const accounts = snap.exists() ? (snap.data().value || {}) : {};
  let result;
  if(await isRoomSecured(roomId, {fresh:true})){
    result = {accounts, updatedAt:snap.exists() ? (snap.data().updatedAt || '') : '', issued:{}};
  }else{
    const missing = Object.entries(accounts).filter(([, a]) => a && !a.firebaseUid && typeof a.pw !== 'string').map(([n]) => n);
    if(missing.length) throw new Error(`${missing.join(', ')}번 계정은 비밀번호 정보가 없어요. [초기화]로 비밀번호를 다시 정한 뒤 전환해주세요.`);
    result = await saveAccounts(roomId, accounts, snap.exists() ? (snap.data().updatedAt || '') : '', {secureRoom:true});
    securedCache.set(roomId, true);
  }
  try{
    result.writingsMoved = await migrateLegacyWritings(roomId, result.accounts);
  }catch(e){
    throw new Error('계정 전환은 끝났지만 옛 글을 옮기지 못했어요. [보안 전환]을 한 번 더 눌러 주세요. (' + (e?.message || e) + ')');
  }
  return result;
}

// 옛 글 묶음 문서(pesk-writings.value)에만 있는 글을 개별 문서로 옮긴다.
// 전환한 학급의 학생은 규칙상 자기 개별 문서만 고칠 수 있어서, 옮기지 않으면 옛 글을 수정할 수 없다.
// 원본 묶음 문서는 지우지 않는다. 이미 개별 문서가 있는 글은 건드리지 않는다.
async function migrateLegacyWritings(roomId, savedAccounts){
  const legacy = await getDoc(doc(db(), 'classrooms', roomId, 'data', 'pesk-writings'));
  const rows = legacy.exists() && Array.isArray(legacy.data().value) ? legacy.data().value : [];
  if(!rows.length) return 0;
  const itemsSnap = await getDocs(collection(db(), 'classrooms', roomId, 'data', 'pesk-writings', 'items'));
  const have = new Set(itemsSnap.docs.map(d => d.id));
  let batch = writeBatch(db()), pending = 0, moved = 0;
  for(const w of rows){
    if(!w || typeof w.id !== 'string' || !w.id || w.id.includes('/') || have.has(w.id)) continue;
    const num = Number(w.studentNum);
    const entry = {...w};
    if(Number.isSafeInteger(num) && num > 0){
      entry.studentNum = num;
      if(!entry.accountUid && savedAccounts?.[String(num)]?.accountUid) entry.accountUid = savedAccounts[String(num)].accountUid;
    }
    batch.set(doc(db(), 'classrooms', roomId, 'data', 'pesk-writings', 'items', w.id), entry);
    have.add(w.id); moved++;
    if(++pending >= 400){ await batch.commit(); batch = writeBatch(db()); pending = 0; }
  }
  if(pending) await batch.commit();
  return moved;
}

// ── 교사: 학생이 직접 바꾼 상태(비밀번호 변경 여부)를 계정 목록에 합쳐 보여 주기 ──
export async function studentAuthStatus(roomId, accounts){
  const out = {};
  await Promise.all(Object.entries(accounts || {}).map(async ([num, a]) => {
    if(!a?.firebaseUid) return;
    const m = await memberOf(roomId, a.firebaseUid, db()).catch(() => null);
    if(m) out[num] = {pwChanged:m.pwChanged === true, mustChangePassword:m.mustChangePassword === true, sessionVersion:Number(m.sessionVersion || 1)};
  }));
  return out;
}
