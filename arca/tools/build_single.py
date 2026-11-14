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
# 스크립트마다 따로 <script> 로 넣는다. 하나로 합치면 뒤 파일의 함수가 앞 파일 실행 중에 먼저 보이지만
# 그 파일의 const 는 아직 준비되지 않아 오류가 난다(예: 마을에서 저장한 뒤 다시 열 때).
inline = lambda src: "<script>\n" + (root / src).resolve().read_text(encoding="utf-8").replace("</script", "<\\/script") + "\n</script>"
html = re.sub(tag, lambda m: inline(m.group(1)), html)
out = root / "dist"
out.mkdir(exist_ok=True)
(out / "arca-chronicles.html").write_text(html, encoding="utf-8")
print("dist/arca-chronicles.html 을 만들었어요. (스크립트 " + str(len(srcs)) + "개)")
