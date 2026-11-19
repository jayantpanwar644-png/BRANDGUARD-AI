import sqlite3

conn = sqlite3.connect('backend/brandguard.db')
c = conn.cursor()

def add_column_if_not_exists(table, col, col_type):
    cursor = c.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    if col not in columns:
        print(f"Adding column {col} ({col_type}) to {table}...")
        c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        conn.commit()
    else:
        print(f"Column {col} already exists in {table}.")

# 1. Update brand_rules
add_column_if_not_exists("brand_rules", "guideline_id", "INTEGER")
add_column_if_not_exists("brand_rules", "source_document", "VARCHAR(255)")
add_column_if_not_exists("brand_rules", "section_reference", "VARCHAR(100)")
add_column_if_not_exists("brand_rules", "confidence", "FLOAT DEFAULT 0.90")
add_column_if_not_exists("brand_rules", "review_status", "VARCHAR(50) DEFAULT 'Confirmed'")
add_column_if_not_exists("brand_rules", "suggested_correction", "TEXT")

# 2. Update brand_profiles
add_column_if_not_exists("brand_profiles", "website", "VARCHAR(255)")
add_column_if_not_exists("brand_profiles", "business_category", "VARCHAR(100)")
add_column_if_not_exists("brand_profiles", "products_and_services", "TEXT")
add_column_if_not_exists("brand_profiles", "main_region", "VARCHAR(100)")
add_column_if_not_exists("brand_profiles", "preferred_language", "VARCHAR(50) DEFAULT 'English (Global / US)'")
add_column_if_not_exists("brand_profiles", "brand_personality", "VARCHAR(255)")
add_column_if_not_exists("brand_profiles", "writing_style", "TEXT")
add_column_if_not_exists("brand_profiles", "alternate_logo_path", "VARCHAR(500)")
add_column_if_not_exists("brand_profiles", "is_setup_complete", "BOOLEAN DEFAULT 0")
add_column_if_not_exists("brand_profiles", "setup_confirmed_at", "DATETIME")

# 3. Update uploaded_contents
add_column_if_not_exists("uploaded_contents", "current_version", "INTEGER DEFAULT 1")
add_column_if_not_exists("uploaded_contents", "revised_file_path", "VARCHAR(500)")
add_column_if_not_exists("uploaded_contents", "revised_caption", "TEXT")
add_column_if_not_exists("uploaded_contents", "ai_suggestions", "JSON")

# 4. Update audit_findings
add_column_if_not_exists("audit_findings", "resolved_in_version", "INTEGER")
add_column_if_not_exists("audit_findings", "is_resolved", "BOOLEAN DEFAULT 0")

conn.close()
print("Migration completed successfully!")
