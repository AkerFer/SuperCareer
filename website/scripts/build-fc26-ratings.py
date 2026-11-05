"""Extract reviewed FC 26 card facts. Usage: python scripts/build-fc26-ratings.py players.csv

The upstream archive is downloaded separately; this script never scrapes EA or downloads portraits.
"""
import csv
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
expected = 'cb46c2a57eff44f3c7e098a8a7e807113d0524fee3c1737c39262dcfd4e9824d'
if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
    raise SystemExit('Unreviewed CSV checksum: review the new snapshot before changing this script.')

def normalize(s):
    return re.sub('[^a-z0-9 ]', '', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()).strip()

rows = list(csv.DictReader(source.open(encoding="utf-8-sig")))
for row in rows:
    row['_long'] = normalize(row['long_name'])
    row['_short'] = normalize(row['short_name'])
    row['_tokens'] = set(row['_long'].split())
rosters = json.loads((root / 'src/data/rosters.json').read_text(encoding='utf-8'))
out = {}
for player in [p for club in rosters.values() for p in club]:
    name = normalize(player['name'])
    found = [r for r in rows if name in [r['_long'], r['_short']]]
    if not found and len(name.split()) >= 2:
        found = [r for r in rows if all(t in r['_tokens'] for t in name.split())]
    if len(found) != 1:
        continue
    row = found[0]
    positional = {}
    for role in ['gk', 'cb', 'lb', 'rb', 'cdm', 'cm', 'cam', 'lw', 'rw', 'st', 'cf', 'lm', 'rm', 'lwb', 'rwb']:
        value = row.get(role, '')
        if re.fullmatch(r'\d+\+\d+', value):
            positional[role.upper()] = min(99, sum(map(int, value.split('+'))))
    out[player['name']] = dict(rating=int(row['overall']), potential=int(row['potential']), positions=row['player_positions'].split(', '), positionRatings=positional, date=row['fifa_update_date'])
(root / 'src/data/fc26-ratings.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'Extracted {len(out)} unique player profiles.')
