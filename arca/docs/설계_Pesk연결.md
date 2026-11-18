# 설계안 · 아르카 ↔ Pesk 연결 (프롬프트 H, 2026-11-15) — 선생님 확인 전

선생님 결정: Pesk 마이룸 옷 = **(나) 한 벌 방식**(아르카 `src/04b-items.js` 옷 14벌·남녀 몸), 이미 산 Pesk 상의는 비슷한 한 벌로 1:1, 머리·하의·신발·모자는 보관함에 그대로. 시범 학급 5학년.
이 문서는 Pesk 파일을 **읽기만** 하고 쓴 설계안이에요. 아직 Pesk 파일은 하나도 고치지 않았어요. 운영 배포·학생 기록 일괄 변환은 하지 않아요.

## 지금 Pesk (읽은 것)
- 로그인: `landing.html`(학급 코드 → 아이디/비밀번호) → `pesk.html`. 로그인 정보는 `localStorage` 의 `pesk-room-id`·`pesk-student-num`·`pesk-student-name`·`pesk-account-uid`·`pesk-session-version`. 서버 인증(`shared/pesk-student-auth.js`, Custom Token)은 준비만 되어 있고 꺼져 있음(`STUDENT-AUTH.md`).
- 데이터: `classrooms/{학급}/data/{키}`. 모험은 학생별 문서 `data/pesk-quiz-progress/students/{번호}`(`shared/pesk-quiz-store.js`), 반 요약 `data/pesk-quiz-summary`.
- 아바타·펫: `data/pesk-avatars`(반 전체 한 문서), 부위별(`face·hair·top·bottom·shoes·hat·weapon·room·pet`) LPC 그림(`avatar-sprites.js` 등).
- 경제: `pesk-purchases`·`pesk-purchase-log`·`tesk-students`(잔액), Functions(`functions/`) 준비. 문제: `quiz-bank.js`(아르카와 같이 씀).

## 단계 (한 단계씩 확인받으며)
| 단계 | 할 일 | 바꾸는 파일 | 확인 |
|---|---|---|---|
| **H1 로그인으로 열기** | Pesk 모험 탭에 「아르카 연대기」 단추. 아르카는 같은 출처(`/arca/`)에 두고 Pesk 의 `localStorage` 로그인 정보를 읽어 학생 번호·학급을 안다. 로그인 안 했으면 지금처럼 혼자 하기. | `pesk.html`(단추 1개), 배포 스크립트에 `arca/` 포함(배포는 선생님이) | 학생 계정으로 열리고, 이름 대신 번호만 쓰는지 |
| **H2 진행·학습 기록 서버 저장** | `save`(arca-v2, 약 20~40KB)와 학습 기록(arca-log, 약 30KB)을 학생 문서 하나에. 쓰기는 마을에 들어갈 때·창을 닫을 때·5분마다(한 시간 수업에 약 15번). 기기를 바꾸면 서버 것을 불러옴(더 최근 것 우선). | 새 `arca/src/22-sync.js`, Pesk `firestore.rules`(블록 1개 추가) | 두 기기에서 이어 하기, 규칙 검사 |
| **H3 선생님 대시보드** | Tesk 교사 화면 모험 현황에 「아르카」 칸: 학생별 진도(부·마을·Lv)·정답률·▼ 단원(teacher.html 과 같은 계산). | `tesk_teacher_v2.html`(읽기만 하는 표 1개) | 30명 학급 가상 데이터로 화면 |
| **H4 아이템·펫 공유와 옷 한 벌** | `04b-items.js` 를 Pesk 도 불러서 같은 아이템 id·등급 사용. Pesk 마이룸 옷 = 한 벌 그림(아르카 `av-<m|f>-<옷>`). 이미 산 Pesk **상의 → 비슷한 한 벌** 1:1 표, 머리·하의·신발·모자는 보관함(지우지 않음). 학생이 마이룸을 처음 열 때 **그 학생 것만** 바꿔 줌(일괄 변환 없음). | `pesk.html`(마이룸), 새 `shared/arca-items.js`(04b 복사본 또는 같은 파일 링크) | 옛 아바타 학생·새 학생 둘 다 |
| **H5 반 공동 보스·협동** | 아르카 핵심 자리 보스를 Pesk 반 공동 보스(`pesk-quiz-summary` 의 `__classBossQuest`)와 연결: 아르카에서 맞힌 보스 문제가 반 보스 피해로도 들어감. | `22-sync.js`, `shared/pesk-boss-quest.js` 호출만 | 동시 접속 5명 가상 검사 |

## 바꾸는 문서 경로와 규칙
| 경로 | 쓰는 쪽 | 크기 | 규칙(제안) |
|---|---|---|---|
| `classrooms/{학급}/data/arca-progress/students/{번호}` (새) | 학생 본인·교사 | 60~80KB(save+log) | 읽기: 교사·관리자·**본인만**. 쓰기: 본인만, `request.resource.size < 300000`, `app == "arca"`. 보안 안 걸린 학급(`!isSecuredRoom`)은 지금 `pesk-quiz-progress` 와 같은 수준 → **시범 학급은 보안 학급 권장** |
| `classrooms/{학급}/data/pesk-quiz-summary` (있음) | 학생(보스 피해 트랜잭션) | 그대로 | 바꾸지 않음(지금 규칙 그대로 씀) |
| `classrooms/{학급}/data/pesk-avatars` (있음) | 학생 본인 칸 | +옷 한 벌 id | 기존 규칙 그대로, 필드만 추가(`outfit`, 옛 부위는 남김) |

규칙 검사: 기존 `tests/*.test.cjs`(규칙 모의 검사 270개 포함)를 그대로 통과 + 새 경로 검사(본인 읽기/쓰기 허용, 남의 문서 거부, 크기 초과 거부) 추가.

## 용량·비용
- 학생 30명 × 하루 15번 쓰기 = 450번/일, 읽기는 열 때 1번 → Firebase 무료 한도(쓰기 2만/일) 안.
- 문서 80KB × 30명 = 2.4MB/학급.

## 정해 주실 것
1. 이 순서(H1 → H5)로 갈까요? H1(Pesk 에 단추 하나 + 같은 출처에서 열기)부터 시작해도 될까요?
2. 학습 기록은 **본인과 선생님만** 읽게(친구는 못 봄) 할까요? (지금 Pesk 모험 기록은 같은 반 학생이 읽을 수 있는 구조)
3. 시범 학급을 **보안 학급**(학생 로그인 필요)으로 운영하실 수 있나요?
