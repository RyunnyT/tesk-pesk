"""교사 안내서·학생 조작 안내 HTML 을 만든다. PDF 는 print_pdf.cjs 로 찍는다.
사용법: python3 arca/docs/guide/make_guides.py && node arca/docs/guide/print_pdf.cjs
부·단원 표는 units.json(게임의 partUnit·QUIZ.unitsOf 에서 뽑은 것)을 쓴다."""
import json, pathlib, html

D = pathlib.Path(__file__).resolve().parent
U = json.loads((D / "units.json").read_text(encoding="utf-8"))
E = html.escape

CSS = """
@page { size: A4; margin: 16mm 15mm 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: "WenQuanYi Zen Hei", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; color: #231f3a; font-size: 10.5pt; line-height: 1.65; margin: 0; }
h1 { font-size: 22pt; margin: 0 0 4mm; color: #2f2470; }
h2 { font-size: 14pt; margin: 8mm 0 2.5mm; color: #3b2f8a; border-bottom: 2px solid #d9d3f2; padding-bottom: 1mm; break-after: avoid; }
h3 { font-size: 11.5pt; margin: 4mm 0 1.5mm; color: #4a3a9a; break-after: avoid; }
p { margin: 0 0 2mm; }
ul, ol { margin: 0 0 2mm; padding-left: 6mm; }
li { margin: 0.6mm 0; }
.cover { background: linear-gradient(135deg, #2f2470, #5a4ab7); color: #fff; padding: 10mm 10mm 8mm; border-radius: 5mm; margin-bottom: 6mm; }
.cover h1 { color: #ffe9a8; }
.cover p { color: #ece8ff; font-size: 11pt; }
.box { background: #f4f1ff; border: 1px solid #ddd5ff; border-radius: 3mm; padding: 3mm 4mm; margin: 2mm 0 3mm; break-inside: avoid; }
.warn { background: #fff6e6; border-color: #f3d9a4; }
table { border-collapse: collapse; width: 100%; margin: 2mm 0 3mm; font-size: 9.2pt; break-inside: auto; }
th, td { border: 1px solid #d6d0ee; padding: 1.2mm 1.8mm; text-align: left; vertical-align: top; }
th { background: #ece7ff; }
tr { break-inside: avoid; }
.shot { width: 100%; border-radius: 2mm; border: 1px solid #ccc; margin: 1mm 0; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; break-inside: avoid; }
.two figure { margin: 0; }
figcaption { font-size: 8.5pt; color: #5a5480; text-align: center; }
.key { display: inline-block; border: 1px solid #8f86c4; border-bottom-width: 2px; border-radius: 1.5mm; padding: 0 1.6mm; font-size: 9pt; background: #fff; }
.muted { color: #6b6590; font-size: 9pt; }
.pb { break-before: page; }
"""


def unit_table():
    rows = []
    for i, part in enumerate(U["parts"]):
        no, town, boss = part.split("|")
        cells = "".join("<td>" + E(U["out"][g][i]) + "</td>" for g in ("3", "4", "5", "6"))
        rows.append("<tr><td>" + no + "부</td><td>" + E(town.split(" ", 1)[1] if " " in town else town) + "</td>" + cells + "</tr>")
    return (
        "<table><tr><th>부</th><th>마을</th><th>3학년</th><th>4학년</th><th>5학년</th><th>6학년</th></tr>" + "".join(rows) + "</table>"
        "<p class='muted'>1~6부는 1학기, 7~12부는 2학기 단원이에요. '준비 중'인 단원은 문제 은행에 아직 없어서 그 앞 단원들을 복습 문제로 내요.</p>"
    )


def fig(src, cap):
    return "<figure><img class='shot' src='img/" + src + "'><figcaption>" + E(cap) + "</figcaption></figure>"


