# 학생 로그인 보안 — 무료(Spark) 요금제 방식 (2026-09-30)

## ⚠️ 보류 (2026-09-30 선생님 결정)

교사 화면의 **[🔒 보안 전환] 버튼을 숨겼다.** 학생이 바꾼 비밀번호를 선생님이 볼 수 있어야 하는데, 이 방식은 비밀번호를 Firebase에만 두기 때문이다. 전환한 학급은 없다(18개 학급 모두 기존 방식). 코드·규칙은 그대로 두었으므로, 다시 쓰려면 `tesk_teacher_v2.html`의 주석 자리에 `<div id="student-auth-secure-box">`를 되살리면 된다. 교사가 비밀번호를 볼 수 있게 하려면 학생이 바꾼 비밀번호를 교사 전용 문서에 함께 저장하는 보완이 먼저 필요하다.

## 적용 상태 (2026-09-30)

- [x] Firebase Authentication 이메일/비밀번호 로그인 사용 설정
- [x] `firestore.rules` 운영 배포 (배포 전 규칙 사본: `output/free-auth/rules-before-2026-09-30.rules`)
- [x] 운영 프로젝트의 가상 학급으로 실검증 후 삭제: 실제 로그인·틀린 비밀번호 거부·초기 비밀번호 변경·예금 쓰기·계정 목록 차단·인증 문서 삭제 시 즉시 차단 등 15개 항목 통과. 전환하지 않은 기존 학급은 그대로 동작함을 확인
- [ ] 정적 사이트 배포 (`deploy-cloudflare.bat`)
- [ ] 학급마다 교사 화면에서 [🔒 보안 전환]
- 교사 화면의 계정 저장·학급 전환 코드는 교사 Google 로그인이 필요해 실검증하지 못했다(단위·규칙 검사로만 확인). 첫 학급 전환 후 학생 한 명으로 로그인을 확인할 것.

## 왜 따로 만들었나

[STUDENT-AUTH.md](STUDENT-AUTH.md)의 서버 인증은 Cloud Functions가 커스텀 토큰을 발급한다. Cloud Functions는 **Blaze(종량제) 결제가 있어야 배포**된다. 2026-09-30 확인 결과 `tesk-pesk` 프로젝트는 `billingEnabled: false`이고 Cloud Functions API도 한 번도 켜진 적이 없다. 따라서 서버 인증은 지금 동작할 수 없다.

이 문서의 방식은 결제 없이 쓸 수 있는 **Firebase 이메일/비밀번호 인증 + Firestore 규칙**만 쓴다.

## 동작

- 학생 화면은 그대로다. 학급 코드를 넣고 아이디/비밀번호로 로그인한다.
- 학생마다 Firebase 계정을 하나 만든다. 주소는 `학급-번호-임의값@students.tesk-pesk.firebaseapp.com` 형태다. 메일은 보내지 않는다. Firebase는 비밀번호가 6자 이상이어야 하므로 학생 비밀번호 앞에 고정 글자(`pesk1:`)를 붙여 넘긴다. 학생이 입력하는 비밀번호는 그대로다.
- 비밀번호는 Firebase Auth에만 있다. 계정 목록 `tesk-accounts`에는 비밀번호를 남기지 않는다. 계정 목록은 교사만 읽는다.
- 규칙은 `classrooms/{학급}/studentAuth/{Firebase uid}` 문서가 있는 학생만 그 학급 자료를 읽고 쓰게 한다. 교사가 비밀번호를 **초기화**하면 새 Firebase 계정을 만들고 옛 uid 문서를 지운다. 그래서 옛 기기의 로그인은 즉시 막힌다. 교사는 다른 사람의 Firebase 비밀번호를 바꿀 수 없어서 이렇게 처리한다. 쓰지 않게 된 옛 Firebase 계정은 아무 권한이 없다.
- 로그인할 때는 `classrooms/{학급}/studentLogins/{아이디 해시}`에서 로그인 주소를 찾는다. 이 문서는 한 건씩만 읽을 수 있고 목록 조회는 막혀 있다.
- 학생이 비밀번호를 바꾸면 Firebase가 다른 기기의 로그인을 끊는다. 인증 문서의 세션 번호도 1 오른다.
- 학급마다 전환한다. `info/meta.studentAuth == 'firebase'`인 학급만 새 방식으로 동작하고, 전환하지 않은 학급은 예전과 똑같이 동작한다. 교사 화면에서 전환한 학급을 다시 옛 방식으로 되돌릴 수는 없다(규칙이 막는다).

