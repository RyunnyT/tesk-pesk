# 타일 가장자리의 비어 있는(투명) 칸을 가장 가까운 칠해진 칸 색으로 메운다. 사용: python3 fill_edges.py 입력.png 출력.png
import sys
from PIL import Image
def fill(im):
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    solid = [[px[x, y][3] >= 250 for x in range(w)] for y in range(h)]
    from collections import deque
    q = deque((x, y) for y in range(h) for x in range(w) if solid[y][x])
    col = {(x, y): px[x, y] for (x, y) in q}
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            a, b = x + dx, y + dy
            if 0 <= a < w and 0 <= b < h and (a, b) not in col:
                c = col[(x, y)]
                col[(a, b)] = (c[0], c[1], c[2], 255)
                q.append((a, b))
    out = Image.new("RGBA", (w, h))
    o = out.load()
    for (x, y), c in col.items():
        o[x, y] = c
    return out
if __name__ == "__main__":
    fill(Image.open(sys.argv[1])).save(sys.argv[2])
