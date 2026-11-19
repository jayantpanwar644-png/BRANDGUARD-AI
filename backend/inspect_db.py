import sqlite3

conn = sqlite3.connect('backend/brandguard.db')
c = conn.cursor()

print('=== RECENT AUDIT REPORTS ===')
for row in c.execute('SELECT id, content_id, version_number, overall_status, final_recommendation, created_at FROM audit_reports ORDER BY id DESC LIMIT 5').fetchall():
    print(row)

print('\n=== RECENT FINDINGS (LOGO) ===')
for row in c.execute("SELECT id, report_id, issue_type, severity, title, comparison_result, description, evidence_found, status FROM audit_findings WHERE issue_type = 'Logo' ORDER BY id DESC LIMIT 5").fetchall():
    print(row)

print('\n=== RECENT CONTENTS ===')
for row in c.execute('SELECT id, organisation_id, title, file_path, current_version, status, created_at FROM contents ORDER BY id DESC LIMIT 5').fetchall():
    print(row)

print('\n=== RECENT ORGANISATIONS ===')
for row in c.execute('SELECT id, name, company_id, created_at FROM organisations ORDER BY id DESC LIMIT 5').fetchall():
    print(row)

print('\n=== RECENT BRAND PROFILES ===')
for row in c.execute('SELECT id, organisation_id, company_name, logo_path, is_configured FROM brand_profiles ORDER BY id DESC LIMIT 5').fetchall():
    print(row)

print('\n=== RECENT BRAND ASSETS ===')
for row in c.execute('SELECT id, organisation_id, file_name, file_path, raster_path, variation_type, is_primary FROM brand_assets ORDER BY id DESC LIMIT 10').fetchall():
    print(row)
