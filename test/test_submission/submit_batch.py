#!/usr/bin/env python3
"""
FDA ESG NextGen — Batch ICSR Submitter
=======================================
Submits pending XML packages to the AERS test gateway (ZZFDATST)
via the ESG NextGen REST API v1.2 (March 2026).

Usage:
    python submit_batch.py [--dry-run] [--file TC-A02-race-black.xml]

Requirements:
    pip install requests python-dotenv

Credentials file (.env in same directory):
    ClientID=your_client_id
    Secret=your_client_secret
    ESG_USERNAME=your_esg_username      # USP portal login (email)
    ESG_PASSWORD=your_esg_password      # USP portal password
    ESG_USER_EMAIL=your_email           # Used for Companies API lookup (often same as ESG_USERNAME)
    # Optional overrides (filled automatically on first run):
    # ESG_USER_ID=12345
    # ESG_COMPANY_ID=67890

Author: DeepQuence Drug Safety
"""

import os
import sys
import json
import hashlib
import time
import argparse
import logging
from pathlib import Path
from datetime import datetime, timezone

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("Missing dependencies. Run:  pip install requests python-dotenv")
    sys.exit(1)

# ─── Configuration ────────────────────────────────────────────────────────────
#
# ESG NextGen uses TWO base URLs (per API Specification v1.2, March 2026):
#   - AUTH_BASE   handles OAuth2 token, credential creation, status, ACKs
#   - UPLOAD_BASE handles payload registration, file upload, and submit
#
# Both TEST and PROD use the same two base URLs.
# TEST vs PROD gateway (ZZFDATST vs ZZFDA) is set by the XML batchReceiver field.
# Postmarket vs PREMKT routing within the gateway is controlled by submission_type
# in the AS2 envelope ("AERS" vs "AERS_PREMKT_CDER") — NOT by the XML receiver field.

AUTH_BASE   = "https://external-api-esgng.fda.gov"
UPLOAD_BASE = "https://upload-api-esgng.fda.gov"

# ── Endpoint map ──────────────────────────────────────────────────────────────

EP = {
    # OAuth2 client_credentials — grant_type & scope as URL params, creds in body
    "token":       f"{AUTH_BASE}/as/token.oauth2",

    # Look up user_id and company_id by e-mail
    "companies":   f"{AUTH_BASE}/api/esgng/v1/companies",          # ?user_email=

    # Create credential record; returns core_id, temp_user, temp_password
    # Separate TEST vs PROD paths:
    "credential_test": f"{AUTH_BASE}/api/esgng/v1/credentials/api/test",
    "credential_prod": f"{AUTH_BASE}/api/esgng/v1/credentials/api",

    # Reserve a payload slot; returns payloadId, uploadFileLink, submitFormLink
    "payload":     f"{UPLOAD_BASE}/rest/forms/v1/fileupload/payload",  # GET

    # Upload the XML file (multipart/form-data)
    "upload":      f"{UPLOAD_BASE}/rest/forms/v1/fileupload/payload/{{payload_id}}/file",

    # Trigger delivery — uses temp_user/temp_password, NOT OAuth token
    "submit":      f"{UPLOAD_BASE}/rest/forms/v1/fileupload/payload/{{payload_id}}/submit",

    # Poll submission status by core_id
    "status":      f"{AUTH_BASE}/api/esgng/v1/submissions/{{core_id}}",

    # Retrieve ACK by acknowledgement_id
    "ack":         f"{AUTH_BASE}/api/esgng/v1/acknowledgements/{{ack_id}}",
}

# ─── File locations ───────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
FROM_APP   = SCRIPT_DIR / "from_app"
HEADLESS   = FROM_APP / "headless"
IND        = FROM_APP / "ind"
ROUND2     = FROM_APP / "round2"
LOG_FILE   = SCRIPT_DIR / "submission_log.json"
ENV_FILE   = SCRIPT_DIR / ".env"

# Cases already confirmed accepted — skip these.
# Cleared 2026-05-31: full re-submission with fixed-generator XMLs (autopsyPerformed + G.k XPaths).
ALREADY_SUBMITTED: set = set()

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(SCRIPT_DIR / "submit_batch.log"),
    ],
)
log = logging.getLogger("faers_submit")

