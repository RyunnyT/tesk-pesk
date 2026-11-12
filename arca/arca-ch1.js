/* 📖 아르카 연대기 — 1장 「견습생의 날」 대본
   큰 줄거리는 모든 직업이 같다. 직업마다 달라지는 곳은 세 군데뿐이다.
     · 스승과 수련장 (JOBS)
     · 대사 안의 {knight, warrior, mage, archer} 갈래
     · 직업 수련 서브퀘스트
   대사의 {name} 은 학생 이름, {pet} 은 펫 이름, {mentor} 는 스승 이름으로 바뀐다.
   문장은 3학년도 읽을 수 있게 짧게 쓴다. */
(function(root){
'use strict';

/* ── 등장인물 ── portrait 는 시제품용 그림 문자, 나중에 픽셀 그림으로 바꾼다 */
const NPCS = {
  momo:   { name:'모모',        portrait:'🦉', color:'#7a5c3a', role:'부엉이 사서' },
  dora:   { name:'도라',        portrait:'💁', color:'#b0546a', role:'길드 접수원' },
  kai:    { name:'카이',        portrait:'😼', color:'#3d5a8a', role:'라이벌 견습생' },
  marta:  { name:'마르타 할머니', portrait:'👵', color:'#a8743a', role:'빵집 주인' },
  oscar:  { name:'오스카',      portrait:'👴', color:'#4b6e7d', role:'등대지기' },
  bran:   { name:'브란',        portrait:'🛡️', color:'#5b6b8c', role:'은퇴한 성기사' },
  gord:   { name:'고르드',      portrait:'🔨', color:'#8c5b3b', role:'대장장이 용병대장' },
  iset:   { name:'이세트',      portrait:'🔮', color:'#6a4c9c', role:'천문탑의 마녀' },
  pila:   { name:'필라',        portrait:'🏹', color:'#3f7a4f', role:'숲 정찰대장' },
  narr:   { name:'',            portrait:'',   color:'#555',    role:'' }
};

/* ── 직업 ── weapon 은 Pesk 아바타 무기 그림 id */
const JOBS = {
  knight:  { name:'기사',  icon:'🛡️', mentor:'bran', weapon:'w_sword',
             place:'성기사단 연병장', placeIcon:'🏟️', skill:'방패 돌진',
             desc:'앞에 서서 모두를 지켜요. 쓰러지지 않는 힘이 장점이에요.' },
  warrior: { name:'전사',  icon:'⚔️', mentor:'gord', weapon:'w_axe',
             place:'고르드의 대장간', placeIcon:'⚒️', skill:'대지 가르기',
             desc:'막힌 길은 부수고 새 길을 열어요. 한 방이 가장 세요.' },
  mage:    { name:'마법사', icon:'🔮', mentor:'iset', weapon:'w_staff',
             place:'천문탑 서재', placeIcon:'🔭', skill:'별빛 화살',
             desc:'오래된 기록을 읽고 봉인을 풀어요. 아는 것이 곧 힘이에요.' },
  archer:  { name:'궁수',  icon:'🏹', mentor:'pila', weapon:'w_dagger',
             place:'숲 정찰 초소', placeIcon:'🌲', skill:'연속 사격',
             desc:'남보다 먼저 찾아내고 멀리서 맞혀요. 눈이 가장 밝아요.' }
};

/* ── 장소 ── train 의 이름은 직업마다 바뀐다 */
const LOCATIONS = [
  { id:'home',       name:'견습생 숙소', icon:'🛏️', desc:'작은 방 하나. 창문으로 등대가 보여요.' },
  { id:'train',      name:null,         icon:null,  desc:'스승님이 기다리는 곳이에요.' },
  { id:'guild',      name:'모험가 길드', icon:'🏰', desc:'의뢰 게시판과 접수대가 있어요.' },
  { id:'square',     name:'루멘 광장',   icon:'⛲', desc:'빵 굽는 냄새가 나는 광장이에요.' },
  { id:'library',    name:'길드 도서관', icon:'📚', desc:'별빛 기록이 잠든 책장이 끝없이 이어져요.' },
  { id:'field',      name:'동쪽 들판',   icon:'🌾', desc:'요즘 안개가 자주 끼는 들판이에요.' },
  { id:'lighthouse', name:'등대 언덕',   icon:'🗼', desc:'항구의 배들을 지키는 하얀 등대예요.' }
];

/* ── 아이템 ── 서브퀘스트에서만 나오는 이야기 전용 물건. Pesk 상점 물건과 섞이지 않는다.
   atk: 공격 보너스(전투 보너스 상한 안에서만), guard: 전투마다 한 번 막아 줌, heal: 회복량 */
const ITEMS = {
  jw1_knight:  { name:'견습 기사의 장검',   icon:'🗡️', kind:'weapon', job:'knight',  atk:3, desc:'브란이 젊을 때 쓰던 검. 날은 무디지만 마음은 곧아요.' },
  jw1_warrior: { name:'견습 전사의 손도끼', icon:'🪓', kind:'weapon', job:'warrior', atk:3, desc:'고르드가 직접 두드려 만든 첫 도끼예요.' },
  jw1_mage:    { name:'견습 마법사의 지팡이', icon:'🪄', kind:'weapon', job:'mage',  atk:3, desc:'끝에 아주 작은 별빛이 깃들어 있어요.' },
  jw1_archer:  { name:'견습 정찰병의 단검', icon:'🔪', kind:'weapon', job:'archer',  atk:3, desc:'가볍고 빨라요. 필라의 표식이 새겨져 있어요.' },
  scarf:       { name:'따끈한 목도리',       icon:'🧣', kind:'costume', desc:'마르타 할머니가 떠 준 목도리. 빵 냄새가 나요.' },
  collar:      { name:'별빛 목걸이',         icon:'📿', kind:'pet', guard:1, desc:'펫이 전투마다 한 번 공격을 막아 줘요.' },
  shardbit1:   { name:'숨은 파편 조각 Ⅰ',   icon:'✨', kind:'key', desc:'아주 작은 별빛 조각. 모두 모으면 무언가가 열린대요.' },
  potion:      { name:'회복 물약',           icon:'🧪', kind:'use', heal:40, desc:'전투 중에 마시면 체력을 40 되찾아요.' }
};

/* ── 몬스터 ── art 는 Pesk 펫 그림을 다른 색으로 칠해 쓴다 */
const MONSTERS = {
  fogslime: { name:'안개 슬라임', hp:60, hit:12, art:{pet:'slime', stage:3,
              pal:{B:'#b7bdd6', D:'#6f7796', L:'#eef0fa', N:'#c9cde3'}},
              line:'뽀글… 뽀글… (지워진 기록을 먹고 자란 슬라임이에요!)' },
  boardrat: { name:'창고 쥐 떼', hp:36, hit:8, art:{pet:'rabbit', stage:1,
              pal:{B:'#9b8f84', D:'#5e544c', L:'#c9bfb5'}},
              line:'찍찍! 길드 창고의 밀가루를 노려요.' }
};

/* ── 장면(대사) ──
   한 줄: {who, text}  · text 는 문자열 또는 {knight, warrior, mage, archer}
   who: npc id · 'me'(주인공) · 'pet' · 'mentor'(직업 스승) · 'narr'(해설)
   only:[직업] 이면 그 직업만 보는 줄 · choices 는 선택지 (flag 를 남긴다) */
const SCENES = {
  ch1_intro: [
    { who:'narr', text:'왕국 아르카. 이 세상의 모든 것은 별빛 기록 위에 서 있어요.' },
    { who:'narr', text:'마을의 이름도, 길도, 사람들의 추억도 모두 별빛으로 쓰여 있지요.' },
    { who:'narr', text:'300년 전, 그 기록을 지우려던 "대망각"이 있었어요. 현자들은 별의 나침반을 만들어 세상을 지켜 냈어요.' },
    { who:'narr', text:'그리고 올봄. 항구 마을 루멘에 한 견습생이 도착했어요.' },
    { who:'momo', text:'일어나요, {name}! 오늘은 견습생의 날이잖아요. 첫날부터 늦으면 안 되죠!' },
    { who:'momo', text:'나는 길드 도서관의 사서 모모. 오늘부터 당신의 길잡이예요. 부엉이라고 얕보면 곤란해요.' },
    { who:'pet',  text:'(…{pet}이(가) 기지개를 켜며 꼬리를 흔들어요.)' },
    { who:'momo', text:'{pet}도 같이 가요. 자, 스승님이 {place}에서 기다려요!' }
  ],
  ch1_mentor: [
    { who:'mentor', text:{
      knight:'네가 {name}(이)구나. 나는 브란. 한때 성기사였지. 지금은 무릎이 시원찮은 늙은이일 뿐이다.',
      warrior:'오, 왔냐! 내가 고르드다. 망치질 소리에 놀라지 마라. 여긴 원래 시끄러워!',
      mage:'조용히 들어와요. 별들이 아직 자고 있으니까. 나는 이세트, 이 천문탑의 주인이에요.',
      archer:'…뒤에서 다가오는 발소리, 다 들렸어. 나는 필라. 숲 정찰대장이야.' } },
    { who:'mentor', text:{
      knight:'기사는 칼보다 먼저 방패를 든다. 지킬 사람이 있어야 칼에도 뜻이 생기지.',
      warrior:'전사는 길이 막히면 길을 만든다. 근데 무작정 휘두르면 팔만 아프다. 알았냐?',
      mage:'마법은 외우는 게 아니에요. 이해한 만큼만 빛나요.',
      archer:'정찰병은 먼저 본 사람이 이겨. 보는 법부터 배우자.' } },
    { who:'mentor', text:{
      knight:'모험가가 되기 전에 꼭 알아야 할 것이 있다. 이 세상에서 배운 것은 "별빛"이 된다.',
      warrior:'잘 들어. 이 세상에선 배운 게 전부 "별빛"이 돼. 진짜야!',
      mage:'먼저 이것부터 알려 줄게요. 이 세상에서 배운 것은 모두 "별빛"이 돼요.',
      archer:'하나만 기억해. 여기선 배운 게 "별빛"이 돼.' } },
    { who:'mentor', text:{
      knight:'문제를 하나 풀 때마다, 네 안의 별빛이 한 줄씩 세상을 다시 쓰지. 그게 모험가의 진짜 힘이다.',
      warrior:'문제 하나 풀 때마다 별빛이 한 줄씩 세상을 다시 쓴다고. 그게 모험가의 진짜 힘이지!',
      mage:'문제를 하나 풀 때마다 별빛이 한 줄씩 세상을 다시 써요. 그게 모험가의 진짜 힘이에요.',
      archer:'문제 하나 풀면 별빛 한 줄. 그 빛이 세상을 다시 써. 그게 우리 힘이야.' } },
    { who:'me',   text:'공부가… 힘이 된다고요?' },
    { who:'mentor', text:{
      knight:'그래. 방패도 마음도 아는 만큼 단단해진다. 세 문제만 풀어 보거라.',
      warrior:'그래! 내 도끼보다 세다니까. 일단 세 개만 풀어 봐!',
      mage:'그래요. 이 탑의 별자리도 누군가 풀어 낸 문제들이에요. 세 문제만 풀어 볼까요?',
      archer:'응. 과녁도 문제도 똑같아. 집중하면 맞아. 세 개만 맞혀 봐.' } }
  ],
  ch1_mentor_done: [
    { who:'narr', text:'마지막 답을 맞히는 순간, 손끝에서 작은 별빛이 반짝였어요.' },
    { who:'mentor', text:{
      knight:'보았느냐. 그 빛이 네 방패가 될 거다.',
      warrior:'봤냐?! 그게 바로 힘이야. 하하하!',
      mage:'아름답죠? 처음 빛을 본 날은 잊히지 않아요.',
      archer:'…괜찮은데. 처음치고는.' } },
    { who:'mentor', text:{
      knight:'이제 길드에 가서 견습생 등록을 하거라. 첫 의뢰가 기다리고 있을 거다.',
      warrior:'자, 길드 가서 등록하고 와! 첫 의뢰가 기다린다!',
      mage:'이제 길드에 가서 견습생 등록을 해요. 첫 의뢰가 기다리고 있을 거예요.',
      archer:'길드 가서 등록해. 첫 의뢰, 금방 나올 거야.' } }
  ],
  ch1_guild: [
    { who:'dora', text:'어서 와요! 모험가 길드 루멘 지부예요. 견습생 {name}, 등록 완료!' },
    { who:'dora', text:'그런데 마침 잘 왔어요. 요즘 동쪽 들판에 이상한 안개가 끼고, 그 안에서 슬라임이 나온대요.' },
    { who:'kai',  text:'그 정도 의뢰는 견습생 아무나 해도 되겠네.' },
    { who:'narr', text:'게시판 앞에 서 있던 아이가 고개도 돌리지 않고 말했어요. 망토에 아카데미 수석 배지가 반짝였어요.' },
    { who:'kai',  text:'나는 카이. 난 더 큰 의뢰를 받을 거야. 너는 슬라임이나 잡아.' },
    { who:'kai',  text:{
      knight:'기사라고? 방패 뒤에 숨어서 뭘 하겠다는 거야.',
      warrior:'전사라고? 힘만 세서는 아무것도 못 지켜.',
      mage:'마법사라고? 책만 읽다가 넘어지지나 마.',
      archer:'궁수라고? 숨어서 쏘는 게 그렇게 대단해?' } },
    { who:'me', text:'…', choices:[
      { label:'"같이 가 볼래? 혼자보다 나을걸."', flag:'kai_warm' },
      { label:'"내 일은 내가 할게. 너도 잘해."',  flag:'kai_cool' }
    ] },
    { who:'kai', when:'kai_warm', text:'…흥. 난 혼자가 편해. (카이가 잠깐 멈칫했다가 돌아섰어요.)' },
    { who:'kai', when:'kai_cool', text:'당연하지. 누가 먼저 이름을 날리는지 보자고.' },
    { who:'dora', text:'에휴, 저 아이는 늘 저래요. 자, {name}의 첫 의뢰! 동쪽 들판의 안개 슬라임을 물리쳐 주세요.' }
  ],
  ch1_battle_before: [
    { who:'narr', text:'동쪽 들판. 한낮인데도 안개가 낮게 깔려 있어요.' },
    { who:'pet',  text:'(…{pet}이(가) 털을 곤두세우고 낮게 으르렁거려요.)' },
    { who:'narr', text:'안개 속에서 뽀글뽀글 소리가 나더니, 회색 슬라임이 튀어나왔어요!' },
    { who:'me',   text:{
      knight:'모두 물러서요! 내가 막을게요!',
      warrior:'왔구나! 도끼 맛 좀 봐라!',
      mage:'배운 대로… 별빛을 모아서!',
      archer:'(숨을 고르고) 저기, 빈틈이 보여.' } }
  ],
  ch1_after_battle: [
    { who:'narr', text:'슬라임이 터지며 안개가 걷혔어요. 그런데…' },
    { who:'narr', text:'들판 끝의 길이 사라져 있었어요. 아니, 길이 있던 자리가 하얀 종이처럼 텅 비어 있었어요.' },
    { who:'me',   text:'길이… 지워졌어?' },
    { who:'momo', text:'{name}! 괜찮아요? 도서관 지도에서 이 들판이 갑자기 흐려져서 날아왔어요!' },
    { who:'momo', text:'이건… 별빛 기록이 지워진 자국이에요. 300년 동안 한 번도 없던 일인데.' },
    { who:'narr', text:'하얀 자리 위에 작은 별빛 가루가 떨어져 있었어요. 따뜻하게 반짝였어요.' },
    { who:'momo', text:'그 가루, 잘 챙겨요. 도서관에서 같이 조사해 봐요.' }
  ],
  ch1_lore: [
    { who:'momo', text:'여기 있다. 『별의 나침반에 관한 기록』.' },
    { who:'momo', text:'300년 전 대망각 때, 현자들은 세상의 기록을 지키려고 별의 나침반을 만들었어요.' },
    { who:'momo', text:'나침반이 있는 한, 지워진 기록은 다시 쓰일 수 있대요. 그런데…' },
    { who:'narr', text:'모모가 책장 맨 위를 가리켰어요. 나침반이 놓여 있던 받침대가 텅 비어 있었어요.' },
    { who:'momo', text:'지난주에 나침반이 깨졌어요. 조각 열 개가 왕국 곳곳으로 흩어졌고요. 길드는 아직 쉬쉬하고 있어요.' },
    { who:'me',   text:'그럼 아까 그 들판도…' },
    { who:'momo', text:'맞아요. 조각이 없는 곳부터 기록이 지워지고 있는 거예요. 그리고 지워진 자리에서 안개 괴물이 생겨나요.' },
    { who:'momo', text:'하지만 아까 봤죠? 당신이 문제를 풀 때 생긴 별빛이 슬라임을 물리쳤어요. 그 빛이면 지워진 걸 다시 쓸 수 있어요.' },
    { who:'momo', text:'스승님께 이 일을 알려요. 분명 도움이 될 거예요.' }
  ],
  ch1_mentor_end: [
    { who:'mentor', text:{
      knight:'나침반이 깨졌다고…? (브란이 오래된 방패를 쓰다듬었어요.) 30년 전에도 비슷한 안개를 본 적이 있다.',
      warrior:'뭐라고?! (고르드가 망치를 내려놓았어요.) 그럼 내가 만든 다리도, 길도 다 지워질 수 있다는 거냐!',
      mage:'역시… 요즘 별자리 하나가 흐려졌어요. 별이 먼저 알고 있었던 거예요.',
      archer:'숲 북쪽 길도 어제 하얗게 비었어. 사냥꾼들은 길을 잃었다고만 생각했지.' } },
    { who:'mentor', text:{
      knight:'{name}, 너는 오늘 들판을 지켰다. 그건 이미 기사의 일이다.',
      warrior:'{name}, 넌 오늘 길을 하나 되찾았어. 그게 전사의 일이다!',
      mage:'{name}, 당신은 오늘 처음으로 기록을 다시 썼어요. 그건 마법사만 할 수 있는 일이에요.',
      archer:'{name}, 넌 남들이 못 본 걸 먼저 봤어. 정찰병다웠어.' } },
    { who:'mentor', text:{
      knight:'등대 언덕에 가 보거라. 오스카 영감이 요즘 등대가 이상하다고 하더구나.',
      warrior:'등대 언덕에도 가 봐. 오스카 영감이 등대가 이상하다고 투덜대더라.',
      mage:'등대 언덕에 가 봐요. 오스카 씨가 요즘 등대 불빛이 이상하다고 했어요.',
      archer:'등대 언덕 가 봐. 오스카 할아버지가 등대가 이상하대.' } }
  ],
  ch1_lighthouse: [
    { who:'oscar', text:'오, 견습생이구먼. 마침 잘 왔네. 이 등대가 말이야…' },
    { who:'narr',  text:'그때였어요. 해가 지자 켜져야 할 등대 불이, 깜빡… 깜빡… 하더니 꺼져 버렸어요.' },
    { who:'oscar', text:'이럴 수가! 불씨는 그대로인데 빛만 사라졌어. 이러면 오늘 밤 배들이 항구를 못 찾아!' },
    { who:'narr',  text:'바다 쪽에서 짙은 안개가 밀려왔어요. 안개 속 깊은 곳에서 무언가 커다란 것이 움직였어요.' },
    { who:'narr',  text:'언덕 아래에서 카이가 바다를 노려보고 있었어요. 그의 손에도 별빛 가루가 쥐어져 있었어요.' },
    { who:'kai',   text:'…너도 왔냐. 이 안개, 그냥 안개가 아니야.', when:'kai_warm' },
    { who:'kai',   text:'…또 너냐. 방해하지 마.', when:'kai_cool' },
    { who:'momo',  text:'{name}. 이건 시작일 뿐이에요. 별의 나침반 조각을 찾아야 해요.' },
    { who:'narr',  text:'— 1장 「견습생의 날」 끝 —' }
  ],
  /* 서브퀘스트 */
  sq_bread_start: [
    { who:'marta', text:'아이고, 견습생이구나. 할미 부탁 하나만 들어줄래?' },
    { who:'marta', text:'등대지기 오스카 영감한테 빵을 갖다줘야 하는데, 오늘따라 무릎이 쑤시네.' },
    { who:'marta', text:'바구니에 빵을 나눠 담아야 하는데 셈이 헷갈려서 말이야. 좀 도와주겠니?' }
  ],
  sq_bread_mid: [
    { who:'marta', text:'고맙다, 고마워! 셈이 아주 정확하구나. 이제 등대 언덕으로 가져다주렴.' }
  ],
  sq_bread_end: [
    { who:'oscar', text:'마르타 빵이로구먼! 이 냄새를 맡아야 하루가 시작되지.' },
    { who:'oscar', text:'고맙네, 견습생. 마르타가 이것도 전해 달라더군. 자네 주라고 떴다던데.' },
    { who:'narr',  text:'바구니 밑에 손으로 뜬 목도리가 곱게 접혀 있었어요.' }
  ],
  sq_train_start: [
    { who:'mentor', text:{
      knight:'방패 수련이다. 내가 던지는 공을 하나도 놓치지 말고 막아 내라. 다섯 번!',
      warrior:'장작 패기다! 장작을 정확히 반으로 갈라야 해. 다섯 개!',
      mage:'룬 필사예요. 별자리 룬을 정확히 옮겨 적어 봐요. 다섯 개.',
      archer:'과녁 수련. 움직이는 과녁 다섯 개. 하나라도 빗나가면 처음부터야… 는 농담이고.' } }
  ],
  sq_train_end: [
    { who:'mentor', text:{
      knight:'좋다. 이걸 받거라. 내가 너만 할 때 쓰던 검이다. 무디지만, 부러진 적은 없지.',
      warrior:'잘했어! 상으로 이거 가져가. 내가 밤새 두드린 손도끼다!',
      mage:'훌륭해요. 이 지팡이를 줄게요. 끝에 별빛이 조금 남아 있어요. 당신을 알아볼 거예요.',
      archer:'합격. 이 단검 가져. 내 표식이 있으니까 숲에선 누구도 널 함부로 못 해.' } }
  ],
  sq_dream_start: [
    { who:'narr', text:'그날 밤, 숙소. {pet}이(가) 꿈속에서 말을 걸었어요.' },
    { who:'pet',  text:'{name}… 들려? 나야, {pet}.' },
    { who:'pet',  text:{
      dog:'오늘 슬라임한테 짖었던 거 봤지? 사실 엄청 무서웠어. 그래도 네 옆이라 괜찮았어.',
      cat:'흥, 오늘 슬라임 정도는 나 혼자서도 됐거든. …그래도 네가 있어서 좀 편했어.',
      slime:'뽀글. 오늘 그 슬라임… 나랑 닮았는데 눈이 텅 비어 있었어. 무서웠어.',
      rabbit:'귀가 쫑긋했어! 안개 속에서 이상한 소리가 들렸거든. 노래 같았어. 슬픈 노래.',
      chick:'삐약! 나도 언젠가 크게 날 수 있을까? 너를 지키고 싶어.',
      other:'오늘 정말 멋졌어. 나도 더 강해지고 싶어.' } },
    { who:'pet',  text:'하늘의 별을 세 개만 이어 줘. 그러면 나도 별빛을 조금 나눠 받을 수 있대.' }
  ],
  sq_dream_end: [
    { who:'narr', text:'별 세 개가 이어지자, {pet}의 목에 작은 별빛 목걸이가 생겼어요.' },
    { who:'pet',  text:'이제 내가 너를 한 번은 꼭 지켜 줄게. 약속!' }
  ],
  sq_book_start: [
    { who:'momo', text:'아, {name}. 혹시… 책 한 권 못 봤어요? 『잊힌 노래』라는 얇은 책이요.' },
    { who:'momo', text:'오늘 아침부터 안 보여요. 그 책, 300년 전 이야기가 적힌 아주 오래된 책인데.' },
    { who:'narr', text:'책장 사이를 뒤지다 보니, 맨 아래 칸 구석에서 얇은 책 한 권이 나왔어요.' }
  ],
  sq_book_end: [
    { who:'momo', text:'찾았어요! 고마워요. 어머, 책장 사이에서 이게 떨어졌네요.' },
    { who:'narr', text:'아주 작은 별빛 조각이었어요. 나침반 조각보다 훨씬 작았지만, 똑같은 빛이 났어요.' },
    { who:'momo', text:'이상하네요. 이런 조각은 기록에도 없어요. …잘 간직해 둬요. 언젠가 꼭 필요할 거예요.' }
  ],
  board: [
    { who:'dora', text:'길드 게시판이에요! 오늘의 의뢰: 창고 쥐 떼 쫓기, 짐 정리, 계산 심부름… 문제 다섯 개면 하나 끝나요.' }
  ]
};

/* ── 읽기 지문 (오늘의 지문과 같은 방식: 읽고 답하기) ── */
const PASSAGES = {
  forgottenSong: {
    title:'잊힌 노래',
    text:[
      '아주 먼 옛날, 아르카에는 노래로 기록을 남기는 사람들이 있었어요.',
      '그들은 마을에 일이 생길 때마다 노래를 지어 불렀어요. 노래를 들은 아이들은 그 노래를 외워 다음 아이들에게 들려주었지요.',
      '그런데 어느 해, 노래를 부르던 사람들이 하나둘 노래를 잊기 시작했어요. 노래를 잊은 마을은 이름도 함께 잊었어요.',
      '마지막 남은 노래꾼은 잊히지 않으려고 노래를 별빛으로 바꾸어 하늘에 걸어 두었어요. 사람들은 그것을 처음 쓰인 별빛 기록이라고 불러요.'
    ],
    questions:[
      { q:'옛날 아르카 사람들은 무엇으로 기록을 남겼나요?', options:['노래','그림','돌','편지'], answer:'노래' },
      { q:'마지막 노래꾼은 왜 노래를 별빛으로 바꾸었나요?', options:['잊히지 않으려고','돈을 벌려고','친구를 부르려고','길을 찾으려고'], answer:'잊히지 않으려고' }
    ]
  }
};

/* ── 퀘스트 ──
   steps.kind: talk(장면 보기) · solve(문제 풀기, count개 맞히기) · battle(몬스터) · read(지문)
   needs: 먼저 끝내야 하는 퀘스트 · jobs: 그 직업만 · daily: 하루 횟수 */
const QUESTS = [
  { id:'m1', type:'main', title:'견습생의 날', giver:'momo', at:'home',
    summary:'스승님을 찾아가 첫 수련을 받아요.',
    steps:[
      { kind:'talk',  at:'home',  scene:'ch1_intro' },
      { kind:'talk',  at:'train', scene:'ch1_mentor' },
      { kind:'solve', at:'train', count:3, label:'첫 수련: 별빛 깨우기' },
      { kind:'talk',  at:'train', scene:'ch1_mentor_done' }
    ] },
  { id:'m2', type:'main', title:'첫 의뢰', giver:'dora', at:'guild', needs:['m1'],
    summary:'길드에 등록하고 동쪽 들판의 안개 슬라임을 물리쳐요.',
    steps:[
      { kind:'talk',   at:'guild', scene:'ch1_guild' },
      { kind:'battle', at:'field', monster:'fogslime', before:'ch1_battle_before' },
      { kind:'talk',   at:'field', scene:'ch1_after_battle' }
    ] },
  { id:'m3', type:'main', title:'지워진 길', giver:'momo', at:'library', needs:['m2'],
    summary:'지워진 들판의 비밀을 알아내고 스승님께 알려요.',
    steps:[
      { kind:'talk', at:'library',    scene:'ch1_lore' },
      { kind:'talk', at:'train',      scene:'ch1_mentor_end' },
      { kind:'talk', at:'lighthouse', scene:'ch1_lighthouse' }
    ], endsChapter:true },

  { id:'s_bread', type:'sub', title:'마르타 할머니의 빵 배달', giver:'marta', at:'square', needs:['m1'],
    summary:'빵을 바구니에 나눠 담고 등대지기에게 가져다줘요.',
    steps:[
      { kind:'talk',  at:'square', scene:'sq_bread_start' },
      { kind:'solve', at:'square', count:3, label:'빵 나눠 담기' },
      { kind:'talk',  at:'square', scene:'sq_bread_mid' },
      { kind:'talk',  at:'lighthouse', scene:'sq_bread_end' }
    ], reward:{ items:['scarf'] } },
  { id:'s_train', type:'sub', kind:'job', title:'직업 수련 1단계', giver:'mentor', at:'train', needs:['m1'],
    summary:'스승님의 수련을 통과하고 첫 무기를 받아요.',
    steps:[
      { kind:'talk',  at:'train', scene:'sq_train_start' },
      { kind:'solve', at:'train', count:5, label:{knight:'방패 수련', warrior:'장작 패기', mage:'룬 필사', archer:'과녁 맞히기'} },
      { kind:'talk',  at:'train', scene:'sq_train_end' }
    ], reward:{ jobItem:'jw1', title:'수련생' } },
  { id:'s_dream', type:'sub', kind:'pet', title:'{pet}의 꿈', giver:'pet', at:'home', needs:['m2'],
    summary:'꿈속에서 펫과 함께 별을 이어요.',
    steps:[
      { kind:'talk',  at:'home', scene:'sq_dream_start' },
      { kind:'solve', at:'home', count:3, label:'별 이어 주기' },
      { kind:'talk',  at:'home', scene:'sq_dream_end' }
    ], reward:{ items:['collar'] } },
  { id:'s_book', type:'sub', kind:'hidden', title:'모모의 잃어버린 책', giver:'momo', at:'library', needs:['m2'],
    summary:'사라진 오래된 책을 찾아 읽어 봐요.',
    steps:[
      { kind:'talk', at:'library', scene:'sq_book_start' },
      { kind:'read', at:'library', passage:'forgottenSong' },
      { kind:'talk', at:'library', scene:'sq_book_end' }
    ], reward:{ items:['shardbit1'] } },
  { id:'board', type:'board', title:'길드 게시판 의뢰', giver:'dora', at:'guild', needs:['m1'], daily:3,
    summary:'매일 바뀌는 작은 의뢰. 공적 10점, 30점마다 보급 상자.',
    steps:[
      { kind:'talk',  at:'guild', scene:'board' },
      { kind:'solve', at:'guild', count:5, label:'오늘의 의뢰' }
    ], reward:{ merit:10 } }
];

const CHAPTER = { no:1, title:'견습생의 날', next:'2장 「꺼진 등대」', npcs:NPCS, jobs:JOBS,
  locations:LOCATIONS, items:ITEMS, monsters:MONSTERS, scenes:SCENES, passages:PASSAGES, quests:QUESTS,
  meritBox:{ every:30, items:['potion'] } };

root.ARCA_CH1 = CHAPTER;
if(typeof module === 'object' && module.exports) module.exports = CHAPTER;
})(typeof window !== 'undefined' ? window : globalThis);
