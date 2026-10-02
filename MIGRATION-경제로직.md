# 경제 로직 서버화 마이그레이션 가이드

> 2026-09-30 정정: 아래는 초기 경제 서버화 설계이며 그대로 배포하지 않는다.
> 최신 학생 인증 전환은 [STUDENT-AUTH.md](STUDENT-AUTH.md)를 따른다.
> 인증은 별도 `USE_SERVER_STUDENT_AUTH`와 서버 `STUDENT_AUTH_ENABLED`로 제어하며,
> 기존 계정 조회·비밀번호 변경·세션 확인 경로까지 함께 전환해야 한다.
> 비밀번호 해시 전환 후에는 플래그를 끄거나 계정 문서를 다시 공개하는 롤백을 금지한다.
> 경제 기능은 아직 전체 서버화되지 않았으므로 `USE_SERVER_ECONOMY=false`를 유지한다.

> 목적: 잔액·매점·주식·예금 로직을 **Cloud Functions 트랜잭션**으로 옮겨
> ① 위변조 차단(공개 쓰기 문제 해결) ② 단일 문서 동시성 문제 해결.

## 구조

| 구성 | 파일 | 상태 |
|---|---|---|
| 서버 함수 | `functions/index.js` | 로그인·매점구매·교사잔액조정 **완료** |
| 학급은행 서버 함수 | `functions/bank.js` (`bankDeposit`/`bankWithdraw`/`stockBuy`/`stockSell`) | **코드 완료, 미배포** (2026-09-30) |
| 예금·주식 주인 판정 | `shared/economy-ownership.js` (= `functions/economy-ownership.js` 사본) | 학생·교사·서버 공통 |
| 클라이언트 래퍼 | `shared/pesk-economy-api.js` | 완료 |
| 기능 플래그 | `shared/firebase-config.js` → `USE_SERVER_ECONOMY` | 기본 `false` |
| 강화 규칙(목표) | `firestore.secure.rules` | 전 경로 이전 후 적용 |

핵심 원리: Functions 는 **admin SDK** 라 보안 규칙을 우회합니다. 따라서 경제 처리를
함수로 옮기면, 규칙에서 클라이언트의 직접 쓰기를 **완전히 막아도** 정상 동작합니다.
이것이 "공개 쓰기"라는 보안 구멍을 닫는 방법입니다.

## 배포 절차 (순서 중요)

1. **Functions 배포** (Blaze 요금제 필요 — 소규모는 사실상 무료 범위)
   ```bash
   cd functions
   npm install
   firebase login
   firebase deploy --only functions
   ```
   리전은 서울(`asia-northeast3`). 클라이언트(`pesk-economy-api.js`)도 동일 리전.

2. **플래그 켜기**: `shared/firebase-config.js` 의 `USE_SERVER_ECONOMY = true`.

3. **테스트** (규칙은 아직 현행 유지 — 깨지지 않음):
   - 학생 로그인 → landing 에서 커스텀 토큰 로그인되는지(개발자도구 Auth)
   - 매점 구매 → 잔액/재고가 서버에서 차감되는지
   - 잔액 부족/품절 시 서버가 막는지
   - **동시 구매 테스트**: 같은 학생으로 빠르게 두 번 → 트랜잭션이 직렬화되어
     이중 차감/마이너스 없이 처리되는지

4. **나머지 경로 이전** (아래 "남은 작업") → 함수 추가 + 클라이언트 분기.

5. **규칙 강화**: 모든 경로 이전·검증 후
   `firestore.secure.rules` 내용을 `firestore.rules` 로 복사 → `firebase deploy --only firestore:rules`.
   이 시점에 평문 비밀번호 공개 읽기와 잔액 공개 쓰기가 **완전히 차단**됩니다.

## 남은 작업 (같은 패턴으로 이전)

각 항목: `functions/index.js` 에 트랜잭션 함수 추가 → `pesk-economy-api.js` 에 래퍼 추가
→ 해당 클라이언트 함수에 `if(window.TESK_USE_SERVER_ECONOMY) { ...서버호출; return; }` 분기.

| 경로 | 클라이언트 위치(참고) | 건드리는 키 |
|---|---|---|
| ~~주식 매수/매도~~ | 완료: `functions/bank.js` + `pesk.html` `_serverBank()` 분기 | tesk-students, pesk-portfolios |
| ~~예금 가입/해지~~ | 완료: `functions/bank.js` + `pesk.html` `_serverBank()` 분기 | tesk-students, pesk-deposits |

> 학급은행 함수는 학생 인증과 같은 `STUDENT_AUTH_ENABLED` 스위치를 따른다(`authCall`).
> `functions/economy-ownership.js` 를 고칠 때는 `shared/` 쪽도 똑같이 고친다 — `tests/bank-server.test.cjs` 가 두 파일이 같은지 검사한다.
> 교사 화면의 강제 매도·회수·초기화는 클라이언트 트랜잭션(`economyTxn`)으로 처리한다. 강화 규칙에서도 소유 교사는 쓰기가 허용되므로 규칙 교체와 무관하게 동작한다.
| 비밀번호 변경 | `landing.html` `changePassword` (≈787행), `pesk.html` 비번변경 | tesk-accounts |

> 주의: 위 경로들은 모두 `tesk-students.points`(잔액)를 건드립니다. 따라서
> **주식·예금·비밀번호 변경까지 모두 함수로 옮기기 전에는** `firestore.secure.rules`
> 의 잔액/계정 잠금을 적용하면 안 됩니다(부분 적용 시 깨짐).

## 함수 작성 패턴 (예: 주식 매수)

`purchaseShopItem`(완료)을 그대로 본떠:
1. `requireStudent(request, roomId)` 로 호출자 검증
2. `db.runTransaction` 안에서 관련 문서(students, portfolios, prices) 읽기
3. 서버 기준으로 잔액·가격 검증 (클라이언트가 보낸 가격/금액 신뢰 금지)
4. 차감/증가 후 `txn.set` 으로 원자적 저장
5. 결과 반환 → 클라이언트는 onSnapshot 으로 화면 갱신

## 롤백

문제가 생기면 `USE_SERVER_ECONOMY = false` 로 되돌리면 즉시 기존 클라이언트 방식으로
복귀합니다(단, 강화 규칙을 이미 적용했다면 규칙도 현행 `firestore.rules` 로 되돌려야 함).
