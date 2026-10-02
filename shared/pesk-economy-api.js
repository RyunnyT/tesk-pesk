// ─────────────────────────────────────────────────────────────
// 경제 로직 서버 API 클라이언트 래퍼
//
// Cloud Functions(functions/index.js)를 호출합니다.
//  - studentSignIn(): 학생 로그인 → 커스텀 토큰으로 Firebase Auth 로그인
//    (Auth 상태는 같은 출처의 다른 페이지로 자동 유지되므로 landing 에서 로그인하면
//     pesk 페이지에서도 인증된 상태로 함수를 호출할 수 있습니다)
//  - purchaseShopItem(): 매점 구매(서버 트랜잭션)
//  - adjustBalance(): 교사 잔액 조정(서버 트랜잭션)
//
// 사용 전제: 페이지가 firebase initializeApp() 을 이미 호출했어야 함.
// 리전은 서버(setGlobalOptions)와 동일하게 'asia-northeast3'.
// ─────────────────────────────────────────────────────────────

import { getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

const REGION = 'asia-northeast3';

function fns() {
  return getFunctions(getApp(), REGION);
}

// 학생 로그인: 서버에서 id/pw 검증 후 커스텀 토큰을 받아 Firebase Auth 로그인.
// 성공 시 { studentNum, name, pwChanged } 반환.
export { studentSignIn } from './pesk-student-auth.js';

// 매점 구매. 성공 시 { purchaseId, before, after, price, itemName }.
export async function purchaseShopItem(roomId, itemId) {
  const call = httpsCallable(fns(), 'purchaseShopItem');
  const { data } = await call({ roomId, itemId });
  return data;
}

// 학급은행 (functions/bank.js). 이율·가격은 서버가 직접 읽고, 화면에 본 가격은 확인용으로만 보낸다.
async function bankCall(name, payload) {
  const { data } = await httpsCallable(fns(), name)(payload);
  return data;
}
export const bankDeposit = (roomId, planId, amount) => bankCall('bankDeposit', { roomId, planId, amount });
export const bankWithdraw = (roomId, depositId, matured) => bankCall('bankWithdraw', { roomId, depositId, matured: !!matured });
export const stockBuy = (roomId, code, name, qty, seenPrice) => bankCall('stockBuy', { roomId, code, name, qty, seenPrice });
export const stockSell = (roomId, code, qty, seenPrice) => bankCall('stockSell', { roomId, code, qty, seenPrice });

// 교사 잔액 조정. delta 는 +/- 정수.
export async function adjustBalance(roomId, studentNum, delta, reason) {
  const call = httpsCallable(fns(), 'adjustBalance');
  const { data } = await call({ roomId, studentNum, delta, reason });
  return data;
}

// 현재 학생이 서버 인증(커스텀 토큰)된 상태인지 여부
export async function isStudentAuthed() {
  const u = getAuth(getApp()).currentUser;
  if(!u)return false;
  return (await u.getIdTokenResult()).claims.role==='student';
}
