import urllib.request
import json
from pathlib import Path

# 1. Login
data = json.dumps({'email': 'jayantpanwar644@gmail.com', 'password': 'SecurePassword2026!'}).encode()
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
token = json.loads(resp.read().decode())['access_token']
print('Auth token received.')

# 2. Upload test image
boundary = '----WebKitFormBoundaryX9Z8Y7W6V5'
parts = [
    f'--{boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nLive Verified Campaign Ad\r\n'.encode(),
    f'--{boundary}\r\nContent-Disposition: form-data; name="platform"\r\n\r\nInstagram\r\n'.encode(),
    f'--{boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\nEnterprise AI Brand Governance with verified performance.\r\n'.encode(),
]
with open('backend/uploads/images/content_org_1_campaign_poster.png', 'rb') as f:
    img_bytes = f.read()

parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="campaign_poster.png"\r\nContent-Type: image/png\r\n\r\n'.encode() + img_bytes + b'\r\n')
parts.append(f'--{boundary}--\r\n'.encode())

payload = b''.join(parts)
up_req = urllib.request.Request(
    'http://127.0.0.1:8000/api/content/upload',
    data=payload,
    headers={'Authorization': f'Bearer {token}', 'Content-Type': f'multipart/form-data; boundary={boundary}'}
)
up_res = json.loads(urllib.request.urlopen(up_req).read().decode())
content_id = up_res['content']['id']
print(f'Uploaded creative id: {content_id}')

# 3. Analyse
an_req = urllib.request.Request(
    f'http://127.0.0.1:8000/api/content/{content_id}/analyse',
    data=b'',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
)
an_res = json.loads(urllib.request.urlopen(an_req).read().decode())
print('Analysis completed successfully!')
print('Approval Status:', an_res.get('approval_status'))
rep = an_res.get('report', {})
print('Scores:', rep.get('visual_quality_score'), rep.get('brand_consistency_score'), rep.get('readability_score'))
print('Findings count:', len(rep.get('findings', [])))
print('Detected claims:', len(rep.get('detected_claims', [])))