# ─── Helpers ──────────────────────────────────────────────────────────────────

def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_log() -> dict:
    if LOG_FILE.exists():
        with open(LOG_FILE) as f:
            return json.load(f)
    return {}


def save_log(data: dict):
    with open(LOG_FILE, "w") as f:
        json.dump(data, f, indent=2)
    log.debug(f"Log saved → {LOG_FILE}")


def discover_pending(single_file: str = None) -> list[Path]:
    """Return XML files that still need submission, in deterministic order."""
    if single_file:
        for d in [HEADLESS, IND, ROUND2]:
            p = d / single_file
            if p.exists():
                return [p]
        p = FROM_APP / single_file
        if p.exists():
            return [p]
        log.error(f"File not found: {single_file}")
        sys.exit(1)

    candidates = (
        sorted(HEADLESS.glob("TC-*.xml")) +
        sorted(HEADLESS.glob("IND-*.xml")) +   # IND cases now land in headless/ (ind/ removed)
        sorted(IND.glob("IND-*.xml")) +         # legacy ind/ support (may be empty)
        sorted(ROUND2.glob("TC-*.xml")) +
        sorted(FROM_APP.glob("TC-*.xml"))  # top-level from_app/ (e.g. TC-A02)
    )
    pending = [p for p in candidates if p.name not in ALREADY_SUBMITTED]
    log.info(f"Discovered {len(candidates)} XML files, {len(pending)} pending submission")
    return pending


def already_logged(submission_log: dict, filename: str) -> bool:
    """Return True if this file was submitted and received a non-error response."""
    entry = submission_log.get(filename)
    if not entry:
        return False
    status = entry.get("status", "")
    # Re-submit if it failed, was never confirmed, or was only a dry-run
    if status in ("ERROR", "PENDING_RETRY", "DRY_RUN", ""):
        return False
    return True

# ─── JWT claim decoder (diagnostic — fires on every new token fetch) ──────────

def _log_jwt_claims(token: str) -> None:
    """Decode and log JWT header + payload without signature verification.
    Highlights any scope, audience, roles, or center-related claims.
    Safe to leave in production — reads only, no network call.
    """
    import base64 as _b64
    parts = token.split(".")
    if len(parts) < 2:
        log.warning("JWT decode: token does not look like a JWT (no dots)")
        return

    def _decode(segment: str) -> dict:
        segment += "=" * (4 - len(segment) % 4)
        try:
            return json.loads(_b64.urlsafe_b64decode(segment).decode())
        except Exception as exc:
            return {"_decode_error": str(exc)}

    header  = _decode(parts[0])
    payload = _decode(parts[1])

    log.info(f"JWT header : {json.dumps(header)}")
    log.info(f"JWT payload: {json.dumps(payload)}")

    # Highlight claims most relevant to center/scope authorization
    interesting = ["scope", "aud", "iss", "sub", "roles", "permissions",
                   "groups", "authorities", "center", "track", "fda_center",
                   "client_id", "azp", "resource_access", "realm_access"]
    highlights = {k: payload[k] for k in interesting if k in payload}
    # Any claim value containing IND / PREMKT / PREMARKET
    for k, v in payload.items():
        if any(kw in str(v).upper() for kw in ["IND", "PREMKT", "PREMARKET"]):
            highlights[f"[IND-related] {k}"] = v

    if highlights:
        log.info(f"JWT highlights: {json.dumps(highlights, indent=2)}")
    else:
        log.info("JWT highlights: no scope/aud/roles/IND-related claims found in payload")

# ─── OAuth2 token management ──────────────────────────────────────────────────

