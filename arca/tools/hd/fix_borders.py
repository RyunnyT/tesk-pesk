"""PixelLab 타일 가장자리의 흰 띠(최대 10점)를 잘라 내고, 남은 그림을 이어 붙여(반복) 48점을 다시 채운다.
사용법: python3 fix_borders.py 원본폴더 결과폴더"""
import sys, pathlib
from PIL import Image


def white(c):
    return c[3] < 200 or (c[0] + c[1] + c[2] > 640 and max(c[:3]) - min(c[:3]) < 30)


def fix(im):
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    row = lambda y: sum(1 for x in range(w) if white(px[x, y])) / w
    col = lambda x: sum(1 for y in range(h) if white(px[x, y])) / h
    t = next((i for i in range(10) if row(i) < 0.5), 0)
    b = next((i for i in range(10) if row(h - 1 - i) < 0.5), 0)
    l = next((i for i in range(10) if col(i) < 0.5), 0)
    r = next((i for i in range(10) if col(w - 1 - i) < 0.5), 0)
    if not (t or b or l or r):
        return im, (0, 0, 0, 0)
    src = im.crop((l, t, w - r, h - b))
    sw, sh = src.size
    out = Image.new("RGBA", (w, h))
    for oy in range(0, h, sh):
        for ox in range(0, w, sw):
            out.paste(src, (ox, oy))
    return out, (t, b, l, r)


if __name__ == "__main__":
    src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for p in sorted(src.glob("*.png")):
        im, k = fix(Image.open(p))
        im.save(dst / p.name)
        print(p.name, k, end="  ")
    print()
