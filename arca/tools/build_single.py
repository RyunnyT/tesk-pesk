"""index.html + style.css + 불러오는 스크립트 전부를 파일 하나(dist/arca-chronicles.html)로 합칩니다.
문제 은행(../quiz-bank.js)과 지문 은행(data/passages.js)도 함께 들어갑니다.
아티팩트나 USB 배포처럼 파일 하나가 필요할 때 씁니다.  사용법: python tools/build_single.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "style.css").read_text(encoding="utf-8")
html = re.sub(r'<link rel="stylesheet" href="style.css"\s*/?>', lambda m: "<style>\n" + css + "\n</style>", html)
tag = r'<script src="((?!https?:)[^"]+)"></script>'
srcs = re.findall(tag, html)
js = "\n".join((root / s).resolve().read_text(encoding="utf-8") for s in srcs)
html = re.sub(r'(' + tag + r'\s*)+', lambda m: "<script>\n" + js.replace("</script", "<\\/script") + "\n</script>\n", html, count=1)
out = root / "dist"
out.mkdir(exist_ok=True)
(out / "arca-chronicles.html").write_text(html, encoding="utf-8")
print("dist/arca-chronicles.html 을 만들었어요. (스크립트 " + str(len(srcs)) + "개)")
