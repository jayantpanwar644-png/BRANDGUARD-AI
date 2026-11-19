import sys
sys.path.insert(0, '.')
from backend.services.pdf_generator import generate_pdf_report
from reportlab.lib import colors

data = {
    "summary": "This is a comprehensive executive test report compiling live brand compliance metrics.",
    "metrics": [
        ("Compliance Score", "94%"),
        ("Active Audits", "4"),
        ("Supported Claims", "100%"),
        ("Incident Level", "Zero Critical")
    ],
    "chart_info": {
        "type": "bar",
        "categories": ["Clarity", "Consistency", "Readability", "SDG Score"],
        "values": [92, 88, 85, 90]
    },
    "findings": [
        {
            "category": "Visual Quality",
            "severity": "Medium",
            "description": "Text contrast ratio slightly below AAA threshold in primary header.",
            "recommendation": "Increase font weight or shift text color to deep charcoal."
        }
    ],
    "claims": [
        {
            "statement": "99.98% SLA Uptime Guarantee",
            "category": "Performance",
            "status": "Supported",
            "source": "ISO SLA Audit 2026"
        }
    ],
    "recommendations": [
        "Enforce strict RAG claim verification on all outbound marketing copy before publication.",
        "Ensure high-contrast typography across all display ad campaigns."
    ]
}

pdf_path = generate_pdf_report(
    report_type="Brand Audit Report",
    title="Executive Brand Governance Brief",
    company_name="Nexus Dynamics Inc",
    data=data,
    subtitle="Confidential Board Review",
    industry="Enterprise Security"
)

from pathlib import Path
p = Path(pdf_path)
print(f"Generated PDF successfully: {p.name}, size: {p.stat().st_size} bytes")
