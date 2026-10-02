from __future__ import annotations

import base64
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "evolution-pixels-free"
SIZE = 128


def c(hex_color: str) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        255,
    )


P = {
    "ink": c("#17131b"),
    "ink2": c("#302635"),
    "line": c("#4c3542"),
    "white": c("#fff7e8"),
    "cream": c("#f7d994"),
    "warm": c("#e9b75c"),
    "yellow": c("#ffd94f"),
    "yellow_shadow": c("#e9a62c"),
    "orange": c("#f58d25"),
    "orange_shadow": c("#bd541e"),
    "red": c("#c93b2f"),
    "red_dark": c("#76282b"),
    "pink": c("#f295ad"),
    "cat": c("#ee8322"),
    "cat_shadow": c("#bd551f"),
    "cat_light": c("#ffd486"),
    "dog": c("#c1793e"),
    "dog_shadow": c("#7c4a31"),
    "dog_light": c("#e3a967"),
    "dog_muzzle": c("#f2d193"),
    "brown": c("#6b3f2e"),
    "rabbit": c("#f3efe3"),
    "rabbit_shadow": c("#c9c2ad"),
    "slime_blue": c("#49a7e8"),
    "blue": c("#4aa9e8"),
    "slime_blue_dark": c("#236fa7"),
    "slime_green": c("#56cf5b"),
    "slime_green_dark": c("#269246"),
    "mint": c("#a9f0a4"),
    "ice": c("#35d9f2"),
    "ice_dark": c("#137fc0"),
    "ice_light": c("#b8f8ff"),
    "steel": c("#aebdcc"),
    "steel_dark": c("#566676"),
    "steel_mid": c("#7f91a4"),
    "steel_light": c("#e7f4ff"),
    "gold": c("#f4c84a"),
    "gold_dark": c("#b67c27"),
    "violet": c("#836ee0"),
    "violet_dark": c("#4b3c8a"),
    "leaf": c("#4cca4f"),
}


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def rect(d: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], color: str) -> None:
    d.rectangle(xy, fill=P[color])


def ellipse(d: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], color: str) -> None:
    d.ellipse(xy, fill=P[color])


def poly(d: ImageDraw.ImageDraw, points: list[tuple[int, int]], color: str) -> None:
    d.polygon(points, fill=P[color])


def line(d: ImageDraw.ImageDraw, points: list[tuple[int, int]], color: str, width: int = 2) -> None:
    d.line(points, fill=P[color], width=width)


def outline_ellipse(d: ImageDraw.ImageDraw, outer: tuple[int, int, int, int], color: str, inset: int = 5) -> None:
    ellipse(d, outer, "ink")
    x0, y0, x1, y1 = outer
    ellipse(d, (x0 + inset, y0 + inset, x1 - inset, y1 - inset), color)


def eye(d: ImageDraw.ImageDraw, x: int, y: int, mood: str = "round") -> None:
    if mood == "angry_l":
        poly(d, [(x, y + 3), (x + 11, y), (x + 13, y + 12), (x + 2, y + 13)], "ink")
        rect(d, (x + 7, y + 2, x + 9, y + 4), "white")
    elif mood == "angry_r":
        poly(d, [(x, y), (x + 12, y + 3), (x + 10, y + 13), (x, y + 12)], "ink")
        rect(d, (x + 3, y + 2, x + 5, y + 4), "white")
    else:
        rect(d, (x, y, x + 8, y + 11), "ink")
        rect(d, (x + 2, y + 1, x + 4, y + 4), "white")


def sword(d: ImageDraw.ImageDraw, x: int, y: int, flip: bool = False) -> None:
    s = -1 if flip else 1
    poly(d, [(x, y), (x + s * 9, y - 5), (x + s * 55, y - 51), (x + s * 63, y - 49), (x + s * 17, y - 2)], "ink")
    poly(d, [(x + s * 8, y - 5), (x + s * 14, y - 9), (x + s * 56, y - 47), (x + s * 59, y - 46), (x + s * 17, y - 8)], "steel_light")
    line(d, [(x + s * 22, y - 15), (x + s * 52, y - 43)], "steel_mid", 2)
    rect(d, (min(x - 7, x + s * 14), y - 1, max(x + 7, x + s * 14), y + 5), "gold")
    rect(d, (x - 3, y + 2, x + 3, y + 14), "ink2")


