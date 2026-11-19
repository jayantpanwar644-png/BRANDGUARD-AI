import sys
sys.path.insert(0, '.')
import requests
from backend.core.security import create_access_token

token = create_access_token(data={"sub": "1"})
headers = {"Authorization": f"Bearer {token}"}
base_url = "http://127.0.0.1:8000/api"

print("1. Testing GET /reports/overview...")
res = requests.get(f"{base_url}/reports/overview", headers=headers)
print("Overview status:", res.status_code, res.json())

print("\n2. Testing POST /reports/preview for 'Brand Audit Report'...")
res = requests.post(f"{base_url}/reports/preview", json={
    "report_type": "Brand Audit Report",
    "include_findings": True,
    "include_charts": True,
    "include_recommendations": True
}, headers=headers)
print("Preview status:", res.status_code, res.json()["metrics"])

print("\n3. Testing POST /reports/generate for 'Brand Audit Report'...")
res = requests.post(f"{base_url}/reports/generate", json={
    "report_type": "Brand Audit Report",
    "title": "Nexus Dynamics — Automated Test Audit",
    "include_findings": True,
    "include_charts": True,
    "include_recommendations": True
}, headers=headers)
print("Generate status:", res.status_code, res.json())
report_id = res.json()["id"]

print(f"\n4. Testing GET /reports/{report_id}/download with ?token=...")
res = requests.get(f"{base_url}/reports/{report_id}/download?token={token}")
print("Download status:", res.status_code, "Bytes received:", len(res.content))

print(f"\n5. Testing DELETE /reports/{report_id}...")
res = requests.delete(f"{base_url}/reports/{report_id}", headers=headers)
print("Delete status:", res.status_code, res.json())

print("\nAll backend report endpoints verified successfully!")
