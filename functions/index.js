// ─────────────────────────────────────────────────────────────
// Tesk & Pesk 경제 로직 서버 (Firebase Cloud Functions, v2)
//
// 목적:
//  1) 경제 로직(잔액·구매·재고)을 서버 트랜잭션으로 처리해 위변조를 차단(#1)
//  2) 단일 문서 read-modify-write 동시성 문제를 트랜잭션으로 해결(#5)
//  3) 학생에게 Firebase Custom Token 을 발급해, 함수가 "누가 호출했는지"를
//     신뢰할 수 있게 함 (기존엔 학생이 Firebase Auth 없이 평문 비교만 했음)
//
// 배포:
//   학생 인증 전환은 STUDENT-AUTH.md의 선택 배포·검증 순서를 따른다.
//   경제 함수 전체 배포와 인증 활성화를 한 번에 수행하지 않는다.
//
// 인증: shared/pesk-student-auth.js, 경제: shared/pesk-economy-api.js.
// ─────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getAuth} = require('firebase-admin/auth');
const {canManageRoom} = require('./teacher-access');
const {defineBoolean} = require('firebase-functions/params');
const studentAuthEnabled = defineBoolean('STUDENT_AUTH_ENABLED', {default:false});

initializeApp();
const db = getFirestore();

// 서울 리전. 클라이언트도 동일 리전으로 함수를 호출해야 합니다.
setGlobalOptions({ region: 'asia-northeast3', maxInstances: 10 });

// 데이터 문서 경로 헬퍼: classrooms/{roomId}/data/{key}
const dataRef = (roomId, key) => db.doc(`classrooms/${roomId}/data/${key}`);
const nowIso = () => new Date().toISOString();

// Authentication is independent from the unfinished economy migration.
const studentAuth = require('./student-auth').createStudentAuth({db, auth:getAuth(), HttpsError});
const authOptions = {maxInstances:2, concurrency:10, memory:'256MiB', timeoutSeconds:60};
const authCall = handler=>onCall(authOptions, request=>{
  if(!studentAuthEnabled.value())throw new HttpsError('unavailable','학생 인증 전환을 준비 중이에요. 잠시 후 다시 시도해주세요.');
  return handler(request);
});
exports.studentLogin = authCall(studentAuth.studentLogin);
exports.studentSession = authCall(studentAuth.studentSession);
exports.studentChangePassword = authCall(studentAuth.studentChangePassword);
exports.saveStudentAccounts = authCall(studentAuth.saveStudentAccounts);
exports.migrateStudentWriting = authCall(studentAuth.migrateStudentWriting);

// ── 학급은행: 예금 가입/해지, 주식 매수/매도 (functions/bank.js) ──
// 학생 인증(커스텀 토큰)이 켜져야 호출자를 믿을 수 있으므로 같은 스위치를 따른다.
// economy-ownership.js 는 shared/ 의 같은 파일 사본이다 (tests/bank-server.test.cjs 가 같은지 검사).
const bank = require('./bank').createBank({db, HttpsError, requireStudent:studentAuth.requireStudent});
exports.bankDeposit = authCall(bank.bankDeposit);
exports.bankWithdraw = authCall(bank.bankWithdraw);
exports.stockBuy = authCall(bank.stockBuy);
exports.stockSell = authCall(bank.stockSell);

