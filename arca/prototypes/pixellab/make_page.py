# PixelLab 견본 페이지 만들기: 이 폴더의 PNG를 한 파일 안에 넣어 ../6_PixelLab_견본.html 로 저장
import base64, os, json
D = os.path.dirname(os.path.abspath(__file__))
def u(p):
    return 'data:image/png;base64,' + base64.b64encode(open(os.path.join(D, p), 'rb').read()).decode()
img = {
  'nov': {d: u(f'novice/{d}.png') for d in ['south', 'east', 'north', 'west']},
  'kn': {d: u(f'knight/{d}.png') for d in ['south', 'east', 'north', 'west']},
  'walk': {d: [u(f'novice/walk_{d}/frame_00{i}.png') for i in range(4)] for d in ['south', 'east', 'north']},
  'n48': {d: u(f'novice48/{d}.png') for d in ['south', 'east', 'north', 'west']},
  'walk48': {d: [u(f'novice48/walk_{d}/frame_00{i}.png') for i in range(4)] for d in ['south', 'east', 'north']},
  'nowNov': u('now_novice.png'), 'nowKn': u('now_knight.png'),
  'base': u('scene_base.png'), 'over': u('scene_over.png'),
}
html = open(os.path.join(D, 'page_template.html'), encoding='utf-8').read().replace('/*IMG*/null', json.dumps(img))
open(os.path.join(D, '..', '6_PixelLab_견본.html'), 'w', encoding='utf-8').write(html)
print('ok', len(html))
