"""index.html + style.css + src/*.js 를 파일 하나(dist/arca-chronicles.html)로 합칩니다.
아티팩트나 USB 배포처럼 파일 하나가 필요할 때 씁니다.  사용법: python tools/build_single.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "style.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>")
srcs = re.findall(r'<script src="(src/[^"]+)"></script>', html)
js = "\n".join((root / s).read_text(encoding="utf-8") for s in srcs)
html = re.sub(r'(<script src="src/[^"]+"></script>\s*)+', lambda m: "<script>\n" + js + "\n</script>\n", html, count=1)
out = root / "dist"
out.mkdir(exist_ok=True)
(out / "arca-chronicles.html").write_text(html, encoding="utf-8")
print("dist/arca-chronicles.html 을 만들었어요.")