TEACHER = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>아르카 연대기 교사 안내서</title><style>{CSS}</style></head><body>
<div class="cover"><h1>아르카 연대기 · 교사 안내서</h1>
<p>배운 것이 별빛이 되는 왕국의 1년 — 초등 3~6학년 학급용 학습 RPG</p>
<p class="muted" style="color:#d9d2ff">1년 12부 이야기 = 수학 12단원(1학기 6부 · 2학기 6부) · 지문 읽기 105편 · 영어 단어 선택 가능</p></div>

<h2>1. 한눈에 보기</h2>
<div class="box"><b>학생이 하는 일</b>
<ol>
<li>마을 사람에게 부탁(퀘스트)을 받고, 마을 밖 <b>길목</b>으로 나가요.</li>
<li>몬스터에게 공격이 닿으면 <b>문제 상자</b>가 떠요. 맞히면 공격이 그대로, 틀리면 절반만 들어가고 정답과 풀이를 보여 줘요.</li>
<li>몬스터를 물리치고 지문을 읽으면 <b>별빛 가루</b>가 모여요. 이 가루로 안개에 지워진 마을을 <b>다시 써요</b>.</li>
<li>마을을 모두 되살리고 길목 끝 <b>문지기</b>를 넘으면 다음 부로 가요. 12부를 마치면 1년 이야기가 끝나요.</li>
</ol></div>
<div class="two">{fig("town.jpg", "마을: 왼쪽 위는 상태·퀘스트, 오른쪽 위는 지도")}{fig("battle.jpg", "길목 전투: 공격이 닿으면 문제 상자")}</div>
<p>게임 안 숫자: 1년 지문 {U['spots']}편 · 퀘스트 {U['quests']}개 · 몬스터 {U['mons']}종 · 들어갈 수 있는 건물 {U['rooms']}곳 · 장비·가구 {U['items']}종.</p>

<h2>2. 시작하기</h2>
<h3>여는 법</h3>
<ul>
<li><b>링크로</b>: 선생님이 공유한 플레이 링크를 학생 기기 브라우저(크롬·엣지·사파리)에서 열어요. 태블릿·휴대폰도 돼요.</li>
<li><b>파일로</b>: <span class="key">dist/arca-chronicles.html</span> 파일 하나를 USB·학급 드라이브로 나눠 주고 더블클릭해도 돼요. 인터넷이 없어도 돌아가요.</li>
</ul>
<div class="box warn"><b>저장에 대해 꼭 알아 두세요</b><br>
지금은 진행 기록이 <b>그 기기의 브라우저</b>에 저장돼요. 다른 기기에서 열면 처음부터예요. 학생마다 같은 기기(같은 브라우저 계정)를 쓰게 해 주세요. 공용 기기를 쓰면서 '방문 기록 삭제'를 하면 기록이 지워져요.
<br><span class="muted">나중에 Pesk(학급 앱)와 연결하면 학생 계정으로 어디서든 이어 할 수 있게 될 예정이에요.</span></div>
<h3>조작</h3>
<table><tr><th>할 일</th><th>키보드</th><th>태블릿·휴대폰</th></tr>
<tr><td>걷기</td><td><span class="key">방향키</span> 또는 <span class="key">W A S D</span></td><td>왼쪽 아래 방향 버튼</td></tr>
<tr><td>말 걸기·조사·읽기</td><td><span class="key">스페이스</span> / <span class="key">엔터</span></td><td>오른쪽 '조사' 버튼</td></tr>
<tr><td>공격</td><td><span class="key">Q</span></td><td>'공격' 버튼</td></tr>
<tr><td>스킬</td><td><span class="key">E</span> <span class="key">R</span> <span class="key">T</span> <span class="key">Y</span> (Lv 1·3·5·7에 칸이 열림)</td><td>공격 버튼 위의 스킬 버튼 줄</td></tr>
<tr><td>점프(울타리·바위·개울)</td><td><span class="key">J</span> 또는 <span class="key">Z</span></td><td>'점프' 버튼</td></tr>
<tr><td>문제 답</td><td><span class="key">1</span> <span class="key">2</span> <span class="key">3</span></td><td>답 버튼 누르기</td></tr>
<tr><td>장비·가방</td><td><span class="key">I</span></td><td>오른쪽 위 '장비' 버튼</td></tr>
<tr><td>지도 접기/펴기</td><td><span class="key">M</span></td><td>'지도' 버튼</td></tr></table>

