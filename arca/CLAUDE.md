# 아르카 연대기 (Arca Chronicles)

초등 학급용 웹 RPG. 1년 12부 이야기 = 수학 12단원(1학기 6부, 2학기 6부).
학생이 문제를 맞히면 별빛이 생기고, 그 별빛으로 안개가 지운 세계를 다시 쓴다.
전체 줄거리·인물·스킬 표는 `docs/아르카연대기_전체줄거리_12부.pdf` 에 있다. 이야기 관련 작업은 먼저 이 문서를 읽는다.

## 실행과 배포
- 빌드 도구 없음. `index.html` 을 브라우저로 열면 바로 실행된다 (file:// 로도 동작).
- `src/` 의 파일은 **일반 `<script>` 로 순서대로** 불러오고 전역 변수를 공유한다. 모듈(import/export)이 아니다.
  파일 순서를 바꾸거나 새 파일을 넣을 때는 `index.html` 의 `<script>` 순서를 지킨다(앞 파일의 상수를 뒤 파일이 쓴다).
- 파일 하나가 필요하면 `python tools/build_single.py` → `dist/arca-chronicles.html`.
- 외부 의존성은 Google Fonts(Gowun Batang, Gowun Dodum)뿐. 없어도 기본 글꼴로 동작.
- 저장소(tesk-pesk) 안의 `arca/` 폴더에 있다. 상위 폴더의 `../quiz-bank.js`(Pesk 문제 은행)를 불러오므로 저장소째로 연다. 이 폴더는 Cloudflare 배포 스크립트에 들어가지 않는다.
- 지문 은행을 고친 뒤에는 `node arca/tools/build_passages.cjs` 로 `data/passages.js` 를 다시 만든다.

## 파일 지도
| 파일 | 내용 |
|---|---|
| `src/01-core.js` | 캔버스(320×180, 타일 16px), 그리기 도우미 `P`(사각형)·`disc`, 해시 `hsh`, 디더 `dith`, 지형 테마 `TH`, 맵 도우미 `nm`·`FL`·`border`·`picks` |
| `src/02-town1-and-home.js` | 저장 `save`(localStorage `arca-v2`), 1부 퀘스트 `QS`, 1부 루멘 마을 `bT1`, 마이룸 `bHome`·가구 `FURD`, 1부 길목 r1·r2·r3·막다른 숲 d1 (손으로 만든 맵) |
| `src/03-tiles.js` | 충돌 `blk`, 타일 그리기 `ground`·`objDraw`, 건물 `bldDraw`, 맵 굽기 `paintMap` |
| `src/04-characters-and-data.js` | 사람 스프라이트 `person`(앞/뒤), 직업 `JOB`·스킬 `SKL`·`SKE`·`EFF`, 장비 `EQ`, 펫 `petDraw`, NPC 모양 `D`, 몬스터 `MON`, 문제 생성 `makeQ` |
| `src/05-player-state.js` | 플레이어·펫·전역 상태, 레벨/하트/스킬 칸 계산 |
| `src/06-world-semester1.js` | 2~6부 생성기: 길목 `RSPEC`→`genRoute`, 막다른 길 `genDead`, 마을 `TSPEC`→`genTown`, 랜드마크 `LMD`, 보스, 2~6부 퀘스트, 부 정보 `PARTS`, 6부 결말 `ending` |
| `src/06a-world-semester2.js` | 2학기(7~12부): 지형 색 `TH.gold·dream·white·snow`, 보스 `noxshade`·`warden`·`noxf`, 인물 모양, 랜드마크 `LMD.mill·spire·compass`, 길목 r15~r27·막다른 길 d6~d8, 마을 t7~t12(`TSPEC2`). `PARTS`·`PARTTOWN`·`CHAIN`·`DEADS` 에 이어 붙이고, 6부 왕궁 광장을 동쪽 출구가 있게 다시 만든 뒤 `wireEntries()`·지문 번호를 다시 돌린다 |
| `src/06b-study.js` | 공부 연결: 선생님 설정 `studyCfg`(localStorage `arca-study`), 맵→부 `MAP_PART`·`mapPart`, 단원 문제 `studyQ`(makeQ 가 먼저 부름), 지문 채우기 `fillPassages`·부별 추천 지문 `PART_PICKS` |
| `src/06c-story.js` | 이야기 장면(1~12부): 새 인물(핀·바르그·리토), 메인 지문 `STORY_BOOKS`, 서브 퀘스트 `side:1`(핵심 자리 조건·길 안내에서 빠짐)·펫 퀘스트 `pet:1`(펫이 있을 때만), 2학기 퀘스트, 스승 대사 `MLINES`·`storyJobLines`·`MENTOR_TALK`(직업별·진행별), 마을 사람 대사 `NPCL`(되살리기 전/후), 장면 `SC`(첫 방문)·`SC_BOSS`(보스 직전)·`SC_DONE`(마을 완료), 재생 `playScene`, 7부 나를 잊은 스승 `MENTOR_FORGOT`·`MENTOR_REMEMBER`, 마지막 결말 `storyFinale`(맞힌 문제 수 `save.solved` 를 보여 주고 `save.fin`). 본 장면은 `save.st` 에 기록 |
| `src/07-engine.js` | 지워진 곳(패치)·별빛 가루, 맵 불러오기 `loadMap`, 메인 퀘스트 길찾기 `rawGoal`·`goal`·`hop`, 대화·선택지, 전투, 마이룸 패널, 입력, 그리기 루프 `frame` |
| `src/08-ui.js` | 엔진 뒤에 붙는 화면·게임 요소: 휴대폰 화면 맞춤 `fitView`(W×H 를 바꿈)·메뉴(☰), 효과음 `sfx`(Web Audio, 끄기 `UI.mute`), 전투 연출 `fxHit`·`fxHurt`·`fxLunge`·`drawFx`·체력 막대, 틀린 문제 `noteWrong`·`PANEL.wrong`, 대화 얼굴 `drawPortrait`(openDlg 를 감쌈), 나침반 조각 `shardCount`·알림, 바랜 마을 `drawFade`·`fxRestore`, 마을 꾸미기 `decoMap`(간판·차양·굴뚝·소품), 스킬 이펙트 `fxSkill`, 건물 안 `bRoom`(lib1·lh1), 새 퀘스트(`talk` 전하기·`solve` 문제 풀어 주기), 일지·지도 칸, 시작 화면 |
| `src/09-field.js` | 길 위 전투: 문제 상자 `askField`, 공격이 닿음 `fieldStrike`, 부딪힘 `fieldContact`, 핵심 자리 보스 `fieldBoss`, 스킬 `fieldSkill`, 별빛 게이지 `FLD`(상단 표시), 다친 몬스터 체력 막대, 휴대폰 스킬 버튼 |
| `src/10-secrets.js` | 숨은 것(이스터에그): 별고양이 12·반응하는 사물·행동/이름/숫자 이스터에그·도서관 비밀 서고(lib2)·떠돌이 상인. 맵별 목록 `SEC`, 숨길 자리 찾기 `hidePos`·`openPos`(걸어서 갈 수 있는 칸만). **무엇이 어디 있는지는 `docs/비밀_목록.md`(선생님용)** |
| `src/11-travel.js` | 이동 편의: 정복한 맵 `conquered(id)` 에서 어디서든 순간이동(가 본 마을 + 정복한 길), 길목 도착 자리 `spawn` 자동, 마이룸에 들어갔다 나오면 원래 자리(`save.ret`, 쓰러졌을 땐 마지막 마을) |
| `docs/그림_업그레이드_기록.md` | 그림을 2등신 캐주얼풍으로 바꾸는 작업의 기록(결정·그리는 방법·적용 계획). **그림 작업은 이 문서를 먼저 읽는다.** 견본은 `prototypes/4_메이플풍_그림_견본.html`(벡터풍)·`prototypes/5_도트_견본.html`(도트풍, 선생님 참고 그림 기반) |
| `prototypes/` | 이전 시안(참고용). 옆에서 본 풍경 그림 12장은 나중에 이야기 장면 그림으로 재사용 가능 |
| `../quiz-bank.js` | Pesk 와 같은 수학 문제 은행 (학년·학기·단원·난이도). N부 = 그 학기 N단원 |
| `data/passages.js` | 자동 생성. 지문 은행 225편(3~4·5~6·심화 각 75편, `tools/literacy-bank/*.cjs`). `tools/build_passages.cjs` 로 만든다 |
| `data/passages.example.json` | (옛 형식 예시, 쓰지 않음) |

## 확정된 설계 (바꾸기 전에 선생님께 확인)
- 시점: 위에서 내려다보는 탑다운. 카메라가 따라다니는 큰 맵, 위아래 이동, 점프(J/Z)로 울타리·바위·통나무·한 칸 개울 넘기.
- 세계: 12부 마을은 **안전 구역**(몬스터 없음, 들어오면 하트 회복). 마을 사이 **길목 사냥터 3~5개**, 갈수록 강해짐(`tier` 1~5). 길목마다 **막다른 길**(보물 상자, 숨은 지문; 진행에 필수 아님).
- 진행 잠금: 앞 부 마을의 지워진 곳을 **모두** 다시 써야 다음 부 마을에 들어갈 수 있다. 각 구간 마지막 길목 끝에는 문지기 보스.
- 마을 되살리기: 지워진 곳 7군데(별빛 가루 3개씩) + 금빛 핵심 자리(가루 6개). 핵심 자리는 메인 지문 읽기 + 그 마을 퀘스트 2개 완료 후 열리고, 2부부터는 누르면 그 부 보스가 나온다.
- 별빛 가루: 몬스터 처치, 퀘스트, 지문 읽기, 보물 상자로 얻는다.
- 직업: 로비가 아니라 **1부 스토리 안**에서 스승 네 명 중 선택 → 첫 수련 문제 3개. 직업은 이후 바꿀 수 없음.
- 마이룸: 1부 숙소 = 마이룸. 게임 시작 위치. 침대(회복), 책장(스킬북), 옷장(장비·상점), 거울(내 정보), 상자(가방), 방석(펫).
- 전투(2026-11-14 선생님 제안으로 바꿈, `src/09-field.js`): **길 위 전투**. 공격 **Q**·스킬 **E·R·T·Y**(Lv 1/3/5/7에 칸 열림)를 걷다가 언제든 쓰고, 몬스터에 닿으면 작은 문제 상자가 뜬다. 맞히면 피해 그대로 + 별빛 게이지 ◆, **틀리면 피해 절반**(올림)이고 정답·풀이를 잠깐 보여 준다. 몬스터가 부딪혀 오면 **피하기 문제**(맞히면 피함, 틀리면 하트 감소). 스킬은 게이지를 쓴다. 몬스터 체력은 맵 위 막대. 답 1·2·3, 조사 스페이스/엔터. 옛 전투 모드(`startBattle`)는 남아 있지만 쓰지 않는다.
- 스킬: 1부 스킬은 첫 수련에서, k부 스킬은 k부 마을을 다 되살리면 배움. ★ 공부 도움 스킬과 펫 스킬은 자동 발동.
- 메인 퀘스트 화살표: 다른 맵에 있는 목표도 `hop()` 으로 다음 출구를 가리킨다. 서브(숨은 지문, 막다른 길)는 가리키지 않는다.
- 미니맵: 걸어간 곳만 밝혀짐. 위쪽에 현재 구간(마을 › 길목들 › 다음 마을, 갈림길)을 표시.
- 쓰러지면 마이룸에서 회복, 벌칙 없음. 마이룸에서 나가면 들어가기 전 자리로(쓰러졌을 땐 마지막 마을).
- 순간이동: 정복한 맵(되살린 마을, 그 부를 끝냈거나 문지기를 물리친 길목)에서 어디서든. 걷는 속도는 2026-11-14 요청으로 빠르게(2.6/2.2).

## 콘텐츠 추가하는 법
- 길목 추가: `RSPEC` 에 항목 추가(`theme`, `tier`, `mons`, `node`, `prev`/`next`, 막다른 길이면 `dead`), `CHAIN` 과 `DEADS` 갱신. 출입 좌표는 `wireEntries()` 가 자동 연결.
- 마을 추가: `TSPEC` 에 추가(`lm` 랜드마크, `blds`, `npcs`, `spots` 6개 중 첫째가 메인 지문), `PARTS` 와 `PARTTOWN` 에 부 정보 추가. 랜드마크 그림은 `LMD` 에.
- 몬스터: `MON` 에 `{n,hp,dmg,dif,exp,dust,gold,spd,dr}`; 길목 단계에 따른 강화는 `mstat()`.
- 퀘스트: `QS.push({id,map,npc,type:'kill'|'gather'|'talk'|'solve',mon|item,n,title,where,offer,prog,done,rw})`. `side:1` 이면 서브(핵심 자리를 여는 데 필요 없음). `talk` 는 `to`(받는 사람)·`toMap`·`got`(받는 사람 대사), `solve` 는 `dif` 난이도로 부탁한 사람 앞에서 문제 n개.
- 건물 안: `bRoom(id, 이름, 돌아갈 마을, 돌아갈 좌표, 가구, 사람)` 후 마을 건물에 `to`·`at` 를 붙인다(`src/08-ui.js`).
- 이야기 장면: `06c-story.js` 의 한 줄 = `[누가, 대사, 조건]`. 누가는 `nar`·`me`·`pet`·`mentor`·인물 id, 대사는 문자열 또는 직업별 객체, 조건 `warm`/`cool` 은 1부 카이 선택. 엔진은 `storyEnter`·`storyBoss`·`storyPartDone`·`storyTalk`·`storyLines`·`storyJobLines` 만 부른다.
- 지문: 각 맵의 `spots`. 번호는 `CHAIN` 순서로 자동(1년 105자리). 학년 수준 75편을 다 쓰면 한 단계 위 수준(`LEVEL_NEXT`)에서 이어 채운다. 본문 `p` 가 있거나 `main` 인 자리는 이야기 전용이라 그대로 두고, 나머지는 `fillPassages()` 가 지문 은행에서 채운다(부별 추천 `PART_PICKS` 먼저, 그다음 분야를 돌아가며). 문제 `q` 는 `[질문, 보기들, 정답 번호(0부터)]` 목록.
- 문제: `makeQ(dif)` 가 `studyQ(dif)` 를 먼저 부른다. 길목 단계 dif 1~2→은행 tier 1, 3→2, 4~5→3. 보기는 3개(정답+오답 2).

## 다음 할 일
1. ~~3단계 · 2학기(7~12부)~~ (완료: 마을·길목·보스·장면·결말). 남은 것: 실제로 끝까지 플레이하며 난이도·분량 조정, 2학기 마을 건물 내부.
2. ~~4단계 · 지문과 단원 문제~~ (연결 완료, 1년 105자리: 이야기 지문 12편 + 지문 은행 93편). 남은 것: 문제 은행에 없는 단원(예: 4-1 4·5단원, 6-2 3단원) 보충 — Pesk 쪽 `quiz-bank.js` 이므로 합칠 때 정한다.
3. **다른 앱 연결**: 학생 계정·진행 저장·선생님 대시보드. 지금은 기기 브라우저(localStorage)에만 저장된다. `save` 객체가 저장 단위다.
4. 2~12부 마을 건물 내부, 난이도 실제 플레이 조정.

## 알려진 주의점
- `hsh()` 결과는 32비트 부호 없는 정수. 배열 인덱스로 쓸 때는 `>>>` 를 쓴다(`>>` 는 음수가 나올 수 있음).
- 맵은 처음 불러올 때 한 번 그려서(`paintMap`) 캐시한다. 지형이 바뀌면 해당 타일만 `ground()` 로 다시 그린다.
- 마을 패치의 연필 밑그림은 맵 전체 가장자리 검출이라, 큰 맵에서 첫 진입 때 잠깐 걸릴 수 있다.
- 한 사람이 퀘스트를 여러 개 줄 수 있다: `qFor(n)` 이 끝나지 않은 것부터 준다. 퀘스트 대사의 `{pet}` 은 `storyText` 가 펫 이름으로 바꾼다.
- `curPart()`(07-engine)는 이야기 진행 단계(0부터)이고, `mapPart()`(06b)는 지금 서 있는 맵의 부(1부터)다. 헷갈리지 않게.
- 화면 크기 `W`·`H` 는 `let` 이다(휴대폰에서 바뀜). 화면 좌표 계산에 320·180 을 직접 쓰지 않는다.
- 엔진 함수 `openDlg`·`hud`·`drawFx`·`storyTalk` 등은 뒤 파일이 감싸서(원래 함수를 부른 뒤 덧붙임) 기능을 더한다. 고칠 때 감싼 쪽도 확인한다.
- 전역 이름이 많다. 새 전역을 만들 때 기존 이름(`M`, `G`, `O`, `B`, `T`, `W`, `H`, `x` 등)과 겹치지 않게 한다.
