import sqlite3

conn = sqlite3.connect('backend/brandguard.db')
c = conn.cursor()
for org_id in [1, 2, 3, 4, 5]:
    contents = c.execute("SELECT count(*) FROM uploaded_contents WHERE organisation_id=?", (org_id,)).fetchone()[0]
    audits = c.execute("SELECT count(*) FROM audit_reports JOIN uploaded_contents ON audit_reports.content_id = uploaded_contents.id WHERE uploaded_contents.organisation_id=?", (org_id,)).fetchone()[0]
    claims = c.execute("SELECT count(*) FROM detected_claims JOIN uploaded_contents ON detected_claims.content_id = uploaded_contents.id WHERE uploaded_contents.organisation_id=?", (org_id,)).fetchone()[0]
    feedbacks = c.execute("SELECT count(*) FROM audience_feedbacks WHERE organisation_id=?", (org_id,)).fetchone()[0]
    incidents = c.execute("SELECT count(*) FROM reputation_incidents WHERE organisation_id=?", (org_id,)).fetchone()[0]
    posts = c.execute("SELECT count(*) FROM published_posts WHERE organisation_id=?", (org_id,)).fetchone()[0]
    print(f"Org {org_id}: contents={contents}, audits={audits}, claims={claims}, feedbacks={feedbacks}, incidents={incidents}, posts={posts}")