<h2>3. 선생님 설정</h2>
<p>게임 화면 위쪽 <b>「선생님 설정」</b> 버튼(또는 메뉴 ☰ → 선생님 설정)에서 바꿔요. 설정은 그 기기에 저장돼요.</p>
<table><tr><th>항목</th><th>고를 수 있는 것</th><th>설명</th></tr>
<tr><td>학년</td><td>3·4·5·6학년</td><td>문제 은행의 그 학년 단원 문제가 나와요.</td></tr>
<tr><td>지문 수준</td><td>학년에 맞춤 / 심화</td><td>3~4학년용·5~6학년용·심화 지문 중에서 채워요.</td></tr>
<tr><td>과목</td><td>수학 / 영어 단어 / 섞기</td><td>섞기는 수학 7 : 영어 3 정도로 나와요.</td></tr>
<tr><td>문제 범위</td><td>부에 맞춘 단원 / 학기 전체 섞기</td><td>'부에 맞춘 단원'은 N부에서 그 학기 N단원 문제만 내요.</td></tr></table>
<p>길목이 깊을수록(1~5단계) 같은 단원 안에서 더 어려운 문제가 나와요. 보기는 3개(정답 1 + 오답 2)예요.</p>

<h2 class="pb">4. 부와 단원 대응표</h2>
{unit_table()}

<h2>5. 배움이 일어나는 장치</h2>
<ul>
<li><b>틀려도 진행돼요</b>: 틀리면 피해가 절반이고, 정답·풀이를 잠깐 보여 줘요. 벌칙 대신 다시 생각할 기회를 줘요.</li>
<li><b>오답 노트</b>: 틀린 문제는 마이룸 패널의 '틀린 문제' 탭에 모여요. 마을 <b>서고·도서관</b>의 서고지기에게 말을 걸어도 열려요.</li>
<li><b>틀린 문제 다시 만나기</b>: 틀린 문제는 문제 6개쯤 뒤에 다시 나와요. 다시 만나서 맞히면 오답 노트에서 지워져요. 망각 유령·지우개 덩어리는 늘 틀린 문제를 들고 와요.</li>
<li><b>직업별 공부 도움</b>: 기사(틀려도 절반 확률로 막기)·전사(연속 정답에 강해짐)·마법사(첫 오답은 다시 생각)·궁수(틀린 보기 하나 지우기).</li>
<li><b>지문 읽기</b>: 마을·길목·막다른 길에 흩어진 지문 {U['spots']}편. 읽고 확인 문제를 풀면 별빛 가루를 받아요. 각 부의 메인 지문을 읽어야 마을의 핵심 자리가 열려요.</li>
<li><b>이번 부 단원</b>: 퀘스트 상자 맨 위에 지금 단원 이름이 보이고, 마을에 처음 들어가면 단원과 이야기를 잇는 한 줄이 나와요.</li>
<li><b>보스 3단계</b>: 보스는 체력 2/3에서 부하를 부르고, 1/3에서 문제가 한 단계 어려워져요. 단원 마무리 평가처럼 쓸 수 있어요.</li>
</ul>

