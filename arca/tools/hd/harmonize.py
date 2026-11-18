"""같은 테마의 이어지는 지형 묶음끼리 풀색(앞 지형)을 맞춘다.
기준: <테마>-path 의 풀. <테마>-water·<테마>-sand 의 풀 색을 밝기 순서대로 기준 풀 색에 짝지어 바꾼다.
바닷가(-sea)의 모래는 -sand 의 모래에 맞춘다.
사용법: python3 harmonize.py 원본tiles폴더 결과tiles폴더   (원본은 PixelLab 에서 받은 그대로)"""
import sys, pathlib, shutil
from PIL import Image

src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])


def lum(c):
    return c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11


def palette(im, box=None):
    im = im.convert("RGBA")
    if box:
        im = im.crop(box)
    cnt = {}
    for c in im.getdata():
        if c[3] > 200:
            cnt[c] = cnt.get(c, 0) + 1
    return cnt


def quad_palette(d, masks):
    # 앞(또는 뒤) 지형만 있는 구석 네 개(24×24)를 모아 그 지형의 색을 얻는다
    cnt = {}
    for k, m in enumerate(masks):
        sx, sy = (k % 2) * 24, (k // 2) * 24
        for c, n in palette(Image.open(d / ("%d.png" % m)), (sx + 2, sy + 2, sx + 22, sy + 22)).items():
            cnt[c] = cnt.get(c, 0) + n
    return cnt


def mapping(srcp, refp):
    # 밝기 순서 누적 비율이 같은 색끼리 짝짓기
    s = sorted(srcp.items(), key=lambda kv: lum(kv[0]))
    r = sorted(refp.items(), key=lambda kv: lum(kv[0]))
    rt = sum(n for _, n in r)
    st = sum(n for _, n in s)
    cum, out = 0, {}
    rc = []
    acc = 0
    for c, n in r:
        acc += n
        rc.append((acc / rt, c))
    for c, n in s:
        q = (cum + n / 2) / st
        cum += n
        out[c] = next((cc for qq, cc in rc if qq >= q), rc[-1][1])
    return out


def apply(d_in, d_out, mp):
    d_out.mkdir(parents=True, exist_ok=True)
    for p in sorted(d_in.glob("*.png")):
        im = Image.open(p).convert("RGBA")
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                c = px[x, y]
                if c in mp:
                    m = mp[c]
                    px[x, y] = (m[0], m[1], m[2], c[3])
        im.save(d_out / p.name)


FIRST = [14, 13, 11, 7]
SECOND = [1, 2, 4, 8]
for d in sorted(src.iterdir()):
    if d.is_dir() and not (dst / d.name).exists():
        shutil.copytree(d, dst / d.name)
themes = sorted({d.name.split("-")[0] for d in src.iterdir() if d.name.endswith("-path")})
for th in themes:
    ref = quad_palette(src / (th + "-path"), FIRST)
    for kind in ("water", "sand"):
        d = src / (th + "-" + kind)
        if not d.exists():
            continue
        g = quad_palette(d, FIRST)
        apply(d, dst / d.name, mapping(g, ref))
        print(th, kind, len(g), "->", len(ref))
    if (src / (th + "-sea")).exists() and (src / (th + "-sand")).exists():
        sref = quad_palette(src / (th + "-sand"), SECOND)
        sg = quad_palette(src / (th + "-sea"), FIRST)
        apply(src / (th + "-sea"), dst / (th + "-sea"), mapping(sg, sref))
        print(th, "sea sand", len(sg), "->", len(sref))
