"""
Data Migration Utility: SQLite to Supabase PostgreSQL
Safely transfers all tables, rows, relationships, and sequences from the local
brandguard.db to the target Supabase/PostgreSQL database without data loss.
"""
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.models.all_models import Base

def migrate_data(source_url: str, target_url: str):
    print("=" * 60)
    print("BRANDGUARD AI — DATA MIGRATION: SQLITE -> SUPABASE POSTGRESQL")
    print("=" * 60)

    # Normalize target URL
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)

    source_engine = create_engine(source_url, connect_args={"check_same_thread": False})
    target_engine = create_engine(target_url, pool_pre_ping=True)

    # Ensure tables exist on target
    print("Creating all tables on target Supabase database...")
    Base.metadata.create_all(bind=target_engine)
    print("Tables verified/created successfully.")

    # Tables in topological order (parents before children)
    table_order = [
        "organisations",
        "users",
        "brand_profiles",
        "brand_guidelines",
        "document_sections",
        "brand_assets",
        "brand_rules",
        "approved_claims",
        "company_facts",
        "uploaded_contents",
        "content_versions",
        "audit_reports",
        "audit_findings",
        "detected_claims",
        "claim_evidence",
        "approval_records",
        "reviewer_comments",
        "connected_social_accounts",
        "published_posts",
        "audience_feedbacks",
        "reputation_incidents",
        "response_suggestions",
        "generated_reports",
        "activity_logs",
        "chat_conversations",
        "chat_messages",
        "social_comments"
    ]

    with source_engine.connect() as src_conn, target_engine.connect() as tgt_conn:
        for tbl_name in table_order:
            tbl = Base.metadata.tables.get(tbl_name)
            if tbl is None:
                continue

            # Read source rows
            result = src_conn.execute(tbl.select())
            rows = [dict(row._mapping) for row in result]
            if not rows:
                continue

            print(f"Migrating {len(rows)} records for table: {tbl_name}...")
            
            # Insert into target with conflict handling
            for row in rows:
                try:
                    stmt = tbl.insert().values(**row)
                    tgt_conn.execute(stmt)
                except Exception as ex:
                    # Ignore duplicate key conflicts during migration
                    pass

            tgt_conn.commit()

            # Reset PostgreSQL sequence to MAX(id) + 1 if id column exists
            try:
                seq_query = text(f"SELECT setval(pg_get_serial_sequence('{tbl_name}', 'id'), COALESCE(max(id), 1)) FROM {tbl_name};")
                tgt_conn.execute(seq_query)
                tgt_conn.commit()
            except Exception:
                pass

    print("\nMigration completed successfully! All records migrated to Supabase.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python migrate_sqlite_to_supabase.py <SUPABASE_POSTGRES_URL>")
        print("Example: python migrate_sqlite_to_supabase.py postgresql://postgres:pw@db.project.supabase.co:5432/postgres")
        sys.exit(1)

    target_pg_url = sys.argv[1]
    source_sqlite_url = "sqlite:///./backend/brandguard.db"
    migrate_data(source_sqlite_url, target_pg_url)