class TokenManager:
    def __init__(self, client_id: str, client_secret: str):
        self.client_id     = client_id
        self.client_secret = client_secret
        self._token        = None
        self._expires_at   = 0.0

    def get(self) -> str:
        # Refresh 5 minutes before expiry
        if time.time() < self._expires_at - 300 and self._token:
            return self._token
        log.info("Fetching OAuth2 access token …")
        # Per spec: grant_type and scope in URL query params; creds in body
        resp = requests.post(
            EP["token"],
            params={
                "grant_type": "client_credentials",
                "scope":      "openid profile",
            },
            data={
                "client_id":     self.client_id,
                "client_secret": self.client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        resp.raise_for_status()
        body             = resp.json()
        self._token      = body["access_token"]
        expires_in       = int(body.get("expires_in", 3600))
        self._expires_at = time.time() + expires_in
        log.info(f"Token obtained (expires in {expires_in}s)")
        log.info(f"Token scope returned by server: {body.get('scope', '(not in response)')}")
        _log_jwt_claims(self._token)
        return self._token

# ─── Companies pre-flight ─────────────────────────────────────────────────────

def get_user_and_company(tokens: TokenManager, user_email: str) -> tuple[str, str]:
    """
    Call the Companies API to resolve user_id and company_id for this account.
    Returns (user_id, company_id).  Exits on failure.
    """
    log.info(f"Companies API lookup for {user_email} …")
    # IMPORTANT: do NOT use params={"user_email": ...} — requests encodes @ as %40,
    # but the FDA server expects a literal @ in the query string (per spec curl examples).
    # Build the URL manually to preserve the @ character unencoded.
    companies_url = f"{EP['companies']}?user_email={user_email}"
    resp = requests.get(
        companies_url,
        headers={"accesstoken": tokens.get()},
        timeout=30,
    )
    if resp.status_code != 200:
        log.error(f"Companies API failed: {resp.status_code}  {resp.text[:400]}")
        sys.exit(1)

    body = resp.json()
    log.debug(f"Companies response: {json.dumps(body)[:500]}")

    # Response shape may be a list or a wrapper object; handle both
    if isinstance(body, list):
        records = body
    elif isinstance(body, dict):
        records = body.get("companies") or body.get("data") or [body]
    else:
        log.error(f"Unexpected Companies response shape: {type(body)}")
        sys.exit(1)

    if not records:
        log.error("Companies API returned no records — check ESG_USER_EMAIL in .env")
        sys.exit(1)

    # Take the first record (most accounts have exactly one company)
    rec        = records[0]
    user_id    = str(rec.get("user_id")    or rec.get("userId")    or "")
    company_id = str(rec.get("company_id") or rec.get("companyId") or "")

    if not user_id or not company_id:
        log.error(f"Could not extract user_id/company_id from record: {rec}")
        sys.exit(1)

    company_status = str(rec.get("company_status") or rec.get("companyStatus") or "UNKNOWN")
    company_name   = str(rec.get("company_name")   or rec.get("companyName")   or "")
    log.info(f"Resolved  user_id={user_id}  company_id={company_id}  "
             f"company_name={company_name!r}  status={company_status}")

    if company_status.upper() != "APPROVED":
        log.warning(
            f"⚠️  company_status is '{company_status}' — not 'Approved'. "
            f"Credential submissions may fail until the account is fully approved in the portal."
        )
    # Sanity-check: company_id=2 is CDER's own record, not a submitter company.
    if company_id == "2":
        log.error(
            "company_id=2 is the FDA CDER center's ID, NOT DeepQuence's company ID. "
            "This will cause ESGNG219 on every credential call. "
            "Contact ESGNG helpdesk or check Company Management in the USP portal "
            "to find DeepQuence's real company_id, then set ESG_COMPANY_ID=<real_id> in .env."
        )
    return user_id, company_id

# ─── Submission workflow ───────────────────────────────────────────────────────

def submit_one(
    xml_path:   Path,
    tokens:     TokenManager,
    creds:      dict,
    user_id:    str,
    company_id: str,
    prod:       bool,
    dry_run:    bool,
) -> dict:
    """
    Execute the 5-step ESG NextGen submission for one XML file.

    Step 1  POST credential      → core_id, temp_user, temp_password
    Step 2  GET payload          → payloadId, uploadFileLink, submitFormLink
    Step 3  POST file upload     → multipart/form-data
    Step 4  POST submit          → temp_user / temp_password / sha256
    Step 5  GET status           → confirm delivery  (optional but logged)

    Returns a dict describing the outcome.
    """
    filename = xml_path.name
    checksum = sha256_of(xml_path)
    filesize = xml_path.stat().st_size
    log.info(f"┌── {filename}  ({filesize:,} bytes  sha256={checksum[:16]}…)")

    if dry_run:
        log.info(f"│   [DRY RUN] Would submit {filename}")
        return {"status": "DRY_RUN", "filename": filename, "sha256": checksum}

    token       = tokens.get()
    # ESG NextGen uses a non-standard header name "accesstoken" (no "Bearer" prefix)
    auth_header = {"accesstoken": token}

    # ── Step 1: Credential submission ─────────────────────────────────────────
    # Creates a submission record. Returns core_id + temporary upload credentials.
    cred_url = EP["credential_prod"] if prod else EP["credential_test"]
    log.info(f"│   Step 1: Credential submission → {cred_url}")

    # submission_type / fda_center routing (per Deepak Nelivigi AEMSESUB table, 2026-05-06
    # and confirmed by ACK3 results from IND_May6 batch):
    #
    #   Postmarket ICSR : fda_center="CDER"  submission_type="AERS"
    #     → ESG sets AS2 sender header="CDER"
    #     → XML must have N.1.4="ZZFDATST"       N.2.r.3="CDER"
    #
    #   CDER IND ICSR   : fda_center="CDER"  submission_type="AERS_PREMKT_CDER"
    #     → ESG sets AS2 sender header="CDER_IND"
    #     → XML must have N.1.4="ZZFDATST_PREMKT" N.2.r.3="CDER_IND"
    #
    # The AS2 sender header is determined by submission_type, NOT by fda_center.
    # ZZFDATST_PREMKT enforces that AS2 header matches N.1.4 and N.2.r.3 in the XML.
    # ESGNG334 is returned if submission_type is not a valid value for the given fda_center.
    # Detect routing from N.1.4 receiver in the XML (more reliable than filename prefix).
    # N.1.4 = ZZFDATST_PREMKT → IND/PREMKT channel → AERS_PREMKT_CDER
    # N.1.4 = ZZFDATST        → postmarket channel → AERS
    _is_premkt = False
    try:
        import xml.etree.ElementTree as _ET
        _NS14 = "urn:hl7-org:v3"
        _xtree = _ET.parse(xml_path)
        for _dev in _xtree.iter(f"{{{_NS14}}}device"):
            for _id in _dev.findall(f"{{{_NS14}}}id"):
                if _id.get("root") == "2.16.840.1.113883.3.989.2.1.3.14":
                    if "PREMKT" in (_id.get("extension") or "").upper():
                        _is_premkt = True
    except Exception:
        # Fallback to filename prefix if XML parsing fails
        _is_premkt = filename.startswith("IND-")

    if _is_premkt:
        submission_type = os.getenv("ESG_SUBMISSION_TYPE_IND", "AERS_PREMKT_CDER")
        fda_center      = os.getenv("ESG_CENTER_IND", "CDER")
    else:
        submission_type = os.getenv("ESG_SUBMISSION_TYPE", "AERS")
        fda_center      = os.getenv("ESG_CENTER", "CDER")
    submission_name = filename.replace(".xml", "")

    # authorizing_company_id: ONLY required for companies marked as an agency (CRO/consultant
    # submitting on behalf of a client).  Per spec §2.2/§2.3: "If the user is not an agency,
    # they do not need to include the authorizing_company_id in the request body."
    # Set ESG_AUTHORIZING_COMPANY_ID in .env only if DeepQuence is submitting as an agent.
    authorizing_company_id = os.getenv("ESG_AUTHORIZING_COMPANY_ID", "").strip()

    cred_body_req = {
        "user_id":             int(user_id),    # Must be integer — FDA confirmed, quotes cause ESGNG334
        "fda_center":          fda_center,
        "company_id":          int(company_id), # Must be integer — FDA confirmed, quotes cause ESGNG334
        "submission_type":     submission_type,
        "submission_name":     submission_name,
        "submission_protocol": "API",
        "file_count":          1,
        "description":         f"FAERS ICSR test submission — {submission_name}",  # Required per spec §2.2/§2.3
    }
    # Only add authorizing_company_id when explicitly configured (agency use-case only)
    if authorizing_company_id:
        cred_body_req["authorizing_company_id"] = authorizing_company_id
    log.info(f"│   Credential request body: {json.dumps(cred_body_req)}")
    r1 = requests.post(
        cred_url,
        headers={**auth_header, "Content-Type": "application/json"},
        json=cred_body_req,
        timeout=30,
    )
    # Always log full credential response for diagnostic purposes (status + body)
    log.info(f"│   Credential response: HTTP {r1.status_code}  body={r1.text[:500]}")
    if r1.status_code not in (200, 201):
        raise RuntimeError(f"Credential submission failed: {r1.status_code}  {r1.text[:1000]}")

    cred_body  = r1.json()
    log.debug(f"│   Credential response: {json.dumps(cred_body)[:500]}")

    core_id     = str(cred_body.get("core_id")      or cred_body.get("coreId")      or "")
    temp_user   = str(cred_body.get("temp_user")    or cred_body.get("tempUser")    or "")
    temp_pass   = str(cred_body.get("temp_password")or cred_body.get("tempPassword")or "")

    if not core_id or not temp_user or not temp_pass:
        raise RuntimeError(
            f"Credential response missing core_id/temp_user/temp_password: {cred_body}"
        )
    log.info(f"│   core_id={core_id}  temp_user={temp_user}")

    # ── Step 2: Get payload slot ──────────────────────────────────────────────
    # Registers a payload and returns upload + submit URLs (and payloadId).
    log.info(f"│   Step 2: Get payload slot …")
    r2 = requests.get(
        EP["payload"],
        headers={**auth_header},
        timeout=30,
    )
    if r2.status_code != 200:
        raise RuntimeError(f"Payload GET failed: {r2.status_code}  {r2.text[:400]}")

    payload_body     = r2.json()
    log.debug(f"│   Payload response: {json.dumps(payload_body)[:500]}")

    # Actual response wraps fields in a "data" envelope: {"data": {"payloadId": ...}}
    # Fall back to top-level if "data" key is absent.
    payload_data = payload_body.get("data", payload_body)

    payload_id       = str(
        payload_data.get("payloadId")      or
        payload_data.get("payload_id")     or ""
    )
    upload_file_link = (
        payload_data.get("uploadFileLink") or
        payload_data.get("upload_file_link") or
        EP["upload"].replace("{payload_id}", payload_id)
    )
    submit_form_link = (
        payload_data.get("submitFormLink") or
        payload_data.get("submit_form_link") or
        EP["submit"].replace("{payload_id}", payload_id)
    )

    if not payload_id:
        raise RuntimeError(f"Payload response missing payloadId: {payload_body}")
    log.info(f"│   payloadId={payload_id}")

    # ── Step 3: Upload XML file ───────────────────────────────────────────────
    # Multipart/form-data POST to uploadFileLink.
    # Spec §2.5 (p.21): Authorization header required for the upload endpoint.
    # We use the same "accesstoken" header that works for all other auth'd calls.
    log.info(f"│   Step 3: File upload (multipart) …")
    with open(xml_path, "rb") as fh:
        r3 = requests.post(
            upload_file_link,
            headers=auth_header,   # accesstoken: <token>  (spec §2.5 requires auth)
            files={"file": (filename, fh, "application/xml")},
            timeout=120,
        )
    if r3.status_code not in (200, 201, 204):
        raise RuntimeError(f"File upload failed: {r3.status_code}  {r3.text[:400]}")
    log.info(f"│   Upload OK ({r3.status_code})")

    # ── Step 4: Submit ────────────────────────────────────────────────────────
    # Uses temp_user / temp_password from Step 1 — NOT the OAuth token.
    log.info(f"│   Step 4: Submit (temp creds) …")
    r4 = requests.post(
        submit_form_link,
        json={
            "username":       temp_user,
            "password":       temp_pass,
            "sha256_checksum": checksum,
        },
        headers={"Content-Type": "application/json"},
        timeout=60,
    )
    if r4.status_code not in (200, 201, 202):
        raise RuntimeError(f"Submit failed: {r4.status_code}  {r4.text[:400]}")
    log.info(f"│   Submit OK ({r4.status_code}): {r4.text[:200]}")

    # ── Step 5: Status check (optional — best-effort) ─────────────────────────
    status_result = {}
    try:
        log.info(f"│   Step 5: Status check …")
        time.sleep(2)   # brief pause before polling
        r5 = requests.get(
            EP["status"].replace("{core_id}", core_id),
            headers=auth_header,
            timeout=30,
        )
        if r5.status_code == 200:
            status_result = r5.json()
            log.info(f"│   Status: {json.dumps(status_result)[:200]}")
        else:
            log.warning(f"│   Status check: {r5.status_code} (non-fatal)")
    except Exception as e:
        log.warning(f"│   Status check failed (non-fatal): {e}")

    result = {
        "status":        "SUBMITTED",
        "filename":      filename,
        "core_id":       core_id,
        "payload_id":    payload_id,
        "sha256":        checksum,
        "submitted_at":  datetime.now(timezone.utc).isoformat(),
        "http_status":   r4.status_code,
        "submit_response": r4.text[:500],
        "status_check":  status_result,
    }
    log.info(f"└── ✅ Submitted  core_id={core_id}")
    return result

# ─── Status / ACK retrieval ───────────────────────────────────────────────────

def fetch_status_and_ack(tokens: "TokenManager", core_id: str) -> None:
    """Poll the status endpoint for a previously submitted core_id.
    If an acknowledgement_id is present, fetch and print the full ACK."""
    hdrs = {"Authorization": f"Bearer {tokens.get()}"}

    log.info(f"Checking status for core_id={core_id}")
    r = requests.get(
        EP["status"].format(core_id=core_id),
        headers=hdrs,
        timeout=30,
    )
    log.info(f"Status HTTP {r.status_code}")
    body = r.json()
    log.info(json.dumps(body, indent=2))

    ack_id = body.get("acknowledgement_id") or body.get("acknowledgementId")
    if ack_id:
        log.info(f"acknowledgement_id={ack_id} — fetching ACK …")
        a = requests.get(
            EP["ack"].format(ack_id=ack_id),
            headers=hdrs,
            timeout=30,
        )
        log.info(f"ACK HTTP {a.status_code}")
        log.info(json.dumps(a.json(), indent=2))
    else:
        log.info("No acknowledgement_id yet — submission still processing.")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Batch-submit FAERS XMLs via ESG NextGen API")
    parser.add_argument("--dry-run", action="store_true",
                        help="Discover files and show plan but make no API calls")
    parser.add_argument("--file",    metavar="FILENAME",
                        help="Submit only this filename (e.g. TC-A02-race-black.xml)")
    parser.add_argument("--status",  metavar="CORE_ID",
                        help="Check status (and ACK if available) for a previously submitted core_id")
    parser.add_argument("--delay",   type=float, default=5.0,
                        help="Seconds between submissions (default: 5)")
    parser.add_argument("--prod",    action="store_true",
                        help="Use PRODUCTION credential endpoint (DANGER — only after full test pass)")
    parser.add_argument("--skip-companies", action="store_true",
                        help="Skip the Companies API lookup and send empty user_id/company_id — "
                             "useful when the Companies API is down; reveals whether those fields "
                             "are required by the credential endpoint")
    args = parser.parse_args()

    # ── Credentials ───────────────────────────────────────────────────────────
    log.info(f"Loading credentials from: {ENV_FILE}  (exists={ENV_FILE.exists()})")
    if not ENV_FILE.exists():
        log.error(f".env file not found at {ENV_FILE}")
        log.error(f"Create it by copying .env.example and filling in your values.")
        sys.exit(1)
    load_dotenv(ENV_FILE, override=True)

    client_id  = os.getenv("ClientID")
    client_sec = os.getenv("Secret")
    username   = os.getenv("ESG_USERNAME")
    password   = os.getenv("ESG_PASSWORD")
    user_email = os.getenv("ESG_USER_EMAIL") or username  # fall back to username if email not set

    # user_id and company_id can be hardcoded in .env to skip Companies API call
    user_id_env    = os.getenv("ESG_USER_ID",    "")
    company_id_env = os.getenv("ESG_COMPANY_ID", "")

    missing = [k for k, v in {
        "ClientID":   client_id,
        "Secret":     client_sec,
        "ESG_USERNAME": username,
        "ESG_PASSWORD": password,
    }.items() if not v]
    if missing:
        log.error(f"Missing environment variables: {', '.join(missing)}")
        log.error(f".env path: {ENV_FILE}")
        sys.exit(1)

    # ── Safety guard: IND submission_type must be a known-good AERS value ────────
    # Valid values per Deepak Nelivigi (AEMSESUB) routing table, 2026-05-06:
    #   "AERS"             → postmarket ICSR (TC-* files, fda_center=CDER)
    #   "AERS_PREMKT_CDER" → CDER IND ICSR (IND-* files, fda_center=CDER)
    # "EIND" routes to the FDA EIND regulatory system (wrong system for ICSRs) — proven 2026-05-01.
    VALID_IND_SUBMISSION_TYPES = {"AERS", "AERS_PREMKT_CDER"}
    ind_submission_type = os.getenv("ESG_SUBMISSION_TYPE_IND", "AERS_PREMKT_CDER")
    if ind_submission_type not in VALID_IND_SUBMISSION_TYPES:
        log.error(
            f"FATAL: ESG_SUBMISSION_TYPE_IND={ind_submission_type!r} in .env — "
            f"must be one of {sorted(VALID_IND_SUBMISSION_TYPES)}. "
            "'EIND' routes to wrong FDA system and produces no ACK3. "
            "Fix .env then retry."
        )
        sys.exit(1)

    log.info(f"ESG NextGen Batch Submitter — {'DRY RUN' if args.dry_run else 'LIVE'}")
    log.info(f"Credential endpoint: {'PRODUCTION' if args.prod else 'TEST'}")

    tokens = TokenManager(client_id, client_sec)
    creds  = {"username": username, "password": password}

    # ── Status / ACK check (short-circuit: no file discovery needed) ──────────
    if args.status:
        fetch_status_and_ack(tokens, args.status)
        return

    # ── Resolve user_id / company_id ──────────────────────────────────────────
    if args.dry_run:
        user_id    = user_id_env    or "DRY_RUN_USER"
        company_id = company_id_env or "DRY_RUN_COMPANY"
        log.info(f"[DRY RUN] Skipping Companies API lookup")
    elif user_id_env and company_id_env:
        user_id    = user_id_env
        company_id = company_id_env
        log.info(f"Using hardcoded  user_id={user_id}  company_id={company_id} from .env")
        if company_id == "2":
            log.error(
                "ESG_COMPANY_ID=2 is CDER's center ID, NOT DeepQuence's company ID. "
                "Credential calls will fail with ESGNG219 until you set the correct company_id. "
                "Check Company Management in the USP portal or contact ESGNG helpdesk."
            )
    elif args.skip_companies:
        user_id    = user_id_env    or ""
        company_id = company_id_env or ""
        log.warning("--skip-companies: proceeding without user_id/company_id "
                    "(credential endpoint will reveal if these are required)")
    else:
        user_id, company_id = get_user_and_company(tokens, user_email)

    # ── Discover files ────────────────────────────────────────────────────────
    submission_log = load_log()
    pending        = discover_pending(args.file)

    if not pending:
        log.info("No pending files found. Exiting.")
        return

    log.info(f"Will submit {len(pending)} file(s) with {args.delay}s delay between each")

    success_count = 0
    error_count   = 0

    for i, xml_path in enumerate(pending):
        fname = xml_path.name

        if already_logged(submission_log, fname) and not args.file:
            log.info(f"[{i+1}/{len(pending)}] Skipping {fname} (already in log)")
            continue

        log.info(f"[{i+1}/{len(pending)}] Processing {fname} …")
        try:
            result = submit_one(
                xml_path   = xml_path,
                tokens     = tokens,
                creds      = creds,
                user_id    = user_id,
                company_id = company_id,
                prod       = args.prod,
                dry_run    = args.dry_run,
            )
            submission_log[fname] = result
            success_count += 1
        except Exception as e:
            log.error(f"  ERROR submitting {fname}: {e}")
            submission_log[fname] = {
                "status":       "ERROR",
                "filename":     fname,
                "error":        str(e),
                "attempted_at": datetime.now(timezone.utc).isoformat(),
            }
            error_count += 1

        if not args.dry_run:
            save_log(submission_log)

        # Polite delay between submissions
        if i < len(pending) - 1 and not args.dry_run:
            time.sleep(args.delay)

    log.info("")
    log.info("═══ Summary ═══")
    log.info(f"  Submitted:  {success_count}")
    log.info(f"  Errors:     {error_count}")
    log.info(f"  Log:        {LOG_FILE}")
    if error_count:
        log.info(f"  Retry errors with:  python submit_batch.py --file <filename>")


if __name__ == "__main__":
    main()
