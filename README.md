# BrandGuard AI — Enterprise Brand Governance & Reputation Protection Platform

[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Frontend: React 19](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Styling: Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Database: SQLAlchemy & SQLite/Postgres](https://img.shields.io/badge/Database-SQLAlchemy%202.0-red.svg?logo=sqlite&logoColor=white)](https://www.sqlalchemy.org)
[![Engine: Computer Vision & RAG](https://img.shields.io/badge/AI%20Engine-Computer%20Vision%20%26%20RAG-blueviolet.svg)](#)
[![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](#)

> **"Protecting Brand Identity Before Publication and Public Trust After Publication."**

**BrandGuard AI** is a comprehensive, enterprise-grade Brand Governance and Reputation Protection platform. It automates pre-publication compliance audits for marketing creatives and advertisements while continuously monitoring post-publication audience sentiment and crisis risks.

---

## 🌟 Key Pillars & Core Capabilities

### 1. Intelligent Pre-Publication Brand Governance
* **10-Point Multi-Criteria Audit**: Evaluates every uploaded creative for:
  1. *Official Logo Placement & Correctness* (multi-scale template matching, transparency, inversion).
  2. *Brand Color Palette Adherence* (primary, secondary, and accent hex tolerance analysis).
  3. *Typography & Hierarchy* (OCR font analysis and readability scoring).
  4. *Safe-Zone Margins & Layout Integrity* (detection of cropped or border-crowded text).
  5. *Brand Tone of Voice* (flagging excessive hype, aggressive punctuation, or unapproved tone).
  6. *Restricted Vocabulary Enforcement* (prohibited word detection with approved alternative recommendations).
  7. *Approved Terminology Alignment* (ensures consistent nomenclature across campaigns).
  8. *Product & Service Representation* (confirms accurate product depictions).
  9. *Factual Claim Verification* (grounded RAG checking against registered specifications).
  10. *Active Brand Rules Engine* (dynamic traversal of all active guidelines).

### 2. Company & Product Relevance Engine
* **Contextual Domain Validation**: Validates whether an uploaded creative relates to the organization's business, active product catalog, and registered facts.
* **Tri-State Verdict**:
  * `Related to Company`: Content matches registered offerings or business domain.
  * `Not Related to Company`: Creative belongs to an unrelated industry (e.g. footwear for a computing brand); automatically logs a *Critical* finding.
  * `Needs Review`: Content is generic or ambiguous, surfaced for human verification without false penalties.
* **Logo Independence**: An absent or subtle logo does not trigger a false "Not Related" verdict if the product aligns.

### 3. Flexible Logo Management & Detection Engine
* **Multi-Format Ingestion**: Supports SVG (with automatic vector sanitization and high-res rasterization), PNG, JPG, JPEG, WEBP, GIF (first-frame extraction), and BMP.
* **PDF Vector Extraction**: Extracts embedded raster and vector logo candidates directly from uploaded brand guideline documents.
* **Multi-Variant Detection**: Detects and verifies primary logos, dark-theme inverted variations, monochrome marks, and icon-only emblems across complex backgrounds.

### 4. Grounded RAG Claim Verification & Claim Passport
* **Specification Enforcement**: Cross-references marketing assertions against approved facts, guideline sections, and registered claims.
* **Numerical Metric Verification**: Prevents inflated claims (e.g. "100 hours battery" vs. verified "20 hours").
* **Evidence Upload & Audit Trail**: Reviewers can upload supporting evidence (PDF, DOCX, TXT test benchmarks) to substantiate claims, issuing an immutable Claim Passport.

### 5. AI Image Editing, Correction & Versioning
* **Targeted AI Inpainting**: Automatically rectifies logo placement, overlays brand palette bars, and corrects text hierarchy without altering original product imagery.
* **User-Uploaded Final Image Option (Version 3)**: Allows creative teams to upload manually polished assets for re-audit alongside the original upload and AI-corrected revisions.
* **Immutable Version History**: Every re-audit creates a version snapshot (`v1`, `v2`, `v3`) preserving historical audit reports and reviewer logs.

### 6. Human Reviewer Workflow & Cryptographic Sign-Off
* **Four-Eyes Governance**: Multi-stage approval gate (`Approved`, `Changes Requested`, `Evidence Requested`, `Rejected`).
* **Approval Gates**: Prevents publishing when unresolved claims or critical violations exist.
* **Auditor Signatures**: Captures reviewer identity, role, timestamp, and notes in an indelible audit log.

### 7. Post-Publication Audience Intelligence & Crisis Center
* **Feedback Ingestion**: Bulk ingest customer comments via CSV or connected social channels.
* **Sentiment Classification**: Multi-class sentiment detection (Positive, Neutral, Negative, Mixed, Uncertain) with confidence scoring.
* **Reputation Incident Triggers**: Configurable anomaly detection triggers automated alerts for negative sentiment spikes (>25%) or repeated complaints.
* **AI Crisis Response Assistant**: Generates brand-aligned public responses for human sign-off.

### 8. Executive PDF Intelligence Reports
* **Publication-Quality Reports**: High-resolution vector PDF generation via ReportLab.
* **Comprehensive Metrics**: Executive summaries, visual asset compliance tables, claim risk matrices, and complete brand governance dossiers.

---

## 🛠 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts |
| **Backend API** | FastAPI, Uvicorn (ASGI), Pydantic v2, Python-Multipart |
| **Database** | SQLAlchemy 2.0 ORM, SQLite (local development) / PostgreSQL (production ready) |
| **Auth & Security** | JWT (HS256 via PyJWT), PBKDF2 Password Hashing, Multi-Tenant Org Isolation |
| **Vision & AI** | Pillow (PIL), NumPy, Python-Docx, PyPDF, SVGLib, Resvg-Py, Google Gemini API (optional) |
| **Reporting** | ReportLab 5.x PDF Engine, Dynamic Flowables & Visual Charts |
| **Testing** | Requests, Custom E2E Suites, Automated Regression Test Suites |

---

## 📁 Repository Directory Structure

```text
BrandGuard-AI-Final/
├── backend/
│   ├── core/                  # Application configuration, database engine, JWT security, auth deps
│   ├── models/                # 24 relational SQLAlchemy database models
│   ├── routers/               # 12 FastAPI REST API routers (Auth, Brand, Content, Claims, Approvals...)
│   ├── schemas/               # Pydantic validation and response schemas
│   ├── services/              # Core computational services:
│   │   ├── incident_detector.py   # Reputation anomaly detection
│   │   ├── logo_detector.py       # Multi-scale template matching and verification
│   │   ├── logo_processor.py      # Format normalization, SVG rasterization, PDF extraction
│   │   ├── pdf_generator.py       # Executive PDF report generation
│   │   ├── rag_engine.py          # Grounded RAG claim verification and rule extraction
│   │   ├── relevance_detector.py  # Company and product relevance engine
│   │   ├── sentiment_analyzer.py  # Audience feedback NLP and sentiment classification
│   │   └── vision_engine.py       # 10-point visual and compliance audit engine
│   ├── migrations/            # Database schema migration utilities
│   ├── uploads/               # Persistent file storage (.gitkeep placeholders)
│   ├── main.py                # FastAPI entrypoint and application assembly
│   ├── requirements.txt       # Python backend dependencies
│   ├── test_e2e.py            # 15-test automated end-to-end integration test suite
│   ├── test_real_product_e2e.py # 27-step full product lifecycle test suite
│   ├── test_audit_cases.py    # 6 mandatory brand audit validation scenarios (Tests A - F)
│   ├── test_flexible_logos.py # Logo extraction, SVG sanitization, and variant tests
│   └── test_logo_detection_scenarios.py # 5 logo detection and background test scenarios
├── frontend/
│   ├── public/                # Static web assets
│   ├── src/
│   │   ├── api/               # Typed Axios/fetch API client with token interceptors
│   │   ├── components/        # Reusable enterprise UI components (Cards, Badges, Modals, Diagrams)
│   │   ├── context/           # AuthContext (JWT session, active organization, brand state)
│   │   ├── pages/             # 13 application views (Brand Governance, Approval Center, Reports...)
│   │   ├── types/             # TypeScript domain definitions and API contracts
│   │   ├── App.tsx            # Application routing and protected route wrappers
│   │   └── main.tsx           # React DOM entrypoint
│   ├── package.json           # Node dependency manifest
│   ├── vite.config.ts         # Vite build configuration
│   └── tailwind.config.js     # Tailwind CSS configuration
├── .env.example               # Template of all configurable environment variables
├── .gitignore                 # GitHub ignore rules (Python, Node, DB, Uploads, Logs)
├── requirements.txt           # Top-level Python dependency manifest
└── README.md                  # Project documentation
```

---

## 🚀 Installation & Local Setup

### Prerequisites
* **Python**: 3.10, 3.11, or 3.12
* **Node.js**: 20.x or higher
* **npm**: 9.x or higher

---

### Step 1: Clone the Repository & Configure Environment

```bash
git clone https://github.com/your-org/BrandGuard-AI.git
cd BrandGuard-AI

# Copy environment example to .env
cp .env.example .env
```

Review `.env` and adjust settings as needed:
```ini
API_PORT=8000
API_HOST=127.0.0.1
DATABASE_URL=sqlite:///./brandguard.db
SECRET_KEY=brandguard-enterprise-security-token-key-2026-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
GEMINI_API_KEY=   # (Optional) Add your Gemini API key for generative rewrites
```

---

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS / Linux:
source .venv/bin/activate

# Install all backend dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

* **Interactive OpenAPI Documentation**: Visit `http://127.0.0.1:8000/docs`
* **Alternative ReDoc UI**: Visit `http://127.0.0.1:8000/redoc`

---

### Step 3: Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev -- --host 127.0.0.1 --port 3000
```

Open your browser and navigate to: **`http://localhost:3000`**

---

## 🧪 Comprehensive Verification & Test Suites

BrandGuard AI includes 5 automated test suites validating every layer of the architecture:

### 1. 15-Test End-to-End Suite (`test_e2e.py`)
Validates user registration, login, logo upload, AI audit, RAG claim proof verification, approval decisions, reanalysis versioning, audience feedback CSV processing, social publishing, PDF downloads, cross-tenant isolation, and validation barriers.
```bash
python backend/test_e2e.py
```

### 2. 27-Step Real Product Lifecycle Suite (`test_real_product_e2e.py`)
Executes an end-to-end simulation of a real enterprise workflow from initial draft to final sign-off, claim evidence submission, multi-tenant isolation, and persistent database verification.
```bash
python backend/test_real_product_e2e.py
```

### 3. Mandatory 6-Case Audit Validation Suite (`test_audit_cases.py`)
Validates the AI Brand Audit detection engine and Company & Product Relevance Engine against 6 specific scenarios:
* **Test A**: Correct Company Creative $\rightarrow$ `Related to Company`, 0 findings.
* **Test B**: Wrong Brand Palette $\rightarrow$ Detects color deviation with High severity.
* **Test C**: Restricted Vocabulary $\rightarrow$ Detects prohibited word `miracle` with approved replacement.
* **Test D**: Unrelated Offering (Sneakers for Tech Brand) $\rightarrow$ `Not Related to Company`, Critical finding.
* **Test E**: Unsupported / Contradicted Specification $\rightarrow$ Detects numerical conflict (`100 hours` vs `20 hours`).
* **Test F**: Ambiguous / Generic Creative $\rightarrow$ `Needs Review` status without false penalties.
```bash
python backend/test_audit_cases.py
```

### 4. Flexible Logo Upload & Normalization Suite (`test_flexible_logos.py`)
Validates SVG sanitization, high-resolution rasterization, GIF frame extraction, BMP conversion, and PDF candidate extraction.
```bash
python backend/test_flexible_logos.py
```

### 5. Multi-Scenario Logo Detection Suite (`test_logo_detection_scenarios.py`)
Validates template matching against exact logos, compressed/resized logos, dark-theme inverted logos, icon-only variants, and mismatched competitors.
```bash
python backend/test_logo_detection_scenarios.py
```

---

## ⚙️ Environment Variables Reference

| Variable | Required | Default Value | Description |
| :--- | :---: | :--- | :--- |
| `API_PORT` | No | `8000` | Port on which FastAPI listens |
| `API_HOST` | No | `127.0.0.1` | Host binding interface |
| `DATABASE_URL` | No | `sqlite:///./brandguard.db` | SQLAlchemy connection string (SQLite or PostgreSQL) |
| `SECRET_KEY` | **Yes** | *(Change for Production)* | Cryptographic key used to sign JWT session tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `10080` (7 days) | Expiration duration for access tokens |
| `GEMINI_API_KEY` | No | `""` | Optional Google Gemini API key for generative text rewrites and multimodal audit |
| `MAX_FILE_SIZE_BYTES` | No | `52428800` (50 MB) | Maximum permitted upload file size |

---

## 🔒 Security & Multi-Tenancy Architecture

* **Tenant Isolation**: Every database entity (`UploadedContent`, `BrandAsset`, `BrandGuideline`, `ApprovalRecord`, `AudienceFeedback`, `ReputationIncident`) belongs to an `organisation_id`. API endpoints verify that the authenticated user's organization matches the requested resource.
* **Cryptographic Signatures**: Approval decisions log the authenticated reviewer's user ID, email, role, timestamp, and comments.
* **Static File Safety**: Uploaded SVGs are parsed and sanitized to strip potential script injections, external references, and malicious XML entities before rasterization.
* **No Hardcoded Passwords**: PBKDF2 hashing with salt ensures secure credential storage.

---

## 📄 License & Attribution

Distributed under the MIT License. See `LICENSE` for more information.
Built with ❤️ for enterprise brand governance and reputation safety.
