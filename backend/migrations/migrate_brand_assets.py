import sqlite3
from pathlib import Path

db_path = Path(__file__).resolve().parent.parent / "brandguard.db"

def run_migration():
    if not db_path.exists():
        print(f"Database {db_path} does not exist yet.")
        return

    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()
    c.execute("PRAGMA table_info(brand_assets)")
    existing_cols = [r[1] for r in c.fetchall()]
    print("Existing cols:", existing_cols)

    new_cols = [
        ("raster_path", "VARCHAR(500)"),
        ("variation_type", "VARCHAR(50) DEFAULT 'Primary'"),
        ("source_format", "VARCHAR(20) DEFAULT 'PNG'"),
        ("width", "INTEGER"),
        ("height", "INTEGER"),
        ("has_transparency", "BOOLEAN DEFAULT 0")
    ]

    for col_name, col_type in new_cols:
        if col_name not in existing_cols:
            c.execute(f"ALTER TABLE brand_assets ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")

    conn.commit()
    conn.close()
    print("brand_assets migration successfully completed.")

if __name__ == "__main__":
    run_migration()
