"""assets/hd 의 PNG 목록을 읽어 data/hd-assets.js(HDA)를 만든다. 사용법: python3 tools/hd/build_manifest.py
그림마다 크기(w,h)와 칠해진 범위(b: 왼쪽, 위, 오른쪽, 아래)를 적어 둔다. 게임은 이 값으로 발밑·머리 위치를 맞춘다."""
import json, pathlib, re
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent.parent
hd = root / "assets" / "hd"


def info(p):
    im = Image.open(p).convert("RGBA")
    bb = im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox() or (0, 0, im.width, im.height)
    return {"w": im.width, "h": im.height, "b": list(bb)}


A = {"chars": {}, "mons": {}, "pets": {}, "npc": {}, "misc": {}, "props": {}, "bld": {}, "tiles": {}, "icons": {}}
# 인물: chars/<키>/{south,east,north,west}.png, walk_<방향>_<i>.png
for d in sorted((hd / "chars").glob("*")) if (hd / "chars").exists() else []:
    if not (d / "south.png").exists():
        continue
    e = info(d / "south.png")
    e["walk"] = all((d / ("walk_%s_3.png" % k)).exists() for k in ("south", "east", "north"))
    e["west"] = (d / "west.png").exists()
    A["chars"][d.name] = e
# 한 장짜리 + 움직임(<키>_<i>.png)
for cat in ("mons", "pets", "npc", "misc", "props", "bld", "icons"):
    for p in sorted((hd / cat).glob("*.png")) if (hd / cat).exists() else []:
        # 아이콘 이름(w_knight_0)은 끝이 숫자라도 움직임 장면이 아니다
        if cat != "icons" and re.search(r"_\d+$", p.stem):
            continue
        e = info(p)
        n = 0
        while cat != "icons" and (hd / cat / ("%s_%d.png" % (p.stem, n))).exists():
            n += 1
        if n:
            e["n"] = n
        A[cat][p.stem] = e
# 지형: tiles/<키>/<0~15>.png
for d in sorted((hd / "tiles").glob("*")) if (hd / "tiles").exists() else []:
    n = len(list(d.glob("*.png")))
    if n >= 16:
        A["tiles"][d.name] = n
out = root / "data" / "hd-assets.js"
out.write_text(
    "// 자동 생성: python3 tools/hd/build_manifest.py  (그림은 assets/hd/, PixelLab 으로 그림)\n"
    "const HDA = " + json.dumps(A, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print("data/hd-assets.js:", {k: len(v) for k, v in A.items()})