def shield(d: ImageDraw.ImageDraw, x: int, y: int, color: str = "steel_dark", mark: str = "gold") -> None:
    poly(d, [(x, y + 4), (x + 22, y), (x + 42, y + 10), (x + 38, y + 45), (x + 22, y + 62), (x + 4, y + 45)], "ink")
    poly(d, [(x + 5, y + 9), (x + 22, y + 5), (x + 36, y + 13), (x + 33, y + 42), (x + 22, y + 54), (x + 9, y + 42)], color)
    rect(d, (x + 17, y + 15, x + 25, y + 43), mark)
    rect(d, (x + 10, y + 27, x + 32, y + 34), mark)
    rect(d, (x + 8, y + 11, x + 20, y + 16), "steel_mid")


def armor_plate(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int) -> None:
    rect(d, (x, y, x + w, y + h), "ink")
    rect(d, (x + 5, y + 3, x + w - 4, y + h - 5), "steel")
    rect(d, (x + 10, y + 8, x + w - 12, y + 16), "steel_light")
    rect(d, (x + 5, y + h - 10, x + w - 4, y + h - 5), "steel_dark")


def chick_evo1(d: ImageDraw.ImageDraw) -> None:
    poly(d, [(42, 21), (68, 18), (92, 36), (99, 66), (84, 95), (51, 100), (25, 80), (27, 43)], "ink")
    poly(d, [(45, 26), (68, 22), (87, 39), (94, 65), (80, 90), (52, 94), (31, 77), (32, 45)], "yellow")
    rect(d, (52, 23, 65, 28), "yellow_shadow")
    rect(d, (73, 31, 86, 39), "white")
    ellipse(d, (34, 66, 55, 88), "white")
    rect(d, (50, 78, 62, 89), "yellow_shadow")
    poly(d, [(93, 55), (117, 64), (93, 74)], "orange")
    rect(d, (104, 63, 115, 68), "orange_shadow")
    eye(d, 65, 48)
    rect(d, (45, 98, 53, 115), "orange_shadow")
    rect(d, (77, 98, 85, 115), "orange_shadow")
    rect(d, (39, 113, 57, 119), "orange")
    rect(d, (73, 113, 91, 119), "orange")


def chick_evo2(d: ImageDraw.ImageDraw) -> None:
    poly(d, [(27, 25), (65, 12), (101, 36), (111, 73), (93, 108), (49, 113), (20, 88), (18, 47)], "ink")
    poly(d, [(32, 30), (65, 18), (96, 40), (105, 72), (89, 101), (50, 106), (25, 84), (24, 49)], "yellow")
    rect(d, (51, 12, 60, 24), "yellow_shadow")
    rect(d, (63, 5, 74, 24), "yellow_shadow")
    rect(d, (77, 12, 87, 25), "yellow_shadow")
    poly(d, [(21, 62), (1, 75), (20, 89), (44, 75)], "ink")
    poly(d, [(23, 65), (8, 75), (22, 84), (43, 73)], "yellow_shadow")
    poly(d, [(105, 55), (127, 64), (105, 75)], "orange")
    ellipse(d, (38, 70, 69, 96), "white")
    rect(d, (46, 85, 70, 99), "cream")
    line(d, [(50, 66), (61, 58), (70, 48)], "yellow_shadow", 5)
    eye(d, 69, 45)
    rect(d, (39, 107, 55, 125), "orange_shadow")
    rect(d, (80, 106, 96, 125), "orange_shadow")
    rect(d, (34, 122, 61, 127), "orange")
    rect(d, (76, 122, 103, 127), "orange")


def chick_evo3(d: ImageDraw.ImageDraw) -> None:
    poly(d, [(17, 25), (61, 14), (96, 29), (119, 65), (103, 109), (52, 121), (16, 91), (9, 48)], "ink")
    poly(d, [(23, 31), (61, 20), (91, 34), (112, 65), (98, 101), (53, 114), (22, 87), (15, 51)], "yellow")
    rect(d, (39, 9, 52, 27), "red")
    rect(d, (55, 2, 69, 27), "red")
    rect(d, (72, 10, 88, 30), "red")
    armor_plate(d, 45, 54, 51, 39)
    rect(d, (51, 92, 97, 102), "steel_dark")
    poly(d, [(15, 53), (0, 38), (0, 77), (20, 72)], "yellow_shadow")
    line(d, [(25, 73), (36, 83), (50, 88)], "yellow_shadow", 6)
    poly(d, [(96, 26), (116, 6), (124, 16), (109, 38)], "brown")
    poly(d, [(101, 40), (128, 54), (105, 67)], "brown")
    poly(d, [(102, 64), (122, 91), (96, 88)], "brown")
    poly(d, [(112, 52), (128, 63), (112, 75)], "orange")
    eye(d, 63, 37)
    rect(d, (39, 114, 55, 127), "orange_shadow")
    rect(d, (78, 113, 98, 127), "orange_shadow")


