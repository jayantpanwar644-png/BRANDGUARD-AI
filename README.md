# BrandGuard AI 🛡️

**Autonomous Enterprise Brand Governance, Multimodal AI Compliance & Real-Time Reputation Protection**

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4+-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black.svg)](https://brandguard-ai-web.vercel.app)
[![Render](https://img.shields.io/badge/Render-Operational-46E3B7.svg)](https://brandguard-ai-backend-jcpz.onrender.com)

---

## 🚀 Live Production Deployments

| Component | Architecture / Provider | Production URL | Status |
| :--- | :--- | :--- | :---: |
| **Frontend Web App** | Vercel Global Edge (SPA) | [https://brandguard-ai-web.vercel.app](https://brandguard-ai-web.vercel.app) | **ONLINE** |
| **Backend REST API** | Render Persistent Container (FastAPI) | [https://brandguard-ai-backend-jcpz.onrender.com](https://brandguard-ai-backend-jcpz.onrender.com) | **ONLINE** |
| **Health Check** | JSON Diagnostics | [https://brandguard-ai-backend-jcpz.onrender.com/api/health](https://brandguard-ai-backend-jcpz.onrender.com/api/health) | `200 OK` |
| **Production Database** | Supabase PostgreSQL (27 Tables) | Dedicated AWS PostgreSQL Instance | **PROVISIONED** |

### Default Evaluation Tenant Credentials:
- **Email:** `admin@nexusdynamics.io`
- **Password:** `SecurePassword2026!`
- **Organization:** Nexus Dynamics Inc (Chief Brand Officer)

---

## 📁 Repository Structure

```text
BRANDGUARD-AI/
├── frontend/                     # Modern React 18 + TypeScript + Vite SPA
│   ├── public/                   # Static branding, favicons, illustrations
│   ├── src/                      # Source components, pages, hooks, context
│   │   ├── api/                  # Typed REST API client
│   │   ├── components/           # Reusable UI widgets, audit modals, logo manager
│   │   ├── context/              # Authentication & tenant state providers
│   │   ├── pages/                # 11 full enterprise feature views
│   │   ├── types/                # TypeScript interface definitions
│   │   └── lib/                  # Formatting & asset URL utilities
│   ├── index.html                # Vite HTML entry point
│   ├── package.json              # Frontend npm dependencies
│   ├── package-lock.json         # Pinned dependency lockfile
│   ├── tailwind.config.js        # Design tokens & color system
│   ├── tsconfig.json             # TypeScript compiler settings
│   ├── vercel.json               # Frontend SPA catch-all rewrites
│   └── vite.config.ts            # Vite bundler configuration
│
├── backend/                      # Production FastAPI Application
│   ├── core/                     # Database engine, config, security, tokens
│   ├── database/                 # Database connection & session re-exports
│   ├── models/                   # SQLAlchemy relational data models (all 27 tables)
│   ├── routers/                  # Modular FastAPI routers (auth, audit, brand, etc.)
│   ├── schemas/                  # Pydantic v2 validation models
│   ├── services/                 # Multimodal AI vision, context engine, sentiment
│   │   ├── context_verification_engine.py  # Brand context relevance verification
│   │   ├── storage_service.py              # Cloud storage & local persistence
│   │   └── social_providers/               # Meta, LinkedIn, YouTube, X connectors
│   ├── utils/                    # Helper functions & asset processors
│   ├── uploads/                  # Storage directory with category subfolders
│   ├── main.py                   # Application entry point & CORS configuration
│   ├── pyproject.toml            # Python package specifications
│   └── requirements.txt          # Production Python pip dependencies
│
├── database/                     # Production Database Configurations & Migrations
│   ├── migrations/               # Database migration scripts
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_social_accounts.py
│   │   └── migrate_sqlite_to_supabase.py   # Zero-downtime SQLite -> Supabase script
│   ├── schema/                   # Complete SQL DDL schemas
│   │   └── supabase_schema.sql             # Full 27-table Supabase PostgreSQL DDL
│   └── seed/                     # Seed scripts for initial tenants
│       └── seed_demo_data.py
│
├── docs/                         # Architecture, API & Deployment Documentation
│   ├── ARCHITECTURE.md           # System architecture & verification reports
│   └── README.md                 # Documentation overview
│
├── .gitignore                    # Comprehensive production git ignore rules
├── .env.example                  # Environment variables reference template
├── package.json                  # Root monorepo orchestration script
├── render.yaml                   # Render deployment configuration
├── vercel.json                   # Root Vercel SPA routing
└── README.md                     # This documentation file
```

---

## ⚡ Quick Start (Local Setup)

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 1. Clone & Setup Environment
```bash
git clone https://github.com/jayantpanwar644-png/BRANDGUARD-AI.git
cd BRANDGUARD-AI
cp .env.example .env
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Start backend server (Port 8000)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# Navigate to frontend and install dependencies
cd frontend
npm install

# Start Vite development server (Port 3000)
npm run dev -- --port 3000
```
Open **`http://localhost:3000`** in your browser.

---

## 🗄️ Database Provisioning (Supabase PostgreSQL)

1. Create a project in [Supabase](https://supabase.com).
2. Open the **SQL Editor**, paste the contents of **`database/schema/supabase_schema.sql`**, and execute it.
3. Migrate existing local data into Supabase with zero data loss:
   ```bash
   python database/migrations/migrate_sqlite_to_supabase.py "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```
4. Set `DATABASE_URL` in your Render Environment Variables to the Supabase connection URI.

---

## 🔐 Security & Governance Principles

1. **Zero Hardcoded Secrets:** No API keys, passwords, or OAuth credentials are saved in git or public repositories.
2. **AES-256 Token Encryption:** All external platform tokens are encrypted at rest using Fernet symmetric encryption.
3. **Multi-Tenant Scoping:** All operations strictly enforce `organisation_id` checks across all 27 tables.
4. **Context Verification Engine:** Automatically blocks random, out-of-industry, or irrelevant marketing uploads before they reach the audit or publication stages.
5. **Direct Platform Logins:** Clean, external `<a>` tags open official social media login portals without OAuth configuration dependencies.

---

## 📄 License & Attribution

Developed for **BrandGuard AI Enterprise Governance Platform**. All rights reserved.
