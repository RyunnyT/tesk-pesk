/* 무료(Spark) 학생 인증의 계산 부분 — Firebase 없이 테스트할 수 있게 따로 둔다.
   shared/pesk-student-auth-free.js 가 불러 쓴다. */
(function(root){
'use strict';

// 학생 Firebase 계정의 로그인 전용 주소 도메인. 메일은 보내지 않는다.
// firestore.rules 의 isStudentEmail() 과 같아야 한다.
const STUDENT_EMAIL_DOMAIN = 'students.tesk-pesk.firebaseapp.com';

// Firebase는 비밀번호가 6자 이상이어야 한다. 학생 비밀번호는 4자부터 허용하므로
// 앞에 고정 글자를 붙여 넘긴다(학생이 입력하는 비밀번호는 그대로).
function authPassword(pw){ return 'pesk1:' + String(pw); }

function hex(buf){ return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
// 아이디 → 로그인 조회 문서 이름. 아이디 원문이 문서 이름에 드러나지 않게 해시한다.
async function loginKey(loginId){
  const data = new TextEncoder().encode('pesk-login\n' + String(loginId));
  return hex(await root.crypto.subtle.digest('SHA-256', data)).slice(0, 40);
}

function newAuthEmail(roomId, num){
  const slug = String(roomId || 'room').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'room';
  const rand = hex(root.crypto.getRandomValues(new Uint8Array(5)));
  return `${slug}-${Number(num)}-${rand}@${STUDENT_EMAIL_DOMAIN}`;
}

function isStudentEmail(email){
  return String(email || '').toLowerCase().endsWith('@' + STUDENT_EMAIL_DOMAIN);
}

function validNewPassword(pw){
  if(typeof pw !== 'string' || pw.length < 4) return '비밀번호는 4자 이상 입력해주세요.';
  if(pw.length > 100) return '비밀번호가 너무 길어요.';
  if(pw === '123456') return '초기 비밀번호와 다른 비밀번호를 입력해주세요.';
  return '';
}

/* 교사가 저장한 계정 목록(next)을 지금 서버 목록(old)과 비교해 할 일을 정한다.
   - needsUser: 새 비밀번호가 있어 새 Firebase 계정을 만들 학생
   - touched:   인증 문서(studentAuth)와 로그인 조회 문서를 다시 쓸 학생
   - dropLoginKeys / dropMembers: 지울 조회 문서 / 인증 문서 (삭제된 계정, 바뀐 아이디) */
async function planAccountSave(old, next, keyOf){
  old = old || {}; next = next || {};
  const nums = Object.keys(next);
  if(nums.length > 300) throw new Error('계정이 너무 많아요.');
  const ids = new Set();
  for(const num of nums){
    const a = next[num];
    if(!/^[1-9]\d{0,5}$/.test(num) || !a || typeof a !== 'object') throw new Error('학생 번호를 확인해주세요.');
    const id = typeof a.id === 'string' ? a.id.trim() : '';
    if(!id || id.length > 100 || id !== a.id) throw new Error(num + '번 아이디를 확인해주세요.');
    if(ids.has(id)) throw new Error('같은 아이디를 두 학생이 쓸 수 없어요: ' + id);
    ids.add(id);
    if(typeof a.pw === 'string' && (a.pw.length < 4 || a.pw.length > 100)) throw new Error(num + '번 비밀번호는 4자 이상이어야 해요.');
  }
  const needsUser = [], touched = [];
  for(const num of nums){
    const a = next[num], prev = old[num];
    const hasPw = typeof a.pw === 'string';
    const hasUser = !!(prev?.firebaseUid);
    if(!hasPw && !hasUser) throw new Error(num + '번 계정은 비밀번호를 다시 정해야 해요. [초기화]를 눌러주세요.');
    if(hasPw) needsUser.push(num);
    const changed = hasPw || !hasUser || !prev || a.id !== prev.id
      || (a.disabled === true) !== (prev.disabled === true)
      || (a.mustChangePassword === true) !== (prev.mustChangePassword === true);
    if(changed) touched.push(num);
  }
  const keys = {};
  for(const id of ids) keys[id] = await keyOf(id);
  const liveKeys = new Set(Object.values(keys));
  const dropLoginKeys = [], dropMembers = [];
  for(const [num, prev] of Object.entries(old)){
    if(!prev) continue;
    if(prev.id && (!next[num] || next[num].id !== prev.id)){
      const k = await keyOf(prev.id);
      if(!liveKeys.has(k) && !dropLoginKeys.includes(k)) dropLoginKeys.push(k);
    }
    if(!next[num] && prev.firebaseUid) dropMembers.push(prev.firebaseUid);
  }
  return {needsUser, touched, keys, dropLoginKeys, dropMembers};
}

const API = {STUDENT_EMAIL_DOMAIN, authPassword, loginKey, newAuthEmail, isStudentEmail, validNewPassword, planAccountSave};
if(typeof module === 'object' && module.exports) module.exports = API;
root.PeskStudentAuthCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