def cat_evo1(d: ImageDraw.ImageDraw) -> None:
    poly(d, [(25, 52), (31, 17), (56, 46), (73, 46), (97, 17), (103, 52), (96, 91), (76, 110), (48, 110), (27, 91)], "ink")
    poly(d, [(31, 53), (36, 28), (56, 52), (73, 52), (92, 28), (97, 53), (90, 87), (74, 103), (50, 103), (33, 87)], "white")
    rect(d, (39, 37, 47, 59), "pink")
    rect(d, (83, 37, 91, 59), "pink")
    line(d, [(28, 78), (11, 70), (4, 57)], "ink", 6)
    line(d, [(29, 77), (13, 70), (8, 59)], "white", 3)
    eye(d, 47, 67, "round")
    eye(d, 76, 67, "round")
    rect(d, (62, 83, 68, 89), "pink")
    rect(d, (36, 91, 60, 103), "blue")
    rect(d, (20, 91, 34, 100), "rabbit_shadow")


def cat_evo2(d: ImageDraw.ImageDraw) -> None:
    poly(d, [(18, 48), (29, 13), (55, 43), (76, 43), (98, 13), (109, 48), (101, 94), (78, 117), (46, 117), (20, 94)], "ink")
    poly(d, [(25, 50), (33, 26), (56, 51), (76, 51), (94, 26), (102, 50), (95, 89), (75, 109), (48, 109), (27, 89)], "cat")
    ellipse(d, (42, 57, 85, 96), "cat_light")
    rect(d, (39, 35, 45, 41), "cat_shadow")
    rect(d, (63, 30, 70, 42), "cat_shadow")
    rect(d, (86, 36, 93, 43), "cat_shadow")
    line(d, [(25, 73), (8, 62), (1, 72), (8, 93)], "ink", 7)
    line(d, [(27, 74), (11, 64), (7, 72), (11, 89)], "cat", 4)
    line(d, [(98, 91), (116, 97), (124, 112)], "ink", 6)
    eye(d, 45, 62)
    eye(d, 78, 62)
    rect(d, (62, 81, 68, 88), "pink")
    rect(d, (43, 96, 86, 106), "white")
    rect(d, (40, 109, 58, 123), "cream")
    rect(d, (76, 109, 94, 123), "cream")


def cat_evo3(d: ImageDraw.ImageDraw) -> None:
    poly(d, [(17, 46), (29, 8), (55, 40), (76, 40), (99, 8), (111, 46), (104, 94), (80, 119), (44, 119), (18, 94)], "ink")
    poly(d, [(24, 50), (34, 25), (56, 52), (75, 52), (93, 25), (103, 50), (96, 88), (76, 110), (47, 110), (26, 88)], "cat")
    ellipse(d, (42, 54, 86, 90), "cat_light")
    armor_plate(d, 42, 78, 48, 33)
    rect(d, (45, 111, 90, 118), "cat_shadow")
    rect(d, (47, 20, 88, 34), "ink")
    rect(d, (52, 17, 83, 29), "steel")
    rect(d, (62, 7, 73, 24), "steel_light")
    sword(d, 95, 80)
    line(d, [(22, 78), (7, 61), (1, 68), (12, 91)], "ink", 6)
    line(d, [(26, 79), (12, 65), (8, 70), (16, 88)], "white", 3)
    eye(d, 36, 58, "angry_l")
    eye(d, 80, 58, "angry_r")
    rect(d, (62, 71, 68, 77), "pink")


def dog_evo1(d: ImageDraw.ImageDraw) -> None:
    outline_ellipse(d, (16, 34, 98, 97), "dog_light", 6)
    ellipse(d, (5, 37, 36, 76), "dog_shadow")
    ellipse(d, (84, 37, 116, 76), "dog_shadow")
    ellipse(d, (43, 63, 75, 92), "dog_muzzle")
    rect(d, (25, 87, 43, 110), "dog")
    rect(d, (74, 87, 92, 110), "dog")
    line(d, [(17, 76), (4, 66), (5, 52)], "ink", 7)
    eye(d, 42, 56)
    eye(d, 75, 56)
    rect(d, (58, 77, 65, 85), "ink")
    rect(d, (26, 110, 44, 123), "dog_shadow")
    rect(d, (73, 110, 92, 123), "dog_shadow")


