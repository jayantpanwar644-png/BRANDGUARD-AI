import os
from sqlalchemy.schema import CreateTable, CreateIndex
from sqlalchemy.dialects import postgresql
from backend.models.all_models import Base

lines = [
    "-- ============================================================================",
    "-- BRANDGUARD AI — SUPABASE PRODUCTION DATABASE SCHEMA & STORAGE CONFIGURATION",
    "-- Complete PostgreSQL DDL: 27 Tables, Foreign Keys, Indexes, Constraints, RLS",
    "-- ============================================================================\n",
    "-- Enable PostgreSQL Extensions",
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
    'CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n'
]

# Generate DDL for each table
for name, table in Base.metadata.tables.items():
    ddl = str(CreateTable(table).compile(dialect=postgresql.dialect())).strip()
    lines.append(f"-- ------------------------------------------------------------")
    lines.append(f"-- Table: {name}")
    lines.append(f"-- ------------------------------------------------------------")
    lines.append(f"{ddl};\n")
    
    # Indexes
    for index in table.indexes:
        idx_ddl = str(CreateIndex(index).compile(dialect=postgresql.dialect())).strip()
        lines.append(f"{idx_ddl};\n")

# Supabase Storage Buckets configuration
storage_sql = """
-- ============================================================================
-- SUPABASE STORAGE BUCKETS & ACCESS POLICIES
-- ============================================================================
-- 1. Create storage buckets for BrandGuard AI assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('creatives', 'creatives', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('guidelines', 'guidelines', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv']),
  ('evidence', 'evidence', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']),
  ('logos', 'logos', true, 20971520, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('reports', 'reports', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies for Public Buckets (creatives, logos)
CREATE POLICY "Public Access for Brand Creatives"
ON storage.objects FOR SELECT
USING (bucket_id = 'creatives');

CREATE POLICY "Public Access for Brand Logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- 3. Storage Policies for Authenticated Operations
CREATE POLICY "Allow authenticated users to upload creatives"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('creatives', 'guidelines', 'evidence', 'logos', 'reports'));

CREATE POLICY "Allow authenticated users to read secure assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN ('guidelines', 'evidence', 'reports'));
"""

lines.append(storage_sql)

with open("supabase_schema.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Generated supabase_schema.sql with {len(Base.metadata.tables)} tables.")