<h2>6. 수업에서 쓰는 법</h2>
<h3>추천 흐름(한 번에 15~20분)</h3>
<ol>
<li><b>단원 도입 뒤</b>: 개념을 배운 날 그 부의 길목에서 연습해요. (예: 5학년 1학기 3단원을 배운 주 → 3부)</li>
<li><b>오늘의 목표</b>를 정해 줘요: "퀘스트 2개", "지워진 곳 3군데", "오답 노트 3문제 지우기" 등.</li>
<li><b>마무리 3분</b>: 오답 노트를 열어 친구와 한 문제씩 설명하기.</li>
</ol>
<h3>학급 활동 아이디어</h3>
<ul>
<li><b>학급 별빛 목표</b>: 반 전체가 되살린 마을 수를 칠판에 기록하고 목표를 넘으면 학급 보상. (Pesk 연결 뒤에는 자동으로 모을 예정)</li>
<li><b>지문 독서 기록</b>: 읽은 지문 제목을 독서 기록장에 적고, 지문 확인 문제를 짝과 바꿔 풀기.</li>
<li><b>보스 공동 공략</b>: 같은 부 보스 앞에서 막힌 친구를 '도우미'가 옆에서 설명해 주기(대신 풀어 주지 않기).</li>
</ul>

<h2>7. 장비·성장(RPG) 안내</h2>
<div class="two">{fig("me.jpg", "내 정보: 전투력·능력·입은 장비")}{fig("eq.jpg", "장비: 가방·비교(▲▼)·팔기")}</div>
<ul>
<li><b>직업</b>은 1부 수련장에서 스승 네 명 중 하나를 골라요. 직업을 얻으면 <b>견습 무기만</b> 받아요. 옷은 상점에서 사거나 몬스터·보물 상자에서 얻어요.</li>
<li><b>등급</b>: 일반 · <span style="color:#3a7ac0">레어</span> · <span style="color:#8a4ad0">유니크</span> · <span style="color:#c07a10">레전드</span>. 같은 아이템도 등급이 높을수록 능력이 크고 추가 능력이 0~3줄 붙어요.</li>
<li><b>레벨 제한</b>: 무기는 직업마다 7단계(Lv 1·3·6·9·12·15·18), 옷 14벌, 장신구 10종. 12부를 마칠 때 Lv 20쯤이 되도록 맞췄어요.</li>
<li><b>상점</b>: 마이룸 옷장, 마을의 상점·대장간 안. 하루에 한 번 '오늘의 레어'를 살 수 있어요. 게임 금화만 쓰고 실제 돈과는 상관없어요.</li>
<li><b>마이룸 꾸미기</b>: 상점에서 산 가구(29종)를 마이룸에 놓아요. 꾸미기 탭 → 놓기 → 원하는 칸 앞에서 조사.</li>
<li><b>겉모습</b>: 남·여 몸 중에서 고르고(내 정보 탭), 입은 옷이 그대로 보여요.</li>
</ul>
<div class="two">{fig("outfit.jpg", "옷을 입으면 겉모습이 바뀌어요")}{fig("home.jpg", "마이룸 꾸미기")}</div>

<h2>8. 마을 건물 안</h2>
<p>마을 건물 {U['rooms']}곳에 들어갈 수 있어요. 문 앞에서 조사하면 들어가요.</p>
<table><tr><th>건물</th><th>안에서 하는 일</th></tr>
<tr><td>상점·가게·대장간·공방</td><td>주인에게 말 걸면 상점이 열려요.</td></tr>
<tr><td>숙소·여관·기숙사</td><td>침대·주인에게 말 걸면 하트가 다 차요.</td></tr>
<tr><td>도서관·서고·서점·기록 보관소</td><td>서고지기가 오답 노트를 함께 봐요.</td></tr>
<tr><td>길드·본부·천막</td><td>다음에 할 일을 알려 줘요.</td></tr>
<tr><td>집</td><td>주민 이야기, 상자 선물(처음 한 번).</td></tr></table>

<h2>9. 접근성·화면 설정</h2>
<p>메뉴 ☰ 에서: <b>글자 크게</b> · <b>대사 읽어 주기</b>(브라우저 음성) · <b>흔들림 끄기</b> · <b>소리 끄기</b> · <b>옛 그림/새 그림</b>(느린 기기는 옛 그림이 가벼워요) · 전체 화면.</p>

