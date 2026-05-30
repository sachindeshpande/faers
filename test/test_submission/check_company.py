#!/usr/bin/env python3
"""
Quick diagnostic: calls the ESG NextGen Companies API and prints the full raw response.
This tells you your real company_id, company_name, company_status, and whether
your account is set up as an agency (authorizing_companies array present).

Usage (from test_submission/ directory):
    python check_company.py
"""
import os, sys, json, requests
from pathlib import Path

# Load .env manually so this script works standalone
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

client_id = os.getenv("ClientID", "")
secret    = os.getenv("Secret", "")
email     = os.getenv("ESG_USER_EMAIL", "")

if not all([client_id, secret, email]):
    print("ERROR: Missing one or more of: ClientID, Secret, ESG_USER_EMAIL in .env")
    sys.exit(1)

print(f"Using email: {email}")

# Step 1: get token
print("\n[1/2] Getting access token …")
r = requests.post(
    "https://external-api-esgng.fda.gov/as/token.oauth2",
    params={"grant_type": "client_credentials", "scope": "openid profile"},
    data={"client_id": client_id, "client_secret": secret},
    timeout=30,
)
print(f"     Status: {r.status_code}")
if r.status_code != 200:
    print(f"     FAILED: {r.text[:500]}")
    sys.exit(1)

token = r.json().get("access_token", "")
print(f"     Token: {token[:25]}…")

# Step 2: Companies API — full raw response
BASE_URL = "https://external-api-esgng.fda.gov/api/esgng/v1/companies"
# Build URL with literal @ (requests params= would encode it as %40)
url_literal_at  = f"{BASE_URL}?user_email={email}"
url_encoded_at  = f"{BASE_URL}?user_email={email.replace('@', '%40')}"

VARIANTS = [
    ("accesstoken only (no Content-Type)",
     url_literal_at,  {"accesstoken": token}),
    ("accesstoken + Content-Type: application/json",
     url_literal_at,  {"accesstoken": token, "Content-Type": "application/json"}),
    ("Authorization: Bearer (no Content-Type)",
     url_literal_at,  {"Authorization": f"Bearer {token}"}),
    ("Authorization: Bearer + Content-Type",
     url_literal_at,  {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}),
    ("accesstoken, email @ encoded as %40",
     url_encoded_at,  {"accesstoken": token}),
]

winner = None
for label, url, headers in VARIANTS:
    print(f"\n[2/?] Trying: {label}")
    print(f"      URL: {url}")
    r2 = requests.get(url, headers=headers, timeout=30)
    print(f"      Status: {r2.status_code}   Body length: {len(r2.text)} chars")
    if r2.status_code == 200 and r2.text.strip():
        print("      ✅ SUCCESS")
        winner = r2
        break
    else:
        print(f"      ❌  Body: {r2.text[:200] or '(empty)'}")

print(f"\n{'='*60}")
if winner is None:
    print("All variants returned non-200 or empty body.")
    print("Companies API is failing server-side for this account.")
    print("Recommend opening a helpdesk ticket with ESGNGSupport@fda.hhs.gov")
    sys.exit(1)

print("FULL RESPONSE:")
print('='*60)
try:
    parsed = winner.json()
    print(json.dumps(parsed, indent=2))
    print('='*60)
    print("\nKEY VALUES:")
    print(f"  user_id         : {parsed.get('user_id')}")
    print(f"  company_id      : {parsed.get('company_id')}")
    print(f"  company_name    : {parsed.get('company_name')}")
    print(f"  company_status  : {parsed.get('company_status')}")
    auth_cos = parsed.get("authorizing_companies", [])
    if auth_cos:
        print(f"  authorizing_companies ({len(auth_cos)} entries):")
        for ac in auth_cos:
            print(f"    id={ac.get('authorizing_company_id')}  name={ac.get('authorizing_company_name')!r}")
    else:
        print("  authorizing_companies: (none — non-agency account)")
    cid = str(parsed.get("company_id", ""))
    if cid:
        print(f"\n✅ Set this in .env:  ESG_COMPANY_ID={cid}")
except Exception as e:
    print(f"Could not parse JSON: {e}")
    print(winner.text)
