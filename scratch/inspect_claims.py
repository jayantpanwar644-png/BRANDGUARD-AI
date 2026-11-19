import sqlite3

conn = sqlite3.connect('backend/brandguard.db')
c = conn.cursor()
for org_id in [1, 2, 3, 4, 5]:
    ac = c.execute("SELECT count(*) FROM approved_claims WHERE organisation_id=?", (org_id,)).fetchone()[0]
    bg = c.execute("SELECT count(*) FROM brand_guidelines WHERE organisation_id=?", (org_id,)).fetchone()[0]
    ba = c.execute("SELECT count(*) FROM brand_assets WHERE organisation_id=?", (org_id,)).fetchone()[0]
    appr = c.execute("SELECT count(*) FROM approval_records JOIN uploaded_contents ON approval_records.content_id = uploaded_contents.id WHERE uploaded_contents.organisation_id=?", (org_id,)).fetchone()[0]
    print(f"Org {org_id}: approved_claims={ac}, brand_guidelines={bg}, brand_assets={ba}, approvals={appr}")