def dog_evo2(d: ImageDraw.ImageDraw) -> None:
    outline_ellipse(d, (17, 27, 88, 84), "dog", 6)
    rect(d, (50, 61, 113, 89), "ink")
    rect(d, (56, 56, 108, 84), "dog_light")
    ellipse(d, (5, 31, 39, 70), "dog_shadow")
    ellipse(d, (78, 31, 109, 70), "dog_shadow")
    ellipse(d, (42, 59, 76, 89), "dog_muzzle")
    line(d, [(106, 63), (121, 45), (123, 23)], "ink", 7)
    line(d, [(109, 61), (119, 44), (121, 27)], "dog_light", 4)
    rect(d, (38, 88, 52, 114), "dog")
    rect(d, (82, 87, 97, 114), "dog")
    rect(d, (34, 114, 56, 123), "ink")
    rect(d, (78, 114, 101, 123), "ink")
    rect(d, (43, 88, 87, 98), "red")
    rect(d, (63, 98, 72, 110), "gold")
    eye(d, 38, 49)
    rect(d, (58, 72, 65, 80), "ink")


def dog_evo3(d: ImageDraw.ImageDraw) -> None:
    outline_ellipse(d, (15, 23, 90, 82), "dog_light", 6)
    rect(d, (48, 58, 115, 91), "ink")
    rect(d, (55, 53, 108, 84), "dog")
    ellipse(d, (3, 30, 40, 75), "dog_shadow")
    ellipse(d, (78, 30, 116, 75), "dog_shadow")
    armor_plate(d, 38, 76, 55, 40)
    rect(d, (29, 10, 45, 31), "steel")
    rect(d, (49, 5, 75, 29), "steel_light")
    rect(d, (78, 10, 94, 31), "steel")
    sword(d, 23, 75)
    shield(d, 87, 60, "steel_dark")
    eye(d, 40, 47, "angry_l")
    rect(d, (59, 66, 66, 74), "ink")
    rect(d, (41, 116, 58, 127), "steel_dark")
    rect(d, (75, 116, 92, 127), "steel_dark")


def slime_evo1(d: ImageDraw.ImageDraw) -> None:
    ellipse(d, (13, 43, 115, 103), "ink")
    ellipse(d, (20, 36, 108, 96), "slime_blue")
    rect(d, (20, 85, 108, 108), "slime_blue_dark")
    rect(d, (39, 47, 70, 56), "ice_light")
    eye(d, 44, 68)
    eye(d, 77, 68)
    rect(d, (58, 91, 75, 97), "ink")


def slime_evo2(d: ImageDraw.ImageDraw) -> None:
    ellipse(d, (6, 28, 122, 110), "ink")
    ellipse(d, (13, 22, 115, 102), "slime_green")
    rect(d, (13, 86, 115, 111), "slime_green_dark")
    rect(d, (36, 35, 76, 47), "mint")
    rect(d, (21, 67, 36, 78), "mint")
    eye(d, 45, 62)
    eye(d, 85, 62)
    rect(d, (61, 91, 83, 100), "ink")
    rect(d, (6, 20, 11, 25), "blue")
    rect(d, (116, 30, 121, 35), "blue")
    rect(d, (103, 58, 108, 63), "mint")


def slime_evo3(d: ImageDraw.ImageDraw) -> None:
    ellipse(d, (2, 35, 126, 115), "ink")
    ellipse(d, (9, 28, 119, 108), "ice")
    rect(d, (9, 87, 119, 116), "ice_dark")
    poly(d, [(20, 36), (34, 3), (50, 36)], "ice_light")
    poly(d, [(49, 34), (64, 0), (80, 34)], "ice_light")
    poly(d, [(78, 36), (96, 4), (110, 36)], "ice_light")
    rect(d, (32, 44, 79, 56), "ice_light")
    eye(d, 31, 66, "angry_l")
    eye(d, 85, 66, "angry_r")
    rect(d, (57, 96, 86, 105), "ink")
    rect(d, (21, 86, 28, 93), "violet")
    rect(d, (104, 86, 111, 93), "violet")
    rect(d, (5, 23, 12, 30), "blue")
    rect(d, (117, 23, 124, 30), "blue")


def rabbit_evo1(d: ImageDraw.ImageDraw) -> None:
    outline_ellipse(d, (31, 2, 50, 68), "white", 5)
    outline_ellipse(d, (78, 2, 97, 68), "white", 5)
    rect(d, (39, 20, 43, 58), "pink")
    rect(d, (85, 20, 89, 58), "pink")
    outline_ellipse(d, (17, 52, 111, 113), "white", 6)
    rect(d, (31, 98, 58, 116), "rabbit_shadow")
    rect(d, (55, 113, 78, 124), "ink")
    eye(d, 44, 75, "round")
    eye(d, 77, 75, "round")
    rect(d, (63, 93, 70, 100), "pink")