// ── 2) 매점 구매 (트랜잭션) ──────────────────────────────────────
// 잔액/재고/가격을 모두 서버 기준으로 검증. 가격은 클라이언트 입력을 신뢰하지 않고
// tesk-shop 문서의 값을 사용합니다.
exports.purchaseShopItem = onCall(async (request) => {
  const { roomId, itemId } = request.data || {};
  if (!roomId || !itemId) throw new HttpsError('invalid-argument', '학급/상품 정보가 필요해요.');
  const {num:studentNum} = await studentAuth.requireStudent(request, roomId);

  const studentsRef = dataRef(roomId, 'tesk-students');
  const shopRef = dataRef(roomId, 'tesk-shop');
  const purchasesRef = dataRef(roomId, 'pesk-purchases');

  const result = await db.runTransaction(async (txn) => {
    const [studSnap, shopSnap, purchSnap] = await Promise.all([
      txn.get(studentsRef), txn.get(shopRef), txn.get(purchasesRef)
    ]);

    const students = studSnap.exists ? (studSnap.get('value') || []) : [];
    const items = shopSnap.exists ? (shopSnap.get('value') || []) : [];
    const purchases = purchSnap.exists ? (purchSnap.get('value') || []) : [];

    const stuIdx = students.findIndex((s) => s.num === studentNum);
    if (stuIdx < 0) throw new HttpsError('not-found', '학생 정보를 찾을 수 없어요.');

    const item = items.find((i) => i.id && i.id === itemId);
    if (!item) throw new HttpsError('not-found', '상품을 찾을 수 없어요.');

    const price = Number(item.price || 0);
    const before = Number(students[stuIdx].points || 0);
    if (before < price) {
      throw new HttpsError('failed-precondition', `잔액이 부족해요. (보유 ${before} 🪙)`);
    }

    // 재고 검증 (stock 이 -1 또는 undefined 면 무제한)
    const limited = item.stock !== undefined && item.stock !== -1;
    if (limited && Number(item.stock || 0) <= 0) {
      throw new HttpsError('failed-precondition', '품절된 상품이에요.');
    }

    // 잔액 차감
    const after = before - price;
    students[stuIdx].points = after;
    const studentName = students[stuIdx].name || '';

    // 구매 기록: 같은 학생의 미배송(pending) 동일 상품이면 수량 +1, 아니면 신규
    const existing = purchases.find((p) =>
      p.studentNum === studentNum &&
      (p.itemName || p.name) === item.name &&
      p.status === 'pending' &&
      (Number(p.qty || 1) - Number(p.delivered || 0)) > 0
    );
    let purchaseId;
    if (existing) {
      existing.qty = Number(existing.qty || 1) + 1;
      existing.date = new Date().toLocaleDateString('ko-KR');
      purchaseId = existing.id;
    } else {
      purchaseId = db.collection('_ids').doc().id;
      purchases.push({
        id: purchaseId, studentNum, studentName,
        itemId: item.id || '', itemName: item.name, icon: item.icon || '📦',
        price, date: new Date().toLocaleDateString('ko-KR'), status: 'pending', qty: 1
      });
    }

    // 재고 감소
    if (limited) {
      const shopIdx = items.findIndex((i) => i.id === item.id);
      if (shopIdx >= 0) items[shopIdx].stock = Math.max(0, Number(items[shopIdx].stock || 0) - 1);
    }

    txn.set(studentsRef, { value: students, updatedAt: nowIso() });
    txn.set(purchasesRef, { value: purchases, updatedAt: nowIso() });
    if (limited) txn.set(shopRef, { value: items, updatedAt: nowIso() });

    return { purchaseId, before, after, price, itemName: item.name };
  });

  return result;
});

// ── 3) 교사 잔액 조정 (트랜잭션) ─────────────────────────────────
// 교사가 본인 학급 학생의 포인트를 더하거나 뺄 때. 호출자는 그 학급의 소유 교사여야 함.
exports.adjustBalance = onCall(async (request) => {
  const { roomId, studentNum, delta, reason } = request.data || {};
  if (!roomId || studentNum == null || typeof delta !== 'number') {
    throw new HttpsError('invalid-argument', '학급/학생/금액이 필요해요.');
  }
  const auth = request.auth;
  if (!auth || !auth.uid) throw new HttpsError('unauthenticated', '로그인이 필요해요.');

  // 소유 교사 또는 마스터인지 확인
  const [userSnap, metaSnap] = await Promise.all([
    db.doc(`users/${auth.uid}`).get(),
    db.doc(`classrooms/${roomId}/info/meta`).get()
  ]);
  const role = userSnap.exists ? userSnap.get('role') : null;
  const ownerUid = metaSnap.exists ? metaSnap.get('ownerUid') : null;
  const approved = userSnap.exists ? userSnap.get('approved') : false;
  const allowed = canManageRoom(auth, {role,approved}, ownerUid);
  if (!allowed) throw new HttpsError('permission-denied', '이 학급을 관리할 권한이 없어요.');

  const studentsRef = dataRef(roomId, 'tesk-students');
  return db.runTransaction(async (txn) => {
    const snap = await txn.get(studentsRef);
    const students = snap.exists ? (snap.get('value') || []) : [];
    const idx = students.findIndex((s) => s.num === Number(studentNum));
    if (idx < 0) throw new HttpsError('not-found', '학생을 찾을 수 없어요.');
    const before = Number(students[idx].points || 0);
    const after = Math.max(0, before + delta);
    students[idx].points = after;
    txn.set(studentsRef, { value: students, updatedAt: nowIso() });
    return { before, after, delta, reason: reason || '' };
  });
});
