"""Build a single self-contained HTML file from dist/ (fonts, CSS, JS and images embedded)."""
from pathlib import Path
import base64, re

root = Path(__file__).parent
dist = root / 'dist'
out = root.parent / 'Da-Appetizer-immersive-menu.html'

def data_uri(path, mime):
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"

html = (dist / 'index.html').read_text()
fonts = (dist / 'fonts.css').read_text()
fonts = re.sub(r"url\(\./fonts/([^)]+)\)", lambda m: f"url({data_uri(dist / 'fonts' / m.group(1), 'font/woff2')})", fonts)
licenses = '\n'.join(p.read_text() for p in sorted((dist / 'fonts').glob('*.txt')))
experience = (dist / 'experience.css').read_text()
html = html.replace('<link href="./fonts.css" rel="stylesheet"/>', f'<style>{fonts}</style>')
html = html.replace('<link href="./experience.css" rel="stylesheet"/>', f'<style>{experience}</style>')
script_tag = re.search(r'<script type="module" crossorigin src="\./app/([^"]+)"></script>', html)
js = (dist / 'app' / script_tag.group(1)).read_text()
js = re.sub(r"\./images/([a-z-]+\.webp)", lambda m: data_uri(dist / 'images' / m.group(1), 'image/webp'), js)
js = js.replace('</script', '<\\/script')
html = html.replace(script_tag.group(0), '')
html = html.replace('</body>', f'<script type="module">{js}</script>\n<!-- Font licenses (SIL OFL 1.1):\n{licenses.replace("--", "- -")}\n-->\n</body>')
assert './images/' not in html and './fonts' not in html and './assets/' not in html
out.write_text(html)
print(f'{out.name}: {out.stat().st_size / 1e6:.2f} MB, all assets embedded')
