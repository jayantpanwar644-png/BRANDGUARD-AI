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

print("Testing all 8 report types...")
for rt in report_types:
    try:
        r_prev = requests.post(f"{base_url}/reports/preview", json={
            "report_type": rt,
            "include_findings": True,
            "include_charts": True,
            "include_recommendations": True
        }, headers=headers)
        if r_prev.status_code != 200:
            print(f"FAILED PREVIEW {rt}: {r_prev.status_code} {r_prev.text}")
        else:
            print(f"SUCCESS PREVIEW {rt}: metrics={len(r_prev.json()['metrics'])}, summary len={len(r_prev.json()['summary'])}")
    except Exception as e:
        print(f"EXCEPTION PREVIEW {rt}: {e}")
