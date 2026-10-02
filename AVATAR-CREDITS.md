# 아바타 그림 출처

Pesk 마이룸의 아바타 캐릭터 그림은 **Universal LPC Spritesheet Character Generator**의
무료 스프라이트를 사용했습니다.

- 원본 저장소: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator
- 라이선스: **CC-BY-SA 3.0** 또는 **GPL 3.0**
- 사용 범위: 64×64 정면(아래 보기) 프레임만 추출해 `avatar-sprites.js`에 base64로 담았습니다.
- 여자 몸·머리와 여성 의상(블라우스·치마)은 같은 저장소에서 같은 방식으로 추출해
  `avatar-female.js`에 담았습니다. 원본 경로는 다음과 같습니다.
  - `spritesheets/body/bodies/female/idle.png`
  - `spritesheets/head/heads/human/female/idle.png`
  - `spritesheets/torso/clothes/blouse/female/walk/*.png`
  - `spritesheets/torso/clothes/blouse_longsleeve/female/walk/*.png`
  - `spritesheets/legs/skirts/{plain,straight,slit,overskirt,belle}/thin/idle.png`

## 원작자

LPC 스프라이트는 여러 픽셀 아티스트의 공동 작업물입니다. 이 프로젝트에서 사용한
몸·머리·표정·헤어·의상·모자·무기 파츠의 주요 원작자는 다음과 같습니다.

- bluecarrot16
- JaidynReiman
- Benjamin K. Smith (BenCreating)
- ElizaWy
- Johannes Sjölund (wulax)
- Stephen Challener (Redshrike)
- Marcel van de Steeg (MadMarcel)
- Matthew Krohn (makrohn)
- Nila122
- David Conway Jr. (JaidynReiman)
- Luke Mehl
- Thane Brimhall (pennomi)
- Manuel Riecke (MrBeast)

전체 목록과 파일별 상세 출처는 원본 저장소의 `CREDITS.csv`에서 확인할 수 있습니다.

## 파생 아이템 (avatar-extras.js)

고급 모자·소지품 12종은 **원본 파츠를 새로 그린 것이 아니라, 기존 파츠의 색을 바꾼 파생물**입니다.
브라우저 캔버스에서 실행 시점에 색상(`color` 블렌드)과 밝기(`screen`)만 조정하며, 형태는 원본 그대로입니다.

| 파생 아이템 | 원본 파츠 |
|---|---|
| 황금 왕관 · 장미 왕관 | `hat/a_crown` |
| 서리 티아라 | `hat/a_tiara` |
| 흑철 투구 | `hat/a_barbuta` |
| 화염 뿔투구 | `hat/a_horned` |
| 비취 후드 | `hat/a_hood` |
| 불꽃 검 · 서리 검 | `weapon/w_sword` |
| 비전 지팡이 | `weapon/w_staff` |
| 황금 도끼 | `weapon/w_axe` |
| 장미 수정 | `weapon/w_crystal` |
| 폭풍 창 | `weapon/w_spear` |

## CC-BY-SA 3.0 준수 사항

- 출처 표기: 이 파일과 마이룸 화면 하단에 표기했습니다.
- **변경 사실 명시**: 원본 스프라이트를 64×64 정면 프레임으로 잘랐고, 위 12종은 색을 변경한 파생물입니다.
- **동일조건변경허락**: 파생물에도 원본과 같은 CC-BY-SA 3.0 / GPL 3.0 조건이 그대로 적용됩니다.
  이 저장소의 `avatar-sprites.js`, `avatar-extras.js` 를 재배포할 때도 같은 조건을 유지해야 합니다.

## 자체 제작물 (LPC 라이선스와 무관)

- **🐾 펫 8종** (`avatar-extras.js`) — 16×16 픽셀아트를 직접 제작했습니다. LPC 에셋에서 파생된 것이 아닙니다.
- **🏠 방 테마 8종** — 그림 파일 없이 CSS 그라디언트로만 구현했습니다.
- **🎨 머리·옷 색상** — 원본 파츠의 색을 실행 시점에 바꾸는 것으로, 파생물에 해당하며 CC-BY-SA 조건을 따릅니다.
