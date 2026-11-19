import sys
sys.path.insert(0, '.')
import requests
from backend.core.security import create_access_token

token = create_access_token(data={"sub": "1"})
headers = {"Authorization": f"Bearer {token}"}
base_url = "http://127.0.0.1:8000/api"

# Find an existing test image in uploads
from pathlib import Path
img_path = Path("backend/uploads/images")
images = list(img_path.glob("*.png")) + list(img_path.glob("*.jpg"))

if not images:
    # Use any image in assets
    img_path = Path("backend/uploads/assets")
    images = list(img_path.glob("*.png")) + list(img_path.glob("*.jpg"))

if images:
    test_img = images[0]
    print(f"Testing upload with image: {test_img}")
    with open(test_img, "rb") as f:
        files = {"file": (test_img.name, f, "image/png")}
        data = {
            "title": "Automated Upload for Audit Test",
            "caption": "Testing the upload for audit workflow and AI vision engine.",
            "platform": "Instagram"
        }
        res = requests.post(f"{base_url}/content/upload", files=files, data=data, headers=headers)
        print("Upload status:", res.status_code, res.json())
        
        if res.status_code == 200:
            content_id = res.json()["content"]["id"]
            print(f"Testing analysis for content #{content_id}...")
            res_audit = requests.post(f"{base_url}/content/{content_id}/analyse", headers=headers)
            print("Audit status:", res_audit.status_code)
            if res_audit.status_code == 200:
                print("Audit scores:", res_audit.json().get("scores"))
                print("Audit findings count:", len(res_audit.json().get("findings", [])))
            else:
                print("Audit error:", res_audit.text)
else:
    print("No sample image found to test.")
