# Tesk & Pesk 파일 구조

> 최종 정리일: 2026-04-17

---

## 현재 작동 중 (루트)

| 파일 | 역할 | 비고 |
|------|------|------|
| `tesk_teacher_v2.html` | 교사 대시보드 (메인) | 학급 경제, 학생 관리, AI 도우미, 공문서 등 |
| `pesk.html` | 학생 앱 (Pesk) | 매점, 은행, 주식, 글쓰기, 상담, 마이룸(아바타) |
| `avatar-sprites.js` | 마이룸 아바타 스프라이트 | LPC 에셋 68종 base64. `pesk.html`·`tesk_teacher_v2.html`이 `<script src>`로 로드 → **배포 시 함께 올려야 함** |
| `avatar-extras.js` | 마이룸 추가 아이템 | 방·펫·염색 팔레트. `pesk.html`·`tesk_teacher_v2.html`이 로드 → **배포 시 함께 올려야 함** |
| `avatar-female.js` | 여자 아바타 몸·머리 + 여성 의상 | LPC 여성 프레임 12종. `avatar-sprites.js` **다음에** 로드 → **배포 시 함께 올려야 함** |
| `pet-sprites.js` | 펫 도감 (벡터 픽셀) | 5종 × 3단계 진화 SVG. `pesk.html`이 로드 → **배포 시 함께 올려야 함** |
| `quiz-rating.js` | 학습 RPG 실력 레이팅 + 유형별 생성기 | 유형 24개(700~1620). `pesk.html`이 로드 → **배포 시 함께 올려야 함** |
| `rpg-monsters.js` | 학습 RPG 몬스터·경험치·지역 | 몬스터 10종 · 지역 3곳. `pesk.html`이 로드 → **배포 시 함께 올려야 함** |
| `shared/pesk-combat.js`, `shared/pesk-combat.css` | 무기 조작·펫 스킬·공격 기회 저장 규칙 및 화면 | `ADVENTURE.md`에 검증 및 확장 계획 정리 |
| `quiz-bank.js` | 학습 퀘스트 문제 생성기 | 초등 3~6학년. `pesk.html`·`tesk_teacher_v2.html`이 로드 → **배포 시 함께 올려야 함** |
| `AVATAR-CREDITS.md` | 아바타 그림 출처·라이선스 | CC-BY-SA 3.0 / GPL 3.0 표기 (삭제 금지) |
| `landing.html` | 학생 로그인 랜딩 | 학급코드 → 아이디/비밀번호 → Pesk 진입 |
| `master.html` | 마스터 관리자 대시보드 | 교사 승인, 전체 학급 관리, 사용량 대시보드 |
| `index.html` | .exe 위젯 전용 (우리학교) | PyQt5 데스크톱 위젯에서 로드하는 HTML. 다중사용자 미연동 |
| `shared/firebase-config.js` | 공통 설정(단일 소스) | firebaseConfig + 마스터 이메일. 웹 HTML 4종이 import |
| `firestore.rules` | Firebase 보안 규칙 | 배포 시 `firebase deploy --only firestore:rules` 또는 콘솔 붙여넣기 |
| `_redirects` | Cloudflare Pages 라우팅 | `/teacher` → v2, `/master` → master (루트 `/` = landing) |

## 빌드/배포 도구 (루트)

| 파일 | 역할 | 비고 |
|------|------|------|
| `widget.py` | .exe 위젯 PyQt5 런처 | index.html을 임베드하는 데스크톱 앱 |
| `worker/` | 주식 시세 Cloudflare Worker | 서버에서 시세 병렬 fetch(프록시 불필요). `npx wrangler deploy` |
| `functions/` | 경제 로직 Firebase Functions | 잔액·구매 트랜잭션. `firebase deploy --only functions` |
| `shared/pesk-economy-api.js` | 경제 함수 클라이언트 래퍼 | 학생 커스텀 토큰 로그인 + 함수 호출 |
| `shared/pesk-writing-store.js` | 글쓰기 개별 문서 저장·기존 기록 병합 | 학생·교사 공용. 규칙 배포 순서는 `WRITING-STORAGE.md` 참고 |
| `빌드하기.bat` | .exe 빌드 스크립트 (최신) | PyInstaller → dist/TeacherDashboard/ |
| `deploy-cloudflare.bat` | **유일한 웹 배포 스크립트** | 위젯 index.html 제외, shared/·PWA자산·_redirects 포함, landing을 index.html로 |

> 배포는 **Cloudflare Pages 로 일원화**되었습니다. 이전 Vercel 스크립트/설정은 `_archive/vercel-배포/` 로 이동했습니다(노출됐던 토큰 제거 — 폐기 권장).
| `선생님대시보드.bat` | 로컬에서 widget.py 실행 | `pythonw widget.py` 한 줄 |
| `TeacherDashboard.spec` | PyInstaller 빌드 명세 (현행) | `빌드하기.bat`이 참조 |
| `선생님대시보드.spec` | PyInstaller 빌드 명세 (한글) | TeacherDashboard.spec과 내용 동일 |

## 설정/숨김 파일 (루트)

| 파일/폴더 | 역할 |
|-----------|------|
| `.vercelignore` | Vercel 배포 시 제외 목록 |
| `.gitignore` | Git 무시 목록 |
| `.vercel/` | Vercel CLI 내부 캐시 |
| `.wrangler/` | Cloudflare Wrangler 캐시 |
| `.venv/` | Python 가상환경 |
| `__pycache__/` | Python 바이트코드 캐시 |

## 빌드 산출물

| 폴더 | 내용 |
|------|------|
| `build/` | PyInstaller 중간 빌드 파일 |
| `dist/` | 최종 .exe 및 ZIP (`TeacherDashboard-win64.zip`) |

## 문서

| 파일 | 내용 |
|------|------|
| `MULTI-USER-GUIDE.md` | 다중사용자 구조 배포 가이드 |
| `README_파일구조.md` | 이 파일 |
| `AVATAR-CREDITS.md` | 마이룸 아바타 그림 출처(LPC, CC-BY-SA 3.0 / GPL 3.0) |

---

## 아카이브 (_archive/) — 미사용, 삭제 안 함

### _archive/레거시_HTML/

| 파일 | 이유 |
|------|------|
| `tesk_teacher.html` | v1 교사 대시보드. `tesk_teacher_v2.html`로 완전 대체됨 |
| `design_preview.html` | Pesk 초기 디자인 목업. 라이브 서비스 아님 |
| `setup-test.html` | Firebase 연결 테스트용. 개발 완료 후 불필요 |

### _archive/중복_빌드스크립트/

| 파일 | 이유 |
|------|------|
| `build-exe.bat` | `빌드하기.bat`과 중복 (빌드하기가 더 완성도 높음) |
| `Tesk.spec` | `TeacherDashboard.spec`과 중복 (이름만 다른 구버전) |
| `배포하기.ps1` | `배포하기.bat`과 중복 (bat이 더 세련됨) |
