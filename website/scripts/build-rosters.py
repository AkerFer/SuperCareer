"""Build the bundled historical database from downloaded FPL CSV and editorial squads.
Usage: python scripts/build-rosters.py /path/players_raw.csv /path/teams.csv /path/world-rosters.txt
"""
import csv,json,pathlib,sys,os
os.chdir(pathlib.Path(__file__).resolve().parents[1])
players_path,teams_path,world_path=sys.argv[1:]
allrows=list(csv.DictReader(open(players_path)));out={}
alias={'Wolves':'Wolverhampton','Spurs':'Tottenham','Man City':'Manchester City','Man Utd':'Manchester United',"Nott'm Forest":'Nottingham Forest','Newcastle':'Newcastle United','Leicester':'Leicester City','Ipswich':'Ipswich Town'}
for team in csv.DictReader(open(teams_path)):
 chosen=[]
 for typ,n in [('1',2),('2',8),('3',8),('4',4)]:
  rows=sorted([r for r in allrows if r['team']==team['id'] and r['element_type']==typ],key=lambda r:(int(r['minutes']),int(r['now_cost'])),reverse=True)[:n]
  for j,r in enumerate(rows):
   pos={'1':'GK','2':['CB','CB','LB','RB','CB','LB','RB','CB'][j%8],'3':['CM','CAM','LW','RW','CDM','CM','LW','RW'][j%8],'4':'ST'}[typ]
   chosen.append({'name':(r['first_name']+' '+r['second_name']).strip(),'pos':pos,'born':r['birth_date'] if r['birth_date'] not in ['None',''] else None,'photo':f"https://resources.premierleague.com/premierleague/photos/players/250x250/p{r['code']}.png",'source':'FPL 2024/25 (vaastav/Fantasy-Premier-League)'})
 out[alias.get(team['name'],team['name'])]=chosen
for line in pathlib.Path(world_path).read_text().splitlines():
 club,names=line.split('|');out[club]=[{'name':p.rsplit('/',1)[0],'pos':p.rsplit('/',1)[1],'source':'Редакционная база 2024/25; составы разных дат сезона'} for p in names.split(',')]
out['Borussia Dortmund']=[p for p in out['Borussia Dortmund'] if p['name']!='Julian Beier']
out['Lecce']=[p for p in out['Lecce'] if p['name']!='Patrick Chinazaekpere Dorgu']
out['Paris Saint-Germain']=[p for p in out['Paris Saint-Germain'] if p['name']!='Lucas Chevalier']
seen=set()
for club,arr in out.items():
 out[club]=[p for p in arr if not (p['name'] in seen or seen.add(p['name']))]
pathlib.Path('src/data/rosters.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(len(out),'clubs;',sum(map(len,out.values())),'real names')