## 파일

| 파일 | 내용 |
|---|---|
| `shared/pesk-student-auth-free.js` | 로그인·비밀번호 변경·세션 확인, 교사 계정 저장·학급 전환·옛 글 이전 (`pesk-student-auth.js`와 같은 함수 이름) |
| `shared/student-auth-free-core.js` | Firebase 없이 테스트하는 계산 부분(아이디 해시, 저장 계획 등) |
| `firestore.rules` | 전환 전/후 학급을 함께 처리하는 규칙 |
| `landing.html`, `pesk.html`, `tesk_teacher_v2.html` | `window._studentAuthFor(roomId)`로 학급별 방식을 고른다. 서버 인증 플래그가 켜져 있으면 예전처럼 서버 방식을 쓴다 |
| `tests/free-auth.rules.remote.cjs` | 규칙 모의 검사 86건 (배포 없음) |
| `tests/student-auth-free.test.cjs` | 계산 부분 단위 검사 |
| `STUDENT_AUTH_SMOKE=free node tests/auth-writing.smoke.cjs` | 로그인→글쓰기→로그아웃 화면 검사 (새 경로) |

## 켜는 순서

1. Firebase 콘솔 → Authentication → 로그인 방법 → **이메일/비밀번호 사용 설정**. 이 설정을 켜지 않으면 전환할 때 "이메일/비밀번호 로그인을 켜야 해요"라는 오류가 나고, 아무것도 바뀌지 않는다.
2. 규칙을 배포한다: `firebase deploy --only firestore:rules --project tesk-pesk`. 전환하지 않은 학급은 동작이 바뀌지 않는다.
3. 정적 사이트를 배포한다(`deploy-cloudflare.bat`). 서비스워커 캐시 버전도 올려 두었다.
4. 교사 화면 → 학생 관리 → 🔑 학생 계정 관리 → **🔒 보안 전환**. 전환 전에 학급 데이터 백업을 권한다. 학생은 쓰던 아이디/비밀번호 그대로 한 번 다시 로그인하면 된다.

## 요금·한도 (Spark 무료)

- 이메일/비밀번호 인증은 무료다(업그레이드하지 않은 Firebase Auth).
- 계정 생성은 같은 IP에서 시간당 약 100개로 제한된다. 한 학급(30명 안팎) 전환에는 문제가 없다. 여러 학급을 한꺼번에 전환하면 한 시간쯤 뒤에 이어서 하면 된다.
- 규칙이 학급 전환 여부(`info/meta`)와 학생 인증 문서를 확인하는 조회는 Firestore 읽기로 계산된다. 요청마다 1~2회가 늘어난다. Spark 한도는 하루 읽기 50,000회다. 학급이 많거나 사용량이 많으면 Firebase 콘솔의 사용량 화면을 확인할 것.

## 남은 한계

- 전환한 학급에서도, 로그인한 학생은 반 전체가 함께 쓰는 문서(잔액·주식·예금·설문 등)를 고칠 수 있다. 이것을 완전히 막으려면 서버(Cloud Functions, Blaze)나 학생별 문서 구조가 필요하다.
- `functions/bank.js`의 서버 경제 함수는 Blaze에서만 쓸 수 있다. `USE_SERVER_ECONOMY=false`를 유지한다.
- 같은 브라우저에서 학생이 로그인하면 그 브라우저의 교사 로그인은 풀린다(Firebase 로그인은 사이트당 하나). 교사 화면은 학생 계정을 교사로 등록하지 않고 첫 화면으로 보낸다.