<h2>10. 자주 묻는 것</h2>
<table><tr><th>질문</th><th>답</th></tr>
<tr><td>학생이 진행을 잃어버렸어요.</td><td>다른 기기·다른 브라우저로 열었거나 방문 기록을 지운 경우예요. 같은 기기를 쓰게 해 주세요.</td></tr>
<tr><td>처음부터 하고 싶어요.</td><td>화면 위 '처음부터'를 4초 안에 두 번 누르면 저장이 지워져요.</td></tr>
<tr><td>문제가 너무 어렵거나 쉬워요.</td><td>선생님 설정의 학년·문제 범위를 바꿔요. 길목이 깊을수록 어려워요.</td></tr>
<tr><td>영어도 하고 싶어요.</td><td>과목을 '영어 단어' 또는 '섞기'로 바꿔요.</td></tr>
<tr><td>숨은 요소가 궁금해요.</td><td>별고양이 12마리, 반응하는 사물, 비밀 서고, 떠돌이 상인 등이 있어요. 위치는 <span class="key">docs/비밀_목록.md</span>(선생님용).</td></tr></table>
<p class="muted">그림: 인물·몬스터·지도는 PixelLab으로 그렸어요. 문제 은행은 Pesk 문제 은행(quiz-bank.js)을 써요.</p>
</body></html>"""

STUDENT = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>아르카 연대기 조작 안내</title><style>{CSS}
body {{ font-size: 12pt; }} h1 {{ font-size: 20pt; }} .big td {{ font-size: 12pt; padding: 2mm 3mm; }}</style></head><body>
<div class="cover" style="padding:7mm 9mm"><h1>아르카 연대기 · 모험가 안내</h1><p>문제를 맞히면 별빛이 생겨요. 그 별빛으로 지워진 마을을 다시 써요!</p></div>
<table class="big"><tr><th>하고 싶은 것</th><th>키보드</th><th>태블릿</th></tr>
<tr><td>걷기</td><td><span class="key">←↑↓→</span> / <span class="key">WASD</span></td><td>방향 버튼</td></tr>
<tr><td>말 걸기 · 조사 · 읽기</td><td><span class="key">스페이스</span></td><td>조사</td></tr>
<tr><td>공격</td><td><span class="key">Q</span></td><td>공격</td></tr>
<tr><td>스킬</td><td><span class="key">E</span><span class="key">R</span><span class="key">T</span><span class="key">Y</span></td><td>스킬 버튼</td></tr>
<tr><td>점프</td><td><span class="key">J</span> / <span class="key">Z</span></td><td>점프</td></tr>
<tr><td>문제 답</td><td><span class="key">1</span><span class="key">2</span><span class="key">3</span></td><td>답 누르기</td></tr>
<tr><td>장비 · 가방</td><td><span class="key">I</span></td><td>장비</td></tr>
<tr><td>지도</td><td><span class="key">M</span></td><td>지도</td></tr></table>
<div class="two">{fig("battle.jpg", "몬스터에 공격이 닿으면 문제가 떠요")}{fig("hud.jpg", "왼쪽 위: 하트·레벨·퀘스트 (퀘스트 ▾ 를 누르면 접혀요)")}</div>
<div class="box"><b>모험의 약속</b>
<ul>
<li>틀려도 괜찮아요! 피해가 절반이 되고 풀이를 보여 줘요. <b>풀이를 꼭 읽어요.</b></li>
<li>틀린 문제는 나중에 <b>다시 만나요</b>. 맞히면 오답 노트에서 사라져요.</li>
<li>노란 화살표가 다음 할 일을 가리켜요. 막히면 마을 <b>길드</b>에 가 봐요.</li>
<li>쓰러져도 벌칙은 없어요. 마이룸에서 회복해요.</li>
<li>좋은 장비는 몬스터·보물 상자에서 나와요. 등급: 일반 · <span style="color:#3a7ac0">레어</span> · <span style="color:#8a4ad0">유니크</span> · <span style="color:#c07a10">레전드</span></li>
</ul></div>
</body></html>"""

(D / "교사안내서.html").write_text(TEACHER, encoding="utf-8")
(D / "학생_조작안내.html").write_text(STUDENT, encoding="utf-8")
print("ok")
