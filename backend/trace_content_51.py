import sqlite3
from pathlib import Path
from PIL import Image

conn = sqlite3.connect('backend/brandguard.db')
c = conn.cursor()

print('=== CONTENT 51 ===')
cnt = c.execute("SELECT * FROM uploaded_contents WHERE id = 51").fetchone()
col_names = [description[0] for description in c.description]
cnt_dict = dict(zip(col_names, cnt))
for k, v in cnt_dict.items():
    print(f"{k}: {v}")

org_id = cnt_dict['organisation_id']
print(f'\n=== ORGANISATION {org_id} ===')
org = c.execute("SELECT * FROM organisations WHERE id = ?", (org_id,)).fetchone()
print(org)

print(f'\n=== BRAND PROFILE FOR ORG {org_id} ===')
bp = c.execute("SELECT * FROM brand_profiles WHERE organisation_id = ?", (org_id,)).fetchone()
bp_cols = [description[0] for description in c.description]
print(dict(zip(bp_cols, bp)))

print(f'\n=== BRAND ASSETS FOR ORG {org_id} ===')
assets = c.execute("SELECT * FROM brand_assets WHERE organisation_id = ?", (org_id,)).fetchall()
asset_cols = [description[0] for description in c.description]
for a in assets:
    print(dict(zip(asset_cols, a)))
