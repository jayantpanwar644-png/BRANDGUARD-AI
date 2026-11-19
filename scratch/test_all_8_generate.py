import sys
sys.path.insert(0, '.')
import requests
from backend.core.security import create_access_token

token = create_access_token(data={"sub": "1"})
headers = {"Authorization": f"Bearer {token}"}
base_url = "http://127.0.0.1:8000/api"

report_types = [
    "Brand Audit Report",
    "Claim Verification Report",
    "Approval History Report",
    "Audience Sentiment Report",
    "Complaint Analysis Report",
    "Reputation Risk Report",
    "Post Performance Report",
    "Complete Brand Intelligence"
]

print("Testing generate for all 8 report types...")
for rt in report_types:
    try:
        r_gen = requests.post(f"{base_url}/reports/generate", json={
            "report_type": rt,
            "title": f"Test {rt}",
            "include_findings": True,
            "include_charts": True,
            "include_recommendations": True
        }, headers=headers)
        if r_gen.status_code != 200:
            print(f"FAILED GENERATE {rt}: {r_gen.status_code} {r_gen.text}")
        else:
            rep_id = r_gen.json()["id"]
            size = r_gen.json()["file_size"]
            print(f"SUCCESS GENERATE {rt}: id={rep_id}, size={size} bytes")
    except Exception as e:
        print(f"EXCEPTION GENERATE {rt}: {e}")
