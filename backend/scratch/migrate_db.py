import sqlite3
from pathlib import Path

db_path = Path(__file__).resolve().parent.parent / "brandguard.db"

def run_migrations():
    if not db_path.exists():
        print(f"Database {db_path} does not exist yet. It will be initialized by SQLAlchemy.")
        return

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    def get_columns(table_name):
        cursor.execute(f"PRAGMA table_info({table_name});")
        return [row[1] for row in cursor.fetchall()]

    migrations = [
        # table, column, col_type
        ("brand_profiles", "company_description", "TEXT"),
        ("brand_profiles", "prohibited_claims", "TEXT"),
        ("brand_profiles", "preferred_phrases", "TEXT"),
        ("brand_profiles", "human_review_words", "TEXT"),
        ("brand_profiles", "approved_messaging_examples", "JSON"),
        ("brand_profiles", "communication_dos", "JSON"),
        ("brand_profiles", "communication_donts", "JSON"),
        ("brand_profiles", "guidelines_confirmed", "BOOLEAN DEFAULT 0"),
        ("brand_profiles", "claims_reviewed", "BOOLEAN DEFAULT 0"),
        ("brand_profiles", "vocabulary_configured", "BOOLEAN DEFAULT 0"),
        
        ("brand_rules", "updated_at", "DATETIME"),
        
        ("approved_claims", "supporting_evidence", "TEXT"),
        ("approved_claims", "requires_special_approval", "BOOLEAN DEFAULT 0"),
        
        ("content_versions", "ai_suggestions", "JSON"),
        ("content_versions", "generated_by", "VARCHAR(100) DEFAULT 'User'"),
        ("content_versions", "audit_id", "INTEGER"),
        
        ("audit_reports", "guideline_version", "VARCHAR(50) DEFAULT '1.0'"),
        ("audit_reports", "final_recommendation", "VARCHAR(50) DEFAULT 'Needs Review'"),
        ("audit_reports", "extracted_visuals_json", "JSON"),
        
        ("audit_findings", "expected_rule", "TEXT"),
        ("audit_findings", "comparison_result", "VARCHAR(50) DEFAULT 'Needs Improvement'"),
        
        ("detected_claims", "location_in_creative", "VARCHAR(100)"),
        ("detected_claims", "related_guideline", "VARCHAR(255)"),
        ("detected_claims", "evidence_requirement", "VARCHAR(255)"),
        
        ("approval_records", "previous_status", "VARCHAR(50)"),
        ("approval_records", "new_status", "VARCHAR(50)"),
    ]

    for table, col, col_type in migrations:
        existing_cols = get_columns(table)
        if col not in existing_cols:
            print(f"Adding column '{col}' to table '{table}'...")
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};")
            except Exception as e:
                print(f"  Note: {e}")

    conn.commit()
    conn.close()
    print("Database migrations applied successfully without data loss.")

if __name__ == "__main__":
    run_migrations()