def rabbit_evo2(d: ImageDraw.ImageDraw) -> None:
    outline_ellipse(d, (25, 0, 48, 75), "white", 6)
    outline_ellipse(d, (81, 0, 104, 75), "white", 6)
    rect(d, (36, 23, 41, 63), "pink")
    rect(d, (91, 23, 96, 63), "pink")
    outline_ellipse(d, (12, 49, 116, 119), "rabbit_shadow", 6)
    rect(d, (26, 91, 102, 109), "white")
    rect(d, (43, 99, 92, 117), "blue")
    rect(d, (2, 91, 27, 105), "rabbit_shadow")
    rect(d, (99, 83, 127, 103), "orange")
    rect(d, (118, 73, 127, 82), "leaf")
    eye(d, 42, 70)
    eye(d, 83, 70)
    rect(d, (64, 88, 71, 96), "pink")


def rabbit_evo3(d: ImageDraw.ImageDraw) -> None:
    outline_ellipse(d, (19, 0, 45, 79), "white", 6)
    outline_ellipse(d, (84, 0, 110, 79), "white", 6)
    rect(d, (32, 25, 38, 68), "pink")
    rect(d, (96, 25, 102, 68), "pink")
    outline_ellipse(d, (10, 45, 118, 123), "rabbit_shadow", 6)
    armor_plate(d, 39, 67, 56, 48)
    rect(d, (45, 15, 91, 32), "ink")
    rect(d, (52, 11, 84, 26), "steel")
    sword(d, 26, 83)
    shield(d, 91, 78, "steel_dark")
    eye(d, 33, 61, "angry_l")
    eye(d, 88, 61, "angry_r")
    rect(d, (63, 86, 71, 94), "pink")


DRAWINGS = {
    "chick_evo1": chick_evo1,
    "chick_evo2": chick_evo2,
    "chick_evo3": chick_evo3,
    "cat_evo1": cat_evo1,
    "cat_evo2": cat_evo2,
    "cat_evo3": cat_evo3,
    "dog_evo1": dog_evo1,
    "dog_evo2": dog_evo2,
    "dog_evo3": dog_evo3,
    "slime_evo1": slime_evo1,
    "slime_evo2": slime_evo2,
    "slime_evo3": slime_evo3,
    "rabbit_evo1": rabbit_evo1,
    "rabbit_evo2": rabbit_evo2,
    "rabbit_evo3": rabbit_evo3,
}


def save(name: str, draw_func) -> Path:
    image, d = canvas()
    draw_func(d)
    path = OUT_DIR / f"{name}.png"
    image.save(path)
    return path


def validate(path: Path) -> dict[str, object]:
    with Image.open(path) as image:
        if image.mode != "RGBA":
            raise ValueError(f"{path.name}: expected RGBA, got {image.mode}")
        if image.size != (SIZE, SIZE):
            raise ValueError(f"{path.name}: expected {SIZE}x{SIZE}, got {image.size}")
        corners = [
            image.getpixel((0, 0))[3],
            image.getpixel((SIZE - 1, 0))[3],
            image.getpixel((0, SIZE - 1))[3],
            image.getpixel((SIZE - 1, SIZE - 1))[3],
        ]
        if any(alpha != 0 for alpha in corners):
            raise ValueError(f"{path.name}: corner transparency check failed")
        alpha = image.getchannel("A").tobytes()
        return {
            "file": path.name,
            "size": [SIZE, SIZE],
            "mode": "RGBA",
            "opaque_pixels": sum(1 for value in alpha if value > 0),
            "transparent_corners": True,
            "bbox": list(image.getbbox() or ()),
        }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    paths = [save(name, draw_func) for name, draw_func in DRAWINGS.items()]
    assets = [validate(path) for path in paths]

    encoded = {}
    for path in paths:
        b64 = base64.b64encode(path.read_bytes()).decode("ascii")
        encoded[path.name] = {
            "base64": b64,
            "data_url": f"data:image/png;base64,{b64}",
        }

    (OUT_DIR / "pixel_evolution_free_base64.json").write_text(
        json.dumps(encoded, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (OUT_DIR / "pixel_evolution_free_manifest.json").write_text(
        json.dumps(
            {
                "count": len(paths),
                "size": [SIZE, SIZE],
                "background": "transparent",
                "format": "PNG",
                "style": "RPG pixel-art evolution sprites",
                "assets": assets,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Generated {len(paths)} sprites in {OUT_DIR}")


if __name__ == "__main__":
    main()
