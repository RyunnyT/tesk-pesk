# 글쓰기 제출 용량 오류 수정

학급 전체 글을 `classrooms/{roomId}/data/pesk-writings`의 `value` 배열에 저장해서
Firestore 문서 한도(1,048,576바이트)에 도달하면 새 글 제출과 피드백 저장이 실패했다.

## 저장 방식

2026-09-29: 이미 읽음·피드백 처리한 글이 수정되면 목록과 상세 화면에 **수정된 글 확인** 버튼을 표시한다. 미확인 목록과 배지에도 수정 확인 대기 글을 포함한다. 확인 시 `needsRevisionReview`를 해제하고 `readBasisRevision`, `revisionReviewedAt`을 저장한다. 기존 읽은 날짜·피드백·평가를 보존하며, 읽기 확인만으로 이전 평가의 `rubricStale`을 해제하지 않는다. 화면에서 본 제목·본문·수정 차수와 서버의 최신 글이 다르면 확인 처리를 거부한다. 이후 다시 수정하면 재확인 대기에 들어간다.

- 새 글: `classrooms/{roomId}/data/pesk-writings/items/{writingId}`에 한 편씩 저장한다.
- 기존 글: 기존 배열을 그대로 읽는다. 자동 일괄 이전이나 원본 삭제는 하지 않는다.
- 기존 글 수정·피드백·읽음·평가: 같은 ID의 개별 문서에 최신 기록을 저장하고, 조회 시 원본보다 우선한다.
- 삭제: 개별 문서에 삭제 표시를 저장해 기존 배열의 글이 다시 나타나지 않게 한다.
- 학생/교사 목록: 두 저장소를 실시간으로 합치고 ID로 중복을 제거한다.
- 백업: 기존 백업 형식의 `docs['pesk-writings']`에 합쳐진 전체 목록을 넣는다.
  복원 시에는 글을 개별 문서에 저장하므로 전체 목록이 1MB를 넘어도 복원할 수 있다.
  복원은 여러 쓰기로 진행되며 원자적 작업이 아니므로 실패 시 같은 백업으로 재시도한다.

Firebase 공식 문서: [문서 크기 한도](https://firebase.google.com/docs/firestore/quotas),
[하위 컬렉션 구조](https://firebase.google.com/docs/firestore/manage-data/structure-data).
한 편 자체에는 여전히 문서 크기 제한이 적용된다.

## 배포 순서

1. 현재 `firestore.rules`를 먼저 배포한다.
   `firebase deploy --only firestore:rules --project tesk-pesk`
   새 `items` 경로의 권한이 없으면 학생 앱에서 목록 조회와 제출이 거부된다.
   `firestore.secure.rules`는 향후 경제 API 이전용 목표안이므로 대신 배포하지 않는다.
2. 학생 앱과 교사 앱을 함께 배포한다. 필수 변경 파일은 `pesk.html`,
   `tesk_teacher_v2.html`, `shared/pesk-writing-store.js`, `pesk-service-worker.js`다.
   기존 `deploy-cloudflare.bat`는 `shared/*.js`를 포함하므로 새 모듈도 복사한다.
3. 학생/교사 양쪽의 열려 있던 화면을 새로고침한다. 이전 화면은 여전히
   기존 큰 문서에 저장하려 하거나 새 글을 표시하지 못한다.
4. 테스트 학생으로 새 글 제출 → 교사 목록 확인 → 피드백 → 학생 수신을 확인한다.
   기존 글 조회·수정·읽음 처리와 백업도 확인한다.

2026-09-09에 현재 Firestore 규칙을 먼저 배포하고, 글쓰기 수정본을 Cloudflare Pages 운영 사이트에 배포했다.
운영 주소: https://tesk-pesk.pages.dev (배포 주소: https://dc795527.tesk-pesk.pages.dev).
학생 앱, 교사 앱, 글쓰기 저장 모듈, 서비스 워커의 운영 응답이 배포 원본과 일치하는지 SHA-256으로 확인했다.
운영 학생 계정으로 글을 제출하거나 기존 데이터를 일괄 이전하는 작업은 수행하지 않았다.
이후 개발한 모험 조작 기능은 이 배포에 포함되지 않았다.

2026-09-10에는 RPG/경제 수정본을 https://fc1659d9.tesk-pesk.pages.dev 로 추가 배포하고 운영 주소에 반영했다. 기존 글쓰기 수정도 유지하며, 학생·교사 앱과 글쓰기 저장 모듈·서비스 워커를 포함한 11개 운영 파일의 SHA-256 일치를 확인했다. Firestore 규칙은 다시 변경하거나 배포하지 않았다.

## 로컬 검증

`node --test --test-isolation=none tests/pesk-writing.test.cjs`

실제 HTML의 학생 제출/수정/삭제 및 교사 피드백/읽음/평가/삭제 함수를 메모리 저장소로 실행한다.
용량 초과 재현, 기존 기록 보존, 중복 제출, 저장 실패 시 초안 보존,
읽음 이후 수정 및 동시 읽음·피드백·평가 보존, 다른 학생 글 수정 차단,
읽은 글 삭제 차단, 실시간 병합, 1MB 초과 백업 복원을 검증한다.
운영 Firestore와 에뮬레이터 연결 테스트는 수행하지 않았다.

2026-09-17: 학생은 교사가 읽거나 피드백을 남긴 뒤에도 본인 글의 제목·내용을
수정할 수 있다. 수정 시 기존 읽음 표시, 검토 상태, 피드백, 평가를 보존하고
수정 시각과 횟수를 기록한다. 읽은 글의 삭제 제한은 유지한다.

2026-09-17 운영 배포 완료: https://68bfa456.tesk-pesk.pages.dev → https://tesk-pesk.pages.dev.
친구 관계도 제출·회차 구분·심층 문항 및 해석 개선과 읽음 후 글쓰기 수정 기능을 포함한다.
배포 전 관련 테스트 27개 통과. 운영 정적 파일 40개의 SHA-256이 배포본과 모두 일치하고
루트 로그인 화면 및 `/teacher` 경로도 확인했다. 검증 기록: `output/deployment-20260917.json`.
Firestore 규칙·Cloud Functions는 변경 배포하지 않았고 실제 학생 데이터를 수정하지 않았다.
