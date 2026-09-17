from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import json,re
ROOT=Path('/mnt/data/spatialx-seo-v4')
PUB=ROOT/'public'
htmls=list(PUB.rglob('*.html'))
issues=[]; warnings=[]; checked=0
cache={}
class P(HTMLParser):
    def __init__(self): super().__init__(); self.hrefs=[]; self.ids=set()
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d: self.ids.add(d['id'])
        if tag=='a' and 'href' in d: self.hrefs.append(d['href'])

def parse(f):
    if f not in cache:
        p=P(); p.feed(f.read_text(encoding='utf-8')); cache[f]=p
    return cache[f]

def route_to_file(path):
    if path=='/': return PUB/'index.html'
    if path.endswith('.html'): path=path[:-5]
    return PUB/(path.lstrip('/')+'.html')

for f in htmls:
    src=parse(f)
    for href in src.hrefs:
        if href=='#': warnings.append(f'{f.relative_to(PUB)}: placeholder # link'); continue
        if href.startswith(('mailto:','tel:','http://','https://')): continue
        if href.startswith('javascript:'): issues.append(f'{f.relative_to(PUB)}: javascript href'); continue
        checked+=1
        u=urlparse(href)
        target=f if not u.path else route_to_file(u.path)
        if not target.exists(): issues.append(f'{f.relative_to(PUB)} -> {href}: missing target'); continue
        if u.fragment:
            ids=parse(target).ids
            if u.fragment not in ids: issues.append(f'{f.relative_to(PUB)} -> {href}: missing anchor #{u.fragment}')
res={'status':'PASS' if not issues else 'FAIL','htmlPages':len(htmls),'internalLinksChecked':checked,'issues':issues,'warnings':warnings}
(ROOT/'reports'/'LINK_QA_RESULTS.json').write_text(json.dumps(res,indent=2))
print(json.dumps(res,indent=2))
raise SystemExit(1 if issues else 0)
