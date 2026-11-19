import sqlite3
import json

conn = sqlite3.connect('backend/brandguard.db')
c = conn.cursor()

print('=== TABLES ===')
for t in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
    print(t[0])

print('\n=== REPORT 55 ===')
rep = c.execute("SELECT * FROM audit_reports WHERE id = 55").fetchone()
col_names = [description[0] for description in c.description]
rep_dict = dict(zip(col_names, rep))
for k, v in rep_dict.items():
    if k in ('raw_analysis_json', 'extracted_visuals_json'):
        print(f"{k}:")
        try:
            print(json.dumps(json.loads(v) if isinstance(v, str) else v, indent=2))
        except Exception:
            print(v)
    else:
        print(f"{k}: {v}")
