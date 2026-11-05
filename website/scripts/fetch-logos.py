"""Fetch historical club crests from the public football-logos repository; retain source attribution."""
import json,subprocess,pathlib,unicodedata,difflib,urllib.request,urllib.parse,concurrent.futures,os
os.chdir(pathlib.Path(__file__).resolve().parents[1])
names=list(json.loads(pathlib.Path('src/data/rosters.json').read_text()))
files=subprocess.check_output(['git','-C','/tmp/fl-logos','ls-tree','-r','--name-only','-z','HEAD']).decode().split('\0')
files=[p for p in files if p.startswith('history/2024-25/') and any(l in p for l in ['England - Premier League','Spain - LaLiga','Italy - Serie A','Germany - Bundesliga','France - Ligue 1'])]
def norm(s):
 s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
 return ''.join(c for c in s if c.isalnum())
alias={'Inter':'Inter Milan','Milan':'AC Milan','Tottenham':'Tottenham Hotspur','Wolverhampton':'Wolverhampton Wanderers','Athletic Club':'Athletic Bilbao','Alaves':'Deportivo Alaves','Las Palmas':'UD Las Palmas','Valladolid':'Real Valladolid','Bayern Munich':'Bayern Munich','Mainz':'1.FSV Mainz 05','Bochum':'VfL Bochum','Heidenheim':'1.FC Heidenheim 1846','St. Pauli':'FC St. Pauli','Saint-Étienne':'AS Saint-Étienne'}
def fetch(pair):
 name,path=pair;idx=names.index(name);target=pathlib.Path(f'public/media/clubs/{idx}.png')
 try:
  url='https://raw.githubusercontent.com/luukhopman/football-logos/master/'+urllib.parse.quote(path)
  data=urllib.request.urlopen(url,timeout=25).read()
  if not data.startswith(b'\x89PNG'):return name,None
  target.write_bytes(data);return name,f'/media/clubs/{idx}.png'
 except Exception as e:print(name,type(e).__name__);return name,None
pairs=[]
for i,name in enumerate(names):
 key=norm(alias.get(name,name));candidates=[p for p in files if ('England' if i<20 else 'Spain' if i<40 else 'Italy' if i<60 else 'Germany' if i<78 else 'France') in p]
 best=max(candidates,key=lambda p:difflib.SequenceMatcher(None,key,norm(pathlib.Path(p).stem)).ratio())
 ratio=difflib.SequenceMatcher(None,key,norm(pathlib.Path(best).stem)).ratio()
 if ratio<.4:print('NO MATCH',name,best);continue
 pairs.append((name,best))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:out={k:v for k,v in pool.map(fetch,pairs) if v}
pathlib.Path('src/data/logos.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
pathlib.Path('src/data/logo-sources.json').write_text(json.dumps(dict(pairs),ensure_ascii=False,indent=2))
print(len(out),'club crests downloaded')
