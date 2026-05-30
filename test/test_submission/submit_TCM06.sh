#!/usr/bin/env bash
# submit_TCM06.sh — Submit TC-M06 (CASE-20260522-MEGA4_v1.xml) to FAERS AERS TEST gateway
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
XML_FILE="CASE-20260522-MEGA4_v1.xml"
TARGET="${SCRIPT_DIR}/from_app/${XML_FILE}"

echo "=== TC-M06 Submission ==="
echo "Script dir : ${SCRIPT_DIR}"
echo "Target XML : ${TARGET}"

if [[ ! -f "${TARGET}" ]]; then
  echo "ERROR: XML file not found at ${TARGET}"
  exit 1
fi

echo "File found ($(wc -c < "${TARGET}") bytes). Starting submission..."
echo ""

cd "${SCRIPT_DIR}"
python3 submit_batch.py --file "${XML_FILE}"

echo ""
echo "=== Submission complete. Check submit_batch.log for details ==="
