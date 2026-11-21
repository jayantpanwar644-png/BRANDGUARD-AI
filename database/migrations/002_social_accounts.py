import sqlite3
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
db_path = Path(__file__).resolve().parent.parent / "brandguard.db"

def run_migration():
    if not db_path.exists():
        return

    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()

    # 1. Migrate connected_social_accounts
    try:
        c.execute("PRAGMA table_info(connected_social_accounts)")
        existing_cols = [r[1] for r in c.fetchall()]
        
        new_cols = [
            ("profile_picture_url", "VARCHAR(500)"),
            ("refresh_token", "TEXT"),
        ]

        for col_name, col_type in new_cols:
            if col_name not in existing_cols:
                c.execute(f"ALTER TABLE connected_social_accounts ADD COLUMN {col_name} {col_type}")
                logger.info(f"Added column {col_name} to connected_social_accounts")
    except Exception as e:
        logger.warning(f"connected_social_accounts migration notice: {e}")

    # 2. Migrate audience_feedbacks
    try:
        c.execute("PRAGMA table_info(audience_feedbacks)")
        af_cols = [r[1] for r in c.fetchall()]
        if "external_post_id" not in af_cols:
            c.execute("ALTER TABLE audience_feedbacks ADD COLUMN external_post_id VARCHAR(100)")
        if "post_url" not in af_cols:
            c.execute("ALTER TABLE audience_feedbacks ADD COLUMN post_url VARCHAR(500)")
    except Exception as e:
        logger.warning(f"audience_feedbacks migration notice: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    run_migration()
    print("Social accounts migration complete.")
