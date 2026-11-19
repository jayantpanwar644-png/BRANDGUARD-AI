import sqlite3

conn = sqlite3.connect('backend/brandguard.db')
c = conn.cursor()
print("USERS:")
for r in c.execute("SELECT id, organisation_id, email, full_name, role FROM users").fetchall():
    print(r)

print("\nORGANISATIONS:")
for r in c.execute("SELECT id, name, industry, official_email FROM organisations").fetchall():
    print(r)

print("\nGENERATED REPORTS:")
for r in c.execute("SELECT id, organisation_id, report_type, title, file_path, file_size, created_at FROM generated_reports").fetchall():
    print(r)
